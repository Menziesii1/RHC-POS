FROM node:24-bookworm
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/kiosk/package.json apps/kiosk/package.json
COPY apps/kiosk-sync/package.json apps/kiosk-sync/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci
