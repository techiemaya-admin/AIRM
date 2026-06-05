# ─────────────────────────────────────────────
# Stage 1: Install production dependencies
# ─────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /usr/src/app

# Copy package manifests and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /usr/src/app

# Install Chromium/Puppeteer system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy installed node_modules from deps stage
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy application source
COPY . .

# Cloud Run injects PORT at runtime — default to 8080 (Cloud Run standard)
ENV PORT=8080
ENV NODE_ENV=production

# Puppeteer: skip downloading Chromium (we rely on system Chrome or skip)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Cloud Run requires the container to listen on $PORT
EXPOSE 8080

# Start the server
CMD ["node", "server.js"]
