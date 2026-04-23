# syntax=docker/dockerfile:1.7
# =============================================================================
# Scaninfoga Admin Panel — Next.js production image (bun)
# Port 3005. Multi-stage with BuildKit cache mount for bun store.
# =============================================================================

# ── Base: bun (shared by deps + builder)
FROM oven/bun:1.2.8-alpine AS base
WORKDIR /app

# ── Deps: install packages — cached unless lockfile/package.json change
FROM base AS deps
COPY package.json bun.lock ./
RUN --mount=type=cache,id=bun-store,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

# ── Builder: copy source, run next build
FROM base AS builder
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build-time public env — baked into the client bundle
ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# ── Prod-deps: re-install without dev deps for a slimmer runner
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN --mount=type=cache,id=bun-store,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

# ── Runner: minimal production image
FROM oven/bun:1.2.8-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3005 \
    HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
 && adduser  -S -u 1001 -G nodejs nextjs

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder   --chown=nextjs:nodejs /app/package.json  ./
COPY --from=builder   --chown=nextjs:nodejs /app/next.config.mjs ./
COPY --from=builder   --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder   --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3005

# --bun forces bun (not node) as the runtime for `next start`
CMD ["bun", "--bun", "run", "start"]
