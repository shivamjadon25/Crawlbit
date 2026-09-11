/**
 * Crawlbit Studio — High Performance Controller
 */

// Studio State
let studioMode = 'scrape'; // 'scrape' | 'crawl'
let activeTab = 'rendered'; // 'rendered' | 'markdown' | 'html' | 'text' | 'links' | 'json'
let activeTargetIndex = 0;
let lastPayload = null;
let isBusy = false;
let clockTimer = null;
let t0 = 0;

// Host URL
const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || !window.location.hostname);
const DEFAULT_HOST = window.location.port === '3000'
  ? ''
  : (isLocalhost ? 'http://localhost:3000' : 'https://crawlbit-api.onrender.com');

let savedHost = localStorage.getItem('crawlbit_studio_api');
if (!isLocalhost && savedHost === 'http://localhost:3000') {
  savedHost = 'https://crawlbit-api.onrender.com';
  localStorage.setItem('crawlbit_studio_api', savedHost);
}
let API_HOST = savedHost || DEFAULT_HOST;

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initAppearance();
  initKeyShortcuts();
  updateParamCount();
  probeBackend();
  setInterval(probeBackend, 12000);

  // Close menus on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.omni-bar')) {
      const m = document.getElementById('mode-menu');
      if (m) m.classList.add('hidden');
    }
    if (!e.target.closest('.export-pop-wrapper')) {
      const em = document.getElementById('export-pop-menu');
      if (em) em.classList.add('hidden');
    }
  });
});

// Keyboard Shortcuts
function initKeyShortcuts() {
  const inp = document.getElementById('target-input');
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerExecution();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inp.focus();
    } else if (e.key === 'Tab' && document.activeElement !== inp && !document.activeElement.matches('input, textarea')) {
      e.preventDefault();
      toggleParamsDrawer();
    }
  });
}

// Appearance (Light Mode Default)
function initAppearance() {
  const saved = localStorage.getItem('crawlbit_studio_theme') || 'light';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('crawlbit_studio_theme', theme);
  document.getElementById('theme-glyph').textContent = theme === 'dark' ? '◑' : '○';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'dark' ? 'light' : 'dark');
}

