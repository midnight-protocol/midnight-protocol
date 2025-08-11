#!/bin/bash

# View the latest E2E test log report

LOGS_DIR="./logs"

if [ ! -d "$LOGS_DIR" ]; then
  echo "❌ No logs directory found"
  exit 1
fi

# Find the latest report file
LATEST_REPORT=$(ls -t $LOGS_DIR/e2e-test-report-*.txt 2>/dev/null | head -1)

if [ -z "$LATEST_REPORT" ]; then
  echo "❌ No test reports found in $LOGS_DIR"
  exit 1
fi

echo "📄 Viewing latest test report: $LATEST_REPORT"
echo ""
cat "$LATEST_REPORT"

# Also show path to JSON log
TIMESTAMP=$(echo "$LATEST_REPORT" | grep -oE '[0-9]+' | tail -1)
JSON_LOG="$LOGS_DIR/e2e-test-log-${TIMESTAMP}.json"

if [ -f "$JSON_LOG" ]; then
  echo ""
  echo "💡 For detailed JSON log, run:"
  echo "   cat $JSON_LOG | jq '.testRun'"
fi