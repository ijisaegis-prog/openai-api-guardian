import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/*
 * API Guardian 자신이 설치한 TypeScript compiler를 찾는다.
 *
 * 개발 환경:
 *   C:\Projects\api-guardian\node_modules\typescript\...
 *
 * npm 설치 환경:
 *   project\node_modules\api-guardian\dist\validator.js
 *   project\node_modules\typescript\...
 *
 * npm이 dependency를 중첩 설치한 경우까지 고려해서
 * 현재 파일 위치에서 상위 폴더로 올라가며 찾는다.
 */
function resolveTypeScriptCompiler(): string | null {
  let currentDirectory = __dirname;

  while (true) {
    const binCandidate = path.join(
      currentDirectory,
      "node_modules",
      "typescript",
      "bin",
      "tsc"
    );

    if (fs.existsSync(binCandidate)) {
      return binCandidate;
    }

    /*
     * TypeScript 7의 launcher를 직접 찾을 수 있도록
     * lib/tsc.js도 fallback으로 검사한다.
     */
    const libCandidate = path.join(
      currentDirectory,
      "node_modules",
      "typescript",
      "lib",
      "tsc.js"
    );

    if (fs.existsSync(libCandidate)) {
      return libCandidate;
    }

    const parentDirectory =
      path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      break;
    }

    currentDirectory = parentDirectory;
  }

  return null;
}

export function validateTypeScriptFile(
  filePath: string
): ValidationResult {
  const originalSource = fs.readFileSync(
    filePath,
    "utf8"
  );

  /*
   * 테스트 fixture의 @ts-nocheck를 제거한다.
   *
   * 이렇게 해야 AI가 만든 migration proposal을
   * 실제 TypeScript compiler로 검사할 수 있다.
   */
  const sourceForValidation =
    originalSource.replace(
      /^\s*\/\/\s*@ts-nocheck\s*\r?\n/,
      ""
    );

  const directory = path.dirname(filePath);

  const extension =
    path.extname(filePath);

  const baseName =
    path.basename(
      filePath,
      extension
    );

  const tempFilePath = path.join(
    directory,
    `${baseName}.api-guardian-validation-temp${extension}`
  );

  const tscPath =
    resolveTypeScriptCompiler();

  if (!tscPath) {
    return {
      valid: false,
      errors: [
        "API Guardian could not locate its TypeScript compiler dependency.",
      ],
    };
  }

  try {
    fs.writeFileSync(
      tempFilePath,
      sourceForValidation,
      "utf8"
    );

    const result = spawnSync(
      process.execPath,
      [
        tscPath,

        "--ignoreConfig",

        "--noEmit",

        "--target",
        "ES2022",

        "--module",
        "Node16",

        "--moduleResolution",
        "Node16",

        "--strict",

        "--esModuleInterop",

        "--skipLibCheck",

        tempFilePath,
      ],
      {
        encoding: "utf8",
        cwd: directory,
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
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}