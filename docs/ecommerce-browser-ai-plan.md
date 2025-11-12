# ECサイト向けブラウザ操作拡張 & AI Detector連携 実装方針

## 1. 背景と目的

- `docs/browser-detection-v2.md` で推奨されている **多層シグナルの統合（TLS/HTTP指紋＋行動時系列＋補助指紋）** を、`apps/ecommerce-site` のブラウザ計測に取り込みたい。
- 収集した拡張データを `ai-detector`（FastAPI + LightGBM + KMeans/IsolationForest）へ送信し、**AIエージェント検知スコアを本番想定のLightGBM推論に置き換える**。
- API側のモデル改修はスコープ外。ただし `UnifiedDetectionRequest` へ準拠したペイロードを組み立て、LightGBMや将来のJa4/HTTP署名特徴量に再利用できるフォーマットで渡す。

## 2. 現状整理

| レイヤ | 実装 | 課題 |
| --- | --- | --- |
| クライアント計測 | `lib/behavior-tracker.ts` がマウス/クリック/キー/スクロール/フォーム情報と `deviceFingerprint` を計算し、5秒おきに `/api/security/aidetector/detect` へ送信。 | ブラウザ情報の粒度は高いが、**canvas/webGL/JA4/HTTP署名等の多層シグナル活用が未整理**。`BehaviorTracker`が直接APIへPOSTしているため、サーバー側で `ai-detector` へ中継する余地がない。 |
| Next.js API | `/api/security/aidetector/detect` は `computeBotScore` で疑似スコアを返し、`/check` もモック値。 | **`ai-detector` 実サービスと未連携**。`aiDetector.endpointUrl/apiKey` も未使用。クライアント通知は `window` イベントで代替予定。 |
| ai-detector | `POST /detect` が `UnifiedDetectionRequest` を受け取り、`services/feature_extractor.py` が 26 特徴量を計算し LightGBM へ入力。 | クライアントから送られてくるデータが仕様 (`docs/browser-detection-data.md`, `docs/data-model.md`) に合致しないと精度が担保できない。 |

## 3. 要求されるシグナル整理（`docs/browser-detection-v2.md` 抜粋）

1. **強シグナルの組み合わせ**  
   - TLS/JA4, HTTP Message Signatures, 行動時系列（IAT、スクロールゆらぎ、フォーム入力速度）。
2. **ブラウザフィンガープリント強化**  
   - Canvas/WebGL指紋、`navigator.userAgentData`、Chromium派生判定、`vendor/appVersion/platform` 等。
3. **行動時系列の可視化**  
   - クリック/スクロール/キー操作間隔、初回操作遅延、Paste率、休憩頻度。
4. **誤検知対策**  
   - スコアの多段判定（allow/challenge/block）と、疑義セッションの重点サンプリング。

本戦略では TLS/HTTP 署名収集はサーバー／NW 層の課題として後続タスクに残し、クライアントで取得できるシグナルの密度を上げた上で API へ正規化して渡す。

## 4. 実装方針（リポジトリ再編後）

### 4.1 ルートディレクトリ構成の再定義

`apps/ecommerce-site` を「SDK 利用側のリファレンス実装」、`ai-detector` を「推論 API」、そして **新規ディレクトリ `browser-agent-sdk/`** を「ブラウザ操作とフィンガープリントを収集し API へ転送するエージェント」として切り分ける。

| ディレクトリ | 役割 | 主な成果物 |
| --- | --- | --- |
| `browser-agent-sdk/` | 第3者サイトが流用できるブラウザ計測エージェント。 | `packages/agent-core`（イベント収集/指紋/行動統計）、`packages/adapters/*`（React/Vanilla/Node ブリッジ）、`packages/web-snippet`（GA4 風 IIFE）。 |
| `apps/ecommerce-site/` | SDK 利用例および Next.js API のホスト。最小コードでエージェントを呼び出す。 | `app/providers`（SDK adapter の薄いラッパー）、`app/api/security/aidetector/*`（SDK の Node ブリッジを呼び出すだけ）。 |
| `ai-detector/` | FastAPI + LightGBM の推論サービス。 | 既存 `UnifiedDetectionRequest` スキーマとモデル群。 |

