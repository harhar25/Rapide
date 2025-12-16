import React from 'react';
import '../styles/technician-dashboard.css';

const TechnicianDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('assigned');
  const [jobs, setJobs] = React.useState([
    { id: 1, customer: 'Ahmed Hassan', vehicle: 'Toyota Corolla', service: 'Engine Oil Change', status: 'assigned', dueTime: '09:00 AM' },
    { id: 2, customer: 'Fatima Ali', vehicle: 'Honda Civic', service: 'Brake Inspection', status: 'in-progress', dueTime: '10:30 AM' },
    { id: 3, customer: 'Mohammed Khan', vehicle: 'BMW 3 Series', service: 'Full Service', status: 'assigned', dueTime: '02:00 PM' },
  ]);

  return (
    <div className="tech-dashboard">
      <header className="tech-header">
        <div className="header-left">
          <h1>Jobs</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="tech-content">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'assigned' ? 'active' : ''}`}
            onClick={() => setActiveTab('assigned')}
          >
            Assigned
          </button>
          <button 
            className={`tab ${activeTab === 'in-progress' ? 'active' : ''}`}
            onClick={() => setActiveTab('in-progress')}
          >
            In Progress
          </button>
          <button 
            className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>

        <div className="jobs-grid">
          {jobs.filter(job => {
            if (activeTab === 'assigned') return job.status === 'assigned';
            if (activeTab === 'in-progress') return job.status === 'in-progress';
            return job.status === 'completed';
          }).map(job => (
            <div key={job.id} className="job-card">
              <div className="job-header">
                <h3>{job.customer}</h3>
                <span className={`status ${job.status}`}>{job.status.replace('-', ' ')}</span>
              </div>
              <div className="job-details">
                <p><strong>Vehicle</strong> {job.vehicle}</p>
                <p><strong>Service</strong> {job.service}</p>
                <p><strong>Due</strong> {job.dueTime}</p>
              </div>
              <div className="job-actions">
                {job.status === 'assigned' && <button className="btn-start">Start</button>}
                {job.status === 'in-progress' && <button className="btn-complete">Complete</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
