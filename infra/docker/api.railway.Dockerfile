FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace @rhc-pos/shared \
 && npm run prisma:generate --workspace @rhc-pos/api \
 && npm run build --workspace @rhc-pos/api

ENV NODE_ENV=production

CMD ["npm", "run", "start", "--workspace", "@rhc-pos/api"]
