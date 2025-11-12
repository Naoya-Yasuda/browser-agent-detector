'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  recipient_email?: string; // ギフトカード用の受取人メールアドレス
  product?: {
    name: string;
    price: number;
    image_path: string | null;
    stock_quantity: number;
    category: number; // ギフトカードかどうかを判定するため
  };
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<{[key: number]: string}>({});
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(true);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const router = useRouter();


  // カート情報取得
  useEffect(() => {
    async function fetchCart() {
      try {
        const response = await fetch('/api/cart');

        if (response.status === 401) {
          // 未認証の場合はログインページへリダイレクト
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('カート情報の取得に失敗しました');
        }

        const data = await response.json();
        setCartItems(data.cartItems || []);

        // 既存の受取人メールアドレスをstateに設定
        const emails: {[key: number]: string} = {};
        data.cartItems?.forEach((item: CartItem) => {
          if (item.recipient_email) {
            emails[item.id] = item.recipient_email;
          }
        });
        setRecipientEmails(emails);
      } catch (err) {
        console.error('Cart fetch error:', err);
        setError('カート情報の読み込み中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    }

    fetchCart();
  }, [router]);

  // 商品数量変更
  async function handleQuantityChange(cartItemId: number, newQuantity: number) {
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, quantity: newQuantity })
      });

      if (!response.ok) {
        throw new Error('カートの更新に失敗しました');
      }

      const data = await response.json();
      setCartItems(data.cartItems || []);

      // ヘッダーのカート数を更新
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
    } catch (err) {
      console.error('Cart update error:', err);
      alert('カートの更新中にエラーが発生しました');
    }
  }

  // ギフトカードかどうかを判定
  function isGiftCard(category: number): boolean {
    return category === 11; // カテゴリ11がギフトカード
  }

  // 受取人メールアドレス更新
  async function handleRecipientEmailChange(cartItemId: number, email: string) {
    setRecipientEmails(prev => ({
      ...prev,
      [cartItemId]: email
    }));

    // APIに受取人メールアドレスを送信
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, recipientEmail: email })
      });

      if (!response.ok) {
        throw new Error('受取人メールアドレスの更新に失敗しました');
      }
    } catch (err) {
      console.error('Recipient email update error:', err);
      // エラーが発生した場合は元の状態に戻す
      setRecipientEmails(prev => ({
        ...prev,
        [cartItemId]: prev[cartItemId] || ''
      }));
    }
  }

  // OTP送信（ダミー実装）
  async function handleSendOTP() {
    try {
      // 実際のSMS送信は行わない（ダミー実装）
      console.log('OTP送信（ダミー）');
      alert('SMSでOTPコードを送信しました（ダミー実装）');
    } catch (err) {
      console.error('OTP送信エラー:', err);
      alert('OTP送信に失敗しました');
    }
  }

  // OTP検証（ダミー実装）
  async function handleVerifyOTP() {
    if (!otpCode.trim()) {
      alert('OTPコードを入力してください');
      return;
    }

    setOtpVerifying(true);

    try {
      // ダミーの検証処理（実際の検証は行わない）
      console.log('OTP検証（ダミー）:', otpCode);

      // 2秒待機してダミーの検証時間をシミュレート
      await new Promise(resolve => setTimeout(resolve, 2000));

      // ダミーで失敗とする（実際の検証ロジックは不要）
      alert('OTP検証が失敗しました（ダミー実装）');

      // エラー状態をクリアしてカート画面に戻る
      setError(null);
      setOtpCode('');
      setOtpSent(true);
      setShowOTPVerification(false);

    } catch (err) {
      console.error('OTP検証エラー:', err);
      alert('OTP検証に失敗しました');
    } finally {
      setOtpVerifying(false);
    }
  }

  // カートから商品削除
  async function handleRemoveItem(cartItemId: number) {
    try {
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartItemId, quantity: 0 })
      });

      if (!response.ok) {
        throw new Error('商品の削除に失敗しました');
      }

      const data = await response.json();
      setCartItems(data.cartItems || []);

      // ヘッダーのカート数を更新
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
    } catch (err) {
      console.error('Cart remove error:', err);
      alert('商品の削除中にエラーが発生しました');
    }
  }

  // カートをクリア
  async function handleClearCart() {
    try {
      const response = await fetch('/api/cart', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('カートのクリアに失敗しました');
      }

      setCartItems([]);

      // ヘッダーのカート数を更新
      if ((window as any).updateCartCount) {
        (window as any).updateCartCount();
      }
    } catch (err) {
      console.error('Cart clear error:', err);
      alert('カートのクリア中にエラーが発生しました');
    }
  }

  // 購入手続き処理
  async function handlePurchaseCheck() {
    setIsProcessing(true);
    setError(null); // エラー状態をリセット

    try {
      // クッキーを含めるためにcredentials: 'include'を追加
      const response = await fetch('/api/purchase/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });

      const data = await response.json();

      // クラスタリングスコアと閾値をローカルストレージに保存（成功・失敗問わず）
      if (data.clusteringScore !== null && data.clusteringScore !== undefined) {
        localStorage.setItem('clusteringScore', data.clusteringScore.toFixed(3));
        console.log('クラスタリングスコアを保存:', data.clusteringScore);

        // 閾値も保存
        if (data.clusteringThreshold !== null && data.clusteringThreshold !== undefined) {
          localStorage.setItem('clusteringThreshold', data.clusteringThreshold.toFixed(3));
          console.log('クラスタリング閾値を保存:', data.clusteringThreshold);
        }

        // ポップアップを強制的に表示
        if ((window as any).createScoreDisplay) {
          const recaptchaScore = localStorage.getItem('recaptchaOriginalScore') || '-';
          const aiDetectorScore = localStorage.getItem('aiDetectorScore') || '-';
          const clusteringScore = data.clusteringScore.toFixed(3);
          const clusteringThreshold = data.clusteringThreshold ? data.clusteringThreshold.toFixed(3) : '-';
          (window as any).createScoreDisplay(null, recaptchaScore, aiDetectorScore, clusteringScore, clusteringThreshold);
        }
      }

      if (response.ok) {
        // 購入手続き成功、カートをクリアして注文完了ページへリダイレクト
        setCartItems([]);

        // ヘッダーのカート数を更新
        if ((window as any).updateCartCount) {
          (window as any).updateCartCount();
        }

        router.push('/order-complete');
      } else if (response.status === 403) {
        // AIエージェント検知エラー - OTP検証モードを有効にする
        setError('AIエージェントによる不正操作を検知：ユーザーのペルソナから逸脱した異常な行動を検知しました。');
        setShowOTPVerification(true);
        setIsProcessing(false); // 403エラーの場合は処理を終了
        return; // 早期リターンで処理を停止
      } else {
        throw new Error(data.error || '購入手続きに失敗しました');
      }
    } catch (err) {
      console.error('Purchase check error:', err);
      setError('購入手続き中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  }

  // 合計金額計算
  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + ((item.product?.price || 0) * item.quantity);
  }, 0);

  if (loading) {
    return <div className="text-center py-8">カート情報を読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">ショッピングカート</h1>

        {/* エラーメッセージ表示 */}
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex flex-col sm:flex-row">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="sm:ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800 mb-1">エラーが発生しました</h3>
              <p className="text-sm text-red-700 break-words leading-relaxed">{error}</p>
            </div>
          </div>
        </div>

        {/* OTP検証セクション */}
        {showOTPVerification && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-blue-800 mb-2">本人確認が必要です</h3>
                <p className="text-sm text-blue-700 mb-4">
                  セキュリティのため、SMSで送信されるOTPコードを入力してください。
                </p>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        OTPコード（6桁）
                      </label>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleVerifyOTP}
                        disabled={otpVerifying || !otpCode.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {otpVerifying ? '検証中...' : 'OTPコードを確認'}
                      </button>
                      <button
                        onClick={() => {
                          setShowOTPVerification(false);
                          setOtpCode('');
                          setOtpSent(false);
                          setError(null);
                        }}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-8">
          <button
            onClick={() => router.push('/products')}
            className="px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            商品一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ショッピングカート</h1>

      {cartItems.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded">
          <p>カートに商品がありません</p>
          <button
            onClick={() => router.push('/products')}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
          >
            商品一覧に戻る
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">単価</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">小計</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 flex-shrink-0 bg-gray-100 mr-4 rounded overflow-hidden">
                            {item.product?.image_path ? (
                              <img
                                src={item.product.image_path}
                                alt={item.product?.name}
                                className="h-8 w-8 object-contain"
                              />
                            ) : (
                              <div className="h-8 w-8 flex items-center justify-center text-gray-400 text-xs">画像なし</div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{item.product?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500">
                        ¥{(item.product?.price || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                            className="w-8 h-8 bg-gray-100 text-gray-600 rounded-l flex items-center justify-center"
                          >
                            -
                          </button>
                          <div className="w-10 h-8 bg-white border border-gray-300 flex items-center justify-center text-gray-900">
                            {item.quantity}
                          </div>
                          <button
                            onClick={() => handleQuantityChange(item.id, Math.min((item.product?.stock_quantity || 0), item.quantity + 1))}
                            disabled={(item.quantity >= (item.product?.stock_quantity || 0))}
                            className={`w-8 h-8 rounded-r flex items-center justify-center ${
                              item.quantity >= (item.product?.stock_quantity || 0)
                                ? 'bg-gray-100 text-gray-400'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                        ¥{((item.product?.price || 0) * item.quantity).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                    {isGiftCard(item.product?.category || 0) && (
                      <tr>
                        <td colSpan={5} className="px-6 py-2 bg-gray-50">
                          <div className="flex items-center justify-end">
                            <label className="text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">
                              受取人メールアドレス:
                            </label>
                            <input
                              type="email"
                              placeholder="受取人のEメールアドレス"
                              value={recipientEmails[item.id] || ''}
                              onChange={(e) => handleRecipientEmailChange(item.id, e.target.value)}
                              className="w-96 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-medium">合計:</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-bold">
                    ¥{totalPrice.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-between mb-8">
            <button
              onClick={() => router.push('/products')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              買い物を続ける
            </button>

            <div className="space-x-4">
              <button
                onClick={handleClearCart}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                カートを空にする
              </button>

              <button
                onClick={handlePurchaseCheck}
                disabled={isProcessing}
                className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-indigo-300"
              >
                {isProcessing ? '購入手続き中...' : '購入手続き'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}