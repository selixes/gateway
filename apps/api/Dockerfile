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

# First copy dependency files for caching
COPY --from=builder /app/out/json/ .
COPY package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy full source and built assets
COPY --from=builder /app/out/full/ .

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build the project
RUN npx turbo run build --filter=api...

# Production runner stage
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app
ENV NODE_ENV=production

# Copy built package artifacts
COPY --from=installer /app/apps/api/dist ./dist
COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/main"]
