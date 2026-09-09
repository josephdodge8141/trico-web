FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
COPY infra/package.json ./infra/package.json
COPY packages ./packages
RUN npm ci
RUN npm run build:contracts && npm run build -w @app/frontend

FROM caddy:2.10-alpine

COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/frontend/dist /srv
EXPOSE 80 443
