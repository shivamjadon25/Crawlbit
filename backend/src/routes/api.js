/**
 * Crawlbit — API Router
 */

const express = require('express');
const router = express.Router();
const { batchScrape } = require('../services/scraperService');
const { performCrawl } = require('../services/crawlerService');

// Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'crawlbit-backend',
    version: '2.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Scrape Endpoint
router.post('/scrape', async (req, res) => {
  try {
    const { url, urls, ...settings } = req.body;
    const targetUrls = urls || (url ? [url] : []);

    if (!targetUrls.length) {
      return res.status(400).json({
        success: false,
        error: 'No target URLs provided. Please provide "url" or "urls" array.',
      });
    }

    const concurrency = Math.min(parseInt(req.body.concurrency, 10) || 5, 15);
    const results = await batchScrape(targetUrls, settings, concurrency);

    return res.json({
      success: true,
      count: results.length,
      data: results.map(r => r.data || r),
      rawResults: results,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Scraping process encountered an error',
    });
  }
});

// Crawl Endpoint
router.post('/crawl', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Seed URL is required for crawling',
      });
    }

    const crawlResult = await performCrawl(req.body);

    return res.json({
      success: true,
      data: crawlResult,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Crawling process encountered an error',
    });
  }
});

// Test Auth Endpoint (for verifying basic auth capabilities)
router.get('/test-auth', (req, res) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [user, pass] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (user === 'admin' && pass === 'password') {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Crawlbit Protected Area</title></head>
        <body>
          <h1>Authenticated Content</h1>
          <p>Success! You accessed this page with basic authentication credentials.</p>
          <a href="/test-auth/subpage">Subpage Link</a>
        </body>
      </html>
    `);
  }

  res.set('WWW-Authenticate', 'Basic realm="Crawlbit Secured Area"');
  return res.status(401).send('Authentication required.');
});

module.exports = router;