// Backend Prober
async function probeBackend(targetUrl = API_HOST) {
  const pulse = document.getElementById('header-pulse');
  const hostLabel = document.getElementById('header-host');
  const footerDot = document.getElementById('footer-dot');
  const footerText = document.getElementById('footer-conn-text');

  try {
    const hostOnly = targetUrl ? (new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`).host) : 'localhost:3000';
    hostLabel.textContent = hostOnly;
  } catch (_) {
    hostLabel.textContent = targetUrl || 'localhost:3000';
  }

  const endpoint = `${targetUrl.replace(/\/$/, '')}/api/health`;
  const start = performance.now();

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
    const lat = Math.round(performance.now() - start);
    if (res.ok) {
      pulse.className = 'dot live';
      footerDot.style.backgroundColor = 'var(--accent-green)';
      footerText.textContent = `API Live (${lat}ms)`;
      return { ok: true, latency: lat };
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    pulse.className = 'dot dead';
    footerDot.style.backgroundColor = 'var(--accent-red)';
    footerText.textContent = 'API Disconnected';
    return { ok: false, error: err.message };
  }
}

// Mode Selection
function toggleModeMenu(e) {
  e.stopPropagation();
  const m = document.getElementById('mode-menu');
  m.classList.toggle('hidden');
}

function selectMode(mode) {
  studioMode = mode;
  document.getElementById('current-mode-label').textContent = mode === 'scrape' ? 'Scrape' : 'Crawl';
  document.getElementById('opt-scrape').classList.toggle('active', mode === 'scrape');
  document.getElementById('opt-crawl').classList.toggle('active', mode === 'crawl');
  document.getElementById('drawer-scrape-opts').classList.toggle('hidden', mode !== 'scrape');
  document.getElementById('drawer-crawl-opts').classList.toggle('hidden', mode !== 'crawl');
  document.getElementById('footer-mode').textContent = mode === 'scrape' ? 'Scraper Mode' : 'Crawler Mode';
  document.getElementById('target-input').placeholder = mode === 'scrape' 
    ? 'https://example.com (or paste multiple URLs separated by commas)'
    : 'https://example.com (seed starting URL for BFS crawling)';
  document.getElementById('mode-menu').classList.add('hidden');
  updateParamCount();
}

// Drawer Toggle & Counter
function toggleParamsDrawer() {
  const d = document.getElementById('options-drawer');
  const b = document.getElementById('params-btn');
  d.classList.toggle('hidden');
  b.classList.toggle('active', !d.classList.contains('hidden'));
}

function updateParamCount() {
  let count = 0;
  if (studioMode === 'scrape') {
    count += document.querySelectorAll('input[name="fmt-chip"]:checked').length;
    if (document.getElementById('opt-main-content').checked) count++;
    if (document.getElementById('opt-block-ads').checked) count++;
    if (document.getElementById('opt-strip-b64').checked) count++;
    if (document.getElementById('opt-use-proxy').checked) count++;
    if (document.getElementById('opt-use-mobile').checked) count++;
  } else {
    count = 3; // base crawler params
  }
  document.getElementById('active-param-count').textContent = count;
}

// Quick Starters
function quickLoad(url) {
  document.getElementById('target-input').value = url;
  selectMode('scrape');
  triggerExecution();
}

function quickCrawl(url) {
  document.getElementById('target-input').value = url;
  selectMode('crawl');
  triggerExecution();
}

// Execution Dispatcher
async function triggerExecution() {
  if (isBusy) return;

  const raw = document.getElementById('target-input').value.trim();
  if (!raw) {
    showToast('Please enter a target URL');
    document.getElementById('target-input').focus();
    return;
  }

  let body = {};
  let route = studioMode === 'scrape' ? '/api/scrape' : '/api/crawl';

  if (studioMode === 'scrape') {
    const urls = raw.split(/[\n,]+/).map(u => u.trim()).filter(Boolean);
    const selectedFmt = Array.from(document.querySelectorAll('input[name="fmt-chip"]:checked')).map(c => c.value);
    const customProxy = document.getElementById('opt-custom-proxy')?.value.trim();
    const useBrowser = document.getElementById('opt-use-browser')?.checked || false;

    body = {
      urls,
      formats: selectedFmt.length ? selectedFmt : ['markdown'],
      onlyMainContent: document.getElementById('opt-main-content').checked,
      blockAds: document.getElementById('opt-block-ads').checked,
      removeBase64Images: document.getElementById('opt-strip-b64').checked,
      proxyMode: document.getElementById('opt-use-proxy').checked ? 'auto' : 'none',
      customProxy: customProxy || undefined,
      renderJs: useBrowser,
      mobile: document.getElementById('opt-use-mobile').checked,
    };

    const inc = document.getElementById('opt-inc-sel').value.trim();
    if (inc) body.includeTags = inc.split(',').map(s => s.trim()).filter(Boolean);

    const exc = document.getElementById('opt-exc-sel').value.trim();
    if (exc) body.excludeTags = exc.split(',').map(s => s.trim()).filter(Boolean);

    const hdr = document.getElementById('opt-headers').value.trim();
    if (hdr) {
      try { body.headers = JSON.parse(hdr); }
      catch (_) { showToast('Invalid JSON in Headers'); return; }
    }

    const u = document.getElementById('opt-auth-user').value.trim();
    const p = document.getElementById('opt-auth-pass').value.trim();
    if (u && p) body.auth = { username: u, password: p };

  } else {
    // Crawler
    body = {
      url: raw,
      limit: parseInt(document.getElementById('opt-crawl-limit').value, 10) || 30,
      maxDiscoveryDepth: parseInt(document.getElementById('opt-crawl-depth').value, 10) || 2,
      allowSubdomains: document.getElementById('opt-crawl-subdomains').checked,
      allowExternalLinks: document.getElementById('opt-crawl-external').checked,
      maxConcurrency: parseInt(document.getElementById('opt-crawl-conc').value, 10) || 5,
      delay: parseInt(document.getElementById('opt-crawl-delay').value, 10) || 0,
    };

    const pin = document.getElementById('opt-crawl-pin').value.trim();
    if (pin) body.includePaths = pin.split(',').map(s => s.trim()).filter(Boolean);

    const pex = document.getElementById('opt-crawl-pex').value.trim();
    if (pex) body.excludePaths = pex.split(',').map(s => s.trim()).filter(Boolean);

    const u = document.getElementById('opt-crawl-user').value.trim();
    const p = document.getElementById('opt-crawl-pass').value.trim();
    if (u && p) body.auth = { username: u, password: p };
  }

  isBusy = true;
  t0 = performance.now();
  setRunningState(true);

  const endpoint = `${API_HOST.replace(/\/$/, '')}${route}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const elapsed = Math.round(performance.now() - t0);
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    const jsonStr = JSON.stringify(json);
    const sizeKb = (jsonStr.length / 1024).toFixed(1);

    lastPayload = {
      mode: studioMode,
      elapsedMs: elapsed,
      sizeKb,
      data: json,
    };
    activeTargetIndex = 0;

    renderStage();
    showToast(`Completed in ${elapsed}ms`);
  } catch (err) {
    renderErrorCanvas(err.message);
    showToast(`Execution failed: ${err.message}`);
  } finally {
    isBusy = false;
    setRunningState(false);
  }
}

// Running state UI
function setRunningState(running) {
  const btn = document.getElementById('run-btn');
  const sp = document.getElementById('run-spinner');
  const txt = document.getElementById('run-text');
  const fStatus = document.getElementById('footer-status-code');
  const fTime = document.getElementById('footer-time');

  if (running) {
    btn.disabled = true;
    sp.classList.remove('hidden');
    txt.textContent = 'Running';
    fStatus.textContent = 'RUNNING';
    clockTimer = setInterval(() => {
      fTime.textContent = `${Math.round(performance.now() - t0)} ms`;
    }, 50);
  } else {
    clearInterval(clockTimer);
    btn.disabled = false;
    sp.classList.add('hidden');
    txt.textContent = 'Run';
    if (lastPayload) {
      fStatus.textContent = '200 OK';
      fTime.textContent = `${lastPayload.elapsedMs} ms`;
      document.getElementById('footer-size').textContent = `${lastPayload.sizeKb} KB`;
    }
  }
}

// Inspector Tabs
function setInspectorTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.itab').forEach(b => {
    b.classList.toggle('active', b.id === `itab-${tab}`);
  });
  renderStage();
}

