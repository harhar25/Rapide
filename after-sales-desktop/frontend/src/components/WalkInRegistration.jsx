import React, { useState, useCallback } from 'react';
import { fetchJson } from '../utils/fetchJson';
import { EnterpriseCard, EnterpriseTable, FormGroup, StatusBadge } from './EnterpriseComponents';

const API_BASE = '/api';

// Debounce helper
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function WalkInRegistration({ onSuccess }) {
  const [searchMode, setSearchMode] = useState('search');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [plateLoading, setPlateLoading] = useState(false);
  const [foundExisting, setFoundExisting] = useState(null); // Track if we found existing customer

  const [customerData, setCustomerData] = useState({
    name: '',
    contact_no: '',
    plate_no: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    email: '',
    engine_no: '',
    chassis_no: '',
    address: '',
    city: ''
  });

  // Auto-lookup by plate number
  const lookupByPlate = useCallback(
    debounce(async (plate) => {
      if (!plate || plate.length < 3) {
        setFoundExisting(null);
        return;
      }
      
      setPlateLoading(true);
      try {
        const res = await fetchJson(`${API_BASE}/customer/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            search_type: 'plate',
            search_value: plate
          })
        });
        
        if (res.success && res.data && res.data.length > 0) {
          // Found existing customer - auto-fill the form
          const customer = res.data[0];
          setFoundExisting(customer);
          setCustomerData(prev => ({
            ...prev,
            name: customer.name || prev.name,
            contact_no: customer.contact_no || prev.contact_no,
            vehicle_model: customer.vehicle_model || prev.vehicle_model,
            vehicle_year: customer.vehicle_year || prev.vehicle_year,
            email: customer.email || prev.email,
            engine_no: customer.engine_no || prev.engine_no,
            chassis_no: customer.chassis_no || prev.chassis_no,
            address: customer.address || prev.address,
            city: customer.city || prev.city
          }));
        } else {
          setFoundExisting(null);
        }
      } catch (e) {
        console.error('Plate lookup error:', e);
        setFoundExisting(null);
      }
      setPlateLoading(false);
    }, 500),
    []
  );

  // Handle plate number change with auto-lookup
  const handlePlateChange = (e) => {
    const plate = e.target.value.toUpperCase();
    setCustomerData(prev => ({ ...prev, plate_no: plate }));
    lookupByPlate(plate);
  };

  // Reset form to initial state
  const resetForm = () => {
    setCustomerData({
      name: '',
      contact_no: '',
      plate_no: '',
      vehicle_model: '',
      vehicle_year: new Date().getFullYear(),
      email: '',
      engine_no: '',
      chassis_no: '',
      address: '',
      city: ''
    });
    setFoundExisting(null);
    setSearchMode('search');
    setSearchResults([]);
    setSelectedCustomer(null);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const searchValue = e.target.search_value.value;
    const searchType = e.target.search_type.value;

    if (!searchValue) {
      alert('Please enter search value');
      return;
    }

    try {
      const data = await fetchJson(`${API_BASE}/customer/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_type: searchType,
          search_value: searchValue
        })
      });
      if (data.success) {
        setSearchResults(data.data);
      } else {
        alert(data.error || 'Search failed');
      }
    } catch (error) {
      console.error('Error searching customer:', error);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchMode('existing');
  };

  const handleRegisterWalkIn = async (e) => {
    e.preventDefault();

    if (!customerData.name || !customerData.contact_no || !customerData.plate_no || !customerData.vehicle_model) {
      alert('Please fill in required fields (Name, Contact, Plate No., Vehicle Model)');
      return;
    }

    try {
      // If we found an existing customer by plate lookup, use that customer ID
      if (foundExisting && foundExisting.id) {
        // Update customer info if needed
        await fetchJson(`${API_BASE}/customer/${foundExisting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerData)
        });
        
        alert(`✓ Existing customer ${foundExisting.name} selected`);
        resetForm();
        onSuccess({ ...customerData, id: foundExisting.id });
        return;
      }

      const attemptRegister = async (payload) => {
        return fetchJson(`${API_BASE}/customer/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      };

      const data = await attemptRegister(customerData);
      if (data && data.success) {
        alert(`✓ Walk-in customer #${data.customer_id} registered successfully`);
        const savedData = { ...customerData, id: data.customer_id };
        resetForm();
        onSuccess(savedData);
        return;
      }

      if (data && data.status === 'warning') {
        const duplicates = data.duplicates || [];
        const preview = duplicates
          .slice(0, 3)
          .map((d) => `${d.name} (${d.contact_no || 'no contact'})`)
          .join('\n');

        const confirmCreate = window.confirm(
          `Similar customer found.\n\n${preview}${duplicates.length > 3 ? '\n...' : ''}\n\nDo you want to FORCE CREATE anyway?`
        );

        if (!confirmCreate) {
          return;
        }

        const forced = await attemptRegister({ ...customerData, force_create: true });
        if (forced && forced.success) {
          alert(`✓ Walk-in customer #${forced.customer_id} registered successfully`);
          const savedData = { ...customerData, id: forced.customer_id };
          resetForm();
          onSuccess(savedData);
          return;
        }

        alert(forced?.message || forced?.error || 'Force create failed');
        return;
      }

      alert(data?.message || data?.error || 'Registration failed');
    } catch (error) {
      console.error('Error registering customer:', error);
    }
  };

  const searchColumns = [
    { key: 'name', label: 'Name', render: (val) => <span className="font-medium">{val}</span> },
    { key: 'plate_no', label: 'Plate No.', render: (val) => <StatusBadge status="neutral">{val}</StatusBadge> },
    { key: 'contact_no', label: 'Contact' },
    { key: 'vehicle_model', label: 'Vehicle' },
    { 
        key: 'actions', 
        label: 'Action', 
        render: (_, row) => (
            <button className="btn-enterprise btn-sm btn-secondary" onClick={() => handleSelectCustomer(row)}>
                Select
            </button>
        ) 
    }
  ];

  return (
    <>
      {searchMode === 'search' && (
        <EnterpriseCard title="Customer Search" subtitle="Find existing customer or register new">
          <form onSubmit={handleSearch}>
            <div className="dashboard-grid dashboard-grid-2">
              <FormGroup label="Search By">
                <select name="search_type" className="form-input" required>
                  <option value="plate">Plate Number</option>
                  <option value="name">Name</option>
                  <option value="contact">Contact Number</option>
                </select>
              </FormGroup>

              <FormGroup label="Search Value">
                <input
                  type="text"
                  name="search_value"
                  className="form-input"
                  placeholder="Enter value to search"
                  required
                />
              </FormGroup>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-enterprise btn-primary">
                🔍 Search Customer
                </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-6">
              <h4 className="text-lg font-semibold mb-4">Search Results</h4>
              <EnterpriseTable columns={searchColumns} data={searchResults} />
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center">
            <button
              className="btn-enterprise btn-outline"
              onClick={() => setSearchMode('register')}
            >
              ➕ Register New Customer
            </button>
          </div>
        </EnterpriseCard>
      )} 
      
      {searchMode === 'existing' && (
        <EnterpriseCard title="Selected Customer" subtitle="Customer selected for service">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-6 flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <div>
                    <div className="font-bold text-green-900">{selectedCustomer?.name}</div>
                    <div className="text-green-700">{selectedCustomer?.plate_no} • {selectedCustomer?.vehicle_model}</div>
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                <button
                    className="btn-enterprise btn-secondary"
                    onClick={() => {
                        setSearchMode('search');
                        setSelectedCustomer(null);
                        setSearchResults([]);
                    }}
                >
                    ← Back to Search
                </button>
                <button
                    className="btn-enterprise btn-primary"
                    onClick={() => onSuccess(selectedCustomer)}
                >
                    Proceed to Check-In →
                </button>
            </div>
        </EnterpriseCard>
      )}
      
      {searchMode === 'register' && (
        <EnterpriseCard title="New Customer Registration" subtitle="Create record for new walk-in customer">
          <form onSubmit={handleRegisterWalkIn}>
            <div className="dashboard-grid dashboard-grid-2">
              <FormGroup label="Full Name" required>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="Customer name"
                  required
                />
              </FormGroup>

              <FormGroup label="Contact Number" required>
                <input
                  type="tel"
                  className="form-input"
                  value={customerData.contact_no}
                  onChange={(e) => setCustomerData({...customerData, contact_no: e.target.value})}
                  placeholder="09XX-XXX-XXXX"
                  required
                />
              </FormGroup>

              <FormGroup label="Plate Number" required>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={customerData.plate_no}
                    onChange={handlePlateChange}
                    placeholder="ABC-1234 (auto-lookup)"
                    required
                    style={{ 
                      borderColor: foundExisting ? '#22c55e' : undefined,
                      paddingRight: plateLoading ? '40px' : undefined
                    }}
                  />
                  {plateLoading && (
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>⏳</span>
                  )}
                </div>
                {foundExisting && (
                  <div style={{ marginTop: '4px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '6px', fontSize: '12px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Found:</span>{' '}
                    <span style={{ color: '#166534' }}>{foundExisting.name} • {foundExisting.contact_no}</span>
                  </div>
                )}
              </FormGroup>

              <FormGroup label="Vehicle Model" required>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.vehicle_model}
                  onChange={(e) => setCustomerData({...customerData, vehicle_model: e.target.value})}
                  placeholder="e.g., Toyota Camry"
                  required
                />
              </FormGroup>

              <FormGroup label="Vehicle Year">
                <input
                  type="number"
                  className="form-input"
                  value={customerData.vehicle_year}
                  onChange={(e) => setCustomerData({ ...customerData, vehicle_year: Number(e.target.value) })}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                />
              </FormGroup>

              <FormGroup label="Email">
                <input
                  type="email"
                  className="form-input"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </FormGroup>

              <FormGroup label="Engine Number">
                <input
                  type="text"
                  className="form-input"
                  value={customerData.engine_no}
                  onChange={(e) => setCustomerData({...customerData, engine_no: e.target.value})}
                  placeholder="Engine No."
                />
              </FormGroup>

              <FormGroup label="Chassis Number">
                <input
                  type="text"
                  className="form-input"
                  value={customerData.chassis_no}
                  onChange={(e) => setCustomerData({...customerData, chassis_no: e.target.value})}
                  placeholder="Chassis No."
                />
              </FormGroup>

              <FormGroup label="Address">
                <input
                  type="text"
                  className="form-input"
                  value={customerData.address}
                  onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                  placeholder="Street address"
                />
              </FormGroup>

              <FormGroup label="City">
                <input
                  type="text"
                  className="form-input"
                  value={customerData.city}
                  onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                  placeholder="City"
                />
              </FormGroup>
            </div>

            <div className="flex gap-4 mt-6">
              <button type="submit" className="btn-enterprise btn-primary">
                Register Customer
              </button>
              <button
                type="button"
                className="btn-enterprise btn-secondary"
                onClick={() => setSearchMode('search')}
              >
                Cancel
              </button>
            </div>
          </form>
        </EnterpriseCard>
      )}
    </>
  );
}
