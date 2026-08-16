import fs from "node:fs";
import path from "node:path";

export interface ScanResult {
  file: string;
  line: number;
  code: string;
}

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".next",
  "out",
]);

const OPENAI_PATTERNS = [
  /from\s+["']openai["']/,
  /require\s*\(\s*["']openai["']\s*\)/,
  /new\s+OpenAI\s*\(/,
  /client\.chat\.completions/,
  /client\.responses\./,
];

function isApiGuardianGeneratedFile(
  fileName: string
): boolean {
  return (
    fileName.includes(".api-guardian-proposed.") ||
    fileName.includes(".api-guardian-backup-") ||
    fileName.includes(".api-guardian-temp-") ||
    fileName.includes(".api-guardian-validation-temp")
  );
}

function isSupportedSourceFile(
  fileName: string
): boolean {
  if (fileName.endsWith(".d.ts")) {
    return false;
  }

  const extension = path
    .extname(fileName)
    .toLowerCase();

  return SUPPORTED_EXTENSIONS.has(extension);
}

function ensureValidRootDirectory(
  rootDir: string
): string {
  const absoluteRoot = path.resolve(rootDir);

  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(
      `Scan target does not exist: ${absoluteRoot}`
    );
  }

  const stats = fs.lstatSync(absoluteRoot);

  if (!stats.isDirectory()) {
    throw new Error(
      `Scan target is not a directory: ${absoluteRoot}`
    );
  }

  if (stats.isSymbolicLink()) {
    throw new Error(
      `Scan target must not be a symbolic link: ${absoluteRoot}`
    );
  }

  return absoluteRoot;
}

function readSourceFile(
  filePath: string
): string {
  try {
    return fs.readFileSync(
      filePath,
      "utf8"
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    throw new Error(
      [
        `Failed to read source file: ${filePath}`,
        message,
      ].join("\n")
    );
  }
}

export function scanForOpenAIUsage(
  rootDir: string
): ScanResult[] {
  const results: ScanResult[] = [];

  const absoluteRoot =
    ensureValidRootDirectory(rootDir);

  function scanDirectory(
    directory: string
  ): void {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(directory, {
        withFileTypes: true,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      throw new Error(
        [
          `Failed to scan directory: ${directory}`,
          message,
        ].join("\n")
      );
    }

    for (const entry of entries) {
      const fullPath = path.join(
        directory,
        entry.name
      );

      /*
       * Do not follow symbolic links.
       *
       * This prevents API Guardian from accidentally
       * scanning files outside the requested project.
       */
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (
          EXCLUDED_DIRECTORIES.has(
            entry.name
          )
        ) {
          continue;
        }

        scanDirectory(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      /*
       * Never scan files generated internally by
       * API Guardian.
       */
      if (
        isApiGuardianGeneratedFile(
          entry.name
        )
      ) {
        continue;
      }

      /*
       * Ignore declaration files and unsupported
       * source formats.
       */
      if (
        !isSupportedSourceFile(
          entry.name
        )
      ) {
        continue;
      }

      const content =
        readSourceFile(fullPath);

      const lines = content.split(
        /\r?\n/
      );

      lines.forEach(
        (line, index) => {
          const matchesOpenAI =
            OPENAI_PATTERNS.some(
              (pattern) =>
                pattern.test(line)
            );

          if (!matchesOpenAI) {
            return;
          }

          results.push({
            file: fullPath,
            line: index + 1,
            code: line.trim(),
          });
        }
      );
    }
  }

  scanDirectory(absoluteRoot);

  return results;
}