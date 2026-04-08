FROM node:24-alpine
WORKDIR /app

# Only copy manifests so dependency layer is cached independently of source changes
COPY package.json package-lock.json ./
COPY apps/kiosk/package.json apps/kiosk/package.json
COPY packages/shared/package.json packages/shared/package.json

# Stub out missing workspaces so npm ci can resolve the full tree
RUN mkdir -p apps/api apps/kiosk-sync && \
    echo '{"name":"@rhc-pos/api","version":"0.1.0"}' > apps/api/package.json && \
    echo '{"name":"@rhc-pos/kiosk-sync","version":"0.1.0"}' > apps/kiosk-sync/package.json && \
    npm ci

# Source code is bind-mounted at runtime via docker-compose — no COPY needed here
