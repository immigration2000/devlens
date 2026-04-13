import Link from "next/link";

const FEATURES = [
  {
    title: "Monaco 코드 편집기",
    desc: "VS Code와 동일한 편집 환경에서 코드를 작성하세요. 실시간 미리보기로 결과를 즉시 확인할 수 있습니다.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "실시간 AI 분석",
    desc: "코드를 실행할 때마다 품질, 버그 위험도, 복잡도를 즉시 분석합니다. 건강도 점수로 한눈에 파악하세요.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "학습 대시보드",
    desc: "완료한 과제의 분석 결과를 추적하세요. 코드 품질, 행동 패턴, 개선 방향을 확인할 수 있습니다.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: "1", title: "과제 선택", desc: "10개의 웹 개발 과제 중 하나를 선택하세요" },
  { num: "2", title: "코드 작성", desc: "Monaco 에디터에서 코드를 작성하고 실시간으로 미리보기" },
  { num: "3", title: "분석 확인", desc: "AI가 분석한 코드 품질과 개선 방향을 확인하세요" },
];

const SAMPLE_QUESTS = [
  { title: "카운터 앱", difficulty: "기초", time: "30분", color: "bg-green-500" },
  { title: "할일 목록 앱", difficulty: "중급", time: "45분", color: "bg-yellow-500" },
  { title: "뱀 게임", difficulty: "고급", time: "60분", color: "bg-red-500" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-[85vh] px-8">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative text-center space-y-8 max-w-3xl animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-600/10 border border-primary-500/20 rounded-full text-sm text-primary-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            AI 기반 코드 분석 플랫폼
          </div>

          {/* Title */}
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight">
            Dev<span className="text-primary-500">Lens</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed">
            코드를 분석하고, 개발 패턴을 이해하고,<br />
            더 나은 개발자로 성장하세요.
          </p>

          <p className="text-gray-500 max-w-xl mx-auto leading-relaxed">
            웹 개발 과제를 풀면서 실시간으로 코드 품질, 버그 위험도, 개발 행동 패턴을 분석받으세요. AI가 당신의 코드를 분석하고 맞춤형 개선 방향을 제시합니다.
          </p>

          {/* CTA */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link
              href="/quests"
              className="px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary-600/25 text-lg"
            >
              시작하기
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3.5 border border-gray-700 hover:border-gray-500 text-gray-300 font-semibold rounded-xl transition-colors"
            >
              대시보드
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-24 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">어떻게 동작하나요?</h2>
        <p className="text-gray-500 text-center mb-16 max-w-lg mx-auto">
          코드를 작성하는 순간부터 AI가 분석을 시작합니다
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-primary-500/30 transition-colors group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary-600/10 text-primary-500 flex items-center justify-center mb-5 group-hover:bg-primary-600/20 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-3">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section className="px-8 py-24 bg-gray-900/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">3단계로 시작하세요</h2>
          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((s, i) => (
              <div key={s.num} className="text-center relative">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary-500/40 to-transparent" />
                )}
                <div className="w-16 h-16 rounded-full bg-primary-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quest Preview */}
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">다양한 과제</h2>
        <p className="text-gray-500 text-center mb-12">기초부터 고급까지, 10개 이상의 웹 개발 과제</p>
        <div className="grid md:grid-cols-3 gap-6">
          {SAMPLE_QUESTS.map((q) => (
            <div key={q.title} className="p-6 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${q.color}`} />
                <span className="text-xs text-gray-500 font-medium">{q.difficulty}</span>
                <span className="text-xs text-gray-600 ml-auto">{q.time}</span>
              </div>
              <h3 className="font-semibold">{q.title}</h3>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/quests" className="text-primary-500 hover:text-primary-400 font-medium text-sm transition-colors">
            전체 과제 보기 &rarr;
          </Link>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-8 py-24 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-500">
            설치 없이, 브라우저에서 바로 코딩을 시작하세요.
          </p>
          <Link
            href="/quests"
            className="inline-block px-10 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary-600/25 text-lg"
          >
            과제 풀러 가기
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-8 text-center text-sm text-gray-600">
        DevLens &mdash; Analyze how you develop, not just what you build
      </footer>
    </main>
  );
}
