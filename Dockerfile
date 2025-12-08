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

# Create non-root user and clean up
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/false nextjs && \
    rm -rf /usr/bin/wget /usr/bin/curl 2>/dev/null || true

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
