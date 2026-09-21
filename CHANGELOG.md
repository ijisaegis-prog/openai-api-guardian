# Changelog

## 1.1.0 - 2026-09-21

### Added
- API-key-free `--scan` mode for detecting supported AI SDK usage without modifying files.
- xAI/Grok detection for JavaScript/TypeScript and Python, including common OpenAI-compatible xAI endpoint usage.
- Mistral detection for JavaScript/TypeScript and Python.
- Smoke-test coverage for xAI/Mistral detection and scan mode.
- Provider-feedback GitHub issue template.
- Launch kit for developer-community promotion.

### Improved
- Package discovery keywords for xAI, Grok, Mistral, AI SDKs, API migration, and developer tooling.
- README positioning, support matrix, safety explanation, and privacy wording.
- README badge/link formatting and text encoding artifacts.

### Safety
- xAI/Grok and Mistral are detection-only in 1.1.0.
- Automatic rewrites remain limited to explicitly registered and validated migration rules.
- Scan mode never generates proposals and never modifies files.
