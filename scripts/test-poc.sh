#!/bin/bash
# Save as test-poc.sh

echo "=== Testing Hook Mode ==="
echo "Test 1: test-hello"
echo '{"tool_name":"Bash","tool_input":{"command":"test-hello world"}}' | bun run .speck/scripts/speck.ts --hook

echo -e "\nTest 2: speck-env"
echo '{"tool_name":"Bash","tool_input":{"command":"speck-env"}}' | bun run .speck/scripts/speck.ts --hook

echo -e "\n=== Testing Hook Router ==="
echo "Test 3: Interception"
echo '{"tool_name":"Bash","tool_input":{"command":"speck-env"}}' | bun run .speck/scripts/hooks/pre-tool-use.ts

echo -e "\nTest 4: Pass-through"
echo '{"tool_name":"Bash","tool_input":{"command":"ls"}}' | bun run .speck/scripts/hooks/pre-tool-use.ts

echo -e "\n=== Tests Complete ==="