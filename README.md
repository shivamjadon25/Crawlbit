# WaterCrawl (WebRover) — Pro Stealth Scraper & Crawler IDE

WaterCrawl (also known as WebRover) is an optimized, high-concurrency batch crawling and web scraping module built with Node.js and Express. It features stealth request mechanics (User-Agent emulation, proxy rotation, and custom header synthesis via Curl) to bypass common scraping protections, and exposes a beautiful, built-in light/dark theme web dashboard IDE to inspect results in real-time.

---

## 🚀 Key Features

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

---

## 🔌 API Reference

### 1. Batch Scrape Page(s)
Extract content and documents from one or many web addresses.

* **Endpoint**: `POST /api/scrape`
* **Content-Type**: `application/json`
* **Sample Payload**:
  ```json
  {
    "urls": ["https://example.com/blog", "https://example.com/about"],
    "formats": ["markdown", "html", "text", "links"],
    "proxyMode": "auto",
    "onlyMainContent": true,
    "blockAds": true,
    "removeBase64Images": true,
    "includeHeader": false,
    "includeFooter": false,
    "excludeTags": [".sidebar", "#ads"],
    "includeTags": ["main", "article"],
    "auth": {
      "username": "admin",
      "password": "password"
    }
  }
  ```
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
  ```json
  {
    "url": "https://example.com",
    "limit": 50,
    "maxDiscoveryDepth": 2,
    "allowExternalLinks": false,
    "allowSubdomains": true,
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

---

## 📄 License
Distributed under the ISC License. See `package.json` for details.
