"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface GatewayMessage {
  type: string;
  data?: any;
  sessionKey?: string;
  timestamp?: number;
}

interface UseGatewaySocketOptions {
  onMessage?: (msg: GatewayMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

export function useGatewaySocket(options: UseGatewaySocketOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<GatewayMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Get gateway URL from current host or default
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const port = 18789; // Default gateway port
    const wsUrl = `${protocol}//${host}:${port}/ws`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        options.onConnect?.();
        
        // Subscribe to events
        ws.send(JSON.stringify({
          type: "subscribe",
          channels: ["sessions", "activity", "alerts"],
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as GatewayMessage;
          setLastMessage(msg);
          options.onMessage?.(msg);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        options.onDisconnect?.();
        wsRef.current = null;

        // Auto reconnect
        if (options.autoReconnect !== false) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch (e) {
      console.error("WebSocket connection failed:", e);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);

  return {
    connected,
    lastMessage,
    send,
    reconnect: connect,
  };
}