こうすることで、ブラウザ計測や API リクエストの実装を `browser-agent-sdk/` に集約し、他プロジェクトでも `<script>` 1本または npm 依存だけで利用できる。

### 4.2 `browser-agent-sdk/packages/agent-core`

1. **BehaviorTracker モジュールの外出し**
   - `BehaviorTrackerFacade`, `EventCollector`, `MetricsAggregator`, `FingerprintRegistry`, `BehaviorEventBus` など 8 章で設計したクラスを `packages/agent-core/src` に移動。
   - 収集対象（マウス/クリック/キー/スクロール/フォーム/Paste/WebGL/Canvas）や `recent_actions` 生成はこのモジュールが単独で完結。React/Next.js への依存を排除する。
2. **シグナル拡張の共通化**
   - `browser_info` 拡張、`anti_fingerprint_signals`, `http_signature_state` などは `agent-core` のデフォルト出力として提供。ユースケース固有のカスタムフィールドは `BehaviorEventBus` のプラグインで拡張できる。
   - TLS/JA4・HTTP 署名はクライアントでは取得せず、**Next.js API で `extractNetworkFingerprint()` を用いてサーバー側に付与**。これにより秘密鍵なしで第三者も同じ仕組みを利用可能。
3. **送信契機の共通 API**
   - `agent-core` は `snapshotScheduler`（5秒毎 + beforeunload）と `captureCriticalAction(actionId)` を内包し、送信対象をイベントドリブンで決める。I/F は `Promise<BehaviorSnapshot>` を返し、呼び出し側で `SecurityApiClient` に流すだけにする。
4. **API クライアントの抽象化**
   - `packages/agent-core` 内に `DetectionTransport` interface を定義し、デフォルト実装として `BrowserFetchTransport`（直接 `ai-detector` へ送信）と `ProxyTransport`（導入サイト側 API を叩く）を同梱。導入側は config で切り替えるだけで済む。

### 4.3 `browser-agent-sdk/packages/distribution`

1. **React/Vanilla Adapter**
   - `packages/adapters/react` は `BehaviorTrackerProvider`, `AIDetectorProvider`, `useBehaviorTracker`, `useDetectionScore` を提供し、React が無い環境では `packages/adapters/vanilla` の `createAiDetectorClient()` を使う。両者とも内部で `agent-core` の Facade を DI するだけの薄い層。
2. **GA4 風スニペット**
   - `packages/web-snippet` は IIFE で `window.aiDetector` コマンドキューを提供し、`aiDetector('init', {...})`, `aiDetector('capture', {...})`, `aiDetector('provide', 'logger', fn)` などをルーティングする `CommandRouter` を実装（詳細は 8.7 節）。これにより第三者は HTML に `<script data-ai-detector-token=...>` を一行追加するだけで導入できる。
3. **Node ブリッジ**
   - `packages/node-bridge` は Next.js や他フレームワークの API ルートで利用するラッパー。`normalizePayload`, `enrichContext`, `callAIDetector` の純関数を公開し、アプリ側ではそれらを組み合わせるだけで `UnifiedDetectionRequest` を生成できる。

### 4.4 `apps/ecommerce-site`（導入サイト）の役割

1. **クライアント側**
   - `app/providers/BehaviorTrackerProvider.tsx` は `import { BehaviorTrackerProvider } from '@browser-agent-sdk/adapters/react'` を再エクスポートし、アプリ固有の設定（`siteId`, `criticalActionMap` など）だけを注入。
   - UI コンポーネントは GA4 と同様に `window.aiDetector` もしくは React Hook 経由で `captureCriticalAction` を呼ぶのみ。独自の計測ロジックは保持しない。
2. **サーバー側**
   - `/api/security/aidetector/detect` は `@browser-agent-sdk/node-bridge` を呼び出すだけの薄いハンドラに置き換え、検知結果は `BehaviorTrackerProvider` → `window` イベントでフロントへ通知。アプリ固有なのはセッション ID 解決やレスポンスの UI 変換のみ。
   - `SecurityConfig` の API Key や Endpoint は引き続きここで管理するが、SDK が `ProxyTransport` を利用する前提で第三者にも使い回せる。

