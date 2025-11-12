// app/api/security/recaptcha/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import { RECAPTCHA_SITE_KEY } from '@/app/lib/recaptcha-config';
import { getGoogleAuthOptions, getGoogleCloudProjectId, getRecaptchaSiteKeyFromServer } from '@/app/lib/server/google-cloud';

const PROJECT_ID = getGoogleCloudProjectId();

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

  const auth = new GoogleAuth(getGoogleAuthOptions());
  const client = await auth.getClient();

  const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments`;

  const { data } = await client.request<any>({
    url,
    method: 'POST',
    data: {
      event: {
        token,
        siteKey,
        expectedAction,
      },
    },
  });

  return data;
}

// （任意）EdgeでなくNode実行を明示したい場合は下行を有効化
export const runtime = 'nodejs';
