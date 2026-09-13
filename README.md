# API Guardian

[![npm version](https://img.shields.io/npm/v/openai-api-guardian.svg)](https://www.npmjs.com/package/openai-api-guardian)
[![npm downloads](https://img.shields.io/npm/dm/openai-api-guardian.svg)](https://www.npmjs.com/package/openai-api-guardian)
[![CI](https://github.com/ijisaegis-prog/openai-api-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/ijisaegis-prog/openai-api-guardian/
 a CLI tool for safely detecting, validating, migrating, testing, and rolling back supported API and SDK usage across JavaScript, TypeScript, and Python projects. It currently detects OpenAI, Anthropic, and Google Gemini usage, with automated migration rules enabled only for explicitly supported cases.

It is designed to make API migrations safer by generating proposed changes first, validating them before application, creating backups, running project tests, and automatically rolling back changes when validation or tests fail.

## Features

- Scans JavaScript, TypeScript, and Python projects for supported API and SDK usage
- Detects OpenAI, Anthropic, and Google Gemini usage
- Detects migration candidates
- Generates AI-assisted migration proposals
- Displays proposed diffs before modifying source files
- Validates generated JavaScript, TypeScript, and Python changes
- Supports preview mode without changing original files
- Creates backups before applying changes
- Re-validates files after migration
- Runs the target project's test command
- Automatically rolls back all changed files when tests fail
- Validates restored files after rollback


## Current Support

| Provider | JavaScript / TypeScript | Python | Migration support |
| --- | --- | --- | --- |
| OpenAI | Detection | Detection | Chat Completions usage can be reviewed for migration to the Responses API |
| Anthropic | Detection | Detection | Detection only for now; no automatic rewrite rule is enabled yet |
| Google Gemini | Detection | Detection | Legacy `@google/generative-ai` and `google.generativeai` usage can be reviewed for migration to the Google GenAI SDK |

Migration support is intentionally narrower than detection support. API Guardian only generates automated migration proposals for rules that are explicitly registered and then validates the resulting source before application.
## Installation

Install globally:

```bash
npm install -g openai-api-guardian
api-guardian <target-directory>
```

The npm package name is `openai-api-guardian`. After a global installation, the CLI command is `api-guardian`.

### Try it in 30 seconds

```bash
npx openai-api-guardian@latest . --preview
```

Preview mode scans and validates supported migration candidates without changing original files.

Or run the package directly with npx without installing it globally:

```bash
npx openai-api-guardian@latest <target-directory>
```

## Usage

```bash
api-guardian [target-directory] [options]
```

When running directly with npx, use the npm package name and version:

```bash
npx openai-api-guardian@latest [target-directory] [options]
```

### Preview mode

Preview is the default behavior.

```bash
api-guardian .
```

or:

```bash
api-guardian . --preview
```

API Guardian will:

1. Scan the project
2. Detect supported migration candidates
3. Generate migration proposals
4. Display diffs
5. Validate the proposals
6. Leave the original files unchanged

### Apply mode

```bash
api-guardian . --apply
```

When `--apply` is used, API Guardian will:

1. Scan the project
2. Generate migration proposals
3. Validate every proposal
4. Create backups
5. Apply the validated changes
6. Re-validate modified files
7. Run the project's tests
8. Keep the migration if tests pass
9. Roll back all changed files if tests fail

## Examples

Preview the current directory:

```bash
api-guardian .
```

Preview another project:

```bash
api-guardian C:\Projects\my-app
```

Apply migrations:

```bash
api-guardian C:\Projects\my-app --apply
```

Using npx:

```bash
npx openai-api-guardian@latest C:\Projects\my-app
```

```bash
npx openai-api-guardian@latest C:\Projects\my-app --apply
```

## CLI Options

```text
--preview       Generate and validate proposals without changing originals
--apply         Apply validated proposals
--help, -h      Show help
--version, -v   Show API Guardian version
```

## Safety Model

API Guardian follows a validation-first migration process.

A migration is not immediately written to the original source file.

The basic flow is:

```text
Scan
  ??
Detect migration candidates
  ??
Generate proposal
  ??
Show diff
  ??
Validate proposal
  ??
Create backup
  ??
Apply
  ??
Validate again
  ??
Run project tests
  ??
PASS ??Keep changes
FAIL ??Roll back every changed file
```

If a project test fails after a multi-file migration, API Guardian performs an atomic-style rollback of all files modified during that migration attempt.

## Generated Files

During migration API Guardian may temporarily create files such as:

```text
*.api-guardian-proposed.*
*.api-guardian-backup-*
*.api-guardian-validation-temp*
```

Validation temporary files are automatically removed.

Backup files are created when migrations are applied so that changes can be restored safely.

## Supported Files

API Guardian scans:

```text
.ts
.tsx
.mts
.cts
.js
.jsx
.mjs
.cjs
.py
```

Directories such as the following are ignored during scanning:

```text
node_modules
dist
.git
```

API Guardian also ignores its own generated proposal, backup, and validation temporary files.

## Requirements

- Node.js
- npm
- Python when validating Python migration proposals
- An OpenAI API key when AI-assisted migration generation is required

Static detection, `--version`, and `--help` work without an API key. When migration candidates are found, generating AI-based proposals requires access to the OpenAI API and may incur separate API usage charges.

Set your OpenAI API key through the `OPENAI_API_KEY` environment variable. Do not store API keys in source code or commit them to a repository.

PowerShell example:

```powershell
$env:OPENAI_API_KEY="your-api-key"
```

macOS and Linux example:

```bash
export OPENAI_API_KEY="your-api-key"
```

## Development

Install dependencies:

```bash
npm install
```

Compile:

```bash
npm run build
```

Run directly during development:

```bash
node dist/index.js .
```

Run apply mode:

```bash
node dist/index.js . --apply
```

## Package Verification

Before publishing:

```bash
npm pack --dry-run
```

This allows you to verify the exact files that will be included in the npm package.

## Status

API Guardian is expanding from an OpenAI-focused JavaScript/TypeScript CLI into a multi-provider, multi-language migration safety tool.

The current development foundation supports JavaScript, TypeScript, and Python scanning; OpenAI, Anthropic, and Google Gemini detection; JavaScript/TypeScript validation; Python syntax validation; npm test execution; and pytest execution when an explicit pytest test signal is present.

Detection does not imply that an automatic migration rule exists. Preview remains the default mode, and unsupported provider changes are never rewritten merely because they were detected.

## License

ISC
## Maintainer Usage Metrics

Maintainers can generate an aggregate usage report with:

```bash
node scripts/usage-report.cjs
```

The report reads public npm download totals and GitHub repository statistics. When a GitHub token with traffic access is available, it also reports 14-day clone and visitor aggregates. It does not collect or transmit API Guardian users' source code, file paths, API keys, or CLI telemetry.
