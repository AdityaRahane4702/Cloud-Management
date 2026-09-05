#!/usr/bin/env python3
"""
Multi-VM Architecture Simulator
Simulates multiple cloud virtual machines sending real-time telemetry metrics
to test centralized monitoring, alerting thresholds, and live dashboard visual charts.
"""

import time
import math
import random
import threading
import logging
import requests

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(threadName)s] %(message)s',
    datefmt='%H:%M:%S'
)

SERVER_URL = "http://localhost:5005/api/metrics"

SIMULATED_VMS = [
    {
        "vm_id": "vm-web-nginx-01",
        "hostname": "web-prod-us-east-1a",
        "ip_address": "10.0.1.15",
        "os_info": "Ubuntu 24.04 LTS (x86_64)",
        "ram_total": 8192,
        "disk_total": 100,
        "base_cpu": 35.0,
        "base_mem": 45.0,
        "base_disk": 38.0,
        "spike_chance": 0.25 # Spikes CPU periodically
    },
    {
        "vm_id": "vm-db-postgres-01",
        "hostname": "db-primary-us-east-1b",
        "ip_address": "10.0.1.20",
        "os_info": "Debian 12 (Bookworm)",
        "ram_total": 32768,
        "disk_total": 500,
        "base_cpu": 50.0,
        "base_mem": 82.0, # High memory usage to trigger memory warnings
        "base_disk": 88.0, # High disk usage to trigger disk warnings
        "spike_chance": 0.35
    },
    {
        "vm_id": "vm-app-backend-02",
        "hostname": "api-cluster-us-west-2a",
        "ip_address": "10.0.1.35",
        "os_info": "Amazon Linux 2023",
        "ram_total": 16384,
        "disk_total": 200,
        "base_cpu": 28.0,
        "base_mem": 52.0,
        "base_disk": 42.0,
        "spike_chance": 0.15
    },
    {
        "vm_id": "vm-cache-redis-01",
        "hostname": "redis-node-us-east-1c",
        "ip_address": "10.0.1.42",
        "os_info": "Alpine Linux 3.19",
        "ram_total": 4096,
        "disk_total": 50,
        "base_cpu": 15.0,
        "base_mem": 68.0,
        "base_disk": 22.0,
        "spike_chance": 0.10
    }
]

def vm_agent_thread(vm, server_url, interval=3):
    start_time = time.time()
    step = 0
    bytes_sent = random.randint(1000000, 5000000)
    bytes_recv = random.randint(5000000, 20000000)

    while True:
        step += 1
        uptime = int(time.time() - start_time) + 3600 # 1h baseline uptime

        # Sine wave modulation for realistic dynamic variation
        sine_val = math.sin(step * 0.2) * 12.0
        rand_val = random.uniform(-4.0, 4.0)

        # Calculate CPU
        cpu = vm["base_cpu"] + sine_val + rand_val
        if random.random() < vm["spike_chance"]:
            # Trigger a spike above 85-95% for alert testing
            cpu += random.uniform(30.0, 48.0)
        cpu = max(5.0, min(99.5, round(cpu, 1)))

        # Calculate RAM
        mem = vm["base_mem"] + (math.cos(step * 0.15) * 6.0) + random.uniform(-2.0, 2.0)
        mem = max(10.0, min(98.5, round(mem, 1)))
        mem_used_mb = round((mem / 100.0) * vm["ram_total"], 1)

        # Calculate Disk
        disk = vm["base_disk"] + (step * 0.01) # Slow upward crawl
        if disk > 96.0: disk = 85.0
        disk = max(15.0, min(97.0, round(disk, 1)))
        disk_used_gb = round((disk / 100.0) * vm["disk_total"], 1)

        # Network accumulation
        bytes_sent += random.randint(50000, 500000)
        bytes_recv += random.randint(100000, 1500000)

        payload = {
            "vm_id": vm["vm_id"],
            "hostname": vm["hostname"],
            "ip_address": vm["ip_address"],
            "os_info": vm["os_info"],
            "cpu_usage": cpu,
            "memory_usage": mem,
            "memory_used_mb": mem_used_mb,
            "memory_total_mb": vm["ram_total"],
            "disk_usage": disk,
            "disk_used_gb": disk_used_gb,
            "disk_total_gb": vm["disk_total"],
            "net_bytes_sent": bytes_sent,
            "net_bytes_recv": bytes_recv,
            "uptime_seconds": uptime
        }

        try:
            res = requests.post(server_url, json=payload, timeout=4)
            if res.status_code in (200, 201):
                logging.info(f"Pushed -> CPU: {cpu:4.1f}% | RAM: {mem:4.1f}% | Disk: {disk:4.1f}%")
            else:
                logging.warning(f"Error HTTP {res.status_code}: {res.text}")
        except Exception as e:
            logging.error(f"Failed sending metrics to backend: {e}")

        time.sleep(interval)

def main():
    logging.info("Initializing Multi-VM Cloud Monitoring Simulator...")
    logging.info(f"Target REST Endpoint: {SERVER_URL}")
    logging.info(f"Simulating {len(SIMULATED_VMS)} Virtual Machines...")

    threads = []
    for vm in SIMULATED_VMS:
        t = threading.Thread(
            target=vm_agent_thread,
            args=(vm, SERVER_URL, 3),
            name=vm["vm_id"],
            daemon=True
        )
        t.start()
        threads.append(t)
        time.sleep(0.5)

    logging.info("All VM threads active. Press Ctrl+C to terminate simulator.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logging.info("Stopping multi-VM simulator.")

if __name__ == "__main__":
    main()
