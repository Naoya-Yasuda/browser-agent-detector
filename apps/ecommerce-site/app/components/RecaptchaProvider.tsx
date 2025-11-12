'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface RecaptchaContextType {
  executeRecaptcha: (action?: string) => Promise<string>;
  executeRecaptchaCheck: (action?: string) => Promise<void>;
  isRecaptchaLoaded: boolean;
  isRecaptchaEnabled: boolean;
  timedScores: {
    short: number | null;
    medium: number | null;
    long: number | null;
  };
}

const defaultTimedScores = {
  short: null,
  medium: null,
  long: null,
};

const RecaptchaContext = createContext<RecaptchaContextType>({
  executeRecaptcha: async () => '',
  executeRecaptchaCheck: async () => {},
  isRecaptchaLoaded: false,
  isRecaptchaEnabled: false,
  timedScores: defaultTimedScores,
});

export const useRecaptcha = () => useContext(RecaptchaContext);

const RECAPTCHA_SCRIPT_BASE = 'https://www.google.com/recaptcha/enterprise.js';

export default function RecaptchaProvider({
  children,
  siteKey: providedSiteKey = '',
}: {
  children: React.ReactNode;
  siteKey?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [timedScores, setTimedScores] = useState(defaultTimedScores);
  const scriptLoadedRef = useRef(false);
  const executionRef = useRef<{ isExecuting: boolean; pageLoadTime: number }>({
    isExecuting: false,
    pageLoadTime: Date.now(),
  });
  const siteKey = providedSiteKey?.trim() ?? '';
  const isEnabled = Boolean(siteKey);

  // reCAPTCHAバッジのスタイル制御（左下表示・無効時非表示）
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const styleElementId = 'recaptcha-global-style';
    let styleElement = document.getElementById(styleElementId) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleElementId;
      document.head.appendChild(styleElement);
    }

    if (isEnabled) {
      styleElement.innerHTML = `
        .grecaptcha-badge {
          right: 16px !important;
          left: auto !important;
          bottom: 24px !important;
          transform-origin: bottom right;
          opacity: 1 !important;
          visibility: visible !important;
          z-index: 9999 !important;
        }
      `;
    } else {
      styleElement.innerHTML = `
        .grecaptcha-badge {
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `;
    }

    return () => {
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [isEnabled]);

  // reCAPTCHAスクリプトのロード
  useEffect(() => {
    if (!isEnabled || !siteKey) {
      setIsLoaded(false);
      scriptLoadedRef.current = false;
      return;
    }

    executionRef.current.pageLoadTime = Date.now();

    const selector = `script[data-recaptcha-site-key="${siteKey}"]`;
    const existingScript = document.querySelector<HTMLScriptElement>(selector);

    const markLoaded = () => {
      if (!window.grecaptcha?.enterprise) {
        return;
      }
      window.grecaptcha.enterprise.ready(() => {
        scriptLoadedRef.current = true;
        setIsLoaded(true);
        try {
          localStorage.setItem('recaptcha_site_key', siteKey);
        } catch {
          // ignore
        }
      });
    };

    if (existingScript) {
      if (window.grecaptcha?.enterprise) {
        markLoaded();
      } else {
        existingScript.addEventListener('load', markLoaded, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `${RECAPTCHA_SCRIPT_BASE}?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaSiteKey = siteKey;

    script.onload = () => markLoaded();
    script.onerror = () => {
      console.error('reCAPTCHA script failed to load');
      setIsLoaded(false);
    };

    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [isEnabled, siteKey]);

  const executeRecaptchaInternal = useCallback(
    async (action: string): Promise<string> => {
      if (!isEnabled || !isLoaded || !siteKey) {
        console.warn('reCAPTCHA is not ready yet');
        return '';
      }
      if (!window.grecaptcha?.enterprise) {
        console.warn('grecaptcha.enterprise is unavailable');
        return '';
      }

      try {
        const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
        if (!token) {
          console.error('Failed to obtain reCAPTCHA token');
          return '';
        }
        return token;
      } catch (error) {
        console.error('reCAPTCHA execution failed', error);
        return '';
      }
    },
    [isEnabled, isLoaded, siteKey],
  );

  const executeRecaptcha = useCallback(
    (action = 'submit') => executeRecaptchaInternal(action),
    [executeRecaptchaInternal],
  );

  const executeRecaptchaCheck = useCallback(
    async (action = 'LOGIN_PAGE_CHECK') => {
      if (!isEnabled || !isLoaded) {
        return;
      }
      if (executionRef.current.isExecuting) {
        return;
      }

      executionRef.current.isExecuting = true;

      try {
        const token = await executeRecaptchaInternal(action);
        if (!token) {
          return;
        }

        const response = await fetch('/api/security/recaptcha/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, action }),
          cache: 'no-store',
        });
        if (!response.ok) {
          console.warn('reCAPTCHA verification request failed');
          return;
        }
        const result = await response.json();

        if (result?.success && typeof result.score === 'number') {
          setTimedScores((prev) => ({
            ...prev,
            medium: result.score,
          }));

          if (typeof window !== 'undefined') {
            localStorage.setItem('recaptchaOriginalScore', result.score.toFixed(3));
          }
        } else {
          console.warn('reCAPTCHA verification did not return a score', result);
        }
      } catch (error) {
        console.error('reCAPTCHA check failed', error);
      } finally {
        setTimeout(() => {
          executionRef.current.isExecuting = false;
        }, 2000);
      }
    },
    [executeRecaptchaInternal, isEnabled, isLoaded],
  );

  const value = useMemo(
    () => ({
      executeRecaptcha,
      executeRecaptchaCheck,
      isRecaptchaLoaded: isLoaded,
      isRecaptchaEnabled: isEnabled,
      timedScores,
    }),
    [executeRecaptcha, executeRecaptchaCheck, isEnabled, isLoaded, timedScores],
  );

  return <RecaptchaContext.Provider value={value}>{children}</RecaptchaContext.Provider>;
}

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}
