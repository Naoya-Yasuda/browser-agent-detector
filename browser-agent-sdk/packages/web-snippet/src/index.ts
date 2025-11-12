declare global {
  interface Window {
    aiDetectorQueue?: Array<[string, any]>;
    aiDetector?: (...args: any[]) => void;
  }
}

type Command = [string, any];

export function bootstrapSnippet(executor: (command: Command) => void) {
  if (typeof window === 'undefined') return;

  const queue = window.aiDetectorQueue ?? [];
  window.aiDetectorQueue = queue;

  window.aiDetector = (...args: any[]) => {
    if (!executor) {
      queue.push(args as Command);
      return;
    }
    executor(args as Command);
  };

  queue.splice(0, queue.length).forEach((command) => executor(command));
}

