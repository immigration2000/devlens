# DevLens - 로컬 개발 환경 설정 가이드

이 문서는 Windows 11 환경에서 DevLens 프로젝트를 로컬에 실행하는 방법을 안내합니다.

## 사전 요구 사항

| 도구 | 최소 버전 | 설치 |
|------|-----------|------|
| Node.js | 20.x | https://nodejs.org |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker Desktop | 4.25+ | https://www.docker.com/products/docker-desktop |
| Python | 3.11+ | https://www.python.org (ML 서비스용) |
| Git | 2.40+ | https://git-scm.com |

Docker Desktop은 반드시 **WSL 2 백엔드**를 사용하도록 설정하세요.


## 1단계: 프로젝트 클론 및 의존성 설치

```powershell
git clone <repository-url> devlens
cd devlens
pnpm install
```

`pnpm install`이 완료되면 Turborepo가 자동으로 모든 워크스페이스 패키지의 의존성을 설치합니다.


## 2단계: 환경 변수 설정

```powershell
cp .env.example .env
```

`.env` 파일을 열고 최소 아래 항목을 채워주세요:

```env
# 필수
JWT_SECRET=your-random-secret-key-here
ANTHROPIC_API_KEY=sk-ant-...

# GitHub OAuth (로그인 기능 사용 시)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

나머지 인프라 접속 정보(Kafka, ClickHouse, Redis, PostgreSQL)는 `.env.example`의 기본값이 Docker Compose 설정과 일치하므로 수정 불필요합니다.


## 3단계: 인프라 서비스 실행

```powershell
# Docker Compose로 인프라 서비스 시작
pnpm infra:up
```

이 명령은 다음 서비스를 시작합니다:

- **Kafka** (localhost:9092) - 이벤트 스트리밍
- **Zookeeper** (localhost:2181) - Kafka 코디네이터
- **ClickHouse** (localhost:8123) - 시계열 이벤트 저장소
- **PostgreSQL + pgvector** (localhost:5432) - 메인 DB
- **Redis** (localhost:6379) - 캐싱 및 pub/sub
- **Kafka UI** (localhost:8080) - Kafka 모니터링 대시보드

서비스 상태 확인:

```powershell
docker compose -f infra/docker-compose.yml ps
```

모든 서비스가 `healthy` 상태가 될 때까지 30초~1분 정도 기다리세요.


## 4단계: Kafka 토픽 생성

```powershell
pnpm kafka:init
```

이 명령은 `raw-events`, `code-change-events`, `execution-events`, `test-result-events`, `behavior-events`, `structure-events`, `analysis-results` 토픽을 생성합니다.


## 5단계: 공유 패키지 빌드

```powershell
pnpm turbo build --filter=@devlens/shared --filter=@devlens/tree-sitter-utils
```

다른 서비스들이 참조하는 공유 패키지를 먼저 빌드합니다.


## 6단계: 개발 서버 실행

```powershell
# 모든 서비스 동시 시작 (Turborepo가 의존성 순서 관리)
pnpm dev
```

또는 개별 서비스를 별도 터미널에서 실행:

```powershell
# 터미널 1: API 서버
pnpm --filter @devlens/api dev

# 터미널 2: 웹 프론트엔드
pnpm --filter @devlens/web dev

# 터미널 3: AI 엔진
pnpm --filter @devlens/ai-engine dev

# 터미널 4: 스트림 라우터
pnpm --filter @devlens/stream-router dev
```


## 7단계: ML 서비스 실행 (선택)

```powershell
cd services/ml
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```


## 접속 URL

| 서비스 | URL |
|--------|-----|
| 웹 프론트엔드 | http://localhost:3000 |
| API 서버 | http://localhost:4000 |
| API 문서 | http://localhost:4000/api |
| 코드 샌드박스 | http://localhost:4001 |
| ML 서비스 | http://localhost:8000 |
| Kafka UI | http://localhost:8080 |
| ClickHouse HTTP | http://localhost:8123 |


## 빠른 셋업 (자동 스크립트)

위 단계를 자동화한 스크립트를 제공합니다:

```powershell
# Windows
pnpm setup:win

# macOS / Linux
pnpm setup
```


## 유용한 명령어

```powershell
# 전체 빌드
pnpm build

# 린트
pnpm lint

# 타입 체크
pnpm turbo type-check

# 단위 테스트
pnpm test

# E2E 테스트 (Playwright)
pnpm --filter @devlens/web test:e2e

# 인프라 로그 확인
pnpm infra:logs

# 인프라 초기화 (데이터 삭제 후 재시작)
pnpm infra:reset

# 인프라 종료
pnpm infra:down
```


## 트러블슈팅

### Docker 관련

**"Cannot connect to the Docker daemon"**
- Docker Desktop이 실행 중인지 확인하세요.
- WSL 2 통합이 활성화되어 있는지 Settings > Resources > WSL Integration에서 확인하세요.

**포트 충돌**
- 5432(PostgreSQL), 6379(Redis), 9092(Kafka) 등이 이미 사용 중인 경우, 기존 서비스를 종료하거나 `infra/docker-compose.yml`의 포트 매핑을 변경하세요.

### Node.js 관련

**"ERR_MODULE_NOT_FOUND"**
- 공유 패키지 빌드가 필요합니다: `pnpm turbo build --filter=@devlens/shared`

**pnpm install 실패**
- Node.js 20 이상이 설치되어 있는지 확인: `node --version`
- pnpm 9 이상이 설치되어 있는지 확인: `pnpm --version`
- 캐시 정리 후 재시도: `pnpm store prune && pnpm install`

### Kafka 관련

**"Topic not found" 에러**
- Kafka가 healthy 상태인지 확인 후 `pnpm kafka:init`을 다시 실행하세요.
- Kafka UI(localhost:8080)에서 토픽 목록을 확인할 수 있습니다.


## 프로젝트 구조

```
devlens/
  apps/
    web/          # Next.js 14 프론트엔드 (포트 3000)
    api/          # Fastify API 서버 (포트 4000)
  services/
    ai-engine/    # Claude API 기반 코드 분석
    stream-router/# Kafka 이벤트 라우팅
    sandbox/      # Docker 기반 코드 실행 샌드박스 (포트 4001)
    ml/           # Python ML 서비스 (포트 8000)
  packages/
    shared/       # 공유 타입, 스키마, 유틸리티
    tree-sitter-utils/ # AST 파싱 유틸리티
  infra/          # Docker Compose, DB 초기화 스크립트
  scripts/        # 개발 환경 셋업 스크립트
  quests/         # 과제 데이터 (시드)
```
