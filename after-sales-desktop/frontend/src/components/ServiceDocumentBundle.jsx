/**
 * ServiceDocumentBundle – prints ALL service documents in one shot
 * 
 * Pages (each with page-break-after):
 *  1. Service Order Summary  (landscape)
 *  2. Vehicle Report Card    (landscape)
 *  3. Billing Statement      (landscape)
 *  4. Gatepass / Release     (landscape)
 *
 * Usage:
 *   <ServiceDocumentBundle
 *     serviceOrderId={123}
 *     onClose={() => {}}
 *     companyName="Rapide Auto Service Center"
 *   />
 */
import React, { useState, useEffect, useRef } from 'react';
import { fetchJson } from '../utils/fetchJson';

// ────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────
const fmt = (amt) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amt || 0);
const dateStr = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const shortDate = (d) => d ? new Date(d).toLocaleDateString('en-PH') : '—';

// Shared page style (landscape short bond)
const PAGE = {
  width: '279mm',
  minHeight: '200mm',
  padding: '10mm 14mm',
  backgroundColor: '#fff',
  fontFamily: "'Segoe UI', Arial, sans-serif",
  fontSize: '11px',
  color: '#1a1a2e',
  boxSizing: 'border-box',
  pageBreakAfter: 'always',
};

const HEADER_BAR = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: '8mm', paddingBottom: '5mm', borderBottom: '2.5px solid #1e40af',
};

const SECTION_TITLE = {
  fontSize: '10px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase',
  letterSpacing: '0.5px', marginBottom: '4px', borderBottom: '1px solid #e2e8f0', paddingBottom: '3px',
};

const INFO_BOX = {
  flex: 1, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0',
};

const TH = {
  padding: '6px 10px', textAlign: 'left', background: '#1e40af', color: '#fff',
  fontSize: '10px', fontWeight: '700',
};

const TD = { padding: '6px 10px', borderBottom: '1px solid #e2e8f0', fontSize: '11px' };

const SIG_LINE = { flex: 1, textAlign: 'center' };

