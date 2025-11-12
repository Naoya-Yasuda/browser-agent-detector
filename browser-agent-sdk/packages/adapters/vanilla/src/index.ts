import {
  BehaviorSnapshot,
  BehaviorTrackerFacade,
  BehaviorTrackerOptions,
  DetectionTransport,
  ProxyDetectionTransport,
} from '@browser-agent-sdk/agent-core';

export interface VanillaAgentConfig extends Omit<BehaviorTrackerOptions, 'transport'> {
  transport?: DetectionTransport;
  transportEndpoint?: string;
  onSnapshot?: (snapshot: BehaviorSnapshot) => void;
}

export function createAiDetectorClient(config?: VanillaAgentConfig) {
  const transport =
    config?.transport ??
    new ProxyDetectionTransport({
      endpoint: config?.transportEndpoint ?? '/api/security/aidetector/detect',
    });

  const tracker = new BehaviorTrackerFacade({
    ...config,
    transport,
  });

  tracker.init();

  const unsubscribe =
    config?.onSnapshot &&
    tracker.subscribe((event) => event.type === 'snapshot' && config.onSnapshot?.(event.payload));

  return {
    tracker,
    destroy() {
      unsubscribe?.();
      tracker.destroy();
    },
  };
}

