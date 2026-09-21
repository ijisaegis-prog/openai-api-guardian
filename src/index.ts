import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { scanForApiUsage } from "./scanner";
import {
  findMigrationCandidates,
  type MigrationFinding,
} from "./migration-rule";
import {
  findModelLifecycleWarnings,
} from "./deprecation-rule";
import {
  buildFixRequest,
  type FixRequest,
} from "./fixer";
import { generateFix } from "./ai-fixer";
import { createCodeDiff } from "./diff-viewer";
import { writeProposal } from "./proposal-writer";
import { validateSourceFile } from "./validator";
import {
  applyProposal,
  rollbackProposal,
} from "./applier";
import { runProjectTests } from "./test-runner";
import {
  installAgentIntegration,
  isAgentIntegration,
  type AgentIntegration,
} from "./agent-installer";

interface MigrationGroup {
  file: string;
  findings: MigrationFinding[];
}

interface PreparedMigration {
  fixRequest: FixRequest;
  proposalPath: string;
}

interface AppliedChange {
  file: string;
  backupPath: string;
}

interface CliOptions {
  applyMode: boolean;
  scanMode: boolean;
  doctorMode: boolean;
  jsonOutput: boolean;
  failOnCandidates: boolean;
  failOnDeprecations: boolean;
  agentIntegration?: AgentIntegration;
  targetArgument?: string;
  shouldExit: boolean;
}

