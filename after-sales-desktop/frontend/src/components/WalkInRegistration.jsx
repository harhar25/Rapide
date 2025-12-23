import React, { useState } from 'react';
import { fetchJson } from '../utils/fetchJson';

const API_BASE = 'http://localhost:5000/api';

export default function WalkInRegistration({ onSuccess }) {
  const [searchMode, setSearchMode] = useState('search');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [customerData, setCustomerData] = useState({
    name: '',
    contact_no: '',
    plate_no: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    engine_no: '',
    chassis_no: '',
    address: '',
    city: ''
  });

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
        setCustomerData({
          name: '',
          contact_no: '',
          plate_no: '',
          vehicle_model: '',
          vehicle_year: new Date().getFullYear(),
          engine_no: '',
          chassis_no: '',
          address: '',
          city: ''
        });
        setSearchMode('search');
        onSuccess();
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
          setCustomerData({
            name: '',
            contact_no: '',
            plate_no: '',
            vehicle_model: '',
            vehicle_year: new Date().getFullYear(),
            engine_no: '',
            chassis_no: '',
            address: '',
            city: ''
          });
          setSearchMode('search');
          onSuccess();
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

  return (
    <div className="walkin-section">
      <h3>🚗 Walk-In Customer Registration</h3>

      {searchMode === 'search' ? (
        <div className="card">
          <div className="card-header">
            <h4>Step 1: Search Existing Customer</h4>
          </div>

          <form onSubmit={handleSearch}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Search By</label>
                <select name="search_type" className="form-select" required>
                  <option value="plate">Plate Number</option>
                  <option value="name">Name</option>
                  <option value="contact">Contact Number</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Search Value</label>
                <input
                  type="text"
                  name="search_value"
                  className="form-input"
                  placeholder="Enter value to search"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              🔍 Search Customer
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-20">
              <h4>Search Results</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Plate No.</th>
                    <th>Contact</th>
                    <th>Vehicle</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.plate_no}</td>
                      <td>{customer.contact_no}</td>
                      <td>{customer.vehicle_model}</td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleSelectCustomer(customer)}
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-20 text-center">
            <p style={{ marginBottom: '15px' }}>Or</p>
            <button
              className="btn btn-outline"
              onClick={() => setSearchMode('register')}
            >
              ➕ Register New Customer
            </button>
          </div>
        </div>
      ) : searchMode === 'existing' ? (
        <div className="card">
          <div className="alert alert-success">
            ✓ Customer selected: <strong>{selectedCustomer?.name}</strong>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setSearchMode('search');
              setSelectedCustomer(null);
              setSearchResults([]);
            }}
          >
            ← Back to Search
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h4>Customer Information Sheet (CIS) - New Customer</h4>
          </div>

          <form onSubmit={handleRegisterWalkIn}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.name}
                  onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                  placeholder="Customer name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={customerData.contact_no}
                  onChange={(e) => setCustomerData({...customerData, contact_no: e.target.value})}
                  placeholder="09XX-XXX-XXXX"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Plate Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.plate_no}
                  onChange={(e) => setCustomerData({...customerData, plate_no: e.target.value})}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Vehicle Model</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.vehicle_model}
                  onChange={(e) => setCustomerData({...customerData, vehicle_model: e.target.value})}
                  placeholder="e.g., Toyota Camry"
                  required
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Vehicle Year</label>
                <input
                  type="number"
                  className="form-input"
                  value={customerData.vehicle_year}
                  onChange={(e) => setCustomerData({...customerData, vehicle_year: e.target.value})}
                  min="1990"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                  placeholder="email@example.com"
                />
              </div>
            </div>

            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Engine Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.engine_no}
                  onChange={(e) => setCustomerData({...customerData, engine_no: e.target.value})}
                  placeholder="Engine No."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Chassis Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={customerData.chassis_no}
                  onChange={(e) => setCustomerData({...customerData, chassis_no: e.target.value})}
                  placeholder="Chassis No."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input
                type="text"
                className="form-input"
                value={customerData.address}
                onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
                placeholder="Street address"
              />
            </div>

            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                className="form-input"
                value={customerData.city}
                onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                placeholder="City"
              />
            </div>

            <div className="flex gap-10">
              <button type="submit" className="btn btn-success">
                ✓ Register Customer
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSearchMode('search')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
