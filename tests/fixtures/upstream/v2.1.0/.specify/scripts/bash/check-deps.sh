#!/bin/bash
# Mock dependency checker for testing

set -e

check_command() {
    command -v "$1" >/dev/null 2>&1
}

if check_command bun; then
    echo "bun: found"
else
    echo "bun: not found"
    exit 1
fi

if check_command git; then
    echo "git: found"
else
    echo "git: not found"
    exit 1
fi

echo "All dependencies satisfied"
exit 0
