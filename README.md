<<<<<<< Updated upstream
# WaterCrawl (WebRover) — Pro Stealth Scraper & Crawler IDE

WaterCrawl (also known as WebRover) is an optimized, high-concurrency batch crawling and web scraping module built with Node.js and Express. It features stealth request mechanics (User-Agent emulation, proxy rotation, and custom header synthesis via Curl) to bypass common scraping protections, and exposes a beautiful, built-in light/dark theme web dashboard IDE to inspect results in real-time.
=======
# 🕷️ Crawlbit — High-Performance Stealth Web Scraper & Crawler Suite

**Crawlbit** is an enterprise-grade, high-concurrency web scraping and domain crawling engine built with Node.js, Express, and a minimalist, distraction-free modern web dashboard.

---

## ⚡ Architecture Overview

Crawlbit is decoupled into two independent services:

```
Crawlbit/
├── backend/                  # Node.js Express REST API & Stealth Engine
│   ├── src/
│   │   ├── routes/           # REST endpoints (/api/scrape, /api/crawl, /api/health)
│   │   ├── services/         # Scraper, Crawler, and Stealth Fetcher
│   │   ├── utils/            # HTML to Markdown and URL resolvers
│   │   └── server.js         # Server entrypoint
│   ├── Dockerfile            # Standalone Backend Dockerfile
│   └── package.json
│
├── frontend/                 # Minimalist & Functional Web Dashboard
│   ├── index.html            # Clean responsive interface
│   ├── style.css             # Linear/Vercel-inspired design system
│   ├── app.js                # Client controller & API connector
│   ├── nginx.conf            # Production Nginx reverse proxy configuration
│   └── Dockerfile            # Standalone Frontend Dockerfile
│
├── docker-compose.yml        # Orchestration for multi-container deployment
└── README.md
```
>>>>>>> Stashed changes

---

## 🚀 Key Features

<<<<<<< Updated upstream
- **Multi-URL Parallel Scraping**: Run batch scraping across multiple targets in parallel with automatic request throttling (limited to 5 concurrent requests).
- **Stealth Request Architecture**: Emulates premium browsers with stealth User-Agents and routes requests through a rotating free proxy pool (`FREE_PROXIES`).
- **Flexible Data Extraction Formats**: Retrieve parsed contents as:
  - **Markdown**: Formatted HTML-to-Markdown conversion.
  - **HTML**: Cleaned DOM subtree.
  - **Plain Text**: Unstructured text data.
  - **Links**: Array of extracted anchors with resolved absolute URLs.
- **Support for Non-HTML Documents**:
  - **PDF**: Automatic conversion to raw text / structured paragraphs using `pdftotext`.
  - **Word Documents (`.doc`, `.docx`)**: Extraction via `mammoth`.
  - **Excel Spreadsheets (`.xls`, `.xlsx`)**: Extraction via `xlsx` (SheetJS) formatted directly into Markdown tables.
  - **CSV / TXT**: Direct raw text parsing.
- **Content Sanitization**: Optional filters to strip out ads (`blockAds`), ignore base64 inline images, drop headers/footers, and include or exclude specific CSS selectors.
- **Deep BFS Web Crawler**:
  - Custom limits on discovered URLs and max traversal depth.
  - Granular control over subdomain crawling and external link permissions.
  - Regex or path-based URL inclusions/exclusions.
  - Configuration of crawl delay to avoid rate-limiting.
- **Modern UI Dashboard**: Direct visualization of scraping configurations, interactive markdown viewer, raw HTML explorer, JSON previewer, and theme toggling.

---

## 🛠️ System Prerequisites

For PDF document parsing, the application invokes the system `pdftotext` CLI utility. Please install it on your server environment:

- **Debian/Ubuntu**:
  ```bash
  sudo apt-get update
  sudo apt-get install poppler-utils
  ```
- **macOS (via Homebrew)**:
  ```bash
  brew install poppler
  ```
