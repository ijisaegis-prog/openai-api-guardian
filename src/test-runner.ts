import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface ProjectTestResult {
  passed: boolean;
  skipped: boolean;
  output: string;
}

interface PackageJson {
  scripts?: Record<string, string>;
}

export function runProjectTests(
  projectDirectory: string
): ProjectTestResult {
  const packageJsonPath = path.join(
    projectDirectory,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return {
      passed: true,
      skipped: true,
      output: "No package.json found. Project tests were skipped.",
    };
  }

  let packageJson: PackageJson;

  try {
    packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    ) as PackageJson;
  } catch (error) {
    return {
      passed: false,
      skipped: false,
      output:
        error instanceof Error
          ? `Failed to read package.json: ${error.message}`
          : "Failed to read package.json.",
    };
  }

  if (!packageJson.scripts?.test) {
    return {
      passed: true,
      skipped: true,
      output: "No test script found. Project tests were skipped.",
    };
  }

  const isWindows = process.platform === "win32";

  const command = isWindows
    ? process.env.ComSpec ?? "cmd.exe"
    : "npm";

  const args = isWindows
    ? ["/d", "/s", "/c", "npm test"]
    : ["test"];

  const result = spawnSync(
    command,
    args,
    {
      cwd: projectDirectory,
      encoding: "utf8",
      env: process.env,
      shell: false,
    }
  );

  const output = [
    result.stdout,
    result.stderr,
    result.error?.message,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (result.error) {
    return {
      passed: false,
      skipped: false,
      output:
        output ||
        `Failed to start test process: ${result.error.message}`,
    };
  }

  return {
    passed: result.status === 0,
    skipped: false,
    output:
      output ||
      `Test process exited with status ${result.status}.`,
  };
}