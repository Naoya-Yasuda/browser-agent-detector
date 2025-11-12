'use client';

import { useAuth } from './lib/auth-provider';

export default function HomePage() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="p-4">
      {/* ヒーローセクション */}
      <div
        className="relative overflow-hidden rounded-xl mb-10 bg-gradient-to-r from-pink-600 to-pink-800 text-white"
        style={{
          backgroundImage: "url('/images/pattern.png')",
          backgroundSize: '400px',
          backgroundBlendMode: 'overlay',
        }}
      >
        <div className="relative z-10 p-8 md:p-12 flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">最新テクノロジーを、あなたの手元に</h1>
          <p className="text-indigo-100 max-w-2xl mb-8">厳選された高品質な商品を、特別価格でお届けします。会員限定の特典もご用意しています。</p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/products" className="btn bg-white text-pink-700 hover:bg-pink-50 font-semibold px-6 py-3 rounded-lg transition-all shadow-lg hover:shadow-xl">
              商品を見る
            </a>
            {!isLoggedIn && (
              <a href="/register" className="btn border-2 border-white text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-lg transition-all">
                会員登録
              </a>
            )}
            {isLoggedIn && (
              <a href="/account" className="btn border-2 border-white text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-lg transition-all">
                アカウント
              </a>
            )}
          </div>
        </div>

        {/* 装飾用の丸い要素 */}
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-pink-500 opacity-20"></div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-pink-600 opacity-20"></div>
      </div>

      {/* カードセクション */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        <a href="/products" className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center p-6 border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="bg-blue-100 p-4 rounded-xl mb-4 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-blue-600 text-2xl font-bold">商品</span>
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-blue-700 transition-colors">商品一覧</h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">様々な商品を見る</p>
          </div>
        </a>

        <a href="/products?limited=true" className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center p-6 border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-red-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="bg-red-100 p-4 rounded-xl mb-4 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-red-600 text-2xl font-bold">限定</span>
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-red-700 transition-colors">限定商品</h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">数量限定の特別商品</p>
          </div>
          <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">PREMIUM</div>
        </a>

        <div className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center p-6 border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="relative z-10">
            <div className="bg-green-100 p-4 rounded-xl mb-4 w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-green-600 text-2xl font-bold">守</span>
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-green-700 transition-colors">常時保護</h2>
            <p className="text-gray-600 group-hover:text-gray-800 transition-colors">
              Google reCAPTCHA Enterprise による防御が常に稼働しています
            </p>
          </div>
        </div>
      </div>

      {/* セキュリティ情報カード */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="bg-pink-100 p-3 rounded-lg">
            <span className="text-pink-700 text-2xl font-bold">AI</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">AI検出・防御システム</h2>
            <p className="text-gray-600">
              このサイトでは Google reCAPTCHA Enterprise が常時動作し、不審なアクセスをサーバー側で即時検証しています。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-5 rounded-lg shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="font-bold text-lg">reCAPTCHA v3</h3>
            </div>
            <p className="text-gray-600">ボットやAIエージェントによる挙動をスコアリングし、疑わしいトラフィックを即時監視。</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <h3 className="font-bold text-lg">行動ログ監査</h3>
            </div>
            <p className="text-gray-600">ログインや購入フローで取得した行動メトリクスを保存し、異常値を検知します。</p>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm hover:shadow transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <h3 className="font-bold text-lg">可視化ダッシュボード</h3>
            </div>
            <p className="text-gray-600">画面左下のバッジで reCAPTCHA の稼働状況とスコアをリアルタイム表示します。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
