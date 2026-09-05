const express = require('express');
const router = express.Router();
const { getPool, getIsPostgresAvailable, getInMemoryStore } = require('../config/db');
const { evaluateMetrics } = require('../services/alertEngine');

// POST /api/metrics - Ingest metrics from Python Monitoring Agent
router.post('/', async (req, res) => {
  try {
    const {
      vm_id,
      hostname,
      ip_address,
      os_info,
      cpu_usage,
      memory_usage,
      memory_used_mb,
      memory_total_mb,
      disk_usage,
      disk_used_gb,
      disk_total_gb,
      net_bytes_sent,
      net_bytes_recv,
      uptime_seconds
    } = req.body;

    if (!vm_id || cpu_usage === undefined || memory_usage === undefined || disk_usage === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required metric fields (vm_id, cpu_usage, memory_usage, disk_usage)' });
    }

    const metricPayload = {
      vm_id,
      hostname: hostname || 'unknown-host',
      ip_address: ip_address || '127.0.0.1',
      os_info: os_info || 'Linux/Unix',
      cpu_usage: parseFloat(cpu_usage),
      memory_usage: parseFloat(memory_usage),
      memory_used_mb: parseFloat(memory_used_mb || 0),
      memory_total_mb: parseFloat(memory_total_mb || 0),
      disk_usage: parseFloat(disk_usage),
      disk_used_gb: parseFloat(disk_used_gb || 0),
      disk_total_gb: parseFloat(disk_total_gb || 0),
      net_bytes_sent: parseInt(net_bytes_sent || 0, 10),
      net_bytes_recv: parseInt(net_bytes_recv || 0, 10),
      uptime_seconds: parseInt(uptime_seconds || 0, 10),
      recorded_at: new Date()
    };

    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      // 1. Upsert VM registration
      await pool.query(
        `INSERT INTO vms (vm_id, hostname, ip_address, os_info, last_seen)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (vm_id) DO UPDATE 
         SET hostname = EXCLUDED.hostname,
             ip_address = EXCLUDED.ip_address,
             os_info = EXCLUDED.os_info,
             last_seen = CURRENT_TIMESTAMP`,
        [metricPayload.vm_id, metricPayload.hostname, metricPayload.ip_address, metricPayload.os_info]
      );

      // 2. Insert metric entry
      await pool.query(
        `INSERT INTO metrics (
          vm_id, cpu_usage, memory_usage, memory_used_mb, memory_total_mb,
          disk_usage, disk_used_gb, disk_total_gb, net_bytes_sent, net_bytes_recv,
          uptime_seconds, recorded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          metricPayload.vm_id,
          metricPayload.cpu_usage,
          metricPayload.memory_usage,
          metricPayload.memory_used_mb,
          metricPayload.memory_total_mb,
          metricPayload.disk_usage,
          metricPayload.disk_used_gb,
          metricPayload.disk_total_gb,
          metricPayload.net_bytes_sent,
          metricPayload.net_bytes_recv,
          metricPayload.uptime_seconds,
          metricPayload.recorded_at
        ]
      );
    } else {
      const store = getInMemoryStore();
      if (!store.vms.has(vm_id)) {
        store.vms.set(vm_id, {
          id: store.vms.size + 1,
          vm_id,
          hostname: metricPayload.hostname,
          ip_address: metricPayload.ip_address,
          os_info: metricPayload.os_info,
          status: 'ONLINE',
          last_seen: metricPayload.recorded_at.toISOString(),
          created_at: metricPayload.recorded_at.toISOString()
        });
      } else {
        const vm = store.vms.get(vm_id);
        vm.hostname = metricPayload.hostname;
        vm.ip_address = metricPayload.ip_address;
        vm.os_info = metricPayload.os_info;
        vm.last_seen = metricPayload.recorded_at.toISOString();
      }

      store.metrics.push({
        id: store.metrics.length + 1,
        ...metricPayload,
        recorded_at: metricPayload.recorded_at.toISOString()
      });

      // Keep max 500 metrics in-memory per VM to manage memory usage
      if (store.metrics.length > 2000) {
        store.metrics = store.metrics.slice(-1500);
      }
    }

    // 3. Evaluate alerting rules asynchronously
    await evaluateMetrics(vm_id, metricPayload);

    return res.status(201).json({
      success: true,
      message: 'Metrics recorded and alerts evaluated successfully'
    });
  } catch (err) {
    console.error('Error posting metrics:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/metrics/history/:vm_id - Fetch historical metric data for chart rendering
router.get('/history/:vm_id', async (req, res) => {
  const { vm_id } = req.params;
  const range = req.query.range || '1h'; // 15m, 1h, 6h, 24h
  let limit = 60;
  
  if (range === '15m') limit = 30;
  if (range === '1h') limit = 120;
  if (range === '6h') limit = 360;
  if (range === '24h') limit = 720;

  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      const query = `
        SELECT 
          cpu_usage, memory_usage, memory_used_mb, memory_total_mb,
          disk_usage, disk_used_gb, disk_total_gb, net_bytes_sent, net_bytes_recv,
          uptime_seconds, recorded_at
        FROM metrics
        WHERE vm_id = $1
        ORDER BY recorded_at DESC
        LIMIT $2
      `;
      const result = await pool.query(query, [vm_id, limit]);
      // Return in chronological order for chart display
      return res.json({ success: true, data: result.rows.reverse() });
    } else {
      const store = getInMemoryStore();
      const vmMetrics = store.metrics
        .filter(m => m.vm_id === vm_id)
        .slice(-limit);
      return res.json({ success: true, data: vmMetrics });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/metrics/overview - System overview statistics
router.get('/overview', async (req, res) => {
  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      const vmsRes = await pool.query('SELECT status FROM vms');
      const alertsRes = await pool.query(`SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE'`);
      const avgMetricsRes = await pool.query(`
        SELECT 
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage) as avg_memory,
          AVG(disk_usage) as avg_disk
        FROM (
          SELECT DISTINCT ON (vm_id) cpu_usage, memory_usage, disk_usage
          FROM metrics
          ORDER BY vm_id, recorded_at DESC
        ) latest
      `);

      const vms = vmsRes.rows;
      const total = vms.length;
      const online = vms.filter(v => v.status === 'ONLINE').length;
      const warning = vms.filter(v => v.status === 'WARNING').length;
      const critical = vms.filter(v => v.status === 'CRITICAL').length;
      const offline = vms.filter(v => v.status === 'OFFLINE').length;

      const avg = avgMetricsRes.rows[0] || {};

      return res.json({
        success: true,
        summary: {
          totalVMs: total,
          onlineVMs: online,
          warningVMs: warning,
          criticalVMs: critical,
          offlineVMs: offline,
          activeAlerts: parseInt(alertsRes.rows[0].count, 10),
          avgCpuUsage: parseFloat(avg.avg_cpu || 0).toFixed(1),
          avgMemoryUsage: parseFloat(avg.avg_memory || 0).toFixed(1),
          avgDiskUsage: parseFloat(avg.avg_disk || 0).toFixed(1)
        }
      });
    } else {
      const store = getInMemoryStore();
      const vms = Array.from(store.vms.values());
      const total = vms.length;
      const online = vms.filter(v => v.status === 'ONLINE').length;
      const warning = vms.filter(v => v.status === 'WARNING').length;
      const critical = vms.filter(v => v.status === 'CRITICAL').length;
      const offline = vms.filter(v => v.status === 'OFFLINE').length;

      const activeAlerts = store.alerts.filter(a => a.status === 'ACTIVE').length;

      // Compute averages from latest metric per VM
      let totalCpu = 0, totalMem = 0, totalDisk = 0, count = 0;
      vms.forEach(vm => {
        const vmMetrics = store.metrics.filter(m => m.vm_id === vm.vm_id);
        const last = vmMetrics[vmMetrics.length - 1];
        if (last) {
          totalCpu += parseFloat(last.cpu_usage);
          totalMem += parseFloat(last.memory_usage);
          totalDisk += parseFloat(last.disk_usage);
          count++;
        }
      });

      return res.json({
        success: true,
        summary: {
          totalVMs: total,
          onlineVMs: online,
          warningVMs: warning,
          criticalVMs: critical,
          offlineVMs: offline,
          activeAlerts,
          avgCpuUsage: count ? (totalCpu / count).toFixed(1) : '0.0',
          avgMemoryUsage: count ? (totalMem / count).toFixed(1) : '0.0',
          avgDiskUsage: count ? (totalDisk / count).toFixed(1) : '0.0'
        }
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
