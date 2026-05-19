# ────────────────────────────────────────────────────────────────────
# Build stage: compile the Vite static site
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first for better Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# ────────────────────────────────────────────────────────────────────
# Runtime stage: Express server serves dist/ + /api/chat proxy
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --omit=dev

COPY server.js ./
COPY --from=build /app/dist ./dist

# Railway injects $PORT; default to 3000 for local docker run
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
