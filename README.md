# DevLens

> Analyze how you develop, not just what you build

웹 기반 AI 개발 분석 플랫폼. 코드 변경, 실행 로그, 개발자 행동 데이터를 실시간으로 수집하여 코드 품질, 버그 위험도, 개발 행동 패턴을 통합 분석합니다.

## Tech Stack

- **Frontend**: Next.js 14, Monaco Editor, D3.js, Recharts, Zustand
- **Backend**: Fastify, Socket.io, BullMQ
- **Data Pipeline**: Apache Kafka, ClickHouse, Kafka Streams
- **Database**: PostgreSQL (Supabase), pgvector, Redis
- **AI/ML**: Claude API, Tree-sitter, XGBoost, scikit-learn
- **QA**: Playwright
- **Infra**: Docker Compose (dev), Vercel + AWS ECS (prod)

## Quick Start

```bash
git clone <repo-url> devlens && cd devlens
cp .env.example .env          # JWT_SECRET, ANTHROPIC_API_KEY 등 필수 값 설정
pnpm install                  # 의존성 설치
pnpm infra:up                 # Docker Compose 인프라 기동
pnpm kafka:init               # Kafka 토픽 생성
pnpm turbo build --filter=@devlens/shared --filter=@devlens/tree-sitter-utils
pnpm dev                      # 모든 서비스 동시 실행
```

자동 셋업 스크립트: `pnpm setup` (macOS/Linux) / `pnpm setup:win` (Windows)

> 상세 가이드는 **[GETTING_STARTED.md](./GETTING_STARTED.md)** 를 참고하세요.

## Project Structure

```
devlens/
├── apps/
│   ├── web/              # Next.js 14 프론트엔드 (포트 3000)
│   └── api/              # Fastify API 서버 (포트 4000)
├── services/
│   ├── ai-engine/        # Claude API 기반 코드 분석
│   ├── stream-router/    # Kafka 이벤트 라우팅
│   ├── sandbox/          # Docker 기반 코드 실행 샌드박스 (포트 4001)
│   └── ml/               # Python ML 서비스 (포트 8000)
├── packages/
│   ├── shared/           # 공유 타입, 스키마, 유틸리티
│   ├── tree-sitter-utils/# AST 파싱 유틸리티
│   ├── tsconfig/         # 공유 TypeScript 설정
│   └── eslint-config/    # 공유 ESLint 설정
├── infra/                # Docker Compose, DB 초기화 스크립트
├── scripts/              # 개발 환경 셋업 스크립트
├── quests/               # 과제 데이터 (시드)
└── .github/              # CI/CD 워크플로우
```

## Development Roadmap

- **Phase 0** (현재): 기반 설계 — 모노레포, 인프라, 스키마
- **Phase 1** (M1~M3): MVP — 수집 + LLM 분석
- **Phase 2** (M4~M6): 핵심 기능 확장
- **Phase 3** (M7~M9): 분석 고도화
- **Phase 4** (M10~M12): 시스템 안정화
