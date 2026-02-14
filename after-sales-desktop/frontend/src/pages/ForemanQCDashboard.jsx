import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchJson } from '../utils/fetchJson';
import { useAutoRefresh } from '../hooks/useRealtimeUpdates';

// Hook to detect mobile viewport
const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);
  return isMobile;
};

/**
 * Foreman QC Dashboard - Complete Redesign
 * 
 * WORKFLOW:
 * 1. Job Controller clocks out technician → Job appears in "Awaiting QC"
 * 2. Foreman views original VRC (check-in condition)
 * 3. Foreman performs detailed inspection checklist
 * 4. If PASS → Signs off, moves to Job Wrapup
 * 5. If FAIL → Specifies failed items, sends back to technician for rework
 * 6. After rework → Re-inspect
 */

const ForemanQCDashboard = ({ user, onLogout }) => {
  const isMobile = useIsMobile();

  // Data states
  const [pendingJobs, setPendingJobs] = useState([]);
  const [activeInspections, setActiveInspections] = useState([]);
  const [summary, setSummary] = useState({ awaiting: 0, inProgress: 0, passed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // UI states
  const [activeView, setActiveView] = useState('pending'); // pending | inspecting | history
  const [selectedJob, setSelectedJob] = useState(null);
  const [vrcData, setVrcData] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Inspection form state
  const [inspectionMode, setInspectionMode] = useState(false);
  const [currentInspection, setCurrentInspection] = useState(null);
  const [inspectionChecklist, setInspectionChecklist] = useState({});
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [technicianName, setTechnicianName] = useState('');

  const API = '/api/foreman-qc';
  const printRef = useRef(null);

  // Print the QC form
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html><head><title>QC Inspection Report - SO #${currentInspection?.service_order_id || ''}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 24px; color: #1e293b; font-size: 13px; }
      .print-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
      .print-header h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
      .print-header p { font-size: 12px; color: #64748b; }
      .print-meta { display: flex; justify-content: space-between; margin-bottom: 20px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
      .print-meta div { font-size: 12px; }
      .print-meta strong { display: block; font-size: 13px; margin-top: 2px; }
      .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
      .checklist-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      .checklist-table th { background: #f1f5f9; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border: 1px solid #e2e8f0; }
      .checklist-table td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 12px; }
      .check-box { width: 16px; height: 16px; border: 2px solid #94a3b8; display: inline-block; text-align: center; line-height: 14px; font-weight: 700; font-size: 12px; }
      .check-box.checked { border-color: #16a34a; color: #16a34a; }
      .check-box.failed { border-color: #dc2626; color: #dc2626; }
      .vrc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 16px; }
      .vrc-item { display: flex; justify-content: space-between; padding: 4px 8px; background: #f8fafc; border-radius: 4px; font-size: 11px; }
      .notes-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; min-height: 60px; margin-bottom: 20px; font-size: 12px; }
      .signature-row { display: flex; justify-content: space-between; margin-top: 40px; }
      .signature-block { width: 45%; text-align: center; }
      .signature-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 6px; font-size: 12px; }
      .result-badge { display: inline-block; padding: 6px 20px; border-radius: 6px; font-weight: 700; font-size: 14px; }
      .result-pass { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
      .result-fail { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
      .result-pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
      @media print { body { padding: 12px; } }
    </style></head><body>`);
    // Header
    win.document.write(`<div class="print-header"><h1>RAPIDE AUTO SERVICE</h1><p>Quality Control Inspection Report</p></div>`);
    // Meta
    win.document.write(`<div class="print-meta">`);
    win.document.write(`<div>Service Order<strong>SO #${currentInspection?.service_order_id || 'N/A'}</strong></div>`);
    win.document.write(`<div>Date<strong>${new Date().toLocaleDateString()}</strong></div>`);
    win.document.write(`<div>Foreman<strong>${user?.name || 'N/A'}</strong></div>`);
    win.document.write(`<div>Technician<strong>${technicianName || 'N/A'}</strong></div>`);
    win.document.write(`</div>`);
    // VRC Reference
    if (vrcData) {
      win.document.write(`<div class="section-title">Vehicle Receiving Checklist (VRC) Reference</div>`);
      win.document.write(`<div style="margin-bottom:8px;font-size:12px">Mileage In: <strong>${vrcData.mileage_in || '---'}</strong> km | Mileage Out: <strong>${vrcData.mileage_out || '---'}</strong> km</div>`);
      win.document.write(`<div class="vrc-grid">`);
      const vrcItems = [{key:'checklist_1_engine',label:'Engine'},{key:'checklist_2_fluids',label:'Fluids'},{key:'checklist_3_brakes',label:'Brakes'},{key:'checklist_4_suspension',label:'Suspension'},{key:'checklist_5_battery',label:'Battery'},{key:'checklist_6_tires',label:'Tires'},{key:'checklist_7_lights',label:'Lights'},{key:'checklist_8_body',label:'Body'},{key:'checklist_9_wipers',label:'Wipers'},{key:'checklist_10_handbrake',label:'Handbrake'}];
      vrcItems.forEach(v => { win.document.write(`<div class="vrc-item"><span>${v.label}</span><strong>${(vrcData[v.key]||'N/A').toUpperCase()}</strong></div>`); });
      win.document.write(`</div>`);
      if (vrcData.additional_findings) win.document.write(`<div style="background:#fef3c7;padding:8px;border-radius:4px;font-size:12px;margin-bottom:12px"><strong>Issues at Check-in:</strong> ${vrcData.additional_findings}</div>`);
    }
    // QC Checklist table
    win.document.write(`<div class="section-title">QC Inspection Checklist</div>`);
    win.document.write(`<table class="checklist-table"><thead><tr><th style="width:30px">#</th><th>Inspection Item</th><th>Description</th><th style="width:60px;text-align:center">Pass</th><th style="width:60px;text-align:center">Fail</th></tr></thead><tbody>`);
    QC_CHECKLIST.forEach((item, i) => {
      const st = inspectionChecklist[item.id];
      win.document.write(`<tr><td>${i+1}</td><td><strong>${item.label}</strong></td><td>${item.description}</td>`);
      win.document.write(`<td style="text-align:center"><div class="check-box ${st==='pass'?'checked':''}"><span>${st==='pass'?'\u2713':''}</span></div></td>`);
      win.document.write(`<td style="text-align:center"><div class="check-box ${st==='fail'?'failed':''}"><span>${st==='fail'?'\u2717':''}</span></div></td></tr>`);
    });
    win.document.write(`</tbody></table>`);
    // Result
    const r = getInspectionResult();
    const resultClass = r.allChecked && !r.hasFailures ? 'result-pass' : r.hasFailures ? 'result-fail' : 'result-pending';
    const resultText = r.allChecked && !r.hasFailures ? 'PASSED' : r.hasFailures ? 'FAILED - REWORK REQUIRED' : 'PENDING';
    win.document.write(`<div style="text-align:center;margin:16px 0"><span class="result-badge ${resultClass}">${resultText}</span></div>`);
    // Notes
    win.document.write(`<div class="section-title">Inspection Notes</div><div class="notes-box">${inspectionNotes || '<em style="color:#94a3b8">No notes</em>'}</div>`);
    // Signatures
    win.document.write(`<div class="signature-row"><div class="signature-block"><div class="signature-line">Foreman: ${user?.name || '_______________'}</div></div><div class="signature-block"><div class="signature-line">Technician: ${technicianName || '_______________'}</div></div></div>`);
    win.document.write(`<div style="text-align:center;margin-top:40px;font-size:10px;color:#94a3b8">Printed: ${new Date().toLocaleString()} | Rapide After-Sales System</div>`);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
  };

  // QC Checklist Items (What the foreman actually inspects)
  const QC_CHECKLIST = [
    { id: 'work_completed', label: 'Work Completed as Requested', description: 'All requested services were performed' },
    { id: 'parts_installed', label: 'Parts Installed Correctly', description: 'All parts properly installed and secured' },
    { id: 'no_new_damage', label: 'No New Damage', description: 'Compare with VRC - no scratches, dents, or damage from service' },
    { id: 'fluid_levels', label: 'Fluid Levels Correct', description: 'Oil, coolant, brake fluid, washer fluid topped up' },
    { id: 'electrical_ok', label: 'Electrical Systems OK', description: 'Lights, signals, horn, wipers all working' },
    { id: 'engine_runs_smooth', label: 'Engine Runs Smoothly', description: 'No unusual noises, vibrations, or warning lights' },
    { id: 'brakes_functional', label: 'Brakes Functional', description: 'Brakes respond correctly, no squealing' },
    { id: 'interior_clean', label: 'Interior Clean', description: 'No grease, tools left behind, seats protected' },
    { id: 'exterior_clean', label: 'Exterior Acceptable', description: 'No handprints, grease, or mess on body' },
    { id: 'settings_restored', label: 'Customer Settings Restored', description: 'Seat, mirrors, radio presets restored' }
  ];

  // Load data
  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, []);

  const handleRealtimeUpdate = useCallback(() => loadAll(), []);
  useAutoRefresh(['foreman-qc', 'job-controller'], handleRealtimeUpdate);

  const loadAll = async () => {
    if (!initialLoadDone) setLoading(true);
    try {
      const [jobsRes, inspRes, sumRes] = await Promise.all([
        fetchJson(`${API}/jobs/pending`),
        fetchJson(`${API}/inspections/active`),
        fetchJson(`${API}/summary`)
      ]);
      if (jobsRes.success) setPendingJobs(jobsRes.data || []);
      if (inspRes.success) setActiveInspections(inspRes.data || []);
      if (sumRes.success) {
        setSummary({
          awaiting: jobsRes.data?.length || 0,
          inProgress: inspRes.data?.length || 0,
          passed: sumRes.data?.passed_count || 0,
          failed: sumRes.data?.failed_count || 0
        });
      }
    } catch (e) {
      console.error('Load error:', e);
    }
    if (!initialLoadDone) {
      setLoading(false);
      setInitialLoadDone(true);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Fetch VRC for comparison
  const fetchVRC = async (serviceOrderId) => {
    try {
      const res = await fetchJson(`/api/service-advisor/vrc/${serviceOrderId}`);
      if (res.success && res.data?.vrc) {
        setVrcData(res.data.vrc);
        return res.data.vrc;
      }
      return null;
    } catch (e) {
      console.error('VRC fetch error:', e);
      return null;
    }
  };

  // Start inspection - creates QC record and enters inspection mode
  const startInspection = async (job) => {
    setSelectedJob(job);
    setLoading(true);
    
    try {
      // Fetch VRC first
      await fetchVRC(job[0]);
      
      // Create inspection record
      const res = await fetchJson(`${API}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_order_id: job[0],
          foreman_id: user?.id || 1,
          inspection_date: new Date().toISOString().split('T')[0]
        })
      });
      
      if (res.success) {
        setCurrentInspection({ id: res.inspection_id, service_order_id: job[0] });
        setInspectionMode(true);
        setInspectionChecklist({});
        setInspectionNotes('');
        setTechnicianName(job[4] || '');
        showMessage('success', 'Inspection started - complete the checklist below');
      } else {
        showMessage('error', res.error || 'Failed to start inspection');
      }
    } catch (e) {
      showMessage('error', e.message);
    }
    setLoading(false);
  };

  // Resume an existing inspection
  const resumeInspection = async (insp) => {
    setLoading(true);
    try {
      await fetchVRC(insp[1]); // insp[1] = service_order_id
      setCurrentInspection({ id: insp[0], service_order_id: insp[1] });
      setSelectedJob([insp[1], 'Customer', 'Vehicle', 'Service', 'Technician']); // placeholder
      setInspectionMode(true);
      setInspectionChecklist({});
      setInspectionNotes('');
    } catch (e) {
      showMessage('error', e.message);
    }
    setLoading(false);
  };

  // Check/uncheck inspection item
  const toggleCheckItem = (itemId, status) => {
    setInspectionChecklist(prev => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status
    }));
  };

  // Calculate inspection result
  const getInspectionResult = () => {
    const checkedItems = Object.keys(inspectionChecklist).filter(k => inspectionChecklist[k] !== null);
    const passedItems = Object.values(inspectionChecklist).filter(v => v === 'pass').length;
    const failedItems = Object.values(inspectionChecklist).filter(v => v === 'fail').length;
    const allChecked = checkedItems.length === QC_CHECKLIST.length;
    const hasFailures = failedItems > 0;
    return { checkedItems: checkedItems.length, total: QC_CHECKLIST.length, passedItems, failedItems, allChecked, hasFailures };
  };

  // Submit inspection as PASS
  const submitPass = async () => {
    if (!technicianName.trim()) {
      showMessage('error', 'Technician name required for counter-signature');
      return;
    }
    
    const result = getInspectionResult();
    if (!result.allChecked) {
      showMessage('error', 'Please complete all checklist items before passing');
      return;
    }
    if (result.hasFailures) {
      showMessage('error', 'Cannot pass with failed items. Mark all items as PASS or submit as FAIL.');
      return;
    }

    try {
      const res = await fetchJson(`${API}/inspections/${currentInspection.id}/pass`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foreman_signature: user?.name || 'Foreman',
          technician_signature: technicianName,
          inspection_notes: inspectionNotes
        })
      });
      
      if (res.success) {
        showMessage('success', '✅ QC PASSED! Job order completed and ready for handover.');
        exitInspectionMode();
        loadAll();
      } else {
        showMessage('error', res.error);
      }
    } catch (e) {
      showMessage('error', e.message);
    }
  };

  // Submit inspection as FAIL (for rework)
  const submitFail = async () => {
    const result = getInspectionResult();
    const failedItemNames = QC_CHECKLIST
      .filter(item => inspectionChecklist[item.id] === 'fail')
      .map(item => item.label);
    
    if (failedItemNames.length === 0 && !inspectionNotes.trim()) {
      showMessage('error', 'Please mark failed items or add notes explaining the failure');
      return;
    }

    const failReason = failedItemNames.length > 0 
      ? `Failed: ${failedItemNames.join(', ')}. ${inspectionNotes}`
      : inspectionNotes;

    try {
      const res = await fetchJson(`${API}/inspections/${currentInspection.id}/fail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          failed_items: failReason,
          foreman_notes: inspectionNotes
        })
      });
      
      if (res.success) {
        showMessage('success', '🔧 Marked for REWORK. Job sent back to technician.');
        exitInspectionMode();
        loadAll();
      } else {
        showMessage('error', res.error);
      }
    } catch (e) {
      showMessage('error', e.message);
    }
  };

  const exitInspectionMode = () => {
    setInspectionMode(false);
    setCurrentInspection(null);
    setSelectedJob(null);
    setVrcData(null);
    setInspectionChecklist({});
    setInspectionNotes('');
    setActiveView('pending');
  };

  // ==================== RENDER ====================
  const result = getInspectionResult();

  // Build responsive styles
  const s = getStyles(isMobile);

  return (
    <div style={s.container}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logo}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>QC</span>
          </div>
          <div>
            <h1 style={s.title}>Foreman QC Dashboard</h1>
            {!isMobile && <p style={s.subtitle}>Quality inspection after technician clock-out</p>}
          </div>
        </div>

        <div style={s.statsRow}>
          <div style={s.statBox('#f59e0b')}>
            <div style={s.statValue}>{summary.awaiting}</div>
            <div style={s.statLabel}>Awaiting</div>
          </div>
          <div style={s.statBox('#3b82f6')}>
            <div style={s.statValue}>{summary.inProgress}</div>
            <div style={s.statLabel}>In Progress</div>
          </div>
          <div style={s.statBox('#22c55e')}>
            <div style={s.statValue}>{summary.passed}</div>
            <div style={s.statLabel}>Passed</div>
          </div>
          <div style={s.statBox('#ef4444')}>
            <div style={s.statValue}>{summary.failed}</div>
            <div style={s.statLabel}>Rework</div>
          </div>
        </div>

        <div style={s.userSection}>
          <span style={s.userName}>{user?.name || 'Foreman'}</span>
          <button onClick={onLogout} style={s.logoutBtn}>Logout</button>
        </div>
      </header>

      {/* Message Alert */}
      {message.text && (
        <div style={s.alert(message.type)}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} style={s.alertClose}>×</button>
        </div>
      )}

      {/* Main Content */}
      <main style={s.main}>
        {/* Inspection Mode - Full Screen Inspection Form */}
        {inspectionMode ? (
          <div style={s.inspectionContainer}>
            {/* Inspection Header */}
            <div style={s.inspectionHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={s.inspectionTitle}>
                  Inspecting SO #{currentInspection?.service_order_id}
                </h2>
                {!isMobile && <p style={s.inspectionSubtitle}>
                  Complete all checklist items, then PASS or FAIL the inspection
                </p>}
              </div>
              <button onClick={exitInspectionMode} style={s.backBtn}>
                ← Back
              </button>
            </div>

            <div style={s.inspectionBody}>
              {/* Left Column - VRC Reference */}
              <div style={s.vrcPanel}>
                <div style={s.panelHeader}>
                  VRC Reference (Check-In Condition)
                </div>
                <div style={s.panelBody}>
                  {vrcData ? (
                    <div>
                      <div style={s.vrcInfo}>
                        <div style={s.vrcRow}>
                          <span>Mileage In:</span>
                          <strong>{vrcData.mileage_in || '---'} km</strong>
                        </div>
                        <div style={s.vrcRow}>
                          <span>Mileage Out:</span>
                          <strong>{vrcData.mileage_out || '---'} km</strong>
                        </div>
                      </div>
                      
                      <div style={s.vrcSection}>
                        <strong>10-Point Check at Intake:</strong>
                        <div style={s.vrcCheckGrid}>
                          {[
                            { key: 'checklist_1_engine', label: 'Engine' },
                            { key: 'checklist_2_fluids', label: 'Fluids' },
                            { key: 'checklist_3_brakes', label: 'Brakes' },
                            { key: 'checklist_4_suspension', label: 'Suspension' },
                            { key: 'checklist_5_battery', label: 'Battery' },
                            { key: 'checklist_6_tires', label: 'Tires' },
                            { key: 'checklist_7_lights', label: 'Lights' },
                            { key: 'checklist_8_body', label: 'Body' },
                            { key: 'checklist_9_wipers', label: 'Wipers' },
                            { key: 'checklist_10_handbrake', label: 'Handbrake' }
                          ].map(item => (
                            <div key={item.key} style={s.vrcCheckItem(vrcData[item.key])}>
                              <span>{item.label}</span>
                              <span style={s.vrcStatus(vrcData[item.key])}>
                                {vrcData[item.key]?.toUpperCase() || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {vrcData.additional_findings && (
                        <div style={s.vrcFindings}>
                          <strong>Noted Issues at Check-in:</strong>
                          <p>{vrcData.additional_findings}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={s.noVrc}>
                      <p>No VRC data available</p>
                      <p style={{ fontSize: '12px', color: '#94a3b8' }}>
                        VRC may not have been completed at check-in
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - QC Checklist */}
              <div style={s.checklistPanel}>
                <div style={s.panelHeader}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>QC Checklist ({result.checkedItems}/{result.total})</span>
                    {!isMobile && <button onClick={handlePrint} style={{ padding: '5px 14px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>Print Form</button>}
                  </div>
                </div>
                <div style={s.panelBody} ref={printRef}>
                  <div style={s.checklistGrid}>
                    {QC_CHECKLIST.map((item, idx) => {
                      const st = inspectionChecklist[item.id];
                      return (
                        <div key={item.id} style={s.checklistItem(st)}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '8px' : '14px', flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, minWidth: '18px', paddingTop: '1px' }}>{idx + 1}.</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={s.checklistLabel}>{item.label}</div>
                              {!isMobile && <div style={s.checklistDesc}>{item.description}</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', flexShrink: 0 }}>
                            {/* Pass checkbox */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                              <div
                                onClick={() => toggleCheckItem(item.id, 'pass')}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '4px',
                                  border: st === 'pass' ? '2px solid #16a34a' : '2px solid #cbd5e1',
                                  background: st === 'pass' ? '#dcfce7' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                {st === 'pass' && <span style={{ color: '#16a34a', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>&#10003;</span>}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: st === 'pass' ? '#16a34a' : '#64748b' }}>Pass</span>
                            </label>
                            {/* Fail checkbox */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                              <div
                                onClick={() => toggleCheckItem(item.id, 'fail')}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '4px',
                                  border: st === 'fail' ? '2px solid #dc2626' : '2px solid #cbd5e1',
                                  background: st === 'fail' ? '#fee2e2' : '#fff',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  cursor: 'pointer', transition: 'all 0.15s'
                                }}
                              >
                                {st === 'fail' && <span style={{ color: '#dc2626', fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>&#10007;</span>}
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600, color: st === 'fail' ? '#dc2626' : '#64748b' }}>Fail</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <div style={s.notesSection}>
                    <label style={s.notesLabel}>Inspection Notes (optional):</label>
                    <textarea
                      value={inspectionNotes}
                      onChange={e => setInspectionNotes(e.target.value)}
                      placeholder="Add any observations, issues found, or special notes..."
                      style={s.notesInput}
                      rows={3}
                    />
                  </div>

                  {/* Technician Sign-off */}
                  <div style={s.signatureSection}>
                    <label style={s.signatureLabel}>Technician Counter-Signature:</label>
                    <input
                      type="text"
                      value={technicianName}
                      onChange={e => setTechnicianName(e.target.value)}
                      placeholder="Enter technician's name"
                      style={s.signatureInput}
                    />
                    <span style={s.signatureHint}>Required for passing</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={s.actionBar}>
                  <div style={s.resultSummary}>
                    {result.hasFailures ? (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{result.failedItems} item(s) failed</span>
                    ) : result.allChecked ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>All items passed</span>
                    ) : (
                      <span style={{ color: '#64748b' }}>{result.total - result.checkedItems} items remaining</span>
                    )}
                  </div>
                  <div style={s.actionButtons}>
                    <button onClick={handlePrint} style={{ padding: isMobile ? '10px 14px' : '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#475569', flex: isMobile ? 1 : 'none' }}>Print</button>
                    <button
                      onClick={submitFail}
                      style={s.submitBtn('fail')}
                      disabled={result.checkedItems === 0 && !inspectionNotes.trim()}
                    >
                      Rework
                    </button>
                    <button
                      onClick={submitPass}
                      style={s.submitBtn('pass')}
                      disabled={!result.allChecked || result.hasFailures || !technicianName.trim()}
                    >
                      Pass QC
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal View - Job Queue */
          <>
            {/* Workflow Banner */}
            {!isMobile && (
              <div style={s.workflowBanner}>
                <div style={s.workflowStep(true, false)}>
                  <div style={s.stepNumber}>1</div>
                  <div style={s.stepLabel}>Clock-Out</div>
                </div>
                <div style={s.workflowArrow}>→</div>
                <div style={s.workflowStep(true, true)}>
                  <div style={s.stepNumber}>2</div>
                  <div style={s.stepLabel}>QC Check</div>
                </div>
                <div style={s.workflowArrow}>→</div>
                <div style={s.workflowStep(false, false)}>
                  <div style={s.stepNumber}>3</div>
                  <div style={s.stepLabel}>Handover</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={s.tabs}>
              <button
                style={s.tab(activeView === 'pending')}
                onClick={() => setActiveView('pending')}
              >
                Awaiting QC ({pendingJobs.length})
              </button>
              <button
                style={s.tab(activeView === 'active')}
                onClick={() => setActiveView('active')}
              >
                In Progress ({activeInspections.length})
              </button>
            </div>

            {/* Pending Jobs */}
            {activeView === 'pending' && (
              <div style={s.jobsGrid}>
                {pendingJobs.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>--</div>
                    <h3>All caught up!</h3>
                    <p>Jobs appear here when technicians are clocked out by Job Controller</p>
                  </div>
                ) : (
                  pendingJobs.map(job => (
                    <div key={job[0]} style={s.jobCard}>
                      <div style={s.jobBadge}>Clocked Out</div>
                      <div style={s.jobHeader}>
                        <span style={s.jobId}>SO #{job[0]}</span>
                        <span style={s.jobType}>{job[3] || 'Service'}</span>
                      </div>
                      <div style={s.jobDetails}>
                        <div style={s.jobRow}>
                          <span style={s.jobLabel}>Customer</span>
                          <span style={s.jobValue}>{job[1] || 'Unknown'}</span>
                        </div>
                        <div style={s.jobRow}>
                          <span style={s.jobLabel}>Vehicle</span>
                          <span style={s.jobValue}>{job[2] || 'N/A'}</span>
                        </div>
                        <div style={s.jobRow}>
                          <span style={s.jobLabel}>Technician</span>
                          <span style={s.jobValue}>{job[4] || 'Unassigned'}</span>
                        </div>
                        {job[5] && (
                          <div style={s.jobRow}>
                            <span style={s.jobLabel}>Clock-out</span>
                            <span style={s.jobValue}>{new Date(job[5]).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => startInspection(job)}
                        style={s.startBtn}
                        disabled={loading}
                      >
                        Start QC Inspection
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Active Inspections */}
            {activeView === 'active' && (
              <div style={s.jobsGrid}>
                {activeInspections.length === 0 ? (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>--</div>
                    <h3>No active inspections</h3>
                    <p>Start an inspection from the "Awaiting QC" tab</p>
                  </div>
                ) : (
                  activeInspections.map(insp => (
                    <div key={insp[0]} style={s.inspCard(insp[4])}>
                      <div style={s.inspBadge(insp[4])}>
                        {insp[4] === 'rework-required' ? 'Needs Rework' : 'In Progress'}
                      </div>
                      <div style={s.jobHeader}>
                        <span style={s.jobId}>Inspection #{insp[0]}</span>
                        <span style={s.jobType}>SO #{insp[1]}</span>
                      </div>
                      <div style={s.jobDetails}>
                        <div style={s.jobRow}>
                          <span style={s.jobLabel}>Started</span>
                          <span style={s.jobValue}>{insp[3] ? new Date(insp[3]).toLocaleString() : 'N/A'}</span>
                        </div>
                        {insp[5] && (
                          <div style={{ ...s.jobRow, background: '#fef2f2', padding: '8px', borderRadius: '6px', marginTop: '8px' }}>
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>
                              {insp[5]}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => resumeInspection(insp)}
                        style={s.resumeBtn}
                      >
                        Continue Inspection
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// ==================== STYLES (responsive) ====================
const getStyles = (mobile) => ({
  container: {
    minHeight: '100vh',
    background: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: mobile ? '12px 14px' : '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: mobile ? '10px' : '24px',
    flexWrap: mobile ? 'wrap' : 'nowrap'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: mobile ? '8px' : '12px',
    ...(mobile ? { order: 1, flex: 1 } : {})
  },
  logo: {
    width: mobile ? '36px' : '48px',
    height: mobile ? '36px' : '48px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    borderRadius: mobile ? '8px' : '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: mobile ? '18px' : '24px',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: mobile ? '15px' : '20px',
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#64748b'
  },
  statsRow: {
    display: 'flex',
    gap: mobile ? '6px' : '16px',
    ...(mobile ? { order: 3, width: '100%', justifyContent: 'space-between' } : {})
  },
  statBox: (color) => ({
    background: `${color}15`,
    border: `1px solid ${color}30`,
    borderRadius: mobile ? '8px' : '10px',
    padding: mobile ? '8px 0' : '12px 20px',
    textAlign: 'center',
    minWidth: mobile ? '0' : '80px',
    flex: mobile ? 1 : 'none'
  }),
  statValue: {
    fontSize: mobile ? '18px' : '24px',
    fontWeight: '700',
    color: '#0f172a'
  },
  statLabel: {
    fontSize: mobile ? '9px' : '11px',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: '2px'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...(mobile ? { order: 2 } : {})
  },
  userName: {
    fontSize: mobile ? '12px' : '14px',
    color: '#334155',
    ...(mobile ? { display: 'none' } : {})
  },
  logoutBtn: {
    padding: mobile ? '6px 12px' : '8px 16px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: mobile ? '12px' : '13px'
  },
  alert: (type) => ({
    padding: mobile ? '10px 14px' : '12px 24px',
    background: type === 'success' ? '#f0fdf4' : type === 'error' ? '#fef2f2' : '#fffbeb',
    color: type === 'success' ? '#166534' : type === 'error' ? '#dc2626' : '#a16207',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: mobile ? '12px' : '14px'
  }),
  alertClose: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    opacity: 0.6
  },
  main: {
    padding: mobile ? '12px' : '24px',
    maxWidth: '1600px',
    margin: '0 auto'
  },

  // Workflow Banner
  workflowBanner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    borderRadius: '12px',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    marginBottom: '24px'
  },
  workflowStep: (completed, active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: active ? 'rgba(255,255,255,0.2)' : completed ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
  }),
  stepNumber: {
    width: '24px',
    height: '24px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600'
  },
  stepLabel: {
    color: '#fff',
    fontSize: '13px',
    fontWeight: '500'
  },
  workflowArrow: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '20px'
  },

  // Tabs
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: mobile ? '16px' : '24px'
  },
  tab: (active) => ({
    padding: mobile ? '10px 16px' : '12px 24px',
    background: active ? '#0f172a' : '#fff',
    color: active ? '#fff' : '#64748b',
    border: active ? 'none' : '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: mobile ? '12px' : '14px',
    fontWeight: '500',
    flex: mobile ? 1 : 'none',
    textAlign: 'center'
  }),

  // Jobs Grid
  jobsGrid: {
    display: 'grid',
    gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: mobile ? '12px' : '20px'
  },
  jobCard: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: mobile ? '16px' : '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  jobBadge: {
    display: 'inline-block',
    background: '#fef3c7',
    color: '#92400e',
    padding: '4px 12px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: '600',
    marginBottom: '12px'
  },
  jobHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: mobile ? '12px' : '16px'
  },
  jobId: {
    fontSize: mobile ? '16px' : '18px',
    fontWeight: '700',
    color: '#0f172a'
  },
  jobType: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '600'
  },
  jobDetails: {
    marginBottom: '16px'
  },
  jobRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  jobLabel: {
    fontSize: '12px',
    color: '#64748b'
  },
  jobValue: {
    fontSize: '13px',
    color: '#0f172a',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word'
  },
  startBtn: {
    width: '100%',
    padding: mobile ? '14px' : '12px',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  inspCard: (status) => ({
    background: '#fff',
    borderRadius: '12px',
    border: status === 'rework-required' ? '2px solid #ef4444' : '2px solid #3b82f6',
    padding: mobile ? '16px' : '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  }),
  inspBadge: (status) => ({
    display: 'inline-block',
    background: status === 'rework-required' ? '#fef2f2' : '#dbeafe',
    color: status === 'rework-required' ? '#dc2626' : '#1e40af',
    padding: '4px 12px',
    borderRadius: '99px',
    fontSize: '11px',
    fontWeight: '600',
    marginBottom: '12px'
  }),
  resumeBtn: {
    width: '100%',
    padding: mobile ? '14px' : '12px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  emptyState: {
    gridColumn: '1 / -1',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: mobile ? '40px 16px' : '60px 20px',
    textAlign: 'center'
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  // Inspection Mode
  inspectionContainer: {
    background: '#fff',
    borderRadius: mobile ? '8px' : '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  },
  inspectionHeader: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
    color: '#fff',
    padding: mobile ? '14px' : '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  inspectionTitle: {
    margin: 0,
    fontSize: mobile ? '15px' : '18px',
    fontWeight: '600'
  },
  inspectionSubtitle: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    opacity: 0.8
  },
  backBtn: {
    padding: mobile ? '6px 12px' : '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  inspectionBody: {
    display: mobile ? 'flex' : 'grid',
    flexDirection: mobile ? 'column' : undefined,
    gridTemplateColumns: mobile ? undefined : '350px 1fr',
    minHeight: mobile ? undefined : '600px'
  },
  vrcPanel: {
    background: '#f8fafc',
    borderRight: mobile ? 'none' : '1px solid #e2e8f0',
    borderBottom: mobile ? '1px solid #e2e8f0' : 'none'
  },
  checklistPanel: {
    display: 'flex',
    flexDirection: 'column'
  },
  panelHeader: {
    background: '#f1f5f9',
    padding: mobile ? '10px 14px' : '12px 16px',
    fontSize: mobile ? '13px' : '14px',
    fontWeight: '600',
    color: '#0f172a',
    borderBottom: '1px solid #e2e8f0'
  },
  panelBody: {
    padding: mobile ? '12px' : '16px',
    flex: 1,
    overflowY: 'auto'
  },
  vrcInfo: {
    marginBottom: '16px'
  },
  vrcRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '13px'
  },
  vrcSection: {
    marginBottom: '16px'
  },
  vrcCheckGrid: {
    display: 'grid',
    gridTemplateColumns: mobile ? '1fr 1fr' : '1fr',
    gap: '6px',
    marginTop: '8px'
  },
  vrcCheckItem: (status) => ({
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    background: status === 'pass' ? '#f0fdf4' : status === 'fail' ? '#fef2f2' : '#f8fafc',
    borderRadius: '4px',
    fontSize: '12px'
  }),
  vrcStatus: (status) => ({
    fontWeight: '600',
    color: status === 'pass' ? '#16a34a' : status === 'fail' ? '#dc2626' : '#94a3b8'
  }),
  vrcFindings: {
    background: '#fef3c7',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px'
  },
  noVrc: {
    textAlign: 'center',
    padding: mobile ? '24px 12px' : '40px 20px',
    color: '#64748b'
  },

  // Checklist
  checklistGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: mobile ? '8px' : '12px'
  },
  checklistItem: (status) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: mobile ? '10px 12px' : '12px 16px',
    background: status === 'pass' ? '#f0fdf4' : status === 'fail' ? '#fef2f2' : '#f8fafc',
    border: `1px solid ${status === 'pass' ? '#bbf7d0' : status === 'fail' ? '#fecaca' : '#e2e8f0'}`,
    borderRadius: '8px',
    gap: mobile ? '8px' : '12px'
  }),
  checklistInfo: {
    flex: 1
  },
  checklistLabel: {
    fontSize: mobile ? '13px' : '14px',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '2px'
  },
  checklistDesc: {
    fontSize: '12px',
    color: '#64748b'
  },
  checklistButtons: {
    display: 'flex',
    gap: '8px'
  },
  checkBtn: (type, active) => ({
    padding: '6px 16px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    background: active
      ? (type === 'pass' ? '#22c55e' : '#ef4444')
      : (type === 'pass' ? '#dcfce7' : '#fee2e2'),
    color: active ? '#fff' : (type === 'pass' ? '#166534' : '#dc2626')
  }),
  notesSection: {
    marginTop: mobile ? '16px' : '20px'
  },
  notesLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px'
  },
  notesInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: mobile ? '16px' : '13px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  signatureSection: {
    marginTop: '16px',
    padding: mobile ? '12px' : '16px',
    background: '#f0fdf4',
    borderRadius: '8px',
    border: '1px solid #bbf7d0'
  },
  signatureLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#166534',
    marginBottom: '6px'
  },
  signatureInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    fontSize: mobile ? '16px' : '14px',
    boxSizing: 'border-box'
  },
  signatureHint: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px',
    display: 'block'
  },
  actionBar: {
    borderTop: '1px solid #e2e8f0',
    padding: mobile ? '12px' : '16px 20px',
    display: 'flex',
    flexDirection: mobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: mobile ? 'stretch' : 'center',
    gap: mobile ? '10px' : '0',
    background: '#f8fafc'
  },
  resultSummary: {
    fontSize: mobile ? '13px' : '14px',
    textAlign: mobile ? 'center' : 'left'
  },
  actionButtons: {
    display: 'flex',
    gap: mobile ? '8px' : '12px'
  },
  submitBtn: (type) => ({
    padding: mobile ? '12px 14px' : '12px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: mobile ? '13px' : '14px',
    fontWeight: '600',
    background: type === 'pass' ? '#22c55e' : '#f59e0b',
    color: '#fff',
    opacity: 1,
    flex: mobile ? 1 : 'none'
  })
});

export default ForemanQCDashboard;
