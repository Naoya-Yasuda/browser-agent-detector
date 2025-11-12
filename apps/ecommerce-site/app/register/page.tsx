'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useRecaptcha } from '../components/RecaptchaProvider';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [occupation, setOccupation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { executeRecaptcha, isRecaptchaLoaded, isRecaptchaEnabled } = useRecaptcha();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    
    // 入力検証
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    
    setLoading(true);
    
    try {
      // reCAPTCHAトークンを取得（セキュリティモードがreCAPTCHAの場合のみ）
      let recaptchaToken = '';
      
      if (isRecaptchaEnabled && isRecaptchaLoaded) {
        try {
          recaptchaToken = await executeRecaptcha();
        } catch (recaptchaError) {
          console.error('reCAPTCHA実行エラー:', recaptchaError);
        }
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          age_group: ageGroup, 
          occupation,
          recaptchaToken // reCAPTCHAトークンを送信
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 登録成功
        router.push('/login?registered=true');
      } else {
        // 登録失敗
        setError(data.error || 'アカウント登録に失敗しました');
      }
    } catch (err) {
      setError('登録処理中にエラーが発生しました');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">アカウント登録</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
          <p className="text-gray-500 text-xs italic mt-1">8文字以上をお勧めします</p>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">
            パスワード（確認）
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="age-group">
            年齢層
          </label>
          <select
            id="age-group"
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">選択してください</option>
            <option value="20s">20代</option>
            <option value="30s">30代</option>
            <option value="40s">40代</option>
            <option value="50s+">50代以上</option>
          </select>
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="occupation">
            職業
          </label>
          <select
            id="occupation"
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          >
            <option value="">選択してください</option>
            <option value="student">学生</option>
            <option value="office">会社員（一般）</option>
            <option value="tech">IT・技術職</option>
            <option value="service">サービス業</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? '登録中...' : 'アカウント登録'}
          </button>
          <a className="inline-block align-baseline font-bold text-sm text-indigo-500 hover:text-indigo-800" href="/login">
            ログインへ戻る
          </a>
        </div>
      </form>
      
      {isRecaptchaEnabled && (
        <div className="mt-6 flex items-center justify-center">
          <div className="bg-gray-50 rounded-md px-4 py-3 flex items-center shadow-sm border border-gray-200">
            <div className="w-8 h-8 mr-3">
              <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA logo" className="w-full h-full" />
            </div>
            <div className="text-sm">
              <p className="text-gray-600 font-medium">このサイトはreCAPTCHA v3で保護されています</p>
              <p className="text-xs text-gray-500">この画面ではGoogle reCAPTCHAが不正なアクセスを監視しています</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
