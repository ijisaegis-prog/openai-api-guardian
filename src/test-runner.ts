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

interface PythonCommand {
  command: string;
  argsPrefix: string[];
}

function runCommand(
  command: string,
  args: string[],
  cwd: string
): ProjectTestResult {
  const result = spawnSync(
    command,
    args,
    {
      cwd,
      encoding: "utf8",
      env: process.env,
      shell: false,
      windowsHide: true,
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

function runNpmTests(
  projectDirectory: string
): ProjectTestResult | null {
  const packageJsonPath = path.join(
    projectDirectory,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return null;
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
    return null;
  }

  if (process.platform === "win32") {
    return runCommand(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", "npm test"],
      projectDirectory
    );
  }

  return runCommand(
    "npm",
    ["test"],
    projectDirectory
  );
}

function resolvePythonCommand(
  projectDirectory: string
): PythonCommand | null {
  const absoluteTarget = path.resolve(
    projectDirectory
  );

  const localCandidates = process.platform === "win32"
    ? [
        path.join(absoluteTarget, ".venv", "Scripts", "python.exe"),
        path.join(absoluteTarget, "venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(absoluteTarget, ".venv", "bin", "python"),
        path.join(absoluteTarget, "venv", "bin", "python"),
      ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      return {
        command: candidate,
        argsPrefix: [],
      };
    }
  }

  const systemCandidates: PythonCommand[] =
    process.platform === "win32"
      ? [
          { command: "py", argsPrefix: ["-3"] },
          { command: "python", argsPrefix: [] },
          { command: "python3", argsPrefix: [] },
        ]
      : [
          { command: "python3", argsPrefix: [] },
          { command: "python", argsPrefix: [] },
        ];

  for (const candidate of systemCandidates) {
    const check = spawnSync(
      candidate.command,
      [...candidate.argsPrefix, "--version"],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (!check.error && check.status === 0) {
      return candidate;
    }
  }

  return null;
}

function fileContains(
  filePath: string,
  pattern: RegExp
): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  try {
    return pattern.test(
      fs.readFileSync(filePath, "utf8")
    );
  } catch {
    return false;
  }
}

function hasPytestSignals(
  projectDirectory: string
): boolean {
  if (
    fs.existsSync(
      path.join(projectDirectory, "tests")
    ) ||
    fs.existsSync(
      path.join(projectDirectory, "pytest.ini")
    )
  ) {
    return true;
  }

  if (
    fileContains(
      path.join(projectDirectory, "pyproject.toml"),
      /^\s*\[tool\.pytest(?:\.|\])/m
    ) ||
    fileContains(
      path.join(projectDirectory, "setup.cfg"),
      /^\s*\[tool:pytest\]\s*$/m
    ) ||
    fileContains(
      path.join(projectDirectory, "tox.ini"),
      /\bpytest\b/i
    ) ||
    fileContains(
      path.join(projectDirectory, "requirements.txt"),
      /^\s*pytest(?:\s|[<>=!~]|$)/im
    )
  ) {
    return true;
  }

  return false;
}

function runPythonTests(
  projectDirectory: string
): ProjectTestResult | null {
  if (!hasPytestSignals(projectDirectory)) {
    return null;
  }

  const python = resolvePythonCommand(
    projectDirectory
  );

  if (!python) {
    return {
      passed: true,
      skipped: true,
      output:
        "Python project detected, but no Python interpreter was found. Python tests were skipped.",
    };
  }

  const pytestCheck = spawnSync(
    python.command,
    [
      ...python.argsPrefix,
      "-c",
      "import importlib.util, sys; sys.exit(0 if importlib.util.find_spec('pytest') else 1)",
    ],
    {
      cwd: projectDirectory,
      encoding: "utf8",
      windowsHide: true,
    }
  );

  if (pytestCheck.status !== 0) {
    return {
      passed: true,
      skipped: true,
      output:
        "Python project detected, but pytest is not available. Python tests were skipped.",
    };
  }

  return runCommand(
    python.command,
    [
      ...python.argsPrefix,
      "-m",
      "pytest",
    ],
    projectDirectory
  );
}

export function runProjectTests(
  projectDirectory: string
): ProjectTestResult {
  const npmResult = runNpmTests(
    projectDirectory
  );

  if (npmResult) {
    return npmResult;
  }

  const pythonResult = runPythonTests(
    projectDirectory
  );

  if (pythonResult) {
    return pythonResult;
  }

  return {
    passed: true,
    skipped: true,
    output:
      "No supported project test command was found. Tests were skipped.",
  };
}
