import React, { useState, useEffect } from 'react';
import '../styles/vehicle-handover-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

export default function VehicleHandoverDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingHandovers, setPendingHandovers] = useState([]);
  const [completedHandovers, setCompletedHandovers] = useState([]);
  const [selectedHandover, setSelectedHandover] = useState(null);
  const [handoverDetails, setHandoverDetails] = useState(null);
  const [newItem, setNewItem] = useState({ item_type: 'parts', description: '', quantity: 1, condition: 'good' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch pending handovers
      const pendingData = await fetchJson('/api/vehicle-handover/handovers/pending');
      if (pendingData.success) setPendingHandovers(pendingData.handovers || pendingData.data || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleSelectHandover = async (handoverId) => {
    try {
      const data = await fetchJson(`/api/vehicle-handover/handovers/${handoverId}`);
      if (data.success) {
        setSelectedHandover(handoverId);
        setHandoverDetails(data.details || data.data);
      }
    } catch (error) {
      console.error('Error fetching handover details:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedHandover || !newItem.description) {
      alert('Please select a handover and enter item description');
      return;
    }

    try {
      const res = await fetchJson(`/api/vehicle-handover/handovers/${selectedHandover}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: newItem.item_type,
          item_description: newItem.description,
          quantity: newItem.quantity,
          condition_before: newItem.condition
        })
      });

      if (res.success) {
        alert('Item added successfully');
        setNewItem({ item_type: 'parts', description: '', quantity: 1, condition: 'good' });
        handleSelectHandover(selectedHandover);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleVerifyItem = async (itemId, conditionAfter) => {
    try {
      const res = await fetchJson(`/api/vehicle-handover/handovers/${selectedHandover}/items/${itemId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_after: conditionAfter,
          verified_by: user.id
        })
      });

      if (res.success) {
        alert('Item verified successfully');
        handleSelectHandover(selectedHandover);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRecordSignature = async () => {
    const signatorName = prompt('Enter signatory name:');
    if (!signatorName) return;

    try {
      const res = await fetchJson(`/api/vehicle-handover/handovers/${selectedHandover}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatory_type: 'customer',
          signatory_name: signatorName,
          signatory_role: 'customer',
          printed_name: signatorName,
          signature_image: null
        })
      });

      if (res.success) {
        alert('Signature recorded successfully');
        handleSelectHandover(selectedHandover);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCompleteHandover = async () => {
    try {
      const res = await fetchJson(`/api/vehicle-handover/handovers/${selectedHandover}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_cleanliness: 'excellent',
          fuel_level_final: '75%',
          mileage_final: prompt('Enter final mileage:') || '0',
          overall_condition: 'ready-for-delivery',
          all_items_returned: true
        })
      });

      if (res.success) {
        alert('Handover completed successfully');
        setSelectedHandover(null);
        setHandoverDetails(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="handover-container">
      <div className="vh-header">
        <div className="vh-title">
          🚗 Vehicle Handover Management
        </div>
        <div className="vh-user-info">
          <span>{user.name} ({user.role})</span>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>

      <div className="vh-tabs">
        <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending Handovers</button>
        <button className={`tab ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>Process Handover</button>
      </div>

      <div className="vh-content">
        {activeTab === 'pending' && (
          <div className="tab-content">
            <h2>Pending Handovers</h2>
            <div className="actions">
              <button onClick={fetchData} className="action-btn refresh">Refresh</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Service Order</th>
                    <th>Customer</th>
                    <th>Technician</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingHandovers.map((handover, idx) => (
                    <tr key={idx}>
                      <td>{handover[0]}</td>
                      <td>SO-{handover[1]}</td>
                      <td>{handover[4] || 'N/A'}</td>
                      <td>Tech-{handover[3]}</td>
                      <td>{handover[3]?.substring(0, 10) || 'N/A'}</td>
                      <td><span className="badge pending">{handover[6] || 'pending'}</span></td>
                      <td>
                        <button onClick={() => handleSelectHandover(handover[0])} className="action-btn">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'process' && (
          <div className="tab-content">
            <h2>Process Handover</h2>
            {!selectedHandover ? (
              <div className="info-message">Select a pending handover to process</div>
            ) : handoverDetails ? (
              <div className="handover-process">
                <div className="section">
                  <h3>Handover Information</h3>
                  <div className="info-grid">
                    <div><strong>Service Order:</strong> SO-{handoverDetails.handover[1]}</div>
                    <div><strong>Status:</strong> <span className="badge">{handoverDetails.handover[12]}</span></div>
                    <div><strong>Inspection Notes:</strong> {handoverDetails.handover[5] || 'None'}</div>
                  </div>
                </div>

                <div className="section">
                  <h3>Handover Items</h3>
                  <div className="item-form">
                    <select 
                      id="vh_item_type"
                      name="item_type"
                      aria-label="Item type"
                      value={newItem.item_type}
                      onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value })}
                    >
                      <option value="parts">Parts</option>
                      <option value="tools">Tools</option>
                      <option value="accessories">Accessories</option>
                      <option value="documents">Documents</option>
                      <option value="keys">Keys</option>
                      <option value="other">Other</option>
                    </select>
                    <input 
                      id="vh_item_description"
                      name="item_description"
                      aria-label="Item description"
                      type="text"
                      placeholder="Item description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    />
                    <input 
                      id="vh_item_quantity"
                      name="quantity"
                      aria-label="Quantity"
                      type="number"
                      placeholder="Quantity"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) })}
                      min="1"
                    />
                    <button onClick={handleAddItem} className="action-btn">Add Item</button>
                  </div>

                  <div className="items-list">
                    {handoverDetails.items && handoverDetails.items.map((item, idx) => (
                      <div key={idx} className="item-card">
                        <div><strong>{item[2]}</strong> (Qty: {item[3]})</div>
                        <div>Before: {item[4]} | After: {item[5] || 'pending'}</div>
                        {!item[6] && (
                          <button onClick={() => handleVerifyItem(item[0], 'good')} className="action-btn small">Verify</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <h3>Signatures</h3>
                  <button onClick={handleRecordSignature} className="action-btn">Record Signature</button>
                  <div className="signatures-list">
                    {handoverDetails.signatures && handoverDetails.signatures.map((sig, idx) => (
                      <div key={idx} className="signature-card">
                        <div><strong>{sig[2]}</strong> ({sig[1]})</div>
                        <div>{sig[4]}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <button onClick={handleCompleteHandover} className="submit-btn">Complete Handover</button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
