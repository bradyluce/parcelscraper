const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for webhook payload
let latestPayload = {};

// Middleware
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Webhook endpoints
app.post('/api/webhook-response', (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
    latestPayload = req.body || {};
    console.log('Stored webhook payload');
    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/webhook-response error:', err);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

app.get('/api/webhook-response', (_req, res) => {
  try {
    return res.json(latestPayload || {});
  } catch (err) {
    console.error('GET /api/webhook-response error:', err);
    return res.status(500).json({ error: 'Failed to retrieve payload' });
  }
});

app.delete('/api/webhook-response', (_req, res) => {
  try {
    latestPayload = {};
    console.log('Cleared webhook payload');
    return res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/webhook-response error:', err);
    return res.status(500).json({ error: 'Failed to clear payload' });
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

