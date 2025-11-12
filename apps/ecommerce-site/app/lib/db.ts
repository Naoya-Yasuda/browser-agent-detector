import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { hashPassword } from './auth';

// SQLiteデータベースファイルパス
const DB_PATH = path.join(process.cwd(), 'ecommerce-db.sqlite');

// データベース接続を確立する関数
async function openDb() {
  return open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
}

// 初期化関数：初期DBセットアップ
export async function initDb() {
  const db = await openDb();

  // ユーザーテーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,

      -- 会員属性
      age INTEGER,
      gender INTEGER,
      prefecture INTEGER,
      occupation VARCHAR(50),
      member_rank VARCHAR(20) DEFAULT 'bronze',
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,

      -- 購入履歴統計（非正規化）
      total_orders INTEGER DEFAULT 0,
      total_spent DECIMAL(10,2) DEFAULT 0,
      last_purchase_date DATETIME,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 商品テーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      category INTEGER,
      brand INTEGER,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      is_limited BOOLEAN DEFAULT FALSE,
      image_path VARCHAR(255),
      description TEXT,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 注文テーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),

      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',

      -- セキュリティ関連
      security_mode VARCHAR(20),
      bot_score FLOAT NULL,
      security_action VARCHAR(20) NULL,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 注文商品テーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // セキュリティログテーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id VARCHAR(64) NOT NULL,
      user_id INTEGER NULL REFERENCES users(id),

      -- リクエスト情報
      ip_address VARCHAR(45),
      user_agent TEXT,
      request_path VARCHAR(255),
      request_method VARCHAR(10),

      -- セキュリティ検知結果
      security_mode VARCHAR(20) NOT NULL,
      bot_score FLOAT NULL,
      risk_level VARCHAR(20) NULL,
      action_taken VARCHAR(20) NOT NULL,

      -- 追加コンテキスト
      detection_reasons TEXT NULL,
      processing_time_ms INTEGER NULL,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // カートテーブル
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER NOT NULL,
      recipient_email VARCHAR(255) NULL,

      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 初期ユーザーデータの投入
  const userExists = await db.get('SELECT * FROM users LIMIT 1');

  if (!userExists) {
    // パスワードをハッシュ化して保存
    // 若年学生クラスタ
    await db.run(
      'INSERT INTO users (email, password_hash, age, occupation, member_rank) VALUES (?, ?, ?, ?, ?)',
      ['student@example.com', hashPassword('password123'), 22, 'student', 'bronze']
    );

    // 働く女性クラスタ
    await db.run(
      'INSERT INTO users (email, password_hash, age, occupation, member_rank) VALUES (?, ?, ?, ?, ?)',
      ['office@example.com', hashPassword('password123'), 35, 'office', 'silver']
    );

    // 技術系男性クラスタ
    await db.run(
      'INSERT INTO users (email, password_hash, age, occupation, member_rank) VALUES (?, ?, ?, ?, ?)',
      ['tech@example.com', hashPassword('password123'), 42, 'tech', 'gold']
    );
  }

  // 初期商品データの投入
  const productExists = await db.get('SELECT * FROM products LIMIT 1');

  if (!productExists) {
    // 通常商品
    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['スマートフォン X', 1, 2, 89800, 50, 0, '/images/smartphone.jpg', '最新のスマートフォン']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['ノートパソコン Pro', 1, 2, 158000, 30, 0, '/images/laptop.jpg', 'プロフェッショナル向けノートパソコン']
    );

    // 限定商品
    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['限定デザインスニーカー', 7, 17, 25800, 5, 1, '/images/sneaker.jpg', '数量限定のスニーカー']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['コレクターズエディションフィギュア', 12, 18, 45000, 3, 1, '/images/figure.jpg', '希少なコレクターズアイテム']
    );

    // 追加商品
    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['ちゃぶ台', 9, 10, 25000, 15, 0, '/images/ちゃぶ台.png', '伝統的な日本のちゃぶ台。家族団らんに最適です。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['カジュアル洋服セット', 7, 11, 8500, 25, 0, '/images/洋服.png', '日常使いにぴったりのカジュアルな洋服セット。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['プレミアムペットフード', 6, 12, 3200, 40, 0, '/images/ペットの餌.png', '愛犬・愛猫の健康を考えたプレミアムフード。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['高級口紅', 8, 13, 4500, 20, 0, '/images/口紅.png', '長時間持続する高級口紅。豊富なカラーバリエーション。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['手作りお菓子セット', 4, 14, 1800, 30, 0, '/images/お菓子.png', '職人が手作りした美味しいお菓子の詰め合わせ。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['省エネ洗濯機', 2, 15, 85000, 8, 0, '/images/洗濯機.png', '最新の省エネ技術を搭載した高性能洗濯機。']
    );

    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['日本史の本', 3, 16, 2200, 35, 0, '/images/歴史の本.png', '日本の歴史を詳しく解説した学習書。']
    );

    // 限定品スニーカー
    await db.run(
      'INSERT INTO products (name, category, brand, price, stock_quantity, is_limited, image_path, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['限定品スニーカー', 7, 19, 25800, 5, 1, '/images/限定品スニーカー.png', '数量限定のプレミアムスニーカー。希少なデザインと高品質な素材を使用。']
    );
  }

  await db.close();
  console.log('Database initialized successfully');
}

// データベースマイグレーション関数
export async function migrateDb() {
  const db = await openDb();

  try {
    // カートテーブルに受取人メールアドレスカラムを追加（既存のテーブルがある場合）
    await db.exec(`
      ALTER TABLE cart_items ADD COLUMN recipient_email VARCHAR(255) NULL;
    `);
    console.log('Migration completed: recipient_email column added to cart_items');
  } catch (error) {
    // カラムが既に存在する場合はエラーを無視
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      console.log('recipient_email column already exists');
    } else {
      console.error('Migration error:', error);
    }
  }

  await db.close();
}

// データベース接続をエクスポート
export { openDb };