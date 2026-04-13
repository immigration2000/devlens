import Link from "next/link";
import api from "@/lib/api";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-gray-900">
              Dev<span className="text-blue-600">Lens</span>
            </h1>
            <p className="text-gray-600">DevLens에 오신 것을 환영합니다</p>
          </div>

          {/* Description */}
          <div className="text-center text-gray-500 text-sm">
            <p>Analyze how you develop, not just what you build</p>
          </div>

          {/* GitHub Login Button */}
          <div>
            <a
              href={api.getGitHubAuthUrl()}
              className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.868-.013-1.703-2.782.603-3.369-1.343-3.369-1.343-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.545 2.914 1.209.092-.937.349-1.546.636-1.903-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.817c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.192 20 14.441 20 10.017 20 4.484 15.522 0 10 0z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub로 로그인
            </a>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* Guest Access */}
          <div>
            <Link
              href="/quests"
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Guest로 시작하기
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 space-y-1">
            <p>프로젝트를 분석하고 개발 능력을 향상시키세요</p>
            <p className="mt-3">
              <span className="text-gray-400">계정이 없으신가요? </span>
              <a href="/signup" className="text-blue-600 hover:text-blue-700">
                회원가입
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>DevLens는 당신의 개발 습관을 분석하고 개선합니다</p>
        </div>
      </div>
    </main>
  );
}
