const express = require('express');
const router = express.Router();
const { getPool, getIsPostgresAvailable, getInMemoryStore } = require('../config/db');

// GET /api/alerts - List all generated alerts
router.get('/', async (req, res) => {
  const status = req.query.status; // ACTIVE, RESOLVED, or all
  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      let query = `
        SELECT a.*, v.hostname, v.ip_address 
        FROM alerts a
        LEFT JOIN vms v ON a.vm_id = v.vm_id
      `;
      const params = [];
      if (status) {
        query += ` WHERE a.status = $1`;
        params.push(status);
      }
      query += ` ORDER BY a.created_at DESC LIMIT 100`;

      const result = await pool.query(query, params);
      return res.json({ success: true, count: result.rows.length, data: result.rows });
    } else {
      const store = getInMemoryStore();
      let alerts = [...store.alerts];
      if (status) {
        alerts = alerts.filter(a => a.status === status);
      }
      alerts = alerts.map(a => {
        const vm = store.vms.get(a.vm_id);
        return {
          ...a,
          hostname: vm ? vm.hostname : 'unknown',
          ip_address: vm ? vm.ip_address : '127.0.0.1'
        };
      }).reverse();
      return res.json({ success: true, count: alerts.length, data: alerts });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/alerts/:id/resolve - Manually mark an alert as resolved
router.put('/:id/resolve', async (req, res) => {
  const { id } = req.params;
  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      const result = await pool.query(
        `UPDATE alerts SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }
      return res.json({ success: true, data: result.rows[0] });
    } else {
      const store = getInMemoryStore();
      const alert = store.alerts.find(a => a.id === parseInt(id, 10));
      if (!alert) {
        return res.status(404).json({ success: false, error: 'Alert not found' });
      }
      alert.status = 'RESOLVED';
      alert.resolved_at = new Date().toISOString();
      return res.json({ success: true, data: alert });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/alerts/rules - Get threshold rules
router.get('/rules', async (req, res) => {
  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      const result = await pool.query(`SELECT * FROM alert_rules ORDER BY id ASC`);
      return res.json({ success: true, data: result.rows });
    } else {
      const store = getInMemoryStore();
      return res.json({ success: true, data: store.alertRules });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/rules - Update threshold rules
router.post('/rules', async (req, res) => {
  const { rules } = req.body; // Array of { metric_name, warning_threshold, critical_threshold, enabled }
  if (!Array.isArray(rules)) {
    return res.status(400).json({ success: false, error: 'Invalid payload, expected array of rules' });
  }

  try {
    const isPg = getIsPostgresAvailable();

    if (isPg) {
      const pool = getPool();
      for (const rule of rules) {
        await pool.query(
          `INSERT INTO alert_rules (metric_name, warning_threshold, critical_threshold, enabled)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [rule.metric_name, rule.warning_threshold, rule.critical_threshold, rule.enabled ?? true]
        );
        await pool.query(
          `UPDATE alert_rules 
           SET warning_threshold = $1, critical_threshold = $2, enabled = $3
           WHERE metric_name = $4`,
          [rule.warning_threshold, rule.critical_threshold, rule.enabled ?? true, rule.metric_name]
        );
      }
      const updated = await pool.query(`SELECT * FROM alert_rules ORDER BY id ASC`);
      return res.json({ success: true, data: updated.rows });
    } else {
      const store = getInMemoryStore();
      rules.forEach(newRule => {
        const existing = store.alertRules.find(r => r.metric_name === newRule.metric_name);
        if (existing) {
          existing.warning_threshold = parseFloat(newRule.warning_threshold);
          existing.critical_threshold = parseFloat(newRule.critical_threshold);
          existing.enabled = newRule.enabled ?? true;
        } else {
          store.alertRules.push({
            id: store.alertRules.length + 1,
            metric_name: newRule.metric_name,
            warning_threshold: parseFloat(newRule.warning_threshold),
            critical_threshold: parseFloat(newRule.critical_threshold),
            enabled: newRule.enabled ?? true
          });
        }
      });
      return res.json({ success: true, data: store.alertRules });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
