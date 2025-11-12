'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-provider';

export default function FooterLinks() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="md:col-span-2">
      <h4 className="font-medium text-lg mb-4 text-pink-300">アカウント</h4>
      <ul className="space-y-3 text-gray-300">
        {isLoggedIn ? (
          <>
            <li>
              <Link href="/account" className="hover:text-white transition-colors inline-block">
                <span className="border-b border-transparent hover:border-gray-300">アカウント情報</span>
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-white transition-colors inline-block">
                <span className="border-b border-transparent hover:border-gray-300">注文履歴</span>
              </Link>
            </li>
          </>
        ) : (
          <>
            <li>
              <Link href="/login" className="hover:text-white transition-colors inline-block">
                <span className="border-b border-transparent hover:border-gray-300">ログイン</span>
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-white transition-colors inline-block">
                <span className="border-b border-transparent hover:border-gray-300">会員登録</span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
