# DevLens

> Analyze how you develop, not just what you build

웹 기반 AI 개발 분석 플랫폼. 20개의 코딩 과제를 풀면서 실시간으로 코드 품질, 버그 위험도, 개발 행동 패턴을 분석받으세요.

## Quick Start (Docker 불필요)

```bash
git clone https://github.com/immigration2000/devlens.git
cd devlens
pnpm install
pnpm turbo build --filter=@devlens/shared

# Monaco 에디터 로컬 번들 복사 (필수)
cp -r node_modules/monaco-editor/min/vs apps/web/public/vs
# Windows CMD: xcopy node_modules\monaco-editor\min\vs apps\web\public\vs /E /I /Y

# 개발 서버 시작
pnpm dev
```

열기: **http://localhost:3000** (웹) / **http://localhost:4000** (API)

> Docker 인프라 없이도 인메모리 폴백으로 전체 플로우가 동작합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| **Monaco 코드 에디터** | VS Code 동일 편집 환경, 실시간 미리보기 |
| **20개 코딩 과제** | 카운터, 투두, 계산기, 뱀 게임, 테트리스, 2048 등 |
| **실시간 코드 분석** | 실행마다 품질/버그위험도/복잡도 자동 점수 |
| **건강도 대시보드** | 5개 모듈 점수, 이슈 목록, 개선 권장사항 |
| **과제 가이드** | 요구사항 체크리스트 + 진행률 시각화 |
| **D3 의존성 그래프** | 코드 구조 시각화 |
| **오프라인 지원** | IndexedDB 이벤트 버퍼 (페이지 닫아도 유지) |

## Tech Stack

- **Frontend**: Next.js 14, Monaco Editor, D3.js, Recharts, Zustand, Tailwind CSS
- **Backend**: Fastify, Node.js vm (코드 실행)
- **Data Pipeline**: Apache Kafka, ClickHouse (Docker 시)
- **Database**: PostgreSQL + pgvector, Redis (Docker 시)
- **AI/ML**: Claude API, 정적 코드 분석기
- **QA**: Playwright (E2E), Vitest (단위)
- **Infra**: Docker Compose (선택), Turborepo

## Project Structure

```
devlens/
├── apps/
│   ├── web/              # Next.js 14 프론트엔드 (포트 3000)
│   └── api/              # Fastify API 서버 (포트 4000)
├── services/
│   ├── ai-engine/        # Claude API 기반 코드 분석
│   ├── stream-router/    # Kafka 이벤트 라우팅
│   ├── sandbox/          # Docker 기반 코드 실행 샌드박스
│   └── ml/               # Python ML 서비스
├── packages/
│   ├── shared/           # 공유 타입, 스키마, 유틸리티
│   ├── tree-sitter-utils/# AST 파싱 유틸리티
│   ├── tsconfig/         # 공유 TypeScript 설정
│   └── eslint-config/    # 공유 ESLint 설정
├── quests/               # 20개 과제 (meta.json + starter.js + template.html)
├── infra/                # Docker Compose, DB 초기화 스크립트
└── scripts/              # 개발 환경 셋업 스크립트
```

## 과제 목록 (20개)

| # | 과제 | 난이도 | 시간 |
|---|------|--------|------|
| 001 | 카운터 앱 | 기초 | 30분 |
| 002 | 할일 목록 앱 | 중급 | 45분 |
| 003 | 계산기 앱 | 중급 | 45분 |
| 004 | 뱀 게임 | 고급 | 60분 |
| 005 | 퀴즈 앱 | 중급 | 45분 |
| 006 | 그리기 앱 | 고급 | 60분 |
| 007 | 메모리 카드 게임 | 고급 | 60분 |
| 008 | 스톱워치 | 중급 | 30분 |
| 009 | 날씨 앱 | 고급 | 60분 |
| 010 | 정렬 시각화 | 고급 | 90분 |
| 011 | 비밀번호 생성기 | 기초 | 30분 |
| 012 | 타이핑 연습 게임 | 중급 | 45분 |
| 013 | 마크다운 뷰어 | 중급 | 45분 |
| 014 | 2048 게임 | 고급 | 90분 |
| 015 | 포모도로 타이머 | 기초 | 30분 |
| 016 | 색상 피커 | 기초 | 30분 |
| 017 | 칸반 보드 | 고급 | 60분 |
| 018 | 테트리스 | 고급 | 90분 |
| 019 | 이미지 갤러리 | 중급 | 45분 |
| 020 | 채팅 UI | 중급 | 40분 |

## 유용한 명령어

```bash
pnpm dev              # 전체 개발 서버 (web + api)
pnpm build            # 프로덕션 빌드
pnpm test             # 단위 테스트
pnpm lint             # 린트
pnpm --filter @devlens/web test:e2e  # E2E 테스트
```

## Docker 인프라 (선택)

전체 분석 파이프라인을 사용하려면:

```bash
pnpm infra:up         # Kafka, ClickHouse, PostgreSQL, Redis 시작
pnpm kafka:init       # Kafka 토픽 생성
```

> 상세 가이드: **[GETTING_STARTED.md](./GETTING_STARTED.md)**

## License

MIT
