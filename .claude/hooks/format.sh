#!/bin/bash

# Read JSON from stdin
INPUT=$(cat)

# Extract file_path (standard tools) or relative_path (Serena tools)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | sed 's/"file_path":"//;s/"$//')

if [ -z "$FILE_PATH" ]; then
  # Try relative_path for Serena tools
  RELATIVE_PATH=$(echo "$INPUT" | grep -o '"relative_path":"[^"]*"' | head -1 | sed 's/"relative_path":"//;s/"$//')
  if [ -n "$RELATIVE_PATH" ]; then
    FILE_PATH="$CLAUDE_PROJECT_DIR/$RELATIVE_PATH"
  fi
fi

# Exit if no file path
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format supported file types
if [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx|json|md)$ ]]; then
  npx prettier --write "$FILE_PATH" 2>/dev/null
fi

exit 0
