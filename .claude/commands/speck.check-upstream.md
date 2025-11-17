---
description: Check for available spec-kit releases from upstream GitHub repository
---

You are being invoked as a Claude Code slash command to check for available
spec-kit releases from the upstream repository.

## Your Task

Execute the `.speck/scripts/check-upstream.ts` script and present the results to
the user.

## Execution Steps

1. Run the check-upstream script:
   ```bash
   bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/check-upstream.ts
   ```

2. If the user requested JSON output, run with --json flag:
   ```bash
   bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/check-upstream.ts --json
   ```

3. Present the results to the user:
   - If successful (exit code 0), show the release list
   - If failed (exit code 2), show the error message

## Expected Output

The script will output a list of available spec-kit releases with:

- Version number (e.g., v1.0.0)
- Publication date
- Release notes summary

## Example Usage

User: `/speck.check-upstream`

Expected behavior:

- Execute the script
- Display available releases in human-readable format
- Show any rate limit warnings

User: `/speck.check-upstream --json`

Expected behavior:

- Execute the script with --json flag
- Display available releases in JSON format
- Show any rate limit warnings in stderr

## Error Handling

If the script fails:

- Display the error message from stderr
- Explain possible causes (network issues, rate limiting)
- Suggest next steps (wait for rate limit reset, check network connection)

## Notes

- This command does NOT pull or transform releases, it only lists what's
  available
- The upstream repository is: `github/spec-kit`
- Rate limit warnings are normal and informational
- To pull a specific release, use `/speck.pull-upstream <version>` after
  checking
