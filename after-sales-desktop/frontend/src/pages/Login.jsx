import React, { useState } from 'react';
import '../styles/login.css';
import { fetchJson } from '../utils/fetchJson';
import { 
  EnterpriseCard, 
  EnterpriseButton, 
  EnterpriseFormGroup, 
  EnterpriseCheckbox,
  Alert 
} from '../components/EnterpriseComponents';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setUsername('');
    setPassword('');
    setName('');
    setLocation('');
    setEmail('');
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (data.success) {
        // Add password to user object for admin operations
        const userData = {...data.user, password};
        onLogin(userData);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim() || !name.trim() || !location.trim()) {
      setError('All fields are required (username, password, name, location)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = await fetchJson('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name, location, email })
      });

      if (data.success) {
        setSuccess(data.message || 'Admin account created! You can now sign in.');
        setTimeout(() => {
          setMode('login');
          setSuccess('');
          setPassword('');
        }, 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    outline: 'none',
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: '500',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '6px',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e2e8f0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Centered Panel Wrapper */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '900px',
        height: '500px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        
        {/* LEFT PANEL - BRANDING (Yellow) */}
        <div style={{
          flex: '1',
          backgroundColor: '#FFE500',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#000'
        }}>
           <div>
              <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '2px', marginBottom: '24px', opacity: 0.8 }}>RAPIDÉ AUTO SERVICE</div>
              <h1 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '0.9', letterSpacing: '-2px', margin: 0, color: '#000' }}>
                ENTERPRISE<br/>ACCESS.
              </h1>
           </div>

           <div>
              <div style={{ width: '40px', height: '4px', background: '#000', marginBottom: '24px' }}></div>
              <p style={{ fontSize: '14px', margin: 0, fontWeight: '500', lineHeight: '1.6', maxWidth: '280px' }}>
                Authorized personnel only.<br/>
                Please ensure you are connected to the secure internal network.
              </p>
           </div>
        </div>

        {/* RIGHT PANEL - LOGIN/REGISTER FORM (White) */}
        <div style={{
          flex: '1.2',
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          overflowY: 'auto'
        }}>
          
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', margin: '0 0 8px 0' }}>
              {mode === 'login' ? 'Sign In' : 'Create Admin Account'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {mode === 'login' ? 'Access your dashboard.' : 'Set up a new branch admin.'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegisterAdmin} style={{ width: '100%' }}>
            {error && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#FEF2F2', 
                borderLeft: '3px solid #EF4444', 
                color: '#B91C1C', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                background: '#F0FDF4', 
                borderLeft: '3px solid #22C55E', 
                color: '#166534', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {success}
              </div>
            )}

            {mode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  style={inputStyle}
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                style={inputStyle}
                placeholder="Enter ID"
              />
            </div>
            
            <div style={{ marginBottom: mode === 'register' ? '16px' : '24px' }}>
              <label style={labelStyle}>Password</label>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={inputStyle}
                placeholder="••••••••"
              />
            </div>

            {mode === 'register' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Location / City</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => { setLocation(e.target.value); setError(''); }}
                    style={inputStyle}
                    placeholder="e.g. Butuan City"
                  />
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>Email (optional)</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    style={inputStyle}
                    placeholder="admin@example.com"
                  />
                </div>
              </>
            )}

            <button type="submit" style={{
              width: '100%',
              padding: '14px',
              background: '#000',
              color: '#FFE500',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'background 0.2s',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
               {loading ? 'Processing...' : (mode === 'login' ? 'Sign In Dashboard' : 'Create Admin Account')}
            </button>
          </form> 
          
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            {mode === 'login' ? (
              <button
                onClick={() => { setMode('register'); clearForm(); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Create new Admin Account
              </button>
            ) : (
              <button
                onClick={() => { setMode('login'); clearForm(); }}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
       <style>{`
        body { margin: 0; background-color: #e2e8f0; }
        input:focus { background: #fff !important; border-color: #000 !important; }
      `}</style>
    </div>
  );
};

export default Login;
