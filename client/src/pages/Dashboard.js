import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI, dispatchAPI, analyticsAPI } from '../api/axios';
import { FiAlertCircle, FiTruck, FiCheckCircle, FiClock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

// Map role to incident type and vehicle type filters
const roleFilters = {
  hospital_admin: { incidentTypes: ['medical emergency', 'accident', 'injury'], vehicleType: 'ambulance', label: 'Medical' },
  police_admin:   { incidentTypes: ['robbery', 'assault', 'theft', 'crime'],    vehicleType: 'police_car', label: 'Police' },
  fire_admin:     { incidentTypes: ['fire', 'explosion', 'gas leak'],            vehicleType: 'fire_truck', label: 'Fire' },
  system_admin:   { incidentTypes: null, vehicleType: null, label: 'All' },
};

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
        const [summaryRes, vehiclesRes, incidentsRes] = await Promise.all([
          analyticsAPI.get('/analytics/incidents/summary'),
          dispatchAPI.get('/vehicles', { params: filter.vehicleType ? { type: filter.vehicleType } : {} }),
          incidentAPI.get('/incidents'),
        ]);
        setSummary(summaryRes.data);

        // Filter vehicles by role
        setVehicles(vehiclesRes.data);

        // Filter incidents by role
        let incidents = incidentsRes.data;
        if (filter.incidentTypes) {
          incidents = incidents.filter(i => filter.incidentTypes.includes(i.incident_type.toLowerCase()));
        }
        setRecentIncidents(incidents.slice(0, 5));
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
      <div className="top-bar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          {user?.role !== 'system_admin' && (
            <p style={{ color: '#888', fontSize: 13, marginTop: -12, marginBottom: 16 }}>
              Showing {filter.label} service data for your role
            </p>
          )}
        </div>
        {user?.role === 'system_admin' && (
          <Link to="/incidents/new" className="btn btn-primary">
            <FiAlertCircle /> New Incident
          </Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Incidents</span>
          <span className="stat-value">{summary.total}</span>
          <FiAlertCircle size={20} color="#888" />
        </div>
        <div className="stat-card amber">
          <span className="stat-label">Pending</span>
          <span className="stat-value">{summary.pending}</span>
          <FiClock size={20} color="#d35400" />
        </div>
        <div className="stat-card blue">
          <span className="stat-label">Dispatched</span>
          <span className="stat-value">{summary.dispatched}</span>
          <FiTruck size={20} color="#2980b9" />
        </div>
        <div className="stat-card green">
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{summary.resolved}</span>
          <FiCheckCircle size={20} color="#0F6E56" />
        </div>
        <div className="stat-card green">
          <span className="stat-label">{filter.label} Vehicles Available</span>
          <span className="stat-value">{availableVehicles}</span>
          <FiTruck size={20} color="#0F6E56" />
        </div>
      </div>

      <div className="card">
        <div className="top-bar">
          <h2 className="card-title">
            {filter.label === 'All' ? 'Recent Incidents' : `Recent ${filter.label} Incidents`}
          </h2>
          <Link to="/incidents" className="btn btn-secondary">View All</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Citizen</th><th>Type</th>
                <th>Status</th><th>Assigned Unit</th><th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentIncidents.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: '#888' }}>No incidents yet</td></tr>
              ) : recentIncidents.map(inc => (
                <tr key={inc.incident_id}>
                  <td><strong>{inc.incident_id}</strong></td>
                  <td>{inc.citizen_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>{inc.incident_type}</td>
                  <td><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                  <td>{inc.assigned_unit_id || '—'}</td>
                  <td>{new Date(inc.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">
          {filter.label === 'All' ? 'Vehicle Fleet Status' : `${filter.label} Fleet Status`}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle ID</th><th>Type</th><th>Station</th><th>Status</th><th>Last Updated</th></tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#888' }}>No vehicles registered</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.vehicle_id}>
                  <td><strong>{v.vehicle_id}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.vehicle_type?.replace('_', ' ')}</td>
                  <td>{v.station_id}</td>
                  <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  <td>{new Date(v.last_updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
