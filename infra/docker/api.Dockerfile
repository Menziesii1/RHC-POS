FROM node:24-alpine
WORKDIR /app

# Only copy manifests so dependency layer is cached independently of source changes
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

# Source code is bind-mounted at runtime via docker-compose — no COPY needed here
