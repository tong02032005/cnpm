// Nạp apps/api/.env khi chạy local; trên production biến môi trường do nền tảng cung cấp.
try {
  process.loadEnvFile();
} catch {
  // không có .env: dùng biến môi trường sẵn có
}
