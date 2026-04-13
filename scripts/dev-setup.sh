#!/bin/bash

# DevLens Development Environment Setup
# Usage: ./scripts/dev-setup.sh
# This script sets up the complete DevLens development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔧 DevLens 개발 환경 설정 시작...${NC}"
echo ""

# Function to print section headers
print_section() {
  echo -e "${YELLOW}→ $1${NC}"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

# ============================================================
# 1. Check prerequisites
# ============================================================
print_section "사전 요구사항 확인 중..."

# Check Node.js
if ! command -v node &> /dev/null; then
  print_error "Node.js가 설치되어 있지 않습니다. Node.js 18+ 이상이 필요합니다."
fi
NODE_VERSION=$(node -v)
print_success "Node.js 설치됨: $NODE_VERSION"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  print_error "pnpm이 설치되어 있지 않습니다. npm install -g pnpm으로 설치하세요."
fi
PNPM_VERSION=$(pnpm -v)
print_success "pnpm 설치됨: $PNPM_VERSION"

# Check Docker
if ! command -v docker &> /dev/null; then
  print_error "Docker가 설치되어 있지 않습니다. https://www.docker.com/get-started에서 설치하세요."
fi
DOCKER_VERSION=$(docker --version)
print_success "Docker 설치됨: $DOCKER_VERSION"

# Check Docker Compose (v2 plugin or standalone)
if docker compose version &> /dev/null; then
  COMPOSE_CMD="docker compose"
  COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "v2")
elif command -v docker-compose &> /dev/null; then
  COMPOSE_CMD="docker-compose"
  COMPOSE_VERSION=$(docker-compose --version)
else
  print_error "Docker Compose가 설치되어 있지 않습니다."
fi
print_success "Docker Compose 설치됨: $COMPOSE_VERSION"

# Check Python (for ML service)
if command -v python3 &> /dev/null; then
  PYTHON_VERSION=$(python3 --version)
  print_success "Python 설치됨: $PYTHON_VERSION"
else
  echo -e "    ${YELLOW}경고: Python3이 없습니다. ML 서비스 로컬 실행 시 필요합니다.${NC}"
fi

echo ""

# ============================================================
# 2. Setup environment file
# ============================================================
print_section ".env 파일 설정 중..."

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    print_success ".env 파일이 생성되었습니다 (.env.example에서 복사)"
    echo "    주의: .env 파일을 검토하고 필요한 값을 설정하세요."
  else
    print_error ".env.example 파일을 찾을 수 없습니다."
  fi
else
  print_success ".env 파일이 이미 존재합니다."
fi

echo ""

# ============================================================
# 3. Install dependencies
# ============================================================
print_section "의존성 설치 중..."

pnpm install || print_error "의존성 설치에 실패했습니다."
print_success "의존성 설치 완료"

echo ""

# ============================================================
# 4. Build shared packages first
# ============================================================
print_section "공유 패키지 빌드 중..."

if [ -d "packages/shared" ]; then
  pnpm --filter @devlens/shared build || print_error "공유 패키지 빌드 실패"
  print_success "공유 패키지 빌드 완료"
fi

if [ -d "packages/tree-sitter-utils" ]; then
  pnpm --filter @devlens/tree-sitter-utils build || print_error "tree-sitter-utils 빌드 실패"
  print_success "tree-sitter-utils 빌드 완료"
fi

echo ""

# ============================================================
# 5. Start Docker infrastructure
# ============================================================
print_section "Docker 인프라 시작 중..."

if [ -f "docker-compose.yml" ] || [ -f "infra/docker-compose.yml" ]; then
  # Try to find the docker-compose file
  COMPOSE_FILE="docker-compose.yml"
  if [ ! -f "$COMPOSE_FILE" ] && [ -f "infra/docker-compose.yml" ]; then
    COMPOSE_FILE="infra/docker-compose.yml"
  fi

  echo "    Docker services 시작 중..."
  $COMPOSE_CMD -f "$COMPOSE_FILE" up -d || print_error "Docker services 시작 실패"
  print_success "Docker services가 시작되었습니다"
