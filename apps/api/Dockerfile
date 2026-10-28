# Build context: thư mục gốc repo (docker build -f apps/api/Dockerfile .)
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter api
COPY apps/api apps/api
RUN pnpm --filter api build

ARG GIT_SHA=dev
ENV GIT_SHA=$GIT_SHA NODE_ENV=production PORT=3001
WORKDIR /repo/apps/api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3001/health || exit 1
# Chạy migration (mỗi migration một transaction) rồi mới khởi động API
CMD ["sh", "-c", "node dist/migrate.js && node dist/main.js"]
