'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  status: string;
  security_mode: string | null;
  bot_score: number | null;
  security_action: string | null;
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // 注文履歴取得
  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch('/api/orders');
        
        if (response.status === 401) {
          // 未認証の場合はログインページへリダイレクト
          router.push('/login');
          return;
        }
        
        if (!response.ok) {
          throw new Error('注文履歴の取得に失敗しました');
        }
        
        const data = await response.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error('Orders fetch error:', err);
        setError('注文履歴の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, [router]);

  // 注文ステータスの日本語表示
  function getStatusText(status: string): string {
    switch (status) {
      case 'pending': return '処理中';
      case 'processing': return '処理中';
      case 'completed': return '完了';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  }
  
  // 日付フォーマット
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  if (loading) {
    return <div className="text-center py-8">注文履歴を読み込み中...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">注文履歴</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded">
          <p>注文履歴がありません</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            商品一覧へ
          </button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">合計</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      #{order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                      ¥{order.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/orders/${order.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}