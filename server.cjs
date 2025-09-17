const express = require('express');
const path = require('path');
const cors = require('cors');
const os = require('os');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory data store with persistence
let latestPropertyData = null;
let history = [];
const STORE = os.tmpdir() + '/property-history.json';

// Request-scoped inbox (not persisted)
const inbox = new Map(); // requestId -> { payload, receivedAt }
const INBOX_TTL_MS = 60 * 60 * 1000; // 1 hour
function putInbox(id, payload) {
  inbox.set(id, { payload, receivedAt: Date.now() });
}
function getInbox(id) {
  const v = inbox.get(id);
  return v ? v.payload : null;
}
function clearInbox(id) {
  inbox.delete(id);
}
setInterval(() => {
  const now = Date.now();
  for (const [id, v] of inbox) {
    if (now - v.receivedAt > INBOX_TTL_MS) inbox.delete(id);
  }
}, 300000);

function save() {
  try {
    fs.writeFileSync(STORE, JSON.stringify({ latestPropertyData, history }));
  } catch {}
}
function load() {
  try {
    const raw = fs.readFileSync(STORE, 'utf8');
    const parsed = JSON.parse(raw);
    latestPropertyData = parsed.latestPropertyData ?? null;
    history = Array.isArray(parsed.history) ? parsed.history : [];
  } catch {}
}
load();

function json(res, body, status = 200) {
  res
    .status(status)
    .set('Content-Type', 'application/json')
    .set('Cache-Control', 'no-store, no-cache, must-revalidate')
    .send(JSON.stringify(body));
}

// Middleware
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => json(res, { status: 'ok' }));

// Helpers
function buildSummary(body) {
  const address = body.address || body.property_basics?.address || body.input?.address;
  const owner = body.owner_information?.owner_name;
  const parcel =
    body.parcelId ||
    body.property_basics?.parcel_id ||
    body.input?.parcelId ||
    body.listingData?.PropertyInformation?.parcelId;
  const value = body.assessed_value_info?.current_assessed_value || body.assessed_value_info?.total_value || body.assessed || body.total_value;
  const first = address || owner || parcel || 'Parcel';
  const second = value || 'no value';
  return `${first} – ${second}`;
}

// Webhook endpoints
app.post('/api/webhook-response', (req, res) => {
  try {
    if (!req.is('application/json')) {
      return json(res, { error: 'Content-Type must be application/json' }, 415);
    }
    const body = req.body || {};
    body._receivedAt = Date.now();
    const requestId = typeof body.requestId === 'string' ? body.requestId : null;
    if (requestId) putInbox(requestId, body);

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      createdAt: Date.now(),
      requestId,
      parcelId:
        body.parcelId ||
        body.property_basics?.parcel_id ||
        body.input?.parcelId ||
        body.listingData?.PropertyInformation?.parcelId ||
        null,
      county: body.county || body.property_basics?.county || body.input?.county || null,
      state: body.state || body.property_basics?.state || body.input?.state || null,
      summary: buildSummary(body),
      payload: body,
    };

    latestPropertyData = body;

    if (requestId) {
      const existingIdx = history.findIndex(entry => entry.requestId === requestId);
      if (existingIdx !== -1) {
        const existing = history.splice(existingIdx, 1)[0];
        const updated = {
          ...existing,
          ...item,
          id: existing.id,
          createdAt: existing.createdAt,
        };
        history.unshift(updated);
      } else {
        history.unshift(item);
      }
    } else {
      history.unshift(item);
    }

    if (history.length > 100) history = history.slice(0, 100);
    save();

    const size = Buffer.byteLength(JSON.stringify(body));
    console.log(`Stored webhook payload (${size} bytes)`);

    return json(res, { ok: true, id: item.id });
  } catch (err) {
    console.error('POST /api/webhook-response error:', err);
    return json(res, { error: 'Failed to process webhook' }, 500);
  }
});

app.get('/api/webhook-response', (req, res) => {
  try {
    const requestId = typeof req.query.requestId === 'string' ? req.query.requestId : null;
    if (requestId) {
      return json(res, getInbox(requestId) || {});
    }
    return json(res, {});
  } catch (err) {
    console.error('GET /api/webhook-response error:', err);
    return json(res, { error: 'Failed to retrieve payload' }, 500);
  }
});

app.delete('/api/webhook-response', (req, res) => {
  try {
    const requestId = typeof req.query.requestId === 'string' ? req.query.requestId : null;
    if (requestId) {
      clearInbox(requestId);
      return json(res, { ok: true });
    }
    latestPropertyData = null;
    save();
    return json(res, { ok: true });
  } catch (err) {
    console.error('DELETE /api/webhook-response error:', err);
    return json(res, { error: 'Failed to clear payload' }, 500);
  }
});

// History endpoints
app.get('/api/history', (_req, res) => {
  try {
    const list = history.map(({ payload, ...rest }) => rest);
    return json(res, list);
  } catch (err) {
    console.error('GET /api/history error:', err);
    return json(res, { error: 'Failed to retrieve history' }, 500);
  }
});

app.get('/api/history/:id', (req, res) => {
  try {
    const item = history.find(h => h.id === req.params.id);
    if (!item) return json(res, { error: 'Not found' }, 404);
    return json(res, item);
  } catch (err) {
    console.error('GET /api/history/:id error:', err);
    return json(res, { error: 'Failed to retrieve item' }, 500);
  }
});

app.delete('/api/history/:id', (req, res) => {
  try {
    const idx = history.findIndex(h => h.id === req.params.id);
    if (idx === -1) return json(res, { error: 'Not found' }, 404);
    history.splice(idx, 1);
    save();
    return json(res, { ok: true });
  } catch (err) {
    console.error('DELETE /api/history/:id error:', err);
    return json(res, { error: 'Failed to delete item' }, 500);
  }
});

// Serve SPA
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on :${PORT}`);
});
