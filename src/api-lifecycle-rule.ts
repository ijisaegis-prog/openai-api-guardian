import type {
  ApiProvider,
  ScanResult,
} from "./scanner";

export type ApiLifecycleStatus =
  | "retired"
  | "deprecated";

export interface ApiLifecycleRule {
  id: string;
  provider: ApiProvider;
  api: string;
  status: ApiLifecycleStatus;
  match: RegExp;
  replacement: string;
  note: string;
  sourceUrl: string;
}

export interface ApiLifecycleFinding {
  rule: ApiLifecycleRule;
  usage: ScanResult;
}

export const API_LIFECYCLE_RULES:
  ApiLifecycleRule[] = [
    {
      id: "openai-assistants-api-retired",
      provider: "openai",
      api: "Assistants API",
      status: "retired",
      match:
        /\.beta\.(?:assistants|threads)\.|\/v1\/(?:assistants|threads)\b|assistants=v2/i,
      replacement:
        "Responses API + Conversations API",
      note:
        "OpenAI retired the Assistants API on 2026-08-26. Migrate the integration using the official Responses API migration guide; do not assume a one-to-one rewrite.",
      sourceUrl:
        "https://developers.openai.com/api/docs/guides/migrate-to-responses",
    },
  ];

export function findApiLifecycleWarnings(
  usages: ScanResult[],
  rules:
    ApiLifecycleRule[] =
      API_LIFECYCLE_RULES
): ApiLifecycleFinding[] {
  const findings:
    ApiLifecycleFinding[] = [];

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
