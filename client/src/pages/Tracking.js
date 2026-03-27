import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { io } from 'socket.io-client';
import { dispatchAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FiRefreshCw } from 'react-icons/fi';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const makeIcon = (color) => L.divIcon({
  html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.4)"></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const icons = {
  fire_truck: makeIcon('#e74c3c'),
  ambulance: makeIcon('#2980b9'),
  police_car: makeIcon('#1D9E75'),
};

const roleVehicleType = {
  hospital_admin: 'ambulance',
  police_admin: 'police_car',
  fire_admin: 'fire_truck',
  system_admin: null,
};

const roleLabels = {
  hospital_admin: 'Ambulances',
  police_admin: 'Police Vehicles',
  fire_admin: 'Fire Trucks',
  system_admin: 'All Vehicles',
};

function RecenterMap({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    if (vehicles.length > 0) {
      const bounds = vehicles.map(v => [parseFloat(v.latitude), parseFloat(v.longitude)]);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, []);
  return null;
}

export default function Tracking() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const vehicleType = roleVehicleType[user?.role];
  const vehicleLabel = roleLabels[user?.role] || 'All Vehicles';

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
    socketRef.current.on('location_update', (data) => {
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
      <div className="top-bar">
        <div>
          <h1 className="page-title">Live Vehicle Tracking</h1>
          {vehicleType && (
            <p style={{ color: '#888', fontSize: 13, marginTop: -12, marginBottom: 16 }}>
              Showing {vehicleLabel} only
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={fetchVehicles}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {(!vehicleType || vehicleType === 'fire_truck') && <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}><span style={{ background:'#e74c3c', width:12, height:12, borderRadius:'50%', display:'inline-block' }}></span> Fire Truck</span>}
        {(!vehicleType || vehicleType === 'ambulance') && <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}><span style={{ background:'#2980b9', width:12, height:12, borderRadius:'50%', display:'inline-block' }}></span> Ambulance</span>}
        {(!vehicleType || vehicleType === 'police_car') && <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13 }}><span style={{ background:'#1D9E75', width:12, height:12, borderRadius:'50%', display:'inline-block' }}></span> Police Car</span>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tracking-map">
          <MapContainer center={[5.6037, -0.1870]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {vehicles.length > 0 && <RecenterMap vehicles={vehicles} />}
            {vehicles.map(v => (
              <Marker
                key={v.vehicle_id}
                position={[parseFloat(v.latitude), parseFloat(v.longitude)]}
                icon={icons[v.vehicle_type] || icons.ambulance}
              >
                <Popup>
                  <strong>{v.vehicle_id}</strong><br />
                  Type: {v.vehicle_type?.replace('_', ' ')}<br />
                  Status: <span style={{ textTransform: 'capitalize' }}>{v.status}</span><br />
                  Station: {v.station_id}<br />
                  {v.incident_id && <span>Incident: {v.incident_id}<br /></span>}
                  Speed: {v.speed_kmh || 0} km/h<br />
                  Last update: {new Date(v.last_updated).toLocaleTimeString()}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">{vehicleLabel} Status</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vehicle ID</th><th>Type</th><th>Status</th><th>Incident</th><th>Speed</th><th>Coordinates</th><th>Last Update</th></tr>
            </thead>
            <tbody>
              {vehicles.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#888', padding: 20 }}>No vehicles found</td></tr>
              ) : vehicles.map(v => (
                <tr key={v.vehicle_id}>
                  <td><strong>{v.vehicle_id}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{v.vehicle_type?.replace('_', ' ')}</td>
                  <td><span className={`badge badge-${v.status}`}>{v.status}</span></td>
                  <td>{v.incident_id || '—'}</td>
                  <td>{v.speed_kmh || 0} km/h</td>
                  <td style={{ fontSize: 12 }}>{parseFloat(v.latitude).toFixed(5)}, {parseFloat(v.longitude).toFixed(5)}</td>
                  <td style={{ fontSize: 12 }}>{new Date(v.last_updated).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
