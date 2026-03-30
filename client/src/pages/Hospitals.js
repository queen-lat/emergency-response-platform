import React, { useEffect, useState } from 'react';
import { incidentAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiPlus, FiEdit2, FiCheckCircle } from 'react-icons/fi';

export default function Hospitals() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    hospital_id: '', name: '', latitude: '', longitude: '',
    total_beds: 50, available_beds: 50, contact: ''
  });
  const [capacityEdit, setCapacityEdit] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchHospitals = async () => {
    setLoading(true);
    try {
      const res = await incidentAPI.get('/hospitals');
      setHospitals(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHospitals(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await incidentAPI.post('/hospitals', {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        total_beds: parseInt(form.total_beds),
        available_beds: parseInt(form.available_beds),
      });
      setSuccess('Hospital registered successfully');
      setShowForm(false);
      setForm({ hospital_id: '', name: '', latitude: '', longitude: '', total_beds: 50, available_beds: 50, contact: '' });
      fetchHospitals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register hospital');
    }
  };

  const handleCapacityUpdate = async (hospitalId) => {
    try {
      const { available_beds, total_beds } = capacityEdit[hospitalId] || {};
      await incidentAPI.put(`/hospitals/${hospitalId}/capacity`, {
        available_beds: parseInt(available_beds),
        total_beds: parseInt(total_beds),
      });
      setSuccess(`Capacity updated for ${hospitalId}`);
      setEditingId(null);
      fetchHospitals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update capacity');
    }
  };

  const startEdit = (hospital) => {
    setEditingId(hospital.hospital_id);
    setCapacityEdit({
      ...capacityEdit,
      [hospital.hospital_id]: {
        available_beds: hospital.available_beds,
        total_beds: hospital.total_beds,
      }
    });
  };

  const occupancyRate = (h) => {
    const used = h.total_beds - h.available_beds;
    return ((used / h.total_beds) * 100).toFixed(0);
  };

  const occupancyColor = (rate) => {
    if (rate >= 90) return '#e74c3c';
    if (rate >= 70) return '#d35400';
    return '#1D9E75';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Hospital Management</h1>
          <p className="page-subtitle">Manage hospital bed capacity and availability</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchHospitals}>
            <FiRefreshCw size={14} /> Refresh
          </button>
          {(user?.role === 'system_admin' || user?.role === 'hospital_admin') && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <FiPlus size={14} /> Register Hospital
            </button>
          )}
        </div>
      </div>

      {success && <div className="alert alert-success"><FiCheckCircle size={16} />{success}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card">
          <h2 className="card-title">Register New Hospital</h2>
          <form onSubmit={handleRegister}>
            <div className="form-row">
              <div className="form-group">
                <label>Hospital ID *</label>
                <input placeholder="e.g. HOSP-001" value={form.hospital_id}
                  onChange={e => setForm({ ...form, hospital_id: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Hospital Name *</label>
                <input placeholder="e.g. Korle Bu Teaching Hospital" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input type="number" step="any" placeholder="5.5502" value={form.latitude}
                  onChange={e => setForm({ ...form, latitude: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input type="number" step="any" placeholder="-0.2174" value={form.longitude}
                  onChange={e => setForm({ ...form, longitude: e.target.value })} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Beds</label>
                <input type="number" value={form.total_beds}
                  onChange={e => setForm({ ...form, total_beds: e.target.value, available_beds: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Available Beds</label>
                <input type="number" value={form.available_beds}
                  onChange={e => setForm({ ...form, available_beds: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Contact Number</label>
              <input placeholder="0302123456" value={form.contact}
                onChange={e => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Register Hospital</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Registered Hospitals</h2>
        {loading ? (
          <div className="loading" style={{ height: 200 }}>Loading hospitals...</div>
        ) : hospitals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏥</div>
            <p>No hospitals registered yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hospital ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Total Beds</th>
                  <th>Available Beds</th>
                  <th>Occupancy</th>
                  <th>Contact</th>
                  <th>Update Capacity</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map(h => {
                  const rate = occupancyRate(h);
                  const color = occupancyColor(rate);
                  const isEditing = editingId === h.hospital_id;

                  return (
                    <tr key={h.hospital_id}>
                      <td><span className="incident-id">{h.hospital_id}</span></td>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                        {parseFloat(h.latitude).toFixed(4)}, {parseFloat(h.longitude).toFixed(4)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{h.total_beds}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: h.available_beds === 0 ? '#e74c3c' : '#1D9E75' }}>
                          {h.available_beds}
                        </span>
                        {h.available_beds === 0 && (
                          <span style={{ marginLeft: 6, fontSize: 11, background: '#fdecea', color: '#e74c3c', padding: '2px 6px', borderRadius: 4 }}>FULL</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
                            <div style={{ width: `${rate}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color }}>{rate}%</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{h.contact || '—'}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number"
                              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #1D9E75', fontSize: 13 }}
                              value={capacityEdit[h.hospital_id]?.available_beds || ''}
                              onChange={e => setCapacityEdit({
                                ...capacityEdit,
                                [h.hospital_id]: { ...capacityEdit[h.hospital_id], available_beds: e.target.value }
                              })}
                              placeholder="Avail"
                            />
                            <input
                              type="number"
                              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #e0e0e0', fontSize: 13 }}
                              value={capacityEdit[h.hospital_id]?.total_beds || ''}
                              onChange={e => setCapacityEdit({
                                ...capacityEdit,
                                [h.hospital_id]: { ...capacityEdit[h.hospital_id], total_beds: e.target.value }
                              })}
                              placeholder="Total"
                            />
                            <button className="btn btn-primary btn-icon" style={{ padding: '5px 10px', fontSize: 12 }}
                              onClick={() => handleCapacityUpdate(h.hospital_id)}>Save</button>
                            <button className="btn btn-secondary btn-icon" style={{ padding: '5px 10px', fontSize: 12 }}
                              onClick={() => setEditingId(null)}>✕</button>
                          </div>
                        ) : (
                          <button className="btn btn-secondary btn-icon" style={{ padding: '6px 12px', fontSize: 12 }}
                            onClick={() => startEdit(h)}>
                            <FiEdit2 size={12} /> Update
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
