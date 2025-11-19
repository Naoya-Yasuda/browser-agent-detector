# Vercel環境でのSQLite利用オプション

VercelでSQLiteを使う場合の選択肢と、それぞれのメリット・デメリットをまとめます。

## オプション比較表

| ソリューション | 読み取り | 書き込み | コスト | 複雑さ | 推奨度 |
|--------------|---------|---------|--------|--------|-------|
| Turso (libSQL) | ✅ | ✅ | Free tier有 | 低 | ⭐⭐⭐⭐⭐ |
| Cloudflare D1 | ✅ | ✅ | Free tier有 | 中 | ⭐⭐⭐⭐ |
| Vercel Postgres | ✅ | ✅ | $20/月〜 | 低 | ⭐⭐⭐⭐⭐ |
| Supabase | ✅ | ✅ | Free tier有 | 低 | ⭐⭐⭐⭐⭐ |
| 読み取り専用SQLite | ✅ | ❌ | 無料 | 低 | ⭐⭐ |

---

## オプション1: Turso (libSQL) 【最も推奨】

**Turso**は、SQLite互換のクラウドデータベースで、Vercelとの相性が最高です。

### 特徴:
- ✅ SQLiteの文法がそのまま使える
- ✅ Edge環境で超高速(レイテンシ < 50ms)
- ✅ 既存のSQLiteコードの移行が簡単
- ✅ Free tier: 500 databases, 9GB storage, 1B row reads
- ✅ 自動スケーリング
- ✅ マルチリージョンレプリケーション

### セットアップ手順:

#### 1. Tursoアカウント作成

```bash
# Turso CLIインストール
brew install tursodatabase/tap/turso

# または
curl -sSfL https://get.tur.so/install.sh | bash

# ログイン
turso auth login
```

#### 2. データベース作成

```bash
# データベース作成
turso db create browser-agent-detector --location nrt

# 接続URLとトークン取得
turso db show browser-agent-detector
turso db tokens create browser-agent-detector
```

#### 3. スキーマ適用

```bash
# ローカルのSQLiteデータをTursoにマイグレーション
turso db shell browser-agent-detector < schema.sql
```

#### 4. Next.jsアプリに統合

`apps/ecommerce-site/package.json` に追加:

```json
{
  "dependencies": {
    "@libsql/client": "^0.4.0"
  }
}
```

`apps/ecommerce-site/app/lib/turso.ts` を作成:

```typescript
import { createClient } from '@libsql/client';

export const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 使用例
export async function getUsers() {
  const result = await turso.execute('SELECT * FROM users');
  return result.rows;
}

export async function createUser(email: string, passwordHash: string) {
  const result = await turso.execute({
    sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    args: [email, passwordHash],
  });
  return result;
}
```

#### 5. 環境変数設定

`.env.local`:
```bash
TURSO_DATABASE_URL=libsql://browser-agent-detector-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

Vercel Dashboard > Environment Variables:
```bash
TURSO_DATABASE_URL=libsql://browser-agent-detector-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

#### 6. 既存コードの置き換え

`apps/ecommerce-site/app/lib/db.ts`:

```typescript
// Before (SQLite)
import Database from 'better-sqlite3';
const db = new Database('ecommerce-db.sqlite');

// After (Turso)
import { turso } from './turso';

// Sync API → Async API に変更
// db.prepare('SELECT * FROM users').all()
// ↓
// await turso.execute('SELECT * FROM users')
```

### メリット:
- 🚀 SQLiteからの移行が最も簡単
- 💰 Free tierが非常に寛大
- ⚡ Vercel Edgeで動作可能
- 🌏 グローバルレプリケーション

### デメリット:
- 🔄 Sync API → Async APIへの書き換えが必要
- 📚 PostgreSQLより機能が少ない(トリガー、ビューなど制限あり)

---

## オプション2: Cloudflare D1

**Cloudflare D1**は、CloudflareのEdge SQLiteデータベースです。

### 特徴:
- ✅ SQLite互換
- ✅ Cloudflare Workers統合
- ✅ Free tier: 5GB storage, 5M reads/day
- ⚠️ Vercelからの利用には追加設定が必要

### セットアップ手順:

#### 1. D1データベース作成

```bash
# Wrangler CLIインストール
npm install -g wrangler

# ログイン
wrangler login

# D1データベース作成
wrangler d1 create browser-agent-detector

# スキーマ適用
wrangler d1 execute browser-agent-detector --file=./schema.sql
```

#### 2. Cloudflare Workers APIの作成

D1はCloudflare Workers経由でアクセスする必要があるため、APIを作成:

```typescript
// workers/api/src/index.ts
export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/users' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT * FROM users').all();
      return Response.json(results);
    }

    if (pathname === '/api/users' && request.method === 'POST') {
      const body = await request.json();
      await env.DB.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
        .bind(body.email, body.passwordHash)
        .run();
      return Response.json({ success: true });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

#### 3. Next.jsから呼び出し

```typescript
// apps/ecommerce-site/app/lib/d1-client.ts
const D1_API_URL = process.env.D1_API_URL!;

export async function getUsers() {
  const response = await fetch(`${D1_API_URL}/api/users`);
  return response.json();
}

