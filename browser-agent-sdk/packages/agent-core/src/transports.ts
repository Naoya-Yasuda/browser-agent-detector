import { BehaviorSnapshot, DetectionTransport } from './types';

export interface ProxyDetectionTransportOptions {
  endpoint: string;
  headers?: Record<string, string>;
  failOpen?: boolean;
  onResult?: (result: unknown) => void;
}

export class ProxyDetectionTransport implements DetectionTransport {
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly failOpen: boolean;
  private readonly onResult?: (result: unknown) => void;

  constructor(options: ProxyDetectionTransportOptions) {
    this.endpoint = options.endpoint;
    this.headers = options.headers ?? { 'Content-Type': 'application/json' };
    this.failOpen = options.failOpen ?? true;
    this.onResult = options.onResult;
  }

  async send(snapshot: BehaviorSnapshot): Promise<void> {
    if (typeof fetch === 'undefined') {
      return;
    }
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(snapshot),
        keepalive: true,
      });
      if (!response.ok) {
        throw new Error(`ProxyDetectionTransport failed with status ${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      this.onResult?.(payload);
    } catch (error) {
      if (!this.failOpen) {
        throw error;
      }
      console.warn('ProxyDetectionTransport error (fail-open)', error);
    }
  }
}

export class NoopDetectionTransport implements DetectionTransport {
  async send(): Promise<void> {
    // intentionally empty
  }
}
