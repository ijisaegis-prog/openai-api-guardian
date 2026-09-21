# API Guardian instructions

When the task involves AI SDK/API upgrades, deprecations, or migration risk:

1. Run a read-only API Guardian scan before editing:
   `npx openai-api-guardian@latest . --scan --json`
2. Use the scan as evidence, not as permission to rewrite every detected provider.
3. Automatic migrations are only valid for explicit registered rules.
4. Prefer `--preview` before `--apply`.
5. Inspect the diff and validation result before source changes.
6. If apply is requested, verify project tests and confirm whether API Guardian kept or rolled back the changes.
7. Never reveal API keys, credentials, or private source code.
8. For automated checks, use `--fail-on-candidates` only with `--scan`.
9. If the current npm version lacks a documented flag, do not assume it exists.
