/**
 * WaterCrawl — app.js (Batch Edition)
 * Optimized: Cookie Management, Multi-URL Parallel Scrape, High Concurrency.
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const os = require('os');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

const httpClient = axios.create({
  timeout: 15000,
  maxRedirects: 10,
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100, rejectUnauthorized: false }),
});

const FREE_PROXIES = [
  { host: '8.219.97.248', port: 80, protocol: 'http' },
  { host: '47.91.45.198', port: 80, protocol: 'http' },
  { host: '103.149.162.195', port: 80, protocol: 'http' },
];

let proxyIndex = 0;
const getNextProxy = () => FREE_PROXIES[proxyIndex++ % FREE_PROXIES.length];

const STEALTH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const getStealthArgs = (url, proxyStr = '', cookieFile = '', auth = null) => {
  const cookieArg = cookieFile ? `-b ${cookieFile} -c ${cookieFile}` : '';
  const authArg = auth && auth.username && auth.password ? `-u "${auth.username}:${auth.password}"` : '';
  return `curl -L -s -k -w "\\nStatusCode:%{http_code}\\nContentType:%{content_type}" ${cookieArg} ${proxyStr} ${authArg} ` +
    `-H "User-Agent: ${STEALTH_UA}" ` +
    `-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" ` +
    `-H "Sec-Ch-Ua: \\"Chromium\\";v=\\"122\\"" ` +
    `-H "Upgrade-Insecure-Requests: 1" ` +
    `--compressed "${url}"`;
};

const resolveUrl = (base, href) => { try { return new URL(href, base).href; } catch { return null; } };
const getDomain = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
const getBaseDomain = (u) => {
  const h = getDomain(u);
  const p = h.split('.');
  return p.length > 2 ? p.slice(-2).join('.') : h;
};

const htmlToMarkdown = ($, el) => {
  let markdown = '';
  const processNode = (node) => {
    $(node).contents().each(function () {
      if (this.type === 'text') {
        markdown += this.data.replace(/\s+/g, ' ');
      } else if (this.type === 'tag') {
        const tag = this.name.toLowerCase();
        const $this = $(this);
        const content = $this.text().trim();
        if (!content && !['br', 'hr'].includes(tag)) return;

        if (/^h[1-6]$/.test(tag)) {
          markdown += `\n\n${'#'.repeat(parseInt(tag[1]))} `;
          processNode(this);
          markdown += '\n\n';
        } else if (tag === 'p' || tag === 'div' || tag === 'article' || tag === 'section') {
          markdown += '\n\n';
          processNode(this);
          markdown += '\n\n';
        } else if (tag === 'li') {
          markdown += '\n- ';
          processNode(this);
        } else if (tag === 'strong' || tag === 'b') {
          markdown += ' **';
          processNode(this);
          markdown += '** ';
        } else if (tag === 'em' || tag === 'i') {
          markdown += ' _';
          processNode(this);
          markdown += '_ ';
        } else if (tag === 'a') {
          markdown += ` [`;
          processNode(this);
          markdown += `](${$this.attr('href') || '#'}) `;
        } else if (tag === 'br') {
          markdown += '\n';
        } else if (tag === 'pre' || tag === 'code') {
          markdown += `\n\`\`\`\n${$this.text().trim()}\n\`\`\`\n`;
        } else if (tag === 'blockquote') {
          markdown += '\n> ';
          processNode(this);
          markdown += '\n';
        } else {
          processNode(this);
        }
      }
    });
  };
  processNode(el);
  return markdown.replace(/\n{3,}/g, '\n\n').trim();
};

async function powerFetch(url, options = {}) {
  const { proxyMode = 'none' } = options;
  const cookieFile = path.join(os.tmpdir(), `wc-cookie-${Date.now()}.txt`);
  const bodyFile = path.join(os.tmpdir(), `wc-body-${Date.now()}.bin`);
  try {
    const proxy = (proxyMode === 'auto' || proxyMode === 'force') ? getNextProxy() : null;
    const proxyStr = proxy ? `--proxy ${proxy.protocol}://${proxy.host}:${proxy.port}` : '';
    const cmd = getStealthArgs(url, proxyStr, cookieFile, options.auth) + ` -o "${bodyFile}"`;
    const { stdout, stderr } = await execPromise(cmd);

    const meta = stdout.trim();
    const status = parseInt(meta.split('\nContentType:')[0].replace('StatusCode:', '')) || 0;
    const contentType = (meta.split('\nContentType:')[1] || '').toLowerCase();

    if (status === 401) throw new Error(`401 Unauthorized: Authentication failed for ${url}. Please check your credentials.`);
    if (status === 403) throw new Error(`403 Forbidden: Access denied for ${url}.`);
    if (status === 404) throw new Error(`404 Not Found: The page ${url} does not exist.`);
    if (status >= 400) throw new Error(`HTTP Error ${status}: Failed to fetch ${url}.`);
    if (!fs.existsSync(bodyFile)) throw new Error(`Fetch Error: Content not saved for ${url}. ${stderr}`);

    const buffer = fs.readFileSync(bodyFile);
    return { buffer, status, contentType, url };
  } catch (e) {
    throw e;
  } finally {
    if (fs.existsSync(cookieFile)) fs.unlinkSync(cookieFile);
    if (fs.existsSync(bodyFile)) fs.unlinkSync(bodyFile);
  }
}

/**
 * Perform single scrape
 */
