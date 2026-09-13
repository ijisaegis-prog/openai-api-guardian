import type {
  ApiProvider,
  ScanResult,
  SourceLanguage,
} from "./scanner";

export interface MigrationRule {
  id: string;
  provider: ApiProvider;
  description: string;
  match: RegExp;
  recommendation: string;
  languages?: SourceLanguage[];
}

export interface MigrationFinding {
  rule: MigrationRule;
  usage: ScanResult;
}

export const MIGRATION_RULES: MigrationRule[] = [
  {
    id: "openai-chat-completions-to-responses",
    provider: "openai",
    description:
      "OpenAI Chat Completions call that can be reviewed for migration to the Responses API",
    match: /\.chat\.completions\.create\s*\(/,
    recommendation:
      "Migrate this call to the OpenAI Responses API using equivalent input and output handling for this language. Preserve request semantics and unrelated behavior.",
    languages: ["typescript", "javascript", "python"],
  },
  {
    id: "google-generative-ai-to-genai-js",
    provider: "google-gemini",
    description:
      "Legacy Google Generative AI JavaScript/TypeScript SDK usage",
    match: /@google\/generative-ai|GoogleGenerativeAI\s*\(/,
    recommendation:
      "Migrate legacy @google/generative-ai usage to the current @google/genai SDK and its client-based API. Preserve application behavior and configuration.",
    languages: ["typescript", "javascript"],
  },
  {
    id: "google-generativeai-to-genai-python",
    provider: "google-gemini",
    description:
      "Legacy Google Generative AI Python SDK usage",
    match: /google\.generativeai|genai\.GenerativeModel\s*\(/,
    recommendation:
      "Migrate legacy google-generativeai usage to the current google-genai SDK using `from google import genai` and a `genai.Client` where appropriate. Preserve application behavior and configuration.",
    languages: ["python"],
  },
];

export const DEMO_MIGRATION_RULES = MIGRATION_RULES;

export function findMigrationCandidates(
  usages: ScanResult[],
  rules: MigrationRule[] = MIGRATION_RULES
): MigrationFinding[] {
  const findings: MigrationFinding[] = [];

  for (const usage of usages) {
    for (const rule of rules) {
      if (rule.provider !== usage.provider) {
        continue;
      }

      if (
        rule.languages &&
        !rule.languages.includes(usage.language)
      ) {
        continue;
      }

      if (rule.match.test(usage.code)) {
        findings.push({
          rule,
          usage,
        });
      }
    }
  }

  return findings;
}
