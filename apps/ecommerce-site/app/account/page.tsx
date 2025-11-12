'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  age_group: string;
  occupation: string;
  member_rank: string;
  registration_date: string;
  total_orders: number;
  total_spent: number;
  last_purchase_date: string | null;
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // ユーザー情報取得
  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.status === 401) {
          // 未認証の場合はログインページへリダイレクト
          router.push('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('ユーザー情報の取得に失敗しました');
        }
        
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        console.error('User info error:', err);
        setError('ユーザー情報の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserInfo();
  }, [router]);

  // ログアウト処理
  async function handleLogout() {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('ログアウト処理に失敗しました');
      }
      
      // ログアウト成功
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      alert('ログアウト処理中にエラーが発生しました');
    }
  }
  
  // 会員ランクの表示色
  function getMemberRankColor(rank: string): string {
    switch (rank) {
      case 'bronze': return 'bg-yellow-700';
      case 'silver': return 'bg-gray-300';
      case 'gold': return 'bg-yellow-400';
      case 'platinum': return 'bg-blue-300';
      default: return 'bg-gray-200';
    }
  }
  
  // 年齢層の日本語表示
  function getAgeGroupText(ageGroup: string): string {
    switch (ageGroup) {
      case '20s': return '20代';
      case '30s': return '30代';
      case '40s': return '40代';
      case '50s+': return '50代以上';
      default: return ageGroup;
    }
  }
  
  // 職業の日本語表示
  function getOccupationText(occupation: string): string {
    switch (occupation) {
      case 'student': return '学生';
      case 'office': return '会社員（一般）';
      case 'tech': return 'IT・技術職';
      case 'service': return 'サービス業';
      case 'other': return 'その他';
      default: return occupation;
    }
  }
  
  if (loading) {
    return <div className="text-center py-8">ユーザー情報を読み込み中...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded">
        <p>ユーザー情報が取得できませんでした</p>
        <button
          onClick={() => router.push('/login')}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          ログインページへ
        </button>
      </div>
    );
  }
  
  // 登録日のフォーマット
  const registrationDate = new Date(user.registration_date).toLocaleDateString('ja-JP');
  
  // 最終購入日のフォーマット
  const lastPurchaseDate = user.last_purchase_date
    ? new Date(user.last_purchase_date).toLocaleDateString('ja-JP')
    : 'なし';
  
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">アカウント情報</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 bg-indigo-50 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-indigo-800">{user.email}</h2>
            <span className={`${getMemberRankColor(user.member_rank)} text-white px-2 py-1 rounded-full text-xs font-bold uppercase`}>
              {user.member_rank}
            </span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">会員情報</h3>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">年齢層</p>
                  <p>{getAgeGroupText(user.age_group)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">職業</p>
                  <p>{getOccupationText(user.occupation)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">登録日</p>
                  <p>{registrationDate}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">購入履歴</h3>
              <div className="mt-2 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">総注文数</p>
                  <p>{user.total_orders}件</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">総購入金額</p>
                  <p>¥{user.total_spent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">最終購入日</p>
                  <p>{lastPurchaseDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/orders')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          注文履歴を見る
        </button>
        
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ログアウト
        </button>
      </div>
    </div>
  );
}