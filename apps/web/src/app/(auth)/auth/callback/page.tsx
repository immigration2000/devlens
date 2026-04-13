"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Loading from "@/components/ui/Loading";

export default function AuthCallbackPageWrapper() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Loading size="lg" text="로딩 중..." /></main>}>
      <AuthCallbackPage />
    </Suspense>
  );
}

function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get("token");

        if (!token) {
          setError("인증 토큰이 없습니다");
          setIsProcessing(false);
          return;
        }

        // Save token to localStorage
        localStorage.setItem("auth_token", token);

        // Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        console.error("Auth callback error:", err);
        setError("인증 처리 중 오류가 발생했습니다");
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, router]);

  if (isProcessing) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Loading size="lg" text="인증 중..." />
          <p className="text-gray-600">대시보드로 이동 중입니다</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="space-y-2">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900">인증 실패</h1>
            <p className="text-gray-600">{error}</p>
          </div>

          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            다시 로그인
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
