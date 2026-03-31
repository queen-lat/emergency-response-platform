import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiLogOut } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    system_admin: 'System Administrator',
    hospital_admin: 'Hospital Administrator',
    police_admin: 'Police Administrator',
    fire_admin: 'Fire Administrator',
    ambulance_driver: 'Ambulance Driver',
  };

  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand">
        <FiShield size={22} />
        Emergency<span>Response</span>
      </a>

      <div className="navbar-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/incidents">Incidents</NavLink>
        {user?.role === 'system_admin' && (
          <NavLink to="/incidents/new">New Incident</NavLink>
        )}
        {(user?.role === 'system_admin' || user?.role === 'hospital_admin') && (
  <NavLink to="/hospitals">Hospitals</NavLink>
)}
        <NavLink to="/tracking">Live Tracking</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
      </div>

      <div className="navbar-user">
        <div className="navbar-user-info">
          <span className="navbar-user-name">{user?.name}</span>
          <span className="navbar-user-role">{roleLabel[user?.role] || user?.role}</span>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <FiLogOut size={14} style={{ marginRight: 4 }} />
          Logout
        </button>
      </div>
    </nav>
  );
}
