/* Sarina Daftar Worker v4 — LWW lists, days reset, health lastDate clear */
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
    for (const tid of Object.keys(da.tasks || {})) {
      if (!(db.tasks && db.tasks[tid]) && da.tasks[tid]) tasks[tid] = da.tasks[tid];
    }
    for (const tid of Object.keys(db.tasks || {})) {
      tasks[tid] = db.tasks[tid];
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
    if (db._reset != null) out[k]._reset = db._reset;
    else if (da._reset != null) out[k]._reset = da._reset;
  }
  return out;
}

function preferList(nArr, oArr) {
  const n = Array.isArray(nArr) ? nArr : [];
  const o = Array.isArray(oArr) ? oArr : [];
  if (n.length === 0 && o.length > 0) return o;
  return n.length || !o.length ? n : o;
}

function mergeFamily(current, incoming) {
  current = current || {};
  incoming = incoming || {};
  const curAt = current._updatedAt || 0;
  const incAt = incoming._updatedAt || Date.now();
  const newer = incAt >= curAt ? incoming : current;
  const older = incAt >= curAt ? current : incoming;

  const incReset = (incoming._daysResetAt && incoming._daysResetAt._all) || 0;
  const curReset = (current._daysResetAt && current._daysResetAt._all) || 0;
  let daysMerged;
  if (incReset > curReset) {
    daysMerged = incoming.days && typeof incoming.days === 'object' ? incoming.days : {};
  } else {
    daysMerged = mergeDays(older.days, newer.days);
  }

  let healthMerged = preferList(newer.healthItems, older.healthItems);
  try {
    if (Array.isArray(newer.healthItems) && Array.isArray(older.healthItems) && newer.healthItems.length) {
      const byId = {};
      older.healthItems.forEach(function (it) { if (it && it.id) byId[it.id] = it; });
      healthMerged = newer.healthItems.map(function (it) {
        if (!it || !it.id) return it;
        const o = byId[it.id];
        if (it.lastDate === '' || it.lastDate == null) return Object.assign({}, o || {}, it, { lastDate: '' });
        return Object.assign({}, o || {}, it);
      });
    }
  } catch (e) {}

  const merged = {
    name: newer.name != null ? newer.name : older.name,
    tasks: preferList(newer.tasks, older.tasks),
    days: daysMerged,
    rewards: preferList(newer.rewards, older.rewards),
    claims: preferList(newer.claims, older.claims),
    goal: newer.goal != null ? newer.goal : older.goal,
    parentTasks: preferList(newer.parentTasks, older.parentTasks),
    parentPin: newer.parentPin || older.parentPin || '1234',
    posBehaviors: preferList(newer.posBehaviors, older.posBehaviors),
    negBehaviors: preferList(newer.negBehaviors, older.negBehaviors),
    streak: newer.streak != null ? newer.streak : older.streak,
    lastActive: newer.lastActive || older.lastActive || '',
    pendingChanges: preferList(newer.pendingChanges, older.pendingChanges),
    healthItems: healthMerged,
    play: newer.play || older.play || {},
    theme: newer.theme || older.theme || 'unicorn',
    _daysResetAt: Object.assign({}, current._daysResetAt || {}, incoming._daysResetAt || {}),
    _updatedAt: Math.max(curAt, incAt, Date.now()),
    _device: incoming._device || current._device || '',
  };

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
      return jsonResponse({ ok: true, service: 'sarina-daftar', v: 4 });
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
