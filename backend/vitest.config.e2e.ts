import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Các file test dùng chung một database test → chạy lần lượt
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
