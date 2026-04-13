#!/bin/bash

# Wait for Services Health Check Script
# This script waits for all required services to become healthy
# Timeout: 60 seconds

set -e

# Configuration
TIMEOUT=60
INTERVAL=2
ELAPSED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Service health status tracking
KAFKA_READY=false
CLICKHOUSE_READY=false
POSTGRES_READY=false
REDIS_READY=false

print_status() {
  local service=$1
  local status=$2

  if [ "$status" = "ready" ]; then
    echo -e "${GREEN}✓${NC} $service is ready"
  else
    echo -e "${YELLOW}⏳${NC} Waiting for $service... ($ELAPSED s)"
  fi
}

check_kafka() {
  if nc -z localhost 9092 2>/dev/null; then
    KAFKA_READY=true
    print_status "Kafka" "ready"
    return 0
  else
    print_status "Kafka" "waiting"
    return 1
  fi
}

check_clickhouse() {
  if curl -s "http://localhost:8123/ping" >/dev/null 2>&1; then
    CLICKHOUSE_READY=true
    print_status "ClickHouse" "ready"
    return 0
  else
    print_status "ClickHouse" "waiting"
    return 1
  fi
}

check_postgres() {
  if command -v pg_isready &>/dev/null; then
    if pg_isready -h localhost -p 5432 -U devlens >/dev/null 2>&1; then
      POSTGRES_READY=true
      print_status "PostgreSQL" "ready"
      return 0
    fi
  else
    # Fallback: try to connect with nc
    if nc -z localhost 5432 2>/dev/null; then
      POSTGRES_READY=true
      print_status "PostgreSQL" "ready"
      return 0
    fi
  fi

  print_status "PostgreSQL" "waiting"
  return 1
}

check_redis() {
  if command -v redis-cli &>/dev/null; then
    if redis-cli -h localhost -p 6379 ping >/dev/null 2>&1; then
      REDIS_READY=true
      print_status "Redis" "ready"
      return 0
    fi
  else
    # Fallback: try to connect with nc
    if nc -z localhost 6379 2>/dev/null; then
      REDIS_READY=true
      print_status "Redis" "ready"
      return 0
    fi
  fi

  print_status "Redis" "waiting"
  return 1
}

all_services_ready() {
  if [ "$KAFKA_READY" = true ] &&
    [ "$CLICKHOUSE_READY" = true ] &&
    [ "$POSTGRES_READY" = true ] &&
    [ "$REDIS_READY" = true ]; then
    return 0
  else
    return 1
  fi
}

# Main wait loop
echo ""
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
echo ""

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Check all services
  check_kafka
  check_clickhouse
  check_postgres
  check_redis

  # Check if all services are ready
  if all_services_ready; then
    echo ""
    echo -e "${GREEN}✓ All services are ready!${NC}"
    echo ""
    exit 0
  fi

  # Wait before next check
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

# Timeout reached
echo ""
echo -e "${RED}✗ Timeout waiting for services${NC}"
echo ""
echo "Service status:"
if [ "$KAFKA_READY" = true ]; then
  echo -e "  ${GREEN}✓${NC} Kafka is ready"
else
  echo -e "  ${RED}✗${NC} Kafka is not responding (expected on port 9092)"
fi

if [ "$CLICKHOUSE_READY" = true ]; then
  echo -e "  ${GREEN}✓${NC} ClickHouse is ready"
else
  echo -e "  ${RED}✗${NC} ClickHouse is not responding (expected on port 8123)"
fi

if [ "$POSTGRES_READY" = true ]; then
  echo -e "  ${GREEN}✓${NC} PostgreSQL is ready"
else
  echo -e "  ${RED}✗${NC} PostgreSQL is not responding (expected on port 5432)"
fi

if [ "$REDIS_READY" = true ]; then
  echo -e "  ${GREEN}✓${NC} Redis is ready"
else
  echo -e "  ${RED}✗${NC} Redis is not responding (expected on port 6379)"
fi

echo ""
echo "Troubleshooting:"
echo "  - Check if Docker containers are running: docker ps"
echo "  - View logs: docker logs <container-name>"
echo "  - Restart services: docker-compose restart"
echo ""

exit 1
