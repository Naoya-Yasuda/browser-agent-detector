'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrderCompletePage() {
  const router = useRouter();
  
  // 自動的にホームページにリダイレクトする（5秒後）
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center">
      <div className="bg-white shadow-lg rounded-lg p-8 border border-green-200">
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">ご注文ありがとうございます！</h1>
        <p className="text-gray-600 mb-8">
          注文が正常に処理されました。<br />
          ご注文の詳細はマイページでご確認いただけます。
        </p>
        
        <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-4 justify-center">
          <Link href="/" className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors">
            トップページへ戻る
          </Link>
          <Link href="/orders" className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
            注文履歴を見る
          </Link>
        </div>
        
        <p className="text-sm text-gray-500 mt-8">
          5秒後に自動的にトップページに移動します...
        </p>
      </div>
    </div>
  );
}