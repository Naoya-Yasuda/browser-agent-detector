'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product_name?: string;
  product_image_path?: string | null;
}

export default function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const orderId = params.orderId;
  
  // 注文詳細取得
  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (response.status === 401) {
          // 未認証の場合はログインページへリダイレクト
          router.push('/login');
          return;
        }
        
        if (response.status === 404) {
          setError('注文が見つかりません');
          setLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('注文詳細の取得に失敗しました');
        }
        
        const data = await response.json();
        setOrder(data.order || null);
        setOrderItems(data.items || []);
      } catch (err) {
        console.error('Order details fetch error:', err);
        setError('注文詳細の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrderDetails();
  }, [orderId, router]);

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
  
  // セキュリティモードの日本語表示
  function getSecurityModeText(mode: string | null): string {
    switch (mode) {
      case 'none': return '無保護';
      case 'recaptcha': return 'reCAPTCHA v3';
      case 'ai-detector': return 'AIエージェント検知';
      case 'recaptcha+ai-detector': return 'AIエージェント検知 + reCAPTCHA';
      default: return mode || '不明';
    }
  }
  
  if (loading) {
    return <div className="text-center py-8">注文詳細を読み込み中...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          注文履歴に戻る
        </button>
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded">
        <p>注文情報が取得できませんでした</p>
        <button
          onClick={() => router.push('/orders')}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          注文履歴に戻る
        </button>
      </div>
    );
  }
  
  // 注文日時のフォーマット
  const orderDate = new Date(order.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">注文詳細</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-semibold">注文番号: {order.id}</h2>
            <p className="text-gray-500">{orderDate}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            order.status === 'completed' ? 'bg-green-100 text-green-800' :
            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {getStatusText(order.status)}
          </div>
        </div>
        
        {/* セキュリティ情報 */}
        <div className="mb-6 bg-gray-50 p-4 rounded">
          <h3 className="font-medium">セキュリティ情報</h3>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-gray-500">セキュリティモード</span>
              <span>{getSecurityModeText(order.security_mode)}</span>
            </div>
            {order.bot_score !== null && (
              <div>
                <span className="block text-gray-500">Botスコア</span>
                <span className={
                  order.bot_score > 0.7 ? 'text-red-600' :
                  order.bot_score > 0.3 ? 'text-yellow-600' :
                  'text-green-600'
                }>
                  {order.bot_score.toFixed(2)}
                </span>
              </div>
            )}
            {order.security_action && (
              <div>
                <span className="block text-gray-500">セキュリティアクション</span>
                <span>{order.security_action}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* 注文アイテム */}
        <h3 className="font-semibold mb-2">注文商品</h3>
        <table className="w-full mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">単価</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">小計</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orderItems.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 bg-gray-100 mr-4">
                      {item.product_image_path ? (
                        <img
                          src={item.product_image_path}
                          alt={item.product_name}
                          className="h-10 w-10 object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center text-gray-400 text-xs">画像なし</div>
                      )}
                    </div>
                    <div className="font-medium text-gray-900">{item.product_name}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                  ¥{item.unit_price.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-500">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-gray-900">
                  ¥{(item.unit_price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-medium">合計:</td>
              <td className="px-4 py-3 text-right text-gray-900 font-bold">
                ¥{order.total_amount.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/products')}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          買い物を続ける
        </button>
        
        <button
          onClick={() => router.push('/orders')}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          注文履歴に戻る
        </button>
      </div>
    </div>
  );
}
