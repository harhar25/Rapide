import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../styles/service-advisor-dashboard.css';
import '../styles/enterprise-ui.css';
import '../styles/dashboard-common.css';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';
import { 
  StatCard, 
  EnterpriseCard, 
  StatusBadge, 
  LoadingSpinner, 
  EmptyState,
  ModuleLayout,
  EnterpriseButton,
  EnterpriseFormGroup
} from '../components/EnterpriseComponents';
import WalkInRegistration from '../components/WalkInRegistration';
import AnvilJobOrderForm from '../components/AnvilJobOrderForm';
import AnvilPicklist from '../components/AnvilPicklist';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';
import VehicleHandoverDashboard from './VehicleHandoverDashboard';

// --- SUB-COMPONENTS FOR CLEANER CODE ---

const QueueItem = ({ item, isSelected, onClick }) => {
    const isAppt = item.type === 'appointment';
    return (
        <div 
            onClick={() => onClick(item)}
            style={{
                padding: '16px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: isSelected ? '#f8fafc' : 'white',
                borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            className="hover:bg-gray-50"
        >
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                <span style={{fontWeight: 600, color: '#1e293b'}}>{isAppt ? `Appt #${item.id}` : `SO-${String(item.id).padStart(5,'0')}`}</span>
                <span style={{fontSize:'0.75rem', color: isAppt ? '#f59e0b' : '#3b82f6', background: isAppt ? '#fef3c7' : '#dbeafe', padding:'2px 6px', borderRadius:'4px'}}>
                    {item.status || 'Pending'}
                </span>
            </div>
            <div style={{fontSize:'0.9rem', color:'#334155', marginBottom:'2px'}}>{item.customer_name || item.name}</div>
            <div style={{fontSize:'0.8rem', color:'#64748b'}}>
                {item.vehicle || `${item.vehicle_model} ${item.plate_no}`}
            </div>
        </div>
    );
};

const ServiceAdvisorDashboard = ({ user, onLogout }) => {
  // --- STATE ---
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Data Buckets
  const [appointments, setAppointments] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [readyForBilling, setReadyForBilling] = useState([]); // Jobs returned from Job Controller
  
  // Selection & UI State
  const [selectedTicket, setSelectedTicket] = useState(null); // The unified object (appointment or SO)
  const [activeStep, setActiveStep] = useState(1); // 1: Check-in, 2: Inspection (CIS/VRC), 3: Docs, 4: Billing
  
  // Modals
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printDocType, setPrintDocType] = useState(null);
  const [invoiceData, setInvoiceData] = useState(null);
  const [qrModal, setQrModal] = useState(null); // { plateNumber, serviceOrderId }
  const [localIp, setLocalIp] = useState(null); // For QR code URL

  // Forms
  const [cisForm, setCisForm] = useState({});
  const [vrcForm, setVrcForm] = useState({
        mileage_in: '',
        checklist_1_engine: 'na',
        checklist_2_fluids: 'na',
        checklist_3_brakes: 'na',
        checklist_4_suspension: 'na',
        checklist_5_battery: 'na',
        checklist_6_tires: 'na',
        checklist_7_lights: 'na',
        checklist_8_body: 'na',
        checklist_9_wipers: 'na',
        checklist_10_handbrake: 'na',
        additional_findings: ''
  });

  // Saved VRC Data (for viewing existing records)
  const [savedVRC, setSavedVRC] = useState(null);
  const [assignedTechnician, setAssignedTechnician] = useState(null);
  const [vrcLoading, setVrcLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [serviceCatalog, setServiceCatalog] = useState([]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    fetchData();
    loadServiceCatalog();
    const interval = setInterval(fetchData, 3000); // Live refresh every 3s
    return () => clearInterval(interval);
  }, []);

  // Fetch local IP for QR code
  useEffect(() => {
    const getIp = async () => {
      try {
        // Try Electron IPC first
        if (window.electronAPI?.getLocalIP) {
          const ip = await window.electronAPI.getLocalIP();
          if (ip && ip !== 'localhost') {
            setLocalIp(ip);
            return;
          }
        }
        // Fallback: use current hostname if it's an IP address
        const host = window.location.hostname;
        if (host && host !== 'localhost' && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
          setLocalIp(host);
          return;
        }
        // Last resort: hardcoded local network IP (update if network changes)
        setLocalIp('192.168.0.103');
      } catch (e) {
        console.error('Failed to get local IP:', e);
        setLocalIp('192.168.0.103');
      }
    };
    getIp();
  }, []);

  // --- REAL-TIME UPDATES ---
  const handleRealtimeUpdate = useCallback(() => {
    fetchData();
  }, []);

  // Subscribe to real-time updates
  useAutoRefresh(['service-advisor', 'job-controller', 'cro'], handleRealtimeUpdate);

  const loadServiceCatalog = async () => {
    try {
      const res = await fetchJson('/api/services/catalog');
      if (res.success) setServiceCatalog(res.data || []);
    } catch (e) { console.error('Failed to load service catalog:', e); }
  };

  const fetchData = async () => {
    try {
        const [apptRes, soRes, billingRes] = await Promise.all([
            fetchJson('/api/scheduler/check-availability'), // Pending appointments often overlap here or separate endpoint
            fetchJson('/api/service-advisor/orders'), // Your main endpoint
            fetchJson('/api/service-advisor/orders/ready-for-billing') // Jobs returned from Job Controller
        ]);

        if (soRes.success) setServiceOrders(soRes.data || []);
        if (billingRes.success) setReadyForBilling(billingRes.data || []);
        
        // Mocking appointments fetch if endpoint structure varies
        // For now, assuming appointments come from somewhere or using a placeholder
        // In real implementation: await fetchJson('/api/appointments/pending')
        const dummyAppts = apptRes.data?.appointments || []; 
        setAppointments(dummyAppts);
        
        if (!initialLoadDone) {
          setLoading(false);
          setInitialLoadDone(true);
        }
    } catch (err) {
        console.error("Dashboard Load Error:", err);
        if (!initialLoadDone) {
          setLoading(false);
          setInitialLoadDone(true);
        }
    }
  };

  // --- UNIFIED QUEUE LIST ---
  const queue = useMemo(() => {
      // Merge Appointments and Service Orders into one timeline
      // Add 'type' to distinguish
      const appts = appointments.map(a => ({...a, type: 'appointment', sortTime: a.scheduled_time}));
      const orders = serviceOrders.map(so => ({
          id: so[0],
          name: so[1], 
          contact: so[2],
          vehicle_model: so[3],
          plate_no: so[4],
          service_type: so[5],
          status: so[6],
          type: 'order',
          sortTime: so[7] 
      }));
      return [...appts, ...orders].sort((a,b) => new Date(b.sortTime) - new Date(a.sortTime));
  }, [appointments, serviceOrders]);

  // --- ACTIONS ---

  // Fetch saved VRC and technician info for a service order
  const fetchVRCData = async (serviceOrderId) => {
      if (!serviceOrderId || serviceOrderId === 'NEW') return;
      setVrcLoading(true);
      try {
          const res = await fetchJson(`/api/service-advisor/vrc/${serviceOrderId}`);
          if (res.success && res.data) {
              setSavedVRC(res.data.vrc);
              setAssignedTechnician(res.data.technician);
              setIsEditMode(false); // Start in view mode if VRC exists
          } else {
              setSavedVRC(null);
              setAssignedTechnician(null);
              setIsEditMode(true); // No VRC yet, show edit form
          }
      } catch (e) {
          console.error('Error fetching VRC:', e);
          setSavedVRC(null);
          setIsEditMode(true);
      }
      setVrcLoading(false);
  };

  const handleTicketSelect = (ticket) => {
      setSelectedTicket(ticket);
      // Reset VRC state
      setSavedVRC(null);
      setAssignedTechnician(null);
      setIsEditMode(false);
      
      // Determine step based on status
      if (ticket.type === 'appointment') {
          setActiveStep(1); // Check-in
          // Pre-fill CIS form
          setCisForm({
              name: ticket.name || ticket.customer_name,
              contact_no: ticket.contact,
              vehicle_model: ticket.vehicle_model,
              vehicle_plate_no: ticket.vehicle // API alias 'vehicle' is plate
          });
      } else {
          // If it's an order, it's likely past check-in
          setActiveStep(2); // Inspection/Docs
          // Load existing details into form if needed
          setCisForm({
              name: ticket.name,
              contact_no: ticket.contact,
              vehicle_model: ticket.vehicle_model,
              vehicle_plate_no: ticket.plate_no,
              service_type: ticket.service_type
          });
          // Fetch saved VRC data
          fetchVRCData(ticket.id);
      }
  };

  const handleWalkInSuccess = async (customer) => {
    // Immediate feedback UX
    const tempTicket = {
        id: 'NEW',
        type: 'order',
        name: customer.name,
        contact: customer.contact_no,
        vehicle_model: customer.vehicle_model,
        plate_no: customer.plate_no,
        status: 'new'
    };
    setSelectedTicket(tempTicket);
    setActiveStep(1);
    setCisForm({
        name: customer.name,
        contact_no: customer.contact_no,
        vehicle_plate_no: customer.plate_no,
        vehicle_model: customer.vehicle_model,
        email: customer.email,
        address: customer.address
    });
    setShowWalkInModal(false);
    
    // In background, actually create the order
    try {
        const payload = {
            customer_id: customer.id,
            scheduled_date: new Date().toISOString().split('T')[0],
            scheduled_time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            bay_id: null,
            technician_id: null,
            advisor_id: user?.id || 1,
            service_type: cisForm.service_type || 'Walk-In',
            created_by: user?.name || 'ServiceAdvisor'
        };
        const res = await fetchJson('/api/scheduler/create-order', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)});
        if(res.success) {
            fetchData(); // Refresh list to get real ID
        }
    } catch(e) { 
        alert("Background sync failed: " + e.message); 
    }
  };

  const handleSaveStep1 = async () => {
    // If we are in "Appointment" mode, we need to convert to "Service Order" (Check-In)
    if (selectedTicket && selectedTicket.type === 'appointment') {
        if (cisForm.isWarranty) {
            alert("⚠️ Usage Note: Warranty Claims will be routed to the Warranty Module after check-in.");
        }

        const payload = {
            scheduling_order_id: selectedTicket.id,
            advisor_id: user?.id || 1,
            is_warranty: cisForm.isWarranty ? 1 : 0
        };
        try {
            const res = await fetchJson('/api/service-advisor/check-in', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(payload)
            });
            if (res.success) {
                // Update local ticketing to point to new SO
                const newTicket = {
                    ...selectedTicket,
                    type: 'order',
                    id: res.service_order_id, // Important: use new SO ID
                    customer_id: res.details?.customer_id, // Carry over customer ID for VRC
                    status: 'pending'
                };
                setSelectedTicket(newTicket);
                console.log('[Check-In] New ticket created:', newTicket);
                
                // Show QR code modal for customer tracking
                setQrModal({
                  plateNumber: selectedTicket.plate_no || selectedTicket.plate_number,
                  serviceOrderId: res.service_order_id,
                  customerName: selectedTicket.customer_name || selectedTicket.name
                });
                
                setActiveStep(2);
                fetchData(); // Refresh queue
            } else {
                alert("Check-in Failed: " + res.error);
            }
        } catch(e) { alert("Error: " + e.message); }
    } else {
        // Already an order, just saving edits to CIS?
        // For now just proceed
        alert("Customer Info Confirmed.");
        setActiveStep(2);
    }
  };

  const handleSaveStep2 = async () => {
      if (!selectedTicket) return;
      
      // Validate: Must be a service order, not an appointment
      if (selectedTicket.type === 'appointment') {
          alert("⚠️ Please complete Check-In (Step 1) first to create a Service Order before saving VRC.");
          setActiveStep(1);
          return;
      }
      
      // Validate: Must have a valid service order ID
      const serviceOrderId = parseInt(selectedTicket.id, 10);
      if (!serviceOrderId || isNaN(serviceOrderId) || selectedTicket.id === 'NEW') {
          alert("⚠️ Invalid Service Order ID. Please refresh the page and select an order from the queue.");
          return;
      }
      
      console.log('[VRC Save] Service Order ID:', serviceOrderId, 'Ticket:', selectedTicket);
      
      const payload = {
          service_order_id: serviceOrderId,
          customer_id: selectedTicket.customer_id ? parseInt(selectedTicket.customer_id, 10) : null, 
          ...vrcForm
      };
      
      console.log('[VRC Save] Payload:', payload);

      try {
          const res = await fetchJson('/api/service-advisor/vrc', {
             method: 'POST',
             headers: {'Content-Type': 'application/json'},
             body: JSON.stringify(payload)
          });
          
          if (res.success) {
            alert("VRC Inspection Saved Successfully.");
            // Refresh VRC data to show in view mode
            await fetchVRCData(serviceOrderId);
            setIsEditMode(false);
            setActiveStep(3);
          } else {
            alert("Failed to save VRC: " + (res.error || 'Unknown error'));
          }
      } catch (e) {
          alert("Network Error saving VRC: " + e.message);
      }
  };

  // --- RENDER ---
  return (
    <ModuleLayout title="Service Advisor Cockpit" user={user} onLogout={onLogout}>
      <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: '0', background: '#f8fafc', margin: '-24px' }}>
          
          {/* LEFT SIDEBAR: QUEUE */}
          <div style={{ width: '350px', background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                      <input className="enterprise-input" placeholder="Search plate, name..." style={{marginBottom:0}} />
                      <button className="btn-enterprise btn-secondary" style={{padding:'8px'}}>🔍</button>
                  </div>
                  <button 
                    onClick={() => setShowWalkInModal(true)}
                    className="btn-enterprise btn-primary" 
                    style={{width:'100%', justifyContent:'center'}}
                  >
                      + New Walk-In
                  </button>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto' }}>
                  {/* READY FOR BILLING - HIGH PRIORITY */}
                  {readyForBilling.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ padding: '10px 16px', background: '#22c55e', color: 'white', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        💰 READY FOR BILLING ({readyForBilling.length})
                      </div>
                      {readyForBilling.map((job, idx) => (
                        <div 
                          key={job.id}
                          onClick={() => {
                            // Create a compatible object for the queue
                            const billingItem = {
                              id: job.id,
                              name: job.customer_name,
                              contact: job.contact_no,
                              vehicle_model: job.vehicle_model,
                              plate_no: job.plate_no,
                              service_type: job.service_type,
                              status: 'ready-for-billing',
                              type: 'order',
                              labor_hours: job.total_labor_hours,
                              technician_name: job.technician_name
                            };
                            handleTicketSelect(billingItem);
                          }}
                          style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid #dcfce7',
                            backgroundColor: '#f0fdf4',
                            borderLeft: selectedTicket?.id === job.id ? '4px solid #22c55e' : '4px solid transparent',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: '#166534' }}>SO-{String(job.id).padStart(5, '0')}</span>
                            <span style={{ fontSize: '12px', background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              {job.total_labor_hours?.toFixed(1) || '0'}h Labor
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#1e293b', fontWeight: 500, marginBottom: '2px' }}>{job.customer_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{job.plate_no} • {job.technician_name || 'No Tech'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* REGULAR QUEUE */}
                  {queue.length === 0 && readyForBilling.length === 0 ? (
                      <div style={{padding:'32px', textAlign:'center', color:'#94a3b8'}}>No active tickets today</div>
                  ) : (
                      queue.map((item, idx) => (
                          <QueueItem 
                            key={idx} 
                            item={item} 
                            isSelected={selectedTicket && selectedTicket.id === item.id}
                            onClick={handleTicketSelect}
                          />
                      ))
                  )}
              </div>
          </div>

          {/* RIGHT WORKSPACE: CONTEXT */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {!selectedTicket ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748b' }}>
                      <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🏎️</div>
                      <h2>Select a ticket to begin</h2>
                      <p>Choose an appointment or active job from the left queue.</p>
                      
                      {/* Dashboard High Level Stats could go here */}
                      <div style={{display:'flex', gap:'24px', marginTop:'40px'}}>
                          <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', textAlign:'center', width:'150px'}}>
                              <div style={{fontSize:'2rem', fontWeight:'bold', color:'#3b82f6'}}>{appointments.length}</div>
                              <div style={{fontSize:'0.9rem'}}>Appointments</div>
                          </div>
                          <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', textAlign:'center', width:'150px'}}>
                               <div style={{fontSize:'2rem', fontWeight:'bold', color:'#22c55e'}}>{serviceOrders.length}</div>
                               <div style={{fontSize:'0.9rem'}}>In Service</div>
                          </div>
                          <div style={{background:'white', padding:'20px', borderRadius:'8px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)', textAlign:'center', width:'150px', border: readyForBilling.length > 0 ? '2px solid #22c55e' : 'none'}}>
                               <div style={{fontSize:'2rem', fontWeight:'bold', color:'#22c55e'}}>{readyForBilling.length}</div>
                               <div style={{fontSize:'0.9rem'}}>Ready Billing</div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <>
                      {/* HEADER */}
                      <div style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>
                                    {selectedTicket.plate_no || selectedTicket.vehicle_plate_no || 'NO PLATE'}
                                </h1>
                                <StatusBadge status={selectedTicket.status || 'pending'} />
                              </div>
                              <div style={{ color: '#64748b', marginTop: '4px' }}>
                                  {selectedTicket.name} • {selectedTicket.contact} • {selectedTicket.vehicle_model}
                              </div>
                          </div>
                          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                              <span style={{fontSize:'0.9rem', color:'#94a3b8'}}>ID: {selectedTicket.id}</span>
                              {selectedTicket.type === 'order' && (
                                  <button 
                                      onClick={() => setQrModal({
                                          plateNumber: selectedTicket.plate_no || selectedTicket.plate_number || cisForm.vehicle_plate_no,
                                          serviceOrderId: selectedTicket.id,
                                          customerName: selectedTicket.customer_name || selectedTicket.name || cisForm.name
                                      })}
                                      style={{
                                          padding:'6px 12px', 
                                          background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                                          color:'white', 
                                          border:'none', 
                                          borderRadius:'6px', 
                                          fontSize:'12px', 
                                          fontWeight:'600',
                                          cursor:'pointer',
                                          display:'flex',
                                          alignItems:'center',
                                          gap:'4px'
                                      }}
                                  >
                                      📱 QR Code
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* WORKFLOW STEPPER */}
                      <div style={{ background: 'white', padding: '0 24px', borderBottom: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', gap: '40px' }}>
                              {['Check-In', 'Inspection', 'Documents', 'Handover'].map((step, idx) => {
                                  const stepNum = idx + 1;
                                  const isActive = activeStep === stepNum;
                                  const isPast = activeStep > stepNum;
                                  return (
                                      <div 
                                        key={step}
                                        onClick={() => setActiveStep(stepNum)}
                                        style={{
                                            padding: '16px 0',
                                            cursor: 'pointer',
                                            borderBottom: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                                            color: isActive ? '#3b82f6' : isPast ? '#1e293b' : '#94a3b8',
                                            fontWeight: isActive ? 600 : 500
                                        }}
                                      >
                                          <span style={{marginRight:'8px', fontSize:'0.8rem', border: `1px solid ${isActive || isPast ? 'currentColor' : '#cbd5e1'}`, borderRadius:'50%', width:'20px', height:'20px', display:'inline-flex', alignItems:'center', justifyContent:'center'}}>
                                              {stepNum}
                                          </span>
                                          {step}
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      {/* WORKSPACE CONTENT */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                          
                          {/* STEP 1: CHECK-IN */}
                          {activeStep === 1 && (
                              <EnterpriseCard title="Arrival & Customer Information">
                                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                                      <EnterpriseFormGroup label="Customer Name">
                                          <input className="enterprise-input" value={cisForm.name || ''} onChange={e => setCisForm({...cisForm, name: e.target.value})} />
                                      </EnterpriseFormGroup>
                                      <EnterpriseFormGroup label="Contact Number">
                                          <input className="enterprise-input" value={cisForm.contact_no || ''} onChange={e => setCisForm({...cisForm, contact_no: e.target.value})} />
                                      </EnterpriseFormGroup>
                                      <EnterpriseFormGroup label="Vehicle Model">
                                          <input className="enterprise-input" value={cisForm.vehicle_model || ''} onChange={e => setCisForm({...cisForm, vehicle_model: e.target.value})} />
                                      </EnterpriseFormGroup>
                                      <EnterpriseFormGroup label="Plate Number">
                                          <input className="enterprise-input" value={cisForm.vehicle_plate_no || ''} onChange={e => setCisForm({...cisForm, vehicle_plate_no: e.target.value})} />
                                      </EnterpriseFormGroup>
                                  </div>

                                  <div style={{marginTop:'16px'}}>
                                      <EnterpriseFormGroup label="Service Type">
                                          <select 
                                            className="enterprise-select" 
                                            value={cisForm.service_type || selectedTicket?.service_type || ''}
                                            onChange={e => {
                                              setCisForm({...cisForm, service_type: e.target.value});
                                              // Also update the selectedTicket so it flows downstream
                                              if (selectedTicket) {
                                                setSelectedTicket({...selectedTicket, service_type: e.target.value});
                                              }
                                            }}
                                            style={{width:'100%'}}
                                          >
                                            <option value="">-- Select Service --</option>
                                            {(() => {
                                              const grouped = {};
                                              (serviceCatalog || []).filter(s => s.status === 'active').forEach(s => {
                                                const cat = s.category || 'General';
                                                if (!grouped[cat]) grouped[cat] = [];
                                                grouped[cat].push(s);
                                              });
                                              return Object.entries(grouped).map(([cat, items]) => (
                                                <optgroup key={cat} label={cat}>
                                                  {items.map(s => (
                                                    <option key={s.id} value={s.service_name}>{s.service_name} — ₱{Number(s.base_price || 0).toLocaleString()}</option>
                                                  ))}
                                                </optgroup>
                                              ));
                                            })()}
                                            {(!serviceCatalog || serviceCatalog.length === 0) && (
                                              <>
                                                <option value="PMS">PMS</option>
                                                <option value="General Repair">General Repair</option>
                                                <option value="Walk-In">Walk-In</option>
                                              </>
                                            )}
                                          </select>
                                      </EnterpriseFormGroup>
                                  </div>

                                  <div style={{marginTop:'16px'}}>
                                      <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                                          <input 
                                              type="checkbox" 
                                              checked={cisForm.isWarranty || false}
                                              onChange={(e) => setCisForm({...cisForm, isWarranty: e.target.checked})}
                                              style={{width:'18px', height:'18px'}}
                                          />
                                          <span style={{color:'#d9534f', fontWeight:700}}>
                                              Warranty Claim / Return
                                          </span>
                                      </label>
                                  </div>

                                  <div style={{marginTop:'24px', display:'flex', justifyContent:'flex-end'}}>
                                      <EnterpriseButton onClick={handleSaveStep1}>
                                        {selectedTicket?.type === 'appointment' 
                                            ? '🕒 Confirm Arrival (Time In) & Proceed →' 
                                            : 'Save Customer Info & Proceed →'}
                                      </EnterpriseButton>
                                  </div>
                              </EnterpriseCard>
                          )}

                          {/* STEP 2: INSPECTION (VRC) */}
                          {activeStep === 2 && (
                              <>
                                  {/* Loading state */}
                                  {vrcLoading && (
                                      <div style={{padding:'40px', textAlign:'center'}}>
                                          <LoadingSpinner />
                                          <p style={{marginTop:'16px', color:'#64748b'}}>Loading VRC data...</p>
                                      </div>
                                  )}

                                  {/* VIEW MODE: Show saved VRC data */}
                                  {!vrcLoading && savedVRC && !isEditMode && (
                                      <div>
                                          {/* Technician Assignment Info */}
                                          {assignedTechnician && (
                                              <div style={{background:'#dbeafe', border:'1px solid #3b82f6', borderRadius:'8px', padding:'16px', marginBottom:'20px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                  <div>
                                                      <span style={{fontWeight:600, color:'#1e40af'}}>Assigned Technician: </span>
                                                      <span style={{color:'#1e3a8a'}}>{assignedTechnician.name}</span>
                                                      <span style={{marginLeft:'16px', padding:'4px 8px', borderRadius:'4px', fontSize:'0.8rem', background: assignedTechnician.status === 'completed' ? '#dcfce7' : assignedTechnician.status === 'in-progress' ? '#fef3c7' : '#f1f5f9', color: assignedTechnician.status === 'completed' ? '#166534' : assignedTechnician.status === 'in-progress' ? '#92400e' : '#475569'}}>
                                                          {assignedTechnician.status || 'assigned'}
                                                      </span>
                                                  </div>
                                              </div>
                                          )}

                                          <EnterpriseCard title="Vehicle Report Card (VRC) - Saved Record">
                                              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingBottom:'16px', borderBottom:'1px solid #e2e8f0'}}>
                                                  <div>
                                                      <span style={{fontWeight:600, color:'#475569'}}>Mileage at Check-in: </span>
                                                      <span style={{fontSize:'1.25rem', fontWeight:700, color:'#1e293b'}}>{savedVRC.mileage_in || 'N/A'} km</span>
                                                  </div>
                                                  <div>
                                                      <span style={{fontSize:'0.85rem', color:'#64748b'}}>Inspected: {savedVRC.created_at ? new Date(savedVRC.created_at).toLocaleString() : 'N/A'}</span>
                                                  </div>
                                              </div>

                                              <h4 style={{margin:'0 0 16px 0', color:'#334155'}}>10-Point Checklist Results</h4>
                                              <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'12px'}}>
                                                  {[
                                                      { id: 'checklist_1_engine', label: '1. Engine' },
                                                      { id: 'checklist_2_fluids', label: '2. Fluids' },
                                                      { id: 'checklist_3_brakes', label: '3. Brakes' },
                                                      { id: 'checklist_4_suspension', label: '4. Suspension' },
                                                      { id: 'checklist_5_battery', label: '5. Battery' },
                                                      { id: 'checklist_6_tires', label: '6. Tires' },
                                                      { id: 'checklist_7_lights', label: '7. Lights' },
                                                      { id: 'checklist_8_body', label: '8. Body' },
                                                      { id: 'checklist_9_wipers', label: '9. Wipers' },
                                                      { id: 'checklist_10_handbrake', label: '10. Handbrake' }
                                                  ].map(item => {
                                                      const val = savedVRC[item.id] || 'na';
                                                      const statusStyle = val === 'pass' 
                                                          ? {bg: '#dcfce7', color: '#166534', icon: '✅'} 
                                                          : val === 'fail' 
                                                          ? {bg: '#fee2e2', color: '#991b1b', icon: '❌'} 
                                                          : {bg: '#f1f5f9', color: '#64748b', icon: '⚪'};
                                                      return (
                                                          <div key={item.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:statusStyle.bg, borderRadius:'8px'}}>
                                                              <span style={{fontWeight:500, color:'#334155'}}>{item.label}</span>
                                                              <span style={{fontWeight:600, color:statusStyle.color}}>{statusStyle.icon} {val.toUpperCase()}</span>
                                                          </div>
                                                      );
                                                  })}
                                              </div>

                                              {/* Additional findings */}
                                              {savedVRC.additional_findings && (
                                                  <div style={{marginTop:'20px', padding:'16px', background:'#fffbeb', borderRadius:'8px', border:'1px solid #fbbf24'}}>
                                                      <h5 style={{margin:'0 0 8px 0', color:'#92400e'}}>Additional Findings</h5>
                                                      <p style={{margin:0, color:'#78350f'}}>{savedVRC.additional_findings}</p>
                                                  </div>
                                              )}

                                              {/* Exterior/Interior condition */}
                                              <div style={{marginTop:'20px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px'}}>
                                                  <div style={{padding:'16px', background:'#f8fafc', borderRadius:'8px'}}>
                                                      <h5 style={{margin:'0 0 8px 0', color:'#475569'}}>Exterior Condition</h5>
                                                      <p style={{margin:0, color:'#1e293b'}}>{savedVRC.exterior_condition || 'Not recorded'}</p>
                                                  </div>
                                                  <div style={{padding:'16px', background:'#f8fafc', borderRadius:'8px'}}>
                                                      <h5 style={{margin:'0 0 8px 0', color:'#475569'}}>Interior Condition</h5>
                                                      <p style={{margin:0, color:'#1e293b'}}>{savedVRC.interior_condition || 'Not recorded'}</p>
                                                  </div>
                                              </div>

                                              <div style={{marginTop:'24px', display:'flex', justifyContent:'space-between'}}>
                                                  <button className="btn-enterprise btn-secondary" onClick={() => setActiveStep(1)}>← Back</button>
                                                  <div style={{display:'flex', gap:'12px'}}>
                                                      <button className="btn-enterprise btn-secondary" onClick={() => setIsEditMode(true)}>Edit VRC</button>
                                                      <EnterpriseButton onClick={() => setActiveStep(3)}>Continue to Documents →</EnterpriseButton>
                                                  </div>
                                              </div>
                                          </EnterpriseCard>
                                      </div>
                                  )}

                                  {/* EDIT MODE: Show editable form */}
                                  {!vrcLoading && (!savedVRC || isEditMode) && (
                                      <EnterpriseCard title={savedVRC ? "Edit Vehicle Inspection" : "10-Point Vehicle Inspection (SOP 2.3)"}>
                                          {savedVRC && (
                                              <div style={{background:'#fef3c7', padding:'12px 16px', borderRadius:'8px', marginBottom:'20px', display:'flex', alignItems:'center', gap:'8px'}}>
                                                  <span>⚠️</span>
                                                  <span style={{color:'#92400e'}}>Editing existing VRC record. Changes will overwrite saved data.</span>
                                                  <button onClick={() => setIsEditMode(false)} style={{marginLeft:'auto', background:'none', border:'1px solid #d97706', borderRadius:'4px', padding:'4px 12px', cursor:'pointer', color:'#d97706'}}>Cancel Edit</button>
                                              </div>
                                          )}
                                          
                                          {/* Mileage Input */}
                                          <div style={{marginBottom:'24px', display:'flex', gap:'16px'}}>
                                                <div style={{flex:1}}>
                                                    <label style={{display:'block', fontSize:'0.9rem', fontWeight:600, color:'#475569', marginBottom:'4px'}}>Current Mileage (km)</label>
                                                    <input 
                                                        type="number" 
                                                        className="enterprise-input" 
                                                        placeholder="e.g. 54000"
                                                        value={vrcForm.mileage_in || ''}
                                                        onChange={e => setVrcForm({...vrcForm, mileage_in: e.target.value})}
                                                    />
                                                </div>
                                                <div style={{flex:1}}>
                                                     {/* Spacer */}
                                                </div>
                                          </div>

                                          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'16px'}}>
                                              {[
                                                  { id: 'checklist_1_engine', label: '1. Engine (Oil level/leak/noise)' },
                                                  { id: 'checklist_2_fluids', label: '2. Fluids (Coolant/Brake/Verify)' },
                                                  { id: 'checklist_3_brakes', label: '3. Brakes (Pad/Disc/Hose)' },
                                                  { id: 'checklist_4_suspension', label: '4. Suspension (Underchassis)' },
                                                  { id: 'checklist_5_battery', label: '5. Battery (Health/Terminals)' },
                                                  { id: 'checklist_6_tires', label: '6. Tires (Pressure/Thread)' },
                                                  { id: 'checklist_7_lights', label: '7. Lights (Head/Tail/Signal)' },
                                                  { id: 'checklist_8_body', label: '8. Body (Scratches/Dents)' },
                                                  { id: 'checklist_9_wipers', label: '9. Wipers (Blade/Washer)' },
                                                  { id: 'checklist_10_handbrake', label: '10. Handbrake (High/Low)' }
                                              ].map(item => (
                                                  <label key={item.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px', background:'white', border:'1px solid #e2e8f0', borderRadius:'8px'}}>
                                                      <span style={{fontWeight:500, color:'#334155'}}>{item.label}</span>
                                                      <select 
                                                        className="enterprise-select" 
                                                        style={{width:'140px', padding:'6px'}}
                                                        value={vrcForm[item.id] || 'na'}
                                                        onChange={(e) => setVrcForm({...vrcForm, [item.id]: e.target.value})}
                                                      >
                                                          <option value="pass">✅ Pass</option>
                                                          <option value="fail">❌ Fail</option>
                                                          <option value="na">⚪ N/A</option>
                                                      </select>
                                                  </label>
                                              ))}
                                          </div>
                                          
                                          <div style={{marginTop:'24px'}}>
                                              <label style={{display:'block', marginBottom:'8px', fontWeight:500, color:'#475569'}}>Additional Findings / Technician Notes</label>
                                              <textarea 
                                                className="enterprise-textarea" 
                                                rows="3" 
                                                value={vrcForm.additional_findings || ''}
                                                onChange={(e) => setVrcForm({...vrcForm, additional_findings: e.target.value})}
                                                placeholder="Note any specific failures found..."
                                              />
                                          </div>

                                          <div style={{marginTop:'16px'}}>
                                            <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={vrcForm.settings_restored || false}
                                                    onChange={(e) => setVrcForm({...vrcForm, settings_restored: e.target.checked})}
                                                    style={{width:'16px', height:'16px'}}
                                                />
                                                <span style={{color:'#334155', fontWeight:500}}>
                                                    Confirm all vehicle settings restored to customer defaults
                                                </span>
                                            </label>
                                          </div>

                                          <div style={{marginTop:'24px', display:'flex', justifyContent:'space-between'}}>
                                                <button className="btn-enterprise btn-secondary" onClick={() => setActiveStep(1)}>← Back</button>
                                                <EnterpriseButton onClick={handleSaveStep2}>Save Report & Continue →</EnterpriseButton>
                                          </div>
                                      </EnterpriseCard>
                                  )}
                              </>
                          )}

                          {/* STEP 3: DOCUMENTS */}
                          {activeStep === 3 && (
                              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'24px'}}>
                                  <div onClick={() => { setPrintDocType('SO'); setShowPrintModal(true); }}
                                       className="hover:shadow-lg" 
                                       style={{background:'white', padding:'32px', borderRadius:'12px', border:'1px solid #e2e8f0', textAlign:'center', cursor:'pointer', transition:'all 0.2s'}}>
                                      <div style={{fontSize:'3rem', marginBottom:'16px'}}>📄</div>
                                      <h3>Service Order</h3>
                                      <p style={{color:'#64748b'}}>Official Request Form</p>
                                  </div>
                                  
                                  <div onClick={() => { setPrintDocType('Picklist'); setShowPrintModal(true); }}
                                       className="hover:shadow-lg"
                                       style={{background:'white', padding:'32px', borderRadius:'12px', border:'1px solid #e2e8f0', textAlign:'center', cursor:'pointer', transition:'all 0.2s'}}>
                                      <div style={{fontSize:'3rem', marginBottom:'16px'}}>📦</div>
                                      <h3>Parts Picklist</h3>
                                      <p style={{color:'#64748b'}}>For Technician/Warehouse</p>
                                  </div>

                                  <div onClick={() => { setPrintDocType('Confirmation'); setShowPrintModal(true); }}
                                       className="hover:shadow-lg"
                                       style={{background:'white', padding:'32px', borderRadius:'12px', border:'1px solid #e2e8f0', textAlign:'center', cursor:'pointer', transition:'all 0.2s'}}>
                                      <div style={{fontSize:'3rem', marginBottom:'16px'}}>✅</div>
                                      <h3>Service Confirmation</h3>
                                      <p style={{color:'#64748b'}}>Customer Copy</p>
                                  </div>

                                  {/* QR Code for Customer Tracking */}
                                  {selectedTicket?.type === 'order' && (
                                      <div onClick={() => { 
                                          setQrModal({
                                              plateNumber: selectedTicket.plate_no || selectedTicket.plate_number || cisForm.vehicle_plate_no,
                                              serviceOrderId: selectedTicket.id,
                                              customerName: selectedTicket.customer_name || selectedTicket.name || cisForm.name
                                          });
                                      }}
                                           className="hover:shadow-lg"
                                           style={{background:'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding:'32px', borderRadius:'12px', border:'1px solid #86efac', textAlign:'center', cursor:'pointer', transition:'all 0.2s'}}>
                                          <div style={{fontSize:'3rem', marginBottom:'16px'}}>📱</div>
                                          <h3 style={{color:'#166534'}}>Tracking QR Code</h3>
                                          <p style={{color:'#22c55e'}}>For Customer to Track Status</p>
                                      </div>
                                  )}
                              </div>
                          )}

                          {/* STEP 4: HANDOVER */}
                          {activeStep === 4 && (
                              <div style={{ height: '100%', overflow: 'hidden' }}>
                                <VehicleHandoverDashboard user={user} embedded={true} />
                              </div>
                          )}

                      </div>
                  </>
              )}
          </div>
      </div>

      {/* MODALS */}
      {showWalkInModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{background:'white', width:'800px', maxHeight:'90vh', overflowY:'auto', borderRadius:'12px', position:'relative', padding:'24px'}}>
                  <button onClick={() => setShowWalkInModal(false)} style={{position:'absolute', top:'16px', right:'16px', fontSize:'1.5rem', background:'none', border:'none', cursor:'pointer'}}>×</button>
                  <h2 style={{marginTop:0}}>New Walk-In Registration</h2>
                  <WalkInRegistration onSuccess={handleWalkInSuccess} />
              </div>
          </div>
      )}

      {showPrintModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:110, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{background:'white', width:'900px', height:'90vh', borderRadius:'12px', padding:'24px', overflowY:'auto', position:'relative'}}>
                  <button onClick={() => setShowPrintModal(false)} style={{position:'absolute', top:'16px', right:'16px', fontSize:'1.5rem', background:'none', border:'none', cursor:'pointer'}}>×</button>
                  {printDocType === 'SO' || printDocType === 'Confirmation' ? (
                      <AnvilJobOrderForm 
                        jobOrder={[
                            selectedTicket ? selectedTicket.id : '0', 
                            cisForm.name || (selectedTicket && selectedTicket.name) || '', 
                            cisForm.contact_no || (selectedTicket && selectedTicket.contact) || '', 
                            cisForm.vehicle_model || (selectedTicket && selectedTicket.vehicle_model) || '',
                            cisForm.vehicle_plate_no || (selectedTicket && selectedTicket.plate_no) || '',
                            (selectedTicket && selectedTicket.service_type) || '',
                            '', '', '', ''
                        ]} 
                        onClose={() => setShowPrintModal(false)}
                        isConfirmation={printDocType === 'Confirmation'}
                      />
                  ) : printDocType === 'Picklist' ? (
                      <AnvilPicklist onClose={() => setShowPrintModal(false)} />
                  ) : printDocType === 'Billing' ? (
                      <InvoicePrintTemplate data={invoiceData} onClose={() => setShowPrintModal(false)} />
                  ) : (
                      <div style={{padding:'40px'}}>Template Not Found</div>
                  )}
              </div>
          </div>
      )}

      {/* QR CODE TRACKING MODAL */}
      {qrModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:120, display:'flex', justifyContent:'center', alignItems:'center'}}>
              <div style={{
                  background:'white', 
                  width:'400px', 
                  borderRadius:'20px', 
                  padding:'32px', 
                  textAlign:'center',
                  boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
              }}>
                  <div style={{fontSize:'48px', marginBottom:'8px'}}>✅</div>
                  <h2 style={{margin:'0 0 8px 0', color:'#1e3a5f', fontSize:'24px'}}>Check-In Successful!</h2>
                  <p style={{color:'#64748b', margin:'0 0 20px 0', fontSize:'14px'}}>
                      Service Order <strong>#{String(qrModal.serviceOrderId).padStart(5, '0')}</strong> created
                  </p>
                  
                  <div style={{
                      background:'#f8fafc', 
                      padding:'20px', 
                      borderRadius:'12px', 
                      marginBottom:'20px'
                  }}>
                      <div style={{fontSize:'14px', color:'#475569', marginBottom:'12px', fontWeight:'500'}}>
                          📱 Customer Tracking QR Code
                      </div>
                      {(() => {
                          const baseUrl = localIp ? `http://${localIp}:3000` : window.location.origin;
                          const trackUrl = `${baseUrl}/#/track?code=${qrModal.plateNumber || qrModal.serviceOrderId}`;
                          return (
                              <>
                                  <img 
                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(trackUrl)}`}
                                      alt="Tracking QR Code"
                                      style={{width:'180px', height:'180px', margin:'0 auto', display:'block'}}
                                  />
                                  <div style={{
                                      marginTop:'12px', 
                                      fontSize:'12px', 
                                      color:'#64748b',
                                      padding:'8px',
                                      background:'white',
                                      borderRadius:'6px',
                                      fontFamily:'monospace',
                                      wordBreak:'break-all'
                                  }}>
                                      {trackUrl}
                                  </div>
                              </>
                          );
                      })()}
                  </div>

                  <p style={{fontSize:'13px', color:'#6b7280', marginBottom:'20px', lineHeight:'1.5'}}>
                      Customer can scan this QR code to track their vehicle's service status in real-time, just like tracking a Shopee order! 📦
                  </p>

                  <div style={{display:'flex', gap:'12px'}}>
                      <button 
                          onClick={() => {
                              window.print();
                          }}
                          style={{
                              flex:1,
                              padding:'12px 16px',
                              background:'#f1f5f9',
                              color:'#475569',
                              border:'none',
                              borderRadius:'10px',
                              fontSize:'14px',
                              fontWeight:'500',
                              cursor:'pointer'
                          }}
                      >
                          🖨️ Print QR
                      </button>
                      <button 
                          onClick={() => {
                              setQrModal(null);
                              fetchData();
                          }}
                          style={{
                              flex:1,
                              padding:'12px 16px',
                              background:'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                              color:'white',
                              border:'none',
                              borderRadius:'10px',
                              fontSize:'14px',
                              fontWeight:'600',
                              cursor:'pointer'
                          }}
                      >
                          Continue →
                      </button>
                  </div>
              </div>
          </div>
      )}
    </ModuleLayout>
  );
};

export default ServiceAdvisorDashboard;
