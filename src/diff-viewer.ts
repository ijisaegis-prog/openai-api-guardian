import fs from "node:fs";
import path from "node:path";
import { createTwoFilesPatch } from "diff";

function normalizeForDiff(code: string): string {
  const normalized = code
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return normalized.endsWith("\n")
    ? normalized
    : `${normalized}\n`;
}

export function createCodeDiff(
  filePath: string,
  updatedCode: string
): string {
  const originalCode = fs.readFileSync(filePath, "utf8");

  const fileName = path.basename(filePath);

  return createTwoFilesPatch(
    `${fileName} (original)`,
    `${fileName} (proposed)`,
    normalizeForDiff(originalCode),
    normalizeForDiff(updatedCode),
    "",
    "",
    {
      context: 3,
    }
  );
}