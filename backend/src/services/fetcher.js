/**
 * Crawlbit — Stealth Fetcher Service with Automatic Headless Browser JS Rendering
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { renderPageWithBrowser, getChromeExecutablePath } = require('./browserFetcher');

const execPromise = util.promisify(exec);

const FREE_PROXIES = [
  { host: '8.219.97.248', port: 80, protocol: 'http' },
  { host: '47.91.45.198', port: 80, protocol: 'http' },
  { host: '103.149.162.195', port: 80, protocol: 'http' },
];

let proxyIndex = 0;
const getNextProxy = () => FREE_PROXIES[proxyIndex++ % FREE_PROXIES.length];

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';

function buildCurlCommand(url, options = {}, files = {}, activeProxy = null) {
  const { mobile = false, auth = null, headers = {} } = options;
  const { cookieFile, bodyFile } = files;

  let proxyStr = '';
  if (activeProxy) {
    if (typeof activeProxy === 'string') {
      proxyStr = `--proxy "${activeProxy.replace(/"/g, '\\"')}"`;
    } else if (activeProxy.host && activeProxy.port) {
      proxyStr = `--proxy "${activeProxy.protocol || 'http'}://${activeProxy.host}:${activeProxy.port}"`;
    }
  }

  const cookieArg = cookieFile ? `-b "${cookieFile}" -c "${cookieFile}"` : '';
  const authArg = auth && auth.username && auth.password ? `-u "${auth.username.replace(/"/g, '\\"')}:${auth.password.replace(/"/g, '\\"')}"` : '';
  
  let baseHeaders = [];
  if (mobile) {
    baseHeaders = [
      `-H "User-Agent: ${MOBILE_UA}"`,
      `-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"`,
      `-H "Accept-Language: en-US,en;q=0.9"`,
      `-H "Sec-Fetch-Dest: document"`,
      `-H "Sec-Fetch-Mode: navigate"`,
      `-H "Sec-Fetch-Site: none"`,
      `-H "Upgrade-Insecure-Requests: 1"`,
    ];
  } else {
    baseHeaders = [
      `-H "User-Agent: ${DESKTOP_UA}"`,
      `-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"`,
      `-H "Accept-Language: en-US,en;q=0.9"`,
      `-H "Sec-Ch-Ua: \\"Chromium\\";v=\\"124\\", \\"Google Chrome\\";v=\\"124\\", \\"Not-A.Brand\\";v=\\"99\\""`,
      `-H "Sec-Ch-Ua-Mobile: ?0"`,
      `-H "Sec-Ch-Ua-Platform: \\"Windows\\""`,
      `-H "Sec-Fetch-Dest: document"`,
      `-H "Sec-Fetch-Mode: navigate"`,
      `-H "Sec-Fetch-Site: none"`,
      `-H "Sec-Fetch-User: ?1"`,
      `-H "Upgrade-Insecure-Requests: 1"`,
    ];
  }

  let userHeaderArgs = [];
  if (headers && typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers)) {
      if (k && v !== undefined && v !== null) {
        userHeaderArgs.push(`-H "${k.replace(/"/g, '\\"')}: ${String(v).replace(/"/g, '\\"')}"`);
      }
    }
  }

  const allHeadersStr = [...baseHeaders, ...userHeaderArgs].join(' ');
  const timeoutArgs = activeProxy ? '--connect-timeout 6 --max-time 15' : '--connect-timeout 10 --max-time 30';

  return `curl -L -s -k ${timeoutArgs} --http2 -w "\\nStatusCode:%{http_code}\\nContentType:%{content_type}" ` +
    `${cookieArg} ${proxyStr} ${authArg} ${allHeadersStr} ` +
    `--compressed "${url.replace(/"/g, '\\"')}" -o "${bodyFile}"`;
}

async function singleAttemptFetch(url, options = {}, files = {}, proxyTarget = null) {
  const cmd = buildCurlCommand(url, options, files, proxyTarget);
  const { stdout, stderr } = await execPromise(cmd);

  const meta = stdout.trim();
  const statusMatch = meta.match(/StatusCode:(\d+)/);
  const typeMatch = meta.match(/ContentType:([^\n\r]*)/i);

  const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
  const contentType = typeMatch ? typeMatch[1].trim().toLowerCase() : '';

  if (!fs.existsSync(files.bodyFile)) {
    throw new Error(`Fetch Error: Content not received. ${stderr || ''}`);
  }

  const buffer = fs.readFileSync(files.bodyFile);
  return { buffer, status, contentType, url, usedProxy: !!proxyTarget };
}

async function powerFetch(url, options = {}) {
  const { renderJs = false, useBrowser = false, proxyMode = 'none', customProxy = null, proxyUrl = null } = options;

  // 1. Explicit Headless Browser Rendering
  if (renderJs || useBrowser) {
    const hasChrome = getChromeExecutablePath();
    if (hasChrome) {
      try {
        return await renderPageWithBrowser(url, options);
      } catch (browserErr) {
        console.warn(`[Browser Warning] Headless browser failed for ${url} (${browserErr.message}), falling back to stealth cURL...`);
      }
    }
  }

  // 2. High-Speed Stealth cURL Engine
  const reqId = crypto.randomBytes(6).toString('hex');
  const cookieFile = path.join(os.tmpdir(), `cb-cookie-${Date.now()}-${reqId}.txt`);
  const bodyFile = path.join(os.tmpdir(), `cb-body-${Date.now()}-${reqId}.bin`);
  const files = { cookieFile, bodyFile };

  const effectiveProxy = customProxy || proxyUrl || (proxyMode === 'auto' || proxyMode === 'force' ? getNextProxy() : null);

  try {
    let result = null;

    if (effectiveProxy) {
      try {
        result = await singleAttemptFetch(url, options, files, effectiveProxy);
        if (result.status >= 200 && result.status < 400) {
          return result;
        }
        if (proxyMode !== 'force') {
          result = await singleAttemptFetch(url, options, files, null);
        }
      } catch (proxyErr) {
        if (proxyMode === 'force') throw proxyErr;
        result = await singleAttemptFetch(url, options, files, null);
      }
    } else {
      result = await singleAttemptFetch(url, options, files, null);
    }

    const { status, buffer, contentType } = result;

    if (status === 401) {
      throw new Error(`401 Unauthorized: Authentication required or invalid credentials for ${url}`);
    }
    if (status === 404) {
      throw new Error(`404 Not Found: Resource does not exist at ${url}`);
    }

    // 3. Automatic Headless Browser Fallback on Cloudflare/WAF Challenges
    if (status === 403 || status === 429 || status === 503) {
      const htmlText = buffer.toString('utf8');
      const isChallenge = htmlText.includes('challenges.cloudflare.com') ||
        htmlText.includes('cf-mitigated') ||
        htmlText.includes('<title>Just a moment...</title>') ||
        htmlText.includes('Enable JavaScript and cookies to continue');

      if (isChallenge && getChromeExecutablePath()) {
        console.log(`[WAF Challenge Detected] ${url} is protected by JavaScript challenge. Automatically launching Headless Browser...`);
        try {
          const browserResult = await renderPageWithBrowser(url, options);
          return browserResult;
        } catch (bErr) {
          console.warn(`[Browser Fallback Failed] ${bErr.message}`);
        }
      }

      if (isChallenge) {
        return {
          buffer,
          status,
          contentType,
          url,
          isWafChallenge: true,
          wafType: 'Cloudflare Turnstile / Managed Challenge',
        };
      }

      throw new Error(`403 Forbidden: Access denied for ${url}`);
    }

    if (status >= 400) {
      throw new Error(`HTTP Error ${status} fetching ${url}`);
    }

    return result;
  } catch (err) {
    throw err;
  } finally {
    try {
      if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
      if (fs.existsSync(bodyFile)) fs.unlinkSync(bodyFile);
    } catch (_) {}
  }
}

module.exports = {
  powerFetch,
  buildCurlCommand,
  FREE_PROXIES,
};
