import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import RecaptchaProvider from '@/app/components/RecaptchaProvider';
import ScoreDisplayScript from '@/app/components/ScoreDisplayScript';
import AIDetectorProvider from '@/app/components/AIDetectorProvider';
import { AuthProvider } from '@/app/lib/auth-provider';
import NavigationHeader from '@/app/components/NavigationHeader';
import FooterLinks from '@/app/components/FooterLinks';
import { BehaviorTrackerProvider } from '@/app/components/BehaviorTrackerProvider';
import Link from 'next/link';
import { getRecaptchaSiteKeyFromServer } from '@/app/lib/server/google-cloud';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '会員制ECサイト',
  description: 'AIエージェント攻撃検出・防御システム トライアル用',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const recaptchaSiteKey = getRecaptchaSiteKeyFromServer();

  return (
    <html lang="ja" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans bg-pink-50">
        <RecaptchaProvider siteKey={recaptchaSiteKey}>
          <ScoreDisplayScript siteKey={recaptchaSiteKey} />
          <BehaviorTrackerProvider>
            <AIDetectorProvider>
              <AuthProvider>
                <div className="min-h-screen flex flex-col">
                  <NavigationHeader />

                  <main className="flex-grow container mx-auto px-4 py-8 pt-40">
                    {children}
                  </main>

                  <footer className="bg-gradient-to-b from-pink-900 to-pink-950 text-white py-12 border-t border-pink-800">
                    <div className="container mx-auto px-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
                        <div className="md:col-span-4">
                          <div className="flex items-center mb-4">
                            <div className="bg-pink-600 p-2 rounded-lg mr-3">
                              <span className="font-bold text-lg">EC</span>
                            </div>
                            <h3 className="font-heading font-bold text-2xl">
                              会員制<span className="text-pink-400">ECサイト</span>
                            </h3>
                          </div>
                          <p className="text-gray-300 mb-4 max-w-md leading-relaxed">
                            高品質な商品を提供する会員制ECサイトです。AIエージェント攻撃検出・防御システムをトライアルできます。
                          </p>

                          <div className="flex space-x-4 mt-6">
                            <a
                              href="#"
                              className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                              aria-label="Follow us on Twitter"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.9 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.961-.695 1.797-1.562 2.457-2.549z" />
                              </svg>
                            </a>
                            <a
                              href="#"
                              className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                              aria-label="Follow us on Facebook"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.403.597 24 1.326 24h11.49v-9.294H9.691v-3.622h3.125V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.503 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.403 24 22.674V1.326C24 .597 23.403 0 22.675 0z" />
                              </svg>
                            </a>
                            <a
                              href="#"
                              className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
                              aria-label="Follow us on Instagram"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M7.75 2h8.5C19.55 2 22 4.45 22 7.75v8.5c0 3.3-2.45 5.75-5.75 5.75h-8.5C4.45 22 2 19.55 2 16.25v-8.5C2 4.45 4.45 2 7.75 2zm0-2C3.47 0 0 3.47 0 7.75v8.5C0 20.53 3.47 24 7.75 24h8.5C20.53 24 24 20.53 24 16.25v-8.5C24 3.47 20.53 0 16.25 0h-8.5z" />
                                <path d="M12 7a5 5 0 100 10 5 5 0 000-10zm0-2a7 7 0 110 14 7 7 0 010-14zm8.5-.25a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" />
                              </svg>
                            </a>
                          </div>
                        </div>

                        <div className="md:col-span-4">
                          <h4 className="font-medium text-lg mb-4 text-pink-300">サポート</h4>
                          <ul className="space-y-3 text-gray-300">
                            <li>
                              <Link
                                href="/products"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  商品一覧
                                </span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="/products?limited=true"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  限定商品
                                </span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  セール情報
                                </span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  カテゴリ一覧
                                </span>
                              </Link>
                            </li>
                          </ul>
                        </div>

                        <FooterLinks />

                        <div className="md:col-span-2">
                          <h4 className="font-medium text-lg mb-4 text-pink-300">システム</h4>
                          <ul className="space-y-3 text-gray-300">
                            <li className="text-gray-300">
                              <span className="border-b border-transparent">
                                reCAPTCHA Enterprise 常時稼働
                              </span>
                            </li>
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  プライバシーポリシー
                                </span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  お問い合わせ
                                </span>
                              </Link>
                            </li>
                          </ul>
                        </div>

                        <div className="md:col-span-2">
                          <h4 className="font-medium text-lg mb-4 text-pink-300">AI防御</h4>
                          <ul className="space-y-3 text-gray-300">
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  防御システムについて
                                </span>
                              </Link>
                            </li>
                            <li>
                              <Link
                                href="#"
                                className="hover:text-white transition-colors inline-block"
                              >
                                <span className="border-b border-transparent hover:border-gray-300">
                                  セキュリティブログ
                                </span>
                              </Link>
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-gray-800 pt-8 mt-4 flex flex-col md:flex-row md:justify-between items-center text-sm">
                        <p className="text-gray-400 mb-4 md:mb-0">
                          © {new Date().getFullYear()} 会員制ECサイト - AIエージェント攻撃検出・防御システム
                        </p>

                        <div className="flex space-x-6">
                          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                            利用規約
                          </Link>
                          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                            プライバシーポリシー
                          </Link>
                          <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                            特定商取引法に基づく表記
                          </Link>
                        </div>
                      </div>
                    </div>
                  </footer>
                </div>
              </AuthProvider>
            </AIDetectorProvider>
          </BehaviorTrackerProvider>
        </RecaptchaProvider>
      </body>
    </html>
  );
}
