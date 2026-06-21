# Student Management API — production image
FROM node:20-bookworm-slim AS base

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ libcairo2-dev libjpeg-dev libpango1.0-dev libgif-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=5103

EXPOSE 5103

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5103)+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node

CMD ["node", "src/server.js"]