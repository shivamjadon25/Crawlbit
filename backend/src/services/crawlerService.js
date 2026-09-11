/**
 * Crawlbit — Crawler Service
 */

const cheerio = require('cheerio');
const { powerFetch } = require('./fetcher');
const { resolveUrl, getDomain, getBaseDomain } = require('../utils/markdown');

function normalizeUrl(u) {
  try {
    const parsed = new URL(u);
    parsed.hash = '';
    return parsed.href.replace(/\/$/, '');
  } catch {
    return u;
  }
}

function matchesPathPatterns(href, patterns) {
  if (!patterns || !patterns.length) return false;
  return patterns.some(p => {
    try {
      return new RegExp(p).test(href);
    } catch {
      return href.includes(p);
    }
  });
}

async function performCrawl(options = {}) {
  const {
    url: startUrl,
    limit = 50,
    maxDiscoveryDepth = 2,
    allowExternalLinks = false,
    allowSubdomains = true,
    excludePaths = [],
    includePaths = [],
    delay = 0,
    maxConcurrency = 10,
    auth = null,
    mobile = false,
    proxy = 'none'
  } = options;

  if (!startUrl) {
    throw new Error('Start URL is required for crawling');
  }

  const startTime = Date.now();
  let baseDomain = getDomain(startUrl);
  let baseRoot = getBaseDomain(startUrl);

  const visited = new Set();
  const discovered = [];
  const queue = [{ url: startUrl, depth: 0 }];

  const shouldCrawl = (u) => {
    const d = getDomain(u);
    const r = getBaseDomain(u);

    if (!allowExternalLinks && d !== baseDomain && (!allowSubdomains || r !== baseRoot)) {
      return false;
    }
    if (excludePaths && excludePaths.length && matchesPathPatterns(u, excludePaths)) {
      return false;
    }
    if (includePaths && includePaths.length && !matchesPathPatterns(u, includePaths)) {
      return false;
    }
    return true;
  };

  let firstRun = true;

  while (queue.length > 0 && discovered.length < limit) {
    const batch = queue.splice(0, maxConcurrency);
    const results = await Promise.all(batch.map(async (item) => {
      const norm = normalizeUrl(item.url);
      if (visited.has(norm) || discovered.length >= limit) return [];
      visited.add(norm);
      discovered.push({
        url: norm,
        depth: item.depth,
        discoveredAt: new Date().toISOString()
      });

      if (item.depth >= maxDiscoveryDepth) return [];

      try {
        const { buffer, contentType, url: finalUrl } = await powerFetch(item.url, { auth, mobile, proxyMode: proxy });
        if (firstRun && item.url === startUrl) {
          baseDomain = getDomain(finalUrl);
          baseRoot = getBaseDomain(finalUrl);
          firstRun = false;
        }

        if (!contentType || !contentType.includes('text/html')) return [];

        const $ = cheerio.load(buffer.toString('utf8'));
        const links = [];
        $('a[href]').each((_, a) => {
          const rawHref = $(a).attr('href');
          const resolved = resolveUrl(finalUrl, rawHref);
          if (resolved && !resolved.includes('#') && !resolved.startsWith('javascript:') && shouldCrawl(resolved)) {
            links.push(resolved);
          }
        });

        return links.map(u => ({ url: u, depth: item.depth + 1 }));
      } catch (err) {
        return [];
      }
    }));

    results.flat().forEach(linkItem => {
      const norm = normalizeUrl(linkItem.url);
      if (!visited.has(norm) && !queue.some(q => normalizeUrl(q.url) === norm)) {
        queue.push(linkItem);
      }
    });

    if (delay > 0 && queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    seedUrl: startUrl,
    total: discovered.length,
    durationMs,
    urls: discovered.map(d => d.url),
    details: discovered,
  };
}

module.exports = {
  performCrawl,
};
