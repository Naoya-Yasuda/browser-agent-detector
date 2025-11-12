'use client';

// クライアントサイドのセッション管理用ファイル
const SESSION_COOKIE_NAME = 'ec_session';
const SESSION_STORAGE_KEY = 'ec_session_data';

/**
 * クライアントサイドでセッションIDを取得
 */
function getClientSessionId(): string | null {
  try {
    // クライアントサイドでcookieを取得
    const cookies = document.cookie.split(';')
      .map(cookie => cookie.trim().split('='))
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

    return cookies[SESSION_COOKIE_NAME] || null;
  } catch (error) {
    console.error('クライアントセッションID取得エラー:', error);
    return null;
  }
}

/**
 * クライアントサイドでセッションデータを取得
 */
export function getClientSession(): { sessionId: string; data: any } | null {
  try {
    const sessionId = getClientSessionId();
    
    if (!sessionId) {
      return null;
    }
    
    // ローカルストレージからセッションデータを取得
    const sessionDataStr = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionDataStr) {
      return null;
    }
    
    try {
      const sessionData = JSON.parse(sessionDataStr);
      return {
        sessionId,
        data: sessionData
      };
    } catch (e) {
      console.error('セッションデータのパースエラー:', e);
      return null;
    }
  } catch (error) {
    console.error('クライアントセッション取得エラー:', error);
    return null;
  }
}

/**
 * クライアントサイドでセッションデータを更新
 */
export function updateClientSession(data: any): boolean {
  try {
    const session = getClientSession();
    
    if (!session) {
      return false;
    }
    
    const updatedData = {
      ...session.data,
      ...data,
      updatedAt: Date.now()
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedData));
    
    return true;
  } catch (error) {
    console.error('クライアントセッション更新エラー:', error);
    return false;
  }
}

/**
 * クライアントサイドでセッションを破棄
 */
export function destroyClientSession(): boolean {
  try {
    // ローカルストレージからセッションデータを削除
    localStorage.removeItem(SESSION_STORAGE_KEY);
    
    // Cookieを削除するためにサーバーサイドのログアウトAPIを呼び出す必要がある
    // この例ではクライアントサイドのデータのみを削除
    
    return true;
  } catch (error) {
    console.error('クライアントセッション破棄エラー:', error);
    return false;
  }
}