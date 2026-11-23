/* Sarina Daftar Worker — server-side merge, anti-stale overwrite */
const KEY = 'family/sarina';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Accept',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders() });
}

function mergeDays(a, b) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const da = (a && a[k]) || {};
    const db = (b && b[k]) || {};
    const tasks = { ...(da.tasks || {}), ...(db.tasks || {}) };
    // last status wins if both set — prefer explicit incoming (b) over a when both present
    for (const tid of Object.keys(da.tasks || {})) {
      if (!(db.tasks && db.tasks[tid]) && da.tasks[tid]) tasks[tid] = da.tasks[tid];
    }
    for (const tid of Object.keys(db.tasks || {})) {
      tasks[tid] = db.tasks[tid]; // b wins on conflict
    }
    const seen = new Set();
    const notes = [];
    for (const n of [...(da.notes || []), ...(db.notes || [])]) {
      if (n && n.id) {
        if (seen.has(n.id)) continue;
        seen.add(n.id);
      }
      notes.push(n);
    }
    const weight = db.weight != null ? db.weight : da.weight;
    const behaviors = { ...(da.behaviors || {}), ...(db.behaviors || {}) };
    out[k] = { tasks, notes };
    if (weight != null) out[k].weight = weight;
    if (Object.keys(behaviors).length) out[k].behaviors = behaviors;
  }
  return out;
}

function pickLonger(a, b) {
  const aa = Array.isArray(a) ? a : [];
  const bb = Array.isArray(b) ? b : [];
  return bb.length >= aa.length ? bb : aa;
}

function mergeFamily(current, incoming) {
  current = current || {};
  incoming = incoming || {};
  const curAt = current._updatedAt || 0;
  const incAt = incoming._updatedAt || Date.now();

  // Base: newer top-level scalar wins; arrays: longer wins; days: deep merge
  const newer = incAt >= curAt ? incoming : current;
  const older = incAt >= curAt ? current : incoming;

  const merged = {
    name: newer.name != null ? newer.name : older.name,
    tasks: pickLonger(older.tasks, newer.tasks),
    days: mergeDays(older.days, newer.days),
    rewards: pickLonger(older.rewards, newer.rewards),
    claims: pickLonger(older.claims, newer.claims),
    goal: newer.goal != null ? newer.goal : older.goal,
    parentTasks: pickLonger(older.parentTasks, newer.parentTasks),
    parentPin: newer.parentPin || older.parentPin || '1234',
    posBehaviors: pickLonger(older.posBehaviors, newer.posBehaviors),
    negBehaviors: pickLonger(older.negBehaviors, newer.negBehaviors),
    streak: newer.streak != null ? newer.streak : older.streak,
    lastActive: newer.lastActive || older.lastActive || '',
    pendingChanges: pickLonger(older.pendingChanges, newer.pendingChanges),
    healthItems: pickLonger(older.healthItems, newer.healthItems),
    play: newer.play || older.play || {},
    _updatedAt: Math.max(curAt, incAt, Date.now()),
    _device: incoming._device || current._device || '',
  };

  // pending: union by id
  try {
    const map = {};
    for (const p of [...(older.pendingChanges || []), ...(newer.pendingChanges || [])]) {
      if (p && p.id) map[p.id] = p;
    }
    merged.pendingChanges = Object.values(map);
  } catch (e) {}

  return merged;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (path === '/' || path === '/health') {
      return jsonResponse({ ok: true, service: 'sarina-daftar', v: 2 });
    }

    if (path !== '/family/sarina') {
      return jsonResponse({ error: 'not found' }, 404);
    }

    if (!env.SARINA_KV) {
      return jsonResponse({ error: 'KV not bound' }, 500);
    }

    try {
      if (request.method === 'GET') {
        const raw = await env.SARINA_KV.get(KEY);
        if (!raw) return jsonResponse(null);
        return new Response(raw, { status: 200, headers: corsHeaders() });
      }

      if (request.method === 'PUT' || request.method === 'PATCH') {
        const incoming = await request.json();
        const raw = await env.SARINA_KV.get(KEY);
        let current = {};
        try { current = raw ? JSON.parse(raw) : {}; } catch (e) { current = {}; }

        // Always server-merge so a stale phone cannot wipe fresher marks
        const merged = mergeFamily(current, incoming);
        merged._updatedAt = Date.now();
        await env.SARINA_KV.put(KEY, JSON.stringify(merged));
        return jsonResponse(merged);
      }

      return jsonResponse({ error: 'method not allowed' }, 405);
    } catch (err) {
      return jsonResponse({ error: String(err && err.message || err) }, 500);
    }
  },
};
