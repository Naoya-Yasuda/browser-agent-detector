const { readdirSync, existsSync } = require('fs');
const { join } = require('path');
const { spawnSync } = require('child_process');

const PNPM_DIR = join(process.cwd(), 'node_modules', '.pnpm');

function resolveSqliteDir() {
  if (!existsSync(PNPM_DIR)) {
    throw new Error('node_modules/.pnpm が存在しません。`pnpm install` を先に実行してください。');
  }

  const match = readdirSync(PNPM_DIR).find((entry) => entry.startsWith('sqlite3@'));
  if (!match) {
    throw new Error('sqlite3 の依存が見つかりません。インストールが正しく完了しているか確認してください。');
  }

  const target = join(PNPM_DIR, match, 'node_modules', 'sqlite3');
  if (!existsSync(target)) {
    throw new Error(`期待した sqlite3 ディレクトリが存在しません: ${target}`);
  }

  return target;
}

function runPrebuild(targetDir) {
  const result = spawnSync('npx', ['--yes', 'prebuild-install', '-r', 'napi'], {
    cwd: targetDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error('prebuild-install の実行に失敗しました。ログを確認してください。');
  }
}

try {
  const sqliteDir = resolveSqliteDir();
  console.log(`sqlite3 bindings を構築します: ${sqliteDir}`);
  runPrebuild(sqliteDir);
  console.log('sqlite3 bindings の構築が完了しました。');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