- **Windows**:
  Download Poppler for Windows and ensure the `bin/` folder is appended to your system's `PATH`.

---

## 📦 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/shivamjadon25/WebRover.git
   cd WebRover
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

---

## 🚦 Usage

Start the server using:

```bash
node app.js
```

The application will start, listening on port `3000`:
```text
🚀 WaterCrawl listening on port 3000
```

Open your browser and navigate to **`http://localhost:3000`** to access the Web IDE Dashboard.
=======
- **Multi-URL Parallel Scraping**: Concurrent batch scraping with rate limiting.
- **Stealth Request Architecture**: User-Agent emulation (Desktop & Mobile) and rotating free proxy pools via Curl.
- **Multi-Format Extraction**:
  - **Formatted Markdown**: Clean HTML-to-Markdown with table and code support.
  - **Clean HTML**: Sanitized DOM subtree.
  - **Plain Text**: Unstructured text data.
  - **Extracted Links**: Anchor texts with fully-resolved absolute URLs.
- **Non-HTML Document Parsing**:
  - **PDF Documents**: Automatic text and paragraph extraction via `pdftotext`.
  - **Word Documents (`.docx`, `.doc`)**: Extraction via `mammoth`.
  - **Excel Spreadsheets (`.xlsx`, `.xls`)**: Tabular conversion to Markdown tables via `xlsx`.
  - **CSV / TXT**: Direct raw parsing.
- **Content Sanitization**: Ad blocking, base64 image removal, header/footer stripping, and custom CSS selector inclusion/exclusion.
- **Deep BFS Domain Crawler**:
  - Configurable traversal limits and discovery depth.
  - Granular subdomain and external domain controls.
  - Regex or path-based inclusion/exclusion filtering.
  - Throttling delay between crawl waves.
- **Redesigned Minimalist UI**:
  - Dark / Light mode toggle.
  - Live backend connection status badge with latency ping.
  - Configurable Backend API endpoint modal.
  - Formatted Markdown preview, Raw code view, Link Explorer, and Collapsible JSON Tree.
  - One-click copy and export to `.md`, `.json`, `.csv`, and `.html`.

---

## 🐳 Docker Deployment

You can deploy the Backend and Frontend together using Docker Compose, or deploy them separately into standalone containers.

### Option 1: Full Stack via Docker Compose (Recommended)

```bash
docker compose up -d --build
```

