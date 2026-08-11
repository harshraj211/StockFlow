FROM node:22-alpine AS build

RUN apk add --no-cache libc6-compat openssl \
  && corepack enable \
  && corepack prepare pnpm@11.16.0 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend
RUN pnpm --filter backend build

FROM node:22-alpine AS runtime

RUN apk add --no-cache libc6-compat openssl \
  && corepack enable \
  && corepack prepare pnpm@11.16.0 --activate

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app

EXPOSE 4000
CMD ["pnpm", "--filter", "backend", "start"]
