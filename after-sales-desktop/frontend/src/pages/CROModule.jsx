import React, { useState, useEffect } from 'react';
import PMSDueList from '../components/PMSDueList';
import AppointmentSetting from '../components/AppointmentSetting';
import WalkInRegistration from '../components/WalkInRegistration';
import '../styles/cro-module.css';

const API_BASE = 'http://localhost:5000/api';

export default function CROModule() {
  const [activeTab, setActiveTab] = useState('pms-list');
  const [pmsDueCustomers, setPmsDueCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'pms-list') {
      fetchPmsDueList();
    }
  }, [activeTab]);

  const fetchPmsDueList = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/customer/pms-due-list`);
      const data = await response.json();
      if (data.success) {
        setPmsDueCustomers(data.data);
      }
    } catch (error) {
      console.error('Error fetching PMS due list:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cro-module">
      <div className="module-header">
        <h2>📋 CRO Module - Customer Appointment & Scheduling</h2>
        <p>Manage PMS due list, appointments, and walk-in registrations</p>
      </div>

      <div className="tab-container">
        <div className="tabs">
          <button
            className={`tab-button ${activeTab === 'pms-list' ? 'active' : ''}`}
            onClick={() => setActiveTab('pms-list')}
          >
            1.1 PMS Due List
          </button>
          <button
            className={`tab-button ${activeTab === 'appointment' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointment')}
          >
            1.2 Appointment Setting
          </button>
          <button
            className={`tab-button ${activeTab === 'walkin' ? 'active' : ''}`}
            onClick={() => setActiveTab('walkin')}
          >
            1.3 Walk-In Registration
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'pms-list' && (
            <PMSDueList customers={pmsDueCustomers} loading={loading} onRefresh={fetchPmsDueList} />
          )}
          {activeTab === 'appointment' && <AppointmentSetting />}
          {activeTab === 'walkin' && <WalkInRegistration onSuccess={fetchPmsDueList} />}
        </div>
      </div>
    </div>
  );
}
