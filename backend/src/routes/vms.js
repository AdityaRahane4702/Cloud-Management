const express = require('express');
const router = express.Router();
const { getPool, getIsPostgresAvailable, getInMemoryStore, getDeregisteredVms } = require('../config/db');

// GET /api/vms - List all registered VMs with their latest metric snapshot
router.get('/', async (req, res) => {
  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      const query = `
        SELECT 
          v.id,
          v.vm_id,
          v.hostname,
          v.ip_address,
          v.os_info,
          v.status,
          v.last_seen,
          v.created_at,
          m.cpu_usage,
          m.memory_usage,
          m.memory_used_mb,
          m.memory_total_mb,
          m.disk_usage,
          m.disk_used_gb,
          m.disk_total_gb,
          m.net_bytes_sent,
          m.net_bytes_recv,
          m.uptime_seconds,
          m.recorded_at AS last_metric_time
        FROM vms v
        LEFT JOIN LATERAL (
          SELECT * FROM metrics 
          WHERE vm_id = v.vm_id 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ) m ON true
        ORDER BY v.last_seen DESC;
      `;
      const result = await pool.query(query);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    } else {
      const store = getInMemoryStore();
      const vms = Array.from(store.vms.values()).map(vm => {
        const vmMetrics = store.metrics.filter(m => m.vm_id === vm.vm_id);
        const lastMetric = vmMetrics[vmMetrics.length - 1] || {};
        return {
          ...vm,
          cpu_usage: lastMetric.cpu_usage || 0,
          memory_usage: lastMetric.memory_usage || 0,
          memory_used_mb: lastMetric.memory_used_mb || 0,
          memory_total_mb: lastMetric.memory_total_mb || 0,
          disk_usage: lastMetric.disk_usage || 0,
          disk_used_gb: lastMetric.disk_used_gb || 0,
          disk_total_gb: lastMetric.disk_total_gb || 0,
          net_bytes_sent: lastMetric.net_bytes_sent || 0,
          net_bytes_recv: lastMetric.net_bytes_recv || 0,
          uptime_seconds: lastMetric.uptime_seconds || 0,
          last_metric_time: lastMetric.recorded_at || null
        };
      });
      return res.json({ success: true, count: vms.length, data: vms });
    }
  } catch (err) {
    console.error('Error fetching VMs:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/vms/:vm_id - Get details of a single VM
router.get('/:vm_id', async (req, res) => {
  const { vm_id } = req.params;
  try {
    const isPg = getIsPostgresAvailable();
    if (isPg) {
      const pool = getPool();
      const result = await pool.query('SELECT * FROM vms WHERE vm_id = $1', [vm_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'VM not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const store = getInMemoryStore();
      const vm = store.vms.get(vm_id);
      if (!vm) {
        return res.status(404).json({ success: false, error: 'VM not found' });
      }
      return res.json({ success: true, data: vm });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/vms/:vm_id/register - Re-register a previously deregistered VM
router.post('/:vm_id/register', async (req, res) => {
  const { vm_id } = req.params;
  try {
    const deregistered = getDeregisteredVms();
    deregistered.delete(vm_id);
    deregistered.delete('*');

    const isPg = getIsPostgresAvailable();
    if (isPg) {
      const pool = getPool();
      await pool.query(
        `UPDATE vms SET status = 'OFFLINE', is_deregistered = FALSE, last_seen = CURRENT_TIMESTAMP WHERE vm_id = $1`,
        [vm_id]
      );
    } else {
      const store = getInMemoryStore();
      const vm = store.vms.get(vm_id);
      if (vm) {
        vm.status = 'OFFLINE';
        vm.is_deregistered = false;
      }
    }
    return res.json({ success: true, message: `VM '${vm_id}' re-registered successfully. Ready to accept metrics.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vms - Clear/Purge all VMs, metrics, and alerts
router.delete('/', async (req, res) => {
  try {
    const deregistered = getDeregisteredVms();
    deregistered.add('*'); // Mark all agents to self-terminate

    const isPg = getIsPostgresAvailable();
    if (isPg) {
      const pool = getPool();
      await pool.query(`UPDATE vms SET status = 'DEREGISTERED', is_deregistered = TRUE`);
    } else {
      const store = getInMemoryStore();
      store.vms.forEach(vm => {
        vm.status = 'DEREGISTERED';
        vm.is_deregistered = true;
      });
    }
    return res.json({ success: true, message: 'All VMs marked as DEREGISTERED' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/vms/:vm_id - Mark VM as DEREGISTERED
router.delete('/:vm_id', async (req, res) => {
  const { vm_id } = req.params;
  try {
    const deregistered = getDeregisteredVms();
    deregistered.add(vm_id); // Mark specific agent to self-terminate

    const isPg = getIsPostgresAvailable();
    if (isPg) {
      const pool = getPool();
      await pool.query(
        `UPDATE vms SET status = 'DEREGISTERED', is_deregistered = TRUE WHERE vm_id = $1`,
        [vm_id]
      );
    } else {
      const store = getInMemoryStore();
      const vm = store.vms.get(vm_id);
      if (vm) {
        vm.status = 'DEREGISTERED';
        vm.is_deregistered = true;
      }
    }
    return res.json({ success: true, message: `VM '${vm_id}' deregistered successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
