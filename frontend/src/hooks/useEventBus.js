// frontend/src/hooks/useEventBus.js
import { useEffect, useRef } from 'react';

/**
 * Subscribes to SSE at /stream/events and calls onEvent(json).
 */
export function useEventBus(onEvent) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  // ✅ Guard against React 18 StrictMode double-mount in development
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const url = 'http://localhost:5000/stream/events'; // not under /api
    let es;

    const open = () => {
      es = new EventSource(url, { withCredentials: false });

      es.onopen = () => {
        // connected; no log noise
      };

      es.onmessage = (evt) => {
        // accept JSON and ignore pings/comments
        try {
          const data = JSON.parse(evt.data);
          handlerRef.current?.(data);
        } catch {
          /* ignore non-JSON payloads */
        }
      };

      // Let the browser auto-reconnect; keep this silent
      es.onerror = () => { /* no console spam */ };
    };

    // Slight delay helps avoid racing page load/HMR
    const t = setTimeout(open, 200);

    const cleanup = () => {
      clearTimeout(t);
      if (es) {
        es.close();
        es = null;
      }
    };

    // Close cleanly on navigation refresh/close
    window.addEventListener('beforeunload', cleanup);

    return () => {
      window.removeEventListener('beforeunload', cleanup);
      cleanup();
    };
  }, []);
}