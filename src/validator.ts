import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const JAVASCRIPT_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function isWithinDirectory(
  rootDirectory: string,
  candidatePath: string
): boolean {
  const relativePath = path.relative(
    path.resolve(rootDirectory),
    path.resolve(candidatePath)
  );

  return (
    relativePath === "" ||
    (
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath)
    )
  );
}

function packageDeclaresWorkspaces(
  directory: string
): boolean {
  const packageJsonPath = path.join(
    directory,
    "package.json"
  );

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(
        packageJsonPath,
        "utf8"
      )
    ) as {
      workspaces?: unknown;
    };

    return (
      Array.isArray(packageJson.workspaces) ||
      (
        typeof packageJson.workspaces === "object" &&
        packageJson.workspaces !== null
      )
    );
  } catch {
    return false;
  }
}

function findValidationBoundary(
  targetDirectory: string
): string {
  const absoluteTarget = path.resolve(
    targetDirectory
  );

  let currentDirectory = absoluteTarget;

  while (true) {
    if (
      packageDeclaresWorkspaces(
        currentDirectory
      )
    ) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(
      currentDirectory
    );

    if (parentDirectory === currentDirectory) {
      return absoluteTarget;
    }

    currentDirectory = parentDirectory;
  }
}

function findFileUpwardWithin(
  startDirectory: string,
  boundaryDirectory: string,
  fileNames: string[]
): string | null {
  let currentDirectory = path.resolve(
    startDirectory
  );

  const absoluteBoundary = path.resolve(
    boundaryDirectory
  );

  if (
    !isWithinDirectory(
      absoluteBoundary,
      currentDirectory
    )
  ) {
    return null;
  }

  while (true) {
    for (const fileName of fileNames) {
      const candidate = path.join(
        currentDirectory,
        fileName
      );

      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    if (currentDirectory === absoluteBoundary) {
      return null;
    }

    const parentDirectory = path.dirname(
      currentDirectory
    );

    if (
      parentDirectory === currentDirectory ||
      !isWithinDirectory(
        absoluteBoundary,
        parentDirectory
      )
    ) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function resolveTypeScriptCompilerWithin(
  startDirectory: string,
  boundaryDirectory: string
): string | null {
  let currentDirectory = path.resolve(
    startDirectory
  );

  const absoluteBoundary = path.resolve(
    boundaryDirectory
  );

  if (
    !isWithinDirectory(
      absoluteBoundary,
      currentDirectory
    )
  ) {
    return null;
  }

  while (true) {
    const candidates = [
      path.join(
        currentDirectory,
        "node_modules",
        "typescript",
        "bin",
        "tsc"
      ),
      path.join(
        currentDirectory,
        "node_modules",
        "typescript",
        "lib",
        "tsc.js"
      ),
    ];

    const compiler = candidates.find(
      (candidate) =>
        fs.existsSync(candidate)
    );

    if (compiler) {
      return compiler;
    }

    if (currentDirectory === absoluteBoundary) {
      return null;
    }

    const parentDirectory = path.dirname(
      currentDirectory
    );

    if (
      parentDirectory === currentDirectory ||
      !isWithinDirectory(
        absoluteBoundary,
        parentDirectory
      )
    ) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

function resolveBundledTypeScriptCompiler():
  string | null {
  let currentDirectory = path.resolve(
    __dirname
  );

  while (true) {
    const compiler =
      resolveTypeScriptCompilerWithin(
        currentDirectory,
        currentDirectory
      );

    if (compiler) {
      return compiler;
    }

    const parentDirectory = path.dirname(
      currentDirectory
    );

    if (parentDirectory === currentDirectory) {
      return null;
    }

    currentDirectory = parentDirectory;
  }
}

export function validateTypeScriptFile(
  filePath: string,
  targetDirectory: string = path.dirname(
    filePath
  )
): ValidationResult {
  const absoluteFilePath = path.resolve(
    filePath
  );

  const absoluteTarget = path.resolve(
    targetDirectory
  );

  if (
    !isWithinDirectory(
      absoluteTarget,
      absoluteFilePath
    )
  ) {
    return {
      valid: false,
      errors: [
        `Validation file is outside the target project: ${absoluteFilePath}`,
      ],
    };
  }

  const originalSource = fs.readFileSync(
    absoluteFilePath,
    "utf8"
  );

  const sourceForValidation =
    originalSource.replace(
      /^\s*\/\/\s*@ts-nocheck\s*\r?\n/,
      ""
    );

  const directory = path.dirname(
    absoluteFilePath
  );

  const extension = path.extname(
    absoluteFilePath
  ).toLowerCase();

  const isJavaScript =
    JAVASCRIPT_EXTENSIONS.has(extension);

  const baseName = path.basename(
    absoluteFilePath,
    extension
  );

  const uniqueSuffix = `${process.pid}`;

  const tempFilePath = path.join(
    directory,
    `${baseName}.api-guardian-validation-temp-${uniqueSuffix}${extension}`
  );

  const validationBoundary =
    findValidationBoundary(
      absoluteTarget
    );

  const targetCompiler =
    resolveTypeScriptCompilerWithin(
      directory,
      validationBoundary
    );

  const tscPath =
    targetCompiler ??
    (
      isJavaScript
        ? resolveBundledTypeScriptCompiler()
        : null
    );

  if (!tscPath) {
    return {
      valid: false,
      errors: [
        "API Guardian could not locate TypeScript in the target project's dependencies. Install TypeScript in the target project before validating TypeScript migrations.",
      ],
    };
  }

  const configFileNames = isJavaScript
    ? ["tsconfig.json", "jsconfig.json"]
    : ["tsconfig.json"];

  const projectConfigPath =
    findFileUpwardWithin(
      directory,
      validationBoundary,
      configFileNames
    );

  const validationConfigPath =
    projectConfigPath
      ? path.join(
          path.dirname(projectConfigPath),
          `${baseName}.api-guardian-validation-temp-${uniqueSuffix}.tsconfig.json`
        )
      : null;

  try {
    fs.writeFileSync(
      tempFilePath,
      sourceForValidation,
      "utf8"
    );

    let compilerArguments: string[];

    if (
      projectConfigPath &&
      validationConfigPath
    ) {
      const configDirectory = path.dirname(
        projectConfigPath
      );

      const relativeSourcePath = path
        .relative(
          configDirectory,
          tempFilePath
        )
        .replace(/\\/g, "/");

      const compilerOptions: {
        noEmit: boolean;
        allowJs?: boolean;
      } = {
        noEmit: true,
      };

      if (isJavaScript) {
        compilerOptions.allowJs = true;
      }

      fs.writeFileSync(
        validationConfigPath,
        `${JSON.stringify(
          {
            extends: `./${path.basename(
              projectConfigPath
            )}`,
            compilerOptions,
            files: [relativeSourcePath],
            include: [],
          },
          null,
          2
        )}\n`,
        "utf8"
      );

      compilerArguments = [
        tscPath,
        "--project",
        validationConfigPath,
      ];
    } else if (isJavaScript) {
      compilerArguments = [
        tscPath,
        "--ignoreConfig",
        "--noEmit",
        "--allowJs",
        "--target",
        "ES2022",
        "--module",
        "Node16",
        "--moduleResolution",
        "Node16",
        "--esModuleInterop",
        tempFilePath,
      ];
    } else {
      compilerArguments = [
        tscPath,
        "--ignoreConfig",
        "--noEmit",
        tempFilePath,
      ];
    }

    const result = spawnSync(
      process.execPath,
      compilerArguments,
      {
        encoding: "utf8",
        cwd: projectConfigPath
          ? path.dirname(projectConfigPath)
          : directory,
        windowsHide: true,
      }
    );

    if (result.error) {
      return {
        valid: false,
        errors: [
          `Failed to start TypeScript validation: ${result.error.message}`,
        ],
      };
    }

    const output = [
      result.stdout,
      result.stderr,
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    if (result.status === 0) {
      return {
        valid: true,
        errors: [],
      };
    }

    return {
      valid: false,
      errors: output
        ? output.split(/\r?\n/)
        : [
            "TypeScript validation failed.",
          ],
    };
  } finally {
    if (
      validationConfigPath &&
      fs.existsSync(validationConfigPath)
    ) {
      fs.unlinkSync(validationConfigPath);
    }

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

interface PythonCommand {
  command: string;
  argsPrefix: string[];
}

function resolvePythonCommand(
  targetDirectory: string
): PythonCommand | null {
  const absoluteTarget = path.resolve(targetDirectory);

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
    const result = spawnSync(
      candidate.command,
      [...candidate.argsPrefix, "--version"],
      {
        encoding: "utf8",
        windowsHide: true,
      }
    );

    if (!result.error && result.status === 0) {
      return candidate;
    }
  }

  return null;
}

function validatePythonFile(
  filePath: string,
  targetDirectory: string
): ValidationResult {
  const absoluteFilePath = path.resolve(filePath);
  const absoluteTarget = path.resolve(targetDirectory);

  if (
    !isWithinDirectory(
      absoluteTarget,
      absoluteFilePath
    )
  ) {
    return {
      valid: false,
      errors: [
        `Validation file is outside the target project: ${absoluteFilePath}`,
      ],
    };
  }

  const python = resolvePythonCommand(
    absoluteTarget
  );

  if (!python) {
    return {
      valid: false,
      errors: [
        "API Guardian could not locate Python. Install Python or provide a project .venv/venv before validating Python migrations.",
      ],
    };
  }

  const parserScript = [
    "import ast, pathlib, sys, tokenize",
    "path = pathlib.Path(sys.argv[1])",
    "handle = tokenize.open(path)",
    "source = handle.read()",
    "handle.close()",
    "ast.parse(source, filename=str(path))",
  ].join("; ");

  const result = spawnSync(
    python.command,
    [
      ...python.argsPrefix,
      "-c",
      parserScript,
      absoluteFilePath,
    ],
    {
      encoding: "utf8",
      cwd: path.dirname(absoluteFilePath),
      windowsHide: true,
    }
  );

  if (result.error) {
    return {
      valid: false,
      errors: [
        `Failed to start Python validation: ${result.error.message}`,
      ],
    };
  }

  const output = [
    result.stdout,
    result.stderr,
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (result.status === 0) {
    return {
      valid: true,
      errors: [],
    };
  }

  return {
    valid: false,
    errors: output
      ? output.split(/\r?\n/)
      : ["Python syntax validation failed."],
  };
}

export function validateSourceFile(
  filePath: string,
  targetDirectory: string = path.dirname(filePath)
): ValidationResult {
  const extension = path
    .extname(filePath)
    .toLowerCase();

  if (extension === ".py") {
    return validatePythonFile(
      filePath,
      targetDirectory
    );
  }

  return validateTypeScriptFile(
    filePath,
    targetDirectory
  );
}
