import { getRequestContext } from '@cloudflare/next-on-pages';

// D1 の実行結果型（最低限のプロパティだけ定義）
type D1Meta = { changes: number; last_row_id: number };
type D1Result<T = unknown> = { results?: T[]; meta: D1Meta };

type PreparedStatement = {
  bind: (...values: unknown[]) => PreparedStatement;
  run: () => Promise<D1Result>;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  prepare: (sql: string) => PreparedStatement;
  exec: (sql: string) => Promise<void>;
};

type RunResult = { changes: number; lastID: number };
type Db = {
  run: (sql: string, params?: unknown[]) => Promise<RunResult>;
  get: <T = any>(sql: string, params?: unknown[]) => Promise<T | null>;
  all: <T = any>(sql: string, params?: unknown[]) => Promise<T[]>;
  exec: (sql: string) => Promise<void>;
  close: () => Promise<void>;
};

function getD1(): D1DatabaseLike {
  const ctx = getRequestContext();
  const db = ctx.env?.DB as D1DatabaseLike | undefined;
  if (!db) {
    throw new Error('D1 binding DB が未設定です');
  }
  return db;
}

export async function openDb(): Promise<Db> {
  const db = getD1();
  const prepare = (sql: string, params: unknown[] = []) => db.prepare(sql).bind(...params);

  return {
    async run(sql: string, params: unknown[] = []) {
      const res = await prepare(sql, params).run();
      return {
        changes: res.meta?.changes ?? 0,
        lastID: Number(res.meta?.last_row_id ?? 0),
      };
    },
    async get<T = any>(sql: string, params: unknown[] = []) {
      return (await prepare(sql, params).first<T>()) ?? null;
    },
    async all<T = any>(sql: string, params: unknown[] = []) {
      return (await prepare(sql, params).all<T>()).results ?? [];
    },
    async exec(sql: string) {
      await db.exec(sql);
    },
    async close() {
      // D1 は close 不要
    },
  };
}

// D1 ではマイグレーションを wrangler d1 migrations で管理するため、ここは空実装
export async function initDb() {}
export async function migrateDb() {}
