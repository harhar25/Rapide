import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuthHeaders } from '../utils/fetchJson';
import '../styles/enterprise-ui.css';
import { LoadingSpinner } from '../components/EnterpriseComponents';
import ServiceDocumentBundle from '../components/ServiceDocumentBundle';

const API_BASE = 'https://rapide-api.rapideph.workers.dev';

export default function RecordDetailPage({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [showPrintBundle, setShowPrintBundle] = useState(false);

  useEffect(() => {
    fetchRecordDetails();
  }, [id]);

  const fetchRecordDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/records/service-orders/${id}/details`, { headers: getAuthHeaders() });
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
    setShowPrintBundle(true);
  };

  const handleBack = () => {
    navigate('/records');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}><LoadingSpinner /> Loading...</div>;
  if (!record) return <div style={{ padding: '20px', textAlign: 'center' }}>Record not found</div>;

  const { order, vrc, invoice, parts, work, qc_inspection, road_test, gatepass, handover } = record;
  const soNumber = String(order?.id || id).padStart(5, '0');

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

      {/* Print Bundle Modal */}
      {showPrintBundle && (
        <ServiceDocumentBundle
          serviceOrderId={id}
          onClose={() => setShowPrintBundle(false)}
        />
      )}

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
    </>
  );
}