- **Frontend UI**: [http://localhost:8080](http://localhost:8080)
- **Backend API**: [http://localhost:3000](http://localhost:3000)

To stop the containers:
```bash
docker compose down
```

---

### Option 2: Deploy Separately (Independent Containers)

#### 1. Backend Container
```bash
cd backend
docker build -t crawlbit-backend .
docker run -d -p 3000:3000 --name crawlbit-backend crawlbit-backend
```
Verify the backend is live:
```bash
curl http://localhost:3000/api/health
```

#### 2. Frontend Container
```bash
cd frontend
docker build -t crawlbit-frontend .
docker run -d -p 8080:80 --name crawlbit-frontend crawlbit-frontend
```
Open [http://localhost:8080](http://localhost:8080) in your browser. If your backend is hosted on a different host or port, click the connection badge in the top right to configure the API URL.

---

## 💻 Local Development Setup

### 1. Prerequisites
- **Node.js**: v16+ (v18 or v20 recommended)
- **System tools for PDF parsing**:
  - **Debian/Ubuntu**: `sudo apt-get install poppler-utils curl`
  - **macOS**: `brew install poppler curl`

### 2. Start Backend
```bash
cd backend
npm install
npm start
```
Backend runs on `http://localhost:3000`.

### 3. Start Frontend
You can open `frontend/index.html` directly in your browser or serve it using any static server:
```bash
cd frontend
npx serve -l 8080 .
```
>>>>>>> Stashed changes

---

## 🔌 API Reference

<<<<<<< Updated upstream
### 1. Batch Scrape Page(s)
Extract content and documents from one or many web addresses.

* **Endpoint**: `POST /api/scrape`
* **Content-Type**: `application/json`
* **Sample Payload**:
=======
### 1. Health Check
* **Endpoint**: `GET /api/health`
* **Response**:
  ```json
  {
    "success": true,
    "service": "crawlbit-backend",
    "version": "2.0.0",
    "status": "healthy",
    "uptime": 45.2
  }
  ```

---

### 2. Batch Scrape Page(s)
* **Endpoint**: `POST /api/scrape`
* **Content-Type**: `application/json`
* **Payload**:
>>>>>>> Stashed changes
  ```json
  {
    "urls": ["https://example.com/blog", "https://example.com/about"],
    "formats": ["markdown", "html", "text", "links"],
    "proxyMode": "auto",
<<<<<<< Updated upstream
=======
    "mobile": false,
>>>>>>> Stashed changes
    "onlyMainContent": true,
    "blockAds": true,
    "removeBase64Images": true,
    "includeHeader": false,
    "includeFooter": false,
    "excludeTags": [".sidebar", "#ads"],
    "includeTags": ["main", "article"],
<<<<<<< Updated upstream
=======
    "headers": {
      "Custom-Header": "Value"
    },
>>>>>>> Stashed changes
    "auth": {
      "username": "admin",
      "password": "password"
    }
  }
  ```
<<<<<<< Updated upstream
* **Parameters**:
  - `url` (String): A single URL to scrape (fallback if `urls` is omitted).
  - `urls` (Array of Strings): List of URLs to scrape in parallel batches.
  - `formats` (Array): Choose from `"markdown"`, `"html"`, `"text"`, `"links"`.
  - `proxyMode` (String): `"none"`, `"auto"`, or `"force"`.
  - `onlyMainContent` (Boolean): Falls back to first `<main>` or `<article>` element. Default is `true`.
  - `blockAds` (Boolean): Removes components matching ad classes/IDs.
  - `auth` (Object): Basic authentication details (`username`, `password`) if required.

---

### 2. Crawl Domain Links
Discover internal links starting from a seed URL.

* **Endpoint**: `POST /api/crawl`
* **Content-Type**: `application/json`
* **Sample Payload**:
=======

---

### 3. Crawl Domain Links
* **Endpoint**: `POST /api/crawl`
* **Content-Type**: `application/json`
* **Payload**:
>>>>>>> Stashed changes
  ```json
  {
    "url": "https://example.com",
    "limit": 50,
    "maxDiscoveryDepth": 2,
    "allowExternalLinks": false,
    "allowSubdomains": true,
<<<<<<< Updated upstream
    "excludePaths": ["/login", "/checkout"],
    "includePaths": ["/blog"],
    "delay": 100,
    "maxConcurrency": 10
  }
  ```
* **Parameters**:
  - `url` (String): Starting seed URL.
  - `limit` (Number): Maximum number of URLs to crawl. Default is `50`.
  - `maxDiscoveryDepth` (Number): Maximum BFS depth level. Default is `2`.
  - `allowExternalLinks` (Boolean): Allow scanning external domains. Default is `false`.
  - `allowSubdomains` (Boolean): Traverse subdomains of the base host. Default is `true`.
  - `excludePaths` (Array of Strings): Path patterns to skip.
  - `includePaths` (Array of Strings): Path patterns that must be matched.
  - `delay` (Number): Throttling delay in milliseconds between crawl waves.

---

### 3. Test Authentication Endpoint
Simple route to verify the custom basic auth credentials scraper config.

* **Endpoint**: `GET /test-auth`
* **Credentials**: Basic Auth username `admin` and password `password`.
=======
    "excludePaths": ["/login", "/cart"],
    "includePaths": ["/blog"],
    "delay": 100,
    "maxConcurrency": 5
  }
  ```
>>>>>>> Stashed changes

---

## 📄 License
<<<<<<< Updated upstream
Distributed under the ISC License. See `package.json` for details.
=======
Distributed under the ISC License.
>>>>>>> Stashed changes
