import { useState, useEffect, useCallback, useRef } from 'react';

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
  UNINSTANTIATED = 4,
}

interface UseWebSocketOptions {
  shouldReconnect?: (closeEvent: CloseEvent) => boolean;
  reconnectInterval?: number;
  maxRetries?: number;
}

export default function useCustomWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [readyState, setReadyState] = useState<ReadyState>(ReadyState.UNINSTANTIATED);
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  // Keep options in a ref to avoid stale closures or infinite reconnect loops
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connect = useCallback(() => {
    // Prevent overlapping connections
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    setReadyState(ReadyState.CONNECTING);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setReadyState(ReadyState.OPEN);
      retryCount.current = 0;
    };

    ws.onmessage = (event) => {
      setLastMessage(event);
    };

    ws.onclose = (event) => {
      setReadyState(ReadyState.CLOSED);
      const { shouldReconnect = () => true, maxRetries = 100, reconnectInterval = 3000 } = optionsRef.current;
      
      if (shouldReconnect(event) && retryCount.current < maxRetries) {
        reconnectTimer.current = setTimeout(() => {
          retryCount.current += 1;
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      // Let onclose handle reconnects
    };

    wsRef.current = ws;
  }, [url]); // Only recreate if URL changes

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket is not open. Message not sent.');
    }
  }, []);

  return { sendMessage, lastMessage, readyState };
}
