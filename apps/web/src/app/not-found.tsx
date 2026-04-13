import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        페이지를 찾을 수 없습니다
      </h2>
      <p className="text-gray-500 mb-8 text-center max-w-md">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          홈으로
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          대시보드
        </Link>
      </div>
    </div>
  );
}
