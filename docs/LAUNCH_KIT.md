# API Guardian Launch Kit

This file contains reusable launch copy for API Guardian. Keep claims aligned with the latest published npm version.

## Core positioning

**Your AI SDK changed. API Guardian helps you find what may break before you migrate it.**

API Guardian is a safety-first CLI that scans JavaScript, TypeScript, and Python projects for AI SDK usage, identifies supported migration candidates, validates proposed changes, runs tests, and rolls back failed migrations.

## One-line pitch

A safety-first CLI for finding and migrating AI SDK changes across OpenAI, Claude, Gemini, xAI/Grok, and Mistral.

## Short post

AI SDKs keep changing, so I built API Guardian to make migrations less risky.

It scans a codebase for supported AI SDK usage, shows migration candidates, validates proposed changes, runs tests, and rolls back failed migrations.

Providers currently detected:
- OpenAI
- Anthropic Claude
- Google Gemini
- xAI / Grok
- Mistral

JavaScript, TypeScript, and Python are supported.

GitHub: https://github.com/ijisaegis-prog/openai-api-guardian
npm: https://www.npmjs.com/package/openai-api-guardian

Feedback and real migration examples are welcome.

## Show HN draft

Title:

Show HN: API Guardian – Scan AI SDK migrations before they break your app

Body:

I built API Guardian after repeatedly running into the same problem: AI SDKs change quickly, but a migration is rarely just a package-version bump.

Imports, client initialization, request shapes, response handling, and tests can all move at once. API Guardian takes a conservative approach:

1. scan the project;
2. identify supported AI SDK usage;
3. identify migration candidates;
4. generate a proposal only for registered migration rules;
5. show the diff;
6. validate it;
7. back up the original;
8. apply and test;
9. roll everything back if validation or tests fail.

The scanner currently recognizes OpenAI, Anthropic Claude, Google Gemini, xAI/Grok, and Mistral across JavaScript/TypeScript and Python.

Automatic migrations are intentionally narrower than detection. Unsupported providers are never rewritten just because they were detected.

Repository:
https://github.com/ijisaegis-prog/openai-api-guardian

npm:
https://www.npmjs.com/package/openai-api-guardian

I would especially like feedback on real-world SDK migration patterns that the scanner misses. Sanitized examples are ideal; please do not post secrets or private source code.

## Reddit draft

Title:

I built an open-source CLI to make AI SDK migrations safer

Body:

I have been working on API Guardian, a CLI that scans projects for AI SDK usage and tries to make migrations less risky.

Instead of immediately rewriting code, it follows a validation-first flow: detect -> propose -> diff -> validate -> backup -> apply -> test -> rollback on failure.

It currently detects OpenAI, Claude, Gemini, xAI/Grok, and Mistral in JS/TS and Python. Automatic rewrite rules are deliberately limited to migrations that have explicit rules and validation.

I am looking for developers who have recently dealt with an AI SDK breaking change. If you have a sanitized pattern the tool misses, I would like to add it.

GitHub: https://github.com/ijisaegis-prog/openai-api-guardian

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
