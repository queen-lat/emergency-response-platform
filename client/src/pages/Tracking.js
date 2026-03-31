import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { dispatchAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw, FiWifi } from 'react-icons/fi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const makeIcon = (color, emoji) => L.divIcon({
  html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px">${emoji}</div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const icons = {
  fire_truck: makeIcon('#e74c3c', '🚒'),
  ambulance:  makeIcon('#2980b9', '🚑'),
  police_car: makeIcon('#1D9E75', '🚔'),
};

const roleVehicleType = {
  hospital_admin: 'ambulance',
  police_admin: 'police_car',
  fire_admin: 'fire_truck',
  system_admin: null,
};

function RecenterMap({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length > 0) {
      const bounds = vehicles.map(v => [parseFloat(v.latitude), parseFloat(v.longitude)]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else {
      map.setView([5.6037, -0.1870], 13);
    }
  }, [vehicles]);
  return null;
}

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function Tracking() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);

  const vehicleType = roleVehicleType[user?.role];

  const fetchVehicles = async () => {
    try {
      const params = vehicleType ? { type: vehicleType } : {};
      const res = await dispatchAPI.get('/vehicles', { params });
      setVehicles(res.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
    socketRef.current = io('http://localhost:3003');

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    socketRef.current.on('location_update', (data) => {
      setLastUpdate(new Date().toLocaleTimeString());
      setVehicles(prev => prev.map(v =>
        v.vehicle_id === data.vehicleId
          ? { ...v, latitude: data.latitude, longitude: data.longitude, speed_kmh: data.speed_kmh }
          : v
      ));
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  if (loading) return <div className="loading">Loading tracking data...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Vehicle Tracking</h1>
          <p className="page-subtitle">
            Real-time GPS positions updated via WebSocket
            <span style={{ marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: connected ? '#1D9E75' : '#e74c3c', fontWeight: 600 }}>
              <FiWifi size={12} />
              {connected ? 'Live' : 'Disconnected'}
            </span>
            {lastUpdate && <span style={{ marginLeft: 8, fontSize: 12, color: '#aaa' }}>Last update: {lastUpdate}</span>}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchVehicles}><FiRefreshCw size={14} /> Refresh</button>
      </div>

      <div className="map-legend">
        {(!vehicleType || vehicleType === 'fire_truck') && <div className="legend-item"><span className="legend-dot" style={{ background: '#e74c3c' }}></span>🚒 Fire Truck</div>}
        {(!vehicleType || vehicleType === 'ambulance')  && <div className="legend-item"><span className="legend-dot" style={{ background: '#2980b9' }}></span>🚑 Ambulance</div>}
        {(!vehicleType || vehicleType === 'police_car') && <div className="legend-item"><span className="legend-dot" style={{ background: '#1D9E75' }}></span>🚔 Police Car</div>}
        <div className="legend-item" style={{ marginLeft: 'auto', color: '#aaa', fontSize: 12 }}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} tracked
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div className="tracking-map">
          <MapContainer center={[5.6037, -0.1870]} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <RecenterMap vehicles={vehicles} />
            {vehicles.map(v => (
              <Marker
                key={v.vehicle_id}
                position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                icon={icons[v.vehicle_type] || icons.ambulance}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>{v.vehicle_id}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      <div>🚗 Type: <strong>{v.vehicle_type?.replace('_', ' ')}</strong></div>
                      <div>🏢 Station: <strong>{v.station_id}</strong></div>
                      <div>📊 Status: <strong>{formatStatus(v.status)}</strong></div>
                      {v.incident_id && <div>🚨 Incident: <strong>{v.incident_id}</strong></div>}
                      <div>⚡ Speed: <strong>{v.speed_kmh || 0} km/h</strong></div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Updated: {new Date(v.last_updated).toLocaleTimeString()}</div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Vehicle Status</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle ID</th><th>Type</th><th>Status</th><th>Active Incident</th><th>Speed</th><th>Coordinates</th><th>Last Update</th></tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="7" className="table-empty">No vehicles registered yet</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.vehicle_id}>
                  <td><span className="incident-id">{v.vehicle_id}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.vehicle_type?.replace('_', ' ')}</td>
                  <td><span className={`badge badge-${v.status}`}>{formatStatus(v.status)}</span></td>
                  <td>{v.incident_id ? <span style={{ fontWeight: 600, color: '#e74c3c' }}>{v.incident_id}</span> : <span style={{ color: '#ccc' }}>—</span>}</td>
                  <td><strong>{v.speed_kmh || 0}</strong> km/h</td>
                  <td style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>{parseFloat(v.latitude).toFixed(5)}, {parseFloat(v.longitude).toFixed(5)}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>{new Date(v.last_updated).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
