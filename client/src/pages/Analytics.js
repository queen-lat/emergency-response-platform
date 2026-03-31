import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { analyticsAPI, incidentAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiActivity, FiCheckCircle, FiClock, FiTruck } from 'react-icons/fi';

const COLORS = ['#1D9E75', '#2980b9', '#e74c3c', '#d35400', '#8e44ad', '#16a085'];

const roleConfig = {
  system_admin:   { incidentTypes: null,                                        serviceType: null,       label: 'All Services' },
  hospital_admin: { incidentTypes: ['medical emergency', 'accident', 'injury'], serviceType: 'ambulance', label: 'Medical / Hospital' },
  police_admin:   { incidentTypes: ['robbery', 'assault', 'theft', 'crime'],    serviceType: 'police',   label: 'Police' },
  fire_admin:     { incidentTypes: ['fire', 'explosion', 'gas leak'],           serviceType: 'fire',     label: 'Fire Service' },
  ambulance_driver:{ incidentTypes: ['medical emergency', 'accident', 'injury'],serviceType: 'ambulance', label: 'Medical / Ambulance' },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1A252F', color: '#fff', padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => <p key={i} style={{ color: p.color || '#1D9E75' }}>{p.name}: {p.value}</p>)}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);

  const config = roleConfig[user?.role] || roleConfig.system_admin;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incidentsRes, utilRes] = await Promise.all([
        incidentAPI.get('/incidents'),
        analyticsAPI.get('/analytics/resource-utilization'),
      ]);

      let data = incidentsRes.data;
      // Filter by role
      if (config.incidentTypes) {
        data = data.filter(i => config.incidentTypes.includes(i.incident_type.toLowerCase()));
      }
      setIncidents(data);
      setUtilization(utilRes.data);
    } catch (err) {
      console.error('Analytics error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="loading">Loading analytics...</div>;

  // Calculate stats from filtered incidents
  const total = incidents.length;
  const resolved = incidents.filter(i => i.status === 'resolved').length;
  const dispatched = incidents.filter(i => i.status === 'dispatched').length;
  const pending = incidents.filter(i => i.status !== 'resolved').length;
  const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) + '%' : '0%';

  // Response times from resolved incidents
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' && i.dispatched_at && i.created_at);
  const avgResponseMs = resolvedIncidents.length > 0
    ? resolvedIncidents.reduce((sum, i) => {
        return sum + (new Date(i.dispatched_at) - new Date(i.created_at));
      }, 0) / resolvedIncidents.length
    : 0;
  const avgResponseMin = (avgResponseMs / 60000).toFixed(1);
  const avgDisplay = avgResponseMin > 60
    ? `${(avgResponseMin / 60).toFixed(1)} hrs`
    : `${avgResponseMin} min`;

  // Incidents by type chart
  const byType = {};
  incidents.forEach(i => {
    const t = i.incident_type;
    byType[t] = (byType[t] || 0) + 1;
  });
  const byTypeData = Object.entries(byType).map(([incidentType, count]) => ({ incidentType, count }));

  // Status breakdown
  const statusData = [
    { name: 'Pending', value: pending },
    { name: 'Dispatched', value: dispatched },
    { name: 'Resolved', value: resolved },
  ].filter(d => d.value > 0);

  // Response times by type
  const rtByType = {};
  resolvedIncidents.forEach(i => {
    const t = i.incident_type;
    if (!rtByType[t]) rtByType[t] = { total: 0, count: 0 };
    rtByType[t].total += (new Date(i.dispatched_at) - new Date(i.created_at)) / 60000;
    rtByType[t].count++;
  });
  const rtData = Object.entries(rtByType).map(([incidentType, d]) => ({
    incidentType,
    avgMinutes: parseFloat((d.total / d.count).toFixed(1)),
  }));

  // Service deployment (role-filtered)
  const serviceData = config.serviceType
    ? Object.entries(utilization?.byServiceType || {})
        .filter(([name]) => name === config.serviceType)
        .map(([name, value]) => ({ name, value }))
    : Object.entries(utilization?.byServiceType || {}).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">{config.label} — operational insights and performance metrics</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchData}><FiRefreshCw size={14} /> Refresh</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiActivity size={20} /></div>
          <span className="stat-label">Total Incidents</span>
          <span className="stat-value">{total}</span>
          <span className="stat-trend">{config.label}</span>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FiCheckCircle size={20} /></div>
          <span className="stat-label">Resolution Rate</span>
          <span className="stat-value" style={{ fontSize: 26 }}>{resolutionRate}</span>
          <span className="stat-trend">Incidents closed</span>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><FiClock size={20} /></div>
          <span className="stat-label">Avg Response Time</span>
          <span className="stat-value" style={{ fontSize: 26 }}>{avgDisplay}</span>
          <span className="stat-trend">Creation to dispatch</span>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><FiTruck size={20} /></div>
          <span className="stat-label">Active / Pending</span>
          <span className="stat-value">{pending}</span>
          <span className="stat-trend">Requires attention</span>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <h2 className="card-title">Incidents by Type</h2>
          {byTypeData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📊</div><p>No incident data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byTypeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="incidentType" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Incidents" fill="#1D9E75" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Incident Status Breakdown</h2>
          {statusData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📊</div><p>No data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Response Times by Type</h2>
          {rtData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">⏱</div><p>Resolve incidents to see response times</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={rtData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="incidentType" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgMinutes" name="Avg Minutes" fill="#2980b9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Deployments by Service</h2>
          {serviceData.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚗</div><p>No dispatch data yet</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {serviceData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Summary — {config.label}</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Metric</th><th>Value</th></tr></thead>
            <tbody>
              {[
                ['Total Incidents', total],
                ['Dispatched', dispatched],
                ['Resolved', resolved],
                ['Active / Pending', pending],
                ['Resolution Rate', resolutionRate],
                ['Average Response Time', avgDisplay],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ color: '#555' }}>{label}</td>
                  <td style={{ fontWeight: 700, color: '#1A252F' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}