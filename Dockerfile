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
# Runtime stage: serve dist/ via the lightweight `serve` binary
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Only the static output is needed at runtime
COPY --from=build /app/dist ./dist

# Pre-install `serve` globally so the runtime image stays small
RUN npm install -g serve@14

# Railway injects $PORT; default to 3000 for local docker run
ENV PORT=3000
EXPOSE 3000

# `-s` enables SPA fallback (any unknown path → index.html)
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT}"]
