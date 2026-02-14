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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        {/* RIGHT PANEL - LOGIN FORM (White) */}
        <div style={{
          flex: '1.2',
          padding: '60px 80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: '#ffffff'
        }}>
          
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#111', margin: '0 0 8px 0' }}>Sign In</h2>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Access your admin dashboard.</p>
          </div>

          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            {error && (
              <div style={{ 
                marginBottom: '20px', 
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                style={{
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
                }}
                onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#000'; }}
                onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
                placeholder="Enter ID"
              />
            </div>
            
             <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
                <a href="#" style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }} onClick={(e) => e.preventDefault()}>Forgot?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                   onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  style={{
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
                  }}
                  onFocus={(e) => { e.target.style.background = '#fff'; e.target.style.borderColor = '#000'; }}
                  onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
                  placeholder="••••••••"
                />
                 {/* No button inside input for cleanness, rely on browser toggles or keep simple */}
              </div>
            </div>

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
               {loading ? 'Processing...' : 'Sign In Dashboard'}
            </button>
          </form> 
          
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ accentColor: '#000' }} />
              Remember this device
            </label>
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
