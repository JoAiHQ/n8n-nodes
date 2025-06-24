# 🔒 Security Guide for Joai n8n Integration

This guide covers best practices for securely connecting your Joai server with n8n nodes, particularly focusing on protecting sensitive agent UUIDs from public exposure.

## 🚨 The Problem: Agent UUID Exposure

n8n workflows and configurations can be visible to users, making hardcoded agent UUIDs a security risk. Direct UUID exposure can lead to:

- **Unauthorized agent access**
- **Data breaches**
- **Workflow manipulation**
- **Privacy violations**

## 🔒 Security Solutions

### 1. **Environment Variables** (Recommended for Production)

Store agent UUIDs in environment variables on your n8n server:

```bash
# Set environment variables
export JOAI_AGENT_SUPPORT="agent_uuid_abc123"
export JOAI_AGENT_SALES="agent_uuid_def456"
export JOAI_AGENT_BILLING="agent_uuid_ghi789"
```

**In n8n Credentials:**
- ✅ Enable "Use Environment Variables"
- ✅ Use aliases like `support`, `sales`, `billing`

**In Workflows:**
```json
{
  "resource": "agent",
  "operation": "sendMessage",
  "sendMessageAgentId": "support"  // ← Uses alias, not UUID
}
```

### 2. **Agent Mapping in Credentials**

Store agent mappings directly in n8n credentials (encrypted by n8n):

**In n8n Credentials JSON mapping:**
```json
{
  "support": "agent_uuid_abc123",
  "sales": "agent_uuid_def456",
  "billing": "agent_uuid_ghi789",
  "escalation": "agent_uuid_jkl012"
}
```

**Benefits:**
- ✅ Encrypted by n8n
- ✅ Per-credential isolation
- ✅ Easy management
- ✅ No server configuration needed

### 3. **Scoped API Keys** (Server-Side Implementation)

Create API keys scoped to specific agents:

```javascript
// Server implementation example
app.post('/api/v1/messages', authenticateApiKey, (req, res) => {
  const { agent_scope } = req.apiKey;

  // Only allow messages from agents in the API key scope
  if (!agent_scope.includes(req.body.agent_id)) {
    return res.status(403).json({ error: 'Agent not authorized' });
  }

  // Process message...
});
```

### 4. **Dynamic Agent Resolution API**

Create an endpoint that resolves agent aliases server-side:

```javascript
// Server endpoint
app.get('/api/v1/agents/resolve/:alias', authenticateApiKey, (req, res) => {
  const agentMapping = {
    'support': 'agent_uuid_abc123',
    'sales': 'agent_uuid_def456'
  };

  const agentId = agentMapping[req.params.alias];
  if (!agentId) {
    return res.status(404).json({ error: 'Agent alias not found' });
  }

  res.json({ agent_id: agentId });
});
```

## 🛠 Implementation Examples

### Production Setup with Environment Variables

**1. Server Environment:**
```bash
# /etc/environment or docker-compose.yml
JOAI_AGENT_SUPPORT=agent_a1b2c3d4e5f6
JOAI_AGENT_SALES=agent_f6e5d4c3b2a1
JOAI_AGENT_ESCALATION=agent_1a2b3c4d5e6f
```

**2. n8n Credentials Configuration:**
```json
{
  "apiKey": "your_secure_api_key",
  "baseUrl": "https://api.joai.ai",
  "useEnvVars": true,
  "agentMapping": "{}"
}
```

**3. Workflow Configuration:**
```json
{
  "resource": "agent",
  "operation": "sendMessage",
  "sendMessageAgentId": "support",
  "conversationId": "{{$json.conversation_id}}",
  "messageContent": "Hello! How can I help you today?"
}
```

### Mixed Approach with Fallback

**Credentials Configuration:**
```json
{
  "apiKey": "your_secure_api_key",
  "baseUrl": "https://api.joai.ai",
  "useEnvVars": true,
  "agentMapping": {
    "emergency": "agent_emergency_uuid",
    "fallback": "agent_default_uuid"
  }
}
```

**Resolution Priority:**
1. Environment variable (`JOAI_AGENT_SUPPORT`)
2. Credentials mapping (`{"support": "agent_uuid"}`)
3. Direct UUID (if it looks like a UUID)

## 🔐 Additional Security Measures

### API Key Security
```json
{
  "apiKey": "joai_live_sk_1234567890abcdef",  // Use live keys in production
  "baseUrl": "https://api.joai.ai",
  "rateLimiting": true,
  "ipWhitelist": ["192.168.1.0/24"]
}
```

### Webhook Security
- ✅ **Signature Validation**: Always validate webhook signatures
- ✅ **HTTPS Only**: Use HTTPS endpoints
- ✅ **IP Filtering**: Restrict webhook sources
- ✅ **Rate Limiting**: Implement webhook rate limits

### Monitoring & Auditing
```javascript
// Log all agent operations
console.log({
  timestamp: new Date().toISOString(),
  action: 'agent_message_sent',
  agent_alias: 'support',  // Log alias, not UUID
  user_id: req.user.id,
  conversation_id: req.body.conversation_id
});
```

## 🚦 Security Checklist

### Before Production:
- [ ] Agent UUIDs stored in environment variables or encrypted credentials
- [ ] No hardcoded UUIDs in workflows
- [ ] API keys use least-privilege principle
- [ ] Webhook signatures validated
- [ ] HTTPS everywhere
- [ ] Monitoring and logging enabled
- [ ] Rate limiting configured
- [ ] IP whitelisting where appropriate

### Regular Maintenance:
- [ ] Rotate API keys quarterly
- [ ] Review agent mappings monthly
- [ ] Audit workflow permissions
- [ ] Monitor for UUID exposure in logs
- [ ] Update dependencies regularly

## 🔧 Troubleshooting

### Agent Resolution Issues

**Problem**: Agent alias not resolving
```bash
# Check environment variable
echo $JOAI_AGENT_SUPPORT

# Check n8n logs
docker logs n8n-container | grep "Agent.*not found"
```

**Solution**: Verify environment variables or credentials mapping

### Permission Errors

**Problem**: 403 Forbidden when sending messages
- Check API key permissions
- Verify agent ID is correct after resolution
- Ensure agent exists in your Joai account

## 📚 Best Practices Summary

1. **Never** expose agent UUIDs directly in workflows
2. **Always** use aliases or environment variables
3. **Validate** all webhook signatures
4. **Monitor** all agent operations
5. **Rotate** API keys regularly
6. **Use** least-privilege API keys
7. **Log** operations for auditing (without exposing UUIDs)
8. **Test** security measures in staging environment

---

For additional security questions or implementation help, please refer to the main README.md or create an issue in the repository.
