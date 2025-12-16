import React, { useState } from 'react';
import '../styles/login.css';

const Login = ({ onLogin }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const roles = [
    { id: 'cro', name: 'CRO', icon: '📋', color: '#495057' },
    { id: 'technician', name: 'Tech', icon: '🔧', color: '#495057' },
    { id: 'warehouse', name: 'Warehouse', icon: '📦', color: '#495057' },
    { id: 'manager', name: 'Manager', icon: '👔', color: '#495057' },
    { id: 'advisor', name: 'Advisor', icon: '💼', color: '#495057' },
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedRole) {
      setError('Please select a role');
      return;
    }
    if (!username.trim()) {
      setError('Please enter username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    // For demo, accept any credentials
    onLogin({
      role: selectedRole,
      username: username,
      name: username.charAt(0).toUpperCase() + username.slice(1),
    });
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1><em>Rapide</em></h1>
        <p className="subtitle">Service Management System</p>

        <form onSubmit={handleLogin}>
          <div className="section">
            <label>Select Role</label>
            <div className="role-grid">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`role-btn ${selectedRole === role.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedRole(role.id);
                    setError('');
                  }}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-name">{role.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="section">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="john"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
            />
          </div>

          <div className="section">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>

        <div className="demo-info">
          <p>Demo mode: Any username/password</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
