# AI SDK migrations are more than package upgrades

AI SDKs move fast. A dependency bump can look harmless until the application stops compiling, a model ID has been retired, a request shape changed, or response handling no longer matches what the SDK returns.

That is the problem API Guardian is trying to make easier to inspect.

## The risky approach: rewrite first, debug later

A migration tool can be aggressive: find an old-looking API call and immediately rewrite it.

That is also an easy way to damage a working application.

API Guardian takes the opposite approach:

```text
scan
  -> detect supported usage
  -> identify registered migration candidates
  -> generate a proposal
  -> show the diff
  -> validate
  -> back up
  -> apply
  -> validate again
  -> run tests
  -> keep or roll back
```

Provider detection and automatic migration are separate capabilities.

If API Guardian recognizes an Anthropic, xAI, or Mistral integration, that does not mean it will automatically rewrite it.

## A scan that does not need a model API key

The read-only path is deliberately cheap to try:

```bash
npx openai-api-guardian@latest . --scan
```

For automation and coding agents:

```bash
npx openai-api-guardian@latest . --scan --json
```

For CI that should fail when supported migration candidates remain:

```bash
npx openai-api-guardian@latest . --scan --json --fail-on-candidates
```

API Guardian also has a doctor mode for checking local readiness:

```bash
npx openai-api-guardian@latest . --doctor
```

## What it currently recognizes

The current repository supports detection for:

- OpenAI;
- Anthropic Claude;
- Google Gemini;
- xAI / Grok;
- Mistral AI.

JavaScript, TypeScript, and Python are the initial language targets.

Automatic migration rules are intentionally narrower.

## Model retirement is a migration problem too

Code can stay syntactically correct while a model identifier becomes unusable.

API Guardian therefore keeps model lifecycle warnings separate from source migration rules. When a provider officially retires or deprecates a model ID, scan and doctor output can warn about the identifier and point to the provider's documented replacement.

Those warnings are not automatic replacements. A replacement model can differ in reasoning behavior, latency, price, image quality, prompting behavior, or parameter support.

## Coding-agent integration

A scan command becomes more useful when an agent can run it before changing provider integration code.

The repository includes example instructions for:

- Codex;
- Claude Code;
- Cursor;
- GitHub Actions.

The common rule is simple: **scan first, treat evidence as evidence, and do not turn detection into blanket permission to rewrite.**

## A reproducible local demo

The repository includes a small multi-provider fixture:

```bash
npm ci
npm run demo:scan
```

The demo needs no model API key and is executed in CI so the documented scan behavior stays tied to tested code.

## What feedback is most useful

The most useful reports are not “support every API.”

They are minimal, sanitized examples such as:

- an SDK import that the scanner missed;
- an officially documented migration pattern;
- a provider model ID that has been retired or deprecated;
- a request/response migration that can be validated safely.

Do not post secrets or private code.

Repository:

https://github.com/ijisaegis-prog/openai-api-guardian

npm:

https://www.npmjs.com/package/openai-api-guardian
