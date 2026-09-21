# API Guardian

[![npm version](https://img.shields.io/npm/v/openai-api-guardian.svg)](https://www.npmjs.com/package/openai-api-guardian)
[![npm downloads](https://img.shields.io/npm/dm/openai-api-guardian.svg)](https://www.npmjs.com/package/openai-api-guardian)
[![CI](https://github.com/ijisaegis-prog/openai-api-guardian/actions/workflows/ci.yml/badge.svg)](https://github.com/ijisaegis-prog/openai-api-guardian/actions/workflows/ci.yml)

**Your AI SDK changed. API Guardian helps you find what may break before you migrate it.**

API Guardian is a safety-first CLI for detecting, reviewing, validating, applying, testing, and rolling back supported AI API/SDK migrations across JavaScript, TypeScript, and Python projects.

## Why API Guardian?

AI SDKs evolve quickly. A migration can touch imports, client construction, request shapes, response handling, and tests. API Guardian is built around a conservative workflow:

```text
Scan -> Detect candidates -> Generate proposal -> Show diff -> Validate
     -> Backup -> Apply -> Validate again -> Test -> Keep or roll back
```

Unsupported providers are **detected but never automatically rewritten** just because they were found.

## Supported providers

| Provider | JavaScript / TypeScript | Python | Automatic migration rules |
| --- | --- | --- | --- |
| OpenAI | Detection | Detection | Chat Completions -> Responses review |
| Anthropic Claude | Detection | Detection | Not yet |
| Google Gemini | Detection | Detection | Legacy Google Generative AI -> Google GenAI |
| xAI / Grok | Detection | Detection | Not yet |
| Mistral AI | Detection | Detection | Not yet |

xAI detection covers the official Python `xai-sdk`, OpenAI-compatible xAI endpoints, and common JavaScript usage such as `@ai-sdk/xai`. Mistral detection covers the official `@mistralai/mistralai` and `mistralai` SDKs.

## Stable npm release

The current npm package is `openai-api-guardian`.

```bash
npm install -g openai-api-guardian
api-guardian <target-directory>
```

Or run it without installing globally:

```bash
npx openai-api-guardian@latest <target-directory>
```

The repository's main branch may contain provider support that is newer than the current npm release.

## Scan mode

The next release adds an API-key-free scan mode:

```bash
api-guardian . --scan
```

It reports detected providers, languages, API usage locations, and migration candidates, then exits without generating proposals or modifying files.

Example output:

```text
API Guardian started.
Mode: SCAN
Providers detected: openai (4), anthropic (2), xai (3), mistral (2)
Languages detected: typescript (7), python (4)
API usage locations: 11
Files containing supported API usage: 5
Migration candidates: 2
Affected files: 2

Scan finished.
No files were changed.
```

## Preview mode

Preview is the default migration behavior.

```bash
api-guardian .
# or
api-guardian . --preview
```

When migration candidates are found, AI-assisted proposal generation currently requires `OPENAI_API_KEY`.

API Guardian will:

1. scan the project;
2. find supported migration candidates;
3. generate proposed changes;
4. display diffs;
5. validate proposals;
6. leave original files unchanged.

## Apply mode

```bash
api-guardian . --apply
```

Apply mode:

1. prepares and validates every proposal first;
2. creates backups;
3. applies validated changes;
4. validates changed files again;
5. runs project tests when a supported test signal is present;
6. rolls back all changed files if validation or tests fail.

## CLI options

```text
--scan          Scan supported API/SDK usage without requiring an AI API key
--preview       Generate and validate proposals without changing originals
--apply         Apply validated proposals
--help, -h      Show help
--version, -v   Show API Guardian version
```

Use only one of `--scan`, `--preview`, or `--apply` at a time.

## Supported files

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

Common generated and dependency directories such as `node_modules`, `dist`, `build`, `.git`, virtual environments, and API Guardian's own generated files are skipped.

## Safety model

API Guardian never applies an AI-generated migration immediately.

Before a source file is changed, the proposal is generated separately and validated. Apply mode creates a backup, re-validates the updated source, runs the project test command when available, and performs an atomic-style rollback of all files changed during that migration attempt when validation or tests fail.

## Privacy

The CLI does not include product telemetry that sends user source code, file paths, or API keys to the maintainer.

The maintainer usage report only reads aggregate npm download statistics and GitHub repository statistics.

## Requirements

- Node.js
- npm
- Python when validating Python migration proposals
- `OPENAI_API_KEY` only when AI-assisted proposal generation is needed

PowerShell:

```powershell
$env:OPENAI_API_KEY="your-api-key"
```

macOS/Linux:

```bash
export OPENAI_API_KEY="your-api-key"
```

Do not commit API keys to source control.

## Development

```bash
npm ci
npm run build
npm test
npm pack --dry-run
```

Run scan mode from source:

```bash
node dist/index.js . --scan
```

Run preview mode:

```bash
node dist/index.js . --preview
```

Run apply mode:

```bash
node dist/index.js . --apply
```

## Roadmap

Near-term priorities:

- strengthen Anthropic migration rules;
- strengthen Gemini migration coverage;
- add safe xAI/Grok migration rules where deterministic rules are possible;
- add Mistral migration rules;
- integrate with coding-agent workflows and CI;
- publish anonymous, opt-in usage metrics only if they can be collected without source code or secrets.

## Maintainer usage metrics

```bash
node scripts/usage-report.cjs
```

The report reads aggregate npm and GitHub statistics. GitHub clone/visitor metrics require a token with traffic access.

## Feedback

If API Guardian finds a provider but misses a migration pattern, open a GitHub issue with a **minimal sanitized code example**. Never include API keys or private source code.

## License

ISC
