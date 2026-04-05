FROM node:24-alpine AS base
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

RUN npm ci
RUN npm run prisma:generate --workspace @rhc-pos/api
RUN npm run build --workspace @rhc-pos/shared
RUN npm run build --workspace @rhc-pos/api

WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
