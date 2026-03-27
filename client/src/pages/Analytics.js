import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { analyticsAPI } from '../api/axios';
import { FiRefreshCw } from 'react-icons/fi';

const COLORS = ['#1D9E75', '#2980b9', '#e74c3c', '#d35400', '#8e44ad', '#16a085'];

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [responseTimes, setResponseTimes] = useState(null);
  const [byRegion, setByRegion] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, rtRes, regRes, utilRes] = await Promise.all([
        analyticsAPI.get('/analytics/incidents/summary'),
        analyticsAPI.get('/analytics/response-times'),
        analyticsAPI.get('/analytics/incidents-by-region'),
        analyticsAPI.get('/analytics/resource-utilization'),
      ]);
      setSummary(sumRes.data);
      setResponseTimes(rtRes.data);
      setByRegion(regRes.data);
      setUtilization(utilRes.data);
    } catch (err) {
      console.error('Analytics error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="loading">Loading analytics...</div>;

  const regionChartData = byRegion?.breakdown || [];
  const serviceData = Object.entries(utilization?.byServiceType || {}).map(([name, value]) => ({ name, value }));
  const statusData = summary ? [
    { name: 'Pending', value: summary.pending },
    { name: 'Dispatched', value: summary.dispatched },
    { name: 'Resolved', value: summary.resolved },
  ] : [];

  return (
    <div>
      <div className="top-bar">
        <h1 className="page-title">Analytics Dashboard</h1>
        <button className="btn btn-secondary" onClick={fetchData}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Incidents</span>
          <span className="stat-value">{summary?.total || 0}</span>
        </div>
        <div className="stat-card green">
          <span className="stat-label">Resolution Rate</span>
          <span className="stat-value">{utilization?.resolutionRate || '0%'}</span>
        </div>
        <div className="stat-card blue">
          <span className="stat-label">Avg Response Time</span>
          <span className="stat-value">{responseTimes?.averageResponseTimeMinutes || 0}<span style={{ fontSize: 16 }}>min</span></span>
        </div>
        <div className="stat-card amber">
          <span className="stat-label">Total Dispatched</span>
          <span className="stat-value">{utilization?.totalDispatched || 0}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Incidents by type bar chart */}
        <div className="card">
          <h2 className="card-title">Incidents by Type</h2>
          {regionChartData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="incidentType" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status pie chart */}
        <div className="card">
          <h2 className="card-title">Incident Status Breakdown</h2>
          {statusData.every(d => d.value === 0) ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Response times breakdown */}
        <div className="card">
          <h2 className="card-title">Response Times by Incident Type</h2>
          {responseTimes?.breakdown?.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>No resolved incidents yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={responseTimes?.breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="incidentType" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} min`, 'Avg Response Time']} />
                <Bar dataKey="avgMinutes" fill="#2980b9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service type deployment */}
        <div className="card">
          <h2 className="card-title">Deployments by Service Type</h2>
          {serviceData.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>No dispatch data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={serviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {serviceData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Resource utilization table */}
      <div className="card">
        <h2 className="card-title">Resource Utilization Summary</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Metric</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Total Incidents Created</td><td>{utilization?.totalIncidentsCreated || 0}</td></tr>
              <tr><td>Total Units Dispatched</td><td>{utilization?.totalDispatched || 0}</td></tr>
              <tr><td>Total Resolved</td><td>{utilization?.totalResolved || 0}</td></tr>
              <tr><td>Resolution Rate</td><td>{utilization?.resolutionRate || '0%'}</td></tr>
              <tr><td>Average Response Time</td><td>{responseTimes?.averageResponseTimeMinutes || 0} minutes</td></tr>
              <tr><td>Total Incidents in Period</td><td>{byRegion?.totalIncidents || 0}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
