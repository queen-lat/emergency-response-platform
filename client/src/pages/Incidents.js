import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { incidentAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiPlus } from 'react-icons/fi';

const roleIncidentTypes = {
  hospital_admin: ['medical emergency', 'accident', 'injury'],
  police_admin:   ['robbery', 'assault', 'theft', 'crime'],
  fire_admin:     ['fire', 'explosion', 'gas leak'],
  system_admin:   null,
};

const roleLabels = {
  hospital_admin: 'Medical',
  police_admin: 'Police',
  fire_admin: 'Fire',
  system_admin: 'All',
};

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const allowedTypes = roleIncidentTypes[user?.role];
  const roleLabel = roleLabels[user?.role] || 'All';

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const url = filter === 'open' ? '/incidents/open' : '/incidents';
      const res = await incidentAPI.get(url);
      let data = res.data;

      // Filter by role
      if (allowedTypes) {
        data = data.filter(i => allowedTypes.includes(i.incident_type.toLowerCase()));
      }
      setIncidents(data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, [filter]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await incidentAPI.put(`/incidents/${id}/status`, { status });
      fetchIncidents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div className="top-bar">
        <div>
          <h1 className="page-title">
            {roleLabel === 'All' ? 'Incidents & Dispatch Status' : `${roleLabel} Incidents`}
          </h1>
          {allowedTypes && (
            <p style={{ color: '#888', fontSize: 13, marginTop: -12, marginBottom: 16 }}>
              Filtered to show only {roleLabel.toLowerCase()} incidents
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchIncidents}>
            <FiRefreshCw /> Refresh
          </button>
          {user?.role === 'system_admin' && (
            <Link to="/incidents/new" className="btn btn-primary">
              <FiPlus /> New Incident
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {['all', 'open'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All Incidents' : 'Open Incidents'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading incidents...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident ID</th><th>Citizen</th><th>Type</th>
                  <th>Location</th><th>Status</th><th>Assigned Unit</th>
                  <th>Reported</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', color: '#888', padding: 30 }}>No incidents found</td></tr>
                ) : incidents.map(inc => (
                  <tr key={inc.incident_id}>
                    <td><strong>{inc.incident_id}</strong></td>
                    <td>
                      <div>{inc.citizen_name}</div>
                      <div style={{ fontSize: 12, color: '#888' }}>{inc.citizen_phone}</div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{inc.incident_type}</td>
                    <td style={{ fontSize: 12 }}>
                      {parseFloat(inc.latitude).toFixed(4)}, {parseFloat(inc.longitude).toFixed(4)}
                    </td>
                    <td><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                    <td>{inc.assigned_unit_id || '—'}</td>
                    <td style={{ fontSize: 12 }}>{new Date(inc.created_at).toLocaleString()}</td>
                    <td>
                      {inc.status !== 'resolved' ? (
                        <select
                          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 12 }}
                          value={inc.status}
                          disabled={updating === inc.incident_id}
                          onChange={(e) => updateStatus(inc.incident_id, e.target.value)}
                        >
                          <option value="created">Created</option>
                          <option value="dispatched">Dispatched</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      ) : (
                        <span style={{ color: '#888', fontSize: 12 }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
