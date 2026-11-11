FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
COPY infra/package.json ./infra/package.json
COPY packages ./packages
COPY vendor ./vendor
RUN npm ci
RUN npm run build:contracts && npm run build -w @app/frontend

FROM caddy:2.11.4-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b

RUN apk upgrade --no-cache && apk add --no-cache --upgrade 'zlib>=1.3.2-r1'
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
EXPOSE 80 443
