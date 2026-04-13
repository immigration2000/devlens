"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";

interface EditorLayoutProps {
  children: React.ReactNode;
  params: {
    questId: string;
  };
}

/**
 * Editor layout - Full height immersive layout
 */
export default function EditorLayout({ children, params }: EditorLayoutProps) {
  const router = useRouter();
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    router.push("/quests");
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Top Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 text-gray-300 hover:text-white font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          나가기
        </button>

        <div className="text-sm text-gray-400">
          Quest ID: {params.questId}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="편집기 나가기"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            정말 편집기를 나가시겠습니까? 저장하지 않은 변경사항은 손실될 수
            있습니다.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowExitConfirm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              계속 작업
            </button>
            <button
              onClick={confirmExit}
              className="px-4 py-2 text-white bg-danger-600 hover:bg-danger-700 rounded-lg font-medium transition-colors"
            >
              나가기
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
