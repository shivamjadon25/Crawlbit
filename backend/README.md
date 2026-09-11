# 🕷️ Crawlbit Backend API — Standalone Documentation

**Crawlbit Backend** is a 100% free, self-hosted, high-concurrency web scraping and domain crawling REST API. It requires **no paid subscriptions, no third-party API keys, and zero SaaS dependencies**.

You can deploy this backend as an independent microservice and consume its APIs from any frontend, backend, script, or language (Python, Node.js, Go, PHP, cURL, etc.).

---

## ⚡ Quick Start

### 1. Run with Docker (Recommended)
```bash
docker build -t crawlbit-backend .
docker run -d -p 3000:3000 --name crawlbit-backend crawlbit-backend
```

### 2. Run with Node.js
```bash
npm install
npm start
```
Server starts on: `http://localhost:3000`

### 3. Verify Health
```bash
curl http://localhost:3000/api/health
```

---

## 🔌 API Endpoints Reference

### 1. Batch / Single Web Scraper (`POST /api/scrape`)

Scrapes one or multiple URLs in parallel, executes JavaScript via headless Chromium if needed (bypassing Cloudflare challenges), parses HTML or documents (PDF, DOCX, XLSX, CSV, TXT), and returns structured Markdown, HTML, Plain Text, and Extracted Links.

* **URL**: `http://localhost:3000/api/scrape`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`

#### Request Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | `undefined` | Single URL to scrape (if `urls` is omitted). |
| `urls` | `string[]` | `[]` | Array of URLs to scrape in parallel batches. |
| `formats` | `string[]` | `["markdown"]` | Desired output formats: `"markdown"`, `"html"`, `"text"`, `"links"`, or `"all"`. |
| `renderJs` | `boolean` | `false` | When `true`, runs full headless Chromium browser for JavaScript-rendered SPAs. Auto-triggers on Cloudflare challenges. |
| `onlyMainContent` | `boolean` | `true` | Drops boilerplate, headers, and footers; extracts `<main>` or `<article>`. |
| `blockAds` | `boolean` | `true` | Removes advertising and tracker DOM nodes. |
| `removeBase64Images`| `boolean` | `true` | Strips heavy inline base64 data URIs. |
| `includeHeader` | `boolean` | `false` | When `false`, removes `<header>` and `<nav>`. |
| `includeFooter` | `boolean` | `false` | When `false`, removes `<footer>`. |
| `includeTags` | `string[]` | `[]` | CSS selectors to isolate (e.g. `["article", ".post-body"]`). |
| `excludeTags` | `string[]` | `[]` | CSS selectors to remove (e.g. `[".sidebar", "#comments"]`). |
| `headers` | `object` | `{}` | Custom request headers (e.g. `{"Authorization": "Bearer ...", "Cookie": "..."}`). |
| `auth` | `object` | `null` | Basic Auth credentials: `{"username": "admin", "password": "secret"}`. |
| `mobile` | `boolean` | `false` | Emulates iPhone Safari mobile user-agent and viewport. |
| `proxyMode` | `string` | `"none"` | `"none"` (direct), `"auto"` (free proxy pool with auto-fallback), or `"force"`. |
| `customProxy` | `string` | `null` | Custom proxy URL (e.g. `http://user:pass@proxy.example.com:8080`). |
| `concurrency` | `number` | `5` | Maximum parallel scraping concurrency (1–15). |

---

#### Example Payload (JSON)
```json
{
  "urls": [
    "https://example.com",
    "https://news.ycombinator.com"
  ],
  "formats": ["markdown", "html", "text", "links"],
  "onlyMainContent": true,
  "blockAds": true,
  "renderJs": false
}
```

#### Example Response (JSON)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "metadata": {
        "title": "Example Domain",
        "url": "https://example.com",
        "status": 200,
        "scrapedAt": "2026-09-11T04:15:20.000Z",
        "contentType": "text/html; charset=utf-8"
      },
      "markdown": "# Example Domain\n\nThis domain is for use in documentation examples...",
      "html": "<main><h1>Example Domain</h1><p>...</p></main>",
      "text": "Example Domain This domain is for use in documentation...",
      "links": [
        {
          "text": "Learn more",
          "href": "https://iana.org/domains/example"
        }
      ]
    }
  ]
}
```

---

### 2. Domain Graph BFS Crawler (`POST /api/crawl`)

Starts at a seed URL and traverses domain internal links using breadth-first search (BFS).

* **URL**: `http://localhost:3000/api/crawl`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`

#### Request Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | **Required** | Seed starting URL. |
| `limit` | `number` | `50` | Maximum number of discovered URLs to collect (1–500). |
| `maxDiscoveryDepth`| `number` | `2` | Maximum link depth from root. |
| `allowSubdomains` | `boolean` | `true` | Follow subdomains of the root host. |
| `allowExternalLinks`| `boolean`| `false`| Follow external domain links. |
| `includePaths` | `string[]` | `[]` | Regex or substring path patterns that must match (e.g. `["/blog", "/docs"]`). |
| `excludePaths` | `string[]` | `[]` | Regex or substring path patterns to skip (e.g. `["/login", "/admin"]`). |
| `delay` | `number` | `0` | Throttling delay (ms) between crawl waves. |
| `maxConcurrency` | `number` | `10` | Parallel request concurrency during traversal. |
| `auth` | `object` | `null` | Basic Auth credentials if crawling protected areas. |

#### Example Request (cURL)
```bash
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "limit": 25,
    "maxDiscoveryDepth": 2,
    "allowSubdomains": true
  }'
```

#### Example Response (JSON)
```json
{
  "success": true,
  "data": {
    "seedUrl": "https://example.com",
    "total": 5,
    "durationMs": 320,
    "urls": [
      "https://example.com",
      "https://example.com/about",
      "https://example.com/contact"
    ],
    "details": [
      { "url": "https://example.com", "depth": 0, "discoveredAt": "..." },
      { "url": "https://example.com/about", "depth": 1, "discoveredAt": "..." }
    ]
  }
}
```

---

## 💻 Code Examples (Consuming in Any Language)

### Python
```python
import requests

url = "http://localhost:3000/api/scrape"
payload = {
    "urls": ["https://news.ycombinator.com"],
    "formats": ["markdown", "links"],
    "onlyMainContent": True
}

response = requests.post(url, json=payload)
data = response.json()

for page in data["data"]:
    print(f"Title: {page['metadata']['title']}")
    print(f"Markdown:\n{page['markdown']}")
```

---

### JavaScript / TypeScript (Node.js & Browser)
```javascript
const response = await fetch('http://localhost:3000/api/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    urls: ['https://example.com'],
    formats: ['markdown', 'html', 'links'],
    renderJs: true // For SPAs & Cloudflare protected sites
  })
});

const result = await response.json();
console.log(result.data[0].markdown);
```

---

### cURL
```bash
curl -s -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","formats":["markdown"]}'
```

---

### Go
```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"io/ioutil"
)

func main() {
	payload := map[string]interface{}{
		"urls": []string{"https://example.com"},
		"formats": []string{"markdown"},
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post("http://localhost:3000/api/scrape", "application/json", bytes.NewBuffer(body))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	respBody, _ := ioutil.ReadAll(resp.Body)
	fmt.Println(string(respBody))
}
```

---

## 📄 License
100% Free and Open Source under the ISC License.
