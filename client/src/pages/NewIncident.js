import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { incidentAPI } from '../api/axios';
import { FiMapPin } from 'react-icons/fi';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function NewIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    citizen_name: '',
    citizen_phone: '',
    incident_type: 'fire',
    notes: '',
  });
  const [lat, setLat] = useState(5.6037);
  const [lng, setLng] = useState(-0.1870);
  const [markerPos, setMarkerPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLocationSelect = (latitude, longitude) => {
    setLat(latitude);
    setLng(longitude);
    setMarkerPos([latitude, longitude]);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!markerPos) {
      setError('Please click on the map to select the incident location.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await incidentAPI.post('/incidents', {
        ...form,
        latitude: lat,
        longitude: lng,
      });
      setSuccess(`Incident ${res.data.incidentId} created! Status: ${res.data.status}. ${res.data.assignedUnit ? `Assigned to: ${res.data.assignedUnit.id} (${res.data.assignedUnit.distanceKm}km away)` : ''}`);
      setTimeout(() => navigate('/incidents'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Record New Incident</h1>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success} Redirecting...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <h2 className="card-title">Incident Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Citizen Name *</label>
                <input name="citizen_name" placeholder="Full name of caller" value={form.citizen_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Citizen Phone</label>
                <input name="citizen_phone" placeholder="Contact number" value={form.citizen_phone} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Incident Type *</label>
              <select name="incident_type" value={form.incident_type} onChange={handleChange}>
                <option value="fire">Fire</option>
                <option value="explosion">Explosion</option>
                <option value="gas leak">Gas Leak</option>
                <option value="medical emergency">Medical Emergency</option>
                <option value="accident">Accident</option>
                <option value="injury">Injury</option>
                <option value="robbery">Robbery</option>
                <option value="assault">Assault</option>
                <option value="theft">Theft</option>
              </select>
            </div>
            <div className="form-group">
              <label>Additional Notes</label>
              <textarea name="notes" rows={4} placeholder="Describe the situation..." value={form.notes} onChange={handleChange} />
            </div>
            {markerPos && (
              <div className="coords-display">
                <FiMapPin size={14} /> &nbsp;
                Location selected: {lat.toFixed(6)}, {lng.toFixed(6)}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Incident Report'}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="card-title">Select Incident Location</h2>
          <p className="map-hint">Click on the map to pin the exact location of the incident.</p>
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
          {!markerPos && <p style={{ color: '#e74c3c', fontSize: 13 }}>⚠ No location selected yet — click the map</p>}
        </div>
      </div>
    </div>
  );
}
