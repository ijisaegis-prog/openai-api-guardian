import fs from "node:fs";
import path from "node:path";

export interface ApplyResult {
  applied: boolean;
  backupPath: string;
}

function createUniquePath(
  directory: string,
  baseName: string,
  extension: string,
  label: string
): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  let candidate = path.join(
    directory,
    `${baseName}.${label}-${timestamp}${extension}`
  );

  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(
      directory,
      `${baseName}.${label}-${timestamp}-${counter}${extension}`
    );

    counter += 1;
  }

  return candidate;
}

function createBackupPath(
  originalFilePath: string
): string {
  const directory = path.dirname(originalFilePath);
  const extension = path.extname(originalFilePath);
  const baseName = path.basename(
    originalFilePath,
    extension
  );

  return createUniquePath(
    directory,
    baseName,
    extension,
    "api-guardian-backup"
  );
}

function createTempPath(
  originalFilePath: string
): string {
  const directory = path.dirname(originalFilePath);
  const extension = path.extname(originalFilePath);
  const baseName = path.basename(
    originalFilePath,
    extension
  );

  return createUniquePath(
    directory,
    baseName,
    extension,
    "api-guardian-temp"
  );
}

/**
 * Flush file contents to storage.
 *
 * Important:
 * The descriptor is opened with read/write access.
 * Opening it read-only can cause fsync to fail on Windows.
 */
function syncFile(
  filePath: string
): void {
  const fileDescriptor = fs.openSync(
    filePath,
    "r+"
  );

  try {
    fs.fsyncSync(fileDescriptor);
  } finally {
    fs.closeSync(fileDescriptor);
  }
}

/**
 * Best-effort directory flush.
 *
 * Directory fsync support differs between
 * operating systems and filesystems.
 */
function syncDirectory(
  directoryPath: string
): void {
  if (process.platform === "win32") {
    return;
  }

  let directoryDescriptor: number | undefined;

  try {
    directoryDescriptor = fs.openSync(
      directoryPath,
      "r"
    );

    fs.fsyncSync(directoryDescriptor);
  } catch {
    // Best effort only.
  } finally {
    if (directoryDescriptor !== undefined) {
      fs.closeSync(directoryDescriptor);
    }
  }
}

function safelyRemoveFile(
  filePath: string
): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch {
    // Cleanup errors must not hide
    // the original failure.
  }
}

function replaceFileFromSource(
  sourceFilePath: string,
  destinationFilePath: string
): void {
  const directory = path.dirname(
    destinationFilePath
  );

  const destinationStats = fs.statSync(
    destinationFilePath
  );

  const tempPath = createTempPath(
    destinationFilePath
  );

  try {
    /*
     * Write the proposed contents into a separate
     * temporary file first.
     */
    fs.copyFileSync(
      sourceFilePath,
      tempPath
    );

    /*
     * Flush while the temporary file is still
     * writable.
     */
    syncFile(tempPath);

    /*
     * Preserve the permissions of the original
     * destination file.
     */
    fs.chmodSync(
      tempPath,
      destinationStats.mode
    );

    /*
     * Only after the temporary file is complete
     * do we replace the destination.
     */
    fs.renameSync(
      tempPath,
      destinationFilePath
    );

    syncDirectory(directory);
  } catch (error) {
    safelyRemoveFile(tempPath);
    throw error;
  }
}

export function applyProposal(
  originalFilePath: string,
  proposalFilePath: string
): ApplyResult {
  if (!fs.existsSync(originalFilePath)) {
    throw new Error(
      `Original file does not exist: ${originalFilePath}`
    );
  }

  if (!fs.existsSync(proposalFilePath)) {
    throw new Error(
      `Proposal file does not exist: ${proposalFilePath}`
    );
  }

  const originalStats = fs.statSync(
    originalFilePath
  );

  if (!originalStats.isFile()) {
    throw new Error(
      `Original path is not a regular file: ${originalFilePath}`
    );
  }

  const proposalStats = fs.statSync(
    proposalFilePath
  );

  if (!proposalStats.isFile()) {
    throw new Error(
      `Proposal path is not a regular file: ${proposalFilePath}`
    );
  }

  const backupPath = createBackupPath(
    originalFilePath
  );

  let backupCreated = false;

  try {
    /*
     * 1. Create backup before touching original.
     */
    fs.copyFileSync(
      originalFilePath,
      backupPath
    );

    /*
     * 2. Flush backup before considering it usable.
     */
    syncFile(backupPath);

    /*
     * 3. Preserve original permissions.
     */
    fs.chmodSync(
      backupPath,
      originalStats.mode
    );

    backupCreated = true;

    /*
     * 4. Replace original through a temporary file.
     */
    replaceFileFromSource(
      proposalFilePath,
      originalFilePath
    );

    return {
      applied: true,
      backupPath,
    };
  } catch (error) {
    /*
     * If the replacement process failed after a
     * valid backup was created, immediately attempt
     * to restore the original.
     */
    if (backupCreated) {
      try {
        replaceFileFromSource(
          backupPath,
          originalFilePath
        );
      } catch (restoreError) {
        const applyMessage =
          error instanceof Error
            ? error.message
            : String(error);

        const restoreMessage =
          restoreError instanceof Error
            ? restoreError.message
            : String(restoreError);

        throw new Error(
          [
            "Failed to apply proposal and automatic restoration also failed.",
            `Apply error: ${applyMessage}`,
            `Restore error: ${restoreMessage}`,
            `Backup preserved at: ${backupPath}`,
          ].join("\n")
        );
      }
    }

    throw error;
  }
}

export function rollbackProposal(
  originalFilePath: string,
  backupPath: string
): void {
  if (!fs.existsSync(backupPath)) {
    throw new Error(
      `Backup file does not exist: ${backupPath}`
    );
  }

  if (!fs.existsSync(originalFilePath)) {
    throw new Error(
      `Original file does not exist: ${originalFilePath}`
    );
  }

  const backupStats = fs.statSync(
    backupPath
  );

  if (!backupStats.isFile()) {
    throw new Error(
      `Backup path is not a regular file: ${backupPath}`
    );
  }

  replaceFileFromSource(
    backupPath,
    originalFilePath
  );
}