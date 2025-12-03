import { NextRequest, NextResponse } from 'next/server';
import { getAIDetectorServerConfig } from '@/app/lib/server/ai-detector';
import { BehaviorSnapshot } from '@browser-agent-sdk/agent-core';

// Edge Runtime で動作させる
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { endpoint, apiKey } = getAIDetectorServerConfig();
    const snapshot = (await request.json()) as BehaviorSnapshot;

    const sessionId =
      request.cookies.get('ec_session')?.value || snapshot.sessionId || 'session_unknown';
    const ipAddress =
      request.ip || request.headers.get('x-forwarded-for') || 'ip_unknown';
    const requestId = globalThis.crypto?.randomUUID?.() ?? `req_${Date.now()}`;

    const payload = {
      snapshot,
      sessionId,
      ipAddress,
      requestId,
      headers: Object.fromEntries(request.headers),
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const detectorResponse = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(`ai-detector responded with ${res.status}`);
    }

    return NextResponse.json(detectorResponse);
  } catch (error) {
    console.error('AI detector route error', error);
    return NextResponse.json(
      { error: 'AI detector processing failed' },
      { status: 500 },
    );
  }
}
