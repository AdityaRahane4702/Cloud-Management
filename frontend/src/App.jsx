import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import VMCard from './components/VMCard';
import VMDetailModal from './components/VMDetailModal';
import AlertsPanel from './components/AlertsPanel';
import { Server, Activity, ShieldAlert, Cpu, Database, HardDrive, Search, Filter, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [vms, setVms] = useState([]);
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('vms'); // 'vms', 'alerts'
  const [selectedVm, setSelectedVm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
    let interval = null;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        fetchAllData(true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoRefresh]);

  const fetchAllData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [vmsRes, overviewRes] = await Promise.all([
        fetch('/api/vms'),
        fetch('/api/metrics/overview')
      ]);

      const vmsJson = await vmsRes.json();
      const overviewJson = await overviewRes.json();

      if (vmsJson.success) setVms(vmsJson.data);
      if (overviewJson.success) setOverview(overviewJson.summary);
    } catch (err) {
      console.error('Error fetching dashboard telemetry:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleReRegisterVM = async (vmId) => {
    try {
      const res = await fetch(`/api/vms/${vmId}/register`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        if (selectedVm) setSelectedVm(prev => prev ? { ...prev, status: 'OFFLINE', is_deregistered: false } : null);
        fetchAllData();
      }
    } catch (err) {
      console.error('Error re-registering VM:', err);
    }
  };

  const handleDeleteVM = async (vmId) => {
    if (!confirm(`Are you sure you want to deregister VM '${vmId}'?`)) return;
    try {
      const res = await fetch(`/api/vms/${vmId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSelectedVm(null);
        fetchAllData();
      }
    } catch (err) {
      console.error('Error deleting VM:', err);
    }
  };

  // Filter VMs by search text & status pill
  const filteredVMs = vms.filter(vm => {
    const matchesSearch =
      (vm.hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vm.vm_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (vm.ip_address || '').includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || (vm.is_deregistered && statusFilter === 'DEREGISTERED') || (vm.status || 'ONLINE') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="app-container">

      {/* Top Navbar */}
      <Navbar
        overview={overview}
        isAutoRefresh={isAutoRefresh}
        setIsAutoRefresh={setIsAutoRefresh}
        onManualRefresh={() => fetchAllData()}
        loading={loading}
      />

      {/* KPI Overview Grid */}
      <div className="summary-grid">

        {/* Total VMs */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '0.75rem', borderRadius: '12px' }}>
            <Server size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Managed VMs</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              {overview?.totalVMs || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.1rem' }}>
              {overview?.onlineVMs || 0} Online
            </div>
          </div>
        </div>

        {/* Avg CPU */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '0.75rem', borderRadius: '12px' }}>
            <Cpu size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Avg CPU Utilization</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              {overview?.avgCpuUsage || '0.0'}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}> Across active fleet</div>
          </div>
        </div>

        {/* Avg Memory */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.75rem', borderRadius: '12px' }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Avg Memory (RAM)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>
              {overview?.avgMemoryUsage || '0.0'}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}> System RAM consumption</div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: overview?.activeAlerts > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: overview?.activeAlerts > 0 ? '#ef4444' : '#10b981', padding: '0.75rem', borderRadius: '12px' }}>
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Active Alerts</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: overview?.activeAlerts > 0 ? '#ef4444' : '#ffffff' }}>
              {overview?.activeAlerts || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: overview?.activeAlerts > 0 ? '#ef4444' : '#10b981', marginTop: '0.1rem' }}>
              {overview?.criticalVMs || 0} Critical • {overview?.warningVMs || 0} Warning
            </div>
          </div>
        </div>

      </div>

      {/* Main Tabs Navigation Header */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'vms' ? 'active' : ''}`}
          onClick={() => setActiveTab('vms')}
        >
          <Server size={16} />
          <span>Virtual Machines ({vms.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <ShieldAlert size={16} />
          <span>Alerts & Threshold Rules ({overview?.activeAlerts || 0})</span>
        </button>
      </div>

      {/* Tab 1: Virtual Machines Overview */}
      {activeTab === 'vms' && (
        <>
          {/* Controls Bar: Search & Status Filter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search hostname, VM ID or IP..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '10px' }}>
              {['ALL', 'ONLINE', 'WARNING', 'CRITICAL', 'OFFLINE', 'DEREGISTERED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    background: statusFilter === st ? 'rgba(255,255,255,0.12)' : 'transparent',
                    color: statusFilter === st ? '#ffffff' : 'var(--text-muted)',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

          </div>

          {/* VM Cards Grid */}
          {filteredVMs.length === 0 ? (
            <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Server size={48} color="var(--text-dim)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.5rem' }}>No Virtual Machines Found</h3>
              <p style={{ fontSize: '0.875rem' }}>
                Run the Python Agent on any machine (<code style={{ color: '#a855f7' }}>python3 agent/agent.py</code>) to start posting real-time VM telemetry.
              </p>
            </div>
          ) : (
            <div className="vm-grid">
              {filteredVMs.map(vm => (
                <VMCard key={vm.vm_id} vm={vm} onSelectVM={(selected) => setSelectedVm(selected)} onReRegisterVM={handleReRegisterVM} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Alerts & Threshold Rules Panel */}
      {activeTab === 'alerts' && (
        <AlertsPanel onRefreshOverview={fetchAllData} />
      )}

      {/* VM Detail Modal */}
      {selectedVm && (
        <VMDetailModal 
          vm={selectedVm} 
          onClose={() => setSelectedVm(null)} 
          onDeleteVM={handleDeleteVM}
          onReRegisterVM={handleReRegisterVM}
        />
      )}

    </div>
  );
}
