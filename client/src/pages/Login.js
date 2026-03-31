import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            <FiShield size={30} color="#fff" />
          </div>
          <h1>Emergency Response Platform</h1>
          <p>National Dispatch Coordination System — Ghana</p>
        </div>

        {error && (
          <div className="error-msg">
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your official email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 24 }}>
          Authorized personnel only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
