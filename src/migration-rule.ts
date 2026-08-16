import type { ScanResult } from "./scanner";

export interface MigrationRule {
  id: string;
  provider: string;
  description: string;
  match: RegExp;
  recommendation: string;
}

export interface MigrationFinding {
  rule: MigrationRule;
  usage: ScanResult;
}

export const DEMO_MIGRATION_RULES: MigrationRule[] = [
  {
    id: "demo-chat-completions",
    provider: "openai",
    description: "Demo migration rule for Chat Completions usage",
    match: /client\.chat\.completions\.create/,
    recommendation:
      "Review this usage for migration to the newer API pattern.",
  },
];

export function findMigrationCandidates(
  usages: ScanResult[],
  rules: MigrationRule[] = DEMO_MIGRATION_RULES
): MigrationFinding[] {
  const findings: MigrationFinding[] = [];

  for (const usage of usages) {
    for (const rule of rules) {
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