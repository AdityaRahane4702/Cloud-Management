import React, { useState, useEffect } from 'react';
import { X, Cpu, Database, HardDrive, Wifi, Trash2, Clock, Activity, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ─── Stat Chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value, sub, color = '#6366f1' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '0.85rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flex: '1 1 160px',
      minWidth: '140px'
    }}>
      <div style={{
        background: `${color}22`,
        borderRadius: '10px',
        padding: '0.55rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {React.cloneElement(icon, { size: 18, color })}
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.15rem' }}>{label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, unit, extra }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px',
      padding: '0.6rem 0.9rem',
      fontSize: '0.82rem',
      color: '#fff'
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}{unit}
        </div>
      ))}
      {extra && payload[0] && (
        <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
          {extra(payload[0].payload)}
        </div>
      )}
    </div>
  );
}

// ─── Chart Panel ────────────────────────────────────────────────────────────────
function ChartPanel({ title, icon, color, data, dataKey, unit = '%', latest, latestSub, extra }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.6)',
      padding: '1.25rem',
      borderRadius: '14px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span style={{ fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {React.cloneElement(icon, { size: 15, color })} {title}
        </span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, color: '#ffffff' }}>{latest}</div>
          {latestSub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{latestSub}</div>}
        </div>
      </div>
      <div style={{ width: '100%', height: 175 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="timeLabel" stroke="var(--text-dim)" fontSize={10} tick={{ fill: 'var(--text-dim)' }} />
            <YAxis
              domain={unit === '%' ? [0, 100] : ['auto', 'auto']}
              stroke="var(--text-dim)"
              fontSize={10}
              tick={{ fill: 'var(--text-dim)' }}
              unit={unit}
              width={52}
            />
            <Tooltip content={<CustomTooltip unit={unit} extra={extra} />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              name={title}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function formatMB(mb) {
  if (mb == null || isNaN(mb)) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${parseFloat(mb).toFixed(0)} MB`;
}

function formatGB(gb) {
  if (gb == null || isNaN(gb)) return '—';
  return `${parseFloat(gb).toFixed(1)} GB`;
}

function formatNetBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

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
        const formatted = json.data.map(item => {
          const t = new Date(item.recorded_at);
          return {
            ...item,
            timeLabel: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            cpu: parseFloat(item.cpu_usage || 0),
            memory: parseFloat(item.memory_usage || 0),
            disk: parseFloat(item.disk_usage || 0),
            memory_used_mb: parseFloat(item.memory_used_mb || 0),
            memory_total_mb: parseFloat(item.memory_total_mb || 0),
            disk_used_gb: parseFloat(item.disk_used_gb || 0),
            disk_total_gb: parseFloat(item.disk_total_gb || 0),
            netRecvKb: parseFloat((parseInt(item.net_bytes_recv || 0) / 1024).toFixed(1)),
            netSentKb: parseFloat((parseInt(item.net_bytes_sent || 0) / 1024).toFixed(1)),
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

  const latest = history[history.length - 1] || {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                {vm.hostname}
              </h2>
              <span className={`badge badge-${isDeregistered ? 'offline' : (vm.status || 'ONLINE').toLowerCase()}`}>
                {isDeregistered ? 'DEREGISTERED' : vm.status || 'ONLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              VM ID: <code style={{ color: '#a855f7' }}>{vm.vm_id}</code> &nbsp;•&nbsp; IP: {vm.ip_address} &nbsp;•&nbsp; {vm.os_info}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {isDeregistered ? (
              <>
                <button
                  onClick={() => { if (onReRegisterVM) onReRegisterVM(vm.vm_id); }}
                  className="btn-secondary"
                  style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  title="Re-register this VM"
                >
                  <RefreshCw size={15} /><span>Re-register VM</span>
                </button>
                <button
                  onClick={() => { if (onPurgeVM) onPurgeVM(vm.vm_id); }}
                  className="btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  title="Permanently delete VM and history"
                >
                  <Trash2 size={15} /><span>Delete Permanently</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onDeleteVM(vm.vm_id)}
                className="btn-secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Deregister VM"
              >
                <Trash2 size={15} /><span>Deregister</span>
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

        {/* ── Resource Summary Chips ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <StatChip
            icon={<Database />}
            label="RAM Used"
            value={formatMB(parseFloat(vm.memory_used_mb || 0))}
            sub={vm.memory_total_mb
              ? `of ${formatMB(parseFloat(vm.memory_total_mb))} (${parseFloat(vm.memory_usage || 0).toFixed(1)}%)`
              : null}
            color="#3b82f6"
          />
          <StatChip
            icon={<HardDrive />}
            label="Storage Used"
            value={formatGB(parseFloat(vm.disk_used_gb || 0))}
            sub={vm.disk_total_gb
              ? `of ${formatGB(parseFloat(vm.disk_total_gb))} (${parseFloat(vm.disk_usage || 0).toFixed(1)}%)`
              : null}
            color="#10b981"
          />
          <StatChip
            icon={<Cpu />}
            label="CPU Usage"
            value={`${parseFloat(vm.cpu_usage || 0).toFixed(1)}%`}
            sub="Latest reading"
            color="#a855f7"
          />
          <StatChip
            icon={<Clock />}
            label="Uptime"
            value={formatUptime(parseInt(vm.uptime_seconds || 0))}
            sub="Since last reboot"
            color="#f59e0b"
          />
          <StatChip
            icon={<ArrowDown />}
            label="Net Received"
            value={formatNetBytes(parseInt(vm.net_bytes_recv || 0))}
            sub="Total ingress"
            color="#06b6d4"
          />
          <StatChip
            icon={<ArrowUp />}
            label="Net Sent"
            value={formatNetBytes(parseInt(vm.net_bytes_sent || 0))}
            sub="Total egress"
            color="#8b5cf6"
          />
        </div>

        {/* ── Time Range Selector ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={17} color="#6366f1" /> Historical Performance
          </h3>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '8px' }}>
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

        {/* ── Charts ── */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading VM performance metrics...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No metric points recorded for this timeframe yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

            {/* CPU */}
            <ChartPanel
              title="CPU Usage"
              icon={<Cpu />}
              color="#a855f7"
              data={history}
              dataKey="cpu"
              unit="%"
              latest={`${history[history.length - 1]?.cpu?.toFixed?.(1)}%`}
              latestSub="utilization"
            />

            {/* RAM */}
            <ChartPanel
              title="RAM Usage"
              icon={<Database />}
              color="#3b82f6"
              data={history}
              dataKey="memory"
              unit="%"
              latest={`${history[history.length - 1]?.memory?.toFixed?.(1)}%`}
              latestSub={history[history.length - 1]?.memory_used_mb
                ? `${formatMB(history[history.length - 1].memory_used_mb)} / ${formatMB(history[history.length - 1].memory_total_mb)}`
                : null}
              extra={(row) => `${formatMB(row.memory_used_mb)} used of ${formatMB(row.memory_total_mb)}`}
            />

            {/* Disk */}
            <ChartPanel
              title="Storage (Disk)"
              icon={<HardDrive />}
              color="#10b981"
              data={history}
              dataKey="disk"
              unit="%"
              latest={`${history[history.length - 1]?.disk?.toFixed?.(1)}%`}
              latestSub={history[history.length - 1]?.disk_used_gb
                ? `${formatGB(history[history.length - 1].disk_used_gb)} / ${formatGB(history[history.length - 1].disk_total_gb)}`
                : null}
              extra={(row) => `${formatGB(row.disk_used_gb)} used of ${formatGB(row.disk_total_gb)}`}
            />

            {/* Network Received */}
            <ChartPanel
              title="Network Received"
              icon={<Wifi />}
              color="#06b6d4"
              data={history}
              dataKey="netRecvKb"
              unit=" KB"
              latest={`${history[history.length - 1]?.netRecvKb?.toLocaleString?.()} KB`}
              latestSub="cumulative ingress"
            />

          </div>
        )}

      </div>
    </div>
  );
}
