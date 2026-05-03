FROM node:24-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/hosted/package.json apps/hosted/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/react/package.json packages/react/package.json

RUN npm ci

COPY . .

RUN npm run build:hosted

ENV NODE_ENV=production

CMD ["sh", "-c", "npm run start --workspace @a5omic/flowdown-hosted -- -H 0.0.0.0 -p ${PORT:-8080}"]