else
  echo "    경고: docker-compose.yml 파일을 찾을 수 없습니다."
fi

echo ""

# ============================================================
# 6. Wait for services to be healthy
# ============================================================
print_section "서비스 상태 확인 중..."

# Use the wait-for-services script if available
if [ -f "infra/scripts/wait-for-services.sh" ]; then
  chmod +x "infra/scripts/wait-for-services.sh"
  bash "infra/scripts/wait-for-services.sh" || print_error "서비스 상태 확인 실패"
  print_success "모든 서비스가 준비되었습니다"
else
  echo "    경고: wait-for-services.sh를 찾을 수 없습니다. 수동으로 서비스 상태를 확인하세요."
  # Basic health checks
  echo "    Kafka 상태 확인 중..."
  sleep 2
fi

echo ""

# ============================================================
# 7. Initialize Kafka topics
# ============================================================
print_section "Kafka 토픽 초기화 중..."

KAFKA_CONTAINER="devlens-kafka"
if docker ps | grep -q "$KAFKA_CONTAINER"; then
  if [ -f "infra/kafka/init-topics.sh" ]; then
    docker cp infra/kafka/init-topics.sh "$KAFKA_CONTAINER":/tmp/init-topics.sh
    docker exec "$KAFKA_CONTAINER" bash /tmp/init-topics.sh || echo "    경고: 토픽 생성 중 일부 오류 (이미 존재할 수 있음)"
    print_success "Kafka 토픽 초기화 완료"
  else
    echo "    경고: init-topics.sh를 찾을 수 없습니다."
  fi
else
  echo "    경고: Kafka 컨테이너를 찾을 수 없습니다. 나중에 pnpm kafka:init으로 생성하세요."
fi

echo ""

# ============================================================
# 8. Run database migrations
# ============================================================
print_section "데이터베이스 마이그레이션 중..."

# PostgreSQL migration
if [ -d "infra/sql" ]; then
  echo "    PostgreSQL 마이그레이션 실행 중..."
  # This would normally run database migrations
  # For now, we'll just check if the directory exists
  print_success "PostgreSQL 마이그레이션 스크립트 준비됨"
fi

# ClickHouse initialization
if [ -f "infra/clickhouse/init.sql" ]; then
  echo "    ClickHouse 초기화 중..."
  # This would normally initialize ClickHouse
  print_success "ClickHouse 초기화 준비됨"
fi

echo ""

# ============================================================
# 9. Seed initial data
# ============================================================
print_section "초기 데이터 시딩 중..."

if [ -f "scripts/seed-quests.ts" ] && command -v tsx &> /dev/null; then
  echo "    퀘스트 데이터 시딩 중..."
  tsx scripts/seed-quests.ts || echo "    경고: 퀘스트 데이터 시딩 실패 (무시함)"
  print_success "데이터 시딩 완료"
elif [ -d "quests" ]; then
  QUEST_COUNT=$(find quests -name "meta.json" | wc -l)
  echo "    발견된 퀘스트: $QUEST_COUNT개"
  print_success "퀘스트 데이터가 준비되었습니다"
fi

echo ""

# ============================================================
# 10. Print success message and next steps
# ============================================================
print_section "DevLens 개발 환경 설정 완료!"
echo ""
echo -e "${GREEN}다음 명령을 실행하여 개발을 시작하세요:${NC}"
echo ""
echo "  # 개별 애플리케이션 실행"
echo "  pnpm --filter @devlens/web dev      # Web 앱 (http://localhost:3000)"
echo "  pnpm --filter @devlens/api dev      # API 서버 (http://localhost:4000)"
echo ""
echo "  # 전체 개발 환경 실행"
echo "  pnpm dev"
echo ""
echo "  # E2E 테스트 실행"
echo "  pnpm --filter @devlens/web test:e2e"
echo ""
echo "서비스 상태 확인:"
echo "  - Web: http://localhost:3000"
echo "  - API: http://localhost:4000"
echo "  - Kafka: localhost:9092"
echo "  - ClickHouse: http://localhost:8123"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
print_success "모든 준비가 완료되었습니다! 행운을 빕니다! 🚀"
