import React, { useState, useEffect } from 'react';
import '../styles/warehouse-dashboard.css';
import { fetchJson } from '../utils/fetchJson';

const WarehouseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = React.useState('inventory');
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showInventoryForm, setShowInventoryForm] = useState(false);
  const [inventoryAction, setInventoryAction] = useState('in');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [productForm, setProductForm] = useState({
    product_code: '',
    product_name: '',
    category: '',
    unit_price: '',
    quantity_in_stock: '',
    reorder_level: 10,
    supplier: '',
    description: ''
  });

  const [inventoryForm, setInventoryForm] = useState({
    product_id: '',
    quantity: '',
    reference_no: '',
    reference_type: 'repair-job',
    notes: ''
  });

  const API_BASE = '/api/warehouse';

  /**
   * HELPER: Load product form data from selected product tuple
   * Tuple structure: (id, code, name, category, price, qty, reorder_level, supplier, description, status)
   * Indices:        (0,  1,    2,    3,        4,     5,   6,               7,        8,           9)
   */
  const loadProductForm = (product) => {
    setProductForm({
      product_code: product[1],
      product_name: product[2],
      category: product[3],
      unit_price: product[4],
      quantity_in_stock: product[5],
      reorder_level: product[6],
      supplier: product[7],
      description: product[8]
    });
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadSummary();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchJson(`${API_BASE}/products`);
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
    setLoading(false);
  };

  const loadSummary = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/summary`);
      if (data.success) {
        setSummary(data.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/inventory/history?limit=50`);
      if (data.success) {
        setHistory(data.data || []);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchJson(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          unit_price: productForm.unit_price === '' ? '' : parseFloat(productForm.unit_price),
          quantity_in_stock: productForm.quantity_in_stock === '' ? '' : parseInt(productForm.quantity_in_stock, 10),
          reorder_level: productForm.reorder_level === '' ? '' : parseInt(productForm.reorder_level, 10),
          created_by: user.name
        })
      });
      if (data.success) {
        loadProducts();
        setProductForm({
          product_code: '',
          product_name: '',
          category: '',
          unit_price: '',
          quantity_in_stock: '',
          reorder_level: 10,
          supplier: '',
          description: ''
        });
        setShowAddProduct(false);
      }
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    try {
      const data = await fetchJson(`${API_BASE}/products/${selectedProduct[0]}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm)
      });
      if (data.success) {
        loadProducts();
        setShowEditProduct(false);
        setSelectedProduct(null);
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleInventoryTransaction = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const endpoint = inventoryAction === 'in' ? '/inventory/add' : '/inventory/remove';
    try {
      if (!inventoryForm.quantity || parseInt(inventoryForm.quantity, 10) <= 0) {
        setErrorMessage('Quantity is required and must be greater than 0');
        return;
      }
      const data = await fetchJson(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...inventoryForm,
          product_id: inventoryForm.product_id === '' ? '' : parseInt(inventoryForm.product_id, 10),
          quantity: inventoryForm.quantity === '' ? '' : parseInt(inventoryForm.quantity, 10),
          created_by: user.name
        })
      });
      if (data.success) {
        loadProducts();
        loadSummary();
        loadHistory();  // Refresh history to show new transaction
        setInventoryForm({
          product_id: '',
          quantity: '',
          reference_no: '',
          reference_type: 'repair-job',
          notes: ''
        });
        setShowInventoryForm(false);
      } else {
        setErrorMessage(data.error || 'Failed to process transaction');
      }
    } catch (error) {
      console.error('Error processing transaction:', error);
      setErrorMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="warehouse-dashboard">
      <header className="wh-header">
        <div className="header-left">
          <h1>Warehouse Management</h1>
          <p>Welcome, {user.name}</p>
        </div>
        <button onClick={onLogout} className="logout-btn">Sign Out</button>
      </header>

      <div className="wh-content">
        {/* Summary Section */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <h3>{summary.total_products}</h3>
              <p>Total Products</p>
            </div>
            <div className="summary-card">
              <h3>{summary.total_quantity}</h3>
              <p>Total Quantity</p>
            </div>
            <div className="summary-card">
              <h3>₱{(summary.total_value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</h3>
              <p>Inventory Value</p>
            </div>
            <div className="summary-card alert">
              <h3>{summary.low_stock_count}</h3>
              <p>Low Stock Items</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
          >
            I/O History
          </button>
          <button 
            className={`tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            Products
          </button>
        </div>

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="tab-content">
            <div className="action-buttons">
              <button className="btn-primary" onClick={() => setShowInventoryForm(true)}>
                + Add/Remove Stock
              </button>
            </div>

            {showInventoryForm && (
              <form onSubmit={handleInventoryTransaction} className="form-modal">
                <h3>{inventoryAction === 'in' ? 'Add Stock' : 'Remove Stock'}</h3>
                {errorMessage && <div className="error-message">{errorMessage}</div>}
                <div className="form-group">
                  <label htmlFor="wh_inventory_action">Transaction Type</label>
                  <select id="wh_inventory_action" name="inventory_action" value={inventoryAction} onChange={(e) => setInventoryAction(e.target.value)}>
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="wh_inventory_product_id">Product</label>
                  <select 
                    id="wh_inventory_product_id"
                    name="product_id"
                    value={inventoryForm.product_id}
                    onChange={(e) => setInventoryForm({...inventoryForm, product_id: e.target.value})}
                    required
                  >
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p[0]} value={p[0]}>{p[2]} ({p[1]})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="wh_inventory_quantity">Quantity</label>
                  <input 
                    id="wh_inventory_quantity"
                    name="quantity"
                    type="number" 
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_inventory_reference_no">Reference No</label>
                  <input 
                    id="wh_inventory_reference_no"
                    name="reference_no"
                    type="text" 
                    value={inventoryForm.reference_no}
                    onChange={(e) => setInventoryForm({...inventoryForm, reference_no: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_inventory_reference_type">Reference Type</label>
                  <select 
                    id="wh_inventory_reference_type"
                    name="reference_type"
                    value={inventoryForm.reference_type}
                    onChange={(e) => setInventoryForm({...inventoryForm, reference_type: e.target.value})}
                  >
                    <option value="repair-job">Repair Job</option>
                    <option value="purchase">Purchase</option>
                    <option value="sale">Sale</option>
                    <option value="damage">Damage</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="wh_inventory_notes">Notes</label>
                  <textarea 
                    id="wh_inventory_notes"
                    name="notes"
                    value={inventoryForm.notes}
                    onChange={(e) => setInventoryForm({...inventoryForm, notes: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-success">Submit</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowInventoryForm(false)}>Cancel</button>
                </div>
              </form>
            )}

            <table className="products-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product[0]} className={product[5] <= product[6] ? 'low-stock' : ''}>
                    <td>{product[1]}</td>
                    <td>{product[2]}</td>
                    <td>{product[3]}</td>
                    <td>₱{product[4]}</td>
                    <td><strong>{product[5]}</strong></td>
                    <td>{product[6]}</td>
                    <td><span className={`status ${product[5] <= product[6] ? 'alert' : 'ok'}`}>
                      {product[5] <= product[6] ? 'Low' : 'Ok'}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* I/O History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            {history && history.length > 0 ? (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Previous</th>
                    <th>New</th>
                    <th>Reference</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(entry => (
                    <tr key={entry[0]}>
                      <td>{new Date(entry[11]).toLocaleDateString()}</td>
                      <td>{entry[2]}</td>
                      <td><span className={`badge ${entry[3]}`}>{entry[3].toUpperCase()}</span></td>
                      <td>{entry[4]}</td>
                      <td>{entry[5]}</td>
                      <td><strong>{entry[6]}</strong></td>
                      <td>{entry[7]}</td>
                      <td>{entry[9]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No inventory transactions recorded yet</p>
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="tab-content">
            <div className="action-buttons">
              <button className="btn-primary" onClick={() => {
                setShowAddProduct(true);
                setShowEditProduct(false);
              }}>
                + Add Product
              </button>
            </div>

            {showAddProduct && (
              <form onSubmit={handleAddProduct} className="form-modal">
                <h3>Add New Product</h3>
                <div className="form-group">
                  <label htmlFor="wh_product_code">Product Code</label>
                  <input 
                    id="wh_product_code"
                    name="product_code"
                    type="text" 
                    value={productForm.product_code}
                    onChange={(e) => setProductForm({...productForm, product_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_product_name">Product Name</label>
                  <input 
                    id="wh_product_name"
                    name="product_name"
                    type="text" 
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({...productForm, product_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_category">Category</label>
                  <input 
                    id="wh_category"
                    name="category"
                    type="text" 
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_unit_price">Unit Price</label>
                  <input 
                    id="wh_unit_price"
                    name="unit_price"
                    type="number" 
                    step="0.01"
                    value={productForm.unit_price}
                    onChange={(e) => setProductForm({...productForm, unit_price: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_quantity_in_stock">Quantity</label>
                  <input
                    id="wh_quantity_in_stock"
                    name="quantity_in_stock"
                    type="number"
                    min="0"
                    value={productForm.quantity_in_stock}
                    onChange={(e) => setProductForm({ ...productForm, quantity_in_stock: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_reorder_level">Reorder Level</label>
                  <input 
                    id="wh_reorder_level"
                    name="reorder_level"
                    type="number" 
                    value={productForm.reorder_level}
                    onChange={(e) => setProductForm({...productForm, reorder_level: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_supplier">Supplier</label>
                  <input 
                    id="wh_supplier"
                    name="supplier"
                    type="text" 
                    value={productForm.supplier}
                    onChange={(e) => setProductForm({...productForm, supplier: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_description">Description</label>
                  <textarea 
                    id="wh_description"
                    name="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-success">Save</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowAddProduct(false)}>Cancel</button>
                </div>
              </form>
            )}

            {showEditProduct && selectedProduct && (
              <form onSubmit={handleUpdateProduct} className="form-modal">
                <h3>Edit Product</h3>
                <div className="form-group">
                  <label htmlFor="wh_edit_product_code">Product Code</label>
                  <input 
                    id="wh_edit_product_code"
                    name="product_code"
                    type="text" 
                    value={productForm.product_code}
                    onChange={(e) => setProductForm({...productForm, product_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_product_name">Product Name</label>
                  <input 
                    id="wh_edit_product_name"
                    name="product_name"
                    type="text" 
                    value={productForm.product_name}
                    onChange={(e) => setProductForm({...productForm, product_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_category">Category</label>
                  <input 
                    id="wh_edit_category"
                    name="category"
                    type="text" 
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_unit_price">Unit Price</label>
                  <input 
                    id="wh_edit_unit_price"
                    name="unit_price"
                    type="number" 
                    step="0.01"
                    value={productForm.unit_price}
                    onChange={(e) => setProductForm({...productForm, unit_price: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_reorder_level">Reorder Level</label>
                  <input 
                    id="wh_edit_reorder_level"
                    name="reorder_level"
                    type="number" 
                    value={productForm.reorder_level}
                    onChange={(e) => setProductForm({...productForm, reorder_level: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_supplier">Supplier</label>
                  <input 
                    id="wh_edit_supplier"
                    name="supplier"
                    type="text" 
                    value={productForm.supplier}
                    onChange={(e) => setProductForm({...productForm, supplier: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="wh_edit_description">Description</label>
                  <textarea 
                    id="wh_edit_description"
                    name="description"
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-success">Update</button>
                  <button type="button" className="btn-cancel" onClick={() => setShowEditProduct(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="products-grid">
              {products.map(product => (
                <div key={product[0]} className="product-card">
                  <h4>{product[2]}</h4>
                  <p className="code">{product[1]}</p>
                  <p><strong>₱{product[4]}</strong></p>
                  <p>Category: {product[3]}</p>
                  <p>Stock: {product[5]}</p>
                  <button 
                    className="btn-small"
                    onClick={() => {
                      setSelectedProduct(product);
                      loadProductForm(product);  // Use reusable function instead of duplicating logic
                      setShowEditProduct(true);
                      setShowAddProduct(false);
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="wh-footer">
        <p>© 2025 <em>Rapide</em> Warehouse Management System</p>
      </footer>
    </div>
  );
};

export default WarehouseDashboard;