### 4.5 Next.js API (`/api/security/aidetector/*`)

1. **ペイロード正規化レイヤ**
   - `node-bridge` の `normalizeDetectionPayload()` を使い、`behavioralData`, `deviceFingerprint`, `contextData`, `recent_actions` を `snake_case` に変換。メタ情報（`sessionId`, `ipAddress`, `requestId`, `headers`）は `enrichContext()` が担当する。
2. **AI Detector へのフォワード**
   - `createSecurityApiClient(config)`（SDK 提供）で `endpointUrl`/`apiKey` を注入し、`client.sendDetection()` を呼び出す。タイムアウト／エラー時は `Fail-Open (riskLevel='medium')` を SDK 内の共通ポリシーで処理し、導入側の分岐コードを削減。
3. **レスポンス整形とロギング**
   - `UnifiedDetectionResponse` から `botScore/humanScore/riskLevel/reasons` への変換は `apps/ecommerce-site` 側の UI コンバーターで最小限実装。  
   - `AI_DETECTOR_TRAINING_LOG` などのテレメトリは `node-bridge` が `logs/security.log`（JSONL）へ追記する仕組みを提供し、導入側は保存先パスだけ設定すればよい。

この再編によって、`apps/ecommerce-site` は SDK を呼び出す最小限の実装となり、将来的には任意の第三者サイトも同一 SDK（または GA4 風スニペット）でブラウザ指紋＆行動データ収集と API リクエストを行える。

## 5. 実装手順（優先度順）

1. **`browser-agent-sdk` ひな型作成**
   - ルート直下に `browser-agent-sdk/` を追加し、`tsconfig.base.json`, `eslint`, `vitest` などモノレポ共通設定を整備。
   - `packages/agent-core`, `packages/adapters/react`, `packages/adapters/vanilla`, `packages/web-snippet`, `packages/node-bridge` のワークスペースを宣言。
2. **agent-core へのロジック移動**
   - 既存 `apps/ecommerce-site/lib/behavior-tracker.ts` のクラス/型/ユーティリティを `packages/agent-core` へ移植し、シグナル拡張・イベント設計（4.2節/8章）を完了させる。
   - `DetectionTransport` interface とデフォルト実装（BrowserFetch/Proxy）を用意。`BehaviorSnapshot` 型は `ai-detector` の `UnifiedDetectionRequest` とフィールド互換にする。
3. **配布層の整備**
   - React/Vanilla adapter に Facade を注入する `Provider`/`createClient` を実装し、`apps/ecommerce-site` からの依存を切り替える。
   - GA4 風スニペット（web-snippet）とコマンドキュー、Node ブリッジ（normalize/enrich/send）を追加し、ビルドパイプライン（rollup）で `esm/iife` を生成。
4. **`apps/ecommerce-site` の最小化**
   - クライアント: 既存 Provider/Hooks を SDK から re-export する薄いラッパーに差し替え、アプリ固有の設定のみ保持。
   - サーバー: `/api/security/aidetector/detect|check` を `@browser-agent-sdk/node-bridge` ベースへ書き換え。UI 変換とセッション取得以外のロジックは削除。
5. **ドキュメント・検証**
   - `README` / `docs/browser-detection-data.md` / `apps/ecommerce-site/README.md` に新ディレクトリ構成と導入手順（`npm install @browser-agent-sdk` と `<script>` 例）を追記。
   - `agent-core` 単体テスト + adapters の結合テスト + Next.js API 経由の E2E を整備し、`logs/security.log` で request/response を確認。

## 6. データフロー（更新後）

