import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { openDb } from './db';

// セッションIDのCookie名
const SESSION_COOKIE_NAME = 'ec_session';
// ローカルストレージのセッションデータキー
const SESSION_STORAGE_KEY = 'ec_session_data';

/**
 * 新しいセッションを作成（データベースに永続化）
 */
export async function createSession(data: any = {}): Promise<string> {
  const sessionId = uuidv4();
  const sessionData = {
    ...data,
    createdAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24時間後
  };

  try {
    // データベースにセッションを保存
    const db = await openDb();
    await db.run(
      `INSERT INTO sessions (session_id, user_id, data, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, data.userId || null, JSON.stringify(sessionData), sessionData.createdAt, sessionData.expiresAt]
    );

    // Cookie設定
    cookies().set({
      name: SESSION_COOKIE_NAME,
      value: sessionId,
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24時間
      // 本番環境では secure: true を設定すべき
    });

    return sessionId;
  } catch (error) {
    console.error('セッション作成エラー:', error);
    throw error;
  }
}

/**
 * 現在のセッションを取得（データベースから）
 *
 * 注意: このコードはサーバーコンポーネント内でのみ実行される。
 * クライアントコンポーネント内では、以下のコードをインポートして使用すること:
 *
 * ```
 * import { getClientSession } from '../lib/client-session';
 *
 * // コンポーネント内
 * const session = getClientSession();
 * ```
 */
export async function getSession(): Promise<{ sessionId: string; data: any } | null> {
  try {
    const sessionCookie = cookies().get(SESSION_COOKIE_NAME);

    if (!sessionCookie) {
      return null;
    }

    const sessionId = sessionCookie.value;
    const now = Date.now();

    // データベースからセッションを取得
    const db = await openDb();
    const session = await db.get(
      `SELECT * FROM sessions
       WHERE session_id = ? AND expires_at > ?`,
      [sessionId, now]
    );

    if (!session) {
      return null;
    }

    const sessionData = JSON.parse(session.data);

    return {
      sessionId,
      data: sessionData
    };
  } catch (error) {
    console.error('セッション取得エラー:', error);
    return null;
  }
}

/**
 * セッションを更新
 */
export async function updateSession(sessionId: string, data: any): Promise<boolean> {
  try {
    const now = Date.now();

    // セッションが存在するか確認
    const db = await openDb();
    const existingSession = await db.get(
      `SELECT * FROM sessions WHERE session_id = ? AND expires_at > ?`,
      [sessionId, now]
    );

    if (!existingSession) {
      return false;
    }

    const currentData = JSON.parse(existingSession.data);
    const updatedData = {
      ...currentData,
      ...data,
      updatedAt: now
    };

    // セッションを更新
    await db.run(
      `UPDATE sessions SET data = ?, updated_at = ? WHERE session_id = ?`,
      [JSON.stringify(updatedData), now, sessionId]
    );

    return true;
  } catch (error) {
    console.error('セッション更新エラー:', error);
    return false;
  }
}

/**
 * 現在のセッションを更新
 */
export async function updateCurrentSession(data: any): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  return await updateSession(session.sessionId, data);
}

/**
 * セッションを破棄
 */
export async function destroySession(sessionId?: string): Promise<boolean> {
  try {
    if (sessionId) {
      // 指定されたセッションを破棄
      const db = await openDb();
      await db.run(`DELETE FROM sessions WHERE session_id = ?`, [sessionId]);
      return true;
    }

    // 現在のセッションを破棄
    const session = await getSession();

    if (!session) {
      return false;
    }

    const db = await openDb();
    await db.run(`DELETE FROM sessions WHERE session_id = ?`, [session.sessionId]);

    // Cookieを削除
    cookies().delete(SESSION_COOKIE_NAME);

    return true;
  } catch (error) {
    console.error('セッション破棄エラー:', error);
    return false;
  }
}

/**
 * 期限切れセッションのクリーンアップ
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const now = Date.now();
    const db = await openDb();
    await db.run(`DELETE FROM sessions WHERE expires_at <= ?`, [now]);
  } catch (error) {
    console.error('期限切れセッションクリーンアップエラー:', error);
  }
}