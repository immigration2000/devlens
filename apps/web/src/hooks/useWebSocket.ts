"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAnalysisStore } from "@/stores/analysis";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:4000";

export interface WSMessage {
  type: string;
  data: Record<string, any>;
  timestamp: string;
}

interface UseWebSocketOptions {
  autoConnect?: boolean;
  maxRetries?: number;
  initialBackoffMs?: number;
  /** Filter to only receive specific analysis modules */
  modules?: string[];
}

/**
 * Custom hook for WebSocket connection to DevLens real-time analysis
 *
 * Connects to: ws://localhost:4000/ws/session/:sessionId
 * Receives real-time analysis results from all 5 modules + health score
 */
export function useWebSocket(
  sessionId: string | null,
  options: UseWebSocketOptions = {}
) {
  const {
    autoConnect = true,
    maxRetries = 3,
    initialBackoffMs = 1000,
    modules,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const retriesRef = useRef(0);

  const {
    updateCodeQuality,
    updateBugRisk,
    updateBehavior,
    updateRisk,
    updateDependency,
    updateHealthScore,
  } = useAnalysisStore();

  /**
   * Route incoming WS messages to the appropriate store actions
   */
  const handleMessage = useCallback(
    (msg: WSMessage) => {
      setLastMessage(msg);

      switch (msg.type) {
        case "analysis:code-quality":
          if (msg.data?.result) updateCodeQuality(msg.data.result);
          break;

        case "analysis:bug-risk":
          if (msg.data?.result) updateBugRisk(msg.data.result);
          break;

        case "analysis:behavior":
          if (msg.data?.result) updateBehavior(msg.data.result);
          break;

        case "analysis:risk":
          if (msg.data?.result) updateRisk(msg.data.result);
          break;

        case "analysis:dependency":
          if (msg.data?.result) updateDependency(msg.data.result);
          break;

        case "health-score":
          if (typeof msg.data?.score === "number") {
            updateHealthScore(msg.data.score as any);
          }
          break;

        case "event:count":
          // Could update an event counter in the store
          break;

        case "connected":
        case "pong":
        case "subscribed":
          // Internal protocol messages
          break;

        case "error":
          console.warn("[WS] Server error:", msg.data?.message);
          break;

        default:
          console.debug("[WS] Unhandled message type:", msg.type);
      }
    },
    [updateCodeQuality, updateBugRisk, updateBehavior, updateRisk, updateDependency, updateHealthScore]
  );

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!sessionId || wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");

    try {
      const ws = new WebSocket(`${WS_BASE}/ws/session/${sessionId}`);

      ws.onopen = () => {
        console.log("[WS] Connected to session:", sessionId);
        setIsConnected(true);
        setConnectionState("connected");
        retriesRef.current = 0;

        // If module filter specified, send subscribe message
        if (modules && modules.length > 0) {
          ws.send(JSON.stringify({ type: "subscribe", modules }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch {
          console.error("[WS] Failed to parse message");
        }
      };

      ws.onerror = () => {
        setConnectionState("error");
        setIsConnected(false);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Disconnected (code: ${event.code})`);
        setIsConnected(false);
        setConnectionState("disconnected");
        wsRef.current = null;

        // Don't reconnect on intentional close (4xxx codes)
        if (event.code >= 4000) return;

        // Exponential backoff reconnect
        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          const delay = Math.min(
            initialBackoffMs * Math.pow(2, retriesRef.current - 1),
            30000
          );
          console.log(
            `[WS] Reconnecting in ${delay}ms (attempt ${retriesRef.current}/${maxRetries})`
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          console.error("[WS] Max reconnection attempts reached");
          setConnectionState("error");
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WS] Failed to create connection:", error);
      setIsConnected(false);
      setConnectionState("error");
    }
  }, [sessionId, handleMessage, initialBackoffMs, maxRetries, modules]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionState("disconnected");
    retriesRef.current = 0;
  }, []);

  /**
   * Send a message to the server
   */
  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Auto-connect lifecycle
  useEffect(() => {
    if (autoConnect && sessionId) {
      connect();
    }
    return () => disconnect();
  }, [sessionId, autoConnect, connect, disconnect]);

  // Heartbeat (ping every 30s to keep connection alive)
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      send({ type: "ping" });
    }, 30000);
    return () => clearInterval(interval);
  }, [isConnected, send]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    connect,
    disconnect,
    send,
  };
}

export default useWebSocket;
