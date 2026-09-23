FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
COPY infra/package.json ./infra/package.json
COPY packages ./packages
RUN npm ci
RUN npm run build:contracts && npm run build -w @app/frontend

FROM caddy:2.11.4-alpine@sha256:de23def33b17fb5d1290b0f6c2add1d70780e52341896c00a4c8a2a2fe9d355e

COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
EXPOSE 80 443
