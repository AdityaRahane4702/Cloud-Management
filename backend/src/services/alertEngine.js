const { getPool, getIsPostgresAvailable, getInMemoryStore } = require('../config/db');

async function evaluateMetrics(vmId, metricData) {
  const isPg = getIsPostgresAvailable();

  if (isPg) {
    await evaluateMetricsPg(vmId, metricData);
  } else {
    await evaluateMetricsInMemory(vmId, metricData);
  }
}

async function evaluateMetricsPg(vmId, metricData) {
  const pool = getPool();
  try {
    // 1. Fetch active alert rules
    const rulesRes = await pool.query('SELECT * FROM alert_rules WHERE enabled = TRUE');
    const rules = rulesRes.rows;

    const values = {
      cpu: parseFloat(metricData.cpu_usage),
      memory: parseFloat(metricData.memory_usage),
      disk: parseFloat(metricData.disk_usage)
    };

    let highestSeverity = 'ONLINE';

    for (const rule of rules) {
      const metricName = rule.metric_name;
      const currentVal = values[metricName];

      if (currentVal === undefined) continue;

      const warningThresh = parseFloat(rule.warning_threshold);
      const criticalThresh = parseFloat(rule.critical_threshold);

      // Check if threshold breached
      let breachSeverity = null;
      let thresholdUsed = 0;

      if (currentVal >= criticalThresh) {
        breachSeverity = 'CRITICAL';
        thresholdUsed = criticalThresh;
      } else if (currentVal >= warningThresh) {
        breachSeverity = 'WARNING';
        thresholdUsed = warningThresh;
      }

      // Check existing active alert for this vm and metric
      const existingRes = await pool.query(
        `SELECT * FROM alerts WHERE vm_id = $1 AND metric_name = $2 AND status = 'ACTIVE'`,
        [vmId, metricName]
      );
      const existingAlert = existingRes.rows[0];

      if (breachSeverity) {
        if (!existingAlert) {
          // Create new active alert
          await pool.query(
            `INSERT INTO alerts (vm_id, metric_name, metric_value, threshold, severity, message, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
            [
              vmId,
              metricName,
              currentVal,
              thresholdUsed,
              breachSeverity,
              `${metricName.toUpperCase()} utilization breached ${breachSeverity} threshold: ${currentVal}% >= ${thresholdUsed}%`
            ]
          );
        } else if (existingAlert.severity !== breachSeverity) {
          // Update existing alert severity
          await pool.query(
            `UPDATE alerts SET severity = $1, metric_value = $2, threshold = $3, 
                    message = $4, created_at = CURRENT_TIMESTAMP WHERE id = $5`,
            [
              breachSeverity,
              currentVal,
              thresholdUsed,
              `${metricName.toUpperCase()} utilization updated to ${breachSeverity}: ${currentVal}% >= ${thresholdUsed}%`,
              existingAlert.id
            ]
          );
        }

        if (breachSeverity === 'CRITICAL') highestSeverity = 'CRITICAL';
        else if (highestSeverity !== 'CRITICAL') highestSeverity = 'WARNING';

      } else {
        // Normal range: resolve existing alert if active
        if (existingAlert) {
          await pool.query(
            `UPDATE alerts SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [existingAlert.id]
          );
        }
      }
    }

    // Determine final status for VM
    const activeAlertsRes = await pool.query(
      `SELECT severity FROM alerts WHERE vm_id = $1 AND status = 'ACTIVE'`,
      [vmId]
    );

    if (activeAlertsRes.rows.some(a => a.severity === 'CRITICAL')) {
      highestSeverity = 'CRITICAL';
    } else if (activeAlertsRes.rows.some(a => a.severity === 'WARNING')) {
      highestSeverity = 'WARNING';
    } else {
      highestSeverity = 'ONLINE';
    }

    // Update VM status in DB
    await pool.query(
      `UPDATE vms SET status = $1, last_seen = CURRENT_TIMESTAMP WHERE vm_id = $2`,
      [highestSeverity, vmId]
    );

  } catch (err) {
    console.error('Error in evaluateMetricsPg:', err.message);
  }
}

async function evaluateMetricsInMemory(vmId, metricData) {
  const store = getInMemoryStore();
  const values = {
    cpu: parseFloat(metricData.cpu_usage),
    memory: parseFloat(metricData.memory_usage),
    disk: parseFloat(metricData.disk_usage)
  };

  let highestSeverity = 'ONLINE';

  for (const rule of store.alertRules) {
    if (!rule.enabled) continue;
    const metricName = rule.metric_name;
    const currentVal = values[metricName];
    if (currentVal === undefined) continue;

    const warningThresh = parseFloat(rule.warning_threshold);
    const criticalThresh = parseFloat(rule.critical_threshold);

    let breachSeverity = null;
    let thresholdUsed = 0;

    if (currentVal >= criticalThresh) {
      breachSeverity = 'CRITICAL';
      thresholdUsed = criticalThresh;
    } else if (currentVal >= warningThresh) {
      breachSeverity = 'WARNING';
      thresholdUsed = warningThresh;
    }

    const existingAlertIndex = store.alerts.findIndex(
      a => a.vm_id === vmId && a.metric_name === metricName && a.status === 'ACTIVE'
    );

    if (breachSeverity) {
      if (existingAlertIndex === -1) {
        store.alerts.push({
          id: store.alerts.length + 1,
          vm_id: vmId,
          metric_name: metricName,
          metric_value: currentVal,
          threshold: thresholdUsed,
          severity: breachSeverity,
          message: `${metricName.toUpperCase()} utilization breached ${breachSeverity} threshold: ${currentVal}% >= ${thresholdUsed}%`,
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        });
      } else {
        store.alerts[existingAlertIndex].severity = breachSeverity;
        store.alerts[existingAlertIndex].metric_value = currentVal;
        store.alerts[existingAlertIndex].threshold = thresholdUsed;
        store.alerts[existingAlertIndex].message = `${metricName.toUpperCase()} utilization updated to ${breachSeverity}: ${currentVal}% >= ${thresholdUsed}%`;
      }
    } else {
      if (existingAlertIndex !== -1) {
        store.alerts[existingAlertIndex].status = 'RESOLVED';
        store.alerts[existingAlertIndex].resolved_at = new Date().toISOString();
      }
    }
  }

  const activeAlerts = store.alerts.filter(a => a.vm_id === vmId && a.status === 'ACTIVE');
  if (activeAlerts.some(a => a.severity === 'CRITICAL')) {
    highestSeverity = 'CRITICAL';
  } else if (activeAlerts.some(a => a.severity === 'WARNING')) {
    highestSeverity = 'WARNING';
  }

  const vm = store.vms.get(vmId);
  if (vm) {
    vm.status = highestSeverity;
    vm.last_seen = new Date().toISOString();
  }
}

module.exports = { evaluateMetrics };
