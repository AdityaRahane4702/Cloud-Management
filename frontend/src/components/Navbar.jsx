import React from 'react';
import { Server, Activity, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export default function Navbar({ overview, isAutoRefresh, setIsAutoRefresh, onManualRefresh, loading }) {
  const activeAlerts = overview?.activeAlerts || 0;

  return (
    <header className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            padding: '0.625rem',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Server size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Cloud VM Monitoring Dashboard
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Centralized Infrastructure Telemetry & Real-Time Alert System
            </p>
          </div>
        </div>

        {/* Action Controls & Health State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Active Alerts Badge */}
          {activeAlerts > 0 ? (
            <div className="badge badge-critical" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}>
              <AlertTriangle size={15} />
              <span>{activeAlerts} Active Alert{activeAlerts > 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div className="badge badge-online" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}>
              <ShieldCheck size={15} />
              <span>All Systems Normal</span>
            </div>
          )}

          {/* Auto Refresh Toggle */}
          <button 
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className="btn-secondary"
            style={{ fontSize: '0.8125rem', padding: '0.4rem 0.8rem' }}
          >
            <Activity size={14} color={isAutoRefresh ? '#10b981' : '#6b7280'} />
            <span>Auto Refresh: {isAutoRefresh ? 'ON (3s)' : 'OFF'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button 
            onClick={onManualRefresh}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.6rem' }}
            title="Refresh metrics now"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>

      </div>
    </header>
  );
}
