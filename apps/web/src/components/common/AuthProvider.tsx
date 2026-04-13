"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";

/** 앱 전체를 감싸서 인증 상태를 초기화하는 Provider */
export function AuthProvider({ children }: { children: ReactNode }) {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    // Auto-set dev token for local development
    if (!localStorage.getItem("auth_token") && process.env.NODE_ENV !== "production") {
      localStorage.setItem("auth_token", "dev-token");
    }
    loadFromStorage();
  }, [loadFromStorage]);

  return <>{children}</>;
}
