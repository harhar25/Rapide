import React, { useState, useEffect } from 'react';
import '../styles/car-jockey-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { StatCard, EnterpriseCard, StatusBadge, EnterpriseTabs, ActionBar, LoadingSpinner, EmptyState } from '../components/EnterpriseComponents';

export default function CarJockeyDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [activeMovements, setActiveMovements] = useState([]);
  const [parkedVehicles, setParkedVehicles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const formatMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };
  
  // Modal states
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showParkingModal, setShowParkingModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  
  // Form states
  const [movementForm, setMovementForm] = useState({
    movement_type: 'check-in',
    from_location: '',
    to_location: '',
    reason: '',
    vehicle_condition: '',
    fuel_level: 50,
    mileage: 0
  });
  
  const [completeForm, setCompleteForm] = useState({
    vehicle_condition: '',
    fuel_level: 50,
    mileage: 0,
    notes: ''
  });
  
  const [parkingForm, setParkingForm] = useState({
    parking_slot: '',
    parking_zone: 'A',
    parking_level: 0,
    ground_condition: 'clean',
    parking_fee: 0
  });

  // Load data on component mount and auto-refresh
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingVehicles(),
        loadActiveMovements(),
        loadParkedVehicles(),
        loadSummary()
      ]);
    } catch (err) {
      setErrorMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingVehicles = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/vehicles/pending');
      if (result.success) {
        setPendingVehicles(result.data);
      }
    } catch (error) {
      console.error('Error loading pending vehicles:', error);
    }
  };

  const loadActiveMovements = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/movements/active');
      if (result.success) {
        setActiveMovements(result.data);
      }
    } catch (error) {
      console.error('Error loading active movements:', error);
    }
  };

  const loadParkedVehicles = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/parking/active');
      if (result.success) {
        setParkedVehicles(result.data);
      }
    } catch (error) {
      console.error('Error loading parked vehicles:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/summary');
      if (result.success) {
        setSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleStartMovement = (vehicle) => {
    setSelectedVehicle(vehicle);
    setMovementForm({
      movement_type: 'check-in',
      from_location: 'Service Bay',
      to_location: 'Parking Zone A',
      reason: 'Post-service parking',
      vehicle_condition: 'Good',
      fuel_level: 50,
      mileage: 0
    });
    setShowMovementModal(true);
  };

  const handleSubmitMovement = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedVehicle.so_id,
          jockey_id: user.id,
          ...movementForm
        })
      });

      if (result.success) {
        setSuccessMessage('Vehicle movement started');
        setShowMovementModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error creating movement: ' + error.message);
    }
  };

  const handleCompleteMovement = (movement) => {
    setSelectedVehicle(movement);
    setCompleteForm({
      vehicle_condition: movement.vehicle_condition_start || 'Good',
      fuel_level: movement.fuel_end || 50,
      mileage: (movement.mileage_end || 0) + 5,
      notes: ''
    });
    setShowCompleteModal(true);
  };

  const handleSubmitComplete = async () => {
    try {
      const result = await fetchJson(`/api/car-jockey/movements/${selectedVehicle.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeForm)
      });

      if (result.success) {
        setSuccessMessage('Vehicle movement completed');
        setShowCompleteModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error completing movement: ' + error.message);
    }
  };

  const handleParkVehicle = (movement) => {
    setSelectedVehicle(movement);
    setParkingForm({
      parking_slot: 'A01',
      parking_zone: 'A',
      parking_level: 0,
      ground_condition: 'clean',
      parking_fee: 0
    });
    setShowParkingModal(true);
  };

  const handleSubmitParking = async () => {
    try {
      const result = await fetchJson('/api/car-jockey/parking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedVehicle.so_id,
          vehicle_movement_id: selectedVehicle.id,
          ...parkingForm
        })
      });

      if (result.success) {
        setSuccessMessage('Vehicle parked successfully');
        setShowParkingModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error parking vehicle: ' + error.message);
    }
  };

  const handleReleaseParking = (parking) => {
    setSelectedVehicle(parking);
    setShowReleaseModal(true);
  };

  const handleSubmitRelease = async () => {
    try {
      const result = await fetchJson(`/api/car-jockey/parking/${selectedVehicle.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      });

      if (result.success) {
        setSuccessMessage('Vehicle released from parking');
        setShowReleaseModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error releasing vehicle: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-wrapper">
        {/* Enterprise Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-title-section">
              <h1 className="dashboard-title">
                <span className="dashboard-title-icon">🚗</span>
                Car Jockey Operations
              </h1>
              <p className="dashboard-subtitle">Vehicle Movement & Parking Management</p>
            </div>
            <div className="dashboard-actions">
              <button onClick={loadAllData} className="btn-enterprise btn-secondary btn-sm" disabled={loading}>
                {loading ? <LoadingSpinner size={16} /> : '🔄'} Refresh
              </button>
              {user?.role !== 'admin' && (
                <button onClick={onLogout} className="btn-enterprise btn-secondary btn-sm">Logout</button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-6)' }}>
            <span>✗</span>
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-6)' }}>
            <span>✓</span>
            <div>{successMessage}</div>
          </div>
        )}

        {/* Enterprise Summary Cards */}
        {summary && (
          <div className="summary-grid stagger-children">
            <StatCard 
              value={summary.total_movements} 
              label="Total Movements"
              icon="📊"
            />
            <StatCard 
              value={summary.active_movements} 
              label="In Progress"
              icon="🚙"
            />
            <StatCard 
              value={summary.completed_movements} 
              label="Completed"
              icon="✓"
            />
            <StatCard 
              value={summary.currently_parked} 
              label="Currently Parked"
              icon="🅿️"
            />
            <StatCard 
              value={formatMoney(summary.parking_revenue)} 
              label="Parking Revenue"
              icon="💰"
            />
            <StatCard 
              value={`${Number(summary.avg_mileage_traveled || 0).toFixed(0)} km`}
              label="Avg Mileage"
              icon="📏"
            />
          </div>
        )}

        {/* Enterprise Tabs */}
        <EnterpriseTabs
          tabs={[
            { id: 'pending', label: 'Pending Vehicles', icon: '📋' },
            { id: 'active', label: 'Active Movements', icon: '🚙' },
            { id: 'parked', label: 'Parked Vehicles', icon: '🅿️' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Content */}
        <div className="content-section">
          <div className="section-body">
            {/* Pending Vehicles Tab */}
            {activeTab === 'pending' && (
              <div className="enterprise-table">
                <table>
                  <thead>
                    <tr>
                      <th>SO #</th>
                      <th>Customer</th>
                      <th>Plate No</th>
                      <th>Model</th>
                      <th>Year</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVehicles.length === 0 ? (
                      <tr><td colSpan="7"><EmptyState icon="🚗" title="No Pending Vehicles" description="All vehicles have been processed" /></td></tr>
                    ) : (
                      pendingVehicles.map((v, idx) => (
                        <tr key={idx}>
                          <td><strong>{v.so_id}</strong></td>
                          <td>{v.customer_name}</td>
                          <td><strong>{v.plate_no}</strong></td>
                          <td>{v.model}</td>
                          <td>{v.year}</td>
                          <td><StatusBadge status={v.status}>{v.status}</StatusBadge></td>
                          <td>
                            <button 
                              className="btn-enterprise btn-primary btn-sm"
                              onClick={() => handleStartMovement(v)}
                            >
                              Start Movement
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

        {/* Active Movements Tab */}
        {activeTab === 'active' && (
          <div className="tab-content">
            <div className="movements-grid">
              {activeMovements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>No active movements</div>
              ) : (
                activeMovements.map((m, idx) => (
                  <div key={idx} className="movement-card">
                    <div className="card-header">
                      <h3>{m.so_no}</h3>
                      <span className="badge-type">{m.type}</span>
                    </div>
                    <div className="card-body">
                      <p><strong>Customer:</strong> {m.customer}</p>
                      <p><strong>Plate:</strong> {m.plate_no}</p>
                      <p><strong>From:</strong> {m.from} → <strong>To:</strong> {m.to}</p>
                      <p><strong>Fuel:</strong> {m.fuel_start}L → {m.fuel_end}L</p>
                      <p><strong>Mileage:</strong> {m.mileage_start} → {m.mileage_end} km</p>
                      <p><strong>Started:</strong> {new Date(m.started_at).toLocaleString()}</p>
                    </div>
                    <div className="card-footer">
                      {m.type !== 'check-out' ? (
                        <>
                          <button 
                            className="btn-action btn-complete"
                            onClick={() => handleCompleteMovement(m)}
                          >
                            Complete
                          </button>
                          <button 
                            className="btn-action btn-park"
                            onClick={() => handleParkVehicle(m)}
                          >
                            Park Vehicle
                          </button>
                        </>
                      ) : (
                        <span className="status-complete">✓ Checked Out</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Parked Vehicles Tab */}
        {activeTab === 'parked' && (
          <div className="tab-content">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SO #</th>
                  <th>Customer</th>
                  <th>Plate</th>
                  <th>Slot</th>
                  <th>Zone</th>
                  <th>Parked At</th>
                  <th>Duration (hrs)</th>
                  <th>Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parkedVehicles.length === 0 ? (
                  <tr><td colSpan="9" style={{ textAlign: 'center' }}>No parked vehicles</td></tr>
                ) : (
                  parkedVehicles.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.so_no}</td>
                      <td>{p.customer}</td>
                      <td>{p.plate_no}</td>
                      <td>{p.slot}</td>
                      <td>{p.zone}</td>
                      <td>{new Date(p.parked_at).toLocaleString()}</td>
                      <td>{p.duration_hrs?.toFixed(1) || '-'}</td>
                      <td>{formatMoney(p.fee)}</td>
                      <td>
                        <button 
                          className="btn-action btn-release"
                          onClick={() => handleReleaseParking(p)}
                        >
                          Release
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
          </div>
        </div>

      {/* Modals */}
      {showMovementModal && (
        <div className="modal-overlay" onClick={() => setShowMovementModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Start Vehicle Movement</h2>
            <form>
              <label>Movement Type:
                <select 
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm({...movementForm, movement_type: e.target.value})}
                >
                  <option value="check-in">Check-In</option>
                  <option value="parking">Parking</option>
                  <option value="retrieval">Retrieval</option>
                  <option value="check-out">Check-Out</option>
                </select>
              </label>
              <label>From Location:
                <input 
                  type="text"
                  value={movementForm.from_location}
                  onChange={(e) => setMovementForm({...movementForm, from_location: e.target.value})}
                  placeholder="e.g., Service Bay"
                />
              </label>
              <label>To Location:
                <input 
                  type="text"
                  value={movementForm.to_location}
                  onChange={(e) => setMovementForm({...movementForm, to_location: e.target.value})}
                  placeholder="e.g., Parking Zone A"
                />
              </label>
              <label>Vehicle Condition:
                <input 
                  type="text"
                  value={movementForm.vehicle_condition}
                  onChange={(e) => setMovementForm({...movementForm, vehicle_condition: e.target.value})}
                  placeholder="e.g., Good, Excellent"
                />
              </label>
              <label>Fuel Level (%):
                <input 
                  type="number"
                  value={movementForm.fuel_level}
                  onChange={(e) => setMovementForm({...movementForm, fuel_level: parseInt(e.target.value)})}
                  min="0" max="100"
                />
              </label>
              <label>Current Mileage:
                <input 
                  type="number"
                  value={movementForm.mileage}
                  onChange={(e) => setMovementForm({...movementForm, mileage: parseInt(e.target.value)})}
                />
              </label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowMovementModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleSubmitMovement}>Start Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Complete Vehicle Movement</h2>
            <form>
              <label>Final Vehicle Condition:
                <input 
                  type="text"
                  value={completeForm.vehicle_condition}
                  onChange={(e) => setCompleteForm({...completeForm, vehicle_condition: e.target.value})}
                />
              </label>
              <label>Final Fuel Level (%):
                <input 
                  type="number"
                  value={completeForm.fuel_level}
                  onChange={(e) => setCompleteForm({...completeForm, fuel_level: parseInt(e.target.value)})}
                  min="0" max="100"
                />
              </label>
              <label>Final Mileage:
                <input 
                  type="number"
                  value={completeForm.mileage}
                  onChange={(e) => setCompleteForm({...completeForm, mileage: parseInt(e.target.value)})}
                />
              </label>
              <label>Notes:
                <textarea 
                  value={completeForm.notes}
                  onChange={(e) => setCompleteForm({...completeForm, notes: e.target.value})}
                  rows="3"
                />
              </label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleSubmitComplete}>Complete Movement</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showParkingModal && (
        <div className="modal-overlay" onClick={() => setShowParkingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Park Vehicle</h2>
            <form>
              <label>Parking Slot:
                <input 
                  type="text"
                  value={parkingForm.parking_slot}
                  onChange={(e) => setParkingForm({...parkingForm, parking_slot: e.target.value})}
                  placeholder="e.g., A01"
                />
              </label>
              <label>Zone:
                <select 
                  value={parkingForm.parking_zone}
                  onChange={(e) => setParkingForm({...parkingForm, parking_zone: e.target.value})}
                >
                  <option value="A">Zone A</option>
                  <option value="B">Zone B</option>
                  <option value="C">Zone C</option>
                  <option value="VIP">VIP</option>
                </select>
              </label>
              <label>Parking Level:
                <input 
                  type="number"
                  value={parkingForm.parking_level}
                  onChange={(e) => setParkingForm({...parkingForm, parking_level: parseInt(e.target.value)})}
                  min="0"
                />
              </label>
              <label>Ground Condition:
                <select 
                  value={parkingForm.ground_condition}
                  onChange={(e) => setParkingForm({...parkingForm, ground_condition: e.target.value})}
                >
                  <option value="clean">Clean</option>
                  <option value="wet">Wet</option>
                  <option value="damaged">Damaged</option>
                </select>
              </label>
              <label>Parking Fee (₱):
                <input 
                  type="number"
                  value={parkingForm.parking_fee}
                  onChange={(e) => setParkingForm({...parkingForm, parking_fee: parseFloat(e.target.value) || 0})}
                  min="0" step="0.01"
                />
              </label>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowParkingModal(false)}>Cancel</button>
                <button type="button" className="btn-submit" onClick={handleSubmitParking}>Park Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReleaseModal && (
        <div className="modal-overlay" onClick={() => setShowReleaseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Release Vehicle from Parking</h2>
            <p>Are you sure you want to release <strong>{selectedVehicle?.plate_no}</strong> from parking?</p>
            <div className="modal-buttons">
              <button type="button" className="btn-cancel" onClick={() => setShowReleaseModal(false)}>Cancel</button>
              <button type="button" className="btn-submit" onClick={handleSubmitRelease}>Confirm Release</button>
            </div>
          </div>
        </div>
      )}

        {/* Footer */}
        <div className="dashboard-footer">
          <p>*Rapide Services - Car Jockey Module | {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
