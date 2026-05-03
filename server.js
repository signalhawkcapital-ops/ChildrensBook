// ==========================================
// StorySpark — Web Service entry point
// Serves the static site + provides an API
// endpoint for future LLM-powered generation.
// ==========================================

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's proxy (for correct req.ip, https detection, etc.)
app.set('trust proxy', 1);

// Parse JSON bodies for the API
app.use(express.json({ limit: '64kb' }));

// Health check — Render pings this to confirm the service is alive
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API endpoint stub — replace the body with a real LLM call
// when you're ready to upgrade from template generation.
// See docs/PRODUCT_ROADMAP.md for the full plan.
app.post('/api/generate', async (req, res) => {
  try {
    const { heroName, theme, outcome } = req.body || {};

    if (!heroName || !theme || !outcome) {
      return res.status(400).json({
        error: 'Missing required fields: heroName, theme, outcome'
      });
    }

    // For now: the client-side template engine (app.js) handles generation.
    // This endpoint is reserved for V2 (real LLM text generation).
    // When ready, call Anthropic's API here and return { title, pages: [...] }.
    return res.status(200).json({
      message: 'Server is running. Client-side generator is active.',
      received: { heroName, theme, outcome }
    });
  } catch (err) {
    console.error('Generate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files from the project root
// (index.html, styles.css, app.js)
app.use(express.static(path.join(__dirname), {
  maxAge: '1h',
  extensions: ['html']
}));

// Fallback: any unmatched route returns index.html
// (handy for future client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`StorySpark running on port ${PORT}`);
});