function getPackageVersion(): string {
  const packageJsonPath = path.resolve(
    __dirname,
    "..",
    "package.json"
  );

  try {
    const content = fs.readFileSync(
      packageJsonPath,
      "utf8"
    );

    const packageJson = JSON.parse(
      content
    ) as {
      version?: unknown;
    };

    if (
      typeof packageJson.version === "string"
    ) {
      return packageJson.version;
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}

function printHelp(): void {
  console.log(
    [
      "API Guardian",
      "",
      "Safely detect and migrate supported API and SDK usage.",
      "",
      "Usage:",
      "  api-guardian [target-directory] [options]",
      "",
      "Options:",
      "  --scan          Scan supported API/SDK usage without requiring an AI API key",
      "  --doctor        Check local readiness without modifying files",
      "  --json          Emit machine-readable JSON with --scan",
      "  --fail-on-candidates",
      "                  Exit non-zero when --scan finds migration candidates",
      "  --fail-on-deprecations",
      "                  Exit non-zero when --scan finds retired/deprecated models",
      "  --init-agent <name>",
      "                  Install codex, claude, cursor, or github-actions integration",
      "  --preview       Generate and validate proposals without changing originals",
      "  --apply         Apply validated proposals",
      "  --help, -h      Show this help message",
      "  --version, -v   Show API Guardian version",
      "",
      "Default behavior:",
      "  Mode: PREVIEW",
      "  Target: current working directory",
      "",
      "Examples:",
      "  api-guardian . --scan",
      "  api-guardian . --doctor",
      "  api-guardian . --scan --json",
      "  api-guardian . --scan --fail-on-candidates",
      "  api-guardian . --scan --fail-on-deprecations",
      "  api-guardian . --init-agent codex",
      "  api-guardian .",
      "  api-guardian . --preview",
      "  api-guardian . --apply",
      "  api-guardian C:\\Projects\\my-app",
      "  api-guardian C:\\Projects\\my-app --apply",
      "",
      "Development usage:",
      "  node dist/index.js .",
      "  node dist/index.js . --apply",
    ].join("\n")
  );
}

function parseCliArguments(
  args: string[]
): CliOptions {
  const wantsHelp =
    args.includes("--help") ||
    args.includes("-h");

  if (wantsHelp) {
    printHelp();

    return {
      applyMode: false,
      scanMode: false,
      doctorMode: false,
      jsonOutput: false,
      failOnCandidates: false,
      failOnDeprecations: false,
      shouldExit: true,
    };
  }

  const wantsVersion =
    args.includes("--version") ||
    args.includes("-v");

  if (wantsVersion) {
    console.log(
      getPackageVersion()
    );

    return {
      applyMode: false,
      scanMode: false,
      doctorMode: false,
      jsonOutput: false,
      failOnCandidates: false,
      failOnDeprecations: false,
      shouldExit: true,
    };
  }

  const applyMode =
    args.includes("--apply");

  const previewMode =
    args.includes("--preview");

  const scanMode =
    args.includes("--scan");

  const doctorMode =
    args.includes("--doctor");

  const jsonOutput =
    args.includes("--json");

  const failOnCandidates =
    args.includes("--fail-on-candidates");

  const failOnDeprecations =
    args.includes("--fail-on-deprecations");

  const initAgentIndex =
    args.indexOf("--init-agent");

  let agentIntegration:
    AgentIntegration | undefined;

  if (initAgentIndex >= 0) {
    const integrationName =
      args[initAgentIndex + 1];

    if (
      !integrationName ||
      integrationName.startsWith("-") ||
      !isAgentIntegration(
        integrationName
      )
    ) {
      throw new Error(
        "--init-agent requires one of: codex, claude, cursor, github-actions."
      );
    }

    agentIntegration =
      integrationName;
  }

  const selectedModes = [
    applyMode,
    previewMode,
    scanMode,
    doctorMode,
    Boolean(agentIntegration),
  ].filter(Boolean).length;

  if (selectedModes > 1) {
    throw new Error(
      "Use only one of --scan, --doctor, --init-agent, --preview, or --apply."
    );
  }

  if (
    (
      jsonOutput ||
      failOnCandidates ||
      failOnDeprecations
    ) &&
    !scanMode
  ) {
    throw new Error(
      "--json, --fail-on-candidates, and --fail-on-deprecations may only be used with --scan."
    );
  }

  const allowedOptions = new Set([
    "--apply",
    "--preview",
    "--scan",
    "--doctor",
    "--json",
    "--fail-on-candidates",
    "--fail-on-deprecations",
    "--init-agent",
  ]);

  const unknownOptions = args.filter(
    (argument) =>
      argument.startsWith("-") &&
      !allowedOptions.has(argument)
  );

  if (unknownOptions.length > 0) {
    throw new Error(
      `Unknown option(s): ${unknownOptions.join(
        ", "
      )}`
    );
  }

  const positionalArguments =
    args.filter(
      (
        argument,
        index
      ) =>
        !argument.startsWith("-") &&
        !(
          initAgentIndex >= 0 &&
          index === initAgentIndex + 1
        )
    );

  if (
    positionalArguments.length > 1
  ) {
    throw new Error(
      [
        "Only one target directory may be provided.",
        `Received: ${positionalArguments.join(
          ", "
        )}`,
      ].join("\n")
    );
  }

  return {
    applyMode,
    scanMode,
    doctorMode,
    jsonOutput,
    failOnCandidates,
    failOnDeprecations,
    agentIntegration,
    targetArgument:
      positionalArguments[0],
    shouldExit: false,
  };
}

function isPythonAvailable(): boolean {
  const candidates: Array<{
    command: string;
    args: string[];
  }> =
    process.platform === "win32"
      ? [
          {
            command: "py",
            args: ["-3", "--version"],
          },
          {
            command: "python",
            args: ["--version"],
          },
          {
            command: "python3",
            args: ["--version"],
          },
        ]
      : [
          {
            command: "python3",
            args: ["--version"],
          },
          {
            command: "python",
            args: ["--version"],
          },
        ];

  return candidates.some(
    ({ command, args }) => {
      const result = spawnSync(
        command,
        args,
        {
          stdio: "ignore",
        }
      );

      return result.status === 0;
    }
  );
}

function groupMigrationCandidatesByFile(
  findings: MigrationFinding[]
): MigrationGroup[] {
  const groups = new Map<
    string,
    MigrationFinding[]
  >();

  for (const finding of findings) {
    const file = finding.usage.file;

    const existing =
      groups.get(file) ?? [];

    existing.push(finding);

    groups.set(
      file,
      existing
    );
  }

  return Array.from(
    groups.entries()
  ).map(
    ([file, groupedFindings]) => ({
      file,
      findings: groupedFindings,
    })
  );
}

function buildCombinedFixRequest(
  findings: MigrationFinding[]
): FixRequest {
  if (findings.length === 0) {
    throw new Error(
      "Cannot build a fix request from zero findings."
    );
  }

  const requests =
    findings.map(
      buildFixRequest
    );

  const firstRequest =
    requests[0];

  const targetLine = Math.min(
    ...requests.map(
      (request) =>
        request.line
    )
  );

  const originalCode =
    requests
      .map(
        (
          request,
          index
        ) =>
          [
            `Migration candidate ${
              index + 1
            }`,
            `Line: ${request.line}`,
            `Code: ${request.originalCode}`,
          ].join("\n")
      )
      .join("\n\n");

  const instruction = [
    `This file contains ${requests.length} migration candidate(s).`,
    "Update all listed migration candidates in one coherent edit.",
    "Preserve unrelated code.",
    "",
    ...requests.map(
      (
        request,
        index
      ) =>
        [
          `=== MIGRATION ${
            index + 1
          } ===`,
          request.instruction,
        ].join("\n")
    ),
  ].join("\n");

  return {
    file: firstRequest.file,
    line: targetLine,
    originalCode,
    instruction,
  };
}

function rollbackAllChanges(
  changes: AppliedChange[],
  targetDirectory: string
): void {
  if (changes.length === 0) {
    return;
  }

  console.log(
    "\nRolling back all changes..."
  );

  const reversedChanges =
    [...changes].reverse();

  for (
    const change
    of reversedChanges
  ) {
    console.log(
      `Restoring: ${change.file}`
    );

    rollbackProposal(
      change.file,
      change.backupPath
    );

    console.log(
      `Rollback completed: ${change.file}`
    );
  }

  console.log(
    "\nValidating restored files..."
  );

  for (
    const change
    of reversedChanges
  ) {
    const validation =
      validateSourceFile(
        change.file,
        targetDirectory
      );

    if (!validation.valid) {
      console.log(
        "Rollback validation: FAIL"
      );

      console.log(
        `File: ${change.file}`
      );

      for (
        const error
        of validation.errors
      ) {
        console.log(
          `- ${error}`
        );
      }

      throw new Error(
        `Rollback completed, but restored file failed validation: ${change.file}`
      );
    }

    console.log(
      `Rollback validation: PASS - ${change.file}`
    );
  }

  console.log(
    "All changed files were safely restored."
  );
}

async function main(): Promise<void> {
  const cli =
    parseCliArguments(
      process.argv.slice(2)
    );

  if (cli.shouldExit) {
    return;
  }

  const applyMode =
    cli.applyMode;

  const scanMode =
    cli.scanMode;

  const doctorMode =
    cli.doctorMode;

  const jsonOutput =
    cli.jsonOutput;

  const failOnCandidates =
    cli.failOnCandidates;

  const failOnDeprecations =
    cli.failOnDeprecations;

  const agentIntegration =
    cli.agentIntegration;

  if (!jsonOutput) {
    console.log(
      "API Guardian started."
    );

    console.log(
      scanMode
        ? "Mode: SCAN"
        : doctorMode
          ? "Mode: DOCTOR"
          : agentIntegration
            ? "Mode: INIT AGENT"
            : applyMode
              ? "Mode: APPLY"
              : "Mode: PREVIEW"
    );
  }

  const targetDirectory =
    cli.targetArgument
      ? path.resolve(
          cli.targetArgument
        )
      : process.cwd();

  if (
    !fs.existsSync(
      targetDirectory
    )
  ) {
    throw new Error(
      `Target directory does not exist: ${targetDirectory}`
    );
  }

  const targetStats =
    fs.lstatSync(
      targetDirectory
    );

  if (
    targetStats.isSymbolicLink()
  ) {
    throw new Error(
      `Target directory must not be a symbolic link: ${targetDirectory}`
    );
  }

  if (
    !targetStats.isDirectory()
  ) {
    throw new Error(
      `Target path is not a directory: ${targetDirectory}`
    );
  }

  if (agentIntegration) {
    const installResult =
      installAgentIntegration(
        targetDirectory,
        agentIntegration
      );

    console.log(
      `Installed ${installResult.integration} integration: ${installResult.destinationPath}`
    );

    return;
  }

  if (!jsonOutput) {
    console.log(
      cli.targetArgument
        ? "Target: USER PROJECT"
        : "Target: CURRENT DIRECTORY"
    );

    console.log(
      `Scanning: ${targetDirectory}`
    );
  }

  const usages =
    scanForApiUsage(
      targetDirectory
    );

  const usageFiles =
    new Set(
      usages.map(
        (usage) =>
          usage.file
      )
    );

  const providerCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();

  for (const usage of usages) {
    providerCounts.set(
      usage.provider,
      (providerCounts.get(usage.provider) ?? 0) + 1
    );

    languageCounts.set(
      usage.language,
      (languageCounts.get(usage.language) ?? 0) + 1
    );
  }

  const providerSummary =
    Array.from(providerCounts.entries())
      .map(([provider, count]) => `${provider} (${count})`)
      .join(", ") || "none";

  const languageSummary =
    Array.from(languageCounts.entries())
      .map(([language, count]) => `${language} (${count})`)
      .join(", ") || "none";

  if (!jsonOutput) {
    console.log(
      `Providers detected: ${providerSummary}`
    );

    console.log(
      `Languages detected: ${languageSummary}`
    );

    console.log(
      `API usage locations: ${usages.length}`
    );

    console.log(
      `Files containing supported API usage: ${usageFiles.size}`
    );
  }

  const migrationCandidates =
    findMigrationCandidates(
      usages
    );

  const migrationGroups =
    groupMigrationCandidatesByFile(
      migrationCandidates
    );

  const modelLifecycleWarnings =
    findModelLifecycleWarnings(
      usages
    );

  if (!jsonOutput) {
    console.log(
      `Migration candidates: ${migrationCandidates.length}`
    );

    console.log(
      `Affected files: ${migrationGroups.length}`
    );

    console.log(
      `Model lifecycle warnings: ${modelLifecycleWarnings.length}`
    );

    for (
      const warning
      of modelLifecycleWarnings
    ) {
      console.log(
        `- [${warning.rule.status}] ${warning.rule.provider}: ${warning.rule.model} -> ${warning.rule.replacement}`
      );
    }
  }

  if (doctorMode) {
    const hasPythonUsage =
      (languageCounts.get("python") ?? 0) > 0;

    const pythonAvailable =
      isPythonAvailable();

    const proposalKeyConfigured =
      Boolean(
        process.env.OPENAI_API_KEY?.trim()
      );

    console.log(
      [
        "",
        "Doctor checks:",
        `- API Guardian: ${getPackageVersion()}`,
        `- Node.js: ${process.version}`,
        `- Python runtime: ${
          pythonAvailable
            ? "available"
            : "not found"
        }`,
        `- Python validation readiness: ${
          hasPythonUsage && !pythonAvailable
            ? "warning - Python files detected but no Python runtime was found"
            : "ready"
        }`,
        `- AI proposal key: ${
          proposalKeyConfigured
            ? "configured"
            : "not configured (only required for preview/apply when candidates exist)"
        }`,
        `- Detected providers: ${providerSummary}`,
        `- Migration candidates: ${migrationCandidates.length}`,
        `- Model lifecycle warnings: ${modelLifecycleWarnings.length}`,
        "- Files changed: no",
      ].join("\n")
    );

    return;
  }

  if (scanMode) {
    if (jsonOutput) {
      console.log(
        JSON.stringify(
          {
            version: getPackageVersion(),
            mode: "scan",
            target:
              cli.targetArgument
                ? "user-project"
                : "current-directory",
            providers:
              Object.fromEntries(
                providerCounts.entries()
              ),
            languages:
              Object.fromEntries(
                languageCounts.entries()
              ),
            usageLocations:
              usages.length,
            filesWithUsage:
              usageFiles.size,
            migrationCandidates:
              migrationCandidates.length,
            affectedFiles:
              migrationGroups.length,
            hasMigrationCandidates:
              migrationCandidates.length > 0,
            modelLifecycleWarnings:
              modelLifecycleWarnings.map(
                (warning) => ({
                  id: warning.rule.id,
                  provider:
                    warning.rule.provider,
                  model:
                    warning.rule.model,
                  status:
                    warning.rule.status,
                  replacement:
                    warning.rule.replacement,
                  note:
                    warning.rule.note,
                  sourceUrl:
                    warning.rule.sourceUrl,
                })
              ),
            hasModelLifecycleWarnings:
              modelLifecycleWarnings.length > 0,
          },
          null,
          2
        )
      );
    } else {
      console.log(
        "\nScan finished."
      );

      console.log(
        "No files were changed."
      );
    }

    if (
      (
        failOnCandidates &&
        migrationCandidates.length > 0
      ) ||
      (
        failOnDeprecations &&
        modelLifecycleWarnings.length > 0
      )
    ) {
      process.exitCode = 1;
    }

    return;
  }

  if (
    migrationCandidates.length === 0
  ) {
    console.log(
      "Nothing to fix."
    );

    return;
  }

  const openAIApiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!openAIApiKey) {
    console.error(
      [
        "",
        "OpenAI API key required.",
        "Migration candidates were detected, but AI proposal generation requires OPENAI_API_KEY.",
        "Set it in your environment before running API Guardian again:",
        '  PowerShell: $env:OPENAI_API_KEY="your-api-key"',
        '  macOS/Linux: export OPENAI_API_KEY="your-api-key"',
        "Do not store API keys in source code or commit them to a repository.",
        "No proposals were generated. Original files were NOT changed.",
      ].join("\n")
    );

    process.exitCode = 1;

    return;
  }

  const preparedMigrations:
    PreparedMigration[] = [];

  /*
   * PHASE 1
   *
   * 모든 수정안을 먼저 생성하고 검증한다.
   * 이 단계에서는 원본 파일을 변경하지 않는다.
   */
  for (
    let index = 0;
    index <
    migrationGroups.length;
    index += 1
  ) {
    const group =
      migrationGroups[index];

    console.log(
      [
        "",
        `Preparing migration ${
          index + 1
        }/${
          migrationGroups.length
        }`,
        `File: ${group.file}`,
        `Candidate(s): ${group.findings.length}`,
      ].join("\n")
    );

    const fixRequest =
      buildCombinedFixRequest(
        group.findings
      );

    console.log(
      "Asking AI to generate a migration proposal..."
    );

    const updatedCode =
      await generateFix(
        fixRequest
      );

    const diff =
      createCodeDiff(
        fixRequest.file,
        updatedCode
      );

    console.log(
      "\n=== PROPOSED DIFF ===\n"
    );

    console.log(diff);

    console.log(
      "=== END DIFF ==="
    );

    const proposalPath =
      writeProposal(
        fixRequest.file,
        updatedCode
      );

    console.log(
      `\nProposal saved to: ${proposalPath}`
    );

    console.log(
      "Validating proposal..."
    );

    const proposalValidation =
      validateSourceFile(
        proposalPath,
        targetDirectory
      );

    if (
      !proposalValidation.valid
    ) {
      console.log(
        "Validation: FAIL"
      );

      for (
        const error
        of proposalValidation.errors
      ) {
        console.log(
          `- ${error}`
        );
      }

      console.log(
        "\nBatch migration stopped."
      );

      console.log(
        "No original files were changed."
      );

      process.exitCode = 1;

      return;
    }

    console.log(
      "Validation: PASS"
    );

    preparedMigrations.push({
      fixRequest,
      proposalPath,
    });
  }

  console.log(
    [
      "",
      "All proposals prepared successfully.",
      `Prepared files: ${preparedMigrations.length}`,
    ].join("\n")
  );

  /*
   * PREVIEW MODE
   *
   * 제안과 검증까지만 수행한다.
   * 실제 원본 파일은 변경하지 않는다.
   */
  if (!applyMode) {
    console.log(
      "\nPreview finished."
    );

    console.log(
      "Original files were NOT changed."
    );

    console.log(
      "Run with --apply to apply all validated proposals."
    );

    return;
  }

  /*
   * PHASE 2
   *
   * 모든 수정안이 사전 검증을 통과한 뒤
   * 실제 파일 적용을 시작한다.
   */
  const appliedChanges:
    AppliedChange[] = [];

  try {
    for (
      let index = 0;
      index <
      preparedMigrations.length;
      index += 1
    ) {
      const prepared =
        preparedMigrations[index];

      const file =
        prepared.fixRequest.file;

      console.log(
        [
          "",
          `Applying migration ${
            index + 1
          }/${
            preparedMigrations.length
          }`,
          `File: ${file}`,
        ].join("\n")
      );

      const applyResult =
        applyProposal(
          file,
          prepared.proposalPath
        );

      appliedChanges.push({
        file,
        backupPath:
          applyResult.backupPath,
      });

      console.log(
        "Apply: SUCCESS"
      );

      console.log(
        `Backup saved to: ${applyResult.backupPath}`
      );

      console.log(
        `Updated original: ${file}`
      );

      console.log(
        "Re-validating applied file..."
      );

      const appliedValidation =
      validateSourceFile(
        file,
        targetDirectory
      );

      if (
        !appliedValidation.valid
      ) {
        console.log(
          "Post-apply validation: FAIL"
        );

        for (
          const error
          of appliedValidation.errors
        ) {
          console.log(
            `- ${error}`
          );
        }

        rollbackAllChanges(
          appliedChanges,
          targetDirectory
        );

        console.log(
          "\nMigration aborted because an applied file failed validation."
        );

        process.exitCode = 1;

        return;
      }

      console.log(
        "Post-apply validation: PASS"
      );
    }

    /*
     * PHASE 3
     *
     * 모든 파일 적용 후
     * 프로젝트 전체 테스트를 실행한다.
     */
    console.log(
      "\nRunning project tests..."
    );

    const testResult =
      runProjectTests(
        targetDirectory
      );

    if (
      testResult.skipped
    ) {
      console.log(
        "Tests: SKIPPED"
      );

      if (
        testResult.output
      ) {
        console.log(
          testResult.output
        );
      }

      console.log(
        "\nMigration completed, but no project tests were run."
      );

      console.log(
        `Migrated files: ${appliedChanges.length}`
      );

      console.log(
        `Migration candidates: ${migrationCandidates.length}`
      );

      return;
    }

    if (
      testResult.passed
    ) {
      console.log(
        "Tests: PASS"
      );

      if (
        testResult.output
      ) {
        console.log(
          testResult.output
        );
      }

      console.log(
        [
          "",
          "Migration completed successfully.",
          `Migrated files: ${appliedChanges.length}`,
          `Migration candidates: ${migrationCandidates.length}`,
        ].join("\n")
      );

      return;
    }

    console.log(
      "Tests: FAIL"
    );

    if (
      testResult.output
    ) {
      console.log(
        testResult.output
      );
    }

    console.log(
      "\nTests failed after migration."
    );

    rollbackAllChanges(
      appliedChanges,
      targetDirectory
    );

    console.log(
      "Original files were safely restored after test failure."
    );

    process.exitCode = 1;
  } catch (error) {
    if (
      appliedChanges.length > 0
    ) {
      try {
        rollbackAllChanges(
          appliedChanges,
          targetDirectory
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "\nAutomatic rollback also failed:"
        );

        console.error(
          rollbackError
        );
      }
    }

    throw error;
  }
}

main().catch(
  (error) => {
    console.error(
      "\nAPI Guardian failed:"
    );

    console.error(error);

    process.exitCode = 1;
  }
);
