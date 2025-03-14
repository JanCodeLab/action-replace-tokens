# Replace Tokens Action
[![Release](https://github.com/JanCodeLab/action-replace-tokens/actions/workflows/release.yml/badge.svg)](https://github.com/JanCodeLab/action-replace-tokens/actions/workflows/release.yml)

This GitHub Action replaces tokens in specified files. It's built using Node.js and can be used across your organization.

## Usage

```yaml
- name: Replace tokens in files
  uses: JanCodeLab/action-replace-tokens@latest
  id: replace-tokens
  with:
    files: 'file1.txt,file2.txt'  # Comma-separated list of files
    token-start: '#{'  # Token start delimiter
    token-end: '}#'  # Token end delimiter
    fail-on-missing: 'true'  # Fail if any token is missing
    github-token: '${{ secrets.GITHUB_TOKEN }}'  # GitHub token to retrieve repo variables
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `files` | Filenames (comma separated) containing tokens to replace | Yes | `''` |
| `token-start` | Token start string | No | `#{` |
| `token-end` | Token end string | No | `}#` |
| `fail-on-missing` | Fail if token is missing | No | `false` |
| `github-token` | GitHub token to retrieve repo variables | No | `''` |

## Outputs

None

## Example: Replacing tokens in multiple files

```yaml
jobs:
  replace-tokens-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Replace tokens in files
        id: replace-tokens
        uses: JanCodeLab/action-replace-tokens@latest
        with:
          files: 'file1.txt,file2.txt'
          token-start: '#{'
          token-end: '}#'
          fail-on-missing: 'true'
          github-token: '${{ secrets.GITHUB_TOKEN }}'
          
      - name: Show results
        run: |
          echo "Token replacement completed"
```

## Changelog
- v1.2 (latest)
  - Fixed versioning
- v1.1 
  - Refactored log lines of the action
  - Optimized function
- v1
  - Initial implementation of token replacement.
  - Support for github repository variables. Requires github token with appropriate permissions
  - Read tokens from environment variables of the action