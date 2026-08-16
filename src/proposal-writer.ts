import fs from "node:fs";
import path from "node:path";

export function writeProposal(
  originalFilePath: string,
  updatedCode: string
): string {
  const directory = path.dirname(originalFilePath);
  const extension = path.extname(originalFilePath);
  const baseName = path.basename(originalFilePath, extension);

  const proposalPath = path.join(
    directory,
    `${baseName}.api-guardian-proposed${extension}`
  );

  fs.writeFileSync(
    proposalPath,
    updatedCode.endsWith("\n") ? updatedCode : `${updatedCode}\n`,
    "utf8"
  );

  return proposalPath;
}