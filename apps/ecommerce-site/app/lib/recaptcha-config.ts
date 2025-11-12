/**
 * reCAPTCHA関連のクライアント設定値。
 * NEXT_PUBLIC_ から始まる環境変数のみクライアントに展開される。
 */
export const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? '';