```mermaid
flowchart LR
  subgraph ThirdPartySite["任意の導入サイト（例: apps/ecommerce-site）"]
    UI["UI / Checkout / PDP"]
    Provider["@browser-agent-sdk/adapters/react \n or window.aiDetector snippet"]
  end
  subgraph SDK["browser-agent-sdk"]
    Agent["agent-core (BehaviorTracker/FP)"]
    Transport["DetectionTransport (BrowserFetch/Proxy)"]
    NodeBridge["node-bridge (normalize/enrich/send)"]
  end
  subgraph Server["apps/ecommerce-site Next.js API"]
    Detect["/api/security/aidetector/detect"]
  end
  AID["ai-detector FastAPI /detect"]
  Logs["logs/security.log + ai-detector/logs"]

  UI --> Provider --> Agent
  Agent --> Transport
  Transport -->|Proxy mode| Detect
  Detect --> AID --> Detect
  Detect --> NodeBridge
  NodeBridge --> Logs
  Detect --> Provider
  Provider --> UI
```

## 7. 追加検討事項 / 後続タスク

- **TLS/JA4・HTTP署名**: `browser-detection-v2.md` 最優先項目。Cloudflare やサーバーサイド計測ツールで JA4 を取得し、`device_fingerprint` に `tls_ja4` / `http_signature` を追加する計画を別タスクで設定。
- **行動ログの AB テスト**: `botScore` しきい値（0.4/0.6/0.85）を計測し、誤検知率を `ai-detector/logs/training` の JSONL と突合。
- **Persona データ統合**: ユーザーの年齢/性別/購買履歴を `persona_features` として埋めると、クラスタ異常検知が活きる。ECサイトの会員データベースと照合するサービス層を追加予定。
- **Multi-tenant config**: `SecurityConfig` を `.env` 依存から管理画面で切り替えられるよう拡張し、reCAPTCHA と ai-detector の共存を実現。

## 8. 詳細設計（Reactアンチパターン回避 & SOLID 準拠）

### 8.1 クライアントモジュール構造

React 側で副作用を Context に押し込むアンチパターンを避けるため、ブラウザ計測は **宣言的 UI（コンポーネント）と命令的サービス層（クラス群）** を分離する。これらのクラスは `browser-agent-sdk/packages/agent-core` に実装し、導入サイトは SDK を経由して利用する。SOLID に沿った責務とコラボレーションは下記の通り。

```mermaid
classDiagram
    class BehaviorTrackerFacade {
      +init()
      +captureCriticalAction(actionId: string)
      +getSnapshot(): BehaviorSnapshot
    }
    class EventCollector {
      +start()
      +events: BehaviorEvent[]
    }
    class MetricsAggregator {
      +compute(events): BehavioralData
      +updatePasteStats()
    }
    class FingerprintRegistry {
      +resolve(): Promise<DeviceFingerprint>
      -cache: Promise<DeviceFingerprint>
    }
    class BehaviorEventBus {
      +subscribe(handler)
      +emit(event)
    }
    BehaviorTrackerFacade --> EventCollector : uses
    BehaviorTrackerFacade --> MetricsAggregator : uses
    BehaviorTrackerFacade --> FingerprintRegistry : uses
    EventCollector --> BehaviorEventBus : emit
    MetricsAggregator --> BehaviorEventBus : listen
```

- **S (Single Responsibility)**: 収集・統計・指紋をクラス分割。`BehaviorTrackerFacade` は外部 API を束ねるだけで内部詳細に依存しない。
- **O (Open/Closed)**: 新しいセンサーは `EventCollector` の派生クラス追加で差し替え可能。`BehaviorEventBus` でイベント列を標準化することで既存集計ロジックを閉じたまま拡張できる。
- **L (Liskov)**: Collector/Aggregator/Fingerprint のインターフェースを軽量 TypeScript interface として定義し、実装差し替え時も契約が崩れないよう `Promise<DeviceFingerprint>` など戻り値を固定。
- **I (Interface Segregation)**: React 側には `BehaviorTrackerFacade` のみ公開し、細かなセンサー API をコンポーネントから直接触れない。
- **D (Dependency Inversion)**: Facade は具象クラスではなく interface で依存を受け取り、DI コンテナ代わりに `BehaviorTrackerProvider` で生成。テスト時は `MockFingerprintRegistry` を注入。

### 8.2 イベント設計

