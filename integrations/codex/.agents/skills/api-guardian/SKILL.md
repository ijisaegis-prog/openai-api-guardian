---
name: api-guardian
description: Use when reviewing or migrating AI SDK/API usage in a codebase. Scan first, preserve user code, and only apply supported migrations after reviewing evidence.
---

# API Guardian workflow

1. Start with a read-only scan:

   ```bash
   npx openai-api-guardian@latest . --scan --json
   ```

2. Treat detection and migration as separate decisions.
3. Never claim a provider is automatically migratable unless API Guardian reports a registered migration candidate.
4. Prefer preview before apply:

   ```bash
   npx openai-api-guardian@latest . --preview
   ```

5. Review the generated diff and validation result before any apply step.
6. Use `--apply` only when the requested migration is supported and the user intends source changes.
7. After apply, verify tests and rollback status.
8. Never expose or commit API keys. Never paste private source code into external services solely to diagnose a migration.
9. For CI checks, use:

   ```bash
   npx openai-api-guardian@latest . --scan --json --fail-on-candidates
   ```

10. If the installed npm release does not yet support one of these flags, use the repository version or wait for the matching release rather than inventing behavior.
