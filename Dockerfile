# Build stage
FROM oven/bun:slim AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Production stage - minimal image
FROM oven/bun:slim AS runner

WORKDIR /app

# Remove potentially dangerous tools
RUN apt-get update && \
    apt-get remove -y --allow-remove-essential wget curl && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    rm -rf /usr/bin/wget /usr/bin/curl 2>/dev/null || true

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["bun", "server.js"]
