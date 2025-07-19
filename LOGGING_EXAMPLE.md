# LLM Call Logging Implementation

## Overview
The LLM service now includes comprehensive logging for all `chatCompletion` and `streamCompletion` calls. All input, output, performance metrics, and errors are logged to the `llm_call_logs` table.

## Usage Examples

### Basic Usage (Backward Compatible)
```typescript
import { llmService } from "./_shared/llm-service.ts";

// Existing code continues to work unchanged
const response = await llmService.chatCompletion({
  model: "anthropic/claude-3-sonnet",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.7
});
```

### With Logging Context
```typescript
import { llmService } from "./_shared/llm-service.ts";

// Include context for better logging
const response = await llmService.chatCompletion({
  model: "anthropic/claude-3-sonnet",
  messages: [{ role: "user", content: "Hello!" }],
  temperature: 0.7
}, {
  requestId: "req_123",
  edgeFunction: "onboarding-chat",
  userId: "user_456"
});
```

### Streaming with Logging
```typescript
import { llmService } from "./_shared/llm-service.ts";

const streamResponse = await llmService.streamCompletion({
  model: "anthropic/claude-3-sonnet",
  messages: [{ role: "user", content: "Tell me a story" }],
  stream: true
}, {
  edgeFunction: "chat-stream",
  userId: "user_789"
});
```

## Database Schema

The `llm_call_logs` table captures:

- **Input Data**: Full messages array and parameters
- **Output Data**: Complete API response and extracted completion text
- **Metrics**: Token counts, costs, response times
- **Status**: Success/failure with error details
- **Context**: Edge function, user ID, request ID

## Features

### Automatic Logging
- All LLM calls are automatically logged
- Non-blocking: Logging failures don't break LLM functionality
- Atomic: Each call gets a unique log entry

### Performance Tracking
- Response time measurement
- Token usage extraction
- Cost estimation

### Error Handling
- Comprehensive error logging
- HTTP status codes
- Detailed error messages

### Privacy & Security
- Row Level Security (RLS) policies
- Admin-only access to all logs
- Users can view their own logs

## Querying Logs

### Recent LLM Calls
```sql
SELECT 
  model,
  method_type,
  status,
  total_tokens,
  cost_usd,
  response_time_ms,
  created_at
FROM llm_call_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Cost Analysis
```sql
SELECT 
  model,
  COUNT(*) as call_count,
  SUM(total_tokens) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(response_time_ms) as avg_response_time
FROM llm_call_logs 
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY model;
```

### Error Analysis
```sql
SELECT 
  error_message,
  COUNT(*) as error_count,
  model,
  edge_function
FROM llm_call_logs 
WHERE status = 'failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_message, model, edge_function
ORDER BY error_count DESC;
```

## Implementation Details

### Backward Compatibility
- Existing LLM service calls continue to work unchanged
- Optional parameters for logging context
- Non-breaking API changes

### Performance Impact
- Minimal overhead (async logging)
- Database operations don't block LLM responses
- Graceful degradation if logging fails

### Data Retention
- Consider implementing log rotation for large volumes
- Archive old logs to manage database size
- Monitor storage usage over time