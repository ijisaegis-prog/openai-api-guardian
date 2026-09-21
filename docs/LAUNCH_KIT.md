# API Guardian Launch Kit

This file contains reusable launch copy for API Guardian. Keep claims aligned with the latest published npm version.

## Core positioning

**Your AI SDK changed. API Guardian helps you find what may break before you migrate it.**

API Guardian is a safety-first CLI that scans JavaScript, TypeScript, and Python projects for AI SDK usage, identifies supported migration candidates, validates proposed changes, runs tests, and rolls back failed migrations.

## One-line pitch

A safety-first CLI for detecting AI SDK/API migration risk across OpenAI, Claude, Gemini, xAI/Grok, and Mistral, with automatic migration limited to explicitly supported rules.

## Short post

AI SDKs keep changing, so I built API Guardian to make migrations less risky.

It scans a codebase for supported AI SDK usage, shows supported migration candidates, validates proposed changes, runs tests, and rolls back failed migrations. Detection support is broader than automatic migration support.

Providers currently detected:
- OpenAI
- Anthropic Claude
- Google Gemini
- xAI / Grok
- Mistral

JavaScript, TypeScript, and Python are supported.

Useful commands in v1.1.0:

```bash
api-guardian . --scan
api-guardian . --doctor
api-guardian . --scan --json
api-guardian . --init-agent codex
```

The scan/doctor paths do not require a model API key and do not modify source files.

GitHub: https://github.com/ijisaegis-prog/openai-api-guardian
npm: https://www.npmjs.com/package/openai-api-guardian

Feedback and real migration examples are welcome.

## Hacker News / Show HN

Do **not** paste generated promotional copy into Hacker News.

HN's guidelines favor personal, technical explanations and explicitly discourage using the site primarily for promotion. Show HN is also intended for projects people can actually try without a signup barrier.

Before considering a Show HN:

- the npm release containing the advertised features must be live;
- the one-command scan must work without an API key;
- `npx openai-api-guardian@latest . --scan` must be verified against the newly published npm version;
- the account should already be familiar with and participate in HN;
- the owner should write the final submission in their own words;
- do not ask anyone for upvotes or comments.

Useful factual points for the owner to cover in their own words:

- why AI SDK migration failures were worth solving;
- why detection is separated from automatic rewriting;
- the scan -> proposal -> diff -> validate -> backup -> apply -> test -> rollback flow;
- which providers are detection-only;
- what was technically difficult;
- what feedback would improve the migration rules.

Possible factual title:

`Show HN: API Guardian – a validation-first CLI for AI SDK migrations`

## Reddit

Prefer communities or recurring threads that explicitly allow developer self-promotion.

Good initial targets after the npm release is live:

- AI-assisted coding weekly self-promotion threads;
- DevOps weekly self-promotion threads when presenting the CI use case;
- side-project communities only when their current rules allow project sharing.

Do not mass-post the same copy across subreddits. Lead with the technical problem, disclose that the poster built the project, ask for a specific type of feedback, and participate in the thread.

### Reddit draft

Title:

I built an open-source CLI to make AI SDK migrations safer

Body:

I have been working on API Guardian, a CLI that scans projects for AI SDK usage and tries to make migrations less risky.

Instead of immediately rewriting code, it follows a validation-first flow: detect -> propose -> diff -> validate -> backup -> apply -> test -> rollback on failure.

It currently detects OpenAI, Claude, Gemini, xAI/Grok, and Mistral in JS/TS and Python. Automatic rewrite rules are deliberately limited to migrations that have explicit rules and validation.

I am looking for developers who have recently dealt with an AI SDK breaking change. If you have a sanitized pattern the tool misses, I would like to add it.

GitHub: https://github.com/ijisaegis-prog/openai-api-guardian

## v1.1.0 factual launch points

Safe claims after npm 1.1.0 is live:

- detects OpenAI, Anthropic Claude, Google Gemini, xAI/Grok, and Mistral usage;
- scans JavaScript, TypeScript, and Python;
- `--scan` and `--doctor` work without a model API key and do not modify files;
- JSON scan output can be consumed by CI and coding agents;
- Codex, Claude Code, Cursor, and GitHub Actions integration templates can be bootstrapped explicitly;
- OpenAI Chat Completions and legacy Google Generative AI patterns have registered migration rules;
- xAI/Grok and Mistral are detection-only in 1.1.0;
- model lifecycle warnings are advisory and never auto-replace a model ID.

Do **not** advertise the draft Assistants API retirement warning until it ships in a later npm release.

## Launch order

1. Publish npm release and verify the install command.
2. Post in one clearly permitted Reddit self-promotion thread.
3. Publish the technical DEV article.
4. Share a short factual post on an authenticated social account if available.
5. Consider Show HN only when the account and submission fit HN's current guidelines.
6. Measure referral response before posting elsewhere.

## DEV.to outline

Title:

I built a safety-first CLI for AI SDK migrations

Sections:
1. The problem: SDK churn is more than dependency upgrades
2. Why blind codemods are risky
3. API Guardian's validation-first workflow
4. Scan mode and provider detection
5. Supported providers and languages
6. Rollback behavior
7. What is intentionally not automated yet
8. How to try it
9. What feedback would help most

## Launch checklist

Before posting externally:

- CI is green on main.
- The npm version containing the advertised features is published.
- The README's quick-start command works on a clean machine.
- Scan mode requires no model API key.
- No secrets exist in fixtures or examples.
- GitHub Issues are enabled.
- A minimal sanitized example is available.
- The launch post does not ask for upvotes.
- Claims about automatic migrations match registered migration rules.
- Each community's current self-promotion rules were checked immediately before posting.
- Hacker News copy is written by the account owner in their own words.
- No channel is asked for coordinated votes, comments, or engagement.