// ────────────────────────────────────────────────────────
// Page 1 – Service Order Summary
// ────────────────────────────────────────────────────────
function PageServiceOrder({ order, work, parts, companyName }) {
  return (
    <div style={PAGE}>
      <div style={HEADER_BAR}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{companyName}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>After-Sales Service Department</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>SERVICE ORDER</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>SO-{String(order.id).padStart(5, '0')}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Date: {dateStr(order.check_in_time || order.created_at)}</div>
        </div>
      </div>

      {/* Customer / Vehicle */}
      <div style={{ display: 'flex', gap: '10mm', marginBottom: '6mm' }}>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Customer</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.customer_name || 'Walk-in'}</div>
          {order.contact_no && <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {order.contact_no}</div>}
          {order.email && <div style={{ fontSize: '11px', color: '#64748b' }}>✉ {order.email}</div>}
          {order.address && <div style={{ fontSize: '11px', color: '#64748b' }}>{order.address}</div>}
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Vehicle</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.plate_no || order.vehicle_plate_no || '—'}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{order.vehicle_model || ''}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Service Type: {order.service_type || '—'}</div>
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Scheduling</div>
          <div style={{ fontSize: '11px' }}>Check-in: {shortDate(order.check_in_time)}</div>
          <div style={{ fontSize: '11px' }}>Target: {shortDate(order.estimated_completion_time)}</div>
          <div style={{ fontSize: '11px' }}>Completed: {shortDate(order.actual_completion_time)}</div>
          <div style={{ fontSize: '11px', fontWeight: '600', marginTop: '2px' }}>Status: <span style={{ color: '#22c55e', textTransform: 'uppercase' }}>{order.status}</span></div>
        </div>
      </div>

      {/* Work / Technician */}
      {work && (
        <div style={{ marginBottom: '6mm' }}>
          <div style={SECTION_TITLE}>Technician & Labor</div>
          <div style={{ display: 'flex', gap: '10mm' }}>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '13px', fontWeight: '700' }}>{work.technician_name || 'Unassigned'}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Assignment: {work.assignment_status || '—'}</div>
            </div>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Clock In: {shortDate(work.clock_in_time)}</div>
              <div style={{ fontSize: '11px' }}>Clock Out: {shortDate(work.clock_out_time)}</div>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>Labor Hours: {work.total_labor_hours || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Parts Used */}
      {parts && parts.length > 0 && (
        <div style={{ marginBottom: '6mm' }}>
          <div style={SECTION_TITLE}>Parts Used</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '50%' }}>Part</th>
                <th style={{ ...TH, textAlign: 'center', width: '15%' }}>Qty</th>
                <th style={{ ...TH, textAlign: 'right', width: '15%' }}>Unit Price</th>
                <th style={{ ...TH, textAlign: 'right', width: '20%' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p, i) => (
                <tr key={i}>
                  <td style={TD}>{p.part_name || `Part #${p.id}`}</td>
                  <td style={{ ...TD, textAlign: 'center' }}>{p.quantity || 1}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>{fmt(p.price)}</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: '600' }}>{fmt((p.quantity || 1) * (p.price || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '20mm', marginTop: '14mm' }}>
        {['Customer', 'Service Advisor', 'Technician'].map(label => (
          <div key={label} style={SIG_LINE}>
            <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '18mm' }} />
            <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Page 2 – Vehicle Report Card (VRC / Inspection)
// ────────────────────────────────────────────────────────
const VRC_ITEMS = [
  { key: 'checklist_1_engine', label: 'Engine Running Condition' },
  { key: 'checklist_2_fluids', label: 'Fluid Levels & Leaks' },
  { key: 'checklist_3_brakes', label: 'Brake System' },
  { key: 'checklist_4_suspension', label: 'Suspension & Steering' },
  { key: 'checklist_5_battery', label: 'Battery Condition' },
  { key: 'checklist_6_tires', label: 'Tire Condition' },
  { key: 'checklist_7_lights', label: 'Lights & Signals' },
  { key: 'checklist_8_body', label: 'Body & Paint' },
  { key: 'checklist_9_wipers', label: 'Wiper & Washer' },
  { key: 'checklist_10_handbrake', label: 'Handbrake' },
];

function PageVRC({ order, vrc, qcInspection, roadTest, companyName }) {
  return (
    <div style={PAGE}>
      <div style={HEADER_BAR}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{companyName}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Vehicle Report Card / Inspection</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>VEHICLE REPORT CARD</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>SO-{String(order.id).padStart(5, '0')}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Plate: {order.plate_no || order.vehicle_plate_no || '—'}</div>
        </div>
      </div>

      {/* VRC checklist */}
      {vrc ? (
        <div style={{ marginBottom: '8mm' }}>
          <div style={SECTION_TITLE}>10-Point Vehicle Inspection</div>
          <div style={{ display: 'flex', gap: '6mm', marginBottom: '4px' }}>
            <div style={INFO_BOX}>
              <span style={{ fontSize: '11px' }}>Mileage In: <strong>{vrc.mileage_in || '—'}</strong></span>
            </div>
            <div style={INFO_BOX}>
              <span style={{ fontSize: '11px' }}>Inspector: <strong>{vrc.inspector_name || '—'}</strong></span>
            </div>
            <div style={INFO_BOX}>
              <span style={{ fontSize: '11px' }}>Date: <strong>{shortDate(vrc.created_at)}</strong></span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, width: '5%' }}>#</th>
                <th style={{ ...TH, width: '40%' }}>Check Item</th>
                <th style={{ ...TH, textAlign: 'center', width: '15%' }}>Result</th>
                <th style={{ ...TH, width: '40%' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {VRC_ITEMS.map((item, i) => {
                const val = vrc[item.key];
                const isPass = val === 'pass' || val === 'good' || val === 'ok' || val === true;
                const isFail = val === 'fail' || val === 'bad' || val === 'needs_attention' || val === false;
                return (
                  <tr key={item.key}>
                    <td style={{ ...TD, textAlign: 'center' }}>{i + 1}</td>
                    <td style={TD}>{item.label}</td>
                    <td style={{ ...TD, textAlign: 'center', fontWeight: '700', color: isPass ? '#22c55e' : isFail ? '#ef4444' : '#94a3b8' }}>
                      {isPass ? '✓ PASS' : isFail ? '✗ FAIL' : val || 'N/A'}
                    </td>
                    <td style={{ ...TD, fontSize: '10px', color: '#64748b' }}>{vrc[item.key + '_remarks'] || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {vrc.additional_findings && (
            <div style={{ marginTop: '4mm', padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '11px' }}>
              <strong>Additional Findings:</strong> {vrc.additional_findings}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
          No Vehicle Report Card recorded for this service order.
        </div>
      )}

      {/* QC Inspection Summary */}
      {qcInspection && (
        <div style={{ marginBottom: '6mm' }}>
          <div style={SECTION_TITLE}>Quality Control Inspection</div>
          <div style={{ display: 'flex', gap: '10mm' }}>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Foreman: <strong>{qcInspection.foreman_name || '—'}</strong></div>
              <div style={{ fontSize: '11px' }}>Status: <strong style={{ color: qcInspection.status === 'passed' ? '#22c55e' : '#f59e0b' }}>{(qcInspection.status || '').toUpperCase()}</strong></div>
            </div>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Date: {shortDate(qcInspection.created_at)}</div>
              {qcInspection.notes && <div style={{ fontSize: '10px', color: '#64748b' }}>Notes: {qcInspection.notes}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Road Test */}
      {roadTest && (
        <div style={{ marginBottom: '6mm' }}>
          <div style={SECTION_TITLE}>Road Test</div>
          <div style={{ display: 'flex', gap: '10mm' }}>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Result: <strong style={{ color: roadTest.result === 'passed' ? '#22c55e' : '#f59e0b' }}>{(roadTest.result || roadTest.status || '').toUpperCase()}</strong></div>
            </div>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Date: {shortDate(roadTest.created_at)}</div>
              {roadTest.notes && <div style={{ fontSize: '10px', color: '#64748b' }}>Notes: {roadTest.notes}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '20mm', marginTop: '14mm' }}>
        {['Inspector / Technician', 'QC Foreman', 'Service Advisor'].map(label => (
          <div key={label} style={SIG_LINE}>
            <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '18mm' }} />
            <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Page 3 – Billing Statement
// ────────────────────────────────────────────────────────
function PageBilling({ order, invoice, parts, companyName }) {
  if (!invoice) {
    return (
      <div style={PAGE}>
        <div style={HEADER_BAR}>
          <div><div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{companyName}</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>BILLING STATEMENT</div></div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
          No billing invoice has been generated for this service order yet.
        </div>
      </div>
    );
  }

  const laborCost = Number(invoice.labor_cost || (invoice.labor_hours || 0) * (invoice.labor_rate || 0));
  const partsCost = Number(invoice.parts_cost || 0);
  const materialsCost = Number(invoice.materials_cost || 0);
  const parkingCost = Number(invoice.parking_cost || 0);
  const subtotal = laborCost + partsCost + materialsCost + parkingCost;
  const discount = Number(invoice.discount || 0);
  const warranty = Number(invoice.warranty_deduction || 0);
  const total = Number(invoice.total_amount || subtotal - discount - warranty);

  return (
    <div style={PAGE}>
      <div style={HEADER_BAR}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{companyName}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>After-Sales Service Department</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>BILLING STATEMENT</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Invoice: <strong style={{ color: '#1e40af' }}>{invoice.invoice_number || `INV-${String(invoice.id).padStart(5, '0')}`}</strong></div>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>SO-{String(order.id).padStart(5, '0')} · {dateStr(invoice.created_at || order.created_at)}</div>
        </div>
      </div>

      {/* Customer / Vehicle */}
      <div style={{ display: 'flex', gap: '10mm', marginBottom: '6mm' }}>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Bill To</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.customer_name || 'Walk-in'}</div>
          {order.contact_no && <div style={{ fontSize: '11px', color: '#64748b' }}>{order.contact_no}</div>}
          {order.address && <div style={{ fontSize: '11px', color: '#64748b' }}>{order.address}</div>}
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Vehicle</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.plate_no || '—'}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{order.vehicle_model || ''}</div>
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Payment</div>
          <div style={{ fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', color: invoice.status === 'paid' ? '#22c55e' : '#f59e0b' }}>{invoice.status || 'PENDING'}</div>
          {invoice.due_date && <div style={{ fontSize: '11px', color: '#64748b' }}>Due: {shortDate(invoice.due_date)}</div>}
        </div>
      </div>

      {/* Charges Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: '50%' }}>Description</th>
            <th style={{ ...TH, textAlign: 'center', width: '15%' }}>Details</th>
            <th style={{ ...TH, textAlign: 'right', width: '15%' }}>Rate</th>
            <th style={{ ...TH, textAlign: 'right', width: '20%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {laborCost > 0 && (
            <tr>
              <td style={TD}>Labor Charges</td>
              <td style={{ ...TD, textAlign: 'center' }}>{invoice.labor_hours ? `${invoice.labor_hours} hrs` : '—'}</td>
              <td style={{ ...TD, textAlign: 'right' }}>{invoice.labor_rate ? fmt(invoice.labor_rate) + '/hr' : '—'}</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: '700' }}>{fmt(laborCost)}</td>
            </tr>
          )}
          {partsCost > 0 && (
            <tr>
              <td style={TD}>Parts & Components</td>
              <td style={{ ...TD, textAlign: 'center' }}>{parts?.length ? `${parts.length} items` : '—'}</td>
              <td style={{ ...TD, textAlign: 'right' }}>—</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: '700' }}>{fmt(partsCost)}</td>
            </tr>
          )}
          {materialsCost > 0 && (
            <tr>
              <td style={TD}>Materials & Supplies</td>
              <td style={{ ...TD, textAlign: 'center' }}>—</td>
              <td style={{ ...TD, textAlign: 'right' }}>—</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: '700' }}>{fmt(materialsCost)}</td>
            </tr>
          )}
          {parkingCost > 0 && (
            <tr>
              <td style={TD}>Parking / Storage Fee</td>
              <td style={{ ...TD, textAlign: 'center' }}>—</td>
              <td style={{ ...TD, textAlign: 'right' }}>—</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: '700' }}>{fmt(parkingCost)}</td>
            </tr>
          )}
          {laborCost === 0 && partsCost === 0 && materialsCost === 0 && parkingCost === 0 && (
            <tr>
              <td style={TD}>Service Charges (Total)</td>
              <td style={{ ...TD, textAlign: 'center' }}>—</td>
              <td style={{ ...TD, textAlign: 'right' }}>—</td>
              <td style={{ ...TD, textAlign: 'right', fontWeight: '700' }}>{fmt(total)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', gap: '12mm', marginBottom: '6mm' }}>
        <div style={{ flex: 1, padding: '8px 12px', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '10px' }}>
          <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>Terms</div>
          <ul style={{ margin: 0, paddingLeft: '14px', color: '#78716c', lineHeight: '1.6' }}>
            <li>Payment due upon service completion</li>
            <li>Accepted: Cash, Card, GCash, Maya, Bank Transfer, Check</li>
          </ul>
        </div>
        <div style={{ width: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}>
            <span>Subtotal:</span><span>{fmt(subtotal || total)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#22c55e', borderBottom: '1px solid #e2e8f0' }}>
              <span>Discount:</span><span>-{fmt(discount)}</span>
            </div>
          )}
          {warranty > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#3b82f6', borderBottom: '1px solid #e2e8f0' }}>
              <span>Warranty:</span><span>-{fmt(warranty)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: '16px', fontWeight: '800', background: '#1e40af', color: '#fff', borderRadius: '0 0 6px 6px', marginTop: '4px' }}>
            <span>TOTAL:</span><span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', gap: '20mm', marginTop: '14mm' }}>
        {['Customer', 'Cashier', 'Service Advisor'].map(label => (
          <div key={label} style={SIG_LINE}>
            <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto', paddingTop: '18mm' }} />
            <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Page 4 – Gate Pass / Vehicle Release
// ────────────────────────────────────────────────────────
function PageGatepass({ order, gatepass, handover, companyName }) {
  return (
    <div style={{ ...PAGE, pageBreakAfter: 'auto' }}>
      <div style={HEADER_BAR}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e40af' }}>{companyName}</div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Security & Vehicle Release</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e40af' }}>GATE PASS</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>SO-{String(order.id).padStart(5, '0')}</div>
        </div>
      </div>

      {/* Info Row */}
      <div style={{ display: 'flex', gap: '10mm', marginBottom: '8mm' }}>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Customer</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.customer_name || 'Walk-in'}</div>
          {order.contact_no && <div style={{ fontSize: '11px', color: '#64748b' }}>{order.contact_no}</div>}
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Vehicle</div>
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{order.plate_no || order.vehicle_plate_no || '—'}</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{order.vehicle_model || ''}</div>
        </div>
        <div style={INFO_BOX}>
          <div style={SECTION_TITLE}>Status</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#22c55e' }}>
            {handover?.handover_status === 'completed' ? '✓ READY FOR RELEASE' : '⏳ PENDING HANDOVER'}
          </div>
          {gatepass && <div style={{ fontSize: '11px', color: '#64748b' }}>Gatepass: {gatepass.status || 'pending'}</div>}
        </div>
      </div>

      {/* Service Completion Summary */}
      <div style={{ marginBottom: '8mm' }}>
        <div style={SECTION_TITLE}>Service Completion Checklist</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '5%' }}>#</th>
              <th style={{ ...TH, width: '40%' }}>Requirement</th>
              <th style={{ ...TH, textAlign: 'center', width: '15%' }}>Status</th>
              <th style={{ ...TH, width: '40%' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Service Work Completed', done: ['completed', 'billed', 'qc-passed', 'job-completed'].includes(order.status) },
              { name: 'Quality Control Passed', done: !!order.qc_passed_at },
              { name: 'Billing / Invoice Generated', done: !!gatepass },
              { name: 'Payment Cleared', done: gatepass?.status === 'signed' || gatepass?.status === 'released' },
              { name: 'Vehicle Handover Completed', done: handover?.handover_status === 'completed' },
              { name: 'Gate Pass Approved', done: gatepass?.status === 'signed' || gatepass?.status === 'released' },
            ].map((item, i) => (
              <tr key={i}>
                <td style={{ ...TD, textAlign: 'center' }}>{i + 1}</td>
                <td style={TD}>{item.name}</td>
                <td style={{ ...TD, textAlign: 'center', fontWeight: '700', color: item.done ? '#22c55e' : '#94a3b8' }}>
                  {item.done ? '✓ DONE' : '○ PENDING'}
                </td>
                <td style={{ ...TD, color: '#94a3b8' }}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vehicle Condition at Release */}
      {handover && (
        <div style={{ marginBottom: '8mm' }}>
          <div style={SECTION_TITLE}>Vehicle Condition at Release</div>
          <div style={{ display: 'flex', gap: '10mm' }}>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Cleanliness: <strong>{handover.vehicle_cleanliness || '—'}</strong></div>
              <div style={{ fontSize: '11px' }}>Fuel Level: <strong>{handover.fuel_level_final || '—'}</strong></div>
            </div>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>Mileage Out: <strong>{handover.mileage_final || '—'}</strong></div>
              <div style={{ fontSize: '11px' }}>Condition: <strong>{handover.overall_condition || '—'}</strong></div>
            </div>
            <div style={INFO_BOX}>
              <div style={{ fontSize: '11px' }}>All Items Returned: <strong>{handover.all_items_returned ? '✓ Yes' : '✗ No'}</strong></div>
              {handover.technician_name && <div style={{ fontSize: '11px' }}>Released by: <strong>{handover.technician_name}</strong></div>}
            </div>
          </div>
        </div>
      )}

      {/* Approval Signatures */}
      <div style={{ marginBottom: '6mm' }}>
        <div style={SECTION_TITLE}>Approval Signatures</div>
        <div style={{ display: 'flex', gap: '12mm', marginTop: '4mm' }}>
          {['Cashier / Accounting', 'Service Advisor', 'Customer', 'Security Guard'].map(label => (
            <div key={label} style={{ ...SIG_LINE, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <div style={{ paddingTop: '18mm' }} />
              <div style={{ borderTop: '1px solid #000', width: '85%', margin: '0 auto' }} />
              <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600' }}>{label}</div>
              <div style={{ fontSize: '9px', color: '#94a3b8' }}>Signature / Date</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '4mm', marginTop: '6mm' }}>
        <div><strong>Guard:</strong> Verify all signatures are complete before releasing vehicle.</div>
        <div>Printed: {new Date().toLocaleString()}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// Main Component – Modal + Print All
// ════════════════════════════════════════════════════════
export default function ServiceDocumentBundle({ serviceOrderId, onClose, companyName = 'Rapide Auto Service Center' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    if (!serviceOrderId) return;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchJson(`/api/records/service-orders/${serviceOrderId}/details`);
        if (res.success === false) {
          setError(res.error || 'Failed to load service order details');
        } else {
          setData(res.data || res);
        }
      } catch (e) {
        setError(e.message || 'Network error');
      }
      setLoading(false);
    })();
  }, [serviceOrderId]);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head>
      <title>Documents – SO-${String(serviceOrderId).padStart(5, '0')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; flex-direction: column; align-items: center; }
        @page { size: landscape; margin: 6mm; }
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      </style>
    </head><body>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  // ── Modal UI ──
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', overflow: 'hidden',
        width: '95%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', background: '#1e40af', color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>📄 Print All Documents</div>
            <div style={{ fontSize: '13px', opacity: 0.85 }}>SO-{String(serviceOrderId).padStart(5, '0')} — 4 pages (landscape)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '26px', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', background: '#f1f5f9' }}>
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Loading service order details…
            </div>
          )}
          {error && (
            <div style={{ padding: '24px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          {data && (
            <div ref={printRef} style={{ transform: 'scale(0.48)', transformOrigin: 'top center', width: '279mm' }}>
              <PageServiceOrder order={data.order} work={data.work} parts={data.parts} companyName={companyName} />
              <PageVRC order={data.order} vrc={data.vrc} qcInspection={data.qc_inspection} roadTest={data.road_test} companyName={companyName} />
              <PageBilling order={data.order} invoice={data.invoice} parts={data.parts} companyName={companyName} />
              <PageGatepass order={data.order} gatepass={data.gatepass} handover={data.handover} companyName={companyName} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '12px 24px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0',
            borderRadius: '8px', fontWeight: '600', cursor: 'pointer',
          }}>
            Close
          </button>
          <button onClick={handlePrint} disabled={!data} style={{
            padding: '12px 28px', background: data ? '#1e40af' : '#94a3b8', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: '700', cursor: data ? 'pointer' : 'not-allowed',
            fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            🖨️ Print All Documents
          </button>
        </div>
      </div>
    </div>
  );
}