async function performScrape(url, settings) {
  try {
    const { buffer, status, contentType, url: finalUrl } = await powerFetch(url, settings);
    const { formats = ['markdown'] } = settings;

    let contentTitle = '';
    let markdownContent = '';
    let htmlContent = '';
    let textContent = '';
    let links = [];

    if (contentType.includes('application/pdf')) {
      const tempPdf = path.join(os.tmpdir(), `scrape-pdf-${Date.now()}.pdf`);
      fs.writeFileSync(tempPdf, buffer);
      try {
        const { stdout } = await execPromise(`pdftotext "${tempPdf}" -`);
        textContent = stdout.replace(/\s+/g, ' ').trim();
        markdownContent = stdout.split('\n\n').map(p => p.trim()).filter(p => p).join('\n\n');
        contentTitle = path.basename(url);
      } finally {
        if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
      }
    } else if (contentType.includes('wordprocessingml') || contentType.includes('application/msword')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value.trim();
      markdownContent = textContent.split('\n\n').map(p => p.trim()).filter(p => p).join('\n\n');
      contentTitle = path.basename(url);
    } else if (contentType.includes('spreadsheetml') || contentType.includes('application/vnd.ms-excel')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      textContent = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      markdownContent = `### Sheet: ${sheetName}\n\n` + textContent.split('\n').map(line => `| ${line.split(',').join(' | ')} |`).join('\n');
      contentTitle = path.basename(url);
    } else if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
      textContent = buffer.toString('utf8').trim();
      markdownContent = textContent.split('\n\n').map(p => p.trim()).filter(p => p).join('\n\n');
      contentTitle = path.basename(url);
    } else {
      const html = buffer.toString('utf8');
      const $ = cheerio.load(html);
      const { onlyMainContent = true, includeTags = [], excludeTags = [], blockAds = true, includeHeader = false, includeFooter = false, removeBase64Images = true } = settings;

      if (blockAds) $('[class*="ad-"], [id*="ad-"], [class*="advertis"]').remove();
      if (removeBase64Images) $('img[src^="data:"]').remove();
      if (!includeHeader) $('header, nav, .header').remove();
      if (!includeFooter) $('footer, .footer').remove();
      if (excludeTags?.length) excludeTags.forEach(t => $(t).remove());

      let $content = includeTags?.length ? $(includeTags.join(',')) :
        (onlyMainContent && $('main, article').length ? $('main, article').first() : $('body'));

      markdownContent = formats.includes('markdown') ? htmlToMarkdown($, $content) : undefined;
      if (formats.includes('markdown') && !markdownContent && $content.text().trim()) {
        markdownContent = $content.text().replace(/\s+/g, ' ').trim();
      }
      contentTitle = $('title').text().trim();
      htmlContent = formats.includes('html') ? $.html($content) : undefined;
      textContent = formats.includes('text') ? $content.text().replace(/\s+/g, ' ').trim() : undefined;
      if (formats.includes('links')) {
        links = Array.from($content.find('a[href]')).map(a => ({
          text: $(a).text().trim(),
          href: resolveUrl(finalUrl, $(a).attr('href'))
        }));
      }
    }

    return {
      success: true,
      data: {
        metadata: { title: contentTitle, url: finalUrl, status, scrapedAt: new Date().toISOString(), contentType },
        markdown: markdownContent,
        html: htmlContent,
        text: textContent,
        links: links,
      }
    };
  } catch (err) {
    return { success: false, url, error: err.message };
  }
}

