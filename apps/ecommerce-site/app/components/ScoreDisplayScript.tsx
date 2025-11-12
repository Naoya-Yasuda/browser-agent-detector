'use client';

import Script from 'next/script';

export default function ScoreDisplayScript({ siteKey = '' }: { siteKey?: string }) {
  const resolvedSiteKey = siteKey?.trim() ?? '';

  return (
    <Script id="recaptcha-score-check" strategy="beforeInteractive">
      {`
        (function () {
          if (typeof window === 'undefined') {
            return;
          }

          const SITE_KEY = ${JSON.stringify(resolvedSiteKey)};
          const HAS_SITE_KEY = typeof SITE_KEY === 'string' && SITE_KEY.length > 0;

          console.log('★ スクリプト初期化開始 - スコアバッジを有効化します');

          function ensureOverlay() {
            let root = document.getElementById('security-score-overlay');
            if (!root) {
              root = document.createElement('div');
              root.id = 'security-score-overlay';
              root.style.position = 'fixed';
              root.style.bottom = '24px';
              root.style.left = '24px';
              root.style.zIndex = '9998';
              root.style.width = '320px';
              root.style.maxWidth = '90vw';
              root.style.borderRadius = '20px';
              root.style.background = 'rgba(255,255,255,0.95)';
              root.style.boxShadow = '0 15px 35px rgba(16, 185, 129, 0.25)';
              root.style.border = '1px solid rgba(16, 185, 129, 0.3)';
              root.style.fontFamily = "'Inter', 'Noto Sans JP', sans-serif";
              root.innerHTML = \`
                <div style="padding:16px">
                  <div style="margin-bottom:12px;">
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;color:#059669;text-transform:uppercase;">Security Monitoring</p>
                    <p data-score-title style="margin:2px 0 0;font-weight:600;color:#064E3B;font-size:16px;">セキュリティチェック</p>
                  </div>
                  <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px;">
                    <div>
                      <p style="margin:0;font-size:11px;color:#6B7280;">reCAPTCHA</p>
                      <p data-score-recaptcha style="margin:4px 0 0;font-size:22px;font-weight:700;color:#10B981;">-</p>
                    </div>
                    <div>
                      <p style="margin:0;font-size:11px;color:#6B7280;">AI Detector</p>
                      <p data-score-ai style="margin:4px 0 0;font-size:22px;font-weight:700;color:#6366F1;">-</p>
                    </div>
                    <div>
                      <p style="margin:0;font-size:11px;color:#6B7280;">クラスタリング</p>
                      <p data-score-cluster style="margin:4px 0 0;font-size:18px;font-weight:600;color:#111827;">-</p>
                    </div>
                    <div>
                      <p style="margin:0;font-size:11px;color:#6B7280;">閾値</p>
                      <p data-score-threshold style="margin:4px 0 0;font-size:18px;font-weight:600;color:#111827;">-</p>
                    </div>
                  </div>
                  <p style="margin:12px 0 0;font-size:11px;color:#94A3B8;">
                    最終チェック: <span data-score-updated>-</span>
                  </p>
                </div>
              \`;
              document.body.appendChild(root);
            }
            return root;
          }

          function normalizeValue(value) {
            if (value === null || value === undefined || value === '') {
              return '-';
            }
            return value;
          }

          function updateText(root, selector, value) {
            const target = root.querySelector(selector);
            if (target) {
              target.textContent = normalizeValue(value);
            }
          }

          function createScoreDisplay(title, recaptchaScore, aiScore, clusteringScore, clusteringThreshold) {
            const root = ensureOverlay();
            if (!root) {
              return;
            }

            updateText(root, '[data-score-title]', title || 'セキュリティスコア');
            updateText(root, '[data-score-recaptcha]', recaptchaScore);
            updateText(root, '[data-score-ai]', aiScore);
            updateText(root, '[data-score-cluster]', clusteringScore);
            updateText(root, '[data-score-threshold]', clusteringThreshold);
            updateText(root, '[data-score-updated]', new Date().toLocaleTimeString());
          }

          window.createScoreDisplay = createScoreDisplay;
          createScoreDisplay('セキュリティスコア', '-', '-', '-', '-');

          async function checkRecaptchaScore() {
            try {
              if (!HAS_SITE_KEY) {
                console.warn('reCAPTCHA site key が設定されていないためスコア取得をスキップします');
                return;
              }

              if (!window.grecaptcha || !window.grecaptcha.enterprise) {
                console.warn('reCAPTCHA Enterprise がまだ初期化されていません');
                return;
              }

              const storedSiteKey = localStorage.getItem('recaptcha_site_key') || SITE_KEY;
              const token = await window.grecaptcha.enterprise.execute(storedSiteKey, { action: 'security_check' });

              const response = await fetch('/api/security/recaptcha/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  token,
                  action: 'security_check',
                }),
              });

              if (!response.ok) {
                if (window.createScoreDisplay) {
                  window.createScoreDisplay(
                    'reCAPTCHAスコア',
                    '-',
                    localStorage.getItem('aiDetectorScore') || '-',
                    localStorage.getItem('clusteringScore') || '-',
                    localStorage.getItem('clusteringThreshold') || '-'
                  );
                }
                return;
              }

              const result = await response.json();

              if (result.success && typeof result.score === 'number') {
                const formattedScore = Number(result.score).toFixed(3);
                localStorage.setItem('recaptchaScore', formattedScore);
                localStorage.setItem('recaptchaOriginalScore', formattedScore);
                console.log('🟢 reCAPTCHAスコア: ' + formattedScore);

                const aiDetectorScore = localStorage.getItem('aiDetectorScore') || '-';
                console.log('🔵 localStorageから取得したAIスコア:', aiDetectorScore);

                if (window.createScoreDisplay) {
                  window.createScoreDisplay('reCAPTCHAスコア', formattedScore, aiDetectorScore || '-', null, null);
                }
              } else {
                if (window.createScoreDisplay) {
                  window.createScoreDisplay(
                    'reCAPTCHAスコア',
                    '-',
                    localStorage.getItem('aiDetectorScore') || '-',
                    localStorage.getItem('clusteringScore') || '-',
                    localStorage.getItem('clusteringThreshold') || '-'
                  );
                }
              }
            } catch (error) {
              console.warn('reCAPTCHAチェックエラー:', error);
            }
          }

          window.checkRecaptchaScore = checkRecaptchaScore;

          function waitForRecaptchaReady(attempts) {
            if (!HAS_SITE_KEY) {
              return;
            }
            if (!window.grecaptcha || !window.grecaptcha.enterprise) {
              if (attempts > 60) {
                console.warn('reCAPTCHA Enterprise の初期化待機がタイムアウトしました');
                return;
              }
              setTimeout(function () {
                waitForRecaptchaReady((attempts || 0) + 1);
              }, 1000);
              return;
            }

            console.log('✅ reCAPTCHA Enterprise 読み込み完了（スコアチェック）');
            checkRecaptchaScore();
          }

          if (HAS_SITE_KEY) {
            window.addEventListener('load', function () {
              waitForRecaptchaReady(0);
            });
          } else {
            console.log('reCAPTCHA site key が無いため自動スコア取得をスキップしました');
          }
        })();
      `}
    </Script>
  );
}
