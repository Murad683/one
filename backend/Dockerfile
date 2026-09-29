# One Agency backend — production image
#
# IMPORTANT: base image must be Debian (glibc), NOT alpine (musl).
# @ffmpeg-installer/ffmpeg and @ffprobe-installer/ffprobe ship prebuilt
# glibc binaries that silently fail (or refuse to run) on musl/alpine.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Prisma's query engine needs openssl present at generate/build time
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime stage ----
FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN groupadd -r nodeapp && useradd -r -g nodeapp -d /app -s /usr/sbin/nologin nodeapp \
    && chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 5000

# start.sh (npm start) already runs: prisma migrate deploy -> prisma generate -> node dist/index.js
CMD ["npm", "start"]
