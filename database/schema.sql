-- Schema for Cloud-Based Virtual Machine Monitoring Dashboard

-- Create Database if executing manually:
-- CREATE DATABASE vm_monitoring;
-- \c vm_monitoring;

-- Table 1: Virtual Machines Registry
CREATE TABLE IF NOT EXISTS vms (
    id SERIAL PRIMARY KEY,
    vm_id VARCHAR(64) UNIQUE NOT NULL,
    hostname VARCHAR(128) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    os_info VARCHAR(128) DEFAULT 'Linux/Unix',
    status VARCHAR(20) DEFAULT 'ONLINE', -- ONLINE, WARNING, CRITICAL, OFFLINE, DEREGISTERED
    is_deregistered BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Historical Performance Metrics
CREATE TABLE IF NOT EXISTS metrics (
    id BIGSERIAL PRIMARY KEY,
    vm_id VARCHAR(64) REFERENCES vms(vm_id) ON DELETE CASCADE,
    cpu_usage NUMERIC(5, 2) NOT NULL, -- percentage 0.00 to 100.00
    memory_usage NUMERIC(5, 2) NOT NULL, -- percentage
    memory_used_mb NUMERIC(10, 2) NOT NULL,
    memory_total_mb NUMERIC(10, 2) NOT NULL,
    disk_usage NUMERIC(5, 2) NOT NULL, -- percentage
    disk_used_gb NUMERIC(10, 2) NOT NULL,
    disk_total_gb NUMERIC(10, 2) NOT NULL,
    net_bytes_sent BIGINT DEFAULT 0,
    net_bytes_recv BIGINT DEFAULT 0,
    uptime_seconds BIGINT DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Alert Rules Configuration
CREATE TABLE IF NOT EXISTS alert_rules (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(32) NOT NULL, -- cpu, memory, disk
    warning_threshold NUMERIC(5, 2) NOT NULL, -- e.g. 75.0
    critical_threshold NUMERIC(5, 2) NOT NULL, -- e.g. 90.0
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Generated Alerts Log
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    vm_id VARCHAR(64) REFERENCES vms(vm_id) ON DELETE CASCADE,
    metric_name VARCHAR(32) NOT NULL,
    metric_value NUMERIC(5, 2) NOT NULL,
    threshold NUMERIC(5, 2) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- WARNING, CRITICAL
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for time-series optimization and fast lookups
CREATE INDEX IF NOT EXISTS idx_metrics_vm_time ON metrics(vm_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_vm_status ON alerts(vm_id, status);
CREATE INDEX IF NOT EXISTS idx_vms_status ON vms(status);

-- Seed Default Alert Rules if empty
INSERT INTO alert_rules (metric_name, warning_threshold, critical_threshold, enabled)
SELECT 'cpu', 75.00, 90.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE metric_name = 'cpu');

INSERT INTO alert_rules (metric_name, warning_threshold, critical_threshold, enabled)
SELECT 'memory', 80.00, 92.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE metric_name = 'memory');

INSERT INTO alert_rules (metric_name, warning_threshold, critical_threshold, enabled)
SELECT 'disk', 85.00, 95.00, TRUE
WHERE NOT EXISTS (SELECT 1 FROM alert_rules WHERE metric_name = 'disk');
