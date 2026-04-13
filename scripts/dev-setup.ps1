# DevLens 개발 환경 설정 (Windows PowerShell)
# Usage: .\scripts\dev-setup.ps1

$ErrorActionPreference = "Stop"

function Write-Section($msg) { Write-Host "`n→ $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red; exit 1 }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor DarkYellow }

Write-Host "`n🔧 DevLens 개발 환경 설정 시작...`n" -ForegroundColor Cyan

# 1. Prerequisites
Write-Section "사전 요구사항 확인"

# Node.js
try { $nv = (node -v); Write-Ok "Node.js: $nv" }
catch { Write-Fail "Node.js가 설치되어 있지 않습니다 (18+ 필요)" }

# pnpm
try { $pv = (pnpm -v); Write-Ok "pnpm: $pv" }
catch { Write-Fail "pnpm이 없습니다. npm install -g pnpm" }

# Docker
try { $dv = (docker --version); Write-Ok "Docker: $dv" }
catch { Write-Fail "Docker Desktop이 설치되어 있지 않습니다" }

# Python (optional)
try { $pyv = (python --version 2>&1); Write-Ok "Python: $pyv" }
catch { Write-Warn "Python이 없습니다 (ML 서비스 로컬 실행 시 필요)" }

# 2. .env
Write-Section ".env 파일 설정"
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Ok ".env 파일 생성됨 (.env.example 복사)"
        Write-Warn ".env 파일을 열어 API 키 등 필요한 값을 설정하세요"
    } else {
        Write-Fail ".env.example 파일을 찾을 수 없습니다"
    }
} else {
    Write-Ok ".env 파일이 이미 존재합니다"
}

# 3. Install
Write-Section "의존성 설치"
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Fail "의존성 설치 실패" }
Write-Ok "의존성 설치 완료"

# 4. Build shared packages
Write-Section "공유 패키지 빌드"
pnpm --filter @devlens/shared build
if ($LASTEXITCODE -ne 0) { Write-Fail "@devlens/shared 빌드 실패" }
Write-Ok "@devlens/shared 빌드 완료"

if (Test-Path "packages/tree-sitter-utils") {
    pnpm --filter @devlens/tree-sitter-utils build
    Write-Ok "@devlens/tree-sitter-utils 빌드 완료"
}

# 5. Docker infrastructure
Write-Section "Docker 인프라 시작"
$composeFile = if (Test-Path "infra/docker-compose.yml") { "infra/docker-compose.yml" } else { "docker-compose.yml" }
docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { Write-Fail "Docker 서비스 시작 실패" }
Write-Ok "Docker 서비스 시작됨"

# 6. Wait for services
Write-Section "서비스 헬스체크 (최대 60초)"
$timeout = 60; $elapsed = 0
$services = @{
    "Kafka"      = { try { (New-Object Net.Sockets.TcpClient("localhost",9092)).Close(); $true } catch { $false } }
    "ClickHouse" = { try { (Invoke-WebRequest -Uri "http://localhost:8123/ping" -TimeoutSec 2).StatusCode -eq 200 } catch { $false } }
    "PostgreSQL" = { try { (New-Object Net.Sockets.TcpClient("localhost",5432)).Close(); $true } catch { $false } }
    "Redis"      = { try { (New-Object Net.Sockets.TcpClient("localhost",6379)).Close(); $true } catch { $false } }
}
$ready = @{}

while ($elapsed -lt $timeout) {
    foreach ($svc in $services.Keys) {
        if (-not $ready[$svc]) {
            if (& $services[$svc]) {
                $ready[$svc] = $true
                Write-Ok "$svc 준비됨"
            }
        }
    }
    if ($ready.Count -eq $services.Count) { break }
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "  ... 대기 중 ($elapsed s)" -ForegroundColor DarkGray
}

if ($ready.Count -lt $services.Count) {
    $missing = $services.Keys | Where-Object { -not $ready[$_] }
    Write-Warn "타임아웃: $($missing -join ', ')이(가) 응답하지 않습니다"
    Write-Warn "docker ps로 컨테이너 상태를 확인하세요"
}

# 7. Kafka topics
Write-Section "Kafka 토픽 생성"
$kafkaContainer = docker ps --filter "name=devlens-kafka" --format "{{.Names}}" 2>$null
if ($kafkaContainer) {
    docker exec $kafkaContainer bash -c "kafka-topics.sh --list --bootstrap-server kafka:29092" 2>$null
    if ($LASTEXITCODE -eq 0) {
        if (Test-Path "infra/kafka/init-topics.sh") {
            docker cp "infra/kafka/init-topics.sh" "${kafkaContainer}:/tmp/init-topics.sh"
            docker exec $kafkaContainer bash /tmp/init-topics.sh
            Write-Ok "Kafka 토픽 생성 완료"
        }
    } else {
        Write-Warn "Kafka가 아직 준비되지 않았습니다. 나중에 pnpm kafka:init 실행하세요"
    }
} else {
    Write-Warn "Kafka 컨테이너를 찾을 수 없습니다"
}

# 8. Summary
Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DevLens 개발 환경 설정 완료!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  시작 명령어:" -ForegroundColor White
Write-Host "    pnpm dev                          # 전체 개발 서버" -ForegroundColor Gray
Write-Host "    pnpm --filter @devlens/web dev    # Web (http://localhost:3000)" -ForegroundColor Gray
Write-Host "    pnpm --filter @devlens/api dev    # API (http://localhost:4000)" -ForegroundColor Gray
Write-Host ""
Write-Host "  인프라:" -ForegroundColor White
Write-Host "    pnpm infra:up      # Docker 서비스 시작" -ForegroundColor Gray
Write-Host "    pnpm infra:down    # Docker 서비스 중지" -ForegroundColor Gray
Write-Host "    pnpm infra:logs    # 로그 확인" -ForegroundColor Gray
Write-Host ""
Write-Host "  Kafka UI: http://localhost:8080" -ForegroundColor DarkCyan
Write-Host ""
