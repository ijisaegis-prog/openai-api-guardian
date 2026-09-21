# Contributing to API Guardian

Thanks for helping improve API Guardian.

The project is deliberately conservative: detecting an API/SDK pattern is easier than proving that an automatic migration is safe.

## Before opening a contribution

Never include:

- API keys or tokens;
- customer data;
- private repository code;
- proprietary prompts or documents;
- credentials in fixtures, screenshots, logs, or issue descriptions.

Use the smallest sanitized example that reproduces the behavior.

## Development checks

```bash
npm ci
npm run build
npm test
npm run demo:scan
npm pack --dry-run
```

All should pass before a PR is merged.

## Adding provider detection

Provider detection belongs in `src/scanner.ts`.

A detection change should include a fixture or smoke test proving:

- the intended provider is detected;
- unrelated providers are not introduced by the example;
- generated API Guardian files and excluded directories remain ignored.

Avoid overly broad method-only regexes when the same method name is common across providers. Prefer package imports, explicit clients, provider endpoints, environment variable names, or other provider-specific evidence.

## Adding a migration rule

Migration candidates belong in `src/migration-rule.ts`.

A rule is acceptable only when:

1. the old API/SDK pattern is clearly identified;
2. the provider documents the migration or the behavior is otherwise unambiguous;
3. unrelated code can be preserved;
4. the generated proposal can be validated;
5. failure can still follow API Guardian's rollback model.

Detection support does not imply migration support.

## Adding a model lifecycle warning

Lifecycle warnings belong in `src/deprecation-rule.ts`.

Each rule must include:

- exact provider model identifier;
- lifecycle status;
- recommended replacement;
- a short note;
- an official provider documentation URL.

Lifecycle warnings are advisory. Do not turn them into automatic model replacement rules without separate evidence that behavior, reasoning settings, quality, and request semantics are compatible.

## Pull request workflow

Use a focused branch.

A typical contribution should follow:

```text
branch
  -> implementation
  -> tests
  -> pull request
  -> GitHub CI
  -> review
  -> merge only when CI is green
```

For migration-related changes, explain both what is automated and what remains intentionally manual.
