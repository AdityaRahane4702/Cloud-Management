import React from 'react';
import { Play, Square, Terminal, Cpu, CheckCircle } from 'lucide-react';

export default function SimulatorControl({ onRefresh }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={18} color="#a855f7" /> Multi-VM Agent Simulator Guide & Terminal Commands
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Test real-time multi-VM telemetry, dynamic resource workload spikes, and alert threshold notifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle size={14} /> python3 agent/simulator.py
          </div>
        </div>
      </div>
    </div>
  );
}
