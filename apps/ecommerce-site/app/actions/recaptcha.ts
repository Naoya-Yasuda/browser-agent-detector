'use server';

import { getApiBaseUrl } from '@/app/lib/runtime-env';

/**
 * reCAPTCHAの検証を行うサーバーアクション
 */
export async function verifyRecaptcha(token: string, action: string = 'submit') {
  try {
    // サーバー上では相対パスが解決されないので絶対URLが必要
    // Node.js環境ではwindow.locationが利用できないので環境変数かオリジンを使用する
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/security/recaptcha/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, action }),
      // 検証がされたことを確認するためにキャッシュを無効化
      cache: 'no-store'
    });

    return await response.json();
  } catch (error) {
    console.error('reCAPTCHA検証エラー:', error);
    return { 
      success: false, 
      error: '検証中にエラーが発生しました' 
    };
  }
}
