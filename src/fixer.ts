import type { MigrationFinding } from "./migration-rule";

export interface FixRequest {
  file: string;
  line: number;
  originalCode: string;
  instruction: string;
}

export function buildFixRequest(
  finding: MigrationFinding
): FixRequest {
  return {
    file: finding.usage.file,
    line: finding.usage.line,
    originalCode: finding.usage.code,
    instruction: [
      `Provider: ${finding.rule.provider}`,
      `Rule: ${finding.rule.id}`,
      `Reason: ${finding.rule.description}`,
      `Recommendation: ${finding.rule.recommendation}`,
      "",
      "Update the affected code safely.",
      "Preserve existing behavior unless the migration requires a change.",
      "Do not modify unrelated code."
    ].join("\n"),
  };
}