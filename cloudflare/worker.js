/* Sarina Daftar Worker v5 — LWW claims (empty wins), days reset, health lastDate */
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
    const tasks = Object.assign({}, da.tasks || {}, db.tasks || {});
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
    const behaviors = Object.assign({}, da.behaviors || {}, db.behaviors || {});
    out[k] = { tasks, notes };
    if (weight != null) out[k].weight = weight;
    if (Object.keys(behaviors).length) out[k].behaviors = behaviors;
  }
  return out;
}

function preferList(nArr, oArr, allowEmpty) {
  const n = Array.isArray(nArr) ? nArr : [];
  const o = Array.isArray(oArr) ? oArr : [];
  if (allowEmpty) return n;
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
  const incomingIsNewer = incAt >= curAt;

  const incReset = (incoming._daysResetAt && incoming._daysResetAt._all) || 0;
  const curReset = (current._daysResetAt && current._daysResetAt._all) || 0;
  let daysMerged;
  if (incReset > curReset) {
    daysMerged = incoming.days && typeof incoming.days === 'object' ? incoming.days : {};
  } else if (curReset > incReset) {
    daysMerged = current.days && typeof current.days === 'object' ? current.days : {};
  } else {
    daysMerged = mergeDays(current.days || {}, incoming.days || {});
  }

  let claimsMerged;
  const incClaimReset = incoming._claimsResetAt || 0;
  const curClaimReset = current._claimsResetAt || 0;
  if (incClaimReset > curClaimReset) {
    claimsMerged = Array.isArray(incoming.claims) ? incoming.claims : [];
  } else if (curClaimReset > incClaimReset) {
    claimsMerged = Array.isArray(current.claims) ? current.claims : [];
  } else {
    claimsMerged = Array.isArray(newer.claims) ? newer.claims : (Array.isArray(older.claims) ? older.claims : []);
  }

  let healthMerged = preferList(newer.healthItems, older.healthItems, incomingIsNewer && Array.isArray(incoming.healthItems));
  if (Array.isArray(incoming.healthItems) && incomingIsNewer) {
    healthMerged = incoming.healthItems;
  }

  const merged = {
    name: newer.name || older.name || 'سارینا',
    tasks: preferList(newer.tasks, older.tasks, false),
    days: daysMerged,
    rewards: preferList(newer.rewards, older.rewards, false),
    claims: claimsMerged,
    goal: newer.goal != null ? newer.goal : older.goal,
    parentTasks: preferList(newer.parentTasks, older.parentTasks, false),
    parentPin: newer.parentPin || older.parentPin || '1234',
    posBehaviors: preferList(newer.posBehaviors, older.posBehaviors, false),
    negBehaviors: preferList(newer.negBehaviors, older.negBehaviors, false),
    streak: newer.streak != null ? newer.streak : (older.streak || 0),
    lastActive: newer.lastActive || older.lastActive || '',
    pendingChanges: preferList(newer.pendingChanges, older.pendingChanges, incomingIsNewer),
    healthItems: healthMerged,
    play: newer.play || older.play || {},
    theme: newer.theme || older.theme || 'unicorn',
    _daysResetAt: Object.assign({}, current._daysResetAt || {}, incoming._daysResetAt || {}),
    _claimsResetAt: Math.max(curClaimReset, incClaimReset, 0) || undefined,
    _updatedAt: Math.max(curAt, incAt, Date.now()),
    _device: incoming._device || current._device || '',
  };

  try {
    const map = {};
    for (const p of [...(older.pendingChanges || []), ...(newer.pendingChanges || [])]) {
      if (p && p.id) map[p.id] = p;
    }
    if (incomingIsNewer && Array.isArray(incoming.pendingChanges) && incoming.pendingChanges.length === 0) {
      merged.pendingChanges = [];
    } else {
      merged.pendingChanges = Object.values(map);
    }
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
      return jsonResponse({ ok: true, service: 'sarina-daftar', v: 5 });
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
