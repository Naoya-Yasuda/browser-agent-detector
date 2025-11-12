const { migrateDb } = require('../app/lib/db.js');

async function runMigration() {
  try {
    console.log('データベースマイグレーションを開始します...');
    await migrateDb();
    console.log('データベースマイグレーションが完了しました。');
  } catch (error) {
    console.error('マイグレーションエラー:', error);
    process.exit(1);
  }
}

runMigration();
