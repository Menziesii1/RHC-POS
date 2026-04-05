FROM node:24-alpine
WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY apps/kiosk/package.json apps/kiosk/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

RUN npm ci
RUN npm run build --workspace @rhc-pos/shared

WORKDIR /app/apps/kiosk
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
