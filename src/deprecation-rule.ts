import type {
  ApiProvider,
  ScanResult,
} from "./scanner";

export type ModelLifecycleStatus =
  | "retired"
  | "deprecated";

export interface ModelLifecycleRule {
  id: string;
  provider: ApiProvider;
  model: string;
  status: ModelLifecycleStatus;
  match: RegExp;
  replacement: string;
  note: string;
  sourceUrl: string;
}

export interface ModelLifecycleFinding {
  rule: ModelLifecycleRule;
  usage: ScanResult;
}

export const MODEL_LIFECYCLE_RULES:
  ModelLifecycleRule[] = [
    {
      id: "anthropic-opus-4-1-retired",
      provider: "anthropic",
      model: "claude-opus-4-1-20250805",
      status: "retired",
      match: /["']claude-opus-4-1-20250805["']/,
      replacement: "claude-opus-4-8",
      note: "Anthropic retired this model on 2026-08-05.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-sonnet-4-retired",
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      status: "retired",
      match: /["']claude-sonnet-4-20250514["']/,
      replacement: "claude-sonnet-4-6",
      note: "Anthropic retired this model on 2026-06-15.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-opus-4-retired",
      provider: "anthropic",
      model: "claude-opus-4-20250514",
      status: "retired",
      match: /["']claude-opus-4-20250514["']/,
      replacement: "claude-opus-4-8",
      note: "Anthropic retired this model on 2026-06-15.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-haiku-3-retired",
      provider: "anthropic",
      model: "claude-3-haiku-20240307",
      status: "retired",
      match: /["']claude-3-haiku-20240307["']/,
      replacement: "claude-haiku-4-5-20251001",
      note: "Anthropic retired this model on 2026-04-20.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-haiku-3-5-retired",
      provider: "anthropic",
      model: "claude-3-5-haiku-20241022",
      status: "retired",
      match: /["']claude-3-5-haiku-20241022["']/,
      replacement: "claude-haiku-4-5-20251001",
      note: "Anthropic retired this model on 2026-02-19.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-sonnet-3-7-retired",
      provider: "anthropic",
      model: "claude-3-7-sonnet-20250219",
      status: "retired",
      match: /["']claude-3-7-sonnet-20250219["']/,
      replacement: "claude-sonnet-4-6",
      note: "Anthropic retired this model on 2026-02-19.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-2-1-retired",
      provider: "anthropic",
      model: "claude-2.1",
      status: "retired",
      match: /["']claude-2\.1["']/,
      replacement: "claude-opus-4-8",
      note: "Anthropic documents claude-opus-4-8 as the replacement.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "anthropic-sonnet-3-retired",
      provider: "anthropic",
      model: "claude-3-sonnet-20240229",
      status: "retired",
      match: /["']claude-3-sonnet-20240229["']/,
      replacement: "claude-sonnet-4-6",
      note: "Anthropic documents claude-sonnet-4-6 as the replacement.",
      sourceUrl: "https://docs.anthropic.com/en/docs/about-claude/model-deprecations",
    },
    {
      id: "xai-grok-4-1-fast-reasoning-retired",
      provider: "xai",
      model: "grok-4-1-fast-reasoning",
      status: "retired",
      match: /["']grok-4-1-fast-reasoning["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-4-1-fast-non-reasoning-retired",
      provider: "xai",
      model: "grok-4-1-fast-non-reasoning",
      status: "retired",
      match: /["']grok-4-1-fast-non-reasoning["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-4-fast-reasoning-retired",
      provider: "xai",
      model: "grok-4-fast-reasoning",
      status: "retired",
      match: /["']grok-4-fast-reasoning["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-4-fast-non-reasoning-retired",
      provider: "xai",
      model: "grok-4-fast-non-reasoning",
      status: "retired",
      match: /["']grok-4-fast-non-reasoning["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-4-0709-retired",
      provider: "xai",
      model: "grok-4-0709",
      status: "retired",
      match: /["']grok-4-0709["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-code-fast-1-retired",
      provider: "xai",
      model: "grok-code-fast-1",
      status: "retired",
      match: /["']grok-code-fast-1["']/,
      replacement: "grok-build-0.1",
      note: "xAI retired this slug on 2026-05-15.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-grok-3-retired",
      provider: "xai",
      model: "grok-3",
      status: "retired",
      match: /["']grok-3["']/,
      replacement: "grok-4.3",
      note: "xAI retired this slug on 2026-05-15; review reasoning effort explicitly.",
      sourceUrl: "https://docs.x.ai/developers/migration/may-15-retirement",
    },
    {
      id: "xai-imagine-quality-deprecated",
      provider: "xai",
      model: "grok-imagine-image-quality",
      status: "deprecated",
      match: /["']grok-imagine-image-quality["']/,
      replacement: "grok-imagine-image-2.0",
      note: "xAI announced retirement for 2026-11-02; review the image quality setting.",
      sourceUrl: "https://docs.x.ai/developers/migration/imagine-image-quality-nov-2",
    },
  ];

export function findModelLifecycleWarnings(
  usages: ScanResult[],
  rules:
    ModelLifecycleRule[] =
      MODEL_LIFECYCLE_RULES
): ModelLifecycleFinding[] {
  const findings:
    ModelLifecycleFinding[] = [];

  for (const usage of usages) {
    for (const rule of rules) {
      if (
        usage.provider !==
        rule.provider
      ) {
        continue;
      }

      if (
        rule.match.test(
          usage.code
        )
      ) {
        findings.push({
          rule,
          usage,
        });
      }
    }
  }

  return findings;
}
