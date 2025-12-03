// app/api/security/recaptcha/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RECAPTCHA_SITE_KEY } from '@/app/lib/recaptcha-config';
import { getGoogleCloudProjectId, getRecaptchaSiteKeyFromServer } from '@/app/lib/server/google-cloud';

const PROJECT_ID = getGoogleCloudProjectId();
const API_KEY =
  process.env.RECAPTCHA_API_KEY ||
  process.env.RECAPTCHA_ENTERPRISE_API_KEY ||
  '';

function resolveSiteKey(): string {
  const runtimeKey =
    process.env.RECAPTCHA_SITE_KEY ||
    process.env.RECAPTCHA_ENTERPRISE_SITE_KEY ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
    RECAPTCHA_SITE_KEY;
  if (runtimeKey?.trim()) {
    return runtimeKey.trim();
  }
  return getRecaptchaSiteKeyFromServer();
}

export async function POST(req: NextRequest) {
  try {
    const siteKey = resolveSiteKey();

    const { token, action: expectedAction = 'submit' } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'token is required' },
        { status: 400 }
      );
    }
    if (!PROJECT_ID || !siteKey) {
      return NextResponse.json(
        { success: false, error: 'Server is not configured for reCAPTCHA Enterprise' },
        { status: 500 }
      );
    }

    const assessment = await createAssessment({
      projectId: PROJECT_ID,
      siteKey,
      token,
      expectedAction,
    });

    const score = assessment?.riskAnalysis?.score ?? null;
    const reasons = assessment?.riskAnalysis?.reasons ?? [];
    const tokenProps = assessment?.tokenProperties ?? {};
    const action = tokenProps?.action ?? null;
    const valid = tokenProps?.valid ?? false;
    const invalidReason = tokenProps?.invalidReason ?? null;

    return NextResponse.json({
      success: true,
      score,
      reasons,
      action,
      valid,
      invalidReason,
      assessmentName: assessment?.name ?? null,
    });
  } catch (err: any) {
    console.error('[reCAPTCHA] verify error:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'reCAPTCHA Enterprise verification failed' },
      { status: 502 }
    );
  }
}

async function createAssessment(params: {
  projectId: string;
  siteKey: string;
  token: string;
  expectedAction: string;
}) {
  const { projectId, siteKey, token, expectedAction } = params;

  // APIキーが無い場合は fail-open で成功扱いにする
  if (!API_KEY) {
    console.warn('[reCAPTCHA] RECAPTCHA_API_KEY が設定されていないため検証をスキップします');
    return {
      riskAnalysis: { score: 1, reasons: ['recaptcha_not_configured'] },
      tokenProperties: { valid: true, action: expectedAction },
    };
  }

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: {
        token,
        siteKey,
        expectedAction,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`reCAPTCHA verify failed: ${res.status} ${text}`);
  }

  return await res.json();
}

// Google Auth は Node 互換APIを使うため Node.js runtime を指定
export const runtime = 'edge';
