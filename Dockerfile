# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/false nextjs

# Copy necessary files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3005

ENV NODE_ENV=production
ENV PORT=3005

CMD ["bun", "run", "start"]
