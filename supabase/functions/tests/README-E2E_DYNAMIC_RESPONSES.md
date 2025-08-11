# E2E Test Dynamic Responses

## Overview

The E2E test suite now supports dynamic onboarding responses using an LLM (Language Model) to make test conversations more realistic and varied. This feature helps simulate real user interactions more accurately.

## How It Works

### Static Messages (Default)
By default, the E2E tests use pre-defined static messages from `e2e-test-profiles.json`. This ensures tests are:
- Deterministic and reproducible
- Fast (no API calls)
- Free (no API costs)
- Always available (no external dependencies)

### Dynamic Messages (Optional)
When an OpenRouter API key is provided, the tests can generate dynamic responses that:
- Vary between test runs
- Respond contextually to agent questions
- Simulate more realistic user behavior
- Test the system with unpredictable inputs

## Configuration

### Enabling Dynamic Responses

Set the OpenRouter API key as an environment variable:

```bash
# Option 1: Set for single test run
export OPENROUTER_API_KEY="your-api-key-here"
deno run --allow-all e2e.test.ts

# Option 2: Set test-specific key
export TEST_OPENROUTER_API_KEY="your-api-key-here"
deno run --allow-all e2e.test.ts

# Option 3: Include in test command
OPENROUTER_API_KEY="your-api-key-here" deno run --allow-all e2e.test.ts
```

### Test Profiles

Each test profile in `e2e-test-profiles.json` includes:
- **Static messages**: Pre-defined responses for deterministic testing
- **Persona data**: Character information for dynamic generation

Example persona structure:
```json
{
  "persona": {
    "name": "Alex Chen",
    "role": "Senior Full-Stack Developer",
    "background": "10 years of experience...",
    "personality": "analytical",
    "currentProject": "Migrating to microservices",
    "expertise": ["TypeScript", "React", "Node.js"],
    "goals": ["Reduce technical debt", "Build scalable systems"]
  }
}
```

## Testing the Dynamic Response System

### Unit Test
Test the LLM helper module directly:
```bash
deno run --allow-all test-llm-helper.test.ts
```

### Full E2E Test with Dynamic Responses
```bash
# Set up environment
export TEST_MODE=true
export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=<your-anon-key>
export SUPABASE_SERVICE_ROLE_KEY=<your-service-key>
export OPENROUTER_API_KEY=<your-openrouter-key>

# Run the test
deno run --allow-all e2e.test.ts
```

## Fallback Behavior

The system gracefully handles various scenarios:

1. **No API Key**: Uses static messages from profiles
2. **API Error**: Falls back to static messages
3. **Invalid Persona**: Uses static messages
4. **Rate Limiting**: Falls back to static messages

## Cost Considerations

Dynamic responses use the OpenRouter API which has costs:
- Default model: `anthropic/claude-3-haiku-20240307` (fast & cheap)
- Approximate cost: ~$0.001 per test run (6 messages)
- Consider using sparingly or only for specific test scenarios

## Benefits

### With Static Messages
- ✅ Predictable test outcomes
- ✅ Fast execution
- ✅ No external dependencies
- ✅ Zero cost

### With Dynamic Messages
- ✅ More realistic user simulation
- ✅ Tests system resilience to varied inputs
- ✅ Discovers edge cases
- ✅ Better coverage of conversation flows

## Debugging

The test will log which mode it's using:
- `🤖 Using dynamic LLM responses for onboarding (API key found)`
- `📝 Using static test messages for onboarding (no API key)`

Individual message generation is also logged:
- Static: `Sending static message 1/5: "I'm a software developer..."`
- Dynamic: `Generating dynamic message 1/6 using LLM...`

## Best Practices

1. **CI/CD**: Use static messages for automated testing
2. **Development**: Use dynamic responses occasionally to test robustness
3. **QA**: Use dynamic responses for exploratory testing
4. **Production Validation**: Mix both approaches

## Troubleshooting

### "No API key" message
- Ensure `OPENROUTER_API_KEY` or `TEST_OPENROUTER_API_KEY` is set
- Check the key is valid and has credits

### Fallback to static messages
- Check console for API errors
- Verify persona data structure in profiles
- Ensure OpenRouter service is accessible

### Slow test execution
- Dynamic responses add ~2-3 seconds per message
- Consider reducing message count or using static for most tests