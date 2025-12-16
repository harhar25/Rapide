import React from 'react';
import '../styles/warehouse-dashboard.css';

const WarehouseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('pending');
  const [inventory, setInventory] = React.useState([
    { id: 1, part: 'Engine Oil (5L)', quantity: 45, minStock: 20, status: 'good' },
    { id: 2, part: 'Air Filter', quantity: 8, minStock: 15, status: 'low' },
    { id: 3, part: 'Brake Pads Set', quantity: 12, minStock: 10, status: 'good' },
    { id: 4, part: 'Spark Plugs', quantity: 3, minStock: 10, status: 'critical' },
  ]);

  const [requests, setRequests] = React.useState([
    { id: 101, job: 'Job #1234', part: 'Engine Oil', quantity: 2, status: 'pending' },
    { id: 102, job: 'Job #1235', part: 'Air Filter', quantity: 1, status: 'completed' },
  ]);

  return (
    <div className="warehouse-dashboard">
      <header className="wh-header">
        <div className="header-left">
          <h1>Inventory</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="wh-content">
        <div className="sections">
          <section className="inventory-section">
            <h2>Stock Status</h2>
            <div className="inventory-list">
              {inventory.map(item => (
                <div key={item.id} className={`inventory-item ${item.status}`}>
                  <div className="item-info">
                    <h4>{item.part}</h4>
                    <p>{item.quantity} in stock (Min: {item.minStock})</p>
                  </div>
                  <div className={`status-badge ${item.status}`}>
                    {item.status === 'good' && 'Good'}
                    {item.status === 'low' && 'Low'}
                    {item.status === 'critical' && 'Critical'}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="requests-section">
            <h2>Requests</h2>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending
              </button>
              <button 
                className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveTab('completed')}
              >
                Completed
              </button>
            </div>
            <div className="requests-list">
              {requests.filter(req => {
                if (activeTab === 'pending') return req.status === 'pending';
                return req.status === 'completed';
              }).map(req => (
                <div key={req.id} className={`request-card ${req.status}`}>
                  <div className="req-info">
                    <h4>{req.job}</h4>
                    <p>{req.part} x{req.quantity}</p>
                  </div>
                  <div className="req-actions">
                    {req.status === 'pending' && <button className="btn-fulfill">Fulfill</button>}
                    {req.status === 'completed' && <span className="completed">Done</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDashboard;
