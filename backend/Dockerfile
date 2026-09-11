# Crawlbit Backend Dockerfile
FROM node:20-bookworm-slim

# Install system dependencies:
# - curl: for ultra-fast stealth HTTP requests
# - poppler-utils: for pdftotext document parsing
# - chromium: for headless browser JavaScript & Cloudflare challenge rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    poppler-utils \
    chromium \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production || npm install --only=production

# Copy application source code
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
