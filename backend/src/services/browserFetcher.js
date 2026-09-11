/**
 * Crawlbit — Headless Browser Rendering Service (Puppeteer)
 * Handles JavaScript execution, dynamic SPA hydration, and WAF/JS challenges.
 */

const fs = require('fs');
const puppeteer = require('puppeteer-core');

const CHROME_EXECUTABLE_PATHS = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function getChromeExecutablePath() {
  for (const p of CHROME_EXECUTABLE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let browserInstance = null;

async function getBrowser(customProxy = null) {
  const executablePath = getChromeExecutablePath();
  if (!executablePath) {
    throw new Error('Chromium/Chrome binary not found on the system. Please install chromium or set CHROME_PATH.');
  }

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled',
    '--window-size=1920,1080',
  ];

  if (customProxy) {
    args.push(`--proxy-server=${customProxy}`);
  }

  return await puppeteer.launch({
    executablePath,
    headless: 'new',
    args,
  });
}

async function renderPageWithBrowser(url, options = {}) {
  const {
    mobile = false,
    auth = null,
    headers = {},
    customProxy = null,
    timeoutMs = 30000,
    waitForSelector = null,
  } = options;

  let browser = null;
  let page = null;

  try {
    browser = await getBrowser(customProxy);
    page = await browser.newPage();

    // Stealth overrides
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });

    const ua = mobile
      ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'
      : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    await page.setUserAgent(ua);
    await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true } : { width: 1920, height: 1080 });

    if (headers && Object.keys(headers).length) {
      await page.setExtraHTTPHeaders(headers);
    }

    if (auth && auth.username && auth.password) {
      await page.authenticate({ username: auth.username, password: auth.password });
    }

    // Navigate to page
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: timeoutMs,
    });

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 5000 });
      } catch (_) {}
    }

    // Additional brief pause for Cloudflare JS challenge execution if needed
    const pageTitle = await page.title();
    if (pageTitle.includes('Just a moment') || pageTitle.includes('Attention Required')) {
      await new Promise(r => setTimeout(r, 4000));
    }

    const html = await page.content();
    const finalUrl = page.url() || url;
    const status = response ? response.status() : 200;
    const buffer = Buffer.from(html, 'utf8');

    return {
      buffer,
      status: (status >= 200 && status < 400) ? 200 : status,
      contentType: 'text/html; charset=utf-8',
      url: finalUrl,
      renderedWithBrowser: true,
    };
  } catch (err) {
    throw err;
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
    if (browser) {
      try { await browser.close(); } catch (_) {}
    }
  }
}

module.exports = {
  renderPageWithBrowser,
  getChromeExecutablePath,
};