// Stage Renderer
function renderStage() {
  const canvas = document.getElementById('stage-canvas');
  const tabsBar = document.getElementById('target-tabs-bar');
  const linksBadge = document.getElementById('itab-links-count');

  if (!lastPayload) return;

  canvas.innerHTML = '';
  tabsBar.innerHTML = '';

  // 1. CRAWL MODE
  if (lastPayload.mode === 'crawl') {
    const urls = lastPayload.data.data?.urls || [];
    linksBadge.textContent = urls.length;
    linksBadge.classList.remove('hidden');

    if (activeTab === 'json') {
      renderJsonTree(canvas, lastPayload.data);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'links-matrix';
    wrapper.innerHTML = `
      <div class="code-header-meta">
        <span class="meta-status-chip">CRAWL ${urls.length} URLs</span>
        <span class="meta-target-url">${escapeStr(lastPayload.data.data?.seedUrl || '')}</span>
      </div>
      <div class="matrix-body">
        ${urls.map((u, i) => `
          <div class="matrix-row">
            <div class="matrix-left">
              <span class="matrix-idx">#${i + 1}</span>
              <a href="${escapeStr(u)}" target="_blank" rel="noopener noreferrer" class="matrix-link">${escapeStr(u)}</a>
            </div>
            <button class="stage-btn" style="padding:2px 8px; font-size:0.75rem;" onclick="copyRaw('${escapeQuotes(u)}', this)">Copy</button>
          </div>
        `).join('')}
      </div>
    `;
    canvas.appendChild(wrapper);
    return;
  }

  // 2. SCRAPER MODE
  const results = Array.isArray(lastPayload.data.data) ? lastPayload.data.data : [lastPayload.data.data];

  // Populate Target Tabs if batch
  if (results.length > 1) {
    results.forEach((item, idx) => {
      const pill = document.createElement('button');
      pill.className = `target-pill ${idx === activeTargetIndex ? 'active' : ''}`;
      pill.innerHTML = `<span>#${idx + 1}</span> <span>${escapeStr(item?.metadata?.title || 'Target')}</span>`;
      pill.onclick = () => {
        activeTargetIndex = idx;
        renderStage();
      };
      tabsBar.appendChild(pill);
    });
  }

  const currentItem = results[activeTargetIndex] || results[0];
  if (!currentItem) return;

  // Total links count
  const links = currentItem.links || [];
  if (links.length) {
    linksBadge.textContent = links.length;
    linksBadge.classList.remove('hidden');
  } else {
    linksBadge.classList.add('hidden');
  }

  if (activeTab === 'json') {
    renderJsonTree(canvas, lastPayload.data);
    return;
  }

  if (currentItem.success === false || currentItem.error) {
    canvas.innerHTML = `
      <div class="code-viewport" style="border-color:var(--accent-red);">
        <div class="code-header-meta">
          <span class="meta-status-chip err">ERROR</span>
          <span class="meta-target-url">${escapeStr(currentItem.url || '')}</span>
        </div>
        <div class="code-pre" style="color:var(--accent-red);">
          ${escapeStr(currentItem.error || 'Scrape failed')}
        </div>
      </div>
    `;
    return;
  }

  const meta = currentItem.metadata || {};
  const title = meta.title || 'Extracted Document';
  const url = meta.url || currentItem.url || '';

  if (activeTab === 'rendered') {
    const md = currentItem.markdown || currentItem.text || '';
    const article = document.createElement('article');
    article.className = 'rendered-article';
    article.innerHTML = `
      <div style="margin-bottom:1.25rem; border-bottom:1px solid var(--border-subtle); padding-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
        <span class="meta-status-chip">${meta.status || 200} OK</span>
        ${url ? `<a href="${escapeStr(url)}" target="_blank" rel="noopener noreferrer" class="meta-target-url">${escapeStr(url)}</a>` : ''}
      </div>
      ${md ? parseMarkdown(md) : '<em style="color:var(--text-faint)">No parsed content</em>'}
    `;
    canvas.appendChild(article);
  } else if (activeTab === 'markdown') {
    const md = currentItem.markdown || '';
    renderCodeBlock(canvas, 'MARKDOWN', url, md || 'No markdown extracted');
  } else if (activeTab === 'html') {
    const html = currentItem.html || '';
    renderCodeBlock(canvas, 'HTML', url, html || 'No HTML extracted');
  } else if (activeTab === 'text') {
    const text = currentItem.text || '';
    renderCodeBlock(canvas, 'TEXT', url, text || 'No text extracted');
  } else if (activeTab === 'links') {
    const box = document.createElement('div');
    box.className = 'links-matrix';
    box.innerHTML = `
      <div class="code-header-meta">
        <span class="meta-status-chip">${links.length} LINKS FOUND</span>
        <span class="meta-target-url">${escapeStr(url)}</span>
      </div>
      <div class="matrix-body">
        ${links.length ? links.map((l, i) => `
          <div class="matrix-row">
            <div class="matrix-left">
              <span class="matrix-idx">#${i + 1}</span>
              <span class="matrix-text">${escapeStr(l.text || '(empty)')}</span>
              <a href="${escapeStr(l.href)}" target="_blank" rel="noopener noreferrer" class="matrix-link">${escapeStr(l.href)}</a>
            </div>
            <button class="stage-btn" style="padding:2px 8px; font-size:0.75rem;" onclick="copyRaw('${escapeQuotes(l.href)}', this)">Copy</button>
          </div>
        `).join('') : '<div style="padding:1.5rem; color:var(--text-faint);">No links discovered</div>'}
      </div>
    `;
    canvas.appendChild(box);
  }
}

function renderCodeBlock(container, tag, url, content) {
  const box = document.createElement('div');
  box.className = 'code-viewport';
  box.innerHTML = `
    <div class="code-header-meta">
      <span class="meta-status-chip">${tag}</span>
      <span class="meta-target-url">${escapeStr(url)}</span>
    </div>
    <div class="code-pre">${escapeStr(content)}</div>
  `;
  container.appendChild(box);
}

function renderErrorCanvas(msg) {
  const canvas = document.getElementById('stage-canvas');
  canvas.innerHTML = `
    <div class="code-viewport" style="border-color:var(--accent-red); max-width:650px; margin:2rem auto;">
      <div class="code-header-meta">
        <span class="meta-status-chip err">DISPATCH FAILURE</span>
      </div>
      <div class="code-pre" style="color:var(--accent-red);">
        <p style="margin-bottom:0.75rem; font-weight:700;">${escapeStr(msg)}</p>
        <p style="font-size:0.85rem; color:var(--text-faint);">Check that your Crawlbit Backend API is running on <code style="color:var(--text-pure);">${escapeStr(API_HOST)}</code>.</p>
        <button class="stage-btn" style="margin-top:1rem;" onclick="openConfigModal()">Configure API</button>
      </div>
    </div>
  `;
}

// JSON Tree Parser
function renderJsonTree(container, json) {
  const box = document.createElement('div');
  box.className = 'code-viewport';
  box.innerHTML = `
    <div class="code-header-meta">
      <span class="meta-status-chip">JSON INSPECTOR</span>
      <button class="stage-btn" style="padding:2px 8px; font-size:0.75rem;" onclick="copyRaw('${escapeQuotes(JSON.stringify(json, null, 2))}', this)">Copy JSON</button>
    </div>
    <div class="json-tree-box" id="jroot"></div>
  `;
  container.appendChild(box);
  box.querySelector('#jroot').appendChild(buildJsonBranch('response', json));
}

function buildJsonBranch(k, v) {
  const item = document.createElement('div');
  const isObj = typeof v === 'object' && v !== null;
  const isArr = Array.isArray(v);

  const row = document.createElement('div');
  row.className = 'jrow';

  if (!isObj) {
    let span = '';
    if (typeof v === 'string') span = `<span class="jstr">"${escapeStr(v)}"</span>`;
    else if (typeof v === 'number') span = `<span class="jnum">${v}</span>`;
    else if (typeof v === 'boolean') span = `<span class="jbool">${v}</span>`;
    else if (v === null) span = `<span class="jnull">null</span>`;
    row.innerHTML = `<span class="jkey">${escapeStr(k)}:</span> ${span}`;
    item.appendChild(row);
  } else {
    const keys = Object.keys(v);
    row.innerHTML = `
      <span class="jtoggle">▼</span>
      <span class="jkey">${escapeStr(k)}:</span>
      <span style="color:var(--text-faint)">${isArr ? '[' : '{'} <small>(${keys.length})</small></span>
    `;

    const branch = document.createElement('div');
    branch.className = 'jbranch';
    keys.forEach(subKey => branch.appendChild(buildJsonBranch(subKey, v[subKey])));

    const closeLine = document.createElement('div');
    closeLine.style.color = 'var(--text-faint)';
    closeLine.textContent = isArr ? ']' : '}';

    row.querySelector('.jtoggle').onclick = () => {
      item.classList.toggle('jcollapsed');
      row.querySelector('.jtoggle').textContent = item.classList.contains('jcollapsed') ? '▶' : '▼';
    };

    item.appendChild(row);
    item.appendChild(branch);
    item.appendChild(closeLine);
  }

  return item;
}

// Markdown Parser
function parseMarkdown(md) {
  if (!md) return '';
  let safe = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return '<p>' + safe
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/```([\s\S]*?)```/g, '<pre class="code-pre">$1</pre>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>') + '</p>';
}

