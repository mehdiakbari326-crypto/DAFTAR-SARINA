/**
 * Sarina Daftar — Cloudflare Worker + KV
 * Binding required: KV namespace bind name = SARINA_KV
 *
 * Routes:
 *   GET  /family/sarina  → read JSON
 *   PUT  /family/sarina  → replace JSON
 *   PATCH /family/sarina → shallow merge JSON
 *   OPTIONS → CORS
 */
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
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(),
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    // health check
    if (path === '/' || path === '/health') {
      return jsonResponse({ ok: true, service: 'sarina-daftar' });
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

      if (request.method === 'PUT') {
        const body = await request.json();
        body._updatedAt = Date.now();
        await env.SARINA_KV.put(KEY, JSON.stringify(body));
        return jsonResponse(body);
      }

      if (request.method === 'PATCH') {
        const patch = await request.json();
        const raw = await env.SARINA_KV.get(KEY);
        let current = {};
        try { current = raw ? JSON.parse(raw) : {}; } catch (e) { current = {}; }
        // shallow merge top-level keys
        const merged = Object.assign({}, current, patch, { _updatedAt: Date.now() });
        await env.SARINA_KV.put(KEY, JSON.stringify(merged));
        return jsonResponse(merged);
      }

      return jsonResponse({ error: 'method not allowed' }, 405);
    } catch (err) {
      return jsonResponse({ error: String(err && err.message || err) }, 500);
    }
  },
};
