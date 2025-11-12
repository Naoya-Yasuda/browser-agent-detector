# AIエージェント攻撃検出・防御システム 検証用アプリケーション集

このディレクトリには、攻撃検知・防御機能のトライアル検証に利用するアプリケーション群が含まれています。

## プロジェクト構成

```
apps/
├── ecommerce-site/        # 会員制ECサイト（Next.js 14）
├── gcloud-key.json        # reCAPTCHA Enterprise 接続用のサービスアカウント鍵（取り扱いに注意）
└── README.md
```

## 会員制ECサイト (ecommerce-site)

スニーカーボットなどの自動化攻撃シナリオを検証するためのNext.jsアプリです。認証・商品購入フローと連携した reCAPTCHA Enterprise が常時稼働し、行動ログに基づく AI 検知のデモも同梱しています。

- ポート: 3002
- 主な機能:
  - 会員登録・ログイン
  - 限定商品の閲覧・購入
  - ショッピングカート、注文管理

### セットアップ

```bash
cd apps/ecommerce-site
pnpm install
pnpm run build-sqlite          # sqlite3 のバイナリを取得
pnpm run init-db    # sqlite データベース初期化
pnpm run dev        # http://localhost:3002 で起動
```

> **note:** ネイティブ bindings (`node_sqlite3.node`) が見つからない場合は `rm -rf node_modules .pnpm-store` で一度クリーンアップし、`pnpm install` → `pnpm run build-sqlite` を実行してください。`pnpm run build-sqlite` は `prebuild-install` を用いて公式のバイナリを取得するため、ビルドツールのセットアップ無しで復旧できます。

### セキュリティ設定

- reCAPTCHA Enterprise を利用する場合は、以下の値を環境変数で設定してください。
  - `GOOGLE_CLOUD_PROJECT_ID`
  - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` （クライアントでも参照）
  - 必要に応じて `GOOGLE_APPLICATION_CREDENTIALS`（サービスアカウント JSON）
- `.env`（または `.env.local`）で値を設定しておけば、アプリ起動時に自動で reCAPTCHA Enterprise が読み込まれます。
- 環境変数が未設定の場合のみ「無保護」モードになります。
