'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// 認証情報の型定義
interface AuthContextType {
  isLoggedIn: boolean;
  userId: number | null;
  email: string | null;
  memberRank: string | null;
  login: (userData: any) => void;
  logout: () => void;
  checkSession: () => Promise<boolean>; // セッション確認関数を公開
}

// デフォルト値
const defaultAuthContext: AuthContextType = {
  isLoggedIn: false,
  userId: null,
  email: null,
  memberRank: null,
  login: () => {},
  logout: () => {},
  checkSession: async () => false,
};

// コンテキストの作成
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// セッション確認の重複を防ぐためのフラグ
let sessionCheckInProgress = false;
let lastSessionCheck = 0;
const SESSION_CHECK_INTERVAL = 5000; // 5秒間隔

// コンテキストプロバイダーコンポーネント
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [memberRank, setMemberRank] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const sessionCheckRef = useRef<Promise<boolean> | null>(null);

  // 統一されたセッション確認関数
  const checkSession = async (force: boolean = false): Promise<boolean> => {
    const now = Date.now();
    
    // 重複チェックを防ぐ
    if (!force && sessionCheckInProgress) {
      if (sessionCheckRef.current) {
        return await sessionCheckRef.current;
      }
    }
    
    // 短時間での重複チェックを防ぐ
    if (!force && (now - lastSessionCheck) < SESSION_CHECK_INTERVAL) {
      return isLoggedIn;
    }

    sessionCheckInProgress = true;
    lastSessionCheck = now;

    const checkPromise = (async () => {
      try {
        // まずローカルストレージからセッションデータを確認
        const localSessionData = localStorage.getItem('ec_session_data');
        if (localSessionData && !force) {
          try {
            const parsedData = JSON.parse(localSessionData);
            const sessionAge = now - parsedData.createdAt;
            
            // セッションが24時間以内なら一時的に復元
            if (sessionAge < 24 * 60 * 60 * 1000) {
              setIsLoggedIn(true);
              setUserId(parsedData.userId);
              setEmail(parsedData.email);
              setMemberRank(parsedData.memberRank);
              console.log('ローカルセッションを一時復元しました', parsedData);
              return true;
            }
          } catch (error) {
            console.error('ローカルセッションデータの解析エラー:', error);
            localStorage.removeItem('ec_session_data');
          }
        }

        // サーバーサイドでセッションを検証
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setIsLoggedIn(true);
            setUserId(data.user.id);
            setEmail(data.user.email);
            setMemberRank(data.user.member_rank);

            // ローカルストレージを更新
            const sessionData = {
              userId: data.user.id,
              email: data.user.email,
              memberRank: data.user.member_rank,
              createdAt: now
            };
            localStorage.setItem('ec_session_data', JSON.stringify(sessionData));

            console.log('セッションを復元しました', sessionData);
            return true;
          }
        }

        // セッションが無効な場合はクリア
        setIsLoggedIn(false);
        setUserId(null);
        setEmail(null);
        setMemberRank(null);
        localStorage.removeItem('ec_session_data');
        return false;

      } catch (error) {
        console.error('セッション確認エラー:', error);
        // エラー時は未ログイン状態にリセット
        setIsLoggedIn(false);
        setUserId(null);
        setEmail(null);
        setMemberRank(null);
        localStorage.removeItem('ec_session_data');
        return false;
      } finally {
        sessionCheckInProgress = false;
        sessionCheckRef.current = null;
      }
    })();

    sessionCheckRef.current = checkPromise;
    return await checkPromise;
  };

  // 初期化時のセッション確認
  useEffect(() => {
    const initializeAuth = async () => {
      await checkSession(true); // 強制的にセッション確認
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  // ページ表示時のセッション確認（重複を防ぐ）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isInitialized) {
        checkSession(); // 重複チェックは内部で制御
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isInitialized]);

  // ログイン処理
  const login = (userData: any) => {
    setIsLoggedIn(true);
    setUserId(userData.id);
    setEmail(userData.email);
    setMemberRank(userData.member_rank);

    // ローカルストレージにセッションデータを保存
    try {
      const sessionData = {
        userId: userData.id,
        email: userData.email,
        memberRank: userData.member_rank,
        createdAt: Date.now()
      };
      localStorage.setItem('ec_session_data', JSON.stringify(sessionData));
    } catch (error) {
      console.error('セッションデータの保存エラー:', error);
    }
  };

  // ログアウト処理
  const logout = async () => {
    try {
      // ログアウトAPIを呼び出し
      await fetch('/api/auth/logout', { method: 'POST' });

      // ローカルストレージからセッションデータを削除
      localStorage.removeItem('ec_session_data');

      // 状態をリセット
      setIsLoggedIn(false);
      setUserId(null);
      setEmail(null);
      setMemberRank(null);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      userId, 
      email, 
      memberRank, 
      login, 
      logout, 
      checkSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// カスタムフック
export const useAuth = () => useContext(AuthContext);