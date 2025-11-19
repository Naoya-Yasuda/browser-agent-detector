# Vercelを使ったCI/CDデプロイ手順書

このガイドでは、browser-agent-detectorプロジェクトをVercelにデプロイし、GitHub Actionsを使ったCI/CDパイプラインを構築する手順を説明します。

> **📝 データベース選択肢について:**
> SQLiteをVercelで使う場合の制約と代替案については、[vercel-sqlite-options.md](vercel-sqlite-options.md) を参照してください。
> - **Turso (libSQL)**: SQLite互換、無料枠充実、最も簡単な移行
> - **Vercel Postgres**: Vercel公式、最もシンプル、有料($20/月〜)
> - **Supabase**: 多機能、無料枠あり、PostgreSQL

## 目次
1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [前提条件](#2-前提条件)
3. [データベース選択](#3-データベース選択)
4. [オプションA: Turso (推奨)](#4-オプションa-turso-推奨)
5. [オプションB: Supabase](#5-オプションb-supabase)
6. [オプションC: Vercel Postgres](#6-オプションc-vercel-postgres)
7. [バックエンド(FastAPI)のデプロイ](#7-バックエンドfastapiのデプロイ)
8. [フロントエンド(Next.js)のVercelデプロイ](#8-フロントエンドnextjsのvercelデプロイ)
9. [GitHub Actions CI/CDパイプライン](#9-github-actions-cicdパイプライン)
10. [環境変数の設定](#10-環境変数の設定)
11. [デプロイ後の確認](#11-デプロイ後の確認)
12. [トラブルシューティング](#12-トラブルシューティング)

---

## 1. アーキテクチャ概要

### 現在の構成
```
┌─────────────┐      ┌──────────────┐
│  Next.js    │ ───> │  FastAPI     │
│  (port:3002)│      │  (port:8000) │
└──────┬──────┘      └──────┬───────┘
       │                    │
       v                    v
  ┌─────────┐          ┌─────────┐
  │ SQLite  │          │ Models  │
  │   DB    │          │(LightGBM)│
  └─────────┘          └─────────┘
```

### デプロイ後の構成
```
┌──────────────────┐      ┌────────────────────┐
│  Vercel          │      │  Render/Railway    │
│  Next.js         │ ───> │  FastAPI           │
│  (CDN + Edge)    │      │  (Container)       │
└────────┬─────────┘      └─────────┬──────────┘
         │                          │
         v                          v
  ┌─────────────┐            ┌──────────────┐
  │  Supabase   │            │  Supabase    │
  │  PostgreSQL │            │  Storage     │
  │  + Auth     │            │  (ML Models) │
  └─────────────┘            └──────────────┘
         │
         v
  ┌─────────────┐
  │   GitHub    │
  │   Actions   │
  │   (CI/CD)   │
  └─────────────┘
```

---

## 2. 前提条件

### 必要なアカウント
- [ ] GitHubアカウント(リポジトリ管理)
- [ ] Vercelアカウント(https://vercel.com)
- [ ] Render/Railwayアカウント(FastAPIホスティング用)
- [ ] Google Cloudアカウント(reCAPTCHA Enterprise用)
- [ ] データベース選択に応じて:
  - Turso選択時: [Tursoアカウント](https://turso.tech)
  - Supabase選択時: [Supabaseアカウント](https://supabase.com)
  - Vercel Postgres選択時: 追加アカウント不要

### ローカル環境
- Node.js 18以上
- Python 3.10以上
- pnpm
- uv (Python package manager)
- Git

---

## 3. データベース選択

VercelでSQLiteを直接使うことはできません(ファイルシステムが読み取り専用)。以下の3つのオプションから選択してください。

### 比較表

| 項目 | Turso | Supabase | Vercel Postgres |
|------|-------|----------|-----------------|
| **SQLite互換性** | ✅ 100% | ❌ PostgreSQL | ❌ PostgreSQL |
| **移行難易度** | 🟢 簡単 | 🟡 中程度 | 🟡 中程度 |
| **無料枠** | 500DB, 9GB | 500MB, 2GB転送 | ❌ なし |
| **月額コスト** | $0〜 | $0〜 | $20〜 |
| **追加機能** | - | 認証、ストレージ | Vercel統合 |
| **セットアップ** | CLI | Dashboard | 1クリック |
| **推奨度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 推奨事項

**🏆 Turso を推奨** - 以下の理由:
- 既存のSQLiteコードをほぼそのまま使える
- 無料枠が非常に充実(個人プロジェクトなら無料で十分)
- 移行が最も簡単(Sync API → Async APIの変更のみ)
- Edge環境で超高速

**使い分け:**
- **シンプルに始めたい** → Turso
- **認証・ストレージなど多機能が必要** → Supabase
- **Vercelで全て完結させたい** → Vercel Postgres(有料)

詳細な比較は [vercel-sqlite-options.md](vercel-sqlite-options.md) を参照。

以下、各オプションのセットアップ手順を説明します。**いずれか1つを選択してください。**

---

## 4. オプションA: Turso (推奨)

### 4.1 Turso CLIのインストール

```bash
# macOS
brew install tursodatabase/tap/turso

# Linux/WSL
curl -sSfL https://get.tur.so/install.sh | bash
```

### 4.2 Tursoにログイン

```bash
turso auth login
```

ブラウザが開くので、GitHubでログインしてください。

### 4.3 データベース作成

```bash
# 東京リージョンでデータベース作成
turso db create browser-agent-detector --location nrt

# 接続情報を確認
turso db show browser-agent-detector
```

出力例:
```
Name:           browser-agent-detector
URL:            libsql://browser-agent-detector-xxxxx.turso.io
ID:             xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Locations:      nrt
```

### 4.4 認証トークン作成

```bash
turso db tokens create browser-agent-detector
```

トークンが表示されるので、**必ず保存してください**(2度と表示されません)。

### 4.5 スキーマの適用

既存のSQLiteスキーマをTursoにコピー:

```bash
# ローカルのSQLiteデータベースがある場合
sqlite3 apps/ecommerce-site/ecommerce-db.sqlite .dump > schema.sql

# Tursoに適用
turso db shell browser-agent-detector < schema.sql
```

または手動でスキーマを作成:

```bash
turso db shell browser-agent-detector
```

SQLプロンプトで:
```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    prefecture TEXT,
    occupation TEXT,
    member_rank TEXT DEFAULT 'ブロンズ',
    total_orders INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0.00,
    last_purchase_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 他のテーブルも同様に作成
-- Products, Orders, Order_items, Cart_items, Security_logs, Sessions
```

### 4.6 Next.jsアプリの更新

`apps/ecommerce-site/package.json` に依存関係追加:

```json
{
  "dependencies": {
    "@libsql/client": "^0.4.0"
  }
}
```

```bash
cd apps/ecommerce-site
pnpm add @libsql/client
```

### 4.7 データベースクライアントの作成

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

export async function createUser(email: string, passwordHash: string, age?: number) {
  const result = await turso.execute({
    sql: 'INSERT INTO users (email, password_hash, age) VALUES (?, ?, ?)',
    args: [email, passwordHash, age || null],
  });
  return result.lastInsertRowid;
}

export async function getUserByEmail(email: string) {
  const result = await turso.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email],
  });
  return result.rows[0] || null;
}
```

### 4.8 環境変数設定

`.env.local`:
```bash
TURSO_DATABASE_URL=libsql://browser-agent-detector-xxxxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

**Tursoの手順はここまでです。** [セクション7](#7-バックエンドfastapiのデプロイ) に進んでください。

---

## 5. オプションB: Supabase

### 5.1 プロジェクト作成

1. [Supabase Dashboard](https://app.supabase.com)にログイン
2. "New Project"をクリック
3. 以下の情報を入力:
   - Name: `browser-agent-detector`
   - Database Password: 強力なパスワードを生成(保存必須)
   - Region: `Northeast Asia (Tokyo)` 推奨
   - Pricing Plan: `Free` または `Pro`

4. プロジェクト作成完了まで待機(約2分)

### 5.2 接続情報の取得

プロジェクト設定 > API から以下を取得:

```bash
# Project URL
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co

# Anon Public Key (フロントエンド用)
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (バックエンド用 - 秘密情報)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

プロジェクト設定 > Database から:

```bash
# Database Connection String
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

### 5.3 スキーマ定義ファイルの作成

`supabase/migrations/20250119000000_initial_schema.sql` を作成:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    prefecture VARCHAR(50),
    occupation VARCHAR(100),
    member_rank VARCHAR(20) DEFAULT 'ブロンズ',
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    last_purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_limited BOOLEAN DEFAULT FALSE,
    image_path VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    security_mode VARCHAR(50),
    bot_score DECIMAL(5, 2),
    security_action VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    recipient_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Security logs table
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    security_mode VARCHAR(50),
    bot_score DECIMAL(5, 2),
    risk_level VARCHAR(20),
    action_taken VARCHAR(100),
    detection_reasons TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_security_logs_session_id ON security_logs(session_id);
CREATE INDEX idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.4 Supabaseマイグレーション実行

1. Supabase CLIのインストール:

```bash
npm install -g supabase
```

2. Supabaseにログイン:

```bash
supabase login
```

3. プロジェクトとリンク:

```bash
supabase link --project-ref <YOUR_PROJECT_REF>
```

4. マイグレーション実行:

```bash
supabase db push
```

### 5.5 初期データの投入

Supabase Dashboard > SQL Editor で実行:

```sql
-- Sample users (パスワードは bcrypt ハッシュ化が必要)
INSERT INTO users (email, password_hash, age, gender, prefecture, occupation, member_rank)
VALUES
    ('user1@example.com', '$2b$10$...', 28, '男性', '東京都', '会社員', 'ゴールド'),
    ('user2@example.com', '$2b$10$...', 34, '女性', '大阪府', '自営業', 'プラチナ');

-- Sample products
INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description)
VALUES
    ('高級腕時計 クロノグラフ', '時計', 'LuxuryWatch', 450000.00, 5, TRUE, '/images/watch1.jpg', 'スイス製自動巻きクロノグラフ'),
    ('デザイナーズバッグ', 'バッグ', 'DesignerBrand', 180000.00, 10, FALSE, '/images/bag1.jpg', 'イタリア製レザーバッグ');
```

### 5.6 Row Level Security (RLS) の設定

Supabase Dashboard > Authentication > Policies で各テーブルに適切なポリシーを設定:

```sql
-- Users: 自分のレコードのみ読み取り可能
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
    ON users FOR SELECT
    USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data"
    ON users FOR UPDATE
    USING (auth.uid()::text = id::text);

-- Products: 全員が読み取り可能
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view products"
    ON products FOR SELECT
    TO public
    USING (true);

-- Orders: 自分の注文のみアクセス可能
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- 同様に他のテーブルにも設定
```

### 5.7 Next.jsアプリの更新

`apps/ecommerce-site/package.json` に依存関係追加:

```bash
cd apps/ecommerce-site
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

`apps/ecommerce-site/app/lib/supabase.ts` を作成:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 使用例
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) throw error;
  return data;
}

export async function createUser(email: string, passwordHash: string, age?: number) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password_hash: passwordHash, age }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
```

### 5.8 環境変数設定

`.env.local`:
```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Supabaseの手順はここまでです。** [セクション7](#7-バックエンドfastapiのデプロイ) に進んでください。

---

## 6. オプションC: Vercel Postgres

### 6.1 Vercel Dashboardでデータベース作成

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択(または新規作成)
3. "Storage" タブをクリック
4. "Create Database" > "Postgres" を選択
5. データベース名を入力(例: `browser-agent-detector-db`)
6. リージョンを選択(Tokyo推奨)
7. "Create" をクリック

**自動的に以下の環境変数が追加されます:**
```bash
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

### 6.2 スキーマの作成

Vercel Dashboard > Storage > Postgres > Query で実行:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    age INTEGER,
    gender VARCHAR(10),
    prefecture VARCHAR(50),
    occupation VARCHAR(100),
    member_rank VARCHAR(20) DEFAULT 'ブロンズ',
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    last_purchase_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    brand VARCHAR(100),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_limited BOOLEAN DEFAULT FALSE,
    image_path VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders, Order_items, Cart_items, Security_logs, Sessions テーブルも同様に作成
-- (Supabaseセクション5.3のスキーマを参照)
```

### 6.3 Next.jsアプリの更新

`apps/ecommerce-site/package.json` に依存関係追加:

```bash
cd apps/ecommerce-site
pnpm add @vercel/postgres
```

`apps/ecommerce-site/app/lib/db.ts` を作成:

```typescript
import { sql } from '@vercel/postgres';

// 使用例
export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`;
  return rows;
}

export async function createUser(email: string, passwordHash: string, age?: number | null) {
  const { rows } = await sql`
    INSERT INTO users (email, password_hash, age)
    VALUES (${email}, ${passwordHash}, ${age})
    RETURNING *
  `;
  return rows[0];
}

export async function getUserByEmail(email: string) {
  const { rows } = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return rows[0] || null;
}

export async function getProducts() {
  const { rows } = await sql`SELECT * FROM products ORDER BY created_at DESC`;
  return rows;
}

export async function createOrder(userId: number, totalAmount: number, status: string = 'pending') {
  const { rows } = await sql`
    INSERT INTO orders (user_id, total_amount, status)
    VALUES (${userId}, ${totalAmount}, ${status})
    RETURNING id
  `;
  return rows[0].id;
}
```

### 6.4 環境変数の確認

Vercel Postgresを作成すると、環境変数が自動設定されます。

ローカル開発用に `.env.local` に追加:

```bash
# Vercel Dashboard > Storage > Postgres > .env.local タブからコピー
POSTGRES_URL="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_PRISMA_URL="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com:5432/verceldb"
POSTGRES_USER="default"
POSTGRES_HOST="xxxxx.postgres.vercel-storage.com"
POSTGRES_PASSWORD="xxxxx"
POSTGRES_DATABASE="verceldb"
```

**Vercel Postgresの手順はここまでです。** 次のセクションに進んでください。

---

## 7. バックエンド(FastAPI)のデプロイ

FastAPIアプリケーションは**Render**または**Railway**にデプロイします。

### 7.1 Renderでのデプロイ (推奨)

#### 7.1.1 `render.yaml` の作成

`ai-detector/render.yaml`:

```yaml
services:
  - type: web
    name: browser-agent-detector-api
    env: python
    region: singapore  # 東京リージョンに近い
    plan: free  # または starter
    buildCommand: "pip install uv && uv pip install --system -e ."
    startCommand: "uvicorn src.api.app:app --host 0.0.0.0 --port $PORT"
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: AI_DETECTOR_TRAINING_LOG
        value: "0"
      - key: DATABASE_URL
        sync: false  # Manually set in Render dashboard
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
```

#### 7.1.2 Renderダッシュボードでデプロイ

1. [Render Dashboard](https://dashboard.render.com)にログイン
2. "New +" > "Blueprint" を選択
3. GitHubリポジトリを接続
4. `ai-detector/render.yaml` を検出
5. 環境変数を設定:
   - `DATABASE_URL`: Supabaseの接続文字列
   - `SUPABASE_URL`: Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role key
6. "Apply" をクリックしてデプロイ開始

#### 7.1.3 ML モデルファイルのアップロード

Renderではファイルシステムが揮発性のため、モデルファイルをSupabase Storageにアップロード:

1. Supabase Dashboard > Storage > Create bucket:
   - Name: `ml-models`
   - Public: No

2. モデルファイルをアップロード:
   ```
   ml-models/
   ├── browser/
   │   └── lightgbm_model.txt
   └── persona/
       ├── kmeans_model.pkl
       ├── cluster_isolation_models.pkl
       └── model_metadata.json
   ```

3. `ai-detector/src/config.py` を更新してSupabase Storageから読み込むように変更

### 7.2 Railwayでのデプロイ (代替案)

1. [Railway](https://railway.app)にログイン
2. "New Project" > "Deploy from GitHub repo"
3. リポジトリを選択し、`ai-detector` ディレクトリを指定
4. 環境変数を設定(Renderと同様)
5. 自動デプロイが開始

---

## 8. フロントエンド(Next.js)のVercelデプロイ

### 8.1 `vercel.json` の作成

`apps/ecommerce-site/vercel.json`:

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["hnd1"],
  "env": {
    "NEXT_PUBLIC_DEPLOY_ENV": "production",
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_RECAPTCHA_SITE_KEY": "@recaptcha-site-key"
  },
  "build": {
    "env": {
      "SUPABASE_URL": "@supabase-url",
      "SUPABASE_ANON_KEY": "@supabase-anon-key",
      "AI_DETECTOR_ENDPOINT_URL": "@ai-detector-endpoint",
      "GOOGLE_CLOUD_PROJECT_ID": "@gcp-project-id"
    }
  }
}
```

### 8.2 データベースクライアントの更新

`apps/ecommerce-site/app/lib/db.ts` を Supabase クライアントに置き換え:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Example query
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) throw error;
  return data;
}
```

### 8.3 パッケージ依存関係の更新

`apps/ecommerce-site/package.json` に追加:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.7"
  }
}
```

SQLite関連の依存関係を削除:

```bash
cd apps/ecommerce-site
pnpm remove sqlite3 sqlite better-sqlite3
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 8.4 Vercelダッシュボードでデプロイ

1. [Vercel Dashboard](https://vercel.com/dashboard)にログイン
2. "Add New..." > "Project"
3. GitHubリポジトリをインポート
4. プロジェクト設定:
   - Framework Preset: Next.js
   - Root Directory: `apps/ecommerce-site`
   - Build Command: `pnpm run build`
   - Install Command: `pnpm install`

5. 環境変数を設定:

```bash
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API
NEXT_PUBLIC_API_URL=https://browser-agent-detector-api.onrender.com
AI_DETECTOR_ENDPOINT_URL=https://browser-agent-detector-api.onrender.com

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Environment
NEXT_PUBLIC_DEPLOY_ENV=production
```

6. "Deploy" をクリック

---

## 9. GitHub Actions CI/CDパイプライン

### 9.1 ディレクトリ構造

```
.github/
└── workflows/
    ├── frontend-deploy.yml
    ├── backend-deploy.yml
    └── tests.yml
```

### 9.2 フロントエンドCI/CDパイプライン

`.github/workflows/frontend-deploy.yml`:

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/ecommerce-site/**'
      - 'browser-agent-sdk/**'
  pull_request:
    branches: [main]
    paths:
      - 'apps/ecommerce-site/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install
        working-directory: apps/ecommerce-site

      - name: Run TypeScript checks
        run: pnpm run type-check
        working-directory: apps/ecommerce-site

      - name: Run linting
        run: pnpm run lint
        working-directory: apps/ecommerce-site

      - name: Build
        run: pnpm run build
        working-directory: apps/ecommerce-site
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: apps/ecommerce-site
          vercel-args: '--prod'
```

### 9.3 バックエンドCI/CDパイプライン

`.github/workflows/backend-deploy.yml`:

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'ai-detector/**'
  pull_request:
    branches: [main]
    paths:
      - 'ai-detector/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install uv
        run: pip install uv

      - name: Install dependencies
        run: uv pip install --system -e ".[dev]"
        working-directory: ai-detector

      - name: Run tests
        run: pytest tests/
        working-directory: ai-detector

      - name: Run type checks
        run: mypy src/
        working-directory: ai-detector
        continue-on-error: true

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          service-id: ${{ secrets.RENDER_SERVICE_ID }}
          api-key: ${{ secrets.RENDER_API_KEY }}
```

### 9.4 テストパイプライン

`.github/workflows/tests.yml`:

```yaml
name: Run Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Install and test
        run: |
          pnpm install
          pnpm run test
        working-directory: apps/ecommerce-site

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install and test
        run: |
          pip install uv
          uv pip install --system -e ".[dev]"
          pytest tests/ -v
        working-directory: ai-detector
```

---

## 10. 環境変数の設定

### 10.1 GitHub Secrets の設定

GitHub リポジトリ > Settings > Secrets and variables > Actions で以下を追加:

#### Vercel関連:
```
VERCEL_TOKEN=<Your Vercel Token>
VERCEL_ORG_ID=<Your Vercel Org ID>
VERCEL_PROJECT_ID=<Your Vercel Project ID>
```

#### Render関連:
```
RENDER_API_KEY=<Your Render API Key>
RENDER_SERVICE_ID=<Your Render Service ID>
```

#### Supabase:
```
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:...
```

#### Google Cloud:
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS_JSON=<JSON content>
```

### 10.2 Vercel環境変数

Vercel Dashboard > Project > Settings > Environment Variables:

```bash
# Production
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://browser-agent-detector-api.onrender.com
AI_DETECTOR_ENDPOINT_URL=https://browser-agent-detector-api.onrender.com
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
RECAPTCHA_SITE_KEY=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI
GOOGLE_CLOUD_PROJECT_ID=your-project-id
NEXT_PUBLIC_DEPLOY_ENV=production

# Preview (develop branch)
NEXT_PUBLIC_DEPLOY_ENV=dev
```

### 10.3 Render環境変数

Render Dashboard > Service > Environment:

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
AI_DETECTOR_TRAINING_LOG=0
PYTHON_VERSION=3.11
```

---

## 11. デプロイ後の確認

### 11.1 ヘルスチェック

バックエンド:
```bash
curl https://browser-agent-detector-api.onrender.com/health
```

期待されるレスポンス:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-19T12:00:00Z"
}
```

フロントエンド:
```bash
curl https://your-app.vercel.app
```

### 11.2 データベース接続確認

Supabase Dashboard > Database > Query Editor:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
```

### 11.3 API エンドポイントテスト

```bash
# 検出エンドポイント
curl -X POST https://browser-agent-detector-api.onrender.com/detect \
  -H "Content-Type: application/json" \
  -d '{
    "browser_data": {
      "mouseMovements": [],
      "clicks": [],
      "keystrokes": []
    }
  }'

# クラスター異常検出
curl -X POST https://browser-agent-detector-api.onrender.com/detect_cluster_anomaly \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "age": 28,
    "gender": "男性",
    "prefecture": "東京都"
  }'
```

### 11.4 フロントエンド機能確認

1. https://your-app.vercel.app にアクセス
2. ユーザー登録 → ログイン
3. 商品一覧表示
4. カートに追加
5. 購入フロー(AI検出スコア表示確認)
6. セキュリティログの記録確認

---

## 12. トラブルシューティング

### 12.1 よくある問題

#### データベース接続エラー

**症状:**
```
Error: Connection to database failed
```

**解決策:**
1. Supabaseの接続文字列を確認
2. RLSポリシーが正しく設定されているか確認
3. Service Role Keyを使用しているか確認(Anon Keyではアクセス制限あり)

#### Vercelビルドエラー

**症状:**
```
Error: Module not found: Can't resolve '@supabase/supabase-js'
```

**解決策:**
```bash
cd apps/ecommerce-site
pnpm add @supabase/supabase-js
git add package.json pnpm-lock.yaml
git commit -m "Add Supabase dependency"
git push
```

#### MLモデルファイルが見つからない

**症状:**
```
FileNotFoundError: models/browser/lightgbm_model.txt
```

**解決策:**
1. Supabase Storageにモデルファイルをアップロード
2. `ai-detector/src/config.py` でSupabase Storageから読み込むように変更:

```python
import os
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

def download_model_from_storage(bucket: str, path: str, local_path: str):
    data = supabase.storage.from_(bucket).download(path)
    with open(local_path, 'wb') as f:
        f.write(data)
```

#### CORS エラー

**症状:**
```
Access to fetch at 'https://api.example.com' from origin 'https://your-app.vercel.app' has been blocked by CORS policy
```

**解決策:**

`ai-detector/src/api/app.py` に CORS 設定を追加:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://*.vercel.app",  # Preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 12.2 ログの確認方法

#### Vercel:
```bash
vercel logs <deployment-url>
```

または Vercel Dashboard > Deployments > Logs

#### Render:
Render Dashboard > Service > Logs (リアルタイムストリーム)

#### Supabase:
Supabase Dashboard > Logs > Database / API / Auth

### 12.3 ロールバック手順

#### Vercel (即座にロールバック可能):
1. Vercel Dashboard > Deployments
2. 前回の成功したデプロイを選択
3. "Promote to Production" をクリック

#### Render:
1. Render Dashboard > Service > Deploys
2. 前回のデプロイを選択
3. "Rollback to this deploy" をクリック

#### Supabase マイグレーション:
```bash
supabase db reset  # ローカル開発のみ
```

本番環境では手動でマイグレーションを作成して元に戻す:

```sql
-- ロールバック用マイグレーション
DROP TABLE IF EXISTS new_table;
ALTER TABLE old_table ADD COLUMN restored_column VARCHAR(255);
```

---

## 11. 次のステップ

- [ ] モニタリングの設定(Sentry, LogRocket, Vercel Analytics)
- [ ] カスタムドメインの設定
- [ ] SSL証明書の確認
- [ ] バックアップ戦略の策定(Supabase自動バックアップ確認)
- [ ] パフォーマンステスト(Lighthouse, WebPageTest)
- [ ] セキュリティ監査(OWASP Top 10チェック)
- [ ] CDN最適化(Vercel Edge Functions活用)
- [ ] E2Eテストの追加(Playwright/Cypress)

---

## 参考リンク

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**作成日:** 2025-11-19
**更新日:** 2025-11-19
**バージョン:** 1.0.0
