var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var ADMIN_USERNAME = "admin";
var ADMIN_PASSWORD = "admin123";
var ROLE_ALIASES = {
  job_controller: "controller",
  service_advisor: "advisor",
  "service-advisor": "advisor",
  "vehicle-handover": "vehicle_handover",
  "security-gate": "security_gate",
  "follow-up": "follow_up"
};
var ALLOWED_ROLES = /* @__PURE__ */ new Set([
  "admin",
  "cro",
  "technician",
  "warehouse",
  "manager",
  "advisor",
  "controller",
  "foreman",
  "wrapup",
  "jockey",
  "billing",
  "cashier",
  "security_gate",
  "vehicle_handover",
  "follow_up"
]);
function withCors(request, headers) {
  const origin = request.headers.get("Origin");
  headers.set("Access-Control-Allow-Origin", origin ?? "*");
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Username, X-Admin-Password");
}
__name(withCors, "withCors");
function jsonResponse(request, body, status = 200) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  withCors(request, headers);
  return new Response(JSON.stringify(body), { status, headers });
}
__name(jsonResponse, "jsonResponse");
function normalizeRole(role) {
  const raw = String(role ?? "").trim();
  return ROLE_ALIASES[raw] ?? raw;
}
__name(normalizeRole, "normalizeRole");
function isAdmin(request) {
  const u = request.headers.get("X-Admin-Username");
  const p = request.headers.get("X-Admin-Password");
  return u === ADMIN_USERNAME && p === ADMIN_PASSWORD;
}
__name(isAdmin, "isAdmin");
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
function toInt(value, fallback = null) {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return n;
}
__name(toInt, "toInt");
function toFloat(value, fallback = null) {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return n;
}
__name(toFloat, "toFloat");
function ok(request, data = null, extra = {}) {
  return jsonResponse(request, { success: true, data, ...extra });
}
__name(ok, "ok");
function fail(request, status, error) {
  return jsonResponse(request, { success: false, error }, status);
}
__name(fail, "fail");
function pad5(n) {
  return String(n).padStart(5, "0");
}
__name(pad5, "pad5");
function todayISODate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
__name(todayISODate, "todayISODate");
function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
__name(isIsoDate, "isIsoDate");
function normalizeChecklistVal(val) {
  const s = String(val ?? "").toLowerCase().trim();
  if (s === "passed" || s === "pass") return "pass";
  if (s === "failed" || s === "fail" || s === "needs_attention") return "fail";
  return "na";
}
__name(normalizeChecklistVal, "normalizeChecklistVal");
async function d1FirstId(result) {
  const meta = result?.meta;
  return meta?.last_row_id ?? meta?.lastRowId ?? null;
}
__name(d1FirstId, "d1FirstId");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      const headers = new Headers();
      withCors(request, headers);
      return new Response(null, { status: 204, headers });
    }
    if (url.pathname === "/api/health") {
      return jsonResponse(request, { success: true, status: "ok" });
    }
    if (url.pathname === "/api/security-gate/logs/entries" && request.method === "GET") {
      const date = url.searchParams.get("date") ?? todayISODate();
      const day = isIsoDate(date) ? date : todayISODate();
      const rs = await env.DB.prepare(
        `SELECT
             created_at as time,
             vehicle_plate_no as plate_no,
             customer_name as customer,
             gate_operator_id as operator,
             authorized
           FROM security_gate_access_logs
           WHERE access_type='entry' AND substr(created_at, 1, 10) = ?1
           ORDER BY created_at DESC`
      ).bind(day).all();
      return jsonResponse(request, { success: true, data: rs.results ?? [] });
    }
    if (url.pathname === "/api/security-gate/logs/exits" && request.method === "GET") {
      const date = url.searchParams.get("date") ?? todayISODate();
      const day = isIsoDate(date) ? date : todayISODate();
      const rs = await env.DB.prepare(
        `SELECT
             created_at as time,
             vehicle_plate_no as plate_no,
             customer_name as customer,
             gate_operator_id as operator,
             authorized
           FROM security_gate_access_logs
           WHERE access_type='exit' AND substr(created_at, 1, 10) = ?1
           ORDER BY created_at DESC`
      ).bind(day).all();
      return jsonResponse(request, { success: true, data: rs.results ?? [] });
    }
    if (url.pathname === "/api/security-gate/badges/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, service_order_id, vehicle_plate_no, customer_name, customer_id,
                  issued_at, expiry_at, badge_type, status, scan_count
           FROM security_gate_badges
           WHERE status='active'
           ORDER BY issued_at DESC`
      ).all();
      return jsonResponse(request, { success: true, data: rs.results ?? [], badges: rs.results ?? [] });
    }
    if (url.pathname === "/api/security-gate/summary" && request.method === "GET") {
      const day = todayISODate();
      const entries = await env.DB.prepare(
        `SELECT COUNT(*) as n, SUM(CASE WHEN authorized=0 THEN 1 ELSE 0 END) as denied
           FROM security_gate_access_logs
           WHERE access_type='entry' AND substr(created_at,1,10)=?1`
      ).bind(day).first();
      const exits = await env.DB.prepare(
        `SELECT COUNT(*) as n, SUM(CASE WHEN authorized=0 THEN 1 ELSE 0 END) as denied
           FROM security_gate_access_logs
           WHERE access_type='exit' AND substr(created_at,1,10)=?1`
      ).bind(day).first();
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
    if (url.pathname === "/api/security-gate/badges/issue" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      const vehiclePlate = String(data.vehicle_plate_no ?? "").trim();
      const customerName = String(data.customer_name ?? "").trim();
      const customerId = toInt(data.customer_id, null);
      const issuedBy = toInt(data.issued_by, null);
      const expiryDays = Math.max(1, toInt(data.expiry_days, 1) ?? 1);
      if (!vehiclePlate) return fail(request, 400, "vehicle_plate_no is required");
      const result = await env.DB.prepare(
        `INSERT INTO security_gate_badges
           (service_order_id, vehicle_plate_no, customer_name, customer_id, issued_by, issued_at, expiry_at, badge_type, status, scan_count)
           VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP, datetime('now', ?6), 'vehicle', 'active', 0)`
      ).bind(serviceOrderId, vehiclePlate, customerName || null, customerId, issuedBy, `+${expiryDays} day`).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, badge_id: id, message: "Badge issued" }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/security-gate\/badges\/(\d+)\/revoke$/);
      if (m && request.method === "POST") {
        const badgeId = toInt(m[1], null);
        if (!badgeId) return fail(request, 400, "Invalid badge id");
        await env.DB.prepare(`UPDATE security_gate_badges SET status='revoked', revoked_at=CURRENT_TIMESTAMP WHERE id=?1`).bind(badgeId).run();
        return ok(request, null, { message: "Badge revoked" });
      }
    }
    if (url.pathname === "/api/security-gate/access/log" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      const vehiclePlate = String(data.vehicle_plate_no ?? "").trim();
      const customerName = String(data.customer_name ?? "").trim();
      const accessType = String(data.access_type ?? "").trim();
      const operatorId = toInt(data.gate_operator_id, null);
      if (!vehiclePlate) return fail(request, 400, "vehicle_plate_no is required");
      if (!["entry", "exit"].includes(accessType)) return fail(request, 400, "access_type must be entry or exit");
      const badge = await env.DB.prepare(
        `SELECT id
           FROM security_gate_badges
           WHERE status='active'
             AND vehicle_plate_no=?1
             AND (expiry_at IS NULL OR expiry_at >= CURRENT_TIMESTAMP)
           LIMIT 1`
      ).bind(vehiclePlate).first();
      const authorized = badge ? 1 : 0;
      await env.DB.prepare(
        `INSERT INTO security_gate_access_logs
           (service_order_id, vehicle_plate_no, customer_name, access_type, gate_operator_id, authorized, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)`
      ).bind(serviceOrderId, vehiclePlate, customerName || null, accessType, operatorId, authorized).run();
      if (badge) {
        await env.DB.prepare(`UPDATE security_gate_badges SET scan_count = scan_count + 1 WHERE id=?1`).bind(badge.id).run();
      }
      return ok(request, null, { authorized: Boolean(authorized) });
    }
    if (url.pathname === "/api/vehicle-handover/handovers/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, service_order_id, handover_date, technician_id, customer_id, inspection_notes, status
           FROM vehicle_handovers
           WHERE status='pending'
           ORDER BY handover_date DESC, id DESC`
      ).all();
      const handovers = (rs.results ?? []).map((r) => [
        r.id,
        r.service_order_id,
        r.handover_date,
        r.technician_id,
        r.customer_id,
        r.inspection_notes,
        r.status
      ]);
      return jsonResponse(request, { success: true, data: handovers, handovers });
    }
    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)$/);
      if (m && request.method === "GET") {
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, "Invalid handover id");
        const handover = await env.DB.prepare(
          `SELECT id, service_order_id, job_wrapup_id, handover_date, technician_id, customer_id,
                    inspection_notes, vehicle_cleanliness, fuel_level_final, mileage_final,
                    overall_condition, all_items_returned, status
             FROM vehicle_handovers
             WHERE id=?1`
        ).bind(handoverId).first();
        if (!handover) return fail(request, 404, "Handover not found");
        const itemsRs = await env.DB.prepare(
          `SELECT id, item_type, item_description, quantity, condition_before, condition_after,
                    item_verified, verified_by
             FROM handover_items
             WHERE handover_id=?1
             ORDER BY id ASC`
        ).bind(handoverId).all();
        const sigRs = await env.DB.prepare(
          `SELECT id, signatory_type, signatory_name, signatory_role, created_at as signature_timestamp, printed_name
             FROM handover_signatures
             WHERE handover_id=?1
             ORDER BY id ASC`
        ).bind(handoverId).all();
        const details = {
          handover: [
            handover.id,
            handover.service_order_id,
            handover.job_wrapup_id,
            handover.handover_date,
            handover.technician_id,
            handover.customer_id,
            handover.inspection_notes,
            handover.vehicle_cleanliness,
            handover.fuel_level_final,
            handover.mileage_final,
            handover.overall_condition,
            handover.all_items_returned,
            handover.status
          ],
          items: (itemsRs.results ?? []).map((it) => [
            it.id,
            it.item_type,
            it.item_description,
            it.quantity,
            it.condition_before,
            it.condition_after,
            it.item_verified,
            it.verified_by
          ]),
          signatures: (sigRs.results ?? []).map((s) => [
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
      if (m && request.method === "POST") {
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, "Invalid handover id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const itemType = String(data.item_type ?? "").trim();
        const itemDesc = String(data.item_description ?? "").trim();
        const qty = Math.max(1, toInt(data.quantity, 1) ?? 1);
        const conditionBefore = String(data.condition_before ?? "").trim();
        if (!itemType || !itemDesc) return fail(request, 400, "item_type and item_description are required");
        const result = await env.DB.prepare(
          `INSERT INTO handover_items
             (handover_id, item_type, item_description, quantity, condition_before, item_verified, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, CURRENT_TIMESTAMP)`
        ).bind(handoverId, itemType, itemDesc, qty, conditionBefore || null).run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, item_id: id }, 201);
      }
    }
    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/items\/(\d+)\/verify$/);
      if (m && request.method === "POST") {
        const itemId = toInt(m[2], null);
        if (!itemId) return fail(request, 400, "Invalid item id");
        const data = await readJson(request);
        const conditionAfter = String(data?.condition_after ?? "").trim();
        const verifiedBy = toInt(data?.verified_by, null);
        await env.DB.prepare(
          `UPDATE handover_items
             SET item_verified=1, condition_after=?1, verified_by=?2, verified_at=CURRENT_TIMESTAMP
             WHERE id=?3`
        ).bind(conditionAfter || null, verifiedBy, itemId).run();
        return ok(request, null, { message: "Item verified" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/signatures$/);
      if (m && request.method === "POST") {
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, "Invalid handover id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const signatoryType = String(data.signatory_type ?? "").trim();
        const signatoryName = String(data.signatory_name ?? "").trim();
        const signatoryRole = String(data.signatory_role ?? "").trim();
        const printedName = String(data.printed_name ?? "").trim();
        const signatureImage = data.signature_image ?? null;
        if (!signatoryType || !signatoryName) return fail(request, 400, "signatory_type and signatory_name are required");
        const result = await env.DB.prepare(
          `INSERT INTO handover_signatures
             (handover_id, signatory_type, signatory_name, signatory_role, printed_name, signature_image, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, CURRENT_TIMESTAMP)`
        ).bind(handoverId, signatoryType, signatoryName, signatoryRole || null, printedName || null, signatureImage).run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, signature_id: id }, 201);
      }
    }
    {
      const m = url.pathname.match(/^\/api\/vehicle-handover\/handovers\/(\d+)\/complete$/);
      if (m && request.method === "POST") {
        const handoverId = toInt(m[1], null);
        if (!handoverId) return fail(request, 400, "Invalid handover id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        await env.DB.prepare(
          `UPDATE vehicle_handovers
             SET status='completed',
                 vehicle_cleanliness=?1,
                 fuel_level_final=?2,
                 mileage_final=?3,
                 overall_condition=?4,
                 all_items_returned=?5,
                 completed_at=CURRENT_TIMESTAMP
             WHERE id=?6`
        ).bind(
          String(data.vehicle_cleanliness ?? "").trim() || null,
          String(data.fuel_level_final ?? "").trim() || null,
          String(data.mileage_final ?? "").trim() || null,
          String(data.overall_condition ?? "").trim() || null,
          data.all_items_returned ? 1 : 0,
          handoverId
        ).run();
        return ok(request, null, { message: "Handover completed" });
      }
    }
    if (url.pathname === "/api/foreman-qc/jobs/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id as service_order_id,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                  c.name as customer_name,
                  so.service_type,
                  so.status,
                  so.created_at
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status IN ('in-progress','pending')
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 100`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
        r.service_order_id,
        r.customer_name,
        r.plate_no,
        r.service_type,
        r.status,
        r.created_at
      ]);
      return jsonResponse(request, { success: true, data: rows });
    }
    if (url.pathname === "/api/foreman-qc/inspections/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, service_order_id, foreman_id, inspection_date, status, failed_items, created_at
           FROM qc_inspections
           WHERE status IN ('active','rework')
           ORDER BY created_at DESC, id DESC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
        r.id,
        r.service_order_id,
        r.foreman_id,
        r.inspection_date,
        r.status,
        r.failed_items,
        r.created_at
      ]);
      return jsonResponse(request, { success: true, data: rows });
    }
    if (url.pathname === "/api/foreman-qc/summary" && request.method === "GET") {
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections`).first();
      const passed = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE status='passed'`).first();
      const failed = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE status='failed'`).first();
      const pending = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE status IN ('active','rework')`).first();
      const rework = await env.DB.prepare(`SELECT COUNT(*) as n FROM qc_inspections WHERE status='rework'`).first();
      const data = {
        total_inspections: Number(total?.n ?? 0),
        passed_count: Number(passed?.n ?? 0),
        failed_count: Number(failed?.n ?? 0),
        pending_count: Number(pending?.n ?? 0),
        rework_count: Number(rework?.n ?? 0)
      };
      return jsonResponse(request, { success: true, data });
    }
    if (url.pathname === "/api/foreman-qc/inspections" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, "service_order_id is required");
      const foremanId = toInt(data.foreman_id, null);
      const inspectionDate = String(data.inspection_date ?? todayISODate()).trim();
      const result = await env.DB.prepare(
        `INSERT INTO qc_inspections
           (service_order_id, foreman_id, inspection_date, exterior_condition, engine_condition, interior_cleanliness, parts_installed,
            fluid_levels_ok, electrical_systems_ok, safety_features_ok, inspection_notes, status, created_at)
           VALUES
           (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'active', CURRENT_TIMESTAMP)`
      ).bind(
        serviceOrderId,
        foremanId,
        inspectionDate,
        String(data.exterior_condition ?? "").trim() || null,
        String(data.engine_condition ?? "").trim() || null,
        String(data.interior_cleanliness ?? "").trim() || null,
        String(data.parts_installed ?? "").trim() || null,
        data.fluid_levels_ok ? 1 : 0,
        data.electrical_systems_ok ? 1 : 0,
        data.safety_features_ok ? 1 : 0,
        String(data.inspection_notes ?? "").trim() || null
      ).run();
      const inspectionId = await d1FirstId(result);
      return jsonResponse(request, { success: true, inspection_id: inspectionId }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)\/pass$/);
      if (m && request.method === "POST") {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, "Invalid inspection id");
        await env.DB.prepare(`UPDATE qc_inspections SET status='passed' WHERE id=?1`).bind(inspectionId).run();
        return ok(request, null, { message: "Inspection passed" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/foreman-qc\/inspections\/(\d+)\/fail$/);
      if (m && request.method === "POST") {
        const inspectionId = toInt(m[1], null);
        if (!inspectionId) return fail(request, 400, "Invalid inspection id");
        const data = await readJson(request);
        const failedItems = String(data?.failed_items ?? "").trim();
        await env.DB.prepare(`UPDATE qc_inspections SET status='failed', failed_items=?1 WHERE id=?2`).bind(failedItems || null, inspectionId).run();
        return ok(request, null, { message: "Inspection failed" });
      }
    }
    if (url.pathname === "/api/foreman-qc/road-tests" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const qcInspectionId = toInt(data.qc_inspection_id, null);
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!qcInspectionId || !serviceOrderId) return fail(request, 400, "qc_inspection_id and service_order_id are required");
      const result = await env.DB.prepare(
        `INSERT INTO qc_road_tests
           (qc_inspection_id, service_order_id, road_test_date, tested_by, test_distance_km, engine_sound,
            acceleration_smooth, braking_effective, steering_responsive, electrical_functions_ok, air_conditioning_ok,
            overall_performance, road_test_notes, created_at)
           VALUES
           (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, CURRENT_TIMESTAMP)`
      ).bind(
        qcInspectionId,
        serviceOrderId,
        String(data.road_test_date ?? todayISODate()).trim(),
        toInt(data.tested_by, null),
        toFloat(data.test_distance_km, 0) ?? 0,
        String(data.engine_sound ?? "").trim() || null,
        data.acceleration_smooth ? 1 : 0,
        data.braking_effective ? 1 : 0,
        data.steering_responsive ? 1 : 0,
        data.electrical_functions_ok ? 1 : 0,
        data.air_conditioning_ok ? 1 : 0,
        String(data.overall_performance ?? "").trim() || null,
        String(data.road_test_notes ?? "").trim() || null
      ).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, road_test_id: id }, 201);
    }
    if (url.pathname === "/api/billing/summary" && request.method === "GET") {
      const row = await env.DB.prepare(
        `SELECT
             SUM(CASE WHEN status='paid' THEN paid_amount ELSE 0 END) as paid_amount,
             SUM(CASE WHEN status='issued' THEN 1 ELSE 0 END) as issued_count,
             SUM(CASE WHEN status='draft' THEN 1 ELSE 0 END) as draft_count,
             SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) as overdue_count
           FROM billing_invoices`
      ).first();
      return ok(request, {
        paid_amount: Number(row?.paid_amount ?? 0),
        issued_count: Number(row?.issued_count ?? 0),
        draft_count: Number(row?.draft_count ?? 0),
        overdue_count: Number(row?.overdue_count ?? 0)
      });
    }
    async function listInvoicesByStatus(kind) {
      const now = /* @__PURE__ */ new Date();
      const statuses = kind === "paid" ? ["paid"] : kind === "overdue" ? ["overdue"] : ["draft", "issued"];
      const rs = await env.DB.prepare(
        `SELECT bi.id, bi.customer_id, bi.service_order_id, bi.status, bi.total_amount, bi.paid_amount,
                  bi.created_at, bi.due_date,
                  c.name as customer_name,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
           FROM billing_invoices bi
           LEFT JOIN customers c ON c.id = bi.customer_id
           LEFT JOIN service_orders so ON so.id = bi.service_order_id
           WHERE bi.status IN (${statuses.map(() => "?").join(",")})
           ORDER BY bi.created_at DESC, bi.id DESC`
      ).bind(...statuses).all();
      const invoices = (rs.results ?? []).map((r) => {
        const idNum = Number(r.id);
        const invoiceDate = r.created_at ?? (/* @__PURE__ */ new Date()).toISOString();
        const dueDate = r.due_date ?? new Date(Date.parse(invoiceDate) + 7 * 864e5).toISOString();
        const total = Number(r.total_amount ?? 0);
        const paid = Number(r.paid_amount ?? 0);
        const remaining = Math.max(0, total - paid);
        const daysOverdue = Math.max(0, Math.floor((now.getTime() - Date.parse(dueDate)) / 864e5));
        return {
          id: idNum,
          invoice_no: `INV-${pad5(idNum)}`,
          customer: r.customer_name ?? "",
          customer_name: r.customer_name ?? "",
          plate_no: r.plate_no ?? "",
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
    __name(listInvoicesByStatus, "listInvoicesByStatus");
    if (url.pathname === "/api/billing/invoices/pending" && request.method === "GET") {
      const invoices = await listInvoicesByStatus("pending");
      return ok(request, invoices);
    }
    if (url.pathname === "/api/billing/invoices/paid" && request.method === "GET") {
      const invoices = await listInvoicesByStatus("paid");
      return ok(request, invoices);
    }
    if (url.pathname === "/api/billing/invoices/overdue" && request.method === "GET") {
      const invoices = await listInvoicesByStatus("overdue");
      return ok(request, invoices);
    }
    if (url.pathname === "/api/billing/invoices" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      const customerId = toInt(data.customer_id, null);
      if (!serviceOrderId || !customerId) return fail(request, 400, "service_order_id and customer_id are required");
      const laborHours = toFloat(data.labor_hours, 0) ?? 0;
      const laborRate = toFloat(data.labor_rate, 0) ?? 0;
      const materialsCost = toFloat(data.materials_cost, 0) ?? 0;
      const partsCost = toFloat(data.parts_cost, 0) ?? 0;
      const parkingCost = toFloat(data.parking_cost, 0) ?? 0;
      const discount = toFloat(data.discount, 0) ?? 0;
      const total = Math.max(0, laborHours * laborRate + materialsCost + partsCost + parkingCost - discount);
      const dueDate = new Date(Date.now() + 7 * 864e5).toISOString();
      const result = await env.DB.prepare(
        `INSERT INTO billing_invoices
           (service_order_id, customer_id, status, labor_hours, labor_rate, materials_cost, parts_cost, parking_cost, discount,
            total_amount, paid_amount, issued_at, due_date, created_at)
           VALUES
           (?1, ?2, 'draft', ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, NULL, ?10, CURRENT_TIMESTAMP)`
      ).bind(
        serviceOrderId,
        customerId,
        laborHours,
        laborRate,
        materialsCost,
        partsCost,
        parkingCost,
        discount,
        total,
        dueDate
      ).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, invoice_id: id, message: "Invoice created" }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)$/);
      if (m && request.method === "GET") {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, "Invalid invoice id");
        const row = await env.DB.prepare(
          `SELECT bi.*, c.name as customer_name, COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no
             FROM billing_invoices bi
             LEFT JOIN customers c ON c.id = bi.customer_id
             LEFT JOIN service_orders so ON so.id = bi.service_order_id
             WHERE bi.id=?1`
        ).bind(invoiceId).first();
        if (!row) return fail(request, 404, "Invoice not found");
        const total = Number(row.total_amount ?? 0);
        const paid = Number(row.paid_amount ?? 0);
        const data = {
          id: row.id,
          invoice_no: `INV-${pad5(Number(row.id))}`,
          customer_name: row.customer_name ?? "",
          plate_no: row.plate_no ?? "",
          invoice_date: row.created_at,
          due_date: row.due_date ?? new Date(Date.parse(row.created_at) + 7 * 864e5).toISOString(),
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
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/payments$/);
      if (m && request.method === "POST") {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, "Invalid invoice id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const amount = toFloat(data.payment_amount, null);
        if (!amount || amount <= 0) return fail(request, 400, "payment_amount must be > 0");
        const method = String(data.payment_method ?? "cash").trim() || "cash";
        const ref = String(data.reference_number ?? "").trim();
        const createdBy = toInt(data.created_by, null);
        await env.DB.prepare(
          `INSERT INTO billing_payments
             (invoice_id, payment_amount, payment_method, reference_number, created_by, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`
        ).bind(invoiceId, amount, method, ref || null, createdBy).run();
        await env.DB.prepare(`UPDATE billing_invoices SET paid_amount = paid_amount + ?1 WHERE id=?2`).bind(amount, invoiceId).run();
        const inv = await env.DB.prepare(`SELECT total_amount, paid_amount FROM billing_invoices WHERE id=?1`).bind(invoiceId).first();
        const total = Number(inv?.total_amount ?? 0);
        const paid = Number(inv?.paid_amount ?? 0);
        const status = paid >= total && total > 0 ? "paid" : void 0;
        if (status) {
          await env.DB.prepare(`UPDATE billing_invoices SET status='paid' WHERE id=?1`).bind(invoiceId).run();
        }
        return ok(request, null, { message: "Payment recorded" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/billing\/invoices\/(\d+)\/issue$/);
      if (m && request.method === "POST") {
        const invoiceId = toInt(m[1], null);
        if (!invoiceId) return fail(request, 400, "Invalid invoice id");
        await env.DB.prepare(`UPDATE billing_invoices SET status='issued', issued_at=CURRENT_TIMESTAMP WHERE id=?1`).bind(invoiceId).run();
        return ok(request, null, { message: "Invoice issued" });
      }
    }
    if (url.pathname === "/api/cashier/invoices/pending" && request.method === "GET") {
      const invoices = await listInvoicesByStatus("pending");
      return ok(request, invoices.map((i) => ({ ...i, remaining: i.remaining })));
    }
    if (url.pathname === "/api/cashier/transactions/daily" && request.method === "GET") {
      const day = todayISODate();
      const rs = await env.DB.prepare(
        `SELECT p.id, p.invoice_id, p.payment_amount as amount, p.payment_method, p.reference_number, p.created_at
           FROM billing_payments p
           WHERE substr(p.created_at,1,10)=?1
           ORDER BY p.created_at DESC, p.id DESC`
      ).bind(day).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/cashier/summary/daily" && request.method === "GET") {
      const day = todayISODate();
      const row = await env.DB.prepare(
        `SELECT
             COUNT(*) as total_transactions,
             SUM(payment_amount) as grand_total,
             SUM(CASE WHEN payment_method='cash' THEN payment_amount ELSE 0 END) as cash_total,
             SUM(CASE WHEN payment_method='card' THEN payment_amount ELSE 0 END) as card_total,
             SUM(CASE WHEN payment_method='check' THEN payment_amount ELSE 0 END) as check_total
           FROM billing_payments
           WHERE substr(created_at,1,10)=?1`
      ).bind(day).first();
      return ok(request, {
        total_transactions: Number(row?.total_transactions ?? 0),
        grand_total: Number(row?.grand_total ?? 0),
        cash_total: Number(row?.cash_total ?? 0),
        card_total: Number(row?.card_total ?? 0),
        check_total: Number(row?.check_total ?? 0)
      });
    }
    if (url.pathname === "/api/cashier/drawer/active" && request.method === "GET") {
      const cashierId = toInt(url.searchParams.get("cashier_id"), null);
      if (!cashierId) return fail(request, 400, "cashier_id is required");
      const row = await env.DB.prepare(
        `SELECT id, cashier_id, opening_balance, opening_time, status
           FROM cashier_drawers
           WHERE cashier_id=?1 AND status='open'
           ORDER BY opening_time DESC
           LIMIT 1`
      ).bind(cashierId).first();
      if (!row) return jsonResponse(request, { success: false, error: "No active drawer" }, 404);
      return ok(request, row);
    }
    if (url.pathname === "/api/cashier/drawer/open" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const cashierId = toInt(data.cashier_id, null);
      const openingBalance = toFloat(data.opening_balance, 0) ?? 0;
      if (!cashierId) return fail(request, 400, "cashier_id is required");
      await env.DB.prepare(`UPDATE cashier_drawers SET status='closed', closing_time=CURRENT_TIMESTAMP WHERE cashier_id=?1 AND status='open'`).bind(cashierId).run();
      const result = await env.DB.prepare(
        `INSERT INTO cashier_drawers (cashier_id, opening_balance, opening_time, status)
           VALUES (?1, ?2, CURRENT_TIMESTAMP, 'open')`
      ).bind(cashierId, openingBalance).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, drawer_id: id, message: "Drawer opened" }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/cashier\/drawer\/(\d+)\/close$/);
      if (m && request.method === "POST") {
        const drawerId = toInt(m[1], null);
        if (!drawerId) return fail(request, 400, "Invalid drawer id");
        const data = await readJson(request);
        const cashCounted = toFloat(data?.cash_counted, null);
        const notes = String(data?.notes ?? "").trim();
        await env.DB.prepare(
          `UPDATE cashier_drawers
             SET status='closed', closing_time=CURRENT_TIMESTAMP, cash_counted=?1, notes=?2
             WHERE id=?3`
        ).bind(cashCounted ?? null, notes || null, drawerId).run();
        return ok(request, null, { message: "Drawer closed" });
      }
    }
    if (url.pathname === "/api/cashier/payments" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const invoiceId = toInt(data.invoice_id, null);
      const amount = toFloat(data.amount, null);
      if (!invoiceId || !amount || amount <= 0) return fail(request, 400, "invoice_id and amount are required");
      const method = String(data.payment_method ?? "cash").trim() || "cash";
      const ref = String(data.reference_number ?? "").trim();
      const createdBy = toInt(data.created_by, null);
      await env.DB.prepare(
        `INSERT INTO billing_payments (invoice_id, payment_amount, payment_method, reference_number, created_by, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)`
      ).bind(invoiceId, amount, method, ref || null, createdBy).run();
      await env.DB.prepare(`UPDATE billing_invoices SET paid_amount = paid_amount + ?1 WHERE id=?2`).bind(amount, invoiceId).run();
      const inv = await env.DB.prepare(`SELECT total_amount, paid_amount FROM billing_invoices WHERE id=?1`).bind(invoiceId).first();
      const total = Number(inv?.total_amount ?? 0);
      const paid = Number(inv?.paid_amount ?? 0);
      if (paid >= total && total > 0) {
        await env.DB.prepare(`UPDATE billing_invoices SET status='paid' WHERE id=?1`).bind(invoiceId).run();
      }
      return ok(request, null, { message: "Payment recorded" });
    }
    if (url.pathname === "/api/follow-up/followups/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, service_order_id, customer_id, followup_date, contact_method, status
           FROM followups
           WHERE status='pending'
           ORDER BY followup_date ASC, id ASC`
      ).all();
      return jsonResponse(request, { success: true, data: rs.results ?? [], followups: rs.results ?? [] });
    }
    if (url.pathname === "/api/follow-up/issues" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, followup_id, issue_category, issue_description, severity, status, created_at
           FROM followup_issues
           WHERE status='open'
           ORDER BY created_at DESC, id DESC`
      ).all();
      return jsonResponse(request, { success: true, data: rs.results ?? [], issues: rs.results ?? [] });
    }
    if (url.pathname === "/api/follow-up/summary" && request.method === "GET") {
      const byStatus = await env.DB.prepare(`SELECT COUNT(*) as n, status FROM followups GROUP BY status`).all();
      const issuesByStatus = await env.DB.prepare(`SELECT COUNT(*) as n, status FROM followup_issues GROUP BY status`).all();
      const summary = {
        by_status: (byStatus.results ?? []).map((r) => [Number(r.n ?? 0), r.status]),
        issues_by_status: (issuesByStatus.results ?? []).map((r) => [Number(r.n ?? 0), r.status])
      };
      return jsonResponse(request, { success: true, data: summary, summary });
    }
    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)$/);
      if (m && request.method === "GET") {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, "Invalid followup id");
        const followup = await env.DB.prepare(`SELECT * FROM followups WHERE id=?1`).bind(followupId).first();
        if (!followup) return fail(request, 404, "Followup not found");
        const feedback = await env.DB.prepare(`SELECT * FROM followup_feedback WHERE followup_id=?1 ORDER BY id DESC LIMIT 1`).bind(followupId).first();
        const issues = await env.DB.prepare(`SELECT * FROM followup_issues WHERE followup_id=?1 ORDER BY id DESC`).bind(followupId).all();
        const details = { followup, feedback, issues: issues.results ?? [] };
        return jsonResponse(request, { success: true, data: details, details });
      }
    }
    if (url.pathname === "/api/follow-up/followups" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      const customerId = toInt(data.customer_id, null);
      const followupDate = String(data.followup_date ?? todayISODate()).trim();
      const contactMethod = String(data.contact_method ?? "phone").trim();
      const scheduledBy = toInt(data.scheduled_by, null);
      if (!serviceOrderId || !customerId) return fail(request, 400, "service_order_id and customer_id are required");
      const result = await env.DB.prepare(
        `INSERT INTO followups
           (service_order_id, customer_id, followup_date, contact_method, scheduled_by, status, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'pending', CURRENT_TIMESTAMP)`
      ).bind(serviceOrderId, customerId, followupDate, contactMethod, scheduledBy).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, followup_id: id }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/feedback$/);
      if (m && request.method === "POST") {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, "Invalid followup id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        await env.DB.prepare(
          `INSERT INTO followup_feedback
             (followup_id, overall_experience, would_recommend, comments, created_at)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)`
        ).bind(
          followupId,
          toInt(data.overall_experience, null),
          String(data.would_recommend ?? "").trim() || null,
          String(data.comments ?? "").trim() || null
        ).run();
        return ok(request, null, { message: "Feedback recorded" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/issues$/);
      if (m && request.method === "POST") {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, "Invalid followup id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        await env.DB.prepare(
          `INSERT INTO followup_issues
             (followup_id, issue_category, issue_description, severity, status, created_at)
             VALUES (?1, ?2, ?3, ?4, 'open', CURRENT_TIMESTAMP)`
        ).bind(
          followupId,
          String(data.issue_category ?? "").trim() || null,
          String(data.issue_description ?? "").trim() || null,
          String(data.severity ?? "").trim() || "medium"
        ).run();
        return ok(request, null, { message: "Issue logged" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/follow-up\/followups\/(\d+)\/complete$/);
      if (m && request.method === "POST") {
        const followupId = toInt(m[1], null);
        if (!followupId) return fail(request, 400, "Invalid followup id");
        const data = await readJson(request);
        await env.DB.prepare(
          `UPDATE followups
             SET status='completed', completed_by=?1, contact_person_name=?2, notes=?3, completed_at=CURRENT_TIMESTAMP
             WHERE id=?4`
        ).bind(
          toInt(data?.completed_by, null),
          String(data?.contact_person_name ?? "").trim() || null,
          String(data?.notes ?? "").trim() || null,
          followupId
        ).run();
        return ok(request, null, { message: "Follow-up completed" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/follow-up\/issues\/(\d+)\/resolve$/);
      if (m && request.method === "POST") {
        const issueId = toInt(m[1], null);
        if (!issueId) return fail(request, 400, "Invalid issue id");
        const data = await readJson(request);
        await env.DB.prepare(
          `UPDATE followup_issues
             SET status='resolved', resolution_type=?1, resolution_notes=?2, resolved_at=CURRENT_TIMESTAMP
             WHERE id=?3`
        ).bind(
          String(data?.resolution_type ?? "").trim() || null,
          String(data?.resolution_notes ?? "").trim() || null,
          issueId
        ).run();
        return ok(request, null, { message: "Issue resolved" });
      }
    }
    if (url.pathname === "/api/car-jockey/movements/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT * FROM car_jockey_movements WHERE status='active' ORDER BY started_at DESC, id DESC`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/car-jockey/parking/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT * FROM car_jockey_parking WHERE status='active' ORDER BY parked_at DESC, id DESC`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/car-jockey/summary" && request.method === "GET") {
      const activeMovements = await env.DB.prepare(`SELECT COUNT(*) as n FROM car_jockey_movements WHERE status='active'`).first();
      const parked = await env.DB.prepare(`SELECT COUNT(*) as n FROM car_jockey_parking WHERE status='active'`).first();
      return ok(request, {
        active_movements: Number(activeMovements?.n ?? 0),
        parked_vehicles: Number(parked?.n ?? 0)
      });
    }
    if (url.pathname === "/api/car-jockey/vehicles/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id as so_id, c.name as customer_name, COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no,
                  so.status, so.created_at
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='completed'
             AND so.id NOT IN (SELECT service_order_id FROM car_jockey_movements)
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 100`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/car-jockey/movements" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, "service_order_id is required");
      const result = await env.DB.prepare(
        `INSERT INTO car_jockey_movements
           (service_order_id, jockey_id, movement_type, from_location, to_location, reason, vehicle_condition_start,
            fuel_start, mileage_start, started_at, status)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, CURRENT_TIMESTAMP, 'active')`
      ).bind(
        serviceOrderId,
        toInt(data.jockey_id, null),
        String(data.movement_type ?? "").trim() || "check-in",
        String(data.from_location ?? "").trim() || null,
        String(data.to_location ?? "").trim() || null,
        String(data.reason ?? "").trim() || null,
        String(data.vehicle_condition ?? "").trim() || null,
        toFloat(data.fuel_level, null),
        toFloat(data.mileage, null)
      ).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, movement_id: id }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/car-jockey\/movements\/(\d+)\/complete$/);
      if (m && request.method === "POST") {
        const movementId = toInt(m[1], null);
        if (!movementId) return fail(request, 400, "Invalid movement id");
        const data = await readJson(request);
        await env.DB.prepare(
          `UPDATE car_jockey_movements
             SET status='completed', completed_at=CURRENT_TIMESTAMP,
                 vehicle_condition_end=?1, fuel_end=?2, mileage_end=?3
             WHERE id=?4`
        ).bind(
          String(data?.vehicle_condition ?? "").trim() || null,
          toFloat(data?.fuel_level, null),
          toFloat(data?.mileage, null),
          movementId
        ).run();
        return ok(request, null, { message: "Movement completed" });
      }
    }
    if (url.pathname === "/api/car-jockey/parking" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, "service_order_id is required");
      const result = await env.DB.prepare(
        `INSERT INTO car_jockey_parking
           (service_order_id, vehicle_movement_id, parking_slot, parking_zone, parking_level, ground_condition, parking_fee, parked_at, status)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, 'active')`
      ).bind(
        serviceOrderId,
        toInt(data.vehicle_movement_id, null),
        String(data.parking_slot ?? "").trim() || null,
        String(data.parking_zone ?? "").trim() || null,
        toInt(data.parking_level, null),
        String(data.ground_condition ?? "").trim() || null,
        toFloat(data.parking_fee, null)
      ).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, parking_id: id }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/car-jockey\/parking\/(\d+)\/release$/);
      if (m && request.method === "POST") {
        const parkingId = toInt(m[1], null);
        if (!parkingId) return fail(request, 400, "Invalid parking id");
        await env.DB.prepare(`UPDATE car_jockey_parking SET status='released', released_at=CURRENT_TIMESTAMP WHERE id=?1`).bind(parkingId).run();
        return ok(request, null, { message: "Vehicle released" });
      }
    }
    if (url.pathname === "/api/car-jockey/parts-requests" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, "service_order_id is required");
      const result = await env.DB.prepare(
        `INSERT INTO car_jockey_parts_requests
           (service_order_id, requested_by, document_data, status, created_at)
           VALUES (?1, ?2, ?3, 'pending', CURRENT_TIMESTAMP)`
      ).bind(serviceOrderId, toInt(data.requested_by, null), JSON.stringify(data.items ?? [])).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, request_id: id }, 201);
    }
    if (url.pathname === "/api/job-controller/service-orders/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id,
                  c.name as customer,
                  c.contact_no as contact,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  so.service_type,
                  so.check_in_time,
                  so.status,
                  0 as assigned_count
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='pending'
           ORDER BY so.created_at DESC, so.id DESC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
        r.id,
        r.customer,
        r.contact,
        r.vehicle,
        r.service_type,
        r.check_in_time,
        r.status,
        null,
        r.assigned_count
      ]);
      return ok(request, rows);
    }
    if (url.pathname === "/api/job-controller/service-orders/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id,
                  c.name as customer,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  so.service_type,
                  t.name as technician_name,
                  ta.status as assignment_status,
                  ta.clock_in_time,
                  ta.labor_hours,
                  ta.id as assignment_id
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           LEFT JOIN job_controller_assignments ta ON ta.service_order_id = so.id
           LEFT JOIN technicians t ON t.id = ta.technician_id
           WHERE so.status='in-progress'
           ORDER BY so.created_at DESC, so.id DESC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
        r.id,
        r.customer,
        r.vehicle,
        r.service_type,
        r.technician_name,
        r.assignment_status,
        r.clock_in_time,
        r.labor_hours,
        r.assignment_id
      ]);
      return ok(request, rows);
    }
    if (url.pathname === "/api/job-controller/technicians/available" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, name, employee_id, status
           FROM technicians
           WHERE status='active'
           ORDER BY name ASC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [r.id, r.name, r.employee_id, r.status]);
      return ok(request, rows);
    }
    if (url.pathname === "/api/job-controller/assign" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      const technicianId = toInt(data.technician_id, null);
      if (!serviceOrderId || !technicianId) return fail(request, 400, "service_order_id and technician_id are required");
      const assignedBy = String(data.assigned_by ?? "").trim();
      const result = await env.DB.prepare(
        `INSERT INTO job_controller_assignments
           (service_order_id, technician_id, assigned_by, assigned_at, status)
           VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP, 'assigned')`
      ).bind(serviceOrderId, technicianId, assignedBy || null).run();
      await env.DB.prepare(`UPDATE service_orders SET status='in-progress' WHERE id=?1`).bind(serviceOrderId).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, assignment_id: id }, 201);
    }
    if (url.pathname === "/api/job-controller/clock-in" && request.method === "POST") {
      const data = await readJson(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, "assignment_id is required");
      await env.DB.prepare(`UPDATE job_controller_assignments SET clock_in_time=COALESCE(clock_in_time, CURRENT_TIMESTAMP), status='in-progress' WHERE id=?1`).bind(assignmentId).run();
      return ok(request, null, { message: "Clock-in recorded" });
    }
    if (url.pathname === "/api/job-controller/clock-out" && request.method === "POST") {
      const data = await readJson(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, "assignment_id is required");
      await env.DB.prepare(
        `UPDATE job_controller_assignments
           SET clock_out_time=CURRENT_TIMESTAMP, status='completed'
           WHERE id=?1`
      ).bind(assignmentId).run();
      return ok(request, null, { message: "Clock-out recorded" });
    }
    {
      const m = url.pathname.match(/^\/api\/job-controller\/labor-summary\/(\d+)$/);
      if (m && request.method === "GET") {
        const techId = toInt(m[1], null);
        if (!techId) return fail(request, 400, "Invalid technician id");
        const row = await env.DB.prepare(
          `SELECT
               COUNT(*) as jobs,
               SUM(COALESCE(labor_hours,0)) as total_hours
             FROM job_controller_assignments
             WHERE technician_id=?1`
        ).bind(techId).first();
        return ok(request, { jobs: Number(row?.jobs ?? 0), total_hours: Number(row?.total_hours ?? 0) });
      }
    }
    if (url.pathname === "/api/job-controller/parts-requests/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(`
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
          WHERE pr.status = 'pending'
          ORDER BY pr.created_at ASC
        `).all();
      const requestIds = (rs.results ?? []).map((r) => r.id);
      let itemsByReq = {};
      if (requestIds.length > 0) {
        const placeholders = requestIds.map(() => "?").join(",");
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
        `).bind(...requestIds).all();
        (itemsRs.results ?? []).forEach((item) => {
          if (!itemsByReq[item.parts_request_id]) itemsByReq[item.parts_request_id] = [];
          itemsByReq[item.parts_request_id].push(item);
        });
      }
      const result = (rs.results ?? []).map((r) => ({
        ...r,
        items: itemsByReq[r.id] || []
      }));
      return ok(request, result);
    }
    if (url.pathname === "/api/job-controller/products/search" && request.method === "GET") {
      const q = url.searchParams.get("q") || "";
      if (!q || q.length < 2) {
        return ok(request, []);
      }
      try {
        const results = await env.DB.prepare(`
          SELECT id, product_name, product_code, quantity_in_stock, unit_price
          FROM warehouse_products
          WHERE product_name LIKE ? OR product_code LIKE ?
          LIMIT 50
        `).bind(`%${q}%`, `%${q}%`).all();
        return ok(request, results.results || []);
      } catch (e) {
        return fail(request, 500, `Search error: ${e.message}`);
      }
    }
    if (url.pathname === "/api/job-controller/parts-requests" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.service_order_id || !body.items || !Array.isArray(body.items)) {
        return fail(request, 400, "service_order_id and items array required");
      }
      const res1 = await env.DB.prepare(`
          INSERT INTO parts_requests (service_order_id, requested_by, requested_by_role, status, notes)
          VALUES (?, ?, 'job_controller', 'sent-to-warehouse', ?)
        `).bind(body.service_order_id, body.technician_id || null, body.notes || "").run();
      if (!res1.success) return fail(request, 500, "Failed to create request");
      const requestId = await d1FirstId(res1);
      const stmts = body.items.map(
        (p) => env.DB.prepare(`
              INSERT INTO parts_request_items (parts_request_id, product_id, quantity_requested, status)
              VALUES (?, ?, ?, 'pending')
          `).bind(requestId, p.product_id, p.quantity)
      );
      await env.DB.batch(stmts);
      return ok(request, { success: true, request_id: requestId });
    }
    {
      const m = url.pathname.match(/^\/api\/job-controller\/parts-requests\/(\d+)\/approve$/);
      if (m && request.method === "POST") {
        const id = toInt(m[1], null);
        if (!id) return fail(request, 400, "Invalid ID");
        await env.DB.prepare(`
          UPDATE parts_requests
          SET status = 'sent-to-warehouse', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?1
        `).bind(id).run();
        return ok(request, { success: true });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/job-controller\/clock-records\/(\d+)$/);
      if (m && request.method === "GET") {
        const techId = toInt(m[1], null);
        if (!techId) return fail(request, 400, "Invalid technician id");
        const rs = await env.DB.prepare(
          `SELECT id, service_order_id, clock_in_time, clock_out_time, labor_hours, status
             FROM job_controller_assignments
             WHERE technician_id=?1
             ORDER BY assigned_at DESC, id DESC
             LIMIT 100`
        ).bind(techId).all();
        return ok(request, rs.results ?? []);
      }
    }
    if (url.pathname === "/api/job-wrapup/jobs/ready" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id as service_order_id,
                  'JOB-' || printf('%05d', so.id) as job_order_no,
                  c.name as customer,
                  COALESCE(so.vehicle_plate_no, c.plate_no) as vehicle,
                  NULL as technician_id,
                  '' as technician_name,
                  'passed' as qc_status
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='completed'
             AND so.id NOT IN (SELECT service_order_id FROM job_wrapups)
           ORDER BY so.created_at DESC, so.id DESC
           LIMIT 100`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
        r.service_order_id,
        r.job_order_no,
        r.customer,
        r.vehicle,
        r.technician_id,
        r.technician_name,
        r.qc_status
      ]);
      return ok(request, rows);
    }
    if (url.pathname === "/api/job-wrapup/wrapups/active" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, service_order_id, technician_id, status, started_at, labor_hours
           FROM job_wrapups
           WHERE status='active'
           ORDER BY started_at DESC, id DESC`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/job-wrapup/summary" && request.method === "GET") {
      const total = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups`).first();
      const ready = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE status='active'`).first();
      const returned = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE returned_to_sa_at IS NOT NULL`).first();
      const pending = await env.DB.prepare(`SELECT COUNT(*) as n FROM job_wrapups WHERE clock_out_time IS NULL`).first();
      const avg = await env.DB.prepare(`SELECT AVG(COALESCE(labor_hours,0)) as n FROM job_wrapups`).first();
      return ok(request, {
        total_wrapups: Number(total?.n ?? 0),
        ready_count: Number(ready?.n ?? 0),
        returned_count: Number(returned?.n ?? 0),
        pending_count: Number(pending?.n ?? 0),
        avg_labor_hours: Number(avg?.n ?? 0)
      });
    }
    if (url.pathname === "/api/job-wrapup/wrapups" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!serviceOrderId) return fail(request, 400, "service_order_id is required");
      const result = await env.DB.prepare(
        `INSERT INTO job_wrapups
           (service_order_id, job_controller_id, technician_id, qc_inspection_id, status, started_at)
           VALUES (?1, ?2, ?3, ?4, 'active', CURRENT_TIMESTAMP)`
      ).bind(serviceOrderId, toInt(data.job_controller_id, null), toInt(data.technician_id, null), toInt(data.qc_inspection_id, null)).run();
      const id = await d1FirstId(result);
      return jsonResponse(request, { success: true, wrapup_id: id }, 201);
    }
    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/clock-out$/);
      if (m && request.method === "POST") {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, "Invalid wrapup id");
        const row = await env.DB.prepare(`SELECT started_at FROM job_wrapups WHERE id=?1`).bind(wrapupId).first();
        const startedAt = row?.started_at ? Date.parse(row.started_at) : Date.now();
        const hours = Math.max(0, (Date.now() - startedAt) / 36e5);
        const data = await readJson(request);
        const notes = String(data?.notes ?? "").trim();
        await env.DB.prepare(
          `UPDATE job_wrapups
             SET clock_out_time=CURRENT_TIMESTAMP, labor_hours=?1, status='completed', checklist_items=COALESCE(checklist_items, ?2)
             WHERE id=?3`
        ).bind(hours, notes || null, wrapupId).run();
        return jsonResponse(request, { success: true, labor_hours: hours });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/checklist$/);
      if (m && request.method === "PUT") {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, "Invalid wrapup id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        await env.DB.prepare(
          `UPDATE job_wrapups
             SET checklist_items=?1, materials_returned=?2, tools_returned=?3, vehicle_condition=?4, quality_passed=?5
             WHERE id=?6`
        ).bind(
          String(data.checklist_items ?? "").trim() || null,
          data.materials_returned ? 1 : 0,
          data.tools_returned ? 1 : 0,
          String(data.vehicle_condition ?? "").trim() || null,
          data.quality_passed ? 1 : 0,
          wrapupId
        ).run();
        return ok(request, null, { message: "Checklist updated" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/job-wrapup\/wrapups\/(\d+)\/return-to-sa$/);
      if (m && request.method === "POST") {
        const wrapupId = toInt(m[1], null);
        if (!wrapupId) return fail(request, 400, "Invalid wrapup id");
        await env.DB.prepare(`UPDATE job_wrapups SET returned_to_sa_at=CURRENT_TIMESTAMP WHERE id=?1`).bind(wrapupId).run();
        return ok(request, null, { message: "Returned to Service Advisor" });
      }
    }
    if (url.pathname === "/api/service-advisor/appointments/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
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
           WHERE so.status IN ('scheduled','confirmed')
           ORDER BY so.scheduled_date ASC, so.scheduled_time ASC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [
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
    if (url.pathname === "/api/service-advisor/service-orders/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT so.id, c.name, COALESCE(so.vehicle_plate_no, c.plate_no) as plate_no, so.service_type, so.status, so.created_at
           FROM service_orders so
           LEFT JOIN customers c ON c.id = so.customer_id
           WHERE so.status='pending'
           ORDER BY so.created_at DESC, so.id DESC`
      ).all();
      const rows = (rs.results ?? []).map((r) => [r.id, r.name, r.plate_no, r.service_type, r.status, r.created_at]);
      return ok(request, rows);
    }
    if (url.pathname === "/api/service-advisor/check-in" && request.method === "POST") {
      try {
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const schedulingOrderId = toInt(data.scheduling_order_id, null);
        const advisorId = toInt(data.advisor_id, null);
        if (!schedulingOrderId) return fail(request, 400, "scheduling_order_id is required");
        const sched = await env.DB.prepare(
          `SELECT s.customer_id, s.service_type, 
                    c.name, c.contact_no, c.email, c.address, 
                    c.plate_no, c.vehicle_model, c.vehicle_year, c.engine_no, c.chassis_no
             FROM scheduling_orders s
             LEFT JOIN customers c ON c.id = s.customer_id
             WHERE s.id=?1`
        ).bind(schedulingOrderId).first();
        if (!sched) return fail(request, 404, "Scheduling order not found");
        let validAdvisorId = advisorId;
        if (validAdvisorId) {
          const advExists = await env.DB.prepare("SELECT id FROM service_advisors WHERE id=?1").bind(validAdvisorId).first();
          if (!advExists) validAdvisorId = null;
        }
        if (!validAdvisorId) {
          const firstAdv = await env.DB.prepare("SELECT id FROM service_advisors LIMIT 1").first();
          validAdvisorId = firstAdv?.id ?? null;
        }
        const result = await env.DB.prepare(
          `INSERT INTO service_orders
             (scheduling_order_id, customer_id, vehicle_plate_no, service_type, check_in_time, status, advisor_id, created_at)
             VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP, 'pending', ?5, CURRENT_TIMESTAMP)`
        ).bind(
          schedulingOrderId,
          sched.customer_id,
          sched.plate_no || null,
          sched.service_type || null,
          validAdvisorId
        ).run();
        await env.DB.prepare(`UPDATE scheduling_orders SET status='in-progress' WHERE id=?1`).bind(schedulingOrderId).run();
        const serviceOrderId = await d1FirstId(result);
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
      } catch (e) {
        console.error("Check-in error:", e.message, e.cause, e.stack);
        return fail(request, 500, "Check-in failed: " + e.message + (e.stack ? " Stack: " + e.stack : ""));
      }
    }
    if (url.pathname === "/api/service-advisor/cis" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const customerId = toInt(data.customer_id, null);
      const serviceOrderId = toInt(data.service_order_id, null);
      if (!customerId || !serviceOrderId) return fail(request, 400, "customer_id and service_order_id are required");
      await env.DB.prepare(
        `INSERT INTO customer_info_sheets
           (customer_id, service_order_id, name, contact_no, email, address, vehicle_plate_no, vehicle_model, vehicle_year,
            engine_no, chassis_no, mileage_in, service_type, notes, created_at, created_by)
           VALUES
           (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, CURRENT_TIMESTAMP, ?15)`
      ).bind(
        customerId,
        serviceOrderId,
        String(data.name ?? "").trim(),
        String(data.contact_no ?? "").trim(),
        String(data.email ?? "").trim() || null,
        String(data.address ?? "").trim() || null,
        String(data.vehicle_plate_no ?? "").trim() || null,
        String(data.vehicle_model ?? "").trim() || null,
        toInt(data.vehicle_year, null),
        String(data.engine_no ?? "").trim() || null,
        String(data.chassis_no ?? "").trim() || null,
        toInt(data.mileage_in, null),
        String(data.service_type ?? "").trim() || null,
        String(data.notes ?? "").trim() || null,
        String(data.created_by ?? "").trim() || null
      ).run();
      return ok(request, null, { message: "CIS saved" });
    }
    if (url.pathname === "/api/service-advisor/vrc" && request.method === "POST") {
      try {
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const customerId = toInt(data.customer_id, null);
        const serviceOrderId = toInt(data.service_order_id, null);
        if (!customerId || !serviceOrderId) return fail(request, 400, "customer_id and service_order_id are required");
        const custExists = await env.DB.prepare("SELECT id FROM customers WHERE id=?1").bind(customerId).first();
        if (!custExists) return fail(request, 404, `Customer ID ${customerId} not found`);
        const soExists = await env.DB.prepare("SELECT id FROM service_orders WHERE id=?1").bind(serviceOrderId).first();
        if (!soExists) return fail(request, 404, `Service Order ID ${serviceOrderId} not found`);
        await env.DB.prepare(
          `INSERT INTO vehicle_report_cards
             (service_order_id, customer_id, mileage_in, mileage_out, exterior_condition, interior_condition,
              checklist_1_engine_starts, checklist_2_idle_smooth, checklist_3_acceleration, checklist_4_brakes, checklist_5_steering,
              checklist_6_lights, checklist_7_air_con, checklist_8_wipers, checklist_9_horn, checklist_10_handbrake,
              additional_findings, settings_restored, diagnosis_completed_by, diagnosis_date, created_at)
             VALUES
             (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
        ).bind(
          serviceOrderId,
          customerId,
          toInt(data.mileage_in, null),
          toInt(data.mileage_out, null),
          String(data.exterior_condition ?? "").trim() || null,
          String(data.interior_condition ?? "").trim() || null,
          normalizeChecklistVal(data.checklist_1_engine_starts),
          normalizeChecklistVal(data.checklist_2_idle_smooth),
          normalizeChecklistVal(data.checklist_3_acceleration),
          normalizeChecklistVal(data.checklist_4_brakes),
          normalizeChecklistVal(data.checklist_5_steering),
          normalizeChecklistVal(data.checklist_6_lights),
          normalizeChecklistVal(data.checklist_7_air_con),
          normalizeChecklistVal(data.checklist_8_wipers),
          normalizeChecklistVal(data.checklist_9_horn),
          normalizeChecklistVal(data.checklist_10_handbrake),
          String(data.additional_findings ?? "").trim() || null,
          data.settings_restored ? 1 : 0,
          String(data.diagnosis_completed_by ?? "").trim() || null
        ).run();
        return ok(request, null, { message: "VRC saved" });
      } catch (e) {
        console.error("VRC Save Error:", e.message, e.stack);
        return fail(request, 500, "VRC save failed: " + e.message);
      }
    }
    {
      const m = url.pathname.match(/^\/api\/service-advisor\/documents\/(\d+)\/print$/);
      if (m && request.method === "POST") {
        return ok(request, null, { message: "Print request accepted" });
      }
    }
    if (url.pathname === "/api/gatepass/pending" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT g.id, g.service_order_id, g.customer_id, g.status, g.created_at
           FROM gatepasses g
           WHERE g.status='pending'
           ORDER BY g.created_at DESC, g.id DESC`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/gatepass/sign" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const gatepassId = toInt(data.gatepass_id, null);
      const signatureType = String(data.signature_type ?? "").trim();
      const signedBy = toInt(data.signed_by, null);
      if (!gatepassId || !signatureType) return fail(request, 400, "gatepass_id and signature_type are required");
      await env.DB.prepare(`INSERT INTO gatepass_signatures (gatepass_id, signature_type, signed_by, signed_at) VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)`).bind(gatepassId, signatureType, signedBy).run();
      await env.DB.prepare(`UPDATE gatepasses SET status='approved' WHERE id=?1`).bind(gatepassId).run();
      return ok(request, null, { message: "Gatepass signed" });
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const data = await readJson(request);
      const username = String(data?.username ?? "").trim();
      const password = String(data?.password ?? "").trim();
      if (!username || !password) {
        return jsonResponse(request, { success: false, error: "Username and password required" }, 400);
      }
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return jsonResponse(request, {
          success: true,
          user: {
            id: 0,
            username,
            name: "Admin",
            role: "admin",
            email: "admin@rapide.local"
          }
        });
      }
      const row = await env.DB.prepare(
        `SELECT id, username, name, role, email
           FROM personnel
           WHERE username = ?1 AND password = ?2 AND status = 'active'
           LIMIT 1`
      ).bind(username, password).first();
      if (!row) {
        return jsonResponse(request, { success: false, error: "Invalid credentials" }, 401);
      }
      return jsonResponse(request, {
        success: true,
        user: {
          id: row.id,
          username: row.username,
          name: row.name,
          role: row.role,
          email: row.email ?? ""
        }
      });
    }
    if (url.pathname === "/api/customer/pms-due-list" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, name, contact_no, plate_no, vehicle_model, last_service_date, days_since_service
           FROM pms_due_list`
      ).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/customer/search" && request.method === "POST") {
      const data = await readJson(request);
      const searchType = String(data?.search_type ?? "").trim();
      const rawValue = String(data?.search_value ?? "").trim();
      if (!searchType || !rawValue) {
        return fail(request, 400, "search_type and search_value are required");
      }
      let where = "";
      let param = rawValue;
      if (searchType === "plate") {
        where = "plate_no LIKE ?1";
        param = `%${rawValue}%`;
      } else if (searchType === "name") {
        where = "name LIKE ?1";
        param = `%${rawValue}%`;
      } else if (searchType === "contact") {
        where = "contact_no LIKE ?1";
        param = `%${rawValue}%`;
      } else {
        return fail(request, 400, "Invalid search_type");
      }
      const rs = await env.DB.prepare(
        `SELECT id, name, contact_no, plate_no, vehicle_model, vehicle_year, email
           FROM customers
           WHERE ${where}
           ORDER BY registration_date DESC
           LIMIT 50`
      ).bind(param).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/customer/register" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const name = String(data.name ?? "").trim();
      const contact_no = String(data.contact_no ?? "").trim();
      const plate_no = String(data.plate_no ?? "").trim();
      const vehicle_model = String(data.vehicle_model ?? "").trim();
      if (!name || !contact_no || !plate_no || !vehicle_model) {
        return fail(request, 400, "Name, contact_no, plate_no, and vehicle_model are required");
      }
      const forceCreate = Boolean(data.force_create);
      if (!forceCreate) {
        const dup = await env.DB.prepare(
          `SELECT id, name, contact_no, plate_no, vehicle_model
             FROM customers
             WHERE contact_no = ?1 OR plate_no = ?2
             LIMIT 10`
        ).bind(contact_no, plate_no).all();
        if ((dup.results?.length ?? 0) > 0) {
          return jsonResponse(request, { status: "warning", duplicates: dup.results ?? [] }, 200);
        }
      }
      try {
        const result = await env.DB.prepare(
          `INSERT INTO customers
             (name, contact_no, plate_no, vehicle_model, vehicle_year, email, engine_no, chassis_no, address, city, customer_type, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'walk-in', 'active')`
        ).bind(
          name,
          contact_no,
          plate_no,
          vehicle_model,
          toInt(data.vehicle_year, null),
          String(data.email ?? "").trim() || null,
          String(data.engine_no ?? "").trim() || null,
          String(data.chassis_no ?? "").trim() || null,
          String(data.address ?? "").trim() || null,
          String(data.city ?? "").trim() || null
        ).run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, customer_id: id }, 201);
      } catch (e) {
        return fail(request, 500, String(e?.message ?? e ?? "Registration failed"));
      }
    }
    if (url.pathname === "/api/scheduler/check-availability" && request.method === "POST") {
      const data = await readJson(request);
      const date = String(data?.date ?? "").trim();
      const time = String(data?.time ?? "").trim();
      if (!date || !time) return fail(request, 400, "date and time are required");
      const busy = await env.DB.prepare(
        `SELECT bay_id, technician_id, advisor_id
           FROM scheduling_orders
           WHERE scheduled_date = ?1 AND scheduled_time = ?2
             AND status IN ('scheduled','confirmed','in-progress')`
      ).bind(date, time).all();
      const busyBay = new Set((busy.results ?? []).map((r) => r.bay_id).filter(Boolean));
      const busyTech = new Set((busy.results ?? []).map((r) => r.technician_id).filter(Boolean));
      const busyAdvisor = new Set((busy.results ?? []).map((r) => r.advisor_id).filter(Boolean));
      const bays = await env.DB.prepare(`SELECT id, bay_name, capacity, bay_type, status FROM service_bays WHERE status = 'active' ORDER BY bay_name ASC`).all();
      const techs = await env.DB.prepare(`SELECT id, name, specialization, status FROM technicians WHERE status = 'active' ORDER BY name ASC`).all();
      const advisors = await env.DB.prepare(`SELECT id, name, status FROM service_advisors WHERE status = 'active' ORDER BY name ASC`).all();
      return ok(request, {
        available_bays: (bays.results ?? []).filter((b) => !busyBay.has(b.id)),
        available_technicians: (techs.results ?? []).filter((t) => !busyTech.has(t.id)),
        available_advisors: (advisors.results ?? []).filter((a) => !busyAdvisor.has(a.id))
      });
    }
    if (url.pathname === "/api/scheduler/create-order" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const customerId = toInt(data.customer_id, null);
      const bayId = toInt(data.bay_id, null);
      const techId = toInt(data.technician_id, null);
      const advisorId = toInt(data.advisor_id, null);
      const date = String(data.scheduled_date ?? "").trim();
      const time = String(data.scheduled_time ?? "").trim();
      const serviceType = String(data.service_type ?? "PMS").trim() || "PMS";
      const createdBy = String(data.created_by ?? "SYSTEM").trim() || "SYSTEM";
      if (!customerId || !bayId || !techId || !advisorId || !date || !time) {
        return fail(request, 400, "customer_id, scheduled_date, scheduled_time, bay_id, technician_id, advisor_id are required");
      }
      try {
        const result = await env.DB.prepare(
          `INSERT INTO scheduling_orders
             (customer_id, scheduled_date, scheduled_time, bay_id, technician_id, advisor_id, service_type, status, priority, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'scheduled', 'normal', ?8)`
        ).bind(customerId, date, time, bayId, techId, advisorId, serviceType, createdBy).run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, order_id: id }, 201);
      } catch (e) {
        const msg = String(e?.message ?? e ?? "Failed to create order");
        const isUnique = /UNIQUE|constraint/i.test(msg);
        return fail(request, isUnique ? 400 : 500, isUnique ? "Slot already taken" : msg);
      }
    }
    if (url.pathname === "/api/scheduler/log-contact-attempt" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const customerId = toInt(data.customer_id, null);
      const contactType = String(data.contact_type ?? "").trim();
      const status = String(data.status ?? "attempted").trim() || "attempted";
      const notes = data.notes ? String(data.notes) : null;
      const createdBy = String(data.created_by ?? "SYSTEM").trim() || "SYSTEM";
      if (!customerId || !contactType) {
        return fail(request, 400, "customer_id and contact_type are required");
      }
      try {
        const result = await env.DB.prepare(
          `INSERT INTO contact_attempts (customer_id, contact_type, attempt_date, status, notes, created_by)
             VALUES (?1, ?2, CURRENT_TIMESTAMP, ?3, ?4, ?5)`
        ).bind(customerId, contactType, status, notes, createdBy).run();
        const id = await d1FirstId(result);
        return ok(request, { attempt_id: id });
      } catch (e) {
        return fail(request, 500, String(e?.message ?? e ?? "Failed to log contact attempt"));
      }
    }
    if (url.pathname === "/api/sms/queue-pms-batch" && request.method === "POST") {
      const data = await readJson(request);
      const customerIds = (data?.customer_ids ?? []).map((x) => toInt(x, null)).filter((x) => !!x);
      const createdBy = String(data?.created_by ?? "SYSTEM").trim() || "SYSTEM";
      if (!customerIds.length) return fail(request, 400, "customer_ids is required");
      const outboxIds = [];
      for (const customerId of customerIds) {
        const customer = await env.DB.prepare(`SELECT id, contact_no, name, plate_no FROM customers WHERE id = ?1 LIMIT 1`).bind(customerId).first();
        if (!customer) continue;
        const message = `Rapide PMS Reminder: Hi ${customer.name}, your vehicle${customer.plate_no ? ` (${customer.plate_no})` : ""} is due for PMS. Reply or call to book.`;
        const result = await env.DB.prepare(
          `INSERT INTO sms_outbox (customer_id, scheduling_order_id, purpose, phone, message, scheduled_at, status, provider)
             VALUES (?1, NULL, 'PMS_OUTREACH', ?2, ?3, datetime('now'), 'queued', 'mock')`
        ).bind(customerId, customer.contact_no, message).run();
        const id = await d1FirstId(result);
        if (typeof id === "number") outboxIds.push(id);
      }
      return ok(request, null, { outbox_ids: outboxIds });
    }
    if (url.pathname === "/api/warehouse/products" && request.method === "GET") {
      const rs = await env.DB.prepare(
        `SELECT id, product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, status
           FROM warehouse_products
           ORDER BY id DESC`
      ).all();
      const tuples = (rs.results ?? []).map((r) => [
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
    if (url.pathname === "/api/warehouse/products" && request.method === "POST") {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const code = String(data.product_code ?? "").trim();
      const name = String(data.product_name ?? "").trim();
      const category = String(data.category ?? "").trim() || null;
      const unitPrice = toFloat(data.unit_price, null);
      const qty = toInt(data.quantity_in_stock, 0) ?? 0;
      const reorder = toInt(data.reorder_level, 10) ?? 10;
      const supplier = String(data.supplier ?? "").trim() || null;
      const description = String(data.description ?? "").trim() || null;
      const createdBy = String(data.created_by ?? "SYSTEM").trim() || "SYSTEM";
      if (!code || !name || unitPrice === null) {
        return fail(request, 400, "product_code, product_name, and unit_price are required");
      }
      try {
        const result = await env.DB.prepare(
          `INSERT INTO warehouse_products
             (product_code, product_name, category, unit_price, quantity_in_stock, reorder_level, supplier, description, status, created_by)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'active', ?9)`
        ).bind(code, name, category, unitPrice, qty, reorder, supplier, description, createdBy).run();
        const id = await d1FirstId(result);
        return jsonResponse(request, { success: true, product_id: id }, 201);
      } catch (e) {
        const msg = String(e?.message ?? e ?? "Failed to add product");
        const isUnique = /UNIQUE|constraint/i.test(msg);
        return fail(request, isUnique ? 400 : 500, isUnique ? "Product code already exists" : msg);
      }
    }
    {
      const m = url.pathname.match(/^\/api\/warehouse\/products\/(\d+)$/);
      if (m && request.method === "PUT") {
        const id = toInt(m[1], null);
        if (!id) return fail(request, 400, "Invalid product id");
        const data = await readJson(request);
        if (!data) return fail(request, 400, "Invalid JSON");
        const code = String(data.product_code ?? "").trim();
        const name = String(data.product_name ?? "").trim();
        const category = String(data.category ?? "").trim() || null;
        const unitPrice = toFloat(data.unit_price, null);
        const qty = toInt(data.quantity_in_stock, null);
        const reorder = toInt(data.reorder_level, null);
        const supplier = String(data.supplier ?? "").trim() || null;
        const description = String(data.description ?? "").trim() || null;
        const status = data.status ? String(data.status).trim() : null;
        if (!code || !name || unitPrice === null || qty === null || reorder === null) {
          return fail(request, 400, "product_code, product_name, unit_price, quantity_in_stock, reorder_level are required");
        }
        try {
          await env.DB.prepare(
            `UPDATE warehouse_products
               SET product_code=?1, product_name=?2, category=?3, unit_price=?4, quantity_in_stock=?5, reorder_level=?6,
                   supplier=?7, description=?8, status=COALESCE(?9, status), updated_at=CURRENT_TIMESTAMP
               WHERE id=?10`
          ).bind(code, name, category, unitPrice, qty, reorder, supplier, description, status, id).run();
          return ok(request, null, { message: "Product updated" });
        } catch (e) {
          return fail(request, 500, String(e?.message ?? e ?? "Failed to update product"));
        }
      }
    }
    if (url.pathname === "/api/warehouse/summary" && request.method === "GET") {
      const row = await env.DB.prepare(
        `SELECT
             COUNT(*) as total_products,
             COALESCE(SUM(quantity_in_stock), 0) as total_quantity,
             COALESCE(SUM(quantity_in_stock * unit_price), 0) as total_value,
             SUM(CASE WHEN quantity_in_stock <= reorder_level THEN 1 ELSE 0 END) as low_stock_count
           FROM warehouse_products
           WHERE status = 'active'`
      ).first();
      return ok(request, {
        total_products: row?.total_products ?? 0,
        total_quantity: row?.total_quantity ?? 0,
        total_value: row?.total_value ?? 0,
        low_stock_count: row?.low_stock_count ?? 0
      });
    }
    if (url.pathname === "/api/warehouse/inventory/history" && request.method === "GET") {
      const limit = Math.min(Math.max(toInt(url.searchParams.get("limit"), 50) ?? 50, 1), 200);
      const rs = await env.DB.prepare(
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
           ORDER BY h.created_at DESC
           LIMIT ?1`
      ).bind(limit).all();
      const tuples = (rs.results ?? []).map((r) => [
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
    async function warehouseAdjustStock(transactionType) {
      const data = await readJson(request);
      if (!data) return fail(request, 400, "Invalid JSON");
      const productId = toInt(data.product_id, null);
      const qty = toInt(data.quantity, null);
      const referenceNo = String(data.reference_no ?? "").trim() || null;
      const referenceType = String(data.reference_type ?? "repair-job").trim() || "repair-job";
      const notes = String(data.notes ?? "").trim() || null;
      const createdBy = String(data.created_by ?? "SYSTEM").trim() || "SYSTEM";
      if (!productId || !qty || qty <= 0) {
        return fail(request, 400, "product_id and quantity (>0) are required");
      }
      const product = await env.DB.prepare(`SELECT id, quantity_in_stock FROM warehouse_products WHERE id = ?1 LIMIT 1`).bind(productId).first();
      if (!product) return fail(request, 404, "Product not found");
      const prevQty = product.quantity_in_stock ?? 0;
      const newQty = transactionType === "in" ? prevQty + qty : prevQty - qty;
      if (newQty < 0) return fail(request, 400, "Insufficient stock");
      await env.DB.prepare(`UPDATE warehouse_products SET quantity_in_stock = ?1, updated_at=CURRENT_TIMESTAMP WHERE id = ?2`).bind(newQty, productId).run();
      await env.DB.prepare(
        `INSERT INTO warehouse_inventory_history
           (product_id, transaction_type, quantity, previous_quantity, new_quantity, reference_no, reference_type, notes, created_by)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      ).bind(productId, transactionType, qty, prevQty, newQty, referenceNo, referenceType, notes, createdBy).run();
      return ok(request, { product_id: productId, previous_quantity: prevQty, new_quantity: newQty });
    }
    __name(warehouseAdjustStock, "warehouseAdjustStock");
    if (url.pathname === "/api/warehouse/inventory/add" && request.method === "POST") {
      return warehouseAdjustStock("in");
    }
    if (url.pathname === "/api/warehouse/inventory/remove" && request.method === "POST") {
      return warehouseAdjustStock("out");
    }
    if (url.pathname === "/api/warehouse/picklists" && request.method === "GET") {
      return ok(request, []);
    }
    {
      const m = url.pathname.match(/^\/api\/warehouse\/picklists\/(\d+)\/complete$/);
      if (m && request.method === "PUT") {
        return ok(request, null, { message: "Picklist marked complete (stub)" });
      }
    }
    if (url.pathname === "/api/technician/resolve" && request.method === "POST") {
      const data = await readJson(request);
      const username = String(data?.username ?? "").trim();
      const name = String(data?.name ?? username).trim();
      if (!username) return fail(request, 400, "username is required");
      let technician = await env.DB.prepare(`SELECT id, name, employee_id FROM technicians WHERE employee_id = ?1 LIMIT 1`).bind(username).first();
      if (!technician) {
        const result = await env.DB.prepare(`INSERT INTO technicians (name, employee_id, status) VALUES (?1, ?2, 'active')`).bind(name || username, username).run();
        const id = await d1FirstId(result);
        technician = { id: Number(id), name: name || username, employee_id: username };
      }
      return ok(request, { technician_id: technician.id, name: technician.name, employee_id: technician.employee_id });
    }
    if (url.pathname === "/api/technician/jobs" && request.method === "GET") {
      const technicianId = toInt(url.searchParams.get("technician_id"), null);
      if (!technicianId) return fail(request, 400, "technician_id is required");
      const rs = await env.DB.prepare(
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
           WHERE ta.technician_id = ?1
           ORDER BY ta.assigned_at DESC, ta.id DESC`
      ).bind(technicianId).all();
      return ok(request, rs.results ?? []);
    }
    if (url.pathname === "/api/technician/clock-in" && request.method === "POST") {
      const data = await readJson(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, "assignment_id is required");
      await env.DB.prepare(
        `UPDATE technician_assignments
           SET status='in-progress', clock_in_time=COALESCE(clock_in_time, CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP
           WHERE id=?1`
      ).bind(assignmentId).run();
      return ok(request, null, { message: "Clock-in recorded" });
    }
    if (url.pathname === "/api/technician/clock-out" && request.method === "POST") {
      const data = await readJson(request);
      const assignmentId = toInt(data?.assignment_id, null);
      if (!assignmentId) return fail(request, 400, "assignment_id is required");
      await env.DB.prepare(
        `UPDATE technician_assignments
           SET status='completed', clock_out_time=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
           WHERE id=?1`
      ).bind(assignmentId).run();
      return ok(request, null, { message: "Clock-out recorded" });
    }
    {
      const m = url.pathname.match(/^\/api\/technician\/assignments\/(\d+)\/notes$/);
      if (m && request.method === "POST") {
        const assignmentId = toInt(m[1], null);
        if (!assignmentId) return fail(request, 400, "Invalid assignment id");
        const data = await readJson(request);
        const notes = String(data?.notes ?? "").trim();
        await env.DB.prepare(`UPDATE technician_assignments SET notes=?1, updated_at=CURRENT_TIMESTAMP WHERE id=?2`).bind(notes, assignmentId).run();
        return ok(request, null, { message: "Notes saved" });
      }
    }
    {
      const m = url.pathname.match(/^\/api\/technician\/service-orders\/(\d+)\/parts-request$/);
      if (m && request.method === "POST") {
        const serviceOrderId = parseInt(m[1]);
        const body = await request.json();
        if (!body.requested_parts || !Array.isArray(body.requested_parts) || body.requested_parts.length === 0) {
          return jsonResponse(request, { success: false, error: "No parts requested" }, 400);
        }
        const res1 = await env.DB.prepare(`
          INSERT INTO parts_requests (service_order_id, requested_by, requested_by_role, status, notes)
          VALUES (?, ?, 'technician', 'pending', ?)
        `).bind(serviceOrderId, body.technician_id || null, body.notes || "").run();
        if (!res1.success) {
          return jsonResponse(request, { success: false, error: "Failed to create parts request record" }, 500);
        }
        const requestId = res1.meta.last_row_id;
        const stmts = body.requested_parts.map(
          (p) => env.DB.prepare(`
                INSERT INTO parts_request_items (parts_request_id, product_id, quantity_requested, status)
                VALUES (?, ?, ?, 'pending')
            `).bind(requestId, p.product_id, p.quantity)
        );
        await env.DB.batch(stmts);
        return ok(request, {
          message: "Parts request submitted successfully",
          request_id: requestId,
          item_count: body.requested_parts.length
        });
      }
    }
    if (url.pathname === "/api/auth/admin/personnel-list" && request.method === "GET") {
      if (!isAdmin(request)) {
        return jsonResponse(request, { success: false, error: "Admin verification failed" }, 401);
      }
      const rs = await env.DB.prepare(
        `SELECT id, username, name, role, email, status, created_at
           FROM personnel
           ORDER BY created_at DESC`
      ).all();
      const personnel = (rs.results ?? []).map((r) => [
        r.id,
        r.username,
        r.name,
        r.role,
        r.email ?? "",
        r.status,
        r.created_at
      ]);
      return jsonResponse(request, { success: true, personnel, count: personnel.length });
    }
    if (url.pathname === "/api/auth/admin/register-personnel" && request.method === "POST") {
      if (!isAdmin(request)) {
        return jsonResponse(request, { success: false, error: "Admin verification failed" }, 401);
      }
      const data = await readJson(request);
      const username = String(data?.username ?? "").trim();
      const password = String(data?.password ?? "").trim();
      const name = String(data?.name ?? "").trim();
      const email = String(data?.email ?? "").trim();
      const role = normalizeRole(data?.role);
      if (!username || !password || !name || !role) {
        return jsonResponse(request, { success: false, error: "username, password, name, and role are required" }, 400);
      }
      if (!ALLOWED_ROLES.has(role) || role === "admin") {
        return jsonResponse(request, { success: false, error: "Invalid role" }, 400);
      }
      try {
        const result = await env.DB.prepare(
          `INSERT INTO personnel (username, password, name, role, email, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 'active')`
        ).bind(username, password, name, role, email).run();
        const lastId = result?.meta?.last_row_id ?? result?.meta?.lastRowId ?? null;
        if (role === "technician") {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO technicians (name, employee_id, email, status, hire_date, created_at)
               VALUES (?1, ?2, ?3, 'active', NULL, CURRENT_TIMESTAMP)`
          ).bind(name || username, username, email).run();
        }
        if (role === "advisor") {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO service_advisors (name, employee_id, contact_no, email, status, hire_date, created_at)
               VALUES (?1, ?2, NULL, ?3, 'active', NULL, CURRENT_TIMESTAMP)`
          ).bind(name || username, username, email).run();
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
      } catch (e) {
        const msg = String(e?.message ?? e ?? "Failed to register personnel");
        const isUnique = /UNIQUE|constraint/i.test(msg);
        return jsonResponse(request, { success: false, error: isUnique ? "Username already exists" : msg }, isUnique ? 400 : 500);
      }
    }
    return jsonResponse(request, { success: false, error: "Not found" }, 404);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