app.post('/api/scrape', async (req, res) => {
  const { url, urls, ...settings } = req.body;
  const targetUrls = urls || (url ? [url] : []);
  if (!targetUrls.length) return res.status(400).json({ success: false, error: 'No URLs provided' });

  // Limit concurrency to 5
  const results = [];
  for (let i = 0; i < targetUrls.length; i += 5) {
    const batch = targetUrls.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(u => performScrape(u, settings)));
    results.push(...batchResults);
  }

  res.json({ success: true, data: results.map(r => r.data || r) });
});

app.post('/api/crawl', async (req, res) => {
  const { url: startUrl, limit = 50, maxDiscoveryDepth = 2, allowExternalLinks = false, allowSubdomains = true, excludePaths = [], includePaths = [], delay = 0, maxConcurrency = 10, auth } = req.body;

  let baseDomain = getDomain(startUrl), baseRoot = getBaseDomain(startUrl);
  const visited = new Set(), discovered = [], queue = [{ url: startUrl, depth: 0 }];

  const normalize = (u) => { try { const p = new URL(u); p.hash = ''; return p.href.replace(/\/$/, ''); } catch { return u; } };
  const matchesPathPatterns = (href, patterns) => {
    if (!patterns || !patterns.length) return false;
    return patterns.some(p => { try { return new RegExp(p).test(href); } catch { return href.includes(p); } });
  };
  const shouldCrawl = (u) => {
    const d = getDomain(u), r = getBaseDomain(u);
    if (!allowExternalLinks && d !== baseDomain && (!allowSubdomains || r !== baseRoot)) return false;
    if (excludePaths?.length && matchesPathPatterns(u, excludePaths)) return false;
    if (includePaths?.length && !matchesPathPatterns(u, includePaths)) return false;
    return true;
  };

  let firstRun = true;
  while (queue.length > 0 && discovered.length < limit) {
    const batch = queue.splice(0, maxConcurrency);
    const results = await Promise.all(batch.map(async (item) => {
      const norm = normalize(item.url);
      if (visited.has(norm) || discovered.length >= limit) return [];
      visited.add(norm);
      discovered.push(norm);
      if (item.depth >= maxDiscoveryDepth) return [];
      try {
        const { buffer, contentType, url: finalUrl } = await powerFetch(item.url, { auth });
        if (firstRun && item.url === startUrl) { baseDomain = getDomain(finalUrl); baseRoot = getBaseDomain(finalUrl); firstRun = false; }

        if (!contentType.includes('text/html')) return [];

        const $ = cheerio.load(buffer.toString('utf8'));
        return Array.from($('a[href]')).map(a => resolveUrl(finalUrl, $(a).attr('href')))
          .filter(u => u && !u.includes('#') && shouldCrawl(u))
          .map(u => ({ url: u, depth: item.depth + 1 }));
      } catch (e) { return []; }
    }));
    results.flat().forEach(l => { if (!visited.has(normalize(l.url))) queue.push(l); });
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
  }
  res.json({ success: true, data: { urls: discovered, total: discovered.length } });
});

app.get('/test-auth', (req, res) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [user, pass] = Buffer.from(b64auth, 'base64').toString().split(':');
  if (user === 'admin' && pass === 'password') {
    return res.send('<h1>Authenticated Content</h1><p>Success! You accessed this page with credentials.</p><a href="/test-auth/more">More Links</a>');
  }
  res.set('WWW-Authenticate', 'Basic realm="401"');
  res.status(401).send('Authentication required.');
});

app.listen(PORT, () => console.log(`🚀 WaterCrawl listening on port ${PORT}`));
