# AI agent and CI integrations

API Guardian's scan mode is designed to be usable by both humans and coding agents.

The templates in this directory are examples to copy into a target repository after the npm release containing the documented flags is published.

## Codex

OpenAI documents repository skills under `.agents/skills/<skill-name>/SKILL.md`.

Copy:

```text
integrations/codex/.agents/skills/api-guardian/SKILL.md
```

to the same path in the target project.

## Claude Code

Claude Code loads project instructions from `CLAUDE.md`.

Copy:

```text
integrations/claude/CLAUDE.md
```

to the target project's root, or merge the relevant section into an existing project `CLAUDE.md`.

## Cursor

Cursor project rules live under `.cursor/rules` and use `.mdc` files.

Copy:

```text
integrations/cursor/.cursor/rules/api-guardian.mdc
```

into the target repository.

## GitHub Actions

Copy the example workflow from:

```text
integrations/github-actions/api-guardian.yml
```

to `.github/workflows/api-guardian.yml` in the target repository.

The CI example intentionally performs a read-only scan. It exits non-zero when supported migration candidates are found.

## Safety

These integrations do not give agents blanket permission to rewrite code. They instruct agents to:

- scan first;
- distinguish detection from supported migration rules;
- review diffs;
- validate;
- test;
- preserve rollback behavior;
- avoid exposing secrets.
