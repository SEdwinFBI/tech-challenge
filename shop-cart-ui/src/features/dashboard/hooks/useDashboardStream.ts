import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/shared/lib/apiClient';

// EventSource no manda Authorization: ticket de un uso en la URL
export function useDashboardStream(onEvent: () => void): boolean {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let source: EventSource | null = null;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = async () => {
      let ticket: string | null = null;
      try {
        const res = await apiClient.post<{ ticket: string }>('/dashboard/stream-ticket');
        ticket = res.data.ticket;
      } catch {
        /* sin sesión válida, se reintenta abajo */
      }
      if (stopped) return;
      if (!ticket) {
        retry = setTimeout(connect, 10_000);
        return;
      }
      source = new EventSource(`/api/v1/dashboard/stream?ticket=${encodeURIComponent(ticket)}`);
      source.onopen = () => setConnected(true);
      source.onmessage = () => handler.current();
      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (!stopped) retry = setTimeout(connect, 5_000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      source?.close();
      setConnected(false);
    };
  }, []);

  return connected;
}
