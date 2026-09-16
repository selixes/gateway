FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune web --docker

# Installer stage
FROM node:20-alpine AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY --from=builder /app/out/full/ .

# Build web app
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ENV NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN

RUN npx turbo run build --filter=web...

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone files
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
