#!/usr/bin/env bash
# Minimal curl request through Selixes AI Gateway
#
# Usage:
#   chmod +x chat_completion.sh
#   ./chat_completion.sh

GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000/v1}"
API_KEY="${API_KEY:-selixes_dev_key}"

echo "Sending chat completion request to ${GATEWAY_URL}..."

curl -s -X POST "${GATEWAY_URL}/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how does Selixes protect against 504 gateway dropouts?"
      }
    ],
    "temperature": 0.7
  }' | jq .
