import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand">
        <FiShield style={{ marginRight: 8, verticalAlign: 'middle' }} />
        Emergency<span>Response</span>
      </a>

      <div className="navbar-links">
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/incidents">Incidents</NavLink>
        <NavLink to="/incidents/new">New Incident</NavLink>
        <NavLink to="/tracking">Live Tracking</NavLink>
        <NavLink to="/analytics">Analytics</NavLink>
      </div>

      <div className="navbar-user">
        <span>{user?.name} ({user?.role?.replace('_', ' ')})</span>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
