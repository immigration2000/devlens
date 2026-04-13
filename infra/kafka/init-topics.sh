#!/bin/bash

set -e

BOOTSTRAP_SERVER="kafka:29092"

echo "Waiting for Kafka to be ready..."
until kafka-broker-api-versions.sh --bootstrap-server $BOOTSTRAP_SERVER &>/dev/null; do
  echo "Kafka not ready yet, retrying..."
  sleep 2
done

echo "Kafka is ready. Creating topics..."

# Topics with 6 partitions
for topic in raw-events code-change-events execution-events test-result-events behavior-events structure-events; do
  echo "Creating topic: $topic"
  kafka-topics.sh \
    --create \
    --topic $topic \
    --bootstrap-server $BOOTSTRAP_SERVER \
    --partitions 6 \
    --replication-factor 1 \
    --if-not-exists
done

# Topics with 3 partitions
echo "Creating topic: analysis-results"
kafka-topics.sh \
  --create \
  --topic analysis-results \
  --bootstrap-server $BOOTSTRAP_SERVER \
  --partitions 3 \
  --replication-factor 1 \
  --if-not-exists

echo "All topics created successfully!"
kafka-topics.sh --list --bootstrap-server $BOOTSTRAP_SERVER
