import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/common/AuthProvider";
import { Toaster } from "@/components/common/Toaster";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { NavHeader } from "@/components/common/NavHeader";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "DevLens",
    template: "%s | DevLens",
  },
  description: "AI 기반 개발 분석 플랫폼 — 코드 품질, 버그 예측, 행동 패턴 분석",
  keywords: ["DevLens", "AI", "코드 분석", "개발 분석", "버그 예측"],
  openGraph: {
    title: "DevLens",
    description: "AI 기반 개발 분석 플랫폼",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ErrorBoundary>
            <NavHeader />
            <main className="min-h-[calc(100vh-57px)]">{children}</main>
          </ErrorBoundary>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
