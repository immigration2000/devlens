"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import SessionReport from "@/components/dashboard/SessionReport";

/**
 * Dedicated full-page report view optimized for printing
 */
export default function ReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const reportData = await api.getSessionReport(sessionId);
        setReport(reportData);
      } catch (err) {
        console.error("Failed to load report:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500">보고서를 준비 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">보고서를 불러올 수 없습니다</p>
      </div>
    );
  }

  return <SessionReport report={report} />;
}
