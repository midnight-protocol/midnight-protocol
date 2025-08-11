# E2E Test Logging Guide

## Overview

The E2E test suite has integrated comprehensive logging that automatically captures all test output, intermediate results, and execution details. Every test run generates detailed log files for debugging and analysis.

## Log Files Generated

Every E2E test run automatically generates two log files in the `logs/` directory:

1. **JSON Log File** (`logs/e2e-test-log-{timestamp}.json`)
   - Complete structured log of all test activities
   - All intermediate data and API responses
   - Detailed timing information
   - Full conversation transcripts

2. **Text Report** (`logs/e2e-test-report-{timestamp}.txt`)
   - Human-readable summary report
   - Phase timings and status
   - Error and warning summaries
   - Overall test statistics

**Note**: The `logs/` directory is gitignored, so test logs won't be committed to the repository.

## Running Tests

### Direct Execution (Recommended)
```bash
# Runs the test with automatic logging
deno run --allow-all e2e.test.ts
```

### Using the Test Runner
```bash
# Via the test runner script
deno run --allow-all run-tests.ts -p e2e
```

The test automatically:
- Loads environment variables from `.env.test`
- Initializes comprehensive logging
- Saves log files at the end of execution
- Prints file locations in the output

## Log Structure

### JSON Log File Structure
```json
{
  "testRun": {
    "startTime": "ISO timestamp",
    "endTime": "ISO timestamp",
    "totalDuration": "milliseconds",
    "totalLogs": "count",
    "logsByLevel": {
      "info": "count",
      "debug": "count",
      "warning": "count",
      "error": "count",
      "success": "count"
    },
    "phases": [
      {
        "name": "Phase name",
        "duration": "milliseconds",
        "status": "completed|incomplete"
      }
    ]
  },
  "logs": [
    {
      "timestamp": "ISO timestamp",
      "level": "info|debug|warning|error|success",
      "phase": "Current phase name",
      "message": "Log message",
      "data": { /* Associated data */ }
    }
  ]
}
```

### What Gets Logged

#### Phase 1: User Signup
- User creation request
- Auth token generation
- Database user record creation
- Authentication verification

#### Phase 2: Onboarding
- Agent profile creation
- Chat initialization
- Each message exchange:
  - User message (full or truncated)
  - Agent response (full or truncated)
  - Essence data updates
  - Turn counts
- Personal story generation
- Onboarding completion

#### Phase 3-5: (Stubs)
- Placeholder logs for future implementation

## Analyzing Logs

### Using jq to Query JSON Logs

```bash
# View test summary
cat logs/e2e-test-log-*.json | jq '.testRun'

# View all errors
cat logs/e2e-test-log-*.json | jq '.logs[] | select(.level == "error")'

# View message exchanges
cat logs/e2e-test-log-*.json | jq '.logs[] | select(.message | contains("Message exchange")) | .data'

# View phase timings
cat logs/e2e-test-log-*.json | jq '.testRun.phases'

# Extract all agent responses
cat logs/e2e-test-log-*.json | jq '.logs[] | select(.data.agentResponse) | .data.agentResponse'

# View essence data evolution
cat logs/e2e-test-log-*.json | jq '.logs[] | select(.message == "Essence data updated") | .data'
```

### Understanding Log Levels

- **INFO**: General flow information
- **DEBUG**: Detailed operation data
- **SUCCESS**: Successful completion of operations
- **WARNING**: Non-critical issues
- **ERROR**: Test failures or exceptions

## Configuration Options

### Environment Variables

- `TEST_PROFILE_INDEX`: Select test persona (0=Developer, 1=Designer, 2=Founder)
- `OPENROUTER_API_KEY`: Enable dynamic responses
- `LOG_LEVEL`: Control verbosity (not yet implemented)

### Test Profiles

The test uses profiles from `e2e-test-profiles.json`. Each profile includes:
- User credentials
- Agent configuration
- Persona data (for dynamic responses)
- Static messages (fallback)

## Troubleshooting

### Large Log Files
Dynamic responses generate more data. A full test run with dynamic responses can create:
- JSON log: 20-30KB
- Text report: 1-2KB

### Missing Logs
If logs aren't created:
1. Check write permissions in the test directory
2. Ensure the test completes (even with failures)
3. Look for console errors about file writing

### Incomplete Phase Data
Phases that error out will show as "incomplete" with duration of -1ms.

## Best Practices

1. **Regular Tests**: Use standard e2e.test.ts for CI/CD
2. **Debugging**: Use e2e-with-logging.test.ts when investigating issues
3. **Archive Logs**: Keep logs from significant test runs for comparison
4. **Clean Up**: Periodically remove old log files to save space

## Example Output

### Text Report Sample
```
════════════════════════════════════════
E2E TEST EXECUTION REPORT
════════════════════════════════════════

TEST SUMMARY
----------------------------------------
Start Time: 2025-08-10T23:59:20.416Z
End Time: 2025-08-11T00:00:18.227Z
Total Duration: 57811ms
Total Log Entries: 68

LOG LEVELS
----------------------------------------
INFO: 35
DEBUG: 19
SUCCESS: 14

PHASE TIMINGS
----------------------------------------
✓ Phase 1: User Signup: 403ms
✓ Phase 2: Onboarding: 57150ms
✓ Phase 3: Admin Approval: 0ms
✓ Phase 4: Matchmaking: 0ms
✓ Phase 5: Morning Reports: 0ms

════════════════════════════════════════
```

### JSON Log Sample
```json
{
  "timestamp": "2025-08-10T23:59:35.789Z",
  "level": "info",
  "phase": "Phase 2: Onboarding Process",
  "message": "Message exchange completed",
  "data": {
    "turnNumber": 3,
    "userMessage": "I'm interested in connecting...",
    "agentResponse": "That's a solid tech stack...",
    "hasEssenceData": true,
    "showCompleteButton": false
  }
}
```

## Future Enhancements

- [ ] Add log level filtering
- [ ] Real-time log streaming
- [ ] Log comparison tool
- [ ] Automated log analysis
- [ ] Performance metrics extraction
- [ ] Integration with monitoring tools