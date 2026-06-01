# ────────────────────────────────────────────────────────────────────
# Build stage: compile both the Vite SPA bundle and the Express server
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

# Install deps first for better Docker layer caching
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build (cache bust: 2026-06-01)
COPY . .
# Frontend: tsc -b runs the project references (app + node), vite emits dist/
RUN npx tsc -b && npx vite build
# Backend: tsc -p tsconfig.server.json emits dist-server/ (NodeNext modules)
RUN npx tsc -p tsconfig.server.json

# ────────────────────────────────────────────────────────────────────
# Runtime stage: Express v2 server serves /api/* + /webhooks/* + SPA
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --omit=dev

# Server JS lives in dist-server/, Vite SPA in dist/. server/index.ts resolves
# dist/ relative to its own location, so dist-server/ + dist/ must be siblings.
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/dist ./dist
COPY --from=build /app/seeds ./seeds
# Auto-bootstrap on container start needs raw migration SQL + drizzle journal.
COPY --from=build /app/server/db/migrations ./server/db/migrations

# Railway injects $PORT; default to 3000 for local docker run.
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist-server/index.js"]
