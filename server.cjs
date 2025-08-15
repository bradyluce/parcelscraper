const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for the most recent payload
let latestPropertyData = null;

// JSON + CORS
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// API: POST to receive data from Lindy; GET to let the SPA poll
app.post('/api/webhook-response', (req, res) => {
  try {
    console.log('Received property data keys:', Object.keys(req.body || {}));
    latestPropertyData = req.body || {};
    return res.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

app.get('/api/webhook-response', (_req, res) => {
  return res.json(latestPropertyData || {});
});

// Serve built SPA (Vite outputs to /dist)
const dist = path.join(__dirname, 'dist');
app.use(express.static(dist));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Server listening on :${PORT}`));