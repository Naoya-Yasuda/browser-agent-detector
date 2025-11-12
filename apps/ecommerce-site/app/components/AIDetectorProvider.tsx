'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useAIDetectorEngine } from '@browser-agent-sdk/react-adapter';

interface AIDetectorContextType {
  checkDetection: (action: string) => Promise<{
    allowed: boolean;
    botScore?: number;
    needsChallenge?: boolean;
    token?: string;
  }>;
  timedScores: {
    short: number | null; // 0.5秒のスコア
    medium: number | null; // 2秒のスコア
    long: number | null; // 5秒のスコア
  };
}

const AIDetectorContext = createContext<AIDetectorContextType>({
  checkDetection: async () => ({ allowed: true }),
  timedScores: {
    short: null,
    medium: null,
    long: null
  }
});

export const useAIDetector = () => useContext(AIDetectorContext);

export default function AIDetectorProvider({ children }: { children: React.ReactNode }) {
  const { checkDetection: engineCheckDetection, timedScores } = useAIDetectorEngine({
    enabled: true,
  });
  const checkDetection = useCallback(
    (action: string) => engineCheckDetection(action),
    [engineCheckDetection],
  );

  return (
    <AIDetectorContext.Provider value={{
      checkDetection,
      timedScores
    }}>
      {children}
    </AIDetectorContext.Provider>
  );
}
