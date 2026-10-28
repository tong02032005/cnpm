# Build context: thư mục gốc repo (docker build -f apps/web/Dockerfile .)
FROM node:22-alpine
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web

# Next.js nhúng NEXT_PUBLIC_* vào bundle lúc build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter web build

WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]
