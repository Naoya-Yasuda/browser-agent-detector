import { BehaviorSnapshot } from '@browser-agent-sdk/agent-core';
import crypto from 'crypto';

export interface DetectionContextEnrichment {
  sessionId?: string;
  ipAddress?: string;
  requestId?: string;
  headers?: Record<string, string>;
  siteId?: string;
  network?: NetworkFingerprint;
}

export interface UnifiedDetectionRequest {
  session_id: string;
  request_id: string;
  timestamp: number;
  device_fingerprint: Record<string, unknown>;
  behavioral_data: Record<string, unknown>;
  context: Record<string, unknown>;
  recent_actions: Array<Record<string, unknown>>;
}

export interface UnifiedDetectionResponse {
  bot_score: number;
  human_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendation: 'allow' | 'challenge' | 'block';
  reasons?: Array<Record<string, unknown>>;
  detection_id?: string;
  [key: string]: unknown;
}

export interface SecurityApiClientConfig {
  endpoint: string;
  apiKey: string;
  timeoutMs?: number;
  failOpenRiskLevel?: 'low' | 'medium' | 'high';
  fetcher?: typeof fetch;
}

export interface NetworkFingerprint {
  tls_ja4: string;
  http_signature: string;
  signature_algorithm: string;
  header_sample: Record<string, string>;
}

export interface NetworkFingerprintOptions {
  headers: Headers | Record<string, string | string[] | undefined>;
  preferHeaderNames?: string[];
  httpSignatureHeaders?: string[];
}

const DEFAULT_JA4_HEADER_CANDIDATES = [
  'cf-ja4',
  'cf-ja3',
  'x-tls-ja4',
  'x-ja4',
  'x-ja3',
  'x-ssl-ja4',
  'x-ssl-ja3',
];

const DEFAULT_HTTP_SIGNATURE_HEADERS = [
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'upgrade-insecure-requests',
  'x-forwarded-for',
  'x-real-ip',
];

export function extractNetworkFingerprint(options: NetworkFingerprintOptions): NetworkFingerprint {
  const headers = options.headers;
  const ja4Candidates = options.preferHeaderNames ?? DEFAULT_JA4_HEADER_CANDIDATES;
  const signatureHeaders = options.httpSignatureHeaders ?? DEFAULT_HTTP_SIGNATURE_HEADERS;

  const lookup = (name: string): string | undefined => {
    if (headers instanceof Headers) {
      return headers.get(name);
    }
    const direct = headers[name];
    const lower = headers[name.toLowerCase()];
    const value = typeof direct !== 'undefined' ? direct : lower;
    if (Array.isArray(value)) {
      return value[0];
    }
    return value as string | undefined;
  };

  const tlsJa4 =
    ja4Candidates
      .map((name) => lookup(name))
      .filter((value): value is string => !!value && value.trim().length > 0)[0] ?? 'unknown';

  const headerSample: Record<string, string> = {};
  signatureHeaders.forEach((name) => {
    const value = lookup(name);
    if (value) {
      headerSample[name] = value;
    }
  });

  const signatureBase = Object.keys(headerSample)
    .sort()
    .map((key) => `${key}:${headerSample[key]}`)
    .join('\n');

  const httpSignature =
    signatureBase.length > 0
      ? crypto.createHash('sha256').update(signatureBase).digest('hex')
      : 'missing';

  return {
    tls_ja4: tlsJa4,
    http_signature: httpSignature,
    signature_algorithm: 'sha256(headers)',
    header_sample: headerSample,
  };
}

export class SecurityApiClient {
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly failOpenRiskLevel: 'low' | 'medium' | 'high';
  private readonly fetcher: typeof fetch;

  constructor(config: SecurityApiClientConfig) {
    this.endpoint = config.endpoint.replace(/\/detect$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.failOpenRiskLevel = config.failOpenRiskLevel ?? 'medium';
    this.fetcher = config.fetcher ?? fetch;
  }

  async detect(request: UnifiedDetectionRequest): Promise<UnifiedDetectionResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.endpoint}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`ai-detector responded with status ${response.status}`);
      }

      return (await response.json()) as UnifiedDetectionResponse;
    } catch (error) {
      console.error('SecurityApiClient.detect error', error);
      return this.failOpenResponse();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private failOpenResponse(): UnifiedDetectionResponse {
    const botScore = this.failOpenRiskLevel === 'low' ? 0.2 : this.failOpenRiskLevel === 'medium' ? 0.4 : 0.65;
    return {
      bot_score: botScore,
      human_score: +(1 - botScore).toFixed(3),
      risk_level: this.failOpenRiskLevel,
      recommendation: this.failOpenRiskLevel === 'high' ? 'challenge' : 'allow',
      reasons: [
        {
          factor: 'fail_open',
          description: 'ai-detector unavailable, returning fail-open response',
          severity: this.failOpenRiskLevel,
        },
      ],
    };
  }
}

export function buildUnifiedDetectionRequest(
  snapshot: BehaviorSnapshot,
  enrichment: DetectionContextEnrichment,
): UnifiedDetectionRequest {
  const sessionId = enrichment.sessionId ?? snapshot.sessionId;
  const requestId = enrichment.requestId ?? snapshot.requestId;
  const context = {
    ...snapshot.context,
    siteId: enrichment.siteId ?? snapshot.context.siteId,
    ipAddress: enrichment.ipAddress,
    sessionId,
    requestId,
    headers: enrichment.headers,
    tls_ja4: enrichment.network?.tls_ja4,
    http_signature_algorithm: enrichment.network?.signature_algorithm,
  };

  return {
    session_id: sessionId,
    request_id: requestId,
    timestamp: snapshot.timestamp,
    device_fingerprint: toSnakeCaseDeep({
      ...snapshot.deviceFingerprint,
      tls_ja4: enrichment.network?.tls_ja4,
      http_signature: enrichment.network?.http_signature,
    }),
    behavioral_data: toSnakeCaseDeep(snapshot.behavioralData),
    context: toSnakeCaseDeep(context),
    recent_actions: snapshot.recent_actions.map((action) => toSnakeCaseDeep(action)),
  };
}

function toSnakeCaseDeep(value: unknown): any {
  if (Array.isArray(value)) {
    return value.map((item) => toSnakeCaseDeep(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, val]) => {
        acc[toSnakeCase(key)] = toSnakeCaseDeep(val);
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }
  return value;
}

function toSnakeCase(value: string): string {
  return value
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]+/g, '_')
    .toLowerCase()
    .replace(/^_+/, '');
}
