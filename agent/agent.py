#!/usr/bin/env python3
"""
Cloud Virtual Machine Monitoring Agent
Collects real system resource utilization (CPU, RAM, Disk, Network)
and posts metrics to the backend monitoring REST API.
"""

import sys
import time
import socket
import platform
import argparse
import logging
import requests
import psutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

def get_ip_address():
    """Retrieve primary IPv4 address of current machine."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def collect_metrics(vm_id, hostname, os_info, prev_net_counters):
    """Gather real system resource metrics using psutil."""
    # 1. CPU Usage % over 1 second sample
    cpu_usage = psutil.cpu_percent(interval=1.0)
    
    # 2. Memory (RAM) Usage
    mem = psutil.virtual_memory()
    memory_usage = mem.percent
    memory_used_mb = round(mem.used / (1024 * 1024), 2)
    memory_total_mb = round(mem.total / (1024 * 1024), 2)

    # 3. Disk Usage
    disk = psutil.disk_usage('/')
    disk_usage = disk.percent
    disk_used_gb = round(disk.used / (1024 * 1024 * 1024), 2)
    disk_total_gb = round(disk.total / (1024 * 1024 * 1024), 2)

    # 4. Network Traffic Bytes
    net = psutil.net_io_counters()
    net_bytes_sent = net.bytes_sent
    net_bytes_recv = net.bytes_recv

    # 5. Uptime Seconds
    uptime_seconds = int(time.time() - psutil.boot_time())

    payload = {
        "vm_id": vm_id,
        "hostname": hostname,
        "ip_address": get_ip_address(),
        "os_info": os_info,
        "cpu_usage": cpu_usage,
        "memory_usage": memory_usage,
        "memory_used_mb": memory_used_mb,
        "memory_total_mb": memory_total_mb,
        "disk_usage": disk_usage,
        "disk_used_gb": disk_used_gb,
        "disk_total_gb": disk_total_gb,
        "net_bytes_sent": net_bytes_sent,
        "net_bytes_recv": net_bytes_recv,
        "uptime_seconds": uptime_seconds
    }

    return payload, net

def main():
    parser = argparse.ArgumentParser(description="Cloud Virtual Machine Monitoring Agent")
    parser.add_argument("--server", default="http://localhost:5005", help="Backend Monitoring Server URL")
    parser.add_argument("--vm-id", default=None, help="Unique identifier for this Virtual Machine")
    parser.add_argument("--hostname", default=socket.gethostname(), help="Custom hostname for VM")
    parser.add_argument("--interval", type=int, default=3, help="Metrics reporting interval in seconds")
    args = parser.parse_args()

    server_url = f"{args.server.rstrip('/')}/api/metrics"
    vm_id = args.vm_id or f"vm-{args.hostname.lower().replace(' ', '-')}"
    os_info = f"{platform.system()} {platform.release()} ({platform.machine()})"

    logging.info("Starting Cloud Virtual Machine Monitoring Agent...")
    logging.info(f"Target Server : {server_url}")
    logging.info(f"VM Identifier : {vm_id}")
    logging.info(f"Hostname      : {args.hostname}")
    logging.info(f"OS System     : {os_info}")
    logging.info(f"Interval      : {args.interval}s")

    prev_net = psutil.net_io_counters()

    while True:
        try:
            payload, prev_net = collect_metrics(vm_id, args.hostname, os_info, prev_net)
            
            response = requests.post(server_url, json=payload, timeout=5)
            if response.status_code == 410 or (response.headers.get('content-type', '').startswith('application/json') and response.json().get('deregistered')):
                logging.critical(f"⛔ VM '{vm_id}' was deregistered by central dashboard administrator. Terminating agent process.")
                sys.exit(0)
            elif response.status_code in (200, 201):
                logging.info(
                    f"Metrics sent | CPU: {payload['cpu_usage']}% | RAM: {payload['memory_usage']}% | "
                    f"Disk: {payload['disk_usage']}% | Uptime: {payload['uptime_seconds']}s"
                )
            else:
                logging.warning(f"Server returned status {response.status_code}: {response.text}")

        except requests.exceptions.ConnectionError:
            logging.error(f"Failed to connect to Monitoring Server at {server_url}. Retrying in {args.interval}s...")
        except Exception as e:
            logging.error(f"Unexpected error in monitoring agent loop: {e}")

        time.sleep(max(1, args.interval - 1)) # Account for 1s sample time inside collect_metrics

if __name__ == "__main__":
    main()
