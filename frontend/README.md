# 🎨 Crawlbit Studio Frontend

**Crawlbit Studio** is a minimalist, modern, and high-visibility web dashboard for the Crawlbit web scraper and crawler engine.

---

## ✨ Features
- **Clean Architectural Aesthetic**: High-visibility light mode by default with instant dark mode toggle.
- **Omni Command Bar**: Quick execution of single or multi-URL scrapes (`Enter` hotkey) and domain graph crawling.
- **Slide-out Parameter Matrix**: Configure output formats, ad-blocking, inline image removal, stealth proxies, and JavaScript rendering.
- **Multi-Target Inspection Stage**:
  - **Rendered Document View**: Typography-first reading view with styled tables, headings, and blockquotes.
  - **Raw Markdown & HTML**: Clean syntax code viewports.
  - **Links Matrix**: Interactive link explorer with 1-click copy.
  - **JSON Tree**: Interactive collapsible JSON payload inspector.
- **Export Formats**: One-click download as `.md`, `.json`, `.html`, and `.csv`.
- **Configurable Backend Host**: Connect to any local or remote Crawlbit Backend API container.

---

## 🚀 Deployment & Running

### Option 1: Standalone Docker (Nginx Alpine)
```bash
docker build -t crawlbit-frontend .
docker run -d -p 8080:80 --name crawlbit-frontend crawlbit-frontend
```
Open **`http://localhost:8080`** in your browser.

---

### Option 2: Local Static Serving
You can open `index.html` directly in any web browser, or serve it using any lightweight static server:
```bash
npx serve -l 8080 .
```

---

## ⚙️ Connecting to Backend API

By default, Crawlbit Studio connects to `http://localhost:3000`.

To change the backend API endpoint:
1. Click the status badge in the top-right corner (`● localhost:3000`).
2. Enter your custom backend API URL (e.g. `http://my-server-ip:3000` or `https://api.example.com`).
3. Click **Ping** to test connection, then **Save & Connect**.

---

## ⌨️ Keyboard Shortcuts
- `Enter` (in URL input): Run scraper / crawler
- `Cmd + K` or `Ctrl + K`: Focus omni command bar
- `Tab`: Toggle Parameters Drawer
- `Alt + 1`: Switch to Scraper mode
- `Alt + 2`: Switch to Crawler mode

---

## 📄 License
ISC License