// Copy & Exports
function copyRaw(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = orig; }, 1400);
    }
    showToast('Copied to clipboard');
  }).catch(() => showToast('Failed to copy'));
}

function copyActiveContent() {
  if (!lastPayload) {
    showToast('No active content to copy');
    return;
  }
  const results = Array.isArray(lastPayload.data.data) ? lastPayload.data.data : [lastPayload.data.data];
  const item = results[activeTargetIndex] || results[0];

  let text = '';
  if (activeTab === 'rendered' || activeTab === 'markdown') text = item?.markdown || item?.text || '';
  else if (activeTab === 'html') text = item?.html || '';
  else if (activeTab === 'text') text = item?.text || '';
  else if (activeTab === 'links') text = (item?.links || []).map(l => `${l.text}\t${l.href}`).join('\n');
  else text = JSON.stringify(lastPayload.data, null, 2);

  copyRaw(text, document.getElementById('copy-btn-label'));
}

function toggleExportMenu(e) {
  e.stopPropagation();
  document.getElementById('export-pop-menu').classList.toggle('hidden');
}

function exportResultFile(type) {
  if (!lastPayload) {
    showToast('Nothing to export');
    return;
  }

  let content = '';
  let filename = `crawlbit_${Date.now()}`;
  let mime = 'text/plain';

  if (type === 'json') {
    content = JSON.stringify(lastPayload.data, null, 2);
    filename += '.json';
    mime = 'application/json';
  } else if (type === 'markdown') {
    filename += '.md';
    mime = 'text/markdown';
    if (lastPayload.mode === 'crawl') {
      content = `# Crawlbit Discovered URLs\n\n` + (lastPayload.data.data?.urls || []).map(u => `- ${u}`).join('\n');
    } else {
      const list = Array.isArray(lastPayload.data.data) ? lastPayload.data.data : [lastPayload.data.data];
      content = list.map(r => `## ${r.metadata?.title || 'Page'}\n\nURL: ${r.metadata?.url || ''}\n\n${r.markdown || r.text || ''}\n\n---\n`).join('\n');
    }
  } else if (type === 'html') {
    filename += '.html';
    mime = 'text/html';
    const list = Array.isArray(lastPayload.data.data) ? lastPayload.data.data : [lastPayload.data.data];
    content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Crawlbit Export</title></head><body>` +
      list.map(r => `<section><h2>${escapeStr(r.metadata?.title || 'Page')}</h2>${r.html || `<p>${r.text || ''}</p>`}</section>`).join('<hr>') +
      `</body></html>`;
  } else if (type === 'csv') {
    filename += '.csv';
    mime = 'text/csv';
    if (lastPayload.mode === 'crawl') {
      content = 'URL\n' + (lastPayload.data.data?.urls || []).map(u => `"${u}"`).join('\n');
    } else {
      const list = Array.isArray(lastPayload.data.data) ? lastPayload.data.data : [lastPayload.data.data];
      const rows = ['"Document","Anchor Text","URL"'];
      list.forEach(r => {
        (r.links || []).forEach(l => {
          rows.push(`"${(r.metadata?.title || '').replace(/"/g, '""')}","${(l.text || '').replace(/"/g, '""')}","${(l.href || '').replace(/"/g, '""')}"`);
        });
      });
      content = rows.join('\n');
    }
  }

  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  showToast(`Exported ${filename}`);
}