export async function createUser(email: string, passwordHash: string) {
  const response = await fetch(`${D1_API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, passwordHash }),
  });
  return response.json();
}
```

### メリット:
- 🌐 グローバルエッジ配信
- 💰 Free tierが充実
- 🔒 Cloudflareのセキュリティ機能

### デメリット:
- 🛠️ Cloudflare Workers APIが必要(追加の複雑さ)
- 🔀 Vercelと別のプラットフォーム管理が必要
- 📖 ドキュメントがTursoより少ない

---

## オプション3: Vercel Postgres 【最もシンプル】

**Vercel Postgres**は、Vercel公式のPostgreSQLサービス(Neon powered)です。

### 特徴:
- ✅ Vercel Dashboardから1クリックでセットアップ
- ✅ サーバーレス対応
- ✅ 自動スケーリング
- ⚠️ PostgreSQL文法(SQLiteと若干異なる)

### セットアップ手順:

#### 1. Vercel Dashboardでストレージ追加

1. Vercel Project > Storage タブ
2. "Create Database" > "Postgres"
3. データベース名を入力して作成

#### 2. 自動的に環境変数が追加される

```bash
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
```

#### 3. Vercel Postgres SDKを使用

```bash
pnpm add @vercel/postgres
```

```typescript
// apps/ecommerce-site/app/lib/db.ts
import { sql } from '@vercel/postgres';

export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`;
  return rows;
}

export async function createUser(email: string, passwordHash: string) {
  await sql`INSERT INTO users (email, password_hash) VALUES (${email}, ${passwordHash})`;
}
```

#### 4. スキーマ作成

Vercel Dashboard > Storage > Postgres > Query で実行:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### メリット:
- 🎯 Vercelとの完璧な統合
- 🚀 セットアップが最も簡単
- 📊 Vercel Dashboardでクエリ実行可能

### デメリット:
- 💰 有料($20/月〜)
- 🔀 SQLiteからPostgreSQLへの文法変更が必要

---

## オプション4: Supabase 【機能最多】

前述のdeployment-guide.mdを参照。

### メリット:
- 🎁 Free tier (500MB database, 2GB bandwidth)
- 🔐 認証機能内蔵
- 📦 ストレージ、リアルタイム機能
- 📊 充実した管理UI

### デメリット:
- 🔀 PostgreSQL文法
- 🛠️ 別サービス管理が必要

---

## オプション5: 読み取り専用SQLite 【静的データのみ】

既存のSQLiteファイルを**読み取り専用**として使う方法。

### ユースケース:
- 商品マスタデータ
- カテゴリ一覧
- 都道府県リスト
- 設定値

### セットアップ:

#### 1. ビルド時にSQLiteファイルを含める

```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
    });
    return config;
  },
  // SQLiteファイルをpublic/に配置
};
```

#### 2. 読み取り専用クライアント

```typescript
import Database from 'better-sqlite3';
import path from 'path';

// ビルド時に作成されたSQLiteファイル
const dbPath = path.join(process.cwd(), 'data', 'products.sqlite');
const db = new Database(dbPath, { readonly: true });

export function getProducts() {
  return db.prepare('SELECT * FROM products').all();
}
```

### メリット:
- 💰 完全無料
- 🚀 超高速(ローカルファイル読み取り)
- 🔧 既存コードがそのまま使える

### デメリット:
- ❌ 書き込み不可(完全に読み取り専用)
- ❌ ユーザーデータ、注文データなどには使えない
- 🔄 データ更新にはデプロイが必要

---

## 推奨アーキテクチャ: ハイブリッド構成

現在のプロジェクトに最適な構成:

```
┌─────────────────────────────────────────┐
│  Vercel (Next.js)                       │
├─────────────────────────────────────────┤
│                                         │
│  読み取り専用SQLite                      │
│  └─ products (商品マスタ)                │
│  └─ categories (カテゴリ)                │
│                                         │
│  Turso (書き込み可能)                    │
│  └─ users (ユーザー)                     │
│  └─ orders (注文)                        │
│  └─ cart_items (カート)                  │
│  └─ sessions (セッション)                │
│  └─ security_logs (セキュリティログ)      │
│                                         │
└─────────────────────────────────────────┘
```

### 実装例:

```typescript
// apps/ecommerce-site/app/lib/db.ts
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';

// 読み取り専用: 商品データ
const productDbPath = path.join(process.cwd(), 'data', 'products.sqlite');
const productDb = new Database(productDbPath, { readonly: true });

// 読み書き可能: ユーザーデータ
const turso = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// 商品取得(読み取り専用SQLite)
export function getProducts() {
  return productDb.prepare('SELECT * FROM products').all();
}

// ユーザー作成(Turso)
export async function createUser(email: string, passwordHash: string) {
  await turso.execute({
    sql: 'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    args: [email, passwordHash],
  });
}

// 注文作成(Turso)
export async function createOrder(userId: number, totalAmount: number) {
  const result = await turso.execute({
    sql: 'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
    args: [userId, totalAmount, 'pending'],
  });
  return result.lastInsertRowid;
}
```

---

## 結論: プロジェクトへの推奨

### 🏆 最優先推奨: Turso

理由:
1. ✅ SQLiteコードをほぼそのまま使える
2. ✅ Free tierが十分(500 DBs, 9GB)
3. ✅ 移行が最も簡単
4. ✅ Edge環境で高速
5. ✅ 日本(Tokyo)リージョン利用可能

### 🥈 次点: Vercel Postgres

理由:
1. ✅ Vercelとの完璧な統合
2. ✅ セットアップが超簡単
3. ⚠️ コストが発生($20/月〜)
4. ⚠️ PostgreSQL文法への書き換えが必要

### 🥉 代替案: Supabase

理由:
1. ✅ 認証・ストレージなど多機能
2. ✅ Free tierあり
3. ⚠️ 別サービス管理
4. ⚠️ PostgreSQL文法

---

## 次のステップ

1. **Tursoを試す場合:**
   ```bash
   turso auth login
   turso db create browser-agent-detector --location nrt
   ```

2. **Vercel Postgresを試す場合:**
   Vercel Dashboard > Storage > Create Database

3. **Supabaseを使う場合:**
   `docs/deployment-guide.md` の手順に従う

どの方法を選択しますか?
