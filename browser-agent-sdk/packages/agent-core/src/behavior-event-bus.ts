import { BehaviorSnapshot } from './types';

export type BehaviorEvent =
  | { type: 'snapshot'; payload: BehaviorSnapshot }
  | { type: 'action'; payload: { action: string; timestamp: number } };

type Handler = (event: BehaviorEvent) => void;

export class BehaviorEventBus {
  private handlers: Set<Handler> = new Set();

  subscribe(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: BehaviorEvent) {
    this.handlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error('BehaviorEventBus handler error', error);
      }
    });
  }
}

