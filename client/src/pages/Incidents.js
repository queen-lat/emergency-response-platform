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

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getTypeChip(type) {
  const t = type?.toLowerCase();
  if (['fire','explosion','gas leak'].includes(t)) return <span className="type-chip fire">🔥 {type}</span>;
  if (['medical emergency','accident','injury'].includes(t)) return <span className="type-chip ambulance">🏥 {type}</span>;
  return <span className="type-chip police">🚔 {type}</span>;
}

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const allowedTypes = roleIncidentTypes[user?.role];

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const url = filter === 'open' ? '/incidents/open' : '/incidents';
      const res = await incidentAPI.get(url);
      let data = res.data;
      if (allowedTypes) data = data.filter(i => allowedTypes.includes(i.incident_type.toLowerCase()));
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
      <div className="page-header">
        <div>
          <h1 className="page-title">Incidents & Dispatch Status</h1>
          <p className="page-subtitle">
            {allowedTypes ? `Showing only ${user?.role?.replace('_', ' ')} incidents` : 'All emergency incidents'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchIncidents}><FiRefreshCw size={14} /> Refresh</button>
          {user?.role === 'system_admin' && (
            <Link to="/incidents/new" className="btn btn-primary"><FiPlus size={14} /> New Incident</Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="filter-tabs">
          <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All Incidents</button>
          <button className={`filter-tab ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open Only</button>
        </div>

        {loading ? (
          <div className="loading" style={{ height: 200 }}>Loading incidents...</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Incident ID</th><th>Citizen</th><th>Type</th>
                  <th>Location</th><th>Status</th><th>Assigned Unit</th>
                  <th>Reported</th><th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <p>No incidents found</p>
                      </div>
                    </td>
                  </tr>
                ) : incidents.map(inc => (
                  <tr key={inc.incident_id}>
                    <td><span className="incident-id">{inc.incident_id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1A252F' }}>{inc.citizen_name}</div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>{inc.citizen_phone}</div>
                    </td>
                    <td>{getTypeChip(inc.incident_type)}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>
                      {parseFloat(inc.latitude).toFixed(4)}, {parseFloat(inc.longitude).toFixed(4)}
                    </td>
                    <td><span className={`badge badge-${inc.status}`}>{formatStatus(inc.status)}</span></td>
                    <td>
                      {inc.assigned_unit_id
                        ? <span style={{ fontWeight: 600, color: '#1A252F' }}>{inc.assigned_unit_id}</span>
                        : <span style={{ color: '#ccc' }}>Not assigned</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#888' }}>{new Date(inc.created_at).toLocaleString()}</td>
                    <td>
                      {inc.status !== 'resolved' ? (
                        <select
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e8e8e8', fontSize: 12, background: '#fafafa', cursor: 'pointer' }}
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
                        <span style={{ color: '#bbb', fontSize: 12, fontStyle: 'italic' }}>Closed</span>
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
