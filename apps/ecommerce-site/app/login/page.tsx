'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-provider';
import { useRecaptcha } from '../components/RecaptchaProvider';
import { verifyRecaptcha } from '../actions/recaptcha';

const TEST_ACCOUNTS = [
  { label: '主婦', email: 'homemaker@example.com' },
  { label: '若年学生', email: 'student@example.com' },
  { label: '働く女性', email: 'office@example.com' },
  { label: '技術系男性', email: 'tech@example.com' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const {
    executeRecaptcha,
    executeRecaptchaCheck,
    isRecaptchaLoaded,
    isRecaptchaEnabled,
  } = useRecaptcha();

  useEffect(() => {
    if (!isRecaptchaEnabled) {
      return;
    }
    executeRecaptchaCheck('LOGIN_PAGE_CHECK').catch((error) => {
      console.warn('reCAPTCHA pre-check failed', error);
    });
  }, [executeRecaptchaCheck, isRecaptchaEnabled]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let recaptchaToken = '';

      if (isRecaptchaEnabled) {
        if (!isRecaptchaLoaded) {
          setError('reCAPTCHAの初期化中です。数秒後に再度お試しください。');
          return;
        }

        recaptchaToken = await executeRecaptcha('LOGIN');
        if (!recaptchaToken) {
          setError('reCAPTCHAの検証に失敗しました。しばらくしてから再試行してください。');
          return;
        }

        const verificationResult = await verifyRecaptcha(recaptchaToken, 'LOGIN');
        if (!verificationResult?.success) {
          setError('reCAPTCHA の検証結果が無効です。再度お試しください。');
          return;
        }
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          recaptchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'ログインに失敗しました');
        return;
      }

      login(data.user);
      router.push('/');
    } catch (submissionError) {
      console.error('Login error:', submissionError);
      setError('ログイン処理中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">ログイン</h1>

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
            onChange={(event) => setEmail(event.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
          <a
            className="inline-block align-baseline font-bold text-sm text-indigo-500 hover:text-indigo-800"
            href="/register"
          >
            アカウント登録
          </a>
        </div>
      </form>

      {isRecaptchaEnabled && (
        <div className="mt-6 flex items-center justify-center">
          <div className="bg-gray-50 rounded-md px-4 py-3 flex items-center shadow-sm border border-gray-200">
            <div className="w-8 h-8 mr-3">
              <img
                src="https://www.gstatic.com/recaptcha/api2/logo_48.png"
                alt="reCAPTCHA logo"
                className="w-full h-full"
              />
            </div>
            <div className="text-sm">
              <p className="text-gray-600 font-medium">このサイトはreCAPTCHA v3で保護されています</p>
              <p className="text-xs text-gray-500">Google reCAPTCHAが不正なアクセスを監視しています</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-sm mt-6">
        <p>テスト用アカウント:</p>
        {TEST_ACCOUNTS.map((account) => (
          <p key={account.email}>
            <strong>{account.label}:</strong> {account.email}, password123
          </p>
        ))}
      </div>
    </div>
  );
}
