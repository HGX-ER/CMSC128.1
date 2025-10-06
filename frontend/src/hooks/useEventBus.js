// frontend/src/hooks/useEventBus.js
import { useEffect, useRef } from 'react';

/**
 * Subscribes to SSE at /stream/events and calls onEvent(json).
 */
export function useEventBus(onEvent) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const url = 'http://localhost:5000/stream/events'; // not under /api
    const es = new EventSource(url, { withCredentials: false });

    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (handlerRef.current) handlerRef.current(data);
      } catch {
        // ignore non-JSON messages, e.g. initial ping
      }
    };

    es.onerror = () => {
      // Browser auto-reconnects; nothing required
    };

    return () => es.close();
  }, []);
}
