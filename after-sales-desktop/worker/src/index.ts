type Env = {
  DB: D1Database;
};

const ROLE_ALIASES: Record<string, string> = {
  job_controller: 'controller',
  service_advisor: 'advisor',
  'service-advisor': 'advisor',
  'vehicle-handover': 'vehicle_handover',
  'security-gate': 'security_gate',
  'follow-up': 'follow_up'
};

const ALLOWED_ROLES = new Set([
  'admin',
  'cro',
  'technician',
  'warehouse',
  'manager',
  'advisor',
  'controller',
  'foreman',
  'wrapup',
  'jockey',
  'billing',
  'cashier',
  'security_gate',
  'vehicle_handover',
  'follow_up',
  'records'
]);

function withCors(request: Request, headers: Headers) {
  const origin = request.headers.get('Origin');
  headers.set('Access-Control-Allow-Origin', origin ?? '*');
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  
  const reqHeaders = request.headers.get('Access-Control-Request-Headers');
  if (reqHeaders) {
    headers.set('Access-Control-Allow-Headers', reqHeaders);
  } else {
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Username, X-Admin-Password, Accept, Origin');
  }
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  withCors(request, headers);
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeRole(role: unknown) {
  const raw = String(role ?? '').trim().toLowerCase();
  return ROLE_ALIASES[raw] ?? raw;
}

function isAdmin(request: Request) {
  const role = request.headers.get('X-User-Role');
  return role === 'admin';
}

async function isAdminAuth(request: Request, env: Env): Promise<boolean> {
  const u = request.headers.get('X-Admin-Username');
  const p = request.headers.get('X-Admin-Password');
  if (!u || !p) return false;
  const row = await env.DB.prepare(
    `SELECT id FROM personnel WHERE username = ?1 AND password = ?2 AND role = 'admin' AND status = 'active' LIMIT 1`
  ).bind(u, p).first();
  return !!row;
}

function getAdminId(request: Request): number | null {
  const raw = request.headers.get('X-Admin-Id');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function toInt(value: unknown, fallback: number | null = null) {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function toFloat(value: unknown, fallback: number | null = null) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function ok(request: Request, data: any = null, extra: Record<string, unknown> = {}) {
  return jsonResponse(request, { success: true, data, ...extra });
}

function fail(request: Request, status: number, error: string) {
  return jsonResponse(request, { success: false, error }, status);
}

function pad5(n: number) {
  return String(n).padStart(5, '0');
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeChecklistVal(val: unknown) {
  const s = String(val ?? '').toLowerCase().trim();
  if (s === 'passed' || s === 'pass') return 'pass';
  // map needs_attention to fail for now as DB defines only pass/fail/na
  if (s === 'failed' || s === 'fail' || s === 'needs_attention') return 'fail';
  return 'na';
}

async function d1FirstId(result: D1Result) {
  const meta: any = (result as any)?.meta;
  return meta?.last_row_id ?? meta?.lastRowId ?? null;
}

// ==================== HTML PAGE GENERATORS ====================

function generateTrackingSearchHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Track Your Vehicle | Rapide Auto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 8px; }
    .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
    .input-group { position: relative; margin-bottom: 20px; }
    input {
      width: 100%;
      padding: 16px 20px;
      font-size: 18px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      outline: none;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-align: center;
    }
    input:focus { border-color: #667eea; }
    button {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(102,126,234,0.4); }
    button:active { transform: translateY(0); }
    .footer { margin-top: 24px; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🚗</div>
    <h1>Track Your Vehicle</h1>
    <p class="subtitle">Enter your plate number to see real-time service status</p>
    <form action="/track" method="GET">
      <div class="input-group">
        <input type="text" name="code" placeholder="ABC 1234" required autocomplete="off" />
      </div>
      <button type="submit">🔍 Track Now</button>
    </form>
    <p class="footer">Powered by Rapide Auto Service</p>
  </div>
</body>
</html>`;
}

function generateTrackingHTML(code: string, data: any): string {
  if (!data.success) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Vehicle Not Found | Rapide Auto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 40px 30px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .emoji { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #1f2937; font-size: 22px; margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 24px; line-height: 1.5; }
    .code { font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 8px 16px; border-radius: 8px; display: inline-block; margin-bottom: 24px; }
    a {
      display: inline-block;
      padding: 14px 28px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="emoji">🔍</div>
    <h1>Vehicle Not Found</h1>
    <div class="code">${code}</div>
    <p>We couldn't find a vehicle with this plate number. Please check and try again.</p>
    <a href="/track">← Try Again</a>
  </div>
</body>
</html>`;
  }

  const { vehicle, customer_name, service_type, current_step, total_steps, timeline, is_ready, is_completed } = data.data;
  const progress = Math.round((current_step / total_steps) * 100);
  
  let statusText = 'In Progress';
  let statusColor = '#667eea';
  let statusEmoji = '🔧';
  if (is_completed) {
    statusText = 'Completed';
    statusColor = '#10b981';
    statusEmoji = '✅';
  } else if (is_ready) {
    statusText = 'Ready for Pickup!';
    statusColor = '#10b981';
    statusEmoji = '🎉';
  }

  const timelineHtml = (timeline || []).map((step: any) => {
    let stepClass = 'pending';
    let lineClass = '';
    if (step.status === 'completed') {
      stepClass = 'completed';
      lineClass = 'completed';
    } else if (step.status === 'current') {
      stepClass = 'current';
    }
    
    const time = step.timestamp ? new Date(step.timestamp).toLocaleString('en-PH', { 
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true 
    }) : '';

    return `
      <div class="timeline-item ${stepClass}">
        <div class="timeline-icon">${step.icon}</div>
        <div class="timeline-content">
          <div class="timeline-title">${step.title}</div>
          <div class="timeline-desc">${step.description}</div>
          ${time ? `<div class="timeline-time">${time}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Tracking ${vehicle.plate_number} | Rapide Auto</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      min-height: 100vh;
      padding-bottom: 80px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      color: white;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
    .back-btn { color: white; text-decoration: none; font-size: 24px; }
    .plate {
      background: rgba(255,255,255,0.2);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 2px;
    }
    .vehicle-info { font-size: 14px; opacity: 0.9; margin-bottom: 12px; }
    .progress-bar {
      background: rgba(255,255,255,0.3);
      border-radius: 10px;
      height: 8px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: white;
      border-radius: 10px;
      transition: width 0.5s ease;
    }
    .progress-text { font-size: 12px; margin-top: 8px; opacity: 0.8; }
    
    .status-banner {
      background: ${statusColor};
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
    }
    .status-emoji { font-size: 28px; }
    
    .content { padding: 20px; }
    
    .timeline { display: flex; flex-direction: column; }
    .timeline-item {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      position: relative;
    }
    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 20px;
      top: 52px;
      bottom: 0;
      width: 2px;
      background: #e5e7eb;
    }
    .timeline-item.completed:not(:last-child)::after { background: #10b981; }
    
    .timeline-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      z-index: 1;
    }
    .timeline-item.completed .timeline-icon { background: #d1fae5; }
    .timeline-item.current .timeline-icon { 
      background: #667eea; 
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.4); }
      50% { box-shadow: 0 0 0 10px rgba(102,126,234,0); }
    }
    
    .timeline-content { flex: 1; padding-top: 4px; }
    .timeline-title { font-weight: 600; color: #1f2937; margin-bottom: 4px; }
    .timeline-item.pending .timeline-title { color: #9ca3af; }
    .timeline-desc { font-size: 13px; color: #6b7280; }
    .timeline-item.pending .timeline-desc { color: #d1d5db; }
    .timeline-time { font-size: 11px; color: #9ca3af; margin-top: 4px; }
    
    .refresh-btn {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 14px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 50px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(102,126,234,0.4);
    }
    .refresh-btn:active { transform: translateX(-50%) scale(0.95); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <a href="/track" class="back-btn">←</a>
      <div class="plate">${vehicle.plate_number}</div>
    </div>
    <div class="vehicle-info">
      ${vehicle.make} ${vehicle.model} - ${vehicle.color || 'N/A'}<br>
      Hi ${customer_name}! - ${service_type || 'General Service'}
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    <div class="progress-text">Step ${current_step} of ${total_steps}</div>
  </div>
  
  <div class="status-banner">
    <span class="status-emoji">${statusEmoji}</span>
    <span>${statusText}</span>
  </div>
  
  <div class="content">
    <div class="timeline">
      ${timelineHtml}
    </div>
  </div>
  
  <button class="refresh-btn" onclick="location.reload()">Refresh Status</button>
</body>
</html>`;
}

// Helper function to get tracking data
async function getTrackingData(env: Env, trackingCode: string): Promise<{ success: boolean; data?: any; error?: string }> {
  // Query with correct column names from actual schema
  const so = await env.DB.prepare(`
    SELECT 
      so.id, so.status, so.vehicle_plate_no, so.service_type, so.created_at,
      c.name as customer_name, c.vehicle_model, c.plate_no,
      sch.scheduled_date, sch.scheduled_time
    FROM service_orders so
    LEFT JOIN customers c ON so.customer_id = c.id
    LEFT JOIN scheduling_orders sch ON so.scheduling_order_id = sch.id
    WHERE UPPER(REPLACE(so.vehicle_plate_no, '-', '')) = REPLACE(?1, '-', '')
       OR UPPER(REPLACE(c.plate_no, '-', '')) = REPLACE(?1, '-', '')
       OR so.id = CAST(?1 AS INTEGER)
    ORDER BY so.created_at DESC
    LIMIT 1
  `).bind(trackingCode.toUpperCase()).first<any>();

  if (!so) {
    return { success: false, error: 'Vehicle not found' };
  }

  const events: any[] = [];

  // 1. Check-in
  events.push({
    step: 1, icon: '🚗', title: 'Vehicle Received',
    description: 'Your vehicle has been received at our service center',
    status: 'completed', timestamp: so.created_at
  });

  // 2. VRC Inspection
  let vrc: any = null;
  try {
    vrc = await env.DB.prepare('SELECT created_at FROM vehicle_report_cards WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  events.push({
    step: 2, icon: '📋', title: 'Vehicle Inspection',
    description: vrc ? 'Initial condition documented' : 'Inspecting vehicle condition',
    status: vrc ? 'completed' : (so.status === 'checked-in' ? 'current' : 'pending'),
    timestamp: vrc?.created_at
  });

  // 3. Technician Assignment - join with technicians to get name
  let assignment: any = null;
  try {
    assignment = await env.DB.prepare(`
      SELECT jca.assigned_at, t.name as technician_name 
      FROM job_controller_assignments jca
      LEFT JOIN technicians t ON jca.technician_id = t.id
      WHERE jca.service_order_id=?1
    `).bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  events.push({
    step: 3, icon: '👨‍🔧', title: 'Technician Assigned',
    description: assignment ? `Assigned to ${assignment.technician_name || 'our technician'}` : 'Assigning technician',
    status: assignment ? 'completed' : 'pending',
    timestamp: assignment?.assigned_at
  });

  // 4. Work In Progress - use job_controller_assignments which has clock_in/out
  let clockIn: any = null;
  try {
    clockIn = await env.DB.prepare('SELECT clock_in_time, clock_out_time FROM job_controller_assignments WHERE service_order_id=?1 ORDER BY assigned_at DESC LIMIT 1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  let workStatus = 'pending', workDesc = 'Waiting to start';
  if (clockIn?.clock_out_time) { workStatus = 'completed'; workDesc = 'Service work completed'; }
  else if (clockIn?.clock_in_time) { workStatus = 'current'; workDesc = 'Technician is working on your vehicle'; }
  events.push({ step: 4, icon: '🔧', title: 'Service In Progress', description: workDesc, status: workStatus, timestamp: clockIn?.clock_in_time });

  // 5. Parts Request - use car_jockey_parts_requests (wrapped in try-catch for robustness)
  let partsReq: any = null;
  try {
    partsReq = await env.DB.prepare('SELECT id, created_at FROM car_jockey_parts_requests WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist or have different schema */ }
  if (partsReq) {
    events.push({ step: 4.5, icon: '📦', title: 'Parts Delivery', description: 'Parts requested', status: 'completed', timestamp: partsReq.created_at, isOptional: true });
  }

  // 6. QC - use overall_status (from migration 0007)
  let qc: any = null;
  try {
    qc = await env.DB.prepare('SELECT overall_status, created_at FROM qc_inspections WHERE service_order_id=?1 ORDER BY created_at DESC LIMIT 1').bind(so.id).first<any>();
  } catch { /* table may have different schema */ }
  let qcStatus = 'pending', qcDesc = 'Awaiting quality inspection';
  if (qc?.overall_status === 'passed') { qcStatus = 'completed'; qcDesc = 'Quality inspection passed ✓'; }
  else if (qc?.overall_status === 'failed' || qc?.overall_status === 'rework-required') { qcStatus = 'issue'; qcDesc = 'Additional work needed'; }
  else if (qc) { qcStatus = 'current'; qcDesc = 'Quality check in progress'; }
  events.push({ step: 5, icon: '✅', title: 'Quality Check', description: qcDesc, status: qcStatus, timestamp: qc?.created_at });

  // 7. Job Wrapup - check if record exists
  let wrapup: any = null;
  try {
    wrapup = await env.DB.prepare('SELECT id, created_at FROM job_wrapups WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  events.push({ step: 6, icon: '📝', title: 'Service Summary', description: wrapup ? 'Work summary prepared' : 'Preparing service summary', status: wrapup ? 'completed' : (qc?.overall_status === 'passed' ? 'current' : 'pending'), timestamp: wrapup?.created_at });

  // 8. Billing - use billing_invoices
  let invoice: any = null;
  try {
    invoice = await env.DB.prepare('SELECT id, total_amount, created_at FROM billing_invoices WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  events.push({ step: 7, icon: '🧾', title: 'Bill Prepared', description: invoice ? `Invoice ready - ₱${Number(invoice.total_amount || 0).toLocaleString()}` : 'Preparing your bill', status: invoice ? 'completed' : (wrapup ? 'current' : 'pending'), timestamp: invoice?.created_at });

  // 9. Payment - use billing_payments (join with invoice)
  let payment: any = null;
  try {
    payment = invoice ? await env.DB.prepare('SELECT payment_amount, payment_method, created_at FROM billing_payments WHERE invoice_id=?1').bind(invoice.id).first<any>() : null;
  } catch { /* table may not exist */ }
  events.push({ step: 8, icon: '💳', title: 'Payment', description: payment ? `Paid via ${payment.payment_method || 'cash'}` : 'Awaiting payment', status: payment ? 'completed' : (invoice ? 'current' : 'pending'), timestamp: payment?.created_at });

  // 10. Vehicle Handover - uses handover_date not created_at
  let handover: any = null;
  try {
    handover = await env.DB.prepare('SELECT handover_date, updated_at, handover_status FROM vehicle_handovers WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  const isHandedOver = handover?.handover_status === 'completed';
  events.push({ step: 9, icon: '🔑', title: 'Vehicle Handover', description: isHandedOver ? 'Vehicle returned to you' : (payment ? 'Ready for pickup!' : 'Pending payment'), status: isHandedOver ? 'completed' : (payment ? 'current' : 'pending'), timestamp: handover?.updated_at || handover?.handover_date });

  // 11. Gate Pass
  let gatepass: any = null;
  try {
    gatepass = await env.DB.prepare('SELECT created_at FROM gatepasses WHERE service_order_id=?1').bind(so.id).first<any>();
  } catch { /* table may not exist */ }
  events.push({ step: 10, icon: '🚪', title: 'Gate Pass', description: gatepass ? 'Vehicle released' : (isHandedOver ? 'Ready to exit' : 'Pending'), status: gatepass ? 'completed' : (isHandedOver ? 'current' : 'pending'), timestamp: gatepass?.created_at });

  const timeline = events.filter(e => !e.isOptional || e.status !== 'pending').sort((a, b) => a.step - b.step);
  let currentStep = 1;
  for (const ev of timeline) {
    if (ev.status === 'current') { currentStep = Math.floor(ev.step); break; }
    if (ev.status === 'completed') { currentStep = Math.floor(ev.step) + 1; }
  }

  return {
    success: true,
    data: {
      vehicle: { plate_number: so.vehicle_plate_no || so.plate_no, make: '', model: so.vehicle_model || '', color: '' },
      customer_name: so.customer_name || 'Valued Customer',
      service_type: so.service_type,
      scheduled_date: so.scheduled_date,
      scheduled_time: so.scheduled_time,
      status: so.status,
      is_ready: payment && !isHandedOver,
      is_completed: !!gatepass,
      current_step: currentStep,
      total_steps: 10,
      timeline,
      checked_in_at: so.created_at
    }
  };
}

// ==================== REAL-TIME EVENT SYSTEM ====================
// Connected SSE clients - stored in memory (per worker instance)
// For multi-instance, consider Durable Objects or external pub/sub
const sseClients = new Set<WritableStreamDefaultWriter>();

interface RealtimeEvent {
  type: string;
  module: string;
  action: string;
  data?: any;
  timestamp: string;
}

function broadcastEvent(event: RealtimeEvent) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);
  
  sseClients.forEach(writer => {
    try {
      writer.write(encoded).catch(() => {
        // Client disconnected, will be cleaned up
      });
    } catch {
      // Ignore write errors
    }
  });
}

function emitEvent(module: string, action: string, data?: any) {
  broadcastEvent({
    type: 'update',
    module,
    action,
    data,
    timestamp: new Date().toISOString()
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      const headers = new Headers();
      withCors(request, headers);
      return new Response(null, { status: 204, headers });
    }

    try {
    if (url.pathname === '/api/health') {
      return jsonResponse(request, { success: true, status: 'ok' });
    }

    // ==================== SERVER-SENT EVENTS (REAL-TIME) ====================
    if (url.pathname === '/api/events/stream' && request.method === 'GET') {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      // Add to connected clients
      sseClients.add(writer);

      // Send initial connection message
      const connectMsg = `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`;
      writer.write(encoder.encode(connectMsg));

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`;
          writer.write(encoder.encode(ping)).catch(() => {
            clearInterval(heartbeat);
            sseClients.delete(writer);
          });
        } catch {
          clearInterval(heartbeat);
          sseClients.delete(writer);
        }
      }, 30000); // Ping every 30 seconds

      // Cleanup when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        sseClients.delete(writer);
        writer.close().catch(() => {});
      });

      const headers = new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      withCors(request, headers);

      return new Response(readable, { headers });
    }

    // ==================== SECURITY GATE ====================
    if (url.pathname === '/api/security-gate/logs/entries' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const date = url.searchParams.get('date') ?? todayISODate();
      const day = isIsoDate(date) ? date : todayISODate();

      const rs = await env.DB
        .prepare(
          `SELECT
             created_at as time,
             vehicle_plate_no as plate_no,
             customer_name as customer,
             gate_operator_id as operator,
             authorized
           FROM security_gate_access_logs
           WHERE access_type='entry' AND substr(created_at, 1, 10) = ?1 AND admin_id = ?2
           ORDER BY created_at DESC`
        )
        .bind(day, adminId)
        .all<any>();

      return jsonResponse(request, { success: true, data: rs.results ?? [] });
    }

    if (url.pathname === '/api/security-gate/logs/exits' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const date = url.searchParams.get('date') ?? todayISODate();
      const day = isIsoDate(date) ? date : todayISODate();

      const rs = await env.DB
        .prepare(
          `SELECT
             created_at as time,
             vehicle_plate_no as plate_no,
             customer_name as customer,
             gate_operator_id as operator,
             authorized
           FROM security_gate_access_logs
           WHERE access_type='exit' AND substr(created_at, 1, 10) = ?1 AND admin_id = ?2
           ORDER BY created_at DESC`
        )
        .bind(day, adminId)
        .all<any>();

      return jsonResponse(request, { success: true, data: rs.results ?? [] });
    }

    if (url.pathname === '/api/security-gate/badges/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, service_order_id, vehicle_plate_no, customer_name, customer_id,
                  issued_at, expiry_at, badge_type, status, scan_count
           FROM security_gate_badges
           WHERE status='active' AND admin_id = ?1
           ORDER BY issued_at DESC`
        )
        .bind(adminId)
        .all<any>();

      return jsonResponse(request, { success: true, data: rs.results ?? [], badges: rs.results ?? [] });
    }

    if (url.pathname === '/api/security-gate/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const day = todayISODate();

      const entries = await env.DB
        .prepare(
          `SELECT COUNT(*) as n, SUM(CASE WHEN authorized=0 THEN 1 ELSE 0 END) as denied
           FROM security_gate_access_logs
           WHERE access_type='entry' AND substr(created_at,1,10)=?1 AND admin_id = ?2`
        )
        .bind(day, adminId)
        .first<any>();
      const exits = await env.DB
        .prepare(
          `SELECT COUNT(*) as n, SUM(CASE WHEN authorized=0 THEN 1 ELSE 0 END) as denied
           FROM security_gate_access_logs
           WHERE access_type='exit' AND substr(created_at,1,10)=?1 AND admin_id = ?2`
        )
        .bind(day, adminId)
        .first<any>();

      const total_entries = Number(entries?.n ?? 0);
      const total_exits = Number(exits?.n ?? 0);
      const denied_entries = Number(entries?.denied ?? 0);
      const denied_exits = Number(exits?.denied ?? 0);

      const summary = {
        total_entries,
        total_exits,
        denied_entries,
        denied_exits,
        vehicles_processed: Math.max(0, total_entries - total_exits)
      };

      return jsonResponse(request, { success: true, data: summary, summary });
    }

    if (url.pathname === '/api/security-gate/badges/issue' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const serviceOrderId = toInt(data.service_order_id, null);
      const vehiclePlate = String(data.vehicle_plate_no ?? '').trim();
      const customerName = String(data.customer_name ?? '').trim();
      const customerId = toInt(data.customer_id, null);
      const issuedBy = toInt(data.issued_by, null);
      const expiryDays = Math.max(1, toInt(data.expiry_days, 1) ?? 1);

      if (!vehiclePlate) return fail(request, 400, 'vehicle_plate_no is required');

      const result = await env.DB
        .prepare(
          `INSERT INTO security_gate_badges
           (service_order_id, vehicle_plate_no, customer_name, customer_id, issued_by, issued_at, expiry_at, badge_type, status, scan_count, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, datetime('now', ?6), 'vehicle', 'active', 0, ?7)`
        )
        .bind(serviceOrderId, vehiclePlate, customerName || null, customerId, issuedBy, `+${expiryDays} day`, adminId)
        .run();

      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, badge_id: id, message: 'Badge issued' }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/security-gate\/badges\/(\d+)\/revoke$/);
      if (m && request.method === 'POST') {
        const badgeId = toInt(m[1], null);
        if (!badgeId) return fail(request, 400, 'Invalid badge id');
        await env.DB
          .prepare(`UPDATE security_gate_badges SET status='revoked', revoked_at=CURRENT_TIMESTAMP WHERE id=?1`)
          .bind(badgeId)
          .run();
        return ok(request, null, { message: 'Badge revoked' });
      }
    }

    if (url.pathname === '/api/security-gate/access/log' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const serviceOrderId = toInt(data.service_order_id, null);
      const vehiclePlate = String(data.vehicle_plate_no ?? '').trim();
      const customerName = String(data.customer_name ?? '').trim();
      const accessType = String(data.access_type ?? '').trim();
      const operatorId = toInt(data.gate_operator_id, null);

      if (!vehiclePlate) return fail(request, 400, 'vehicle_plate_no is required');
      if (!['entry', 'exit'].includes(accessType)) return fail(request, 400, 'access_type must be entry or exit');

      // Simple authorization rule: if there is an active badge for the plate, authorize.
      const badge = await env.DB
        .prepare(
          `SELECT id
           FROM security_gate_badges
           WHERE status='active'
             AND vehicle_plate_no=?1
             AND (expiry_at IS NULL OR expiry_at >= CURRENT_TIMESTAMP)
           LIMIT 1`
        )
        .bind(vehiclePlate)
        .first<any>();
      const authorized = badge ? 1 : 0;

      await env.DB
        .prepare(
          `INSERT INTO security_gate_access_logs
           (service_order_id, vehicle_plate_no, customer_name, access_type, gate_operator_id, authorized, created_at, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, ?7)`
        )
        .bind(serviceOrderId, vehiclePlate, customerName || null, accessType, operatorId, authorized, adminId)
        .run();

      if (badge) {
        await env.DB
          .prepare(`UPDATE security_gate_badges SET scan_count = scan_count + 1 WHERE id=?1`)
          .bind(badge.id)
          .run();
      }

      return ok(request, null, { authorized: Boolean(authorized) });
    }

    // Gatepass validation for exit (per spec: Security Gate checks signed gatepass)
    if (url.pathname === '/api/security-gate/gatepass/validate' && request.method === 'POST') {
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      
      const gatepassId = toInt(data.gatepass_id, null);
      const vehiclePlate = String(data.vehicle_plate_no ?? '').trim();
      
      if (!gatepassId && !vehiclePlate) return fail(request, 400, 'gatepass_id or vehicle_plate_no is required');

      let gatepass: any = null;
      if (gatepassId) {
        gatepass = await env.DB
          .prepare(
            `SELECT g.id, g.service_order_id, g.customer_id, g.status,
                    COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                    c.name as customer_name,
                    (SELECT COUNT(*) FROM gatepass_signatures gs WHERE gs.gatepass_id = g.id) as signature_count
             FROM gatepasses g
             LEFT JOIN service_orders so ON so.id = g.service_order_id
             LEFT JOIN customers c ON c.id = g.customer_id
             WHERE g.id = ?1`
          )
          .bind(gatepassId)
          .first<any>();
      } else if (vehiclePlate) {
        // Find latest gatepass for this plate
        gatepass = await env.DB
          .prepare(
            `SELECT g.id, g.service_order_id, g.customer_id, g.status,
                    COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                    c.name as customer_name,
                    (SELECT COUNT(*) FROM gatepass_signatures gs WHERE gs.gatepass_id = g.id) as signature_count
             FROM gatepasses g
             LEFT JOIN service_orders so ON so.id = g.service_order_id
             LEFT JOIN customers c ON c.id = g.customer_id
             WHERE (so.vehicle_plate_no = ?1 OR c.plate_no = ?1)
               AND g.status = 'approved'
             ORDER BY g.created_at DESC
             LIMIT 1`
          )
          .bind(vehiclePlate)
          .first<any>();
      }

      if (!gatepass) {
        return jsonResponse(request, { success: false, valid: false, message: 'Gatepass not found' });
      }

      const isValid = gatepass.status === 'approved' && gatepass.signature_count > 0;
      return jsonResponse(request, {
        success: true,
        valid: isValid,
        gatepass: {
          id: gatepass.id,
          status: gatepass.status,
          plate_no: gatepass.plate_no,
          customer_name: gatepass.customer_name,
          signed: gatepass.signature_count > 0
        },
        message: isValid ? 'Gatepass valid - exit authorized' : 'Gatepass not signed or not approved'
      });
    }

    // ==================== VEHICLE HANDOVER ====================
    if (url.pathname === '/api/vehicle-handover/handovers/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      // Self-healing: Ensure all eligible service orders have a handover record
      try {
        await env.DB.prepare(`
          INSERT INTO vehicle_handovers (service_order_id, customer_id, job_wrapup_id, technician_id, handover_status, handover_date, admin_id)
          SELECT 
            so.id, 
            so.customer_id, 
            (SELECT id FROM job_wrapups WHERE service_order_id = so.id ORDER BY id DESC LIMIT 1),
            (SELECT technician_id FROM job_wrapups WHERE service_order_id = so.id ORDER BY id DESC LIMIT 1),
            'pending',
            DATE('now'),
            ?1
          FROM service_orders so
          WHERE so.status IN ('billed', 'ready-for-billing', 'qc-passed', 'job-completed')
            AND so.id NOT IN (SELECT service_order_id FROM vehicle_handovers WHERE service_order_id IS NOT NULL)
        `).bind(adminId).run();
      } catch (e) {
        // Ignore duplicate errors or constraint violations during self-healing
        console.error('Self-healing handover error:', e);
      }

      const rs = await env.DB
        .prepare(
          `SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, vh.customer_id, vh.final_inspection_notes, vh.handover_status,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_number, c.name as customer_name, so.service_type, c.vehicle_model as model
           FROM vehicle_handovers vh
           LEFT JOIN service_orders so ON vh.service_order_id = so.id
           LEFT JOIN customers c ON vh.customer_id = c.id
           WHERE vh.handover_status='pending' AND vh.admin_id = ?1
           ORDER BY vh.handover_date DESC, vh.id DESC`
        )
        .bind(adminId)
        .all<any>();
      
      const handovers = (rs.results ?? []).map((r: any) => [
        r.id,
        r.service_order_id,
        r.handover_date,
        r.technician_id,
        r.customer_name || r.customer_id, // Index 4: Prefer name, fallback to ID
        r.final_inspection_notes,
        r.handover_status,
        r.plate_number, // Extra columns for modern UI
        r.customer_name,
        r.service_type,
        r.model
      ]);
      return jsonResponse(request, { success: true, data: handovers, handovers });
    }

    // List completed handovers
    if (url.pathname === '/api/vehicle-handover/handovers/completed' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT vh.id, vh.service_order_id, vh.handover_date, vh.technician_id, vh.customer_id, vh.final_inspection_notes, vh.handover_status,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_number, c.name as customer_name, so.service_type, c.vehicle_model as model,
                  vh.updated_at as completed_at, vh.vehicle_cleanliness, vh.fuel_level_final, vh.mileage_final
           FROM vehicle_handovers vh
           LEFT JOIN service_orders so ON vh.service_order_id = so.id
           LEFT JOIN customers c ON vh.customer_id = c.id
           WHERE vh.handover_status='completed' AND vh.admin_id = ?1
           ORDER BY vh.updated_at DESC, vh.id DESC
           LIMIT 100`
        )
        .bind(adminId)
        .all<any>();
      
      const handovers = (rs.results ?? []).map((r: any) => [
        r.id,
        r.service_order_id,
        r.handover_date,
        r.technician_id,
        r.customer_name || r.customer_id,
        r.final_inspection_notes,
        r.handover_status,
        r.plate_number,
        r.customer_name,
        r.service_type,
        r.model,
        r.completed_at,
        r.vehicle_cleanliness,
        r.fuel_level_final,
        r.mileage_final
      ]);
      return jsonResponse(request, { success: true, data: handovers, handovers });
    }

    // Search service orders eligible for manual handover creation
    if (url.pathname === '/api/vehicle-handover/eligible-orders' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id, so.status, so.service_type, so.vehicle_plate_no,
                  c.name as customer_name, c.vehicle_model as model
           FROM service_orders so
           LEFT JOIN customers c ON so.customer_id = c.id
           WHERE so.status IN ('billed', 'qc-passed', 'job-completed', 'completed')
             AND so.id NOT IN (SELECT service_order_id FROM vehicle_handovers vh2 WHERE vh2.handover_status='pending')
             AND so.admin_id = ?1
           ORDER BY so.id DESC
           LIMIT 50`
        )
        .bind(adminId)
        .all<any>();
      return jsonResponse(request, { success: true, data: rs.results ?? [] });
    }

    // Create vehicle handover (typically after job wrapup or when car jockey moves vehicle to release bay)
    if (url.pathname === '/api/vehicle-handover/handovers' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');

      // Get customer_id from service_order if not provided
      let customerId = toInt(data.customer_id, null);
      if (!customerId) {
        const so = await env.DB
          .prepare(`SELECT customer_id FROM service_orders WHERE id=?1`)
          .bind(serviceOrderId)
          .first<any>();
        customerId = so?.customer_id || null;
      }

      const result = await env.DB
        .prepare(
          `INSERT INTO vehicle_handovers
           (service_order_id, job_wrapup_id, customer_id, technician_id, handover_date, final_inspection_notes, handover_status, admin_id)
           VALUES (?1, ?2, ?3, ?4, COALESCE(?5, DATE('now')), ?6, 'pending', ?7)`
        )
        .bind(
          serviceOrderId,
          toInt(data.job_wrapup_id, null),
          customerId,
          toInt(data.technician_id, null),
          data.handover_date ? String(data.handover_date).trim() : null,
          String(data.inspection_notes ?? '').trim() || null,
          adminId
        )
        .run();

      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, handover_id: id, message: 'Vehicle handover created' }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)$/);
      if (m && request.method === 'GET') {
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, 'Invalid handover id');

        const handover = await env.DB
          .prepare(
            `SELECT id, service_order_id, job_wrapup_id, handover_date, technician_id, customer_id,
                    final_inspection_notes, vehicle_cleanliness, fuel_level_final, mileage_final,
                    overall_condition, all_items_returned, handover_status
             FROM vehicle_handovers
             WHERE id=?1`
          )
          .bind(handoverId)
          .first<any>();
        if (!handover) return fail(request, 404, 'Handover not found');

        const itemsRs = await env.DB
          .prepare(
            `SELECT id, item_type, item_description, quantity, condition_before, condition_after,
                    item_verified, verified_by
             FROM handover_items
             WHERE handover_id=?1
             ORDER BY id ASC`
          )
          .bind(handoverId)
          .all<any>();

        const sigRs = await env.DB
          .prepare(
            `SELECT id, signatory_type, signatory_name, signatory_role, created_at as signature_timestamp, printed_name
             FROM handover_signatures
             WHERE handover_id=?1
             ORDER BY id ASC`
          )
          .bind(handoverId)
          .all<any>();

        const details = {
          handover: [
            handover.id,
            handover.service_order_id,
            handover.job_wrapup_id,
            handover.handover_date,
            handover.technician_id,
            handover.customer_id,
            handover.final_inspection_notes,
            handover.vehicle_cleanliness,
            handover.fuel_level_final,
            handover.mileage_final,
            handover.overall_condition,
            handover.all_items_returned,
            handover.handover_status
          ],
          items: (itemsRs.results ?? []).map((it: any) => [
            it.id,
            it.item_type,
            it.item_description,
            it.quantity,
            it.condition_before,
            it.condition_after,
            it.item_verified,
            it.verified_by
          ]),
          signatures: (sigRs.results ?? []).map((s: any) => [
            s.id,
            s.signatory_type,
            s.signatory_name,
            s.signatory_role,
            s.signature_timestamp,
            s.printed_name
          ])
        };

        return jsonResponse(request, { success: true, data: details, details });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/items$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, 'Invalid handover id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        const itemType = String(data.item_type ?? '').trim();
        const itemDesc = String(data.item_description ?? '').trim();
        const qty = Math.max(1, toInt(data.quantity, 1) ?? 1);
        const conditionBefore = String(data.condition_before ?? '').trim();
        if (!itemType || !itemDesc) return fail(request, 400, 'item_type and item_description are required');

        const result = await env.DB
          .prepare(
            `INSERT INTO handover_items
             (handover_id, item_type, item_description, quantity, condition_before, item_verified, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, CURRENT_TIMESTAMP, ?6)`
          )
          .bind(handoverId, itemType, itemDesc, qty, conditionBefore || null, adminId)
          .run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, item_id: id }, 201);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/items\/(\d+)\/verify$/);
      if (m && request.method === 'POST') {
        const itemId = toInt(m[2], null);
        if (!itemId) return fail(request, 400, 'Invalid item id');
        const data = await readJson<any>(request);
        const conditionAfter = String(data?.condition_after ?? '').trim();
        const verifiedBy = toInt(data?.verified_by, null);
        await env.DB
          .prepare(
            `UPDATE handover_items
             SET item_verified=1, condition_after=?1, verified_by=?2
             WHERE id=?3`
          )
          .bind(conditionAfter || null, verifiedBy, itemId)
          .run();
        return ok(request, null, { message: 'Item verified' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/signatures$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, 'Invalid handover id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        const signatoryType = String(data.signatory_type ?? '').trim();
        const signatoryName = String(data.signatory_name ?? '').trim();
        const signatoryRole = String(data.signatory_role ?? '').trim();
        const printedName = String(data.printed_name ?? '').trim();
        const signatureImage = data.signature_image ?? null;

        if (!signatoryType || !signatoryName) return fail(request, 400, 'signatory_type and signatory_name are required');

        const result = await env.DB
          .prepare(
            `INSERT INTO handover_signatures
             (handover_id, signatory_type, signatory_name, signatory_role, printed_name, signature_image, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP, ?7)`
          )
          .bind(handoverId, signatoryType, signatoryName, signatoryRole || null, printedName || null, signatureImage, adminId)
          .run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, signature_id: id }, 201);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/complete$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, 'Invalid handover id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');

        // First, get the handover record to retrieve service_order_id and customer_id
        const handover = await env.DB
          .prepare(`SELECT service_order_id, customer_id FROM vehicle_handovers WHERE id=?1`)
          .bind(handoverId)
          .first<any>();

        if (!handover) return fail(request, 404, 'Handover not found');

        // Update the handover to completed
        await env.DB
          .prepare(
            `UPDATE vehicle_handovers
             SET handover_status='completed',
                 vehicle_cleanliness=?1,
                 fuel_level_final=?2,
                 mileage_final=?3,
                 overall_condition=?4,
                 all_items_returned=?5,
                 updated_at=CURRENT_TIMESTAMP
             WHERE id=?6`
          )
          .bind(
            String(data.vehicle_cleanliness ?? '').trim() || null,
            String(data.fuel_level_final ?? '').trim() || null,
            String(data.mileage_final ?? '').trim() || null,
            String(data.overall_condition ?? '').trim() || null,
            data.all_items_returned ? 1 : 0,
            handoverId
          )
          .run();

        // Update service_order status to 'completed'
        if (handover.service_order_id) {
          await env.DB
            .prepare(`UPDATE service_orders SET status='completed' WHERE id=?1`)
            .bind(handover.service_order_id)
            .run();
        }

        // Auto-generate Follow-Up Task 3 days from now (per spec)
        if (handover.service_order_id && handover.customer_id) {
          await env.DB
            .prepare(
              `INSERT INTO followups (service_order_id, customer_id, followup_date, contact_method, status, notes, admin_id)
               VALUES (?1, ?2, DATE('now', '+3 days'), 'phone', 'pending', 'Auto-generated 3-day post-service follow-up', ?3)`
            )
            .bind(handover.service_order_id, handover.customer_id, adminId)
            .run();
        }

        // Emit real-time event for follow-up dashboard
        emitEvent('follow-up', 'new-followup-scheduled', {
          service_order_id: handover.service_order_id,
          customer_id: handover.customer_id
        });
        // Notify all dashboards that service is complete
        emitEvent('service-advisor', 'service-completed', {
          service_order_id: handover.service_order_id
        });

        return ok(request, null, { message: 'Handover completed, follow-up scheduled' });
      }
    }

    // ==================== FOREMAN QC ====================
    // Jobs pending QC = technician has clocked out (assignment completed) but no QC inspection yet
    if (url.pathname === '/api/foreman-qc/jobs/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT DISTINCT so.id as service_order_id,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                  c.name as customer_name,
                  so.service_type,
                  jca.status as tech_status,
                  t.name as technician_name,
                  jca.clock_out_time
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           INNER JOIN job_controller_assignments jca ON jca.service_order_id = so.id
           LEFT JOIN technicians t ON t.id = jca.technician_id
           WHERE jca.status = 'completed'
             AND jca.clock_out_time IS NOT NULL
             AND so.status != 'completed'
             AND so.id NOT IN (SELECT service_order_id FROM qc_inspections WHERE overall_status = 'passed')
             AND so.admin_id = ?1
           ORDER BY jca.clock_out_time DESC, so.id DESC
           LIMIT 100`
        )
        .bind(adminId)
        .all<any>();

      // UI expects array rows
      const rows = (rs.results ?? []).map((r: any) => [
        r.service_order_id,
        r.customer_name,
        r.plate_no,
        r.service_type,
        r.technician_name || 'Unknown',
        r.clock_out_time
      ]);
      return jsonResponse(request, { success: true, data: rows });
    }

    if (url.pathname === '/api/foreman-qc/inspections/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, service_order_id, foreman_id, inspection_date, overall_status, failed_items, created_at
           FROM qc_inspections
           WHERE overall_status IN ('pending','rework-required') AND admin_id = ?1
           ORDER BY created_at DESC, id DESC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [
        r.id,
        r.service_order_id,
        r.foreman_id,
        r.inspection_date,
        r.overall_status,
        r.failed_items,
        r.created_at
      ]);
      return jsonResponse(request, { success: true, data: rows });
    }

    if (url.pathname === '/api/foreman-qc/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE admin_id = ?1`).bind(adminId).first<any>();
      const passed = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE overall_status='passed' AND admin_id = ?1`).bind(adminId).first<any>();
      const failed = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE overall_status='failed' AND admin_id = ?1`).bind(adminId).first<any>();
      const pending = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE overall_status IN ('pending','rework-required') AND admin_id = ?1`).bind(adminId).first<any>();
      const rework = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE overall_status='rework-required' AND admin_id = ?1`).bind(adminId).first<any>();
      const data = {
        total_inspections: Number(total?.n ?? 0),
        passed_count: Number(passed?.n ?? 0),
        failed_count: Number(failed?.n ?? 0),
        pending_count: Number(pending?.n ?? 0),
        rework_count: Number(rework?.n ?? 0)
      };
      return jsonResponse(request, { success: true, data });
    }

    if (url.pathname === '/api/foreman-qc/inspections' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');
      const inspectionDate = String(data.inspection_date ?? todayISODate()).trim();

      try {
        // Insert without foreman_id to avoid FK issues (foreman_id FK references service_advisors which may not match user IDs)
        const result = await env.DB
          .prepare(
            `INSERT INTO qc_inspections
             (service_order_id, inspection_date, overall_status, created_at, admin_id)
             VALUES
             (?1, ?2, 'pending', CURRENT_TIMESTAMP, ?3)`
          )
          .bind(serviceOrderId, inspectionDate, adminId)
          .run();

        const inspectionId = await d1FirstId(result);
        return jsonResponse(request, { success: true, inspection_id: inspectionId }, 201);
      } catch (insertError: any) {
        console.error('QC insert failed:', insertError.message);
        return fail(request, 500, 'Failed to create inspection: ' + insertError.message);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)\/pass$/);
      if (m && request.method === 'POST') {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, 'Invalid inspection id');
        
        const data = await readJson<any>(request);
        const foremanSignature = String(data?.foreman_signature ?? '').trim();
        const technicianSignature = String(data?.technician_signature ?? '').trim();
        
        // Get the service_order_id for this inspection
        const inspection = await env.DB.prepare('SELECT service_order_id FROM qc_inspections WHERE id=?1').bind(inspectionId).first<any>();
        if (!inspection) return fail(request, 404, 'Inspection not found');
        
        // Update inspection with signatures and passed status
        await env.DB.prepare(
          `UPDATE qc_inspections SET overall_status='passed' WHERE id=?1`
        ).bind(inspectionId).run();
        
        // Calculate labor hours from assignment
        const assignment = await env.DB.prepare(
          `SELECT clock_in_time, clock_out_time, technician_id
           FROM job_controller_assignments 
           WHERE service_order_id=?1 AND status='completed'
           ORDER BY clock_out_time DESC LIMIT 1`
        ).bind(inspection.service_order_id).first<any>();
        
        let laborHours = 0;
        if (assignment?.clock_in_time && assignment?.clock_out_time) {
          const start = new Date(assignment.clock_in_time).getTime();
          const end = new Date(assignment.clock_out_time).getTime();
          laborHours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
        }
        
        // Update service order status to 'qc-passed' (ready for Job Controller wrap-up)
        // Note: Job Controller will manually create job_wrapup via Stop Clock button
        await env.DB.prepare(`UPDATE service_orders SET status='qc-passed' WHERE id=?1`).bind(inspection.service_order_id).run();
        
        emitEvent({ type: 'foreman-qc', action: 'qc-passed', service_order_id: inspection.service_order_id, inspection_id: inspectionId, labor_hours: laborHours });
        return ok(request, null, { message: `QC Passed - Labor: ${laborHours}h. Ready for billing.` });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)\/fail$/);
      if (m && request.method === 'POST') {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, 'Invalid inspection id');
        const data = await readJson<any>(request);
        const failedItems = String(data?.failed_items ?? '').trim();
        
        // Get the service_order_id for this inspection
        const inspection = await env.DB.prepare('SELECT service_order_id FROM qc_inspections WHERE id=?1').bind(inspectionId).first<any>();
        if (!inspection) return fail(request, 404, 'Inspection not found');
        
        await env.DB
          .prepare(`UPDATE qc_inspections SET overall_status='rework-required', failed_items=?1 WHERE id=?2`)
          .bind(failedItems || null, inspectionId)
          .run();
        
        // Update service order status back to 'in-progress' for rework
        await env.DB.prepare(`UPDATE service_orders SET status='in-progress' WHERE id=?1`).bind(inspection.service_order_id).run();
        
        emitEvent({ type: 'foreman-qc', action: 'qc-failed', service_order_id: inspection.service_order_id, inspection_id: inspectionId, failed_items: failedItems });
        return ok(request, null, { message: 'Inspection failed - Rework required' });
      }
    }

    if (url.pathname === '/api/foreman-qc/road-tests' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const qcInspectionId = toInt(data.qc_inspection_id, null);
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!qcInspectionId || !serviceOrderId) return fail(request, 400, 'qc_inspection_id and service_order_id are required');
      
      const result = await env.DB
        .prepare(
          `INSERT INTO qc_road_tests
           (qc_inspection_id, service_order_id, road_test_date, tested_by, tester_name, test_distance_km, engine_sound,
            acceleration_smooth, braking_effective, steering_responsive, electrical_functions_ok, air_conditioning_ok,
            overall_performance, road_test_notes, start_time, end_time, route_compliance, authorization_stamp, authorized_by, created_at, admin_id)
           VALUES
           (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, CURRENT_TIMESTAMP, ?20)`
        )
        .bind(
          qcInspectionId,
          serviceOrderId,
          String(data.road_test_date ?? todayISODate()).trim(),
          toInt(data.tested_by, null),
          String(data.tester_name ?? '').trim() || null,
          toFloat(data.test_distance_km, 0) ?? 0,
          String(data.engine_sound ?? '').trim() || null,
          data.acceleration_smooth ? 1 : 0,
          data.braking_effective ? 1 : 0,
          data.steering_responsive ? 1 : 0,
          data.electrical_functions_ok ? 1 : 0,
          data.air_conditioning_ok ? 1 : 0,
          String(data.overall_performance ?? '').trim() || null,
          String(data.road_test_notes ?? '').trim() || null,
          String(data.start_time ?? '').trim() || null,
          String(data.end_time ?? '').trim() || null,
          data.route_compliance ? 1 : 0,
          String(data.authorization_stamp ?? '').trim() || null,
          String(data.authorized_by ?? '').trim() || null,
          adminId
        )
        .run();

      const id = await d1FirstId(result);
      emitEvent({ type: 'foreman-qc', action: 'road-test-completed', service_order_id: serviceOrderId, road_test_id: id });
      return jsonResponse(request, { success: true, road_test_id: id }, 201);
    }

    // Road Test Authorization - SA or Manager stamps "For Road Test"
    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)\/authorize-road-test$/);
      if (m && request.method === 'POST') {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, 'Invalid inspection id');
        
        const data = await readJson<any>(request);
        const authorizedBy = String(data?.authorized_by ?? '').trim();
        const authorizationNote = String(data?.authorization_note ?? 'For Road Test').trim();
        
        if (!authorizedBy) return fail(request, 400, 'authorized_by is required (SA or Manager name)');
        
        await env.DB.prepare(
          `UPDATE qc_inspections SET road_test_authorized=1, road_test_authorized_by=?1, road_test_authorization_note=?2, road_test_authorized_at=CURRENT_TIMESTAMP WHERE id=?3`
        ).bind(authorizedBy, authorizationNote, inspectionId).run();
        
        const inspection = await env.DB.prepare('SELECT service_order_id FROM qc_inspections WHERE id=?1').bind(inspectionId).first<any>();
        emitEvent({ type: 'foreman-qc', action: 'road-test-authorized', inspection_id: inspectionId, authorized_by: authorizedBy });
        
        return ok(request, null, { message: 'Road test authorized' });
      }
    }

    // Get inspection details including road test authorization status
    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)$/);
      if (m && request.method === 'GET') {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, 'Invalid inspection id');
        
        const inspection = await env.DB.prepare(
          `SELECT qi.*, so.vehicle_plate_no, c.name as customer_name, t.name as technician_name
           FROM qc_inspections qi
           LEFT JOIN service_orders so ON so.id = qi.service_order_id
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN job_controller_assignments jca ON jca.service_order_id = so.id
           LEFT JOIN technicians t ON t.id = jca.technician_id
           WHERE qi.id = ?1`
        ).bind(inspectionId).first<any>();
        
        if (!inspection) return fail(request, 404, 'Inspection not found');
        
        // Get road test if exists
        const roadTest = await env.DB.prepare(
          `SELECT * FROM qc_road_tests WHERE qc_inspection_id=?1 ORDER BY created_at DESC LIMIT 1`
        ).bind(inspectionId).first<any>();
        
        return ok(request, { inspection, road_test: roadTest });
      }
    }

    // ==================== BILLING ====================
    if (url.pathname === '/api/billing/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const row = await env.DB
        .prepare(
          `SELECT
             SUM(CASE WHEN status='paid' THEN paid_amount ELSE 0 END) as paid_amount,
             SUM(CASE WHEN status='issued' THEN 1 ELSE 0 END) as issued_count,
             SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft_count,
             SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) as overdue_count
           FROM billing_invoices
           WHERE admin_id = ?1`
        )
        .bind(adminId)
        .first<any>();
      return ok(request, {
        paid_amount: Number(row?.paid_amount ?? 0),
        issued_count: Number(row?.issued_count ?? 0),
        draft_count: Number(row?.draft_count ?? 0),
        overdue_count: Number(row?.overdue_count ?? 0)
      });
    }

    async function listInvoicesByStatus(kind: 'pending' | 'paid' | 'overdue') {
      const adminId = getAdminId(request);
      const now = new Date();
      const statuses =
        kind === 'paid' ? ['paid'] : kind === 'overdue' ? ['overdue'] : ['draft', 'issued'];

      const rs = await env.DB
        .prepare(
          `SELECT bi.id, bi.customer_id, bi.service_order_id, bi.status, bi.total_amount, bi.paid_amount,
                  bi.created_at, bi.due_date,
                  c.name as customer_name,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
           FROM billing_invoices bi
           LEFT JOIN customers c ON c.id = bi.customer_id
           LEFT JOIN service_orders so ON so.id = bi.service_order_id
           WHERE bi.status IN (${statuses.map(() => '?').join(',')}) AND bi.admin_id = ?
           ORDER BY bi.created_at DESC, bi.id DESC`
        )
        .bind(...statuses, adminId)
        .all<any>();

      const invoices = (rs.results ?? []).map((r: any) => {
        const idNum = Number(r.id);
        const invoiceDate = r.created_at ?? new Date().toISOString();
        const dueDate = r.due_date ?? new Date(Date.parse(invoiceDate) + 7 * 86400000).toISOString();
        const total = Number(r.total_amount ?? 0);
        const paid = Number(r.paid_amount ?? 0);
        const remaining = Math.max(0, total - paid);
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - Date.parse(dueDate)) / 86400000));
        return {
          id: idNum,
          invoice_no: `INV-${pad5(idNum)}`,
          customer: r.customer_name ?? '',
          customer_name: r.customer_name ?? '',
          plate_no: r.plate_no ?? '',
          total,
          paid_amount: paid,
          remaining,
          status: r.status,
          invoice_date: invoiceDate,
          due_date: dueDate,
          days_overdue: daysOverdue
        };
      });

      return invoices;
    }

    // Generic billing invoices endpoint with optional status filter
    if (url.pathname === '/api/billing/invoices' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const statusFilter = url.searchParams.get('status');
      
      let whereClause = '1=1';
      const params: any[] = [];
      
      if (statusFilter === 'paid') {
        whereClause = "bi.status = 'paid'";
      } else if (statusFilter === 'approved') {
        whereClause = "bi.status IN ('issued', 'approved')";
      } else if (statusFilter === 'pending') {
        whereClause = "bi.status IN ('draft', 'pending')";
      }
      
      const rs = await env.DB
        .prepare(
          `SELECT bi.id, bi.customer_id, bi.service_order_id, bi.status, 
                  bi.total_amount, bi.paid_amount, bi.labor_hours, bi.labor_rate,
                  bi.parts_cost, bi.materials_cost, bi.discount,
                  bi.created_at, bi.due_date, bi.issued_at,
                  c.name as customer_name,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_number,
                  c.vehicle_model
           FROM billing_invoices bi
           LEFT JOIN customers c ON c.id = bi.customer_id
           LEFT JOIN service_orders so ON so.id = bi.service_order_id
           WHERE ${whereClause} AND bi.admin_id = ?1
           ORDER BY bi.created_at DESC, bi.id DESC`
        )
        .bind(adminId)
        .all<any>();

      const invoices = (rs.results ?? []).map((r: any) => {
        const idNum = Number(r.id);
        return {
          id: idNum,
          invoice_number: `INV-${pad5(idNum)}`,
          service_order_id: r.service_order_id,
          customer_id: r.customer_id,
          customer_name: r.customer_name ?? 'N/A',
          plate_number: r.plate_number ?? '',
          vehicle_model: r.vehicle_model ?? '',
          status: r.status === 'issued' ? 'approved' : r.status,
          total_amount: Number(r.total_amount ?? 0),
          paid_amount: Number(r.paid_amount ?? 0),
          labor_cost: Number(r.labor_hours ?? 0) * Number(r.labor_rate ?? 0),
          parts_cost: Number(r.parts_cost ?? 0) + Number(r.materials_cost ?? 0),
          discount: Number(r.discount ?? 0),
          created_at: r.created_at ?? new Date().toISOString(),
          due_date: r.due_date,
          paid_at: r.status === 'paid' ? (r.issued_at ?? r.created_at) : null,
          payment_method: 'cash' // Default, would need payment_transactions table for actual
        };
      });

      return ok(request, { invoices });
    }

    if (url.pathname === '/api/billing/invoices/pending' && request.method === 'GET') {
      const invoices = await listInvoicesByStatus('pending');
      return ok(request, invoices);
    }

    if (url.pathname === '/api/billing/invoices/paid' && request.method === 'GET') {
      const invoices = await listInvoicesByStatus('paid');
      return ok(request, invoices);
    }

    if (url.pathname === '/api/billing/invoices/overdue' && request.method === 'GET') {
      const invoices = await listInvoicesByStatus('overdue');
      return ok(request, invoices);
    }

    // Get invoice by Service Order ID (for SA Print Billing - SOP 8.1)
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/by-so\/(\d+)$/);
      if (m && request.method === 'GET') {
        const serviceOrderId = toInt(m[1], null);
        if (!serviceOrderId) return fail(request, 400, 'Invalid service order id');

        const row = await env.DB
          .prepare(
            `SELECT bi.*, 
                    c.name as customer_name, 
                    c.contact_no as customer_contact,
                    c.address as customer_address,
                    COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle_plate_no,
                    so.vehicle_model,
                    so.vehicle_color
             FROM billing_invoices bi
             LEFT JOIN customers c ON c.id = bi.customer_id
             LEFT JOIN service_orders so ON so.id = bi.service_order_id
             WHERE bi.service_order_id=?1
             ORDER BY bi.id DESC
             LIMIT 1`
          )
          .bind(serviceOrderId)
          .first<any>();
        
        if (!row) return fail(request, 404, 'No invoice found for this service order');

        const total = Number(row.total_amount ?? 0);
        const paid = Number(row.paid_amount ?? 0);

        const data = {
          id: row.id,
          service_order_id: serviceOrderId,
          invoice_number: `INV-${pad5(Number(row.id))}`,
          customer_name: row.customer_name ?? '',
          customer_contact: row.customer_contact ?? '',
          customer_address: row.customer_address ?? '',
          vehicle_plate_no: row.vehicle_plate_no ?? '',
          vehicle_model: row.vehicle_model ?? '',
          vehicle_color: row.vehicle_color ?? '',
          labor_hours: Number(row.labor_hours ?? 0),
          labor_rate: Number(row.labor_rate ?? 0),
          labor_total: Number(row.labor_hours ?? 0) * Number(row.labor_rate ?? 0),
          materials_cost: Number(row.materials_cost ?? 0),
          parts_cost: Number(row.parts_cost ?? 0),
          parking_cost: Number(row.parking_cost ?? 0),
          discount: Number(row.discount ?? 0),
          total_amount: total,
          paid_amount: paid,
          balance: Math.max(0, total - paid),
          status: row.status,
          due_date: row.due_date,
          created_at: row.created_at
        };

        return ok(request, data);
      }
    }

    // GET /api/billing/service-order/:id/details - fetch service type, labor, and parts for auto-populating invoice
    {
      const m = url.pathname.match(/^\/api\/billing\/service-order\/(\d+)\/details$/);
      if (m && request.method === 'GET') {
        const soId = toInt(m[1], null);
        if (!soId) return fail(request, 400, 'Invalid service order ID');

        // 1. Get service order info
        const order = await env.DB.prepare(
          `SELECT so.id, so.service_type, so.customer_id,
                  c.name as customer_name,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_number,
                  c.vehicle_model
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.id = ?1`
        ).bind(soId).first<any>();

        if (!order) return fail(request, 404, 'Service order not found');

        // 2. Get service catalog price for this service type
        let serviceCatalogMatch: any = null;
        if (order.service_type) {
          serviceCatalogMatch = await env.DB.prepare(
            `SELECT service_name, category, base_price, labor_hours, description
             FROM service_catalog
             WHERE service_name = ?1 AND status = 'active'
             LIMIT 1`
          ).bind(order.service_type).first<any>();

          // Fallback: fuzzy match
          if (!serviceCatalogMatch) {
            serviceCatalogMatch = await env.DB.prepare(
              `SELECT service_name, category, base_price, labor_hours, description
               FROM service_catalog
               WHERE LOWER(service_name) LIKE LOWER(?1) AND status = 'active'
               LIMIT 1`
            ).bind(`%${order.service_type}%`).first<any>();
          }
        }

        // 3. Get labor hours from job wrapup/assignment
        const laborData = await env.DB.prepare(
          `SELECT jw.total_labor_hours, t.name as technician_name
           FROM job_wrapups jw
           LEFT JOIN technicians t ON t.id = jw.technician_id
           WHERE jw.service_order_id = ?1
           LIMIT 1`
        ).bind(soId).first<any>();

        // 4. Get parts requested with pricing from warehouse (normalized tables)
        const partsRs = await env.DB.prepare(
          `SELECT
             pri.id,
             wp.product_name as part_name,
             wp.product_code,
             pri.quantity_requested as quantity,
             wp.unit_price as price,
             (pri.quantity_requested * COALESCE(wp.unit_price, 0)) as line_total,
             pri.status,
             pr.status as request_status
           FROM parts_request_items pri
           JOIN parts_requests pr ON pr.id = pri.parts_request_id
           LEFT JOIN warehouse_products wp ON wp.id = pri.product_id
           WHERE pr.service_order_id = ?1`
        ).bind(soId).all<any>();

        let parts = partsRs.results ?? [];

        // Fallback: also check car_jockey_parts_requests (stores items as JSON in document_data)
        if (parts.length === 0) {
          try {
            const cjReqs = await env.DB.prepare(
              `SELECT document_data FROM car_jockey_parts_requests WHERE service_order_id = ?1 ORDER BY created_at DESC`
            ).bind(soId).all<any>();
            for (const req of (cjReqs.results ?? [])) {
              try {
                const items = JSON.parse(req.document_data || '[]');
                for (const item of items) {
                  // Try to look up product price from warehouse_products
                  let wp: any = null;
                  if (item.product_id) {
                    wp = await env.DB.prepare('SELECT product_name, product_code, unit_price FROM warehouse_products WHERE id = ?1').bind(item.product_id).first<any>();
                  } else if (item.product_name || item.part_name || item.name) {
                    const searchName = item.product_name || item.part_name || item.name;
                    wp = await env.DB.prepare('SELECT product_name, product_code, unit_price FROM warehouse_products WHERE LOWER(product_name) LIKE LOWER(?1) LIMIT 1').bind(`%${searchName}%`).first<any>();
                  }
                  const qty = item.quantity || item.qty || 1;
                  const price = wp?.unit_price || item.price || item.unit_price || 0;
                  parts.push({
                    part_name: wp?.product_name || item.product_name || item.part_name || item.name || 'Unknown Part',
                    product_code: wp?.product_code || item.product_code || '',
                    quantity: qty,
                    price: price,
                    line_total: qty * price,
                    status: 'delivered',
                    request_status: 'completed'
                  });
                }
              } catch (_) { /* skip malformed JSON */ }
            }
          } catch (_) { /* car_jockey_parts_requests table may not exist */ }
        }

        const totalPartsCost = parts.reduce((sum: number, p: any) => sum + (p.line_total || 0), 0);

        // 5. Calculate labor cost
        const laborHours = laborData?.total_labor_hours || serviceCatalogMatch?.labor_hours || 1;
        const laborRate = serviceCatalogMatch?.base_price ? (serviceCatalogMatch.base_price / (serviceCatalogMatch.labor_hours || 1)) : 500;
        const laborCost = serviceCatalogMatch?.base_price || (laborHours * laborRate);

        return ok(request, {
          service_order_id: soId,
          service_type: order.service_type || 'General Service',
          customer_name: order.customer_name,
          plate_number: order.plate_number,
          vehicle_model: order.vehicle_model,
          service_catalog: serviceCatalogMatch || null,
          labor_hours: laborHours,
          labor_rate: laborRate,
          labor_cost: laborCost,
          technician_name: laborData?.technician_name || null,
          parts,
          parts_cost: totalPartsCost,
          suggested_total: laborCost + totalPartsCost
        });
      }
    }

    if (url.pathname === '/api/billing/invoices' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const serviceOrderId = toInt(data.service_order_id, null);
      const customerId = toInt(data.customer_id, null);
      if (!serviceOrderId || !customerId) return fail(request, 400, 'service_order_id and customer_id are required');

      const laborHours = toFloat(data.labor_hours, 0) ?? 0;
      const laborRate = toFloat(data.labor_rate, 0) ?? 0;
      const materialsCost = toFloat(data.materials_cost, 0) ?? 0;
      const partsCost = toFloat(data.parts_cost, 0) ?? 0;
      const parkingCost = toFloat(data.parking_cost, 0) ?? 0;
      const discount = toFloat(data.discount, 0) ?? 0;

      const total = Math.max(0, laborHours * laborRate + materialsCost + partsCost + parkingCost - discount);
      const dueDate = new Date(Date.now() + 7 * 86400000).toISOString();

      const result = await env.DB
        .prepare(
          `INSERT INTO billing_invoices
           (service_order_id, customer_id, status, labor_hours, labor_rate, materials_cost, parts_cost, parking_cost, discount,
            total_amount, paid_amount, issued_at, due_date, created_at, admin_id)
           VALUES
           (?1, ?2, 'draft', ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, NULL, ?10, CURRENT_TIMESTAMP, ?11)`
        )
        .bind(
          serviceOrderId,
          customerId,
          laborHours,
          laborRate,
          materialsCost,
          partsCost,
          parkingCost,
          discount,
          total,
          dueDate,
          adminId
        )
        .run();

      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, invoice_id: id, message: 'Invoice created' }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)$/);
      if (m && request.method === 'GET') {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, 'Invalid invoice id');

        const row = await env.DB
          .prepare(
            `SELECT bi.*, c.name as customer_name, COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
             FROM billing_invoices bi
             LEFT JOIN customers c ON c.id = bi.customer_id
             LEFT JOIN service_orders so ON so.id = bi.service_order_id
             WHERE bi.id=?1`
          )
          .bind(invoiceId)
          .first<any>();
        if (!row) return fail(request, 404, 'Invoice not found');

        const total = Number(row.total_amount ?? 0);
        const paid = Number(row.paid_amount ?? 0);

        const data = {
          id: row.id,
          invoice_no: `INV-${pad5(Number(row.id))}`,
          customer_name: row.customer_name ?? '',
          plate_no: row.plate_no ?? '',
          invoice_date: row.created_at,
          due_date: row.due_date ?? new Date(Date.parse(row.created_at) + 7 * 86400000).toISOString(),
          status: row.status,
          labor_hours: Number(row.labor_hours ?? 0),
          labor_rate: Number(row.labor_rate ?? 0),
          materials_cost: Number(row.materials_cost ?? 0),
          parts_cost: Number(row.parts_cost ?? 0),
          parking_cost: Number(row.parking_cost ?? 0),
          discount: Number(row.discount ?? 0),
          total_amount: total,
          paid_amount: paid,
          remaining: Math.max(0, total - paid)
        };

        return ok(request, data);
      }
    }

    // Approve invoice (send to cashier for payment)
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/approve$/);
      if (m && request.method === 'POST') {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, 'Invalid invoice id');

        await env.DB
          .prepare(`UPDATE billing_invoices SET status='issued', issued_at=CURRENT_TIMESTAMP WHERE id=?1`)
          .bind(invoiceId)
          .run();

        return ok(request, { success: true, message: 'Invoice approved and sent to cashier' });
      }
    }

    // Pay invoice (cashier completes payment)
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/pay$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, 'Invalid invoice id');
        
        const data = await readJson<any>(request);
        const paymentMethod = String(data?.payment_method ?? 'cash').trim();
        const refNumber = String(data?.reference_number ?? '').trim();
        
        // Get invoice total
        const inv = await env.DB
          .prepare(`SELECT total_amount, customer_id, service_order_id FROM billing_invoices WHERE id=?1`)
          .bind(invoiceId)
          .first<any>();
        
        if (!inv) return fail(request, 404, 'Invoice not found');
        
        const total = Number(inv.total_amount ?? 0);
        
        // Update invoice to paid
        await env.DB
          .prepare(`UPDATE billing_invoices SET status='paid', paid_amount=?1, issued_at=CURRENT_TIMESTAMP WHERE id=?2`)
          .bind(total, invoiceId)
          .run();

        // Record payment in payments table if exists
        try {
          await env.DB
            .prepare(
              `INSERT INTO billing_payments 
               (invoice_id, payment_amount, payment_method, reference_number, created_at, admin_id)
               VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, ?5)`
            )
            .bind(invoiceId, total, paymentMethod, refNumber || null, adminId)
            .run();
        } catch (e) {
          // payments table might not exist, that's ok
        }

        // Update service order to 'billed' and auto-create handover + gatepass
        if (inv.service_order_id) {
          await env.DB.prepare(`UPDATE service_orders SET status='billed' WHERE id=?1`).bind(inv.service_order_id).run();

          // Auto-create Vehicle Handover record
          try {
            await env.DB
              .prepare(
                `INSERT INTO vehicle_handovers (service_order_id, customer_id, handover_date, handover_status, admin_id)
                 VALUES (?1, ?2, DATE('now'), 'pending', ?3)`
              )
              .bind(inv.service_order_id, inv.customer_id || null, adminId)
              .run();
          } catch (e) {
            // May already exist from self-healing
          }

          // Auto-create Gatepass
          try {
            await env.DB
              .prepare(`INSERT INTO gatepasses (service_order_id, customer_id, status, created_at, admin_id) VALUES (?1, ?2, 'pending', CURRENT_TIMESTAMP, ?3)`)
              .bind(inv.service_order_id, inv.customer_id || null, adminId)
              .run();
          } catch (e) {
            // May already exist
          }

          emitEvent('vehicle-handover', 'payment-complete', { service_order_id: inv.service_order_id });
          emitEvent('security-gate', 'payment-complete', { service_order_id: inv.service_order_id });
        }

        return ok(request, { success: true, message: 'Payment recorded successfully' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/payments$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, 'Invalid invoice id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');

        const amount = toFloat(data.payment_amount, null);
        if (!amount || amount <= 0) return fail(request, 400, 'payment_amount must be > 0');
        const method = String(data.payment_method ?? 'cash').trim() || 'cash';
        const ref = String(data.reference_number ?? '').trim();
        const createdBy = toInt(data.created_by, null);

        await env.DB
          .prepare(
            `INSERT INTO billing_payments
             (invoice_id, payment_amount, payment_method, reference_number, created_by, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, ?6)`
          )
          .bind(invoiceId, amount, method, ref || null, createdBy, adminId)
          .run();

        // Update invoice totals
        await env.DB
          .prepare(`UPDATE billing_invoices SET paid_amount = paid_amount + ?1 WHERE id=?2`)
          .bind(amount, invoiceId)
          .run();

        const inv = await env.DB
          .prepare(`SELECT total_amount, paid_amount, service_order_id, customer_id FROM billing_invoices WHERE id=?1`)
          .bind(invoiceId)
          .first<any>();
        const total = Number(inv?.total_amount ?? 0);
        const paid = Number(inv?.paid_amount ?? 0);
        // Mark as paid if payment meets or exceeds total (or if total is 0 and payment > 0)
        const shouldMarkPaid = (paid >= total && total > 0) || (total === 0 && paid > 0);
        let gatepassId: number | null = null;
        
        if (shouldMarkPaid) {
          await env.DB.prepare(`UPDATE billing_invoices SET status='paid' WHERE id=?1`).bind(invoiceId).run();
          // Also update service order to 'billed' status and create gatepass
          if (inv?.service_order_id) {
            await env.DB.prepare(`UPDATE service_orders SET status='billed' WHERE id=?1`).bind(inv.service_order_id).run();
            // Create gatepass for vehicle release
            const gatepassResult = await env.DB
              .prepare(`INSERT INTO gatepasses (service_order_id, customer_id, status, created_at, admin_id) VALUES (?1, ?2, 'pending', CURRENT_TIMESTAMP, ?3)`)
              .bind(inv.service_order_id, inv.customer_id || null, adminId)
              .run();
            gatepassId = await d1FirstId(gatepassResult);
          }
          emitEvent({ type: 'billing', action: 'invoice-paid', invoice_id: invoiceId, service_order_id: inv?.service_order_id, gatepass_id: gatepassId });
          emitEvent({ type: 'security-gate', action: 'payment-complete', service_order_id: inv?.service_order_id, gatepass_id: gatepassId });
        }

        return ok(request, null, { message: 'Payment recorded', gatepass_id: gatepassId });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/issue$/);
      if (m && request.method === 'POST') {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, 'Invalid invoice id');
        await env.DB
          .prepare(`UPDATE billing_invoices SET status='issued', issued_at=CURRENT_TIMESTAMP WHERE id=?1`)
          .bind(invoiceId)
          .run();
        return ok(request, null, { message: 'Invoice issued' });
      }
    }

    // ==================== CASHIER ====================
    if (url.pathname === '/api/cashier/invoices/pending' && request.method === 'GET') {
      // Reuse billing pending as cashier pending
      const invoices = await listInvoicesByStatus('pending');
      // Match cashier UI fields: remaining
      return ok(request, invoices.map((i) => ({ ...i, remaining: i.remaining })));
    }

    if (url.pathname === '/api/cashier/transactions/daily' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const day = todayISODate();
      const rs = await env.DB
        .prepare(
          `SELECT p.id, p.invoice_id, p.payment_amount as amount, p.payment_method, p.reference_number, p.created_at
           FROM billing_payments p
           WHERE substr(p.created_at,1,10)=?1 AND p.admin_id = ?2
           ORDER BY p.created_at DESC, p.id DESC`
        )
        .bind(day, adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/cashier/summary/daily' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const day = todayISODate();
      const row = await env.DB
        .prepare(
          `SELECT
             COUNT(*) as total_transactions,
             SUM(payment_amount) as grand_total,
             SUM(CASE WHEN payment_method='cash' THEN payment_amount ELSE 0 END) as cash_total,
             SUM(CASE WHEN payment_method='card' THEN payment_amount ELSE 0 END) as card_total,
             SUM(CASE WHEN payment_method='check' THEN payment_amount ELSE 0 END) as check_total
           FROM billing_payments
           WHERE substr(created_at,1,10)=?1 AND admin_id = ?2`
        )
        .bind(day, adminId)
        .first<any>();
      return ok(request, {
        total_transactions: Number(row?.total_transactions ?? 0),
        grand_total: Number(row?.grand_total ?? 0),
        cash_total: Number(row?.cash_total ?? 0),
        card_total: Number(row?.card_total ?? 0),
        check_total: Number(row?.check_total ?? 0)
      });
    }

    if (url.pathname === '/api/cashier/drawer/active' && request.method === 'GET') {
      const cashierId = toInt(url.searchParams.get('cashier_id'), null);
      if (!cashierId) return fail(request, 400, 'cashier_id is required');
      const row = await env.DB
        .prepare(
          `SELECT id, cashier_id, opening_balance, opening_time, status
           FROM cashier_drawers
           WHERE cashier_id=?1 AND status='open'
           ORDER BY opening_time DESC
           LIMIT 1`
        )
        .bind(cashierId)
        .first<any>();
      if (!row) return jsonResponse(request, { success: false, error: 'No active drawer' }, 404);
      return ok(request, row);
    }

    if (url.pathname === '/api/cashier/drawer/open' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const cashierId = toInt(data.cashier_id, null);
      const openingBalance = toFloat(data.opening_balance, 0) ?? 0;
      if (!cashierId) return fail(request, 400, 'cashier_id is required');
      // Close any existing
      await env.DB
        .prepare(`UPDATE cashier_drawers SET status='closed', closing_time=CURRENT_TIMESTAMP WHERE cashier_id=?1 AND status='open'`)
        .bind(cashierId)
        .run();
      const result = await env.DB
        .prepare(
          `INSERT INTO cashier_drawers (cashier_id, opening_balance, opening_time, status, admin_id)
           VALUES (?1, ?2, CURRENT_TIMESTAMP, 'open', ?3)`
        )
        .bind(cashierId, openingBalance, adminId)
        .run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, drawer_id: id, message: 'Drawer opened' }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/cashier\/drawer\/(\d+)\/close$/);
      if (m && request.method === 'POST') {
        const drawerId = toInt(m[1], null);
        if (!drawerId) return fail(request, 400, 'Invalid drawer id');
        const data = await readJson<any>(request);
        const cashCounted = toFloat(data?.cash_counted, null);
        const notes = String(data?.notes ?? '').trim();
        await env.DB
          .prepare(
            `UPDATE cashier_drawers
             SET status='closed', closing_time=CURRENT_TIMESTAMP, cash_counted=?1, notes=?2
             WHERE id=?3`
          )
          .bind(cashCounted ?? null, notes || null, drawerId)
          .run();
        return ok(request, null, { message: 'Drawer closed' });
      }
    }

    if (url.pathname === '/api/cashier/payments' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const invoiceId = toInt(data.invoice_id, null);
      const amount = toFloat(data.amount, null);
      if (!invoiceId || !amount || amount <= 0) return fail(request, 400, 'invoice_id and amount are required');
      const method = String(data.payment_method ?? 'cash').trim() || 'cash';
      const ref = String(data.reference_number ?? '').trim();
      const createdBy = toInt(data.created_by, null);

      await env.DB
        .prepare(
          `INSERT INTO billing_payments (invoice_id, payment_amount, payment_method, reference_number, created_by, created_at, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, ?6)`
        )
        .bind(invoiceId, amount, method, ref || null, createdBy, adminId)
        .run();

      await env.DB.prepare(`UPDATE billing_invoices SET paid_amount = paid_amount + ?1 WHERE id=?2`).bind(amount, invoiceId).run();
      const inv = await env.DB.prepare(`SELECT total_amount, paid_amount, service_order_id, customer_id FROM billing_invoices WHERE id=?1`).bind(invoiceId).first<any>();
      const total = Number(inv?.total_amount ?? 0);
      const paid = Number(inv?.paid_amount ?? 0);
      let gatepassId: number | null = null;

      // Mark as paid if payment meets or exceeds total (or if total is 0 and payment > 0)
      const shouldMarkPaid = (paid >= total && total > 0) || (total === 0 && paid > 0);
      if (shouldMarkPaid) {
        await env.DB.prepare(`UPDATE billing_invoices SET status='paid' WHERE id=?1`).bind(invoiceId).run();

        // Update service order to 'billed' status
        if (inv?.service_order_id) {
          await env.DB.prepare(`UPDATE service_orders SET status='billed' WHERE id=?1`).bind(inv.service_order_id).run();
          
          // Auto-create Gatepass when payment is complete (per spec: Cashier signs gatepass after payment)
          const gatepassResult = await env.DB
            .prepare(`INSERT INTO gatepasses (service_order_id, customer_id, status, created_at, admin_id) VALUES (?1, ?2, 'pending', CURRENT_TIMESTAMP, ?3)`)
            .bind(inv.service_order_id, inv.customer_id || null, adminId)
            .run();
          gatepassId = await d1FirstId(gatepassResult);

          // Auto-create Vehicle Handover record (must be completed before security gate can release)
          await env.DB
            .prepare(
              `INSERT INTO vehicle_handovers (service_order_id, customer_id, handover_date, handover_status, admin_id)
               VALUES (?1, ?2, DATE('now'), 'pending', ?3)`
            )
            .bind(inv.service_order_id, inv.customer_id || null, adminId)
            .run();
        }

        // Emit real-time event for security gate and vehicle handover
        emitEvent('security-gate', 'payment-complete', {
          invoice_id: invoiceId,
          gatepass_id: gatepassId,
          service_order_id: inv?.service_order_id
        });
        emitEvent('vehicle-handover', 'ready-for-release', {
          service_order_id: inv?.service_order_id
        });
      }

      // Emit payment event for billing updates
      emitEvent('billing', 'payment-received', {
        invoice_id: invoiceId,
        amount: amount,
        paid_amount: paid
      });

      return ok(request, null, { message: 'Payment recorded', gatepass_id: gatepassId });
    }

    // ==================== FOLLOW-UP ====================
    if (url.pathname === '/api/follow-up/followups/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, service_order_id, customer_id, followup_date, contact_method, status
           FROM followups
           WHERE status='pending' AND admin_id = ?1
           ORDER BY followup_date ASC, id ASC`
        )
        .bind(adminId)
        .all<any>();
      return jsonResponse(request, { success: true, data: rs.results ?? [], followups: rs.results ?? [] });
    }

    if (url.pathname === '/api/follow-up/issues' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, followup_id, issue_category, issue_description, severity, status, created_at
           FROM followup_issues
           WHERE status='open' AND admin_id = ?1
           ORDER BY created_at DESC, id DESC`
        )
        .bind(adminId)
        .all<any>();
      return jsonResponse(request, { success: true, data: rs.results ?? [], issues: rs.results ?? [] });
    }

    if (url.pathname === '/api/follow-up/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const byStatus = await env.DB
        .prepare(`SELECT COUNT(*) as n, status FROM followups WHERE admin_id = ?1 GROUP BY status`)
        .bind(adminId)
        .all<any>();
      const issuesByStatus = await env.DB
        .prepare(`SELECT COUNT(*) as n, status FROM followup_issues WHERE admin_id = ?1 GROUP BY status`)
        .bind(adminId)
        .all<any>();
      const summary = {
        by_status: (byStatus.results ?? []).map((r: any) => [Number(r.n ?? 0), r.status]),
        issues_by_status: (issuesByStatus.results ?? []).map((r: any) => [Number(r.n ?? 0), r.status])
      };
      return jsonResponse(request, { success: true, data: summary, summary });
    }

    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)$/);
      if (m && request.method === 'GET') {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, 'Invalid followup id');
        const followup = await env.DB
          .prepare(`SELECT * FROM followups WHERE id=?1`)
          .bind(followupId)
          .first<any>();
        if (!followup) return fail(request, 404, 'Followup not found');
        const feedback = await env.DB
          .prepare(`SELECT * FROM followup_feedback WHERE followup_id=?1 ORDER BY id DESC LIMIT 1`)
          .bind(followupId)
          .first<any>();
        const issues = await env.DB
          .prepare(`SELECT * FROM followup_issues WHERE followup_id=?1 ORDER BY id DESC`)
          .bind(followupId)
          .all<any>();
        const details = { followup, feedback, issues: issues.results ?? [] };
        return jsonResponse(request, { success: true, data: details, details });
      }
    }

    if (url.pathname === '/api/follow-up/followups' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      const customerId = toInt(data.customer_id, null);
      const followupDate = String(data.followup_date ?? todayISODate()).trim();
      const contactMethod = String(data.contact_method ?? 'phone').trim();
      const scheduledBy = toInt(data.scheduled_by, null);
      if (!serviceOrderId || !customerId) return fail(request, 400, 'service_order_id and customer_id are required');
      const result = await env.DB
        .prepare(
          `INSERT INTO followups
           (service_order_id, customer_id, followup_date, contact_method, scheduled_by, status, created_at, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, 'pending', CURRENT_TIMESTAMP, ?6)`
        )
        .bind(serviceOrderId, customerId, followupDate, contactMethod, scheduledBy, adminId)
        .run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, followup_id: id }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/feedback$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, 'Invalid followup id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        await env.DB
          .prepare(
            `INSERT INTO followup_feedback
             (followup_id, overall_experience, would_recommend, comments, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, ?5)`
          )
          .bind(
            followupId,
            toInt(data.overall_experience, null),
            String(data.would_recommend ?? '').trim() || null,
            String(data.comments ?? '').trim() || null,
            adminId
          )
          .run();
        return ok(request, null, { message: 'Feedback recorded' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/issues$/);
      if (m && request.method === 'POST') {
        const adminId = getAdminId(request);
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, 'Invalid followup id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        await env.DB
          .prepare(
            `INSERT INTO followup_issues
             (followup_id, issue_category, issue_description, severity, status, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, 'open', CURRENT_TIMESTAMP, ?5)`
          )
          .bind(
            followupId,
            String(data.issue_category ?? '').trim() || null,
            String(data.issue_description ?? '').trim() || null,
            String(data.severity ?? '').trim() || 'medium',
            adminId
          )
          .run();
        return ok(request, null, { message: 'Issue logged' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/complete$/);
      if (m && request.method === 'POST') {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, 'Invalid followup id');
        const data = await readJson<any>(request);
        await env.DB
          .prepare(
            `UPDATE followups
             SET status='completed', completed_by=?1, contact_person_name=?2, notes=?3, completed_at=CURRENT_TIMESTAMP
             WHERE id=?4`
          )
          .bind(
            toInt(data?.completed_by, null),
            String(data?.contact_person_name ?? '').trim() || null,
            String(data?.notes ?? '').trim() || null,
            followupId
          )
          .run();
        return ok(request, null, { message: 'Follow-up completed' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/follow-up\/issues\/(\d+)\/resolve$/);
      if (m && request.method === 'POST') {
        const issueId = toInt(m[1], null);
        if (!issueId) return fail(request, 400, 'Invalid issue id');
        const data = await readJson<any>(request);
        await env.DB
          .prepare(
            `UPDATE followup_issues
             SET status='resolved', resolution_type=?1, resolution_notes=?2, resolved_at=CURRENT_TIMESTAMP
             WHERE id=?3`
          )
          .bind(
            String(data?.resolution_type ?? '').trim() || null,
            String(data?.resolution_notes ?? '').trim() || null,
            issueId
          )
          .run();
        return ok(request, null, { message: 'Issue resolved' });
      }
    }

    // ==================== CAR JOCKEY ====================
    if (url.pathname === '/api/car-jockey/movements/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT 
             m.*,
             so.id as so_no,
             m.service_order_id as so_id,
             m.movement_type as type,
             m.from_location as "from",
             m.to_location as "to",
             c.name as customer,
             COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
           FROM car_jockey_movements m
           LEFT JOIN service_orders so ON m.service_order_id = so.id
           LEFT JOIN customers c ON so.customer_id = c.id
           WHERE m.status='active' AND m.admin_id = ?1
           ORDER BY m.started_at DESC, m.id DESC`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/car-jockey/parking/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT 
             p.*,
             so.id as so_no,
             p.service_order_id as so_id,
             p.parking_slot as slot,
             p.parking_zone as zone,
             c.name as customer,
             COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
             (strftime('%s', CURRENT_TIMESTAMP) - strftime('%s', p.parked_at)) / 3600.0 as duration_hrs,
             p.parking_fee as fee
           FROM car_jockey_parking p
           LEFT JOIN service_orders so ON p.service_order_id = so.id
           LEFT JOIN customers c ON so.customer_id = c.id
           WHERE p.status='active' AND p.admin_id = ?1
           ORDER BY p.parked_at DESC, p.id DESC`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/car-jockey/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const activeMovements = await env.DB.prepare(`SELECT COUNT(*) as n FROM car_jockey_movements WHERE status='active' AND admin_id = ?1`).bind(adminId).first<any>();
      const parked = await env.DB.prepare(`SELECT COUNT(*) as n FROM car_jockey_parking WHERE status='active' AND admin_id = ?1`).bind(adminId).first<any>();
      return ok(request, {
        active_movements: Number(activeMovements?.n ?? 0),
        parked_vehicles: Number(parked?.n ?? 0)
      });
    }

    if (url.pathname === '/api/car-jockey/vehicles/pending' && request.method === 'GET') {
      // Approximation: service_orders that are completed but have no movement started yet.
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id as so_id, c.name as customer_name, COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                  so.status, so.created_at
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='completed'
             AND so.id NOT IN (SELECT service_order_id FROM car_jockey_movements)
             AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 100`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/car-jockey/movements' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');
      const result = await env.DB
        .prepare(
          `INSERT INTO car_jockey_movements
           (service_order_id, jockey_id, movement_type, from_location, to_location, reason, vehicle_condition_start,
            fuel_start, mileage_start, started_at, status, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP, 'active', ?10)`
        )
        .bind(
          serviceOrderId,
          toInt(data.jockey_id, null),
          String(data.movement_type ?? '').trim() || 'check-in',
          String(data.from_location ?? '').trim() || null,
          String(data.to_location ?? '').trim() || null,
          String(data.reason ?? '').trim() || null,
          String(data.vehicle_condition ?? '').trim() || null,
          toFloat(data.fuel_level, null),
          toFloat(data.mileage, null),
          adminId
        )
        .run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, movement_id: id }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/car-jockey\/movements\/(\d+)\/complete$/);
      if (m && request.method === 'POST') {
        const movementId = toInt(m[1], null);
        if (!movementId) return fail(request, 400, 'Invalid movement id');
        const data = await readJson<any>(request);
        await env.DB
          .prepare(
            `UPDATE car_jockey_movements
             SET status='completed', completed_at=CURRENT_TIMESTAMP,
                 vehicle_condition_end=?1, fuel_end=?2, mileage_end=?3
             WHERE id=?4`
          )
          .bind(
            String(data?.vehicle_condition ?? '').trim() || null,
            toFloat(data?.fuel_level, null),
            toFloat(data?.mileage, null),
            movementId
          )
          .run();
        return ok(request, null, { message: 'Movement completed' });
      }
    }

    if (url.pathname === '/api/car-jockey/parking' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');
      const result = await env.DB
        .prepare(
          `INSERT INTO car_jockey_parking
           (service_order_id, vehicle_movement_id, parking_slot, parking_zone, parking_level, ground_condition, parking_fee, parked_at, status, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, 'active', ?8)`
        )
        .bind(
          serviceOrderId,
          toInt(data.vehicle_movement_id, null),
          String(data.parking_slot ?? '').trim() || null,
          String(data.parking_zone ?? '').trim() || null,
          toInt(data.parking_level, null),
          String(data.ground_condition ?? '').trim() || null,
          toFloat(data.parking_fee, null),
          adminId
        )
        .run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, parking_id: id }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/car-jockey\/parking\/(\d+)\/release$/);
      if (m && request.method === 'POST') {
        const parkingId = toInt(m[1], null);
        if (!parkingId) return fail(request, 400, 'Invalid parking id');
        await env.DB
          .prepare(`UPDATE car_jockey_parking SET status='released', released_at=CURRENT_TIMESTAMP WHERE id=?1`)
          .bind(parkingId)
          .run();
        return ok(request, null, { message: 'Vehicle released' });
      }
    }

    if (url.pathname === '/api/car-jockey/parts-requests' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');
      const result = await env.DB
        .prepare(
          `INSERT INTO car_jockey_parts_requests
           (service_order_id, requested_by, document_data, status, created_at, admin_id)
           VALUES (?1, ?2, ?3, 'pending', CURRENT_TIMESTAMP, ?4)`
        )
        .bind(serviceOrderId, toInt(data.requested_by, null), JSON.stringify(data.items ?? []), adminId)
        .run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, request_id: id }, 201);
    }

    // ==================== JOB CONTROLLER ====================
    if (url.pathname === '/api/job-controller/service-orders/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id,
                  c.name as customer,
                  c.contact_no as contact,
                  c.vehicle_model as model,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  so.service_type,
                  so.check_in_time,
                  so.status,
                  0 as assigned_count
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='pending' AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [
        r.id,
        r.customer,
        r.contact,
        r.model || 'Unknown Model',
        r.vehicle,
        r.service_type,
        r.check_in_time,
        r.status,
        null,
        r.assigned_count
      ]);
      return ok(request, rows);
    }

    if (url.pathname === '/api/job-controller/service-orders/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id,
                  c.name as customer,
                  c.contact_no,
                  c.vehicle_model as model,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  so.service_type,
                  t.name as technician_name,
                  ta.status as assignment_status,
                  ta.clock_in_time,
                  ta.clock_out_time,
                  ta.labor_hours,
                  ta.id as assignment_id
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN job_controller_assignments ta ON ta.service_order_id = so.id
           LEFT JOIN technicians t ON t.id = ta.technician_id
           WHERE so.status='in-progress' AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [
        r.id,
        r.customer,
        r.contact_no,
        r.model || 'Unknown Model',
        r.vehicle,
        r.service_type,
        r.technician_name,
        r.assignment_status,
        r.clock_in_time,
        r.clock_out_time,
        r.labor_hours,
        r.assignment_id
      ]);
      return ok(request, rows);
    }

    if (url.pathname === '/api/job-controller/technicians/available' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT t.id, t.name, t.employee_id, t.status, t.specialization,
                  (SELECT COUNT(*) FROM job_controller_assignments jca
                   WHERE jca.technician_id = t.id AND jca.status IN ('assigned','in-progress')) AS active_jobs
           FROM technicians t
           WHERE t.status='active' AND t.admin_id = ?1
           ORDER BY t.name ASC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [r.id, r.name, r.employee_id, r.status, r.active_jobs ?? 0, r.specialization ?? '']);
      return ok(request, rows);
    }

    if (url.pathname === '/api/job-controller/assign' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      const technicianId = toInt(data.technician_id, null);
      if (!serviceOrderId || !technicianId) return fail(request, 400, 'service_order_id and technician_id are required');
      const assignedBy = String(data.assigned_by ?? '').trim();
      const result = await env.DB
        .prepare(
          `INSERT INTO job_controller_assignments
           (service_order_id, technician_id, assigned_by, assigned_at, status, admin_id)
           VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, 'assigned', ?4)`
        )
        .bind(serviceOrderId, technicianId, assignedBy || null, adminId)
        .run();
      await env.DB.prepare(`UPDATE service_orders SET status='in-progress' WHERE id=?1`).bind(serviceOrderId).run();
      const id = await d1FirstId(result);

      // Emit real-time event for technician assignment
      emitEvent('job-controller', 'technician-assigned', {
        assignment_id: id,
        service_order_id: serviceOrderId,
        technician_id: technicianId
      });

      return jsonResponse(request, { success: true, assignment_id: id }, 201);
    }

    if (url.pathname === '/api/job-controller/clock-in' && request.method === 'POST') {
      const data = await readJson<any>(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, 'assignment_id is required');
      await env.DB
        .prepare(`UPDATE job_controller_assignments SET clock_in_time=COALESCE(clock_in_time, CURRENT_TIMESTAMP), status='in-progress' WHERE id=?1`)
        .bind(assignmentId)
        .run();

      // Emit real-time event
      emitEvent('job-controller', 'clock-in', { assignment_id: assignmentId });

      return ok(request, null, { message: 'Clock-in recorded' });
    }

    if (url.pathname === '/api/job-controller/clock-out' && request.method === 'POST') {
      const data = await readJson<any>(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, 'assignment_id is required');
      await env.DB
        .prepare(
          `UPDATE job_controller_assignments
           SET clock_out_time=CURRENT_TIMESTAMP, status='completed'
           WHERE id=?1`
        )
        .bind(assignmentId)
        .run();

      // Emit real-time event
      emitEvent('job-controller', 'clock-out', { assignment_id: assignmentId });

      return ok(request, null, { message: 'Clock-out recorded' });
    }

    {
      const m = url.pathname.match(/^\/api\/job-controller\/labor-summary\/(\d+)$/);
      if (m && request.method === 'GET') {
        const techId = toInt(m[1], null);
        if (!techId) return fail(request, 400, 'Invalid technician id');
        const row = await env.DB
          .prepare(
            `SELECT
               COUNT(*) as jobs,
               SUM(COALESCE(labor_hours,0)) as total_hours
             FROM job_controller_assignments
             WHERE technician_id=?1`
          )
          .bind(techId)
          .first<any>();
        return ok(request, { jobs: Number(row?.jobs ?? 0), total_hours: Number(row?.total_hours ?? 0) });
      }
    }

    // ==================== PARTS REQUESTS (JOB CONTROLLER) ====================
    if (url.pathname === '/api/job-controller/parts-requests/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(`
          SELECT
            pr.id,
            pr.service_order_id,
            pr.created_at,
            pr.notes,
            t.name as technician_name,
            c.name as customer_name,
            COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
            so.service_type,
            pr.status
          FROM parts_requests pr
          LEFT JOIN technicians t ON pr.requested_by = t.id
          LEFT JOIN service_orders so ON pr.service_order_id = so.id
          LEFT JOIN customers c ON so.customer_id = c.id
          WHERE pr.status IN ('pending', 'sent-to-warehouse') AND pr.admin_id = ?1
          ORDER BY pr.created_at ASC
        `)
        .bind(adminId)
        .all<any>();

      // Fetch items for each request
      const requestIds = (rs.results ?? []).map((r: any) => r.id);
      let itemsByReq: Record<number, any[]> = {};

      if (requestIds.length > 0) {
        const placeholders = requestIds.map(() => '?').join(',');
        const itemsRs = await env.DB.prepare(`
          SELECT 
            pri.parts_request_id, 
            pri.product_id, 
            pri.quantity_requested, 
            wp.product_name, 
            wp.product_code
          FROM parts_request_items pri
          LEFT JOIN warehouse_products wp ON pri.product_id = wp.id
          WHERE pri.parts_request_id IN (${placeholders})
        `).bind(...requestIds).all<any>();

        (itemsRs.results ?? []).forEach((item: any) => {
          if (!itemsByReq[item.parts_request_id]) itemsByReq[item.parts_request_id] = [];
          itemsByReq[item.parts_request_id].push(item);
        });
      }

      const result = (rs.results ?? []).map((r: any) => ({
        ...r,
        items: itemsByReq[r.id] || []
      }));

      return ok(request, result);
    }

    // Get completed/delivered parts requests history (for Job Controller)
    if (url.pathname === '/api/job-controller/parts-requests/completed' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const limit = Math.min(toInt(url.searchParams.get('limit'), 20) ?? 20, 100);
      const rs = await env.DB
        .prepare(`
          SELECT
            pr.id,
            pr.service_order_id,
            pr.created_at,
            pr.updated_at,
            pr.notes,
            t.name as technician_name,
            c.name as customer_name,
            COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
            so.service_type,
            pr.status
          FROM parts_requests pr
          LEFT JOIN technicians t ON pr.requested_by = t.id
          LEFT JOIN service_orders so ON pr.service_order_id = so.id
          LEFT JOIN customers c ON so.customer_id = c.id
          WHERE pr.status IN ('completed', 'cancelled') AND pr.admin_id = ?1
          ORDER BY pr.updated_at DESC
          LIMIT ?2
        `)
        .bind(adminId, limit)
        .all<any>();

      // Fetch items for each request
      const requestIds = (rs.results ?? []).map((r: any) => r.id);
      let itemsByReq: Record<number, any[]> = {};

      if (requestIds.length > 0) {
        const placeholders = requestIds.map(() => '?').join(',');
        const itemsRs = await env.DB.prepare(`
          SELECT 
            pri.parts_request_id, 
            pri.product_id, 
            pri.quantity_requested, 
            wp.product_name, 
            wp.product_code
          FROM parts_request_items pri
          LEFT JOIN warehouse_products wp ON pri.product_id = wp.id
          WHERE pri.parts_request_id IN (${placeholders})
        `).bind(...requestIds).all<any>();

        (itemsRs.results ?? []).forEach((item: any) => {
          if (!itemsByReq[item.parts_request_id]) itemsByReq[item.parts_request_id] = [];
          itemsByReq[item.parts_request_id].push(item);
        });
      }

      const result = (rs.results ?? []).map((r: any) => ({
        ...r,
        items: itemsByReq[r.id] || []
      }));

      return ok(request, result);
    }

    if (url.pathname === '/api/job-controller/products/search' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const q = url.searchParams.get('q') || '';
      if (!q || q.length < 2) {
         return ok(request, []);
      }
      try {
        const results = await env.DB.prepare(`
          SELECT id, product_name, product_code, quantity_in_stock, unit_price
          FROM warehouse_products
          WHERE (product_name LIKE ? OR product_code LIKE ?) AND admin_id = ?
          LIMIT 50
        `).bind(`%${q}%`, `%${q}%`, adminId).all();
        return ok(request, results.results || []);
      } catch (e: any) {
        return fail(request, 500, `Search error: ${e.message}`);
      }
    }

    if (url.pathname === '/api/job-controller/parts-requests' && request.method === 'POST') {
      try {
        const adminId = getAdminId(request);
        const body = await readJson<any>(request);
        if (!body || !body.service_order_id || !body.items || !Array.isArray(body.items)) {
          return fail(request, 400, 'service_order_id and items array required');
        }

        // 1. Create Request
        const res1 = await env.DB.prepare(`
            INSERT INTO parts_requests (service_order_id, requested_by, requested_by_role, status, notes, admin_id)
            VALUES (?, ?, 'job_controller', 'sent-to-warehouse', ?, ?)
          `)
          .bind(body.service_order_id, body.technician_id || null, body.notes || '', adminId)
          .run();

        if (!res1.success) return fail(request, 500, 'Failed to create request');
        const requestId = await d1FirstId(res1);

        // 2. Insert items
        const stmts = body.items.map((p: any) =>
          env.DB.prepare(`
                INSERT INTO parts_request_items (parts_request_id, product_id, quantity_requested, status, admin_id)
                VALUES (?, ?, ?, 'pending', ?)
            `).bind(requestId, p.product_id, p.quantity, adminId)
        );

        await env.DB.batch(stmts);

        // Emit real-time event for warehouse
        emitEvent('warehouse', 'new-parts-request', {
          request_id: requestId,
          service_order_id: body.service_order_id,
          item_count: body.items.length
        });

        return ok(request, { success: true, request_id: requestId });
      } catch (e: any) {
        return fail(request, 500, `Parts request failed: ${e.message}`);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/job-controller\/parts-requests\/(\d+)\/approve$/);
      if (m && request.method === 'POST') {
        const id = toInt(m[1], null);
        if (!id) return fail(request, 400, 'Invalid ID');

        // Update status and forward to warehouse
        await env.DB.prepare(`
          UPDATE parts_requests
          SET status = 'sent-to-warehouse', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1
        `).bind(id).run();

        // Emit real-time event
        emitEvent('warehouse', 'parts-request-approved', { request_id: id });

        return ok(request, { success: true });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/job-controller\/parts-requests\/(\d+)\/fulfill$/);
      if (m && request.method === 'POST') {
        const id = toInt(m[1], null);
        if (!id) return fail(request, 400, 'Invalid ID');

        // Update status to completed (fulfilled)
        await env.DB.prepare(`
          UPDATE parts_requests
          SET status = 'completed', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1
        `).bind(id).run();

        // Emit real-time event
        emitEvent('job-controller', 'parts-request-fulfilled', { request_id: id });

        return ok(request, { success: true });
      }
    }


    {
      const m = url.pathname.match(/^\/api\/job-controller\/clock-records\/(\d+)$/);
      if (m && request.method === 'GET') {
        const techId = toInt(m[1], null);
        if (!techId) return fail(request, 400, 'Invalid technician id');
        const rs = await env.DB
          .prepare(
            `SELECT id, service_order_id, clock_in_time, clock_out_time, labor_hours, status
             FROM job_controller_assignments
             WHERE technician_id=?1
             ORDER BY assigned_at DESC, id DESC
             LIMIT 100`
          )
          .bind(techId)
          .all<any>();
        return ok(request, rs.results ?? []);
      }
    }

    // ==================== JOB WRAP-UP ====================
    if (url.pathname === '/api/job-wrapup/jobs/ready' && request.method === 'GET') {
      // QC-passed jobs ready for Job Controller wrap-up
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id as service_order_id,
                  'JOB-' || printf('%05d', so.id) as job_order_no,
                  c.name as customer,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  jca.technician_id,
                  t.name as technician_name,
                  'passed' as qc_status,
                  jca.clock_in_time,
                  jca.clock_out_time
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN job_controller_assignments jca ON jca.service_order_id = so.id AND jca.status = 'completed'
           LEFT JOIN technicians t ON t.id = jca.technician_id
           WHERE so.status='qc-passed'
             AND so.id NOT IN (SELECT service_order_id FROM job_wrapups WHERE service_order_id IS NOT NULL)
             AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 100`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [        r.service_order_id,
        r.job_order_no,
        r.customer,
        r.vehicle,
        r.technician_id,
        r.technician_name,
        r.qc_status,
        r.clock_in_time,
        r.clock_out_time
      ]);
      return ok(request, rows);
    }

    // Wrapups with status='stopped' ready to be returned to SA
    if (url.pathname === '/api/job-wrapup/wrapups/active' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT jw.id, jw.service_order_id, jw.technician_id, jw.final_status, jw.total_labor_hours, jw.created_at,
                  c.name as customer_name,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  t.name as technician_name
           FROM job_wrapups jw
           LEFT JOIN service_orders so ON so.id = jw.service_order_id
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN technicians t ON t.id = jw.technician_id
           WHERE jw.final_status='stopped' AND jw.admin_id = ?1
           ORDER BY jw.created_at DESC, jw.id DESC`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/job-wrapup/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE admin_id = ?1`).bind(adminId).first<any>();
      const stopped = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE final_status='stopped' AND admin_id = ?1`).bind(adminId).first<any>();
      const returned = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE final_status='returned' AND admin_id = ?1`).bind(adminId).first<any>();
      const qcPassed = await env.DB.prepare(`SELECT COUNT(*) as n FROM service_orders WHERE status='qc-passed' AND id NOT IN (SELECT service_order_id FROM job_wrapups WHERE service_order_id IS NOT NULL) AND admin_id = ?1`).bind(adminId).first<any>();
      const avg = await env.DB.prepare(`SELECT AVG(COALESCE(total_labor_hours,0)) as n FROM job_wrapups WHERE admin_id = ?1`).bind(adminId).first<any>();
      return ok(request, {
        total_wrapups: Number(total?.n ?? 0),
        qc_passed_count: Number(qcPassed?.n ?? 0),  // Ready for Stop Clock
        stopped_count: Number(stopped?.n ?? 0),     // Ready for Return to SA
        returned_count: Number(returned?.n ?? 0),
        avg_labor_hours: Number(avg?.n ?? 0)
      });
    }

    // Create wrapup (Stop Clock action) - calculates labor hours from assignment times
    if (url.pathname === '/api/job-wrapup/wrapups' && request.method === 'POST') {
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');
      
      // Calculate labor hours from job_controller_assignment clock times
      const assignment = await env.DB.prepare(
        `SELECT clock_in_time, clock_out_time, technician_id
         FROM job_controller_assignments 
         WHERE service_order_id=?1 AND status='completed'
         ORDER BY clock_out_time DESC LIMIT 1`
      ).bind(serviceOrderId).first<any>();
      
      let laborHours = data.labor_hours || 0;
      if (assignment?.clock_in_time && assignment?.clock_out_time) {
        const start = new Date(assignment.clock_in_time).getTime();
        const end = new Date(assignment.clock_out_time).getTime();
        laborHours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimals
      }
      
      const result = await env.DB
        .prepare(
          `INSERT INTO job_wrapups
           (service_order_id, job_controller_id, technician_id, qc_inspection_id, total_labor_hours, final_status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'stopped', CURRENT_TIMESTAMP)`
        )
        .bind(serviceOrderId, toInt(data.job_controller_id, null), assignment?.technician_id || toInt(data.technician_id, null), toInt(data.qc_inspection_id, null), laborHours)
        .run();
      const id = await d1FirstId(result);
      emitEvent({ type: 'job-wrapup', action: 'stop-clock', service_order_id: serviceOrderId, wrapup_id: id, labor_hours: laborHours });
      return jsonResponse(request, { success: true, wrapup_id: id, labor_hours: laborHours }, 201);
    }

    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/clock-out$/);
      if (m && request.method === 'POST') {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, 'Invalid wrapup id');
        // Get current wrapup
        const row = await env.DB.prepare(`SELECT created_at FROM job_wrapups WHERE id=?1`).bind(wrapupId).first<any>();
        const createdAt = row?.created_at ? Date.parse(row.created_at) : Date.now();
        const hours = Math.max(0, (Date.now() - createdAt) / 3600000);
        const data = await readJson<any>(request);
        const notes = String(data?.notes ?? '').trim();
        await env.DB
          .prepare(
            `UPDATE job_wrapups
             SET clock_out_time=CURRENT_TIMESTAMP, total_labor_hours=?1, final_status='completed', job_completion_checklist=COALESCE(job_completion_checklist, ?2)
             WHERE id=?3`
          )
          .bind(hours, notes || null, wrapupId)
          .run();
        return jsonResponse(request, { success: true, labor_hours: hours });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/checklist$/);
      if (m && request.method === 'PUT') {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, 'Invalid wrapup id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        await env.DB
          .prepare(
            `UPDATE job_wrapups
             SET checklist_items=?1, materials_returned=?2, tools_returned=?3, vehicle_condition=?4, quality_passed=?5
             WHERE id=?6`
          )
          .bind(
            String(data.checklist_items ?? '').trim() || null,
            data.materials_returned ? 1 : 0,
            data.tools_returned ? 1 : 0,
            String(data.vehicle_condition ?? '').trim() || null,
            data.quality_passed ? 1 : 0,
            wrapupId
          )
          .run();
        return ok(request, null, { message: 'Checklist updated' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/return-to-sa$/);
      if (m && request.method === 'POST') {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, 'Invalid wrapup id');
        
        // Get the service_order_id for this wrapup
        const wrapup = await env.DB.prepare('SELECT service_order_id FROM job_wrapups WHERE id=?1').bind(wrapupId).first<any>();
        if (!wrapup) return fail(request, 404, 'Wrapup not found');
        
        // Update wrapup as ready-for-billing
        await env.DB
          .prepare(`UPDATE job_wrapups SET returned_to_sa_at=CURRENT_TIMESTAMP, final_status='ready-for-billing' WHERE id=?1`)
          .bind(wrapupId)
          .run();
        
        // Update service order status to 'ready-for-billing'
        await env.DB.prepare(`UPDATE service_orders SET status='ready-for-billing' WHERE id=?1`).bind(wrapup.service_order_id).run();
        
        emitEvent('job-wrapup', 'returned-to-sa', { service_order_id: wrapup.service_order_id, wrapup_id: wrapupId });
        return ok(request, null, { message: 'Returned to Service Advisor - Ready for billing' });
      }
    }

    // ==================== SERVICE ADVISOR ====================
    
    // Ready for Billing - jobs returned from Job Controller
    if (url.pathname === '/api/service-advisor/orders/ready-for-billing' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id,
                  so.customer_id,
                  c.name as customer_name,
                  c.contact_no,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                  c.vehicle_model,
                  so.service_type,
                  so.status,
                  jw.total_labor_hours,
                  jw.returned_to_sa_at,
                  t.name as technician_name
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN job_wrapups jw ON jw.service_order_id = so.id
           LEFT JOIN technicians t ON t.id = jw.technician_id
           WHERE so.status = 'ready-for-billing' AND so.admin_id = ?1
           ORDER BY jw.returned_to_sa_at DESC, so.id DESC
           LIMIT 100`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }
    
    if (url.pathname === '/api/service-advisor/appointments/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id,
                  so.customer_id,
                  c.name,
                  c.contact_no,
                  c.plate_no,
                  c.vehicle_model,
                  so.scheduled_date,
                  so.scheduled_time,
                  so.service_type,
                  so.status,
                  so.bay_id,
                  so.technician_id,
                  sb.bay_name,
                  t.name as technician_name
           FROM scheduling_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN service_bays sb ON sb.id = so.bay_id
           LEFT JOIN technicians t ON t.id = so.technician_id
           WHERE so.status IN ('scheduled','confirmed') AND so.admin_id = ?1
           ORDER BY so.scheduled_date ASC, so.scheduled_time ASC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [
        r.id,
        r.customer_id,
        r.name,
        r.contact_no,
        r.plate_no,
        r.vehicle_model,
        r.scheduled_date,
        r.scheduled_time,
        r.service_type,
        r.status,
        r.bay_id,
        r.technician_id,
        r.bay_name,
        r.technician_name
      ]);
      return ok(request, rows);
    }

    if (url.pathname === '/api/service-advisor/service-orders/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT so.id, 
                  c.name, 
                  c.contact_no,
                  c.vehicle_model,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no, 
                  so.service_type, 
                  so.status, 
                  so.created_at
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='pending' AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC`
        )
        .bind(adminId)
        .all<any>();
      const rows = (rs.results ?? []).map((r: any) => [
          r.id, 
          r.name, 
          r.contact_no, 
          r.vehicle_model, 
          r.plate_no, 
          r.service_type, 
          r.status, 
          r.created_at
      ]);
      return ok(request, rows);
    }

    if (url.pathname === '/api/service-advisor/check-in' && request.method === 'POST') {
      try {
        const adminId = getAdminId(request);
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        const schedulingOrderId = toInt(data.scheduling_order_id, null);
        const advisorId = toInt(data.advisor_id, null);
        if (!schedulingOrderId) return fail(request, 400, 'scheduling_order_id is required');

        // Fetch customer details along with ID
        const sched = await env.DB
          .prepare(
            `SELECT s.customer_id, s.service_type, 
                    c.name, c.contact_no, c.email, c.address, 
                    c.plate_no, c.vehicle_model, c.vehicle_year, c.engine_no, c.chassis_no
             FROM scheduling_orders s
             LEFT JOIN customers c ON c.id = s.customer_id
             WHERE s.id=?1`
          )
          .bind(schedulingOrderId)
          .first<any>();

        if (!sched) return fail(request, 404, 'Scheduling order not found');

        // VALIDATE ADVISOR (Fix for FK constraint failure)
        let validAdvisorId = advisorId;
        if (validAdvisorId) {
          const advExists = await env.DB.prepare('SELECT id FROM service_advisors WHERE id=?1').bind(validAdvisorId).first();
          if (!advExists) validAdvisorId = null;
        }
        if (!validAdvisorId) {
          // Fallback to first available advisor if provided ID is invalid
          const firstAdv = await env.DB.prepare('SELECT id FROM service_advisors LIMIT 1').first<any>();
          validAdvisorId = firstAdv?.id ?? null;
        }

        // Check if already exists to prevent duplicates (though we don't have unique constraint, good practice)
        // const existing = await env.DB.prepare('SELECT id FROM service_orders WHERE scheduling_order_id=?1').bind(schedulingOrderId).first();
        // if (existing) return fail(request, 409, 'Order already checked in');

        const result = await env.DB
          .prepare(
            `INSERT INTO service_orders
             (scheduling_order_id, customer_id, vehicle_plate_no, service_type, check_in_time, status, advisor_id, created_at, admin_id)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, 'pending', ?5, CURRENT_TIMESTAMP, ?6)`
          )
          .bind(
               schedulingOrderId, 
               sched.customer_id, 
               sched.plate_no || null, 
               sched.service_type || null, 
               validAdvisorId,
               adminId
          )
          .run();
          
        await env.DB.prepare(`UPDATE scheduling_orders SET status='in-progress' WHERE id=?1`).bind(schedulingOrderId).run();
        const serviceOrderId = await d1FirstId(result);

        // Emit real-time event for Job Controller
        emitEvent('job-controller', 'new-check-in', {
          service_order_id: serviceOrderId,
          customer_name: sched.name,
          plate_no: sched.plate_no,
          service_type: sched.service_type
        });

        return jsonResponse(request, { 
          success: true, 
          service_order_id: serviceOrderId,
          details: {
              customer_id: sched.customer_id,
              name: sched.name,
              contact_no: sched.contact_no,
              email: sched.email,
              address: sched.address,
              vehicle_plate_no: sched.plate_no,
              vehicle_model: sched.vehicle_model,
              vehicle_year: sched.vehicle_year,
              engine_no: sched.engine_no,
              chassis_no: sched.chassis_no,
              service_type: sched.service_type
          }
        }, 201);
      } catch (e: any) {
        // Log to console so we can see it in 'wrangler tail' if available, but return it to client too
        console.error('Check-in error:', e.message, e.cause, e.stack);
        return fail(request, 500, 'Check-in failed: ' + e.message + (e.stack ? ' Stack: ' + e.stack : ''));
      }
    }

    if (url.pathname === '/api/service-advisor/cis' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const customerId = toInt(data.customer_id, null);
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!customerId || !serviceOrderId) return fail(request, 400, 'customer_id and service_order_id are required');
      await env.DB
        .prepare(
          `INSERT INTO customer_info_sheets
           (customer_id, service_order_id, name, contact_no, email, address, vehicle_plate_no, vehicle_model, vehicle_year,
            engine_no, chassis_no, mileage_in, service_type, notes, created_at, created_by, admin_id)
           VALUES
           (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, CURRENT_TIMESTAMP, ?15, ?16)`
        )
        .bind(
          customerId,
          serviceOrderId,
          String(data.name ?? '').trim(),
          String(data.contact_no ?? '').trim(),
          String(data.email ?? '').trim() || null,
          String(data.address ?? '').trim() || null,
          String(data.vehicle_plate_no ?? '').trim() || null,
          String(data.vehicle_model ?? '').trim() || null,
          toInt(data.vehicle_year, null),
          String(data.engine_no ?? '').trim() || null,
          String(data.chassis_no ?? '').trim() || null,
          toInt(data.mileage_in, null),
          String(data.service_type ?? '').trim() || null,
          String(data.notes ?? '').trim() || null,
          String(data.created_by ?? '').trim() || null,
          adminId
        )
        .run();
      return ok(request, null, { message: 'CIS saved' });
    }

    if (url.pathname === '/api/service-advisor/vrc' && request.method === 'POST') {
      try {
        const adminId = getAdminId(request);
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');
        
        // Robust ID handling
        let serviceOrderId = toInt(data.service_order_id, null);
        let customerId = toInt(data.customer_id, null);
        
        if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');

        // Lookup Service Order & fetch customerId if missing
        const soRow = await env.DB.prepare('SELECT id, customer_id FROM service_orders WHERE id=?1').bind(serviceOrderId).first<any>();
        if (!soRow) return fail(request, 404, `Service Order ID ${serviceOrderId} not found`);
        
        if (!customerId) customerId = soRow.customer_id;

        await env.DB
          .prepare(
            `INSERT INTO vehicle_report_cards
             (service_order_id, customer_id, mileage_in, mileage_out, exterior_condition, interior_condition,
              checklist_1_engine, checklist_2_fluids, checklist_3_brakes, checklist_4_suspension, checklist_5_battery,
              checklist_6_tires, checklist_7_lights, checklist_8_body, checklist_9_wipers, checklist_10_handbrake,
              additional_findings, settings_restored, diagnosis_completed_by, diagnosis_date, created_at, admin_id)
             VALUES
             (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?20)`
          )
          .bind(
            serviceOrderId,
            customerId,
            toInt(data.mileage_in, null),
            toInt(data.mileage_out, null),
            String(data.exterior_condition ?? '').trim() || null,
            String(data.interior_condition ?? '').trim() || null,
            String(data.checklist_1_engine ?? 'na'),
            String(data.checklist_2_fluids ?? 'na'),
            String(data.checklist_3_brakes ?? 'na'),
            String(data.checklist_4_suspension ?? 'na'),
            String(data.checklist_5_battery ?? 'na'),
            String(data.checklist_6_tires ?? 'na'),
            String(data.checklist_7_lights ?? 'na'),
            String(data.checklist_8_body ?? 'na'),
            String(data.checklist_9_wipers ?? 'na'),
            String(data.checklist_10_handbrake ?? 'na'),
            String(data.notes || data.additional_findings || '').trim() || null,
            data.settings_restored ? 1 : 0,
            String(data.diagnosis_completed_by || 'Service Advisor').trim(),
            adminId
          )
          .run();
        return ok(request, null, { message: 'VRC saved' });
      } catch (e: any) {
        console.error('VRC Save Error:', e.message, e.stack);
        return fail(request, 500, 'VRC save failed: ' + e.message);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/service-advisor\/vrc\/(\d+)$/);
      if (m && request.method === 'GET') {
        const soId = toInt(m[1], null);
        if (!soId) return fail(request, 400, 'Invalid ID');
        const vrc = await env.DB.prepare('SELECT * FROM vehicle_report_cards WHERE service_order_id=?1').bind(soId).first();
        
        // Also fetch assigned technician for this service order
        const techAssignment = await env.DB.prepare(
          `SELECT t.name as technician_name, t.id as technician_id, jca.status as assignment_status
           FROM job_controller_assignments jca
           JOIN technicians t ON t.id = jca.technician_id
           WHERE jca.service_order_id = ?1
           ORDER BY jca.assigned_at DESC
           LIMIT 1`
        ).bind(soId).first<any>();
        
        // Return combined data with VRC and technician info
        return ok(request, {
          vrc: vrc || null,
          technician: techAssignment ? {
            name: techAssignment.technician_name,
            id: techAssignment.technician_id,
            status: techAssignment.assignment_status
          } : null
        });
      }
    }

    if (url.pathname === '/api/service-advisor/orders' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT 
             so.id,
             c.name AS customer_name,
             c.contact_no,
             c.vehicle_model,
             COALESCE(so.vehicle_plate_no, c.plate_no) AS plate_no,
             so.service_type,
             so.status,
             so.created_at,
             so.check_in_time
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status IN ('pending', 'in-progress', 'completed') AND so.admin_id = ?1
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 50`
        )
        .bind(adminId)
        .all<any>();
        
      // Map to array format expected by frontend: [id, name, contact, model, plate, service_type, status, time]
      const rows = (rs.results ?? []).map((r: any) => [
          r.id, 
          r.customer_name || '', 
          r.contact_no || '', 
          r.vehicle_model || '',
          r.plate_no || '', 
          r.service_type || '', 
          r.status || '',
          r.check_in_time || r.created_at || ''
      ]);
      return ok(request, rows);
    }
    
    if (url.pathname === '/api/scheduler/check-availability' && request.method === 'GET') {
       // Using this as "Get Appointments" for now
       const adminId = getAdminId(request);
       const rs = await env.DB
        .prepare(
          `SELECT so.id,
                  c.name,
                  c.contact_no,
                  c.plate_no as vehicle,
                  c.vehicle_model,
                  so.scheduled_date,
                  so.scheduled_time,
                  so.service_type,
                  so.status,
                  so.id as appointment_id
           FROM scheduling_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status IN ('scheduled', 'confirmed') AND so.scheduled_date >= date('now') AND so.admin_id = ?1
           ORDER BY so.scheduled_date ASC, so.scheduled_time ASC
           LIMIT 20`
        )
        .bind(adminId)
        .all<any>();
        
       return ok(request, { 
           available: true, 
           appointments: (rs.results ?? []).map((r: any) => ({
               id: r.id,
               name: r.name,
               contact: r.contact_no,
               vehicle: r.vehicle,
               vehicle_model: r.vehicle_model,
               scheduled_time: r.scheduled_date + 'T' + r.scheduled_time,
               service_type: r.service_type,
               status: r.status
           }))
       });
    }

    {
      const m = url.pathname.match(/^\/api\/service-advisor\/documents\/(\d+)\/print$/);
      if (m && request.method === 'POST') {
        // Printing itself is handled by Electron IPC; backend just records event.
        return ok(request, null, { message: 'Print request accepted' });
      }
    }

    // ==================== GATEPASS ====================
    if (url.pathname === '/api/gatepass/pending' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT g.id, g.service_order_id, g.customer_id, g.status, g.created_at,
                  so.vehicle_plate_no as plate_no,
                  so.service_type,
                  c.name as customer_name,
                  c.contact_no,
                  vh.handover_status,
                  vh.id as handover_id
           FROM gatepasses g
           LEFT JOIN service_orders so ON g.service_order_id = so.id
           LEFT JOIN customers c ON g.customer_id = c.id
           LEFT JOIN vehicle_handovers vh ON vh.service_order_id = g.service_order_id
           WHERE g.status='pending' AND g.admin_id = ?1
           ORDER BY g.created_at DESC, g.id DESC`
        )
        .bind(adminId)
        .all<any>();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/gatepass/sign' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      const gatepassId = toInt(data.gatepass_id, null);
      const signatureType = String(data.signature_type ?? '').trim();
      const signedBy = toInt(data.signed_by, null);
      if (!gatepassId || !signatureType) return fail(request, 400, 'gatepass_id and signature_type are required');

      // Get gatepass to find service_order_id
      const gatepass = await env.DB.prepare(`SELECT service_order_id FROM gatepasses WHERE id=?1`).bind(gatepassId).first<any>();
      if (!gatepass) return fail(request, 404, 'Gatepass not found');

      // Check if vehicle handover is completed for this service order
      const handover = await env.DB
        .prepare(`SELECT id, handover_status FROM vehicle_handovers WHERE service_order_id=?1 ORDER BY id DESC LIMIT 1`)
        .bind(gatepass.service_order_id)
        .first<any>();
      
      if (!handover) {
        return fail(request, 400, 'Vehicle handover not found. Payment may not have been completed.');
      }
      if (handover.handover_status !== 'completed') {
        return fail(request, 400, 'Vehicle handover must be completed before releasing the vehicle. Please complete handover first.');
      }

      await env.DB
        .prepare(`INSERT INTO gatepass_signatures (gatepass_id, signature_type, signed_by, signed_at, admin_id) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, ?4)`)
        .bind(gatepassId, signatureType, signedBy, adminId)
        .run();
      await env.DB.prepare(`UPDATE gatepasses SET status='approved' WHERE id=?1`).bind(gatepassId).run();
      return ok(request, null, { message: 'Gatepass signed' });
    }

    // ==================== AUTH ====================
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const data = await readJson<{ username?: string; password?: string }>(request);
      const username = String(data?.username ?? '').trim();
      const password = String(data?.password ?? '').trim();

      if (!username || !password) {
        return jsonResponse(request, { success: false, error: 'Username and password required' }, 400);
      }

      const row = await env.DB
        .prepare(
          `SELECT id, username, name, role, email, location, admin_id
           FROM personnel
           WHERE username = ?1 AND password = ?2 AND status = 'active'
           LIMIT 1`
        )
        .bind(username, password)
        .first<{ id: number; username: string; name: string; role: string; email: string | null; location: string | null; admin_id: number | null }>();

      if (!row) {
        return jsonResponse(request, { success: false, error: 'Invalid credentials' }, 401);
      }

      // For admin users, admin_id is their own id. For staff, it's the admin who created them.
      const effectiveAdminId = row.role === 'admin' ? row.id : (row.admin_id ?? null);

      return jsonResponse(request, {
        success: true,
        user: {
          id: row.id,
          username: row.username,
          name: row.name,
          role: row.role,
          email: row.email ?? '',
          location: row.location ?? '',
          admin_id: effectiveAdminId
        }
      });
    }

    // ==================== REGISTER ADMIN ====================
    if (url.pathname === '/api/auth/register-admin' && request.method === 'POST') {
      const data = await readJson<{ username?: string; password?: string; name?: string; location?: string; email?: string }>(request);
      const username = String(data?.username ?? '').trim();
      const password = String(data?.password ?? '').trim();
      const name = String(data?.name ?? '').trim();
      const location = String(data?.location ?? '').trim();
      const email = String(data?.email ?? '').trim();

      if (!username || !password || !name || !location) {
        return jsonResponse(request, { success: false, error: 'username, password, name, and location are required' }, 400);
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO personnel (username, password, name, role, email, location, status)
             VALUES (?1, ?2, ?3, 'admin', ?4, ?5, 'active')`
          )
          .bind(username, password, name, email, location)
          .run();

        const lastId = (result as any)?.meta?.last_row_id ?? (result as any)?.meta?.lastRowId ?? null;

        return jsonResponse(request, {
          success: true,
          admin_id: lastId,
          message: `Admin account "${name}" created for ${location}`
        }, 201);
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? 'Failed to register admin');
        if (msg.includes('UNIQUE')) {
          return fail(request, 400, 'Username already exists');
        }
        return fail(request, 400, `DB Error: ${msg}`);
      }
    }

    // ==================== CUSTOMER (CRO) ====================
    if (url.pathname === '/api/customer/pms-due-list' && request.method === 'GET') {
      const rs = await env.DB
        .prepare(
          `SELECT 
             l.id, l.name, l.contact_no, l.plate_no, l.vehicle_model, l.last_service_date, l.days_since_service,
             (SELECT MAX(scheduled_date) FROM scheduling_orders WHERE customer_id = l.id) as last_appointment
           FROM pms_due_list l`
        )
        .all<{
          id: number;
          name: string;
          contact_no: string;
          plate_no: string | null;
          vehicle_model: string | null;
          last_service_date: string | null;
          days_since_service: number;
          last_appointment: string | null;
        }>();

      return ok(request, rs.results ?? []);
    }

    // ==================== CUSTOMER INTERACTIONS (CALL LOGS) ====================
    if (url.pathname === '/api/customer/interaction' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<{ 
        customer_id: number; 
        outcome: string; 
        notes?: string; 
        interaction_type?: string 
      }>(request);

      if (!data?.customer_id || !data?.outcome) {
        return fail(request, 400, 'customer_id and outcome are required');
      }

      // Default type to 'call' if not specified
      const type = data.interaction_type || 'call';
      // Default username to 'unknown' if header missing (should be passed from frontend)
      const user = request.headers.get('X-Auth-User') || 'system'; 

      const res = await env.DB.prepare(
        `INSERT INTO customer_interactions (customer_id, interaction_type, outcome, notes, created_by, admin_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(data.customer_id, type, data.outcome, data.notes || '', user, adminId)
      .run();

      if (!res.success) return fail(request, 500, 'Failed to log interaction');

      return ok(request, { id: await d1FirstId(res), ...data });
    }

    if (url.pathname === '/api/customer/interaction-history' && request.method === 'GET') {
      const urlObj = new URL(request.url);
      const customerId = urlObj.searchParams.get('customer_id');

      if (!customerId) return fail(request, 400, 'customer_id required');

      const rs = await env.DB.prepare(
        `SELECT * FROM customer_interactions 
         WHERE customer_id = ?1 
         ORDER BY created_at DESC 
         LIMIT 20`
      )
      .bind(customerId)
      .all();

      return ok(request, rs.results || []);
    }

    if (url.pathname === '/api/customer/interactions-recent' && request.method === 'GET') {
      const adminId = getAdminId(request);
      // Get recent interactions for dashboard stats (last 24 hours or just today)
      // SQLite doesn't have robust date diff, using string comparison for today (UTC)
      // For simplicity, just get last 100 items and filter in frontend or backend
      const rs = await env.DB.prepare(
        `SELECT * FROM customer_interactions 
         WHERE admin_id = ?1
         ORDER BY created_at DESC 
         LIMIT 100`
      ).bind(adminId).all();

      return ok(request, rs.results || []);
    }

    if (url.pathname === '/api/customer/search' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<{ search_type?: string; search_value?: string }>(request);
      const searchType = String(data?.search_type ?? '').trim();
      const rawValue = String(data?.search_value ?? '').trim();

      if (!searchType || !rawValue) {
        return fail(request, 400, 'search_type and search_value are required');
      }

      let where = '';
      let param = rawValue;
      if (searchType === 'plate') {
        where = 'plate_no LIKE ?1';
        param = `%${rawValue}%`;
      } else if (searchType === 'name') {
        where = 'name LIKE ?1';
        param = `%${rawValue}%`;
      } else if (searchType === 'contact') {
        where = 'contact_no LIKE ?1';
        param = `%${rawValue}%`;
      } else if (searchType === 'all') {
        where = '(name LIKE ?1 OR plate_no LIKE ?1 OR contact_no LIKE ?1)';
        param = `%${rawValue}%`;
      } else {
        return fail(request, 400, 'Invalid search_type');
      }

      const rs = await env.DB
        .prepare(
          `SELECT 
             c.id, c.name, c.contact_no, c.plate_no, c.vehicle_model, c.vehicle_year, c.email, c.last_service_date,
             CAST((julianday('now') - julianday(COALESCE(c.last_service_date, date('now')))) AS INTEGER) as days_since_service,
             (SELECT MAX(scheduled_date) FROM scheduling_orders WHERE customer_id = c.id) as last_appointment
           FROM customers c
           WHERE ${where} AND c.admin_id = ?2
           ORDER BY c.registration_date DESC
           LIMIT 50`
        )
        .bind(param, adminId)
        .all();

      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/customer/register' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const name = String(data.name ?? '').trim();
      const contact_no = String(data.contact_no ?? '').trim();
      const plate_no = String(data.plate_no ?? '').trim();
      const vehicle_model = String(data.vehicle_model ?? '').trim();

      if (!name || !contact_no || !plate_no || !vehicle_model) {
        return fail(request, 400, 'Name, contact_no, plate_no, and vehicle_model are required');
      }

      const forceCreate = Boolean(data.force_create);

      if (!forceCreate) {
        const dup = await env.DB
          .prepare(
            `SELECT id, name, contact_no, plate_no, vehicle_model
             FROM customers
             WHERE contact_no = ?1 OR plate_no = ?2
             LIMIT 10`
          )
          .bind(contact_no, plate_no)
          .all();

        if ((dup.results?.length ?? 0) > 0) {
          return jsonResponse(request, { status: 'warning', duplicates: dup.results ?? [] }, 200);
        }
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO customers
             (name, contact_no, plate_no, vehicle_model, vehicle_year, email, engine_no, chassis_no, address, city, customer_type, status, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'walk-in', 'active', ?11)`
          )
          .bind(
            name,
            contact_no,
            plate_no,
            vehicle_model,
            toInt(data.vehicle_year, null),
            String(data.email ?? '').trim() || null,
            String(data.engine_no ?? '').trim() || null,
            String(data.chassis_no ?? '').trim() || null,
            String(data.address ?? '').trim() || null,
            String(data.city ?? '').trim() || null,
            adminId
          )
          .run();

        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, customer_id: id }, 201);
      } catch (e: any) {
        return fail(request, 500, String(e?.message ?? e ?? 'Registration failed'));
      }
    }

    // ==================== SCHEDULER (CRO) ====================
    if (url.pathname === '/api/scheduler/check-availability' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<{ date?: string; time?: string }>(request);
      const date = String(data?.date ?? '').trim();
      const time = String(data?.time ?? '').trim();
      if (!date || !time) return fail(request, 400, 'date and time are required');

      const busy = await env.DB
        .prepare(
          `SELECT bay_id, technician_id, advisor_id
           FROM scheduling_orders
           WHERE scheduled_date = ?1 AND scheduled_time = ?2
             AND status IN ('scheduled','confirmed','in-progress') AND admin_id = ?3`
        )
        .bind(date, time, adminId)
        .all<{ bay_id: number | null; technician_id: number | null; advisor_id: number | null }>();

      const busyBay = new Set((busy.results ?? []).map((r) => r.bay_id).filter(Boolean) as number[]);
      const busyTech = new Set((busy.results ?? []).map((r) => r.technician_id).filter(Boolean) as number[]);
      const busyAdvisor = new Set((busy.results ?? []).map((r) => r.advisor_id).filter(Boolean) as number[]);

      const bays = await env.DB
        .prepare(`SELECT id, bay_name, capacity, bay_type, status FROM service_bays WHERE status = 'active' AND admin_id = ?1 ORDER BY bay_name ASC`)
        .bind(adminId)
        .all<any>();
      const techs = await env.DB
        .prepare(`SELECT id, name, specialization, status FROM technicians WHERE status = 'active' AND admin_id = ?1 ORDER BY name ASC`)
        .bind(adminId)
        .all<any>();
      const advisors = await env.DB
        .prepare(`SELECT id, name, status FROM service_advisors WHERE status = 'active' AND admin_id = ?1 ORDER BY name ASC`)
        .bind(adminId)
        .all<any>();

      return ok(request, {
        available_bays: (bays.results ?? []).filter((b: any) => !busyBay.has(b.id)),
        available_technicians: (techs.results ?? []).filter((t: any) => !busyTech.has(t.id)),
        available_advisors: (advisors.results ?? []).filter((a: any) => !busyAdvisor.has(a.id))
      });
    }

    if (url.pathname === '/api/scheduler/create-order' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const customerId = toInt(data.customer_id, null);
      const bayId = toInt(data.bay_id, null);
      const techId = toInt(data.technician_id, null);
      const advisorId = toInt(data.advisor_id, null);
      const date = String(data.scheduled_date ?? '').trim();
      const time = String(data.scheduled_time ?? '').trim();
      const serviceType = String(data.service_type ?? 'PMS').trim() || 'PMS';
      const createdBy = String(data.created_by ?? 'SYSTEM').trim() || 'SYSTEM';

      if (!customerId || !advisorId || !date || !time) {
        return fail(request, 400, 'customer_id, scheduled_date, scheduled_time, and advisor_id are required');
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO scheduling_orders
             (customer_id, scheduled_date, scheduled_time, bay_id, technician_id, advisor_id, service_type, status, priority, created_by, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'scheduled', 'normal', ?8, ?9)`
          )
          .bind(customerId, date, time, bayId || null, techId || null, advisorId, serviceType, createdBy, adminId)
          .run();

        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, order_id: id }, 201);
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? 'Failed to create order');
        const isUnique = /UNIQUE|constraint/i.test(msg);
        return fail(request, isUnique ? 400 : 500, isUnique ? 'Slot already taken' : msg);
      }
    }

    if (url.pathname === '/api/scheduler/log-contact-attempt' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const customerId = toInt(data.customer_id, null);
      const contactType = String(data.contact_type ?? '').trim();
      const status = String(data.status ?? 'attempted').trim() || 'attempted';
      const notes = data.notes ? String(data.notes) : null;
      const createdBy = String(data.created_by ?? 'SYSTEM').trim() || 'SYSTEM';

      if (!customerId || !contactType) {
        return fail(request, 400, 'customer_id and contact_type are required');
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO contact_attempts (customer_id, contact_type, attempt_date, status, notes, created_by, admin_id)
             VALUES (?1, ?2, CURRENT_TIMESTAMP, ?3, ?4, ?5, ?6)`
          )
          .bind(customerId, contactType, status, notes, createdBy, adminId)
          .run();

        const id = await d1FirstId(result);
        return ok(request, { attempt_id: id });
      } catch (e: any) {
        return fail(request, 500, String(e?.message ?? e ?? 'Failed to log contact attempt'));
      }
    }

    // ==================== SMS (CRO) ====================
    if (url.pathname === '/api/sms/queue-pms-batch' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<{ customer_ids?: unknown[]; created_by?: string }>(request);
      const customerIds = (data?.customer_ids ?? []).map((x) => toInt(x, null)).filter((x): x is number => !!x);
      const createdBy = String(data?.created_by ?? 'SYSTEM').trim() || 'SYSTEM';
      if (!customerIds.length) return fail(request, 400, 'customer_ids is required');

      const outboxIds: number[] = [];

      for (const customerId of customerIds) {
        const customer = await env.DB
          .prepare(`SELECT id, contact_no, name, plate_no FROM customers WHERE id = ?1 LIMIT 1`)
          .bind(customerId)
          .first<{ id: number; contact_no: string; name: string; plate_no: string | null }>();

        if (!customer) continue;

        const message = `Rapide PMS Reminder: Hi ${customer.name}, your vehicle${customer.plate_no ? ` (${customer.plate_no})` : ''} is due for PMS. Reply or call to book.`;

        const result = await env.DB
          .prepare(
            `INSERT INTO sms_outbox (customer_id, scheduling_order_id, purpose, phone, message, scheduled_at, status, provider, admin_id)
             VALUES (?1, NULL, 'PMS_OUTREACH', ?2, ?3, datetime('now'), 'queued', 'mock', ?4)`
          )
          .bind(customerId, customer.contact_no, message, adminId)
          .run();

        const id = await d1FirstId(result);
        if (typeof id === 'number') outboxIds.push(id);
      }

      return ok(request, null, { outbox_ids: outboxIds });
    }

    // ==================== WAREHOUSE ====================
    if (url.pathname === '/api/warehouse/products' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, status
           FROM warehouse_products
           WHERE admin_id = ?1
           ORDER BY id DESC`
        )
        .bind(adminId)
        .all<any>();

      const tuples = (rs.results ?? []).map((r: any) => [
        r.id,
        r.product_code,
        r.product_name,
        r.category,
        r.unit_price,
        r.quantity_in_stock,
        r.reorder_level,
        r.supplier,
        r.description,
        r.status
      ]);

      return ok(request, tuples);
    }

    if (url.pathname === '/api/warehouse/products' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const code = String(data.product_code ?? '').trim();
      const name = String(data.product_name ?? '').trim();
      const category = String(data.category ?? '').trim() || null;
      const unitPrice = toFloat(data.unit_price, null);
      const qty = toInt(data.quantity_in_stock, 0) ?? 0;
      const reorder = toInt(data.reorder_level, 10) ?? 10;
      const supplier = String(data.supplier ?? '').trim() || null;
      const description = String(data.description ?? '').trim() || null;
      const createdBy = String(data.created_by ?? 'SYSTEM').trim() || 'SYSTEM';

      if (!code || !name || unitPrice === null) {
        return fail(request, 400, 'product_code, product_name, and unit_price are required');
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO warehouse_products
             (product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, status, created_by, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'active', ?9, ?10)`
          )
          .bind(code, name, category, unitPrice, qty, reorder, supplier, description, createdBy, adminId)
          .run();

        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, product_id: id }, 201);
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? 'Failed to add product');
        const isUnique = /UNIQUE|constraint/i.test(msg);
        return fail(request, isUnique ? 400 : 500, isUnique ? 'Product code already exists' : msg);
      }
    }

    {
      const m = url.pathname.match(/^\/api\/warehouse\/products\/(\d+)$/);
      if (m && request.method === 'PUT') {
        const id = toInt(m[1], null);
        if (!id) return fail(request, 400, 'Invalid product id');
        const data = await readJson<any>(request);
        if (!data) return fail(request, 400, 'Invalid JSON');

        const code = String(data.product_code ?? '').trim();
        const name = String(data.product_name ?? '').trim();
        const category = String(data.category ?? '').trim() || null;
        const unitPrice = toFloat(data.unit_price, null);
        const qty = toInt(data.quantity_in_stock, null);
        const reorder = toInt(data.reorder_level, null);
        const supplier = String(data.supplier ?? '').trim() || null;
        const description = String(data.description ?? '').trim() || null;
        const status = data.status ? String(data.status).trim() : null;

        if (!code || !name || unitPrice === null || qty === null || reorder === null) {
          return fail(request, 400, 'product_code, product_name, unit_price, quantity_in_stock, reorder_level are required');
        }

        try {
          await env.DB
            .prepare(
              `UPDATE warehouse_products
               SET product_code=?1, product_name=?2, category=?3, unit_price=?4, quantity_in_stock=?5, reorder_level=?6,
                   supplier=?7, description=?8, status=COALESCE(?9, status), updated_at=CURRENT_TIMESTAMP
               WHERE id=?10`
            )
            .bind(code, name, category, unitPrice, qty, reorder, supplier, description, status, id)
            .run();
          return ok(request, null, { message: 'Product updated' });
        } catch (e: any) {
          return fail(request, 500, String(e?.message ?? e ?? 'Failed to update product'));
        }
      }
    }

    if (url.pathname === '/api/warehouse/summary' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const row = await env.DB
        .prepare(
          `SELECT
             COUNT(*) as total_products,
             COALESCE(SUM(quantity_in_stock), 0) as total_quantity,
             COALESCE(SUM(quantity_in_stock * unit_price), 0) as total_value,
             SUM(CASE WHEN quantity_in_stock <= reorder_level THEN 1 ELSE 0 END) as low_stock_count
           FROM warehouse_products
           WHERE status = 'active' AND admin_id = ?1`
        )
        .bind(adminId)
        .first<any>();

      return ok(request, {
        total_products: row?.total_products ?? 0,
        total_quantity: row?.total_quantity ?? 0,
        total_value: row?.total_value ?? 0,
        low_stock_count: row?.low_stock_count ?? 0
      });
    }

    if (url.pathname === '/api/warehouse/inventory/history' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const limit = Math.min(Math.max(toInt(url.searchParams.get('limit'), 50) ?? 50, 1), 200);
      const rs = await env.DB
        .prepare(
          `SELECT
             h.id,
             h.product_id,
             p.product_name,
             h.transaction_type,
             h.quantity,
             h.previous_quantity,
             h.new_quantity,
             h.reference_no,
             h.reference_type,
             h.created_by,
             h.notes,
             h.created_at
           FROM warehouse_inventory_history h
           JOIN warehouse_products p ON p.id = h.product_id
           WHERE h.admin_id = ?1
           ORDER BY h.created_at DESC
           LIMIT ?2`
        )
        .bind(adminId, limit)
        .all<any>();

      const tuples = (rs.results ?? []).map((r: any) => [
        r.id,
        r.product_id,
        r.product_name,
        r.transaction_type,
        r.quantity,
        r.previous_quantity,
        r.new_quantity,
        r.reference_no,
        r.reference_type,
        r.created_by,
        r.notes,
        r.created_at
      ]);

      return ok(request, tuples);
    }

    async function warehouseAdjustStock(transactionType: 'in' | 'out') {
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const productId = toInt(data.product_id, null);
      const qty = toInt(data.quantity, null);
      const referenceNo = String(data.reference_no ?? '').trim() || null;
      const referenceType = String(data.reference_type ?? 'repair-job').trim() || 'repair-job';
      const notes = String(data.notes ?? '').trim() || null;
      const createdBy = String(data.created_by ?? 'SYSTEM').trim() || 'SYSTEM';

      if (!productId || !qty || qty <= 0) {
        return fail(request, 400, 'product_id and quantity (>0) are required');
      }

      const product = await env.DB
        .prepare(`SELECT id, quantity_in_stock FROM warehouse_products WHERE id = ?1 LIMIT 1`)
        .bind(productId)
        .first<{ id: number; quantity_in_stock: number }>();

      if (!product) return fail(request, 404, 'Product not found');

      const prevQty = product.quantity_in_stock ?? 0;
      const newQty = transactionType === 'in' ? prevQty + qty : prevQty - qty;
      if (newQty < 0) return fail(request, 400, 'Insufficient stock');

      await env.DB
        .prepare(`UPDATE warehouse_products SET quantity_in_stock = ?1, updated_at=CURRENT_TIMESTAMP WHERE id = ?2`)
        .bind(newQty, productId)
        .run();

      await env.DB
        .prepare(
          `INSERT INTO warehouse_inventory_history
           (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_no, reference_type, notes, created_by, admin_id)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
        )
        .bind(productId, transactionType, qty, prevQty, newQty, referenceNo, referenceType, notes, createdBy, adminId)
        .run();

      return ok(request, { product_id: productId, previous_quantity: prevQty, new_quantity: newQty });
    }

    if (url.pathname === '/api/warehouse/inventory/add' && request.method === 'POST') {
      return warehouseAdjustStock('in');
    }
    if (url.pathname === '/api/warehouse/inventory/remove' && request.method === 'POST') {
      return warehouseAdjustStock('out');
    }

    if (url.pathname === '/api/warehouse/picklists' && request.method === 'GET') {
      // Picklist system is optional; return empty list if not implemented yet.
      return ok(request, []);
    }

    {
      const m = url.pathname.match(/^\/api\/warehouse\/picklists\/(\d+)\/complete$/);
      if (m && request.method === 'PUT') {
        return ok(request, null, { message: 'Picklist marked complete (stub)' });
      }
    }

    // ==================== TECHNICIAN ====================
    if (url.pathname === '/api/technician/resolve' && request.method === 'POST') {
      const adminId = getAdminId(request);
      const data = await readJson<{ username?: string; name?: string }>(request);
      const username = String(data?.username ?? '').trim();
      const name = String(data?.name ?? username).trim();
      if (!username) return fail(request, 400, 'username is required');

      let technician = await env.DB
        .prepare(`SELECT id, name, employee_id FROM technicians WHERE employee_id = ?1 LIMIT 1`)
        .bind(username)
        .first<{ id: number; name: string; employee_id: string }>();

      if (!technician) {
        const result = await env.DB
          .prepare(`INSERT INTO technicians (name, employee_id, status, admin_id) VALUES (?1, ?2, 'active', ?3)`)
          .bind(name || username, username, adminId)
          .run();
        const id = await d1FirstId(result);
        technician = { id: Number(id), name: name || username, employee_id: username };
      }

      return ok(request, { technician_id: technician.id, name: technician.name, employee_id: technician.employee_id });
    }

    if (url.pathname === '/api/technician/jobs' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const technicianId = toInt(url.searchParams.get('technician_id'), null);
      if (!technicianId) return fail(request, 400, 'technician_id is required');

      const rs = await env.DB
        .prepare(
          `SELECT
             ta.id as assignment_id,
             ta.status as assignment_status,
             ta.notes as notes,
             ta.service_order_id as service_order_id,
             so.service_type as service_type,
             c.name as customer_name,
             c.vehicle_model as vehicle_model,
             COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle_plate_no
           FROM technician_assignments ta
           JOIN service_orders so ON so.id = ta.service_order_id
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE ta.technician_id = ?1 AND so.admin_id = ?2
           ORDER BY ta.assigned_at DESC, ta.id DESC`
        )
        .bind(technicianId, adminId)
        .all<any>();

      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/technician/clock-in' && request.method === 'POST') {
      const data = await readJson<{ assignment_id?: unknown }>(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, 'assignment_id is required');

      await env.DB
        .prepare(
          `UPDATE technician_assignments
           SET status='in-progress', clock_in_time=COALESCE(clock_in_time, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP
           WHERE id=?1`
        )
        .bind(assignmentId)
        .run();

      return ok(request, null, { message: 'Clock-in recorded' });
    }

    if (url.pathname === '/api/technician/clock-out' && request.method === 'POST') {
      const data = await readJson<{ assignment_id?: unknown }>(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, 'assignment_id is required');

      await env.DB
        .prepare(
          `UPDATE technician_assignments
           SET status='completed', clock_out_time=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
           WHERE id=?1`
        )
        .bind(assignmentId)
        .run();

      return ok(request, null, { message: 'Clock-out recorded' });
    }

    {
      const m = url.pathname.match(/^\/api\/technician\/assignments\/(\d+)\/notes$/);
      if (m && request.method === 'POST') {
        const assignmentId = toInt(m[1], null);
        if (!assignmentId) return fail(request, 400, 'Invalid assignment id');
        const data = await readJson<{ notes?: string }>(request);
        const notes = String(data?.notes ?? '').trim();
        await env.DB
          .prepare(`UPDATE technician_assignments SET notes=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2`)
          .bind(notes, assignmentId)
          .run();
        return ok(request, null, { message: 'Notes saved' });
      }
    }

    {
      const m = url.pathname.match(/^\/api\/technician\/service-orders\/(\d+)\/parts-request$/);
      if (m && request.method === 'POST') {
        const serviceOrderId = parseInt(m[1]);
        const body = await request.json() as {
          technician_id?: number;
          requested_parts: { product_id: number; quantity: number }[];
          notes?: string;
        };

        if (!body.requested_parts || !Array.isArray(body.requested_parts) || body.requested_parts.length === 0) {
            return jsonResponse(request, { success: false, error: 'No parts requested' }, 400);
        }

        // 1. Create parts_requests entry
        const res1 = await env.DB.prepare(`
          INSERT INTO parts_requests (service_order_id, requested_by, requested_by_role, status, notes)
          VALUES (?, ?, 'technician', 'pending', ?)
        `)
        .bind(serviceOrderId, body.technician_id || null, body.notes || '')
        .run();

        if (!res1.success) {
            return jsonResponse(request, { success: false, error: 'Failed to create parts request record' }, 500);
        }

        // Get the ID of the inserted request
        // D1 .run() returns meta with .last_row_id or similar.
        // In the typed definition for D1Result, it typically has `meta: { last_row_id: number, ... }`
        // However, standard sqlite usually relies on separate select or specific return.
        // Let's assume meta.last_row_id is available as it's standard Cloudflare D1 behavior.
        const requestId = res1.meta.last_row_id; 

        // 2. Insert items
        const stmts = body.requested_parts.map(p => 
            env.DB.prepare(`
                INSERT INTO parts_request_items (parts_request_id, product_id, quantity_requested, status)
                VALUES (?, ?, ?, 'pending')
            `).bind(requestId, p.product_id, p.quantity)
        );

        await env.DB.batch(stmts);

        return ok(request, { 
            message: 'Parts request submitted successfully',
            request_id: requestId, 
            item_count: body.requested_parts.length 
        });
      }
    }

    // ==================== ADMIN ====================
    if (url.pathname === '/api/auth/admin/personnel-list' && request.method === 'GET') {
      if (!(await isAdminAuth(request, env))) {
        return jsonResponse(request, { success: false, error: 'Admin verification failed' }, 401);
      }

      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT id, username, name, role, email, status, created_at, location
           FROM personnel
           WHERE (admin_id = ?1 OR id = ?1)
           ORDER BY created_at DESC`
        )
        .bind(adminId)
        .all<{
          id: number;
          username: string;
          name: string;
          role: string;
          email: string | null;
          status: string;
          created_at: string;
          location: string | null;
        }>();

      const personnel = (rs.results ?? []).map((r) => [
        r.id,
        r.username,
        r.name,
        r.role,
        r.email ?? '',
        r.status,
        r.created_at,
        r.location ?? ''
      ]);

      return jsonResponse(request, { success: true, personnel, count: personnel.length });
    }

    if (url.pathname === '/api/auth/admin/register-personnel' && request.method === 'POST') {
      if (!(await isAdminAuth(request, env))) {
        return jsonResponse(request, { success: false, error: 'Admin verification failed' }, 401);
      }

      const adminId = getAdminId(request);
      const data = await readJson<{ username?: string; password?: string; name?: string; role?: string; email?: string }>(request);
      const username = String(data?.username ?? '').trim();
      const password = String(data?.password ?? '').trim();
      const name = String(data?.name ?? '').trim();
      const email = String(data?.email ?? '').trim();
      const role = normalizeRole(data?.role);

      if (!username || !password || !name || !role) {
        return jsonResponse(request, { success: false, error: 'username, password, name, and role are required' }, 400);
      }
      if (!ALLOWED_ROLES.has(role) || role === 'admin') {
        const allowed = Array.from(ALLOWED_ROLES).join(', ');
        return jsonResponse(request, { success: false, error: `Invalid role: "${role}". Allowed: ${allowed}` }, 400);
      }

      try {
        const result = await env.DB
          .prepare(
            `INSERT INTO personnel (username, password, name, role, email, status, admin_id)
             VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6)`
          )
          .bind(username, password, name, role, email, adminId)
          .run();

        const lastId = (result as any)?.meta?.last_row_id ?? (result as any)?.meta?.lastRowId ?? null;

        if (role === 'technician') {
          await env.DB
            .prepare(
              `INSERT OR IGNORE INTO technicians (name, employee_id, email, status, hire_date, created_at, admin_id)
               VALUES (?1, ?2, ?3, 'active', NULL, CURRENT_TIMESTAMP, ?4)`
            )
            .bind(name || username, username, email, adminId)
            .run();
        }

        if (role === 'advisor') {
          await env.DB
            .prepare(
              `INSERT OR IGNORE INTO service_advisors (name, employee_id, contact_no, email, status, hire_date, created_at, admin_id)
               VALUES (?1, ?2, NULL, ?3, 'active', NULL, CURRENT_TIMESTAMP, ?4)`
            )
            .bind(name || username, username, email, adminId)
            .run();
        }

        return jsonResponse(
          request,
          {
            success: true,
            personnel_id: lastId,
            message: `Personnel ${name} registered successfully`
          },
          201
        );
      } catch (e: any) {
        const msg = String(e?.message ?? e ?? 'Failed to register personnel');
        return fail(request, 400, `DB Error: ${msg}`);
      }
    }

    // DELETE /api/auth/admin/delete-personnel?id=123
    if (url.pathname === '/api/auth/admin/delete-personnel' && request.method === 'DELETE') {
      if (!(await isAdminAuth(request, env))) {
        return jsonResponse(request, { success: false, error: 'Admin verification failed' }, 401);
      }

      const adminId = getAdminId(request);
      const id = toInt(url.searchParams.get('id'));
      if (!id) return fail(request, 400, 'id is required');

      try {
        await env.DB.prepare('DELETE FROM personnel WHERE id = ? AND admin_id = ?').bind(id, adminId).run();
        return ok(request, { message: 'Deleted successfully' });
      } catch(e: any) {
        return fail(request, 500, e.message);
      }
    }

    if (url.pathname === '/api/documents/log-print' && request.method === 'POST') {
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');

      const serviceOrderId = toInt(data.service_order_id, null);
      const documentType = String(data.document_type ?? 'other').trim();
      const printedBy = String(data.printed_by ?? '').trim();
      const documentData = typeof data.document_data === 'string' ? data.document_data : JSON.stringify(data.document_data || {});

      if (!serviceOrderId) return fail(request, 400, 'service_order_id is required');

      await env.DB.prepare(
        `INSERT INTO service_order_documents 
         (service_order_id, document_type, printed_by, document_data, printed_at, created_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))`
      )
      .bind(serviceOrderId, documentType, printedBy, documentData)
      .run();

      return ok(request, { message: 'Print logged' });
    }

    // GET /api/admin/dashboard-stats - Get overview stats for admin dashboard
    if (url.pathname === '/api/admin/dashboard-stats' && request.method === 'GET') {
      if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
      const adminId = getAdminId(request);
      
      try {
        // Active Jobs (Not completed or cancelled)
        const jobsResult = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM service_orders 
           WHERE status NOT IN ('completed', 'cancelled') AND admin_id = ?1`
        ).bind(adminId).first();
        const activeJobs = jobsResult ? (jobsResult.count as number) : 0;

        // Today's Revenue
        const today = todayISODate();
        const revenueResult = await env.DB.prepare(
          `SELECT SUM(payment_amount) as total FROM invoice_payments 
           WHERE date(payment_date) = ?1 AND admin_id = ?2`
        ).bind(today, adminId).first();
        const dailyRevenue = revenueResult ? (revenueResult.total as number) : 0;

        return ok(request, { 
          activeJobs, 
          dailyRevenue: dailyRevenue || 0 
        });
      } catch (err: any) {
        return fail(request, 500, err.message);
      }
    }

    // ==================== ADMIN: RESOURCES & CATALOG ====================
    
    // --- SERVICE CATALOG (public read for all roles) ---
    if (url.pathname === '/api/services/catalog' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB.prepare('SELECT * FROM service_catalog WHERE status=\'active\' AND admin_id = ?1 ORDER BY category, service_name').bind(adminId).all();
      return ok(request, rs.results ?? []);
    }

    // --- SERVICE CATALOG (admin CRUD) ---
    if (url.pathname === '/api/admin/services' && request.method === 'GET') {
      if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
      const adminId = getAdminId(request);
      const rs = await env.DB.prepare('SELECT * FROM service_catalog WHERE admin_id = ?1 ORDER BY category, service_name').bind(adminId).all();
      return ok(request, rs.results ?? []);
    }

    if (url.pathname === '/api/admin/services' && request.method === 'POST') {
      if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
      const adminId = getAdminId(request);
      const data = await readJson<any>(request);
      if (!data) return fail(request, 400, 'Invalid JSON');
      
      try {
        await env.DB.prepare(`
          INSERT INTO service_catalog (service_name, category, vehicle_type, base_price, labor_hours, description, status, admin_id)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        `).bind(
          data.service_name, 
          data.category || 'general', 
          data.vehicle_type || 'sedan', 
          toFloat(data.base_price, 0), 
          toFloat(data.labor_hours, 1), 
          data.description || '', 
          data.status || 'active',
          adminId
        ).run();
        return ok(request, { message: 'Service created' });
      } catch (e: any) { return fail(request, 500, e.message); }
    }
    
    {
      const m = url.pathname.match(/^\/api\/admin\/services\/(\d+)$/);
      if (m && request.method === 'PUT') {
        if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
        const id = toInt(m[1]);
        const data = await readJson<any>(request);
        if (!data || !id) return fail(request, 400, 'Invalid data');
        
        try {
           await env.DB.prepare(`
             UPDATE service_catalog 
             SET service_name=?1, category=?2, vehicle_type=?3, base_price=?4, labor_hours=?5, description=?6, status=?7, updated_at=CURRENT_TIMESTAMP
             WHERE id=?8
           `).bind(
             data.service_name, 
             data.category, 
             data.vehicle_type, 
             toFloat(data.base_price), 
             toFloat(data.labor_hours), 
             data.description, 
             data.status,
             id
           ).run();
           return ok(request, { message: 'Service updated' });
        } catch (e: any) { return fail(request, 500, e.message); }
      }
      
      if (m && request.method === 'DELETE') {
         if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
         await env.DB.prepare('DELETE FROM service_catalog WHERE id=?1').bind(toInt(m[1])).run();
         return ok(request, { message: 'Service deleted' });
      }
    }

    // --- TECHNICIANS (ADMIN VIEW) ---
    if (url.pathname === '/api/admin/technicians' && request.method === 'GET') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const adminId = getAdminId(request);
       const rs = await env.DB.prepare('SELECT * FROM technicians WHERE admin_id = ?1 ORDER BY name').bind(adminId).all();
       return ok(request, rs.results ?? []);
    }
    
    if (url.pathname === '/api/admin/technicians' && request.method === 'POST') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const data = await readJson<any>(request);
       try {
         await env.DB.prepare(`
           INSERT INTO technicians (name, employee_id, specialization, contact_no, status)
           VALUES (?1, ?2, ?3, ?4, ?5)
         `).bind(data.name, data.employee_id, data.specialization, data.contact_no, data.status || 'active').run();
         return ok(request, { message: 'Technician added' });
       } catch (e: any) { return fail(request, 500, e.message); }
    }
    
    if (url.pathname === '/api/admin/technicians/update' && request.method === 'POST') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const data = await readJson<any>(request);
       if (!data.id) return fail(request, 400, 'ID required');
       await env.DB.prepare(`
         UPDATE technicians SET name=?1, employee_id=?2, specialization=?3, contact_no=?4, status=?5
         WHERE id=?6
       `).bind(data.name, data.employee_id, data.specialization, data.contact_no, data.status, data.id).run();
       return ok(request, { message: 'Technician updated' });
    }

    // --- BAYS (ADMIN VIEW) ---
    if (url.pathname === '/api/admin/bays' && request.method === 'GET') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const adminId = getAdminId(request);
       const rs = await env.DB.prepare('SELECT * FROM service_bays WHERE admin_id = ?1 ORDER BY bay_name').bind(adminId).all();
       return ok(request, rs.results ?? []);
    }
    
    if (url.pathname === '/api/admin/bays' && request.method === 'POST') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const data = await readJson<any>(request);
       await env.DB.prepare(`INSERT INTO service_bays (bay_name, bay_type, capacity, status) VALUES (?1, ?2, 1, ?3)`)
         .bind(data.bay_name, data.bay_type || 'general', data.status || 'active').run();
       return ok(request, { message: 'Bay added' });
    }
    
    if (url.pathname === '/api/admin/bays/update' && request.method === 'POST') {
       if (!isAdmin(request)) return fail(request, 401, 'Unauthorized');
       const data = await readJson<any>(request);
       await env.DB.prepare(`UPDATE service_bays SET bay_name=?1, bay_type=?2, status=?3 WHERE id=?4`)
         .bind(data.bay_name, data.bay_type, data.status, data.id).run();
       return ok(request, { message: 'Bay updated' });
    }

    // ==================== PUBLIC TRACKING PAGE ====================
    // GET /api/track/:tracking_code - Public endpoint for customers to track their vehicle
    {
      const m = url.pathname.match(/^\/api\/track\/([^\/]+)$/);
      if (m && request.method === 'GET') {
        const trackingCode = decodeURIComponent(m[1]).toUpperCase().replace(/\s+/g, '');
        const result = await getTrackingData(env, trackingCode);
        if (!result.success) {
          return jsonResponse(request, { success: false, error: result.error }, 404);
        }
        return jsonResponse(request, result);
      }
    }

    // ==================== PUBLIC HTML TRACKING PAGE ====================
    // GET /track/:code - Serves a mobile-friendly HTML tracking page
    {
      const m = url.pathname.match(/^\/track\/([^\/]+)$/i);
      if (m && request.method === 'GET') {
        const trackingCode = decodeURIComponent(m[1]).toUpperCase().replace(/\s+/g, '');
        
        // Get tracking data directly (no self-fetch)
        const trackingData = await getTrackingData(env, trackingCode);

        const html = generateTrackingHTML(trackingCode, trackingData);
        
        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
          }
        });
      }
    }

    // GET /track - Landing page with search form
    if (url.pathname === '/track' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (code) {
        // Redirect to /track/:code
        return Response.redirect(`${url.origin}/track/${code}`, 302);
      }
      
      const html = generateTrackingSearchHTML();
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache'
        }
      });
    }

    // ==================== RECORDS MODULE ====================
    // GET /api/records/service-orders - List all service orders for history view
    if (url.pathname === '/api/records/service-orders' && request.method === 'GET') {
      const adminId = getAdminId(request);
      const rs = await env.DB
        .prepare(
          `SELECT 
             so.id,
             so.status,
             so.service_type,
             so.check_in_time,
             so.actual_completion_time,
             so.created_at,
             c.name as customer_name,
             c.contact_no,
             c.vehicle_model,
             COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
             bi.id as invoice_id,
             bi.status as invoice_status,
             bi.total_amount,
             (SELECT GROUP_CONCAT(payment_method, ', ') FROM billing_payments WHERE invoice_id = bi.id) as payment_method,
             -- VRC Data
             vrc.mileage_in,
             vrc.checklist_1_engine,
             vrc.checklist_2_fluids,
             vrc.checklist_3_brakes,
             vrc.checklist_4_suspension,
             vrc.checklist_5_battery,
             vrc.checklist_6_tires,
             vrc.checklist_7_lights,
             vrc.checklist_8_body,
             vrc.checklist_9_wipers,
             vrc.checklist_10_handbrake
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN billing_invoices bi ON bi.service_order_id = so.id
           LEFT JOIN vehicle_report_cards vrc ON vrc.service_order_id = so.id
           WHERE so.admin_id = ?1
           ORDER BY so.created_at DESC
           LIMIT 500`
        )
        .bind(adminId)
        .all<any>();

      return ok(request, { orders: rs.results || [] });
    }

    // GET /api/records/service-orders/:id/details - Full details for a service order
    {
      const m = url.pathname.match(/^\/api\/records\/service-orders\/(\d+)\/details$/);
      if (m && request.method === 'GET') {
        const soId = toInt(m[1], null);
        if (!soId) return fail(request, 400, 'Invalid service order ID');

        // Get service order with customer info
        const order = await env.DB
          .prepare(
            `SELECT 
               so.*,
               c.name as customer_name,
               c.contact_no,
               c.vehicle_model,
               c.email,
               c.address,
               COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
             FROM service_orders so
             LEFT JOIN customers c ON c.id = so.customer_id
             WHERE so.id = ?1`
          )
          .bind(soId)
          .first<any>();

        if (!order) return fail(request, 404, 'Service order not found');

        // Get VRC
        const vrc = await env.DB
          .prepare('SELECT * FROM vehicle_report_cards WHERE service_order_id = ?1')
          .bind(soId)
          .first<any>();

        // Get billing invoice
        const invoice = await env.DB
          .prepare(
            `SELECT 
               bi.*,
               (bi.labor_hours * bi.labor_rate) as labor_cost
             FROM billing_invoices bi
             WHERE bi.service_order_id = ?1`
          )
          .bind(soId)
          .first<any>();

        // Get parts requests
        const partsRs = await env.DB
          .prepare(
            `SELECT 
               pri.id,
               wp.product_name as part_name,
               pri.quantity_requested as quantity,
               wp.unit_price as price,
               pri.status,
               pr.status as request_status
             FROM parts_request_items pri
             JOIN parts_requests pr ON pr.id = pri.parts_request_id
             LEFT JOIN warehouse_products wp ON wp.id = pri.product_id
             WHERE pr.service_order_id = ?1`
          )
          .bind(soId)
          .all<any>();

        // Get work/technician info
        const work = await env.DB
          .prepare(
            `SELECT 
               jca.status as assignment_status,
               jca.clock_in_time,
               jca.clock_out_time,
               jca.labor_hours as total_labor_hours,
               jca.status as qc_status,
               t.name as technician_name,
               t.id as technician_id
             FROM job_controller_assignments jca
             LEFT JOIN technicians t ON t.id = jca.technician_id
             WHERE jca.service_order_id = ?1
             ORDER BY jca.assigned_at DESC
             LIMIT 1`
          )
          .bind(soId)
          .first<any>();

        // Get QC Inspection
        const qcInspection = await env.DB
          .prepare(
            `SELECT 
               qi.*,
               t.name as foreman_name
             FROM qc_inspections qi
             LEFT JOIN technicians t ON t.id = qi.foreman_id
             WHERE qi.service_order_id = ?1
             ORDER BY qi.created_at DESC
             LIMIT 1`
          )
          .bind(soId)
          .first<any>();

        // Get Road Test
        const roadTest = await env.DB
          .prepare(
            `SELECT * FROM qc_road_tests 
             WHERE service_order_id = ?1
             ORDER BY created_at DESC
             LIMIT 1`
          )
          .bind(soId)
          .first<any>();

        // Get Gatepass with signatures
        const gatepass = await env.DB
          .prepare(
            `SELECT g.*, 
               (SELECT GROUP_CONCAT(signature_type || ':' || signed_at) FROM gatepass_signatures WHERE gatepass_id = g.id) as signatures
             FROM gatepasses g
             WHERE g.service_order_id = ?1
             ORDER BY g.created_at DESC
             LIMIT 1`
          )
          .bind(soId)
          .first<any>();

        // Get Vehicle Handover
        const handover = await env.DB
          .prepare(
            `SELECT vh.*,
               t.name as technician_name
             FROM vehicle_handovers vh
             LEFT JOIN technicians t ON t.id = vh.technician_id
             WHERE vh.service_order_id = ?1
             ORDER BY vh.created_at DESC
             LIMIT 1`
          )
          .bind(soId)
          .first<any>();

        return ok(request, {
          order,
          vrc: vrc || null,
          invoice: invoice || null,
          parts: partsRs.results || [],
          work: work || null,
          qc_inspection: qcInspection || null,
          road_test: roadTest || null,
          gatepass: gatepass || null,
          handover: handover || null
        });
      }
    }

    return jsonResponse(request, { success: false, error: 'Not found' }, 404);
    } catch (e: any) {
      console.error(e);
      return jsonResponse(request, { success: false, error: e.message || 'Internal Server Error' }, 500);
    }
  }
};
