FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune api --docker

# Installer stage
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install -g turbo prisma@5.20.0

# First copy dependency files for caching
COPY --from=builder /app/out/json/ .
COPY package-lock.json ./
RUN npm install --legacy-peer-deps

# Copy full source and built assets
COPY --from=builder /app/out/full/ .

# Generate Prisma client
RUN cd packages/database && npx prisma generate
RUN cp -r packages/database/node_modules/.prisma /app/node_modules/ && \
    cp -r packages/database/node_modules/@prisma /app/node_modules/ && \
    mkdir -p /app/apps/api/node_modules && \
    cp -r packages/database/node_modules/.prisma /app/apps/api/node_modules/ && \
    cp -r packages/database/node_modules/@prisma /app/apps/api/node_modules/

# Build the project
RUN turbo run build --filter=api...
RUN cp -rn /app/apps/api/node_modules/* /app/node_modules/ 2>/dev/null || true

# Production runner stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_PATH=/app/node_modules:/app/apps/api/node_modules

# Copy built package artifacts
COPY --from=installer /app/apps/api/dist ./dist
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/api/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/main"]