// Endpoint Modal
function openConfigModal() {
  document.getElementById('endpoint-url-input').value = API_HOST;
  document.getElementById('probe-text').textContent = 'Enter backend URL and click Ping to verify.';
  document.getElementById('endpoint-modal').classList.remove('hidden');
}

function closeEndpointModal() {
  document.getElementById('endpoint-modal').classList.add('hidden');
}

function closeModalOnOverlay(e) {
  if (e.target.id === 'endpoint-modal') closeEndpointModal();
}

async function pingCustomEndpoint() {
  const url = document.getElementById('endpoint-url-input').value.trim();
  const textEl = document.getElementById('probe-text');
  textEl.textContent = 'Probing backend health...';

  const res = await probeBackend(url);
  if (res.ok) {
    textEl.innerHTML = `<span style="color:var(--accent-green)">✓ Connected (latency ${res.latency}ms)</span>`;
  } else {
    textEl.innerHTML = `<span style="color:var(--accent-red)">✕ Connection failed (${res.error})</span>`;
  }
}

function saveCustomEndpoint() {
  const url = document.getElementById('endpoint-url-input').value.trim();
  API_HOST = url;
  localStorage.setItem('crawlbit_studio_api', url);
  closeEndpointModal();
  probeBackend();
  showToast('Backend endpoint saved');
}

// Toast
function showToast(msg) {
  const stream = document.getElementById('toast-stream');
  const t = document.createElement('div');
  t.className = 'toast-pill';
  t.textContent = msg;
  stream.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.2s';
    setTimeout(() => t.remove(), 200);
  }, 2200);
}

// Helpers
function escapeStr(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function escapeQuotes(s) {
  if (!s) return '';
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '');
}