- `BehaviorEventBus` は `CustomEvent` ではなく内部 Pub/Sub にして、DOM をグローバルイベントバスにするアンチパターンを回避。
- イベント定義は `type BehaviorEvent = MouseMoveEvent | ClickEvent | ...` の判別共用体。`type` + `payload` を必須にし、軽量な discriminated union で TypeScript の exhaustiveness check を効かせる。
- 粒度の異なるイベントを直接送らず、Collector 内で **50ms 間隔サンプリングや paste フラグ抽出など入力正規化** を行った上で Bus へ publish。
- `BehaviorTrackerFacade.captureCriticalAction` は、UI から受け取った `actionId` をイベントとして Bus に流し、Aggregator 側で `recent_actions` へ即時反映。UI は Promise/await で送信完了だけ把握する。

### 8.3 React 側の責務境界

```mermaid
flowchart LR
  subgraph Services
    BT[BehaviorTrackerFacade]
    SAC[SecurityApiClient]
  end
  subgraph Providers
    BTP[BehaviorTrackerProvider]
    AIDP[AIDetectorProvider]
  end
  subgraph UI
    Checkout[CheckoutPage]
    PDP[ProductPage]
  end

  BT -->|snapshot| SAC
  SAC -->|risk+reasons| AIDP
  BTP -->|hook: useBehaviorTracker| UI
  AIDP -->|hook: useAIDetector| UI
  Checkout -->|call captureCriticalAction| BTP
```

- Provider (`browser-agent-sdk/packages/adapters/react`) は **副作用の起動と DI のみ** を担当し、UI コンポーネントは `useBehaviorTracker()` で Facade を受け取り命令メソッドを呼び出すだけ。副作用（計測開始、fetch）は `useEffect` フック内に閉じ込め、レンダー中の関数呼び出しや条件付き Hook といった React アンチパターンを避ける。
- `AIDetectorProvider` は `useSyncExternalStore` を利用し、スコアのストアを購読する実装に切り替える。これにより Provider が setState 乱用で再レンダリングを増やす問題を防止。
- UI から直接 fetch せず、`SecurityApiClient`（Next.js API と通信するサービス）を Facade 経由で呼び出すことで、React コンポーネントは常に関心事が UI 表現に限定される。

### 8.4 API レイヤ詳細

- `browser-agent-sdk/packages/node-bridge/security-api-client.ts`
  - `class SecurityApiClient { constructor(fetcher, config) }` とし、`fetcher` はデフォルトで `global.fetch` を使用。テストではモック fetch を注入。
  - `sendDetection(request: UnifiedDetectionRequest): Promise<UnifiedDetectionResponse>` が公開 API。Retry/Timeout/Fail-open は内部実装に閉じ込める。
  - 依存逆転の観点で、Next.js API ルートは `SecurityApiClient` を直接 import せず `createSecurityApiClient(config)` ファクトリを経由し、設定/ロガーを注入。

- `apps/ecommerce-site/app/api/security/aidetector/detect`
  - **Normalizer**（純関数）→**Enricher**（IP/UA を追加）→**SecurityApiClient** の3層で構成し、`node-bridge` から提供されるコンポーズ済み関数を利用する。
  - 例外は `TypedError`（`BadRequestError`, `UpstreamError`）で分類し、レスポンスマッピングを 1 箇所に集約することでエラーハンドリングの分岐が散らばるのを防ぐ。
  - `extractNetworkFingerprint()` で `cf-ja4` / `x-tls-ja4` 等のヘッダーを自動検出し、無い場合は主要 HTTP ヘッダーの SHA-256 ハッシュを生成して `device_fingerprint.tls_ja4` / `http_signature` として付与。第三者が Next.js 以外でも再利用できるよう、同関数を `@browser-agent-sdk/node-bridge` から公開する。

### 8.5 テレメトリ & ログ

- `logs/security.log` は JSON Lines 形式で1行1イベント。`BehaviorTracker` 側には依存させず、Next.js API が `SecurityEventLogger`（Strategy パターン）を介して書き込むことで、将来 Stackdriver 送信などにも差し替え可能。
- `AI_DETECTOR_TRAINING_LOG` が `true` のとき、`BehaviorSnapshot` と `UnifiedDetectionResponse` をペアで保存。個人情報は `redact()` ヘルパで部分マスクし、誤って生データを書き出すアンチパターンを回避。

