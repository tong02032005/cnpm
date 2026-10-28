import dataSource from './data-source';

// Chạy migration trước khi API khởi động (dùng trong Docker và production).
async function main() {
  await dataSource.initialize();
  const done = await dataSource.runMigrations({ transaction: 'each' });
  console.log(`Migrations applied: ${done.length}`);
  await dataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
