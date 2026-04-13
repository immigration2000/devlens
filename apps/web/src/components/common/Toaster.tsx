"use client";

import { useEffect, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

/** 글로벌 토스트 이벤트 시스템 */
const listeners = new Set<(toast: Toast) => void>();

export function showToast(message: string, type: ToastType = "info", duration = 3000) {
  const toast: Toast = { id: crypto.randomUUID(), type, message, duration };
  listeners.forEach((fn) => fn(toast));
}

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const COLORS: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  warning: "bg-amber-500",
  info: "bg-blue-600",
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, toast.duration);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${COLORS[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[280px] animate-slide-up`}
        >
          <span className="text-lg font-bold">{ICONS[toast.type]}</span>
          <span className="text-sm">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-auto text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
