/**
 * Crawlbit — Scraper Service
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const cheerio = require('cheerio');
const mammoth = require('mammoth');
const xlsx = require('xlsx');

const { powerFetch } = require('./fetcher');
const { htmlToMarkdown, resolveUrl } = require('../utils/markdown');

const execPromise = util.promisify(exec);

async function performScrape(url, settings = {}) {
  try {
    const fetchResult = await powerFetch(url, settings);
    const { buffer, status, contentType, url: finalUrl, isWafChallenge, wafType } = fetchResult;
    const { formats = ['markdown'] } = settings;

    let contentTitle = '';
    let markdownContent = '';
    let htmlContent = '';
    let textContent = '';
    let links = [];

    // 1. PDF Documents
    if (contentType.includes('application/pdf')) {
      const tempPdf = path.join(os.tmpdir(), `cb-pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);
      fs.writeFileSync(tempPdf, buffer);
      try {
        const { stdout } = await execPromise(`pdftotext "${tempPdf}" -`);
        textContent = stdout.replace(/\s+/g, ' ').trim();
        markdownContent = stdout.split('\n\n').map(p => p.trim()).filter(Boolean).join('\n\n');
        contentTitle = path.basename(url);
      } catch (pdfErr) {
        textContent = `[PDF extraction error: ${pdfErr.message}]`;
        markdownContent = textContent;
      } finally {
        if (fs.existsSync(tempPdf)) fs.unlinkSync(tempPdf);
      }
    }
    // 2. Word Documents (.doc, .docx)
    else if (contentType.includes('wordprocessingml') || contentType.includes('application/msword')) {
      const result = await mammoth.extractRawText({ buffer });
      textContent = result.value.trim();
      markdownContent = textContent.split('\n\n').map(p => p.trim()).filter(Boolean).join('\n\n');
      contentTitle = path.basename(url);
    }
    // 3. Excel Spreadsheets (.xls, .xlsx)
    else if (contentType.includes('spreadsheetml') || contentType.includes('application/vnd.ms-excel')) {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0] || 'Sheet1';
      textContent = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      const rows = textContent.split('\n').filter(Boolean);
      if (rows.length > 0) {
        markdownContent = `### Sheet: ${sheetName}\n\n` +
          `| ${rows[0].split(',').join(' | ')} |\n` +
          `| ${rows[0].split(',').map(() => '---').join(' | ')} |\n` +
          rows.slice(1).map(line => `| ${line.split(',').join(' | ')} |`).join('\n');
      } else {
        markdownContent = `### Sheet: ${sheetName}\n\n(Empty sheet)`;
      }
      contentTitle = path.basename(url);
    }
    // 4. Plain Text & CSV
    else if (contentType.includes('text/plain') || contentType.includes('text/csv')) {
      textContent = buffer.toString('utf8').trim();
      markdownContent = textContent.split('\n\n').map(p => p.trim()).filter(Boolean).join('\n\n');
      contentTitle = path.basename(url);
    }
    // 5. HTML Content
    else {
      const html = buffer.toString('utf8');
      const $ = cheerio.load(html);
      const {
        onlyMainContent = true,
        includeTags = [],
        excludeTags = [],
        blockAds = true,
        includeHeader = false,
        includeFooter = false,
        removeBase64Images = true
      } = settings;

      if (blockAds) {
        $('[class*="ad-"], [id*="ad-"], [class*="advertis"], [id*="advertis"], .sponsor, .sponsored').remove();
      }
      if (removeBase64Images) {
        $('img[src^="data:"]').remove();
      }
      if (!includeHeader) {
        $('header, nav, .header, .nav, #header, #nav, .navbar').remove();
      }
      if (!includeFooter) {
        $('footer, .footer, #footer, .site-footer').remove();
      }
      if (excludeTags && excludeTags.length) {
        excludeTags.forEach(selector => {
          try { $(selector).remove(); } catch (_) {}
        });
      }

      let $content;
      if (includeTags && includeTags.length) {
        $content = $(includeTags.join(','));
      } else if (onlyMainContent && $('main, article, [role="main"]').length) {
        $content = $('main, article, [role="main"]').first();
      } else {
        $content = $('body');
      }

      if (!$content.length) $content = $('body');

      contentTitle = $('title').first().text().trim() || $('h1').first().text().trim() || path.basename(url);

      if (isWafChallenge) {
        contentTitle = `[WAF Protected] ${contentTitle || 'Bot Verification Challenge'}`;
      }

      if (formats.includes('markdown') || formats.includes('all')) {
        markdownContent = htmlToMarkdown($, $content);
        if (!markdownContent && $content.text().trim()) {
          markdownContent = $content.text().replace(/\s+/g, ' ').trim();
        }
      }

      if (formats.includes('html') || formats.includes('all')) {
        htmlContent = $.html($content);
      }

      if (formats.includes('text') || formats.includes('all')) {
        textContent = $content.text().replace(/\s+/g, ' ').trim();
      }

      if (formats.includes('links') || formats.includes('all')) {
        const linkMap = new Map();
        $content.find('a[href]').each((_, a) => {
          const resolved = resolveUrl(finalUrl, $(a).attr('href'));
          const text = $(a).text().trim();
          if (resolved && !linkMap.has(resolved) && !resolved.startsWith('javascript:')) {
            linkMap.set(resolved, { text: text || resolved, href: resolved });
          }
        });
        links = Array.from(linkMap.values());
      }
    }

    const responsePayload = {
      success: true,
      url: finalUrl,
      data: {
        metadata: {
          title: contentTitle || 'Untitled Document',
          url: finalUrl,
          status,
          scrapedAt: new Date().toISOString(),
          contentType,
          isWafChallenge: !!isWafChallenge,
          wafType: wafType || undefined,
        },
        markdown: markdownContent,
        html: htmlContent,
        text: textContent,
        links: links,
      }
    };

    if (isWafChallenge) {
      responsePayload.warning = `The target website (${url}) is protected by Cloudflare Managed Challenge. You can pass valid session cookies in Custom Headers or use residential proxies.`;
    }

    return responsePayload;
  } catch (err) {
    return {
      success: false,
      url,
      error: err.message || 'Scrape failed',
    };
  }
}

async function batchScrape(urls, settings = {}, concurrency = 5) {
  const results = [];
  const validUrls = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);

  for (let i = 0; i < validUrls.length; i += concurrency) {
    const chunk = validUrls.slice(i, i + concurrency);
    const chunkResults = await Promise.all(chunk.map(u => performScrape(u, settings)));
    results.push(...chunkResults);
  }

  return results;
}

module.exports = {
  performScrape,
  batchScrape,
};
