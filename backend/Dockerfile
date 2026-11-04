# Backend NestJS + Prisma. Build context: thư mục backend/
FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
# Cài thư viện trước (tận dụng cache); postinstall chạy prisma generate nên cần schema + config
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s CMD wget -qO- http://localhost:3001/health || exit 1
# Khởi động: tạo/cập nhật bảng → thêm dữ liệu mẫu (bỏ qua nếu đã có) → chạy API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/seed.js && node dist/main.js"]
