import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/enterprise-ui.css';
import { LoadingSpinner } from '../components/EnterpriseComponents';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

export default function RecordDetailPage({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);

  useEffect(() => {
    fetchRecordDetails();
  }, [id]);

  const fetchRecordDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/records/service-orders/${id}/details`);
      if (res.ok) {
        const data = await res.json();
        setRecord(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'decimal',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/records');
  };

  // --- RECEIPT COMPONENTS ---

  const ReceiptHeader = ({ title }) => (
    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
      <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px' }}>RAPIDE AUTO SERVICE</div>
      <div style={{ fontSize: '10px' }}>Professional Automotive Solutions</div>
      <div style={{ margin: '5px 0', borderBottom: '1px dashed #000' }}></div>
      <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '5px 0' }}>{title}</div>
      <div style={{ fontSize: '12px' }}>SO NO: {String(record?.order?.id || id).padStart(5, '0')}</div>
      <div style={{ fontSize: '10px' }}>{new Date().toLocaleString('en-PH')}</div>
      <div style={{ margin: '5px 0', borderBottom: '1px dashed #000' }}></div>
    </div>
  );

  const ReceiptRow = ({ label, value, bold = false }) => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      marginBottom: '4px',
      fontSize: '11px',
      fontWeight: bold ? 'bold' : 'normal'
    }}>
      <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: '60%' }}>{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '40%' }}>{value}</span>
    </div>
  );

  const ReceiptDivider = () => (
    <div style={{ borderBottom: '1px dashed #000', margin: '10px 0' }}></div>
  );

  const CutLine = () => (
    <div className="cut-line" style={{ 
      margin: '20px 0', 
      borderTop: '2px dashed #000', 
      position: 'relative',
      height: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <span style={{ 
        background: '#fff', 
        padding: '0 10px', 
        fontSize: '12px',
        position: 'absolute',
        top: '-10px'
      }}>✂ CUT HERE</span>
    </div>
  );

  const SectionTitle = ({ title }) => (
    <div style={{ 
      fontSize: '12px', 
      fontWeight: 'bold', 
      textTransform: 'uppercase', 
      borderBottom: '1px solid #000', 
      paddingBottom: '2px',
      marginBottom: '8px',
      marginTop: '10px'
    }}>
      {title}
    </div>
  );

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}><LoadingSpinner /> Loading...</div>;
  if (!record) return <div style={{ padding: '20px', textAlign: 'center' }}>Record not found</div>;

  const { order, vrc, invoice, parts, work, qc_inspection, road_test, gatepass, handover } = record;
  const soNumber = String(order?.id || id).padStart(5, '0');

  // Page Header Component for Screen
  const PageHeader = ({ title, pageNum }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: '16px',
      marginBottom: '20px',
      borderBottom: '3px solid #1e40af'
    }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af', letterSpacing: '0.5px' }}>
          RAPIDE AUTO SERVICE
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          Professional Automotive Solutions
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{title}</div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>SO #{soNumber}</div>
      </div>
    </div>
  );

  // Info Grid Component
  const InfoGrid = ({ items }) => (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '12px 24px',
      fontSize: '13px'
    }}>
      {items.map((item, idx) => (
        <div key={idx} style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <span style={{ color: '#64748b', fontWeight: '500' }}>{item.label}</span>
          <span style={{ color: '#1e293b', fontWeight: item.bold ? '700' : '500' }}>{item.value || '-'}</span>
        </div>
      ))}
    </div>
  );

  // Section Title Component
  const ScreenSectionTitle = ({ title, subtitle }) => (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '700', 
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>
      {subtitle && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{subtitle}</div>}
    </div>
  );

  // Check Status Badge
  const CheckBadge = ({ passed, label }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      background: passed ? '#f0fdf4' : passed === false ? '#fef2f2' : '#f8fafc',
      border: `1px solid ${passed ? '#86efac' : passed === false ? '#fca5a5' : '#e2e8f0'}`,
      borderRadius: '6px',
      fontSize: '12px'
    }}>
      <span style={{ color: '#374151' }}>{label}</span>
      <span style={{ 
        fontWeight: '700',
        color: passed ? '#16a34a' : passed === false ? '#dc2626' : '#9ca3af'
      }}>
        {passed === true ? '✓ OK' : passed === false ? '✗ FAIL' : 'N/A'}
      </span>
    </div>
  );

  return (
    <>
    {/* ==================================================================================== */}
    {/*                                   SCREEN VIEW (NORMAL UI)                            */}
    {/* ==================================================================================== */}
    <div className="screen-view" style={{ 
      minHeight: '100vh', 
      background: '#f8fafc', 
      padding: '40px',
    }}>
      {/* Top Header */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
        padding: '24px 32px',
        border: '1px solid #e2e8f0',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button 
             onClick={handleBack}
             style={{
               border: '1px solid #cbd5e1',
               background: '#fff',
               color: '#64748b',
               padding: '10px 16px',
               borderRadius: '4px',
               cursor: 'pointer',
               fontWeight: '600',
               fontSize: '13px',
               display: 'flex',
               alignItems: 'center',
               gap: '8px'
             }}
          >
             ← Back
          </button>
          <div>
             <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: '800', letterSpacing: '-0.5px' }}>Service Record #{soNumber}</h1>
             <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                Created on {formatDate(record?.order?.created_at)} • <span style={{ color: '#0f172a', fontWeight: '600' }}>{order?.status?.toUpperCase()}</span>
             </div>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          style={{
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          🖨️ Print Full Docket
        </button>
      </div>

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: '24px'
      }}>
        
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 1. Vehicle & Customer (Combined Docket) */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
               <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Client & Vehicle Profile
               </div>
               <div style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                     <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '600', marginBottom: '8px' }}>Customer</div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{order?.customer_name}</div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{order?.contact_no}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{order?.address || 'No address provided'}</div>
                     </div>
                     <div>
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#94a3b8', fontWeight: '600', marginBottom: '8px' }}>Vehicle</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a', letterSpacing: '-1px' }}>{order?.plate_no}</div>
                        <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>{order?.vehicle_model}</div>
                        <div style={{ 
                           display: 'inline-block', 
                           marginTop: '8px', 
                           padding: '4px 8px', 
                           background: '#f1f5f9', 
                           color: '#475569', 
                           borderRadius: '4px', 
                           fontSize: '11px', 
                           fontWeight: '600' 
                        }}>
                           {order?.service_type}
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Billing (Detailed Invoice Table) */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
               <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Record</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '4px', background: invoice?.status === 'paid' ? '#dcfce7' : '#fef3c7', color: invoice?.status === 'paid' ? '#166534' : '#92400e' }}>
                     {invoice?.status?.toUpperCase() || 'DRAFT'}
                  </span>
               </div>
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                     <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ textAlign: 'left', padding: '12px 20px', fontWeight: '600' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '12px', fontWeight: '600' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '12px 20px', fontWeight: '600' }}>Amount</th>
                     </tr>
                  </thead>
                  <tbody>
                     {/* Labor */}
                     <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '12px 20px', color: '#334155' }}>Labor Charges ({invoice?.labor_hours || 0} hrs)</td>
                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{formatMoney((invoice?.labor_hours || 0) * (invoice?.labor_rate || 0))}</td>
                     </tr>
                     {/* Parts */}
                     {parts?.map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                           <td style={{ padding: '12px 20px', color: '#334155' }}>
                              <div style={{ fontWeight: '500' }}>{p.part_name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>PN: {p.part_number || 'N/A'}</div>
                           </td>
                           <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{p.quantity}</td>
                           <td style={{ padding: '12px 20px', textAlign: 'right', color: '#0f172a', fontWeight: '500' }}>{formatMoney((p.price || 0) * (p.quantity || 1))}</td>
                        </tr>
                     ))}
                     {/* Discount Row */}
                     {invoice?.discount > 0 && (
                        <tr style={{ background: '#f0fdf4' }}>
                           <td style={{ padding: '12px 20px', color: '#166534', fontWeight: '500' }}>Applied Discount</td>
                           <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                           <td style={{ padding: '12px 20px', textAlign: 'right', color: '#166534', fontWeight: '600' }}>-{formatMoney(invoice.discount)}</td>
                        </tr>
                     )}
                  </tbody>
                  <tfoot>
                     <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                        <td colSpan="2" style={{ padding: '16px 20px', textAlign: 'right', fontSize: '14px', color: '#475569', fontWeight: '600' }}>Total Amount Due</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '18px', color: '#0f172a', fontWeight: '800' }}>{formatMoney(invoice?.total_amount || 0)}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* 3. VRC Status (Technical Card) */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
               <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Technical Inspection (VRC)
               </div>
               
               {/* Metrics */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '16px', borderRight: '1px solid #e2e8f0', textAlign: 'center' }}>
                     <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Mileage In</div>
                     <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', fontFamily: 'monospace' }}>{vrc?.mileage_in?.toLocaleString() || 0} <span style={{fontSize:'12px', fontWeight:'normal', color:'#64748b'}}>km</span></div>
                  </div>
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                     <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Fuel Level</div>
                     <div style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>{vrc?.fuel_level || 0}%</div>
                  </div>
               </div>

               {/* Checklist Table */}
               <div style={{ padding: '0' }}>
                  <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                     <tbody>
                        {[
                           { k: 'checklist_1_engine', l: 'Engine System' },
                           { k: 'checklist_2_fluids', l: 'Fluids & Oil' },
                           { k: 'checklist_3_brakes', l: 'Braking System' },
                           { k: 'checklist_4_suspension', l: 'Suspension' },
                           { k: 'checklist_5_battery', l: 'Battery Health' },
                           { k: 'checklist_6_tires', l: 'Tires & Wheels' },
                           { k: 'checklist_7_lights', l: 'Light Systems' },
                           { k: 'checklist_8_body', l: 'Body & Paint' },
                           { k: 'checklist_9_wipers', l: 'Wipers / Glass' },
                           { k: 'checklist_10_handbrake', l: 'Handbrake' },
                        ].map((item, i) => {
                           const status = vrc?.[item.k];
                           const isPass = status === 'pass';
                           const isFail = status === 'fail' || status === 'needs_attention';
                           return (
                              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                 <td style={{ padding: '10px 20px', color: '#334155', fontWeight: '500' }}>{i+1}. {item.l}</td>
                                 <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                                    {isPass ? (
                                       <span style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>OK</span>
                                    ) : isFail ? (
                                       <span style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>ATTENTION</span>
                                    ) : (
                                       <span style={{ fontSize: '11px', color: '#94a3b8' }}>-</span>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
               
               {vrc?.additional_findings && (
                  <div style={{ padding: '16px', background: '#fffbeb', borderTop: '1px solid #fef3c7' }}>
                     <div style={{ fontSize: '11px', fontWeight: '700', color: '#b45309', marginBottom: '4px', textTransform: 'uppercase' }}>Notes & Findings</div>
                     <div style={{ fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>{vrc.additional_findings}</div>
                  </div>
               )}
            </div>

            {/* 4. QC Inspection Status (Compact) */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
               <div style={{ background: '#f8fafc', padding: '12px 20px', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Quality Control
               </div>
               <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                     <div style={{ fontSize: '13px', color: '#64748b' }}>Final Inspection</div>
                     <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>Foreman: {qc_inspection?.foreman_name || 'Pending'}</div>
                  </div>
                  <div style={{ 
                     fontWeight: '700', 
                     fontSize: '14px',
                     padding: '6px 12px',
                     borderRadius: '4px',
                     background: qc_inspection?.overall_status === 'passed' ? '#166534' : '#f1f5f9',
                     color: qc_inspection?.overall_status === 'passed' ? '#fff' : '#64748b'
                  }}>
                     {qc_inspection?.overall_status === 'passed' ? 'PASSED QC' : 'PENDING'}
                  </div>
               </div>
            </div>

        </div>

      </div>
    </div>


    {/* ==================================================================================== */}
    {/*                                   PRINT VIEW (DOCUMENTS)                             */}
    {/* ==================================================================================== */}
      <div className="print-container" style={{ display: 'none' }}>
        
        {/* PAGE 1: CHECK-IN & ORDER INFO */}
        <div className="print-page">
          <PageHeader title="CHECK-IN RECORD" pageNum={1} />
          
          <ScreenSectionTitle title="Customer Information" />
          <InfoGrid items={[
            { label: 'Customer Name', value: order?.customer_name, bold: true },
            { label: 'Contact Number', value: order?.contact_no },
            { label: 'Address', value: order?.address || '-' },
            { label: 'Email', value: order?.email || '-' }
          ]} />

          <div style={{ height: '20px' }}></div>

          <ScreenSectionTitle title="Vehicle Information" />
          <InfoGrid items={[
            { label: 'Plate Number', value: order?.plate_no, bold: true },
            { label: 'Model', value: order?.vehicle_model },
            { label: 'Service Type', value: order?.service_type },
            { label: 'Status', value: order?.status?.toUpperCase() }
          ]} />

          <div style={{ height: '20px' }}></div>

          <ScreenSectionTitle title="Service Details" />
          <InfoGrid items={[
             { label: 'Check-In Time', value: formatDateTime(order?.check_in_time) },
             { label: 'Estimated Completion', value: formatDateTime(order?.estimated_completion_time) },
             { label: 'Technician', value: work?.technician_name || 'Unassigned' },
             { label: 'Notes', value: order?.customer_concern || '-' }
          ]} />

          <div style={{ marginTop: '50px', borderTop: '1px solid #000', paddingTop: '10px', width: '200px' }}>
            <div style={{ fontSize: '11px', textAlign: 'center' }}>Customer Signature</div>
          </div>
        </div>

        {/* PAGE 2: VRC */}
        <div className="print-page">
          <PageHeader title="VEHICLE RECEPTION CHECKLIST" pageNum={2} />
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
             <div style={{ flex: 1, border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px' }}>MILEAGE IN</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{vrc?.mileage_in?.toLocaleString() || 0} km</div>
             </div>
             <div style={{ flex: 1, border: '1px solid #000', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px' }}>FUEL LEVEL</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{vrc?.fuel_level || 0}%</div>
             </div>
          </div>

          <ScreenSectionTitle title="10-Point Inspection" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
            <div>1. Engine: <b>{vrc?.checklist_1_engine === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>2. Fluids: <b>{vrc?.checklist_2_fluids === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>3. Brakes: <b>{vrc?.checklist_3_brakes === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>4. Suspension: <b>{vrc?.checklist_4_suspension === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>5. Battery: <b>{vrc?.checklist_5_battery === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>6. Tires: <b>{vrc?.checklist_6_tires === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>7. Lights: <b>{vrc?.checklist_7_lights === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>8. Body: <b>{vrc?.checklist_8_body === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>9. Wipers: <b>{vrc?.checklist_9_wipers === 'pass' ? 'OK' : 'FAIL'}</b></div>
            <div>10. Handbrake: <b>{vrc?.checklist_10_handbrake === 'pass' ? 'OK' : 'FAIL'}</b></div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
             <div style={{ fontWeight: 'bold', fontSize: '12px' }}>Additional Findings:</div>
             <div style={{ border: '1px solid #ccc', padding: '10px', minHeight: '60px', marginTop: '5px', fontSize: '12px' }}>
               {vrc?.additional_findings || 'None'}
             </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
             <div style={{ fontSize: '12px' }}>Interior Condition: {vrc?.interior_condition || '-'}</div>
             <div style={{ fontSize: '12px' }}>Exterior Condition: {vrc?.exterior_condition || '-'}</div>
          </div>
        </div>

        {/* PAGE 3: BILLING */}
        <div className="print-page">
          <PageHeader title="INVOICE / BILLING" pageNum={3} />
          
          <ScreenSectionTitle title="Items Breakdown" />
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000' }}>
                <th style={{ textAlign: 'left', padding: '5px' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '5px' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Unit Price</th>
                <th style={{ textAlign: 'right', padding: '5px' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '5px', borderBottom: '1px solid #eee' }}>Labor ({invoice?.labor_hours || 0} hrs)</td>
                <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'center' }}>-</td>
                <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(invoice?.labor_rate || 0)}</td>
                <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney((invoice?.labor_hours || 0) * (invoice?.labor_rate || 0))}</td>
              </tr>
              {parts?.map((p, i) => (
                <tr key={i}>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee' }}>{p.part_name}</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{p.quantity}</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(p.price || 0)}</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney((p.price || 0) * (p.quantity || 1))}</td>
                </tr>
              ))}
              {invoice?.materials_cost > 0 && (
                 <tr>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee' }}>Consumables / Materials</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(invoice?.materials_cost || 0)}</td>
                  <td style={{ padding: '5px', borderBottom: '1px solid #eee', textAlign: 'right' }}>{formatMoney(invoice?.materials_cost || 0)}</td>
                 </tr>
              )}
            </tbody>
          </table>

          <div style={{ float: 'right', width: '250px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>{formatMoney((invoice?.total_amount || 0) + (invoice?.discount || 0))}</span>
             </div>
             {invoice?.discount > 0 && (
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#166534' }}>
                  <span>Discount:</span>
                  <span>-{formatMoney(invoice?.discount)}</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '2px solid #000', paddingTop: '5px', fontWeight: 'bold', fontSize: '16px' }}>
                <span>TOTAL:</span>
                <span>{formatMoney(invoice?.total_amount || 0)}</span>
             </div>
             <div style={{ textAlign: 'right', marginTop: '10px', fontStyle: 'italic', fontSize: '12px' }}>
                Status: {invoice?.status?.toUpperCase() || 'PENDING'}
             </div>
          </div>
        </div>

        {/* PAGE 4: GATEPASS */}
        {gatepass && (
          <div className="print-page">
            <PageHeader title="GATE PASS & RELEASE" pageNum={4} />
            
            <div style={{ border: '2px solid #000', padding: '20px', textAlign: 'center', marginBottom: '30px' }}>
               <div style={{ fontSize: '14px', letterSpacing: '2px' }}>GATE PASS NUMBER</div>
               <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>GP-{String(gatepass.id).padStart(5,'0')}</div>
               <div style={{ fontSize: '12px' }}>DATE: {formatDate(gatepass.created_at)}</div>
            </div>

            <ScreenSectionTitle title="Release Verification" />
            <InfoGrid items={[
              { label: 'QC Inspection', value: qc_inspection?.overall_status === 'passed' ? 'PASSED' : 'PENDING', bold: true },
              { label: 'Inspector', value: qc_inspection?.foreman_name || '-' },
              { label: 'Items Returned', value: handover?.all_items_returned ? 'YES' : 'NO' },
              { label: 'Released By', value: handover?.technician_name || '-' }
            ]} />
            
            <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', padding: '0 50px' }}>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px' }}>Security Guard / Releaser</div>
               </div>
               <div style={{ textAlign: 'center' }}>
                  <div style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '5px' }}>Customer Signature</div>
                  <div style={{ fontSize: '10px' }}>(Received in good condition)</div>
               </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        /* SCREEN STYLES (NO PRINT) */
        @media screen {
          .print-container {
             display: none !important;
          }
        }

        /* PRINT STYLES */
        @media print {
          @page {
            margin: 1cm;
            size: auto; /* Let printer decide (usually A4/Letter) */
          }
          
          /* Hide the screen view entirely */
          .screen-view, .no-print {
            display: none !important;
            height: 0;
            width: 0;
            overflow: hidden;
          }

          /* Reset body for full width usage */
          body, html, #root {
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
            font-size: 12pt;
            color: #000;
          }

          /* Show print container */
          .print-container {
            display: block !important;
            width: 100% !important;
          }

          /* Page Break Rules */
          .print-page {
            page-break-after: always;
            min-height: 90vh;
            position: relative;
          }
          
          .print-page:last-child {
            page-break-after: auto;
          }

          /* Clean Layout for Docs */
          .print-page * {
            visibility: visible;
            font-family: Arial, Helvetica, sans-serif !important; /* Document font, not monospace */
            color: #000 !important;
          }
          
          /* Remove background colors and shadows for print */
          * {
            background: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}</style>
    </>
  );
}
