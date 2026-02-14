import React, { useState, useEffect, useCallback } from 'react';
import '../styles/car-jockey-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  StatCard, 
  EnterpriseCard, 
  StatusBadge, 
  EnterpriseTabs, 
  ActionBar, 
  LoadingSpinner, 
  EmptyState,
  EnterpriseTable,
  EnterpriseButton,
  EnterpriseFormGroup,
  ModuleLayout,
  Modal
} from '../components/EnterpriseComponents';

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
  const [warehouseInventory, setWarehouseInventory] = useState([]);

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
  const [showPartsRequestModal, setShowPartsRequestModal] = useState(false);
  
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

  const [partsRequestForm, setPartsRequestForm] = useState({
    items: [
      { product_id: '', product_code: '', description: '', quantity: 1 }
    ]
  });

  // Load data on component mount and auto-refresh
  useEffect(() => {
    loadAllData();
    loadWarehouseInventory();
    const interval = setInterval(loadAllData, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  // --- REAL-TIME UPDATES ---
  const handleRealtimeUpdate = useCallback(() => {
    loadAllData();
  }, []);

  useAutoRefresh(['car-jockey', 'job-controller', 'foreman-qc'], handleRealtimeUpdate);

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

  const loadWarehouseInventory = async () => {
    try {
      const result = await fetchJson('/api/warehouse/products');
      if (result.success) {
        // Convert tuples to objects for easier access
        const inventory = (result.data || []).map(product => {
          // Product tuple format: (id, code, name, category, price, qty, reorder_level, supplier, description, status)
          return {
            product_id: product[0],
            product_code: product[1],
            description: product[2] + (product[3] ? ' - ' + product[3] : ''),  // name + category
            quantity_in_stock: product[5]
          };
        });
        setWarehouseInventory(inventory);
      }
    } catch (error) {
      console.error('Error loading warehouse inventory:', error);
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

  const handleRequestParts = (movement) => {
    setSelectedVehicle(movement);
    setPartsRequestForm({
      items: [
        { product_id: '', product_code: '', description: '', quantity: 1 }
      ]
    });
    setShowPartsRequestModal(true);
  };

  const handleAddPartsItem = () => {
    setPartsRequestForm({
      items: [
        ...partsRequestForm.items,
        { product_id: '', product_code: '', description: '', quantity: 1 }
      ]
    });
  };

  const handleRemovePartsItem = (index) => {
    setPartsRequestForm({
      items: partsRequestForm.items.filter((_, i) => i !== index)
    });
  };

  const handlePartsItemChange = (index, field, value) => {
    const updatedItems = [...partsRequestForm.items];
    
    if (field === 'product_id') {
      const product = warehouseInventory.find(p => p.product_id === value);
      if (product) {
        updatedItems[index] = {
          product_id: product.product_id,
          product_code: product.product_code,
          description: product.description,
          quantity: updatedItems[index].quantity
        };
      }
    } else if (field === 'quantity') {
      updatedItems[index].quantity = parseInt(value) || 1;
    }
    
    setPartsRequestForm({ items: updatedItems });
  };

  const handleSubmitPartsRequest = async () => {
    if (partsRequestForm.items.some(item => !item.product_id)) {
      setErrorMessage('Please select a product for all items');
      return;
    }

    try {
      const result = await fetchJson('/api/car-jockey/parts-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: selectedVehicle.so_id,
          jockey_id: user.id,
          items: partsRequestForm.items
        })
      });

      if (result.success) {
        setSuccessMessage('Parts request submitted to Job Controller');
        setShowPartsRequestModal(false);
        setTimeout(() => {
          setSuccessMessage('');
          loadAllData();
        }, 2000);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage('Error submitting parts request: ' + error.message);
    }
  };

  const moduleStats = summary ? [
    { label: 'Total Movements', value: summary.total_movements, icon: '📊' },
    { label: 'In Progress', value: summary.active_movements, icon: '🚙' },
    { label: 'Completed', value: summary.completed_movements, icon: '✓' },
    { label: 'Currently Parked', value: summary.currently_parked, icon: '🅿️' },
    { label: 'Parking Revenue', value: formatMoney(summary.parking_revenue), icon: '💰' },
    { label: 'Avg Mileage', value: `${Number(summary.avg_mileage_traveled || 0).toFixed(0)} km`, icon: '📏' }
  ] : [];

  const tabs = [
    { id: 'pending', label: 'Pending Vehicles', icon: '📋' },
    { id: 'active', label: 'Active Movements', icon: '🚙' },
    { id: 'parked', label: 'Parked Vehicles', icon: '🅿️' }
  ];

  const pendingColumns = [
    { header: 'SO #', accessor: (v) => <strong>{v.so_id}</strong> },
    { header: 'Customer', accessor: 'customer_name' },
    { header: 'Plate No', accessor: (v) => <strong>{v.plate_no}</strong> },
    { header: 'Model', accessor: 'model' },
    { header: 'Year', accessor: 'year' },
    { header: 'Status', accessor: (v) => <StatusBadge status={v.status}>{v.status}</StatusBadge> },
    { header: 'Actions', accessor: (v) => (
      <EnterpriseButton variant="primary" size="sm" onClick={() => handleStartMovement(v)}>
        Start Movement
      </EnterpriseButton>
    )}
  ];

  const activeColumns = [
    { header: 'SO #', accessor: 'so_no' },
    { header: 'Type', accessor: (m) => <span className="badge-type">{m.type}</span> },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Plate', accessor: 'plate_no' },
    { header: 'Movement', accessor: (m) => <span>{m.from} → <strong>{m.to}</strong></span> },
    { header: 'Fuel', accessor: (m) => `${m.fuel_start}L → ${m.fuel_end}L` },
    { header: 'Started', accessor: (m) => new Date(m.started_at).toLocaleString() },
    { header: 'Actions', accessor: (m) => {
        if (m.type === 'check-out') return <span className="status-complete">✓ Checked Out</span>;
        return (
          <div style={{ display: 'flex', gap: '5px' }}>
            <EnterpriseButton size="sm" onClick={() => handleCompleteMovement(m)}>Complete</EnterpriseButton>
            <EnterpriseButton size="sm" variant="secondary" onClick={() => handleParkVehicle(m)}>Park</EnterpriseButton>
            <EnterpriseButton size="sm" style={{ backgroundColor: '#2196F3', borderColor: '#2196F3' }} onClick={() => handleRequestParts(m)}>Parts</EnterpriseButton>
          </div>
        );
    }}
  ];

  const parkedColumns = [
    { header: 'SO #', accessor: 'so_no' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Plate', accessor: 'plate_no' },
    { header: 'Slot', accessor: 'slot' },
    { header: 'Zone', accessor: 'zone' },
    { header: 'Parked At', accessor: (p) => new Date(p.parked_at).toLocaleString() },
    { header: 'Duration (hrs)', accessor: (p) => p.duration_hrs?.toFixed(1) || '-' },
    { header: 'Fee', accessor: (p) => formatMoney(p.fee) },
    { header: 'Actions', accessor: (p) => (
      <EnterpriseButton variant="danger" size="sm" onClick={() => handleReleaseParking(p)}>Release</EnterpriseButton>
    )}
  ];

  return (
    <ModuleLayout
      title="Car Jockey Operations"
      description="Vehicle Movement & Parking Management"
      icon="🚗"
      user={user}
      onLogout={onLogout}
      stats={moduleStats}
      actions={
        <EnterpriseButton variant="secondary" onClick={loadAllData} disabled={loading}>
           {loading ? 'Refreshing...' : 'Refresh'}
        </EnterpriseButton>
      }
    >
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

      <EnterpriseTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div style={{ marginTop: '20px' }}>
        {activeTab === 'pending' && (
           <EnterpriseCard title="Pending Vehicles" subtitle="Vehicles waiting for movement">
              {pendingVehicles.length > 0 ? (
                 <EnterpriseTable columns={pendingColumns} data={pendingVehicles} />
              ) : (
                 <EmptyState icon="🚗" title="No Pending Vehicles" description="All vehicles have been processed" />
              )}
           </EnterpriseCard>
        )}

        {activeTab === 'active' && (
           <EnterpriseCard title="Active Movements" subtitle="Ongoing vehicle movements">
              {activeMovements.length > 0 ? (
                 <EnterpriseTable columns={activeColumns} data={activeMovements} />
              ) : (
                 <EmptyState icon="🚙" title="No Active Movements" description="No vehicles are currently moving." />
              )}
           </EnterpriseCard>
        )}

        {activeTab === 'parked' && (
           <EnterpriseCard title="Parked Vehicles" subtitle="Vehicles currently in parking">
              {parkedVehicles.length > 0 ? (
                 <EnterpriseTable columns={parkedColumns} data={parkedVehicles} />
              ) : (
                 <EmptyState icon="🅿️" title="No Parked Vehicles" description="Parking lot is empty." />
              )}
           </EnterpriseCard>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title="Start Vehicle Movement"
      >
        <div className="p-3">
          <EnterpriseFormGroup label="Movement Type">
            <select 
              value={movementForm.movement_type}
              onChange={(e) => setMovementForm({...movementForm, movement_type: e.target.value})}
              className="enterprise-select"
            >
              <option value="check-in">Check-In</option>
              <option value="parking">Parking</option>
              <option value="retrieval">Retrieval</option>
              <option value="check-out">Check-Out</option>
            </select>
          </EnterpriseFormGroup>

          <EnterpriseFormGroup label="From Location">
            <input 
              type="text"
              value={movementForm.from_location}
              onChange={(e) => setMovementForm({...movementForm, from_location: e.target.value})}
              placeholder="e.g., Service Bay"
              className="enterprise-input"
            />
          </EnterpriseFormGroup>

          <EnterpriseFormGroup label="To Location">
            <input 
              type="text"
              value={movementForm.to_location}
              onChange={(e) => setMovementForm({...movementForm, to_location: e.target.value})}
              placeholder="e.g., Parking Zone A"
              className="enterprise-input"
            />
          </EnterpriseFormGroup>

          <EnterpriseFormGroup label="Vehicle Condition">
            <input 
              type="text"
              value={movementForm.vehicle_condition}
              onChange={(e) => setMovementForm({...movementForm, vehicle_condition: e.target.value})}
              placeholder="e.g., Good, Excellent"
              className="enterprise-input"
            />
          </EnterpriseFormGroup>

          <div className="grid-2-col">
            <EnterpriseFormGroup label="Fuel Level (%)">
              <input 
                type="number"
                value={movementForm.fuel_level}
                onChange={(e) => setMovementForm({...movementForm, fuel_level: parseInt(e.target.value)})}
                min="0" max="100"
                className="enterprise-input"
              />
            </EnterpriseFormGroup>
            <EnterpriseFormGroup label="Current Mileage">
              <input 
                type="number"
                value={movementForm.mileage}
                onChange={(e) => setMovementForm({...movementForm, mileage: parseInt(e.target.value)})}
                className="enterprise-input"
              />
            </EnterpriseFormGroup>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <EnterpriseButton variant="secondary" onClick={() => setShowMovementModal(false)}>Cancel</EnterpriseButton>
            <EnterpriseButton variant="primary" onClick={handleSubmitMovement}>Start Movement</EnterpriseButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Vehicle Movement"
      >
        <div className="p-3">
          <form>
            <EnterpriseFormGroup label="Final Vehicle Condition">
              <input 
                className="enterprise-input"
                type="text"
                value={completeForm.vehicle_condition}
                onChange={(e) => setCompleteForm({...completeForm, vehicle_condition: e.target.value})}
              />
            </EnterpriseFormGroup>
            
            <div className="grid-2-col">
              <EnterpriseFormGroup label="Final Fuel Level (%)">
                <input 
                  className="enterprise-input"
                  type="number"
                  value={completeForm.fuel_level}
                  onChange={(e) => setCompleteForm({...completeForm, fuel_level: parseInt(e.target.value)})}
                  min="0" max="100"
                />
              </EnterpriseFormGroup>
              <EnterpriseFormGroup label="Final Mileage">
                <input 
                  className="enterprise-input"
                  type="number"
                  value={completeForm.mileage}
                  onChange={(e) => setCompleteForm({...completeForm, mileage: parseInt(e.target.value)})}
                />
              </EnterpriseFormGroup>
            </div>

            <EnterpriseFormGroup label="Notes">
              <textarea 
                className="enterprise-textarea"
                value={completeForm.notes}
                onChange={(e) => setCompleteForm({...completeForm, notes: e.target.value})}
                rows="3"
              />
            </EnterpriseFormGroup>

            <div className="modal-buttons">
              <EnterpriseButton variant="secondary" onClick={() => setShowCompleteModal(false)}>Cancel</EnterpriseButton>
              <EnterpriseButton variant="primary" onClick={handleSubmitComplete}>Complete Movement</EnterpriseButton>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={showParkingModal}
        onClose={() => setShowParkingModal(false)}
        title="Park Vehicle"
      >
        <div className="p-3">
          <form>
            <div className="grid-2-col">
              <EnterpriseFormGroup label="Parking Slot">
                <input 
                  className="enterprise-input"
                  type="text"
                  value={parkingForm.parking_slot}
                  onChange={(e) => setParkingForm({...parkingForm, parking_slot: e.target.value})}
                  placeholder="e.g., A01"
                />
              </EnterpriseFormGroup>
              <EnterpriseFormGroup label="Zone">
                <select 
                  className="enterprise-select"
                  value={parkingForm.parking_zone}
                  onChange={(e) => setParkingForm({...parkingForm, parking_zone: e.target.value})}
                >
                  <option value="A">Zone A</option>
                  <option value="B">Zone B</option>
                  <option value="C">Zone C</option>
                  <option value="VIP">VIP</option>
                </select>
              </EnterpriseFormGroup>
            </div>

            <div className="grid-2-col">
              <EnterpriseFormGroup label="Parking Level">
                <input 
                  className="enterprise-input"
                  type="number"
                  value={parkingForm.parking_level}
                  onChange={(e) => setParkingForm({...parkingForm, parking_level: parseInt(e.target.value)})}
                  min="0"
                />
              </EnterpriseFormGroup>
              <EnterpriseFormGroup label="Ground Condition">
                <select 
                  className="enterprise-select"
                  value={parkingForm.ground_condition}
                  onChange={(e) => setParkingForm({...parkingForm, ground_condition: e.target.value})}
                >
                  <option value="clean">Clean</option>
                  <option value="wet">Wet</option>
                  <option value="damaged">Damaged</option>
                </select>
              </EnterpriseFormGroup>
            </div>

            <EnterpriseFormGroup label="Parking Fee (₱)">
              <input 
                className="enterprise-input"
                type="number"
                value={parkingForm.parking_fee}
                onChange={(e) => setParkingForm({...parkingForm, parking_fee: parseFloat(e.target.value) || 0})}
                min="0" step="0.01"
              />
            </EnterpriseFormGroup>
            
            <div className="modal-buttons">
              <EnterpriseButton variant="secondary" onClick={() => setShowParkingModal(false)}>Cancel</EnterpriseButton>
              <EnterpriseButton variant="primary" onClick={handleSubmitParking}>Park Vehicle</EnterpriseButton>
            </div>
          </form>
        </div>
      </Modal>

      <Modal
        isOpen={showReleaseModal}
        onClose={() => setShowReleaseModal(false)}
        title="Release Vehicle from Parking"
      >
        <div className="p-3">
          <p className="mb-4">Are you sure you want to release <strong>{selectedVehicle?.plate_no}</strong> from parking?</p>
          <div className="modal-buttons">
            <EnterpriseButton variant="secondary" onClick={() => setShowReleaseModal(false)}>Cancel</EnterpriseButton>
            <EnterpriseButton variant="primary" onClick={handleSubmitRelease}>Confirm Release</EnterpriseButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPartsRequestModal}
        onClose={() => setShowPartsRequestModal(false)}
        title="Request Parts from Warehouse"
      >
        <div className="p-3">
          <p className="text-secondary mb-4">
            Service Order: <strong>{selectedVehicle?.so_id}</strong> | Plate: <strong>{selectedVehicle?.plate_no}</strong>
          </p>
          <form className="mb-4">
            <div className="bg-secondary p-3 rounded mb-3 border border-primary">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                    <th className="text-left p-2 font-medium">Product</th>
                    <th className="text-left p-2 font-medium" style={{ width: '100px' }}>Qty</th>
                    <th className="text-center p-2" style={{ width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partsRequestForm.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                      <td className="p-2">
                        <select
                          className="enterprise-select w-full"
                          value={item.product_id}
                          onChange={(e) => handlePartsItemChange(index, 'product_id', e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {warehouseInventory.map((product, i) => (
                            <option key={i} value={product.product_id}>
                              {product.product_code} - {product.description} (Stock: {product.quantity_in_stock})
                            </option>
                          ))}
                        </select>
                        {item.product_code && (
                          <div className="text-xs text-secondary mt-1">
                            Code: {item.product_code}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="enterprise-input w-full"
                          value={item.quantity}
                          onChange={(e) => handlePartsItemChange(index, 'quantity', e.target.value)}
                          min="1"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {partsRequestForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePartsItem(index)}
                            className="text-error hover:text-error-dark"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <EnterpriseButton
              type="button"
              variant="success"
              onClick={handleAddPartsItem}
              className="mb-4"
            >
              + Add Item
            </EnterpriseButton>

            <div className="modal-buttons">
              <EnterpriseButton 
                variant="secondary" 
                onClick={() => setShowPartsRequestModal(false)}
              >
                Cancel
              </EnterpriseButton>
              <EnterpriseButton 
                variant="primary" 
                onClick={handleSubmitPartsRequest}
              >
                Submit Request to Job Controller
              </EnterpriseButton>
            </div>
          </form>
        </div>
      </Modal>

        {/* Footer */}
        <div className="dashboard-footer">
          <p>*Rapide Services - Car Jockey Module | {new Date().toLocaleDateString()}</p>
        </div>
      </ModuleLayout>
  );
}
