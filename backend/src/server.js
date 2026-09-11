/**
 * Crawlbit — Backend Server
 * High-Performance Stealth Web Crawler & Scraper Engine
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Mount API routes under /api and root level for versatility
app.use('/api', apiRoutes);
app.use('/', apiRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Crawlbit Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
┌───────────────────────────────────────────────┐
│              🕷️  CRAWLBIT BACKEND            │
│   Stealth Web Crawler & Document Scraper API  │
├───────────────────────────────────────────────┤
│  ⚡ Server running on: http://0.0.0.0:${PORT}   │
│  📊 Healthcheck:       http://localhost:${PORT}/api/health
│  🔍 Scrape Endpoint:   POST /api/scrape       │
│  🕸️ Crawl Endpoint:    POST /api/crawl        │
└───────────────────────────────────────────────┘
  `);
});

module.exports = app;
