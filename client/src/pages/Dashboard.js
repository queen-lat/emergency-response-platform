import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI, dispatchAPI } from '../api/axios';
import { FiAlertCircle, FiTruck, FiCheckCircle, FiClock, FiPlus, FiActivity } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const roleFilters = {
  hospital_admin: { incidentTypes: ['medical emergency', 'accident', 'injury'], vehicleType: 'ambulance', label: 'Medical' },
  police_admin:   { incidentTypes: ['robbery', 'assault', 'theft', 'crime'],    vehicleType: 'police_car', label: 'Police' },
  fire_admin:     { incidentTypes: ['fire', 'explosion', 'gas leak'],            vehicleType: 'fire_truck', label: 'Fire' },
  system_admin:   { incidentTypes: null, vehicleType: null, label: 'All' },
};

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getTypeChip(type) {
  const t = type?.toLowerCase();
  if (['fire','explosion','gas leak'].includes(t)) return <span className="type-chip fire">🔥 {type}</span>;
  if (['medical emergency','accident','injury'].includes(t)) return <span className="type-chip ambulance">🏥 {type}</span>;
  return <span className="type-chip police">🚔 {type}</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ total: 0, dispatched: 0, resolved: 0, pending: 0 });
  const [vehicles, setVehicles] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const filter = roleFilters[user?.role] || roleFilters.system_admin;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vehiclesRes, incidentsRes] = await Promise.all([
          dispatchAPI.get('/vehicles', { params: filter.vehicleType ? { type: filter.vehicleType } : {} }),
          incidentAPI.get('/incidents'),
        ]);

        let incidents = incidentsRes.data;
        if (filter.incidentTypes) {
          incidents = incidents.filter(i => filter.incidentTypes.includes(i.incident_type.toLowerCase()));
        }

        const total = incidents.length;
        const resolved = incidents.filter(i => i.status === 'resolved').length;
        const dispatched = incidents.filter(i => i.status === 'dispatched').length;
        const pending = incidents.filter(i => i.status !== 'resolved').length;

        setSummary({ total, dispatched, resolved, pending });
        setVehicles(vehiclesRes.data);
        setRecentIncidents(incidents.slice(0, 6));
      } catch (err) {
        console.error('Dashboard error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableVehicles = vehicles.filter(v => v.status === 'available').length;

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {filter.label === 'All' ? 'Operations Dashboard' : `${filter.label} Operations`}
          </h1>
          <p className="page-subtitle">
            {filter.label === 'All'
              ? 'Real-time overview of all emergency operations'
              : `Showing ${filter.label.toLowerCase()} service data for your role`}
          </p>
        </div>
        {user?.role === 'system_admin' && (
          <Link to="/incidents/new" className="btn btn-primary">
            <FiPlus size={16} /> Record Incident
          </Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FiActivity size={20} /></div>
          <span className="stat-label">Total Incidents</span>
          <span className="stat-value">{summary.total}</span>
          <span className="stat-trend">All time</span>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon"><FiClock size={20} /></div>
          <span className="stat-label">Active / Pending</span>
          <span className="stat-value">{summary.pending}</span>
          <span className="stat-trend">Requires attention</span>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon"><FiTruck size={20} /></div>
          <span className="stat-label">Dispatched</span>
          <span className="stat-value">{summary.dispatched}</span>
          <span className="stat-trend">Units en route</span>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FiCheckCircle size={20} /></div>
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{summary.resolved}</span>
          <span className="stat-trend">Successfully closed</span>
        </div>
        <div className="stat-card green">
          <div className="stat-icon"><FiTruck size={20} /></div>
          <span className="stat-label">
            {filter.label === 'All' ? 'Available Vehicles' : `${filter.label} Vehicles Available`}
          </span>
          <span className="stat-value">{availableVehicles}</span>
          <span className="stat-trend">Ready to dispatch</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            {filter.label === 'All' ? 'Recent Incidents' : `Recent ${filter.label} Incidents`}
          </h2>
          <Link to="/incidents" className="btn btn-secondary btn-icon">View All →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Incident ID</th><th>Citizen</th><th>Type</th>
                <th>Status</th><th>Assigned Unit</th><th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.length === 0 ? (
                <tr><td colSpan="6" className="table-empty">No incidents recorded yet</td></tr>
              ) : recentIncidents.map(inc => (
                <tr key={inc.incident_id}>
                  <td><span className="incident-id">{inc.incident_id}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#1A252F' }}>{inc.citizen_name}</div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>{inc.citizen_phone}</div>
                  </td>
                  <td>{getTypeChip(inc.incident_type)}</td>
                  <td><span className={`badge badge-${inc.status}`}>{formatStatus(inc.status)}</span></td>
                  <td>
                    {inc.assigned_unit_id
                      ? <span style={{ fontWeight: 600, color: '#1A252F' }}>{inc.assigned_unit_id}</span>
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12, color: '#888' }}>{new Date(inc.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          {filter.label === 'All' ? 'Fleet Status' : `${filter.label} Fleet`}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle ID</th><th>Type</th><th>Station</th><th>Status</th><th>Incident</th><th>Last Updated</th></tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="6" className="table-empty">No vehicles registered</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.vehicle_id}>
                  <td><span className="incident-id">{v.vehicle_id}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.vehicle_type?.replace('_', ' ')}</td>
                  <td>{v.station_id}</td>
                  <td><span className={`badge badge-${v.status}`}>{formatStatus(v.status)}</span></td>
                  <td>{v.incident_id ? <span style={{ fontWeight: 600 }}>{v.incident_id}</span> : <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>{new Date(v.last_updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
