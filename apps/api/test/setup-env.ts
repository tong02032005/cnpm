// Integration test chạy trên PostgreSQL thật, database riêng (bị xóa sạch mỗi file test).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://brewlite:brewlite@localhost:5432/brewlite_test';
process.env.JWT_SECRET = 'test-secret';
