---
description: Pull a specific spec-kit release from upstream GitHub repository
---

You are being invoked as a Claude Code slash command to pull a specific spec-kit
release from the upstream repository.

## Your Task

Execute the `.speck/scripts/pull-upstream.ts` script with the version argument
provided by the user and present the results.

## Execution Steps

1. Extract the version argument from the user's command
2. Run the pull-upstream script:
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
   bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/pull-upstream.ts <version>
   ```

3. If the user requested JSON output, run with --json flag:
   ```bash
   echo "DEBUG: $(env | grep PLUGIN)"
   bun run ${SPECK_PLUGIN_ROOT:-".speck"}/scripts/pull-upstream.ts <version> --json
   ```

4. Present the results to the user:
   - If successful (exit code 0), confirm the pull and show details
   - If failed (exit code 1), explain the user error
   - If failed (exit code 2), explain the system/network error

## Expected Output

The script will:

- Download the release tarball from GitHub
- Extract it to `upstream/<version>/` directory
- Update `upstream/releases.json` with release metadata
- Update `upstream/latest` symlink to point to this version

## Example Usage

User: `/speck.pull-upstream v1.0.0`

Expected behavior:

- Execute the script with v1.0.0 as the version
- Display success message with commit SHA and directory path
- Confirm that releases.json and latest symlink were updated

User: `/speck.pull-upstream v1.0.0 --json`

Expected behavior:

- Execute the script with --json flag
- Display JSON output with version, commit, pullDate, status, and directory

## Error Handling

### Exit Code 1 (User Error)

- Invalid version format (not vX.Y.Z)
- Missing version argument
- Release already pulled

For these errors:

- Display the error message from stderr
- Suggest valid version format if applicable
- Suggest running `/speck.check-upstream` to see available releases

### Exit Code 2 (System Error)

- Network connection issues
- GitHub API failures
- Tarball download or extraction failures
- File system errors

For these errors:

- Display the error message from stderr
- Explain possible causes (network issues, API rate limiting, disk space)
- Suggest next steps (check connection, wait and retry, check disk space)

## Notes

- This command downloads and stores pristine upstream content
- The upstream repository is: `github/spec-kit`
- Downloaded content is stored in `upstream/<version>/` and should NOT be
  modified
- To transform the pulled release, use `/speck.transform-upstream` after
  pulling
- The operation is atomic - if it fails, no partial state is left behind
- Use `/speck.check-upstream` first to see available releases
