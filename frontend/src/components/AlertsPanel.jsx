import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Settings, Sliders, ShieldAlert, Save } from 'lucide-react';

export default function AlertsPanel({ onRefreshOverview }) {
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [filter, setFilter] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [ruleMessage, setRuleMessage] = useState('');

  useEffect(() => {
    fetchAlerts();
    fetchRules();
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`/api/alerts?status=${filter === 'ALL' ? '' : filter}`);
      const json = await res.json();
      if (json.success) setAlerts(json.data);
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/alerts/rules');
      const json = await res.json();
      if (json.success) setRules(json.data);
    } catch (err) {
      console.error('Error loading alert rules:', err);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) {
        fetchAlerts();
        if (onRefreshOverview) onRefreshOverview();
      }
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const handleRuleChange = (metricName, field, value) => {
    setRules(prev => prev.map(r => {
      if (r.metric_name === metricName) {
        return { ...r, [field]: parseFloat(value) || value };
      }
      return r;
    }));
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });
      const json = await res.json();
      if (json.success) {
        setRuleMessage('Alert threshold rules updated successfully!');
        setTimeout(() => setRuleMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error saving rules:', err);
    } finally {
      setSavingRules(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
      
      {/* Alerts Timeline List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={20} color="#ef4444" /> System Alerts Feed
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['ACTIVE', 'RESOLVED', 'ALL'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="btn-secondary"
                style={{
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.8125rem',
                  background: filter === f ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: filter === f ? '#fff' : 'var(--text-muted)'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading alerts log...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No {filter.toLowerCase()} alerts found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {alerts.map(a => (
              <div 
                key={a.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderLeft: `4px solid ${a.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}`,
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`badge badge-${a.severity.toLowerCase()}`}>
                      {a.severity}
                    </span>
                    <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9375rem' }}>
                      {a.hostname || a.vm_id} ({a.metric_name.toUpperCase()})
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      • {new Date(a.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {a.message}
                  </p>
                </div>

                {a.status === 'ACTIVE' ? (
                  <button 
                    onClick={() => handleResolveAlert(a.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                  >
                    <CheckCircle size={14} /> Mark Resolved
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <CheckCircle size={14} /> Resolved
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Threshold Rules Config Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} color="#6366f1" /> Threshold Rules
        </h3>

        {ruleMessage && (
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.5rem', borderRadius: '8px', fontSize: '0.8125rem', marginBottom: '1rem' }}>
            {ruleMessage}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {rules.map(rule => (
            <div key={rule.metric_name} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                {rule.metric_name} Metric Limits
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.8125rem' }}>
                <div>
                  <label style={{ color: 'var(--color-warning)' }}>Warning Threshold: {rule.warning_threshold}%</label>
                  <input 
                    type="range" min="30" max="95" 
                    value={rule.warning_threshold}
                    onChange={(e) => handleRuleChange(rule.metric_name, 'warning_threshold', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--color-warning)' }}
                  />
                </div>

                <div>
                  <label style={{ color: 'var(--color-critical)' }}>Critical Threshold: {rule.critical_threshold}%</label>
                  <input 
                    type="range" min="50" max="99" 
                    value={rule.critical_threshold}
                    onChange={(e) => handleRuleChange(rule.metric_name, 'critical_threshold', e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--color-critical)' }}
                  />
                </div>
              </div>
            </div>
          ))}

          <button 
            onClick={handleSaveRules}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
            disabled={savingRules}
          >
            <Save size={16} /> Save Threshold Rules
          </button>
        </div>
      </div>

    </div>
  );
}
