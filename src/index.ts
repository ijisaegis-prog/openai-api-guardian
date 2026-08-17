import fs from "node:fs";
import path from "node:path";

import { scanForOpenAIUsage } from "./scanner";
import {
  findMigrationCandidates,
  type MigrationFinding,
} from "./migration-rule";
import {
  buildFixRequest,
  type FixRequest,
} from "./fixer";
import { generateFix } from "./ai-fixer";
import { createCodeDiff } from "./diff-viewer";
import { writeProposal } from "./proposal-writer";
import { validateTypeScriptFile } from "./validator";
import {
  applyProposal,
  rollbackProposal,
} from "./applier";
import { runProjectTests } from "./test-runner";

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
      "Safely detect and migrate supported OpenAI API usage.",
      "",
      "Usage:",
      "  api-guardian [target-directory] [options]",
      "",
      "Options:",
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
      shouldExit: true,
    };
  }

  const applyMode =
    args.includes("--apply");

  const previewMode =
    args.includes("--preview");

  if (
    applyMode &&
    previewMode
  ) {
    throw new Error(
      "Cannot use --apply and --preview at the same time."
    );
  }

  const allowedOptions = new Set([
    "--apply",
    "--preview",
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
      (argument) =>
        !argument.startsWith("-")
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
    targetArgument:
      positionalArguments[0],
    shouldExit: false,
  };
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
      validateTypeScriptFile(
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

  console.log(
    "API Guardian started."
  );

  const applyMode =
    cli.applyMode;

  console.log(
    applyMode
      ? "Mode: APPLY"
      : "Mode: PREVIEW"
  );

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

  console.log(
    cli.targetArgument
      ? "Target: USER PROJECT"
      : "Target: CURRENT DIRECTORY"
  );

  console.log(
    `Scanning: ${targetDirectory}`
  );

  const usages =
    scanForOpenAIUsage(
      targetDirectory
    );

  const usageFiles =
    new Set(
      usages.map(
        (usage) =>
          usage.file
      )
    );

  console.log(
    `OpenAI API usage locations: ${usages.length}`
  );

  console.log(
    `Files containing OpenAI usage: ${usageFiles.size}`
  );

  const migrationCandidates =
    findMigrationCandidates(
      usages
    );

  const migrationGroups =
    groupMigrationCandidatesByFile(
      migrationCandidates
    );

  console.log(
    `Migration candidates: ${migrationCandidates.length}`
  );

  console.log(
    `Affected files: ${migrationGroups.length}`
  );

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
      validateTypeScriptFile(
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
      validateTypeScriptFile(
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