### 8.6 バリデーション/テスト方針

- `BehaviorTrackerFacade` は Node.js DOM なしで動かせるよう設計し、`jsdom` + `happy-dom` などに依存しないピュア関数をユニットテスト可能にする。
- React Hook については `@testing-library/react-hooks` 相当のラッパーで Provider を検証。副作用は `act()` 内に閉じ込め、`useEffect` からの async 処理を `flushPromises` で同期させる。（レンダー中 fetch のようなアンチパターンを検出できる）
- `SecurityApiClient` は `fetch-mock` を使って Fail-open 分岐を網羅。SOLID の D/I を守っているため、依存注入のみでテストが完結する。

### 8.7 GA4風スニペット提供に向けた抽象化

- **実現可否**: 既存設計は Facade/Collector/Aggregator/Client が疎結合のため、ビルドターゲットを「ESM/UMD バンドル」に切り替え、`<script src="https://cdn.example.com/aidetector.js" defer></script>` のような GA4 風スニペットとして第三者に配布可能。`window.aiDetector` グローバルを生やし、`aiDetector('init', { endpoint, apiKey })` 等のコマンドキュー方式を採用すれば、アプリ内部に React がなくても利用できる。
- **初期化フロー**: GA4 と同様にコマンドキュー (`window.aiDetectorQueue = window.aiDetectorQueue || []`) を定義し、スニペット読み込み前にエンドユーザーが `aiDetector('config', {...})` を呼んでも問題ないようにする。SDK 本体読み込み後にキューを flush し `BehaviorTrackerFacade` を初期化。
- **ホストアプリとの連携**: React/Next.js 以外でも `aiDetector('capture', { action: 'CHECKOUT_SUBMIT' })` を呼べるよう、Facade API を **文字列コマンド + 引数** にマッピングするアダプタ層 `CommandRouter` を追加（I/F Segregation）。既存 Provider はこのコマンド API を呼ぶだけで統合可能。
- **配布形態**: `browser-agent-sdk` のワークスペースを npm へ公開し、`packages/web-snippet` で `esm`/`iife` を生成。`apps/ecommerce-site` は npm パッケージとしてこの SDK を依存し、自前ビルドでは tree-shaking。第三者は `<script>` で IIFE を取り込むか、`import { createBehaviorTracker } from '@browser-agent/sdk'` するかを選択できる。
- **設定伝搬**: セキュリティ上の理由から `endpointUrl`/`apiKey` を直に露出させないため、スニペット版は **署名付き一時トークン**（例: `data-ai-detector-token` 属性）を受け取り、Next.js 側で API Key を管理するプロキシ (`/api/security/aidetector/detect`) を必須にする。これにより第三者利用時も秘密情報がブラウザに残らない。
- **依存注入**: UMD バンドルでは `fetch`/`crypto` などブラウザネイティブ API のみを使い、アプリ固有の logger や storage を `aiDetector('provide', 'logger', customLogger)` のように登録できるようにする（Dependency Inversion を保ったままサードパーティが拡張可能）。
- **ドキュメント化**: README には GA4 ライクな導入例を掲載し、`<script>` コード片と `npm install @browser-agent/sdk` の両方を案内。将来的にプラットフォーム横断で利用できるよう `data-layer` 連携（例: `window.dataLayer.push({ event: 'aidetector-risk', score })`）も検討する。

これらの詳細設計により、React における副作用乱用やグローバルシングルトン乱立といったアンチパターンを避けつつ、SOLID を満たしたクラス/イベント構造で `apps/ecommerce-site` へ安全に実装を展開できる。

---

この方針に沿って実装することで、`docs/browser-detection-v2.md` が求める「多層シグナル × 行動時系列 × API連携」の骨格を Next.js 側で整え、`ai-detector` の LightGBM モデルをそのまま活用できるパイプラインへ移行できる。
