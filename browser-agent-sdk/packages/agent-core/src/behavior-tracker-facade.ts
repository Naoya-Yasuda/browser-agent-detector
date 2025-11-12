import { BehaviorEventBus } from './behavior-event-bus';
import { EventCollector } from './event-collector';
import { FingerprintRegistry } from './fingerprint-registry';
import { MetricsAggregator } from './metrics-aggregator';
import {
  BehaviorSnapshot,
  BehaviorTrackerOptions,
  DetectionTransport,
  SnapshotContext,
} from './types';
import { NoopDetectionTransport } from './transports';

export class BehaviorTrackerFacade {
  private readonly bus = new BehaviorEventBus();
  private readonly collector: EventCollector;
  private readonly aggregator = new MetricsAggregator();
  private readonly fingerprintRegistry = new FingerprintRegistry();
  private transport: DetectionTransport;
  private contextResolver: () => SnapshotContext | Promise<SnapshotContext>;
  private scheduleIntervalMs: number;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor(options?: BehaviorTrackerOptions) {
    this.collector = new EventCollector(this.bus, {
      maxRecentActions: options?.maxRecentActions,
    });
    this.transport = options?.transport ?? new NoopDetectionTransport();
    this.contextResolver = options?.contextResolver ?? this.defaultContextResolver;
    this.scheduleIntervalMs = options?.scheduleIntervalMs ?? 5000;
  }

  init() {
    if (this.initialized) {
      return;
    }
    this.collector.start();
    if (this.scheduleIntervalMs > 0 && typeof window !== 'undefined') {
      this.schedulerId = setInterval(() => {
        this.sendSnapshot('PERIODIC_SNAPSHOT').catch((error) =>
          console.error('Scheduled snapshot failed', error),
        );
      }, this.scheduleIntervalMs);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.initialized = true;
  }

  destroy() {
    if (!this.initialized) return;
    this.collector.stop();
    if (this.schedulerId) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    this.initialized = false;
  }

  setTransport(transport: DetectionTransport) {
    this.transport = transport;
  }

  subscribe(handler: Parameters<BehaviorEventBus['subscribe']>[0]) {
    return this.bus.subscribe(handler);
  }

  async captureCriticalAction(actionType: string, metadata?: Record<string, unknown>) {
    this.collector.recordRecentAction(actionType, metadata);
    return this.sendSnapshot(actionType);
  }

  async getSnapshot(actionType = 'MANUAL_SNAPSHOT'): Promise<BehaviorSnapshot> {
    const state = this.collector.getState();
    const [fingerprint, contextBase] = await Promise.all([
      this.fingerprintRegistry.resolve(),
      this.contextResolver(),
    ]);
    const behavioralData = this.aggregator.compute(state);
    const context: SnapshotContext = {
      ...contextBase,
      actionType,
      pageLoadTime: state.pageLoadTime,
      firstInteractionTime: state.firstInteractionTime,
      firstInteractionDelay: state.firstInteractionDelay,
    };

    return {
      sessionId: state.sessionId,
      requestId: this.generateRequestId(),
      timestamp: Date.now(),
      deviceFingerprint: fingerprint,
      behavioralData,
      context,
      recent_actions: this.collector.getRecentActions(),
    };
  }

  private async sendSnapshot(actionType: string) {
    const snapshot = await this.getSnapshot(actionType);
    this.bus.emit({ type: 'snapshot', payload: snapshot });
    await this.transport.send(snapshot);
    return snapshot;
  }

  private handleBeforeUnload = () => {
    this.sendSnapshot('PAGE_BEFORE_UNLOAD').catch((error) =>
      console.error('beforeunload snapshot failed', error),
    );
  };

  private defaultContextResolver(): SnapshotContext {
    if (typeof window === 'undefined') {
      return {
        actionType: 'SSR',
        url: 'about:blank',
        siteId: 'unknown',
        pageLoadTime: Date.now(),
        firstInteractionTime: null,
        firstInteractionDelay: null,
        userAgent: 'ssr',
        locale: 'en-US',
      };
    }

    return {
      actionType: 'INIT',
      url: window.location.href,
      siteId: window.location.hostname,
      pageLoadTime: performance.timing?.navigationStart || Date.now(),
      firstInteractionTime: null,
      firstInteractionDelay: null,
      userAgent: navigator.userAgent,
      locale: navigator.language,
    };
  }

  private generateRequestId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

