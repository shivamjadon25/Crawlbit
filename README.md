# 🕷️ Crawlbit — 100% Free & Open-Source Web Scraper & Crawler Engine

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](backend/)
[![Live Demo](https://img.shields.io/badge/API%20Status-Live-brightgreen)](https://crawlbit-api.onrender.com/api/health)

**Crawlbit** is a lightweight, zero-dependency, self-hostable web scraping and crawling platform. It requires **no paid subscriptions, no API keys, and zero SaaS accounts**. 

Use the REST API directly in any project (Python, Node.js, Go, PHP, cURL, etc.) or explore data visually via **Crawlbit Studio**.

---

## ⚡ Live API Quickstart (Zero Setup Required)

If you don't want to run anything locally, you can use the live public API endpoint directly:

- **Base URL**: `https://crawlbit-api.onrender.com`
- **Health Check**: `GET https://crawlbit-api.onrender.com/api/health`
- **Scrape Endpoint**: `POST https://crawlbit-api.onrender.com/api/scrape`
- **Crawl Endpoint**: `POST https://crawlbit-api.onrender.com/api/crawl`

> [!NOTE]
> Free tier instances on Render spin down during periods of inactivity. If the first request takes ~30-50s to respond, the instance is waking up.

---

## 🚀 Instant API Usage Examples

You can call Crawlbit's endpoints directly from any language or framework.

### 1. cURL
```bash
# Scrape a webpage to Clean Markdown
curl -s -X POST https://crawlbit-api.onrender.com/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://news.ycombinator.com"],
    "formats": ["markdown", "links"],
    "onlyMainContent": true
  }'
```

```bash
# BFS Domain Crawler
curl -s -X POST https://crawlbit-api.onrender.com/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 20,
    "maxDiscoveryDepth": 2
  }'
```

---

### 2. Python (`requests`)
```python
import requests

API_URL = "https://crawlbit-api.onrender.com/api/scrape"

payload = {
    "urls": [
        "https://en.wikipedia.org/wiki/Artificial_intelligence",
        "https://news.ycombinator.com"
    ],
    "formats": ["markdown", "text", "links"],
    "onlyMainContent": True,
    "blockAds": True,
    "renderJs": False
}

response = requests.post(API_URL, json=payload)
data = response.json()

if data.get("success"):
    for item in data["data"]:
        print(f"=== {item['metadata']['title']} ===")
        print(f"URL: {item['metadata']['url']}")
        print(f"Content Length: {len(item.get('markdown', ''))} chars")
        print(item.get("markdown", "")[:300] + "...\n")
```

---

### 3. JavaScript / TypeScript (Node.js & Fetch API)
```javascript
const response = await fetch('https://crawlbit-api.onrender.com/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['https://example.com'],
    formats: ['markdown', 'html', 'links'],
    onlyMainContent: true,
    renderJs: true // Runs Chromium headless for JavaScript SPAs & Cloudflare Turnstile
  })
});

const result = await response.json();
console.log('Scraped Title:', result.data[0].metadata.title);
console.log('Markdown Content:\n', result.data[0].markdown);
```

---

### 4. Go
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	payload := map[string]interface{}{
		"urls":            []string{"https://example.com"},
		"formats":         []string{"markdown", "links"},
		"onlyMainContent": true,
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post("https://crawlbit-api.onrender.com/api/scrape", "application/json", bytes.NewBuffer(body))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	fmt.Println(string(respData))
}
```

---

### 5. PHP
```php
<?php
$url = "https://crawlbit-api.onrender.com/api/scrape";
$data = [
    "urls" => ["https://example.com"],
    "formats" => ["markdown"],
    "onlyMainContent" => true
];

$options = [
    "http" => [
        "header"  => "Content-Type: application/json\r\n",
        "method"  => "POST",
        "content" => json_encode($data)
    ]
];

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

echo $response['data'][0]['markdown'];
?>
```

---

## 📖 API Reference

### `POST /api/scrape`
Scrapes one or multiple URLs in parallel, executes JavaScript via headless Chromium if needed (bypassing Cloudflare/WAF challenges), parses HTML or binary documents (PDF, DOCX, XLSX, CSV, TXT), and returns structured Markdown, HTML, Plain Text, and Extracted Links.

#### Request Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | `undefined` | Single URL to scrape (if `urls` is omitted). |
| `urls` | `string[]` | `[]` | Array of URLs to scrape in parallel batches. |
| `formats` | `string[]` | `["markdown"]` | Output formats: `"markdown"`, `"html"`, `"text"`, `"links"`, or `"all"`. |
| `renderJs` | `boolean` | `false` | When `true`, executes headless Chromium browser for JavaScript SPAs. |
| `onlyMainContent` | `boolean` | `true` | Removes boilerplate, headers, and footers; isolates primary content. |
| `blockAds` | `boolean` | `true` | Strips ads and tracker scripts from DOM. |
| `removeBase64Images`| `boolean` | `true` | Strips heavy inline base64 image URIs. |
| `includeHeader` | `boolean` | `false` | When `false`, removes `<header>` and `<nav>`. |
| `includeFooter` | `boolean` | `false` | When `false`, removes `<footer>`. |
| `includeTags` | `string[]` | `[]` | CSS selectors to extract (e.g. `["article", ".main-content"]`). |
| `excludeTags` | `string[]` | `[]` | CSS selectors to remove (e.g. `[".sidebar", "#comments"]`). |
| `headers` | `object` | `{}` | Custom HTTP headers (e.g. `{"Authorization": "Bearer ...", "Cookie": "..."}`). |
| `auth` | `object` | `null` | Basic Auth: `{"username": "...", "password": "..."}`. |
| `mobile` | `boolean` | `false` | Emulates iPhone Safari user-agent and viewport. |
| `proxyMode` | `string` | `"none"` | `"none"`, `"auto"` (free proxy pool), or `"force"`. |
| `customProxy` | `string` | `null` | Custom proxy URL (e.g. `http://user:pass@proxy.example.com:8080`). |
| `concurrency` | `number` | `5` | Maximum parallel scraping concurrency (1–15). |

---

### `POST /api/crawl`
BFS domain graph traverser that starts at a seed URL and collects internal links.

#### Request Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | **Required** | Seed starting URL. |
| `limit` | `number` | `50` | Maximum number of discovered URLs to collect (1–500). |
| `maxDiscoveryDepth`| `number` | `2` | Maximum link depth from root. |
| `allowSubdomains` | `boolean` | `true` | Traverse subdomains of the root host. |
| `allowExternalLinks`| `boolean`| `false`| Follow external domain links. |
| `includePaths` | `string[]` | `[]` | Array of path regexes or substrings that must match (e.g. `["/blog", "/docs"]`). |
| `excludePaths` | `string[]` | `[]` | Array of path regexes or substrings to exclude (e.g. `["/login", "/cart"]`). |
| `delay` | `number` | `0` | Throttling delay (ms) between crawl waves. |
| `maxConcurrency` | `number` | `10` | Parallel request concurrency. |

---

## 🛠️ Self-Hosting & Local Development

### 1. Docker Compose (Full Stack)
```bash
git clone https://github.com/shivamjadon25/WebRover.git
cd WebRover
docker compose up --build
```
- **Studio UI**: `http://localhost:8080`
- **Backend API**: `http://localhost:3000`

---

### 2. Run Backend Standalone (Node.js)
```bash
cd backend
npm install
npm start
```
Starts Express API on `http://localhost:3000`.

---

### 3. Run Frontend Standalone
The frontend is pure static HTML/CSS/JS with **zero build step**:
```bash
cd frontend
# Serve with any static web server:
npx serve -l 8080 .
# Or open index.html directly in your web browser!
```

---

## ☁️ Free Cloud Deployment Guide

| Component | Recommended Free Platform | Deployment Notes |
| :--- | :--- | :--- |
| **Backend** | [Render](https://render.com) / [Koyeb](https://www.koyeb.com) / [Railway](https://railway.app) | Select **Docker** or Node.js environment. Root directory: `backend/`. Port: `process.env.PORT`. |
| **Frontend** | [Cloudflare Pages](https://pages.cloudflare.com) / [Vercel](https://vercel.com) / [GitHub Pages](https://pages.github.com) | Framework preset: **None**. Build command: *(leave empty)*. Output directory: `frontend`. |

---

## 📄 License
100% Free and Open-Source under the [ISC License](LICENSE).
