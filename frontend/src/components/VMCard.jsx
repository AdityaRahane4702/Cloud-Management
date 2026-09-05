import React from 'react';
import { Cpu, HardDrive, Database, Wifi, ExternalLink, Clock } from 'lucide-react';

export default function VMCard({ vm, onSelectVM }) {
  const status = vm.status || 'ONLINE';
  const cpu = parseFloat(vm.cpu_usage || 0);
  const mem = parseFloat(vm.memory_usage || 0);
  const disk = parseFloat(vm.disk_usage || 0);

  // Helper color for percentage bars
  const getMeterColor = (val) => {
    if (val >= 90) return '#ef4444'; // Red
    if (val >= 75) return '#f59e0b'; // Amber
    return '#6366f1'; // Indigo
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="glass-panel" style={{
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
      cursor: 'pointer'
    }}
    onClick={() => onSelectVM(vm)}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)'}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
    >
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
              {vm.hostname}
            </h3>
            <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              {vm.ip_address} • {vm.vm_id}
            </p>
          </div>
          <span className={`badge badge-${status.toLowerCase()}`}>
            <span className={`status-dot status-dot-${status.toLowerCase()}`}></span>
            {status}
          </span>
        </div>

        {/* OS info badge */}
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.03)',
          padding: '0.3rem 0.5rem',
          borderRadius: '6px',
          marginBottom: '1rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {vm.os_info || 'Linux OS'}
        </div>

        {/* Metrics Progress Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          
          {/* CPU Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                <Cpu size={14} color="#a855f7" /> CPU Usage
              </span>
              <span style={{ fontWeight: 600, color: getMeterColor(cpu) }}>
                {cpu.toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(100, cpu)}%`, backgroundColor: getMeterColor(cpu) }}
              />
            </div>
          </div>

          {/* Memory Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                <Database size={14} color="#3b82f6" /> Memory (RAM)
              </span>
              <span style={{ fontWeight: 600, color: getMeterColor(mem) }}>
                {mem.toFixed(1)}% <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>({vm.memory_used_mb} MB)</span>
              </span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(100, mem)}%`, backgroundColor: getMeterColor(mem) }}
              />
            </div>
          </div>

          {/* Disk Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                <HardDrive size={14} color="#10b981" /> Storage (Disk)
              </span>
              <span style={{ fontWeight: 600, color: getMeterColor(disk) }}>
                {disk.toFixed(1)}% <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>({vm.disk_used_gb} GB)</span>
              </span>
            </div>
            <div className="progress-bar-bg">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${Math.min(100, disk)}%`, backgroundColor: getMeterColor(disk) }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Footer Info & Details Button */}
      <div style={{
        marginTop: '1.25rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-dim)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> {formatUptime(vm.uptime_seconds)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Wifi size={12} /> {formatBytes(vm.net_bytes_recv)}
          </span>
        </div>

        <button 
          className="btn-secondary" 
          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectVM(vm);
          }}
        >
          <span>Metrics</span>
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
