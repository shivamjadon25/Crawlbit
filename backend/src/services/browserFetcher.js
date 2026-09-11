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

    // Advanced Stealth Injections
    await page.evaluateOnNewDocument(() => {
      // 1. Pass Webdriver Test
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

      // 2. Mock Chrome Runtime & App
      window.chrome = {
        app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
        runtime: {
          OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
          OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
          PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformNaclArch: { ARM: 'arm', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
          PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
          RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' }
        },
        csi: () => {},
        loadTimes: () => {}
      };

      // 3. Mock Plugins
      const makePlugin = (name, filename, description) => ({
        description,
        filename,
        name,
        length: 1,
        0: { type: 'application/pdf', suffixes: 'pdf', description: '' }
      });
      const pluginData = [
        makePlugin('PDF Viewer', 'internal-pdf-viewer', 'Portable Document Format'),
        makePlugin('Chrome PDF Viewer', 'internal-pdf-viewer', 'Portable Document Format'),
        makePlugin('Chromium PDF Viewer', 'internal-pdf-viewer', 'Portable Document Format')
      ];
      Object.defineProperty(navigator, 'plugins', {
        get: () => Object.assign(pluginData, { item: (i) => pluginData[i], namedItem: (n) => pluginData.find(p => p.name === n), length: 3 })
      });

      // 4. Mock Languages & Hardware
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });

      // 5. Spoof WebGL Vendor/Renderer
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return 'Google Inc. (NVIDIA)';
        if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return getParameter.apply(this, arguments);
      };

      // 6. Fix Permissions Query
      const origQuery = window.navigator.permissions && window.navigator.permissions.query;
      if (origQuery) {
        window.navigator.permissions.query = (parameters) =>
          parameters.name === 'notifications'
            ? Promise.resolve({ state: Notification.permission })
            : origQuery(parameters);
      }
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

    // Active Cloudflare Challenge / Turnstile Resolver Loop
    let attempts = 0;
    while (attempts < 6) {
      const currentTitle = (await page.title()) || '';
      const isCf = currentTitle.includes('Just a moment') ||
                   currentTitle.includes('Attention Required') ||
                   currentTitle.includes('Cloudflare');

      if (!isCf) break;

      // Attempt Turnstile interaction if iframe exists
      try {
        const frames = page.frames();
        for (const frame of frames) {
          if (frame.url().includes('challenges.cloudflare.com') || frame.url().includes('turnstile')) {
            const checkbox = await frame.$('input[type="checkbox"], .cf-turnstile-wrapper, #challenge-stage');
            if (checkbox) {
              const box = await checkbox.boundingBox();
              if (box) {
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
                await page.mouse.down();
                await new Promise(r => setTimeout(r, 120));
                await page.mouse.up();
              }
            }
          }
        }
      } catch (_) {}

      await new Promise(r => setTimeout(r, 2000));
      attempts++;
    }

    const html = await page.content();
    const finalUrl = page.url() || url;
    const currentTitle = (await page.title()) || '';
    const status = response ? response.status() : 200;
    const buffer = Buffer.from(html, 'utf8');

    const isWafStillActive = currentTitle.includes('Just a moment') ||
      html.includes('id="challenge-error-text"') ||
      html.includes('Enable JavaScript and cookies to continue');

    return {
      buffer,
      status: isWafStillActive ? 403 : ((status >= 200 && status < 400) ? 200 : status),
      contentType: 'text/html; charset=utf-8',
      url: finalUrl,
      renderedWithBrowser: true,
      isWafChallenge: isWafStillActive,
      wafType: isWafStillActive ? 'Cloudflare Turnstile / Managed Challenge' : null,
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
