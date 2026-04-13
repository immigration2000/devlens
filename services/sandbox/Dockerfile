# DevLens Sandbox Service
# Manages Docker-based code execution environments

FROM node:20-alpine AS base
RUN apk add --no-cache docker-cli

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json ./
COPY ../../packages/shared/package.json ../packages/shared/package.json
RUN npm install --production=false

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY ../../packages/shared ../packages/shared
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4001

RUN addgroup --system --gid 1001 sandbox && \
    adduser --system --uid 1001 sandbox

# Copy runner image for Docker-in-Docker code execution
COPY docker/Dockerfile.runner /app/docker/Dockerfile.runner
COPY docker/runner.js /app/docker/runner.js

COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER sandbox
EXPOSE 4001

CMD ["node", "dist/index.js"]
