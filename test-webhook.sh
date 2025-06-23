#!/bin/bash

# Test webhook script for JoAI webhook trigger
# Replace WEBHOOK_URL with the actual webhook URL from your N8N workflow

WEBHOOK_URL="http://localhost:5678/webhook/YOUR_WEBHOOK_ID"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: test-signature" \
  -d '{
    "event": "agent.executed",
    "webhookable": {
      "type": "agent",
      "uuid": "test-agent-uuid",
      "name": "Test AI Agent",
      "description": "Test agent description"
    },
    "webhook": {
      "id": "webhook_test123",
      "name": "N8N Webhook"
    },
    "timestamp": "2025-01-15T10:30:00.000Z",
    "data": {
      "executionId": 12345,
      "message": "Hello, this is a test message!",
      "sender": "user_test",
      "room": "test-agent-uuid",
      "user": {
        "id": 123,
        "name": "Test User",
        "email": "test@example.com"
      }
    }
  }'
