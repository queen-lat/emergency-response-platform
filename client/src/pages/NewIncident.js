import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { incidentAPI } from '../api/axios';
import { FiMapPin, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

const incidentTypes = [
  { value: 'fire', label: '🔥 Fire', group: 'Fire Service' },
  { value: 'explosion', label: '💥 Explosion', group: 'Fire Service' },
  { value: 'gas leak', label: '⚠️ Gas Leak', group: 'Fire Service' },
  { value: 'medical emergency', label: '🏥 Medical Emergency', group: 'Medical' },
  { value: 'accident', label: '🚗 Accident', group: 'Medical' },
  { value: 'injury', label: '🩹 Injury', group: 'Medical' },
  { value: 'robbery', label: '🚨 Robbery', group: 'Police' },
  { value: 'assault', label: '⚡ Assault', group: 'Police' },
  { value: 'theft', label: '🔍 Theft', group: 'Police' },
];

export default function NewIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ citizen_name: '', citizen_phone: '', incident_type: 'fire', notes: '' });
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [markerPos, setMarkerPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLocationSelect = (latitude, longitude) => {
    setLat(latitude); setLng(longitude);
    setMarkerPos([latitude, longitude]);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!markerPos) { setError('Please click on the map to select the incident location.'); return; }
    setLoading(true); setError('');
    try {
      const res = await incidentAPI.post('/incidents', { ...form, latitude: lat, longitude: lng });
      const unit = res.data.assignedUnit;
      setSuccess(
        unit
          ? `Incident ${res.data.incidentId} recorded and dispatched to ${unit.id} — ${unit.distanceKm}km away.`
          : `Incident ${res.data.incidentId} recorded. No available unit found — will assign when available.`
      );
      setTimeout(() => navigate('/incidents'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit incident report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Record New Incident</h1>
          <p className="page-subtitle">Fill in the details from the caller and pin the location on the map</p>
        </div>
      </div>

      {error && <div className="alert alert-error"><FiAlertTriangle size={16} />{error}</div>}
      {success && <div className="alert alert-success"><FiCheckCircle size={16} />{success} Redirecting...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 className="card-title">Caller & Incident Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Citizen Name *</label>
                <input name="citizen_name" placeholder="Full name of caller" value={form.citizen_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input name="citizen_phone" placeholder="Contact number" value={form.citizen_phone} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Incident Type *</label>
              <select name="incident_type" value={form.incident_type} onChange={handleChange}>
                {['Fire Service', 'Medical', 'Police'].map(group => (
                  <optgroup key={group} label={group}>
                    {incidentTypes.filter(t => t.group === group).map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Additional Notes</label>
              <textarea
                name="notes" rows={5}
                placeholder="Describe the situation — number of people involved, severity, any hazards..."
                value={form.notes} onChange={handleChange}
              />
            </div>

            {markerPos && (
              <div className="coords-display">
                <FiMapPin size={16} />
                Location pinned: {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            )}

            {!markerPos && (
              <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#e65100', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <FiMapPin size={14} /> Click on the map to pin the incident location
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15 }}
              disabled={loading}
            >
              {loading ? 'Submitting & Dispatching...' : '🚨 Submit Incident Report'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">📍 Incident Location</h2>
          <p className="map-hint"><FiMapPin size={13} /> Click anywhere on the map to drop a pin at the incident location</p>
          <div className="map-container">
            <MapContainer center={[5.6037, -0.1870]} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LocationPicker onLocationSelect={handleLocationSelect} />
              {markerPos && <Marker position={markerPos} />}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
