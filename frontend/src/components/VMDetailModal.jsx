import React, { useState, useEffect } from 'react';
import { X, Cpu, Database, HardDrive, Wifi, Trash2, Clock, Activity, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function VMDetailModal({ vm, onClose, onDeleteVM, onReRegisterVM, onPurgeVM }) {
  const [history, setHistory] = useState([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const isDeregistered = vm?.is_deregistered || vm?.status === 'DEREGISTERED';

  useEffect(() => {
    if (!vm) return;
    fetchHistory();
  }, [vm, timeRange]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/metrics/history/${vm.vm_id}?range=${timeRange}`);
      const json = await res.json();
      if (json.success) {
        // Format time strings for chart display
        const formatted = json.data.map(item => {
          const t = new Date(item.recorded_at);
          return {
            ...item,
            timeLabel: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            cpu: parseFloat(item.cpu_usage),
            memory: parseFloat(item.memory_usage),
            disk: parseFloat(item.disk_usage),
            netSentKb: (parseInt(item.net_bytes_sent || 0) / 1024).toFixed(1),
            netRecvKb: (parseInt(item.net_bytes_recv || 0) / 1024).toFixed(1)
          };
        });
        setHistory(formatted);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!vm) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
                {vm.hostname}
              </h2>
              <span className={`badge badge-${isDeregistered ? 'offline' : (vm.status || 'ONLINE').toLowerCase()}`}>
                {isDeregistered ? 'DEREGISTERED' : vm.status || 'ONLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              VM ID: <code style={{ color: '#a855f7' }}>{vm.vm_id}</code> • IP: {vm.ip_address} • {vm.os_info}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isDeregistered ? (
              <>
                <button 
                  onClick={() => {
                    if (onReRegisterVM) onReRegisterVM(vm.vm_id);
                  }}
                  className="btn-secondary"
                  style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  title="Re-register this VM"
                >
                  <RefreshCw size={16} />
                  <span>Re-register VM</span>
                </button>

                <button 
                  onClick={() => {
                    if (onPurgeVM) onPurgeVM(vm.vm_id);
                  }}
                  className="btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title="Permanently delete VM and history"
                >
                  <Trash2 size={16} />
                  <span>Delete Permanently</span>
                </button>
              </>
            ) : (
              <button 
                onClick={() => onDeleteVM(vm.vm_id)}
                className="btn-secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Deregister VM"
              >
                <Trash2 size={16} />
                <span>Deregister</span>
              </button>
            )}

            <button 
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#6366f1" /> Historical Performance Telemetry
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
            {['15m', '1h', '6h', '24h'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  background: timeRange === r ? 'var(--primary)' : 'transparent',
                  color: timeRange === r ? '#ffffff' : 'var(--text-muted)',
                  border: 'none',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Grid */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading VM performance metrics...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No metric points recorded for this timeframe yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            
            {/* CPU Chart */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Cpu size={16} /> CPU Utilization %
                </span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                  Latest: {history[history.length - 1]?.cpu}%
                </span>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="var(--text-dim)" fontSize={11} unit="%" />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }} 
                    />
                    <Line type="monotone" dataKey="cpu" stroke="#a855f7" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RAM Chart */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Database size={16} /> Memory (RAM) Usage %
                </span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>
                  Latest: {history[history.length - 1]?.memory}% ({history[history.length - 1]?.memory_used_mb} MB)
                </span>
              </div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timeLabel" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="var(--text-dim)" fontSize={11} unit="%" />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', borderColor: 'var(--border-color)', borderRadius: '8px', color: '#fff' }} 
                    />
                    <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
