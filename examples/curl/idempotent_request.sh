#!/usr/bin/env bash
# Demonstrates Request Idempotency through Selixes Gateway
#
# By sending an Idempotency-Key header, identical requests are cached
# and replayed from Redis, emitting the X-Idempotency-Cache header.
#
# Usage:
#   chmod +x idempotent_request.sh
#   ./idempotent_request.sh

GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000/v1}"
API_KEY="${API_KEY:-selixes_dev_key}"
KEY="run_uuid_$(date +%s)"

echo "1. First request with Idempotency-Key: ${KEY} (Cache Miss expected)"
curl -i -s -X POST "${GATEWAY_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Idempotency-Key: ${KEY}" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Execute order #1029"}]
  }' | grep -E "(HTTP/|X-Idempotency-Cache)"

echo ""
echo "2. Re-sending identical request with Idempotency-Key: ${KEY} (Cache HIT expected)"
curl -i -s -X POST "${GATEWAY_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Idempotency-Key: ${KEY}" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Execute order #1029"}]
  }' | grep -E "(HTTP/|X-Idempotency-Cache)"
