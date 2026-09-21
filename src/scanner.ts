import fs from "node:fs";
import path from "node:path";

export type SourceLanguage =
  | "typescript"
  | "javascript"
  | "python";

export type ApiProvider =
  | "openai"
  | "anthropic"
  | "google-gemini"
  | "xai"
  | "mistral";

export interface ScanResult {
  file: string;
  line: number;
  code: string;
  language: SourceLanguage;
  provider: ApiProvider;
}

interface ProviderPatternSet {
  provider: ApiProvider;
  languages: SourceLanguage[];
  patterns: RegExp[];
}

const EXTENSION_LANGUAGES = new Map<string, SourceLanguage>([
  [".ts", "typescript"],
  [".tsx", "typescript"],
  [".mts", "typescript"],
  [".cts", "typescript"],
  [".js", "javascript"],
  [".jsx", "javascript"],
  [".mjs", "javascript"],
  [".cjs", "javascript"],
  [".py", "python"],
]);

const EXCLUDED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".next",
  "out",
  "__pycache__",
  ".venv",
  "venv",
]);

const PROVIDER_PATTERNS: ProviderPatternSet[] = [
  {
    provider: "openai",
    languages: ["typescript", "javascript"],
    patterns: [
      /from\s+["']openai["']/,
      /require\s*\(\s*["']openai["']\s*\)/,
      /new\s+OpenAI\s*\(/,
      /\.chat\.completions\./,
      /\.responses\./,
    ],
  },
  {
    provider: "openai",
    languages: ["python"],
    patterns: [
      /^\s*from\s+openai\s+import\b/,
      /^\s*import\s+openai\b/,
      /\bOpenAI\s*\(/,
      /\.chat\.completions\./,
      /\.responses\./,
    ],
  },
  {
    provider: "anthropic",
    languages: ["typescript", "javascript"],
    patterns: [
      /@anthropic-ai\/sdk/,
      /new\s+Anthropic\s*\(/,
      /\.messages\.create\s*\(/,
    ],
  },
  {
    provider: "anthropic",
    languages: ["python"],
    patterns: [
      /^\s*from\s+anthropic\s+import\b/,
      /^\s*import\s+anthropic\b/,
      /\bAnthropic\s*\(/,
      /\.messages\.create\s*\(/,
    ],
  },
  {
    provider: "google-gemini",
    languages: ["typescript", "javascript"],
    patterns: [
      /@google\/genai/,
      /@google\/generative-ai/,
      /\bGoogleGenAI\s*\(/,
      /\bGoogleGenerativeAI\s*\(/,
    ],
  },
  {
    provider: "google-gemini",
    languages: ["python"],
    patterns: [
      /^\s*from\s+google\s+import\s+genai\b/,
      /^\s*import\s+google\.genai\b/,
      /^\s*import\s+google\.generativeai\b/,
      /\bgenai\.Client\s*\(/,
      /\bgenai\.GenerativeModel\s*\(/,
    ],
  },
  {
    provider: "xai",
    languages: ["typescript", "javascript"],
    patterns: [
      /@ai-sdk\/xai/,
      /\bcreateXai\s*\(/,
      /\bxai\.(?:responses|chat|image)\s*\(/,
      /https?:\/\/(?:us\.)?api\.x\.ai\/v1/,
      /\bXAI_API_KEY\b/,
    ],
  },
  {
    provider: "xai",
    languages: ["python"],
    patterns: [
      /^\s*import\s+xai_sdk\b/,
      /^\s*from\s+xai_sdk\s+import\b/,
      /\bxai_sdk\.Client\s*\(/,
      /https?:\/\/(?:us\.)?api\.x\.ai\/v1/,
      /\bXAI_API_KEY\b/,
    ],
  },
  {
    provider: "mistral",
    languages: ["typescript", "javascript"],
    patterns: [
      /@mistralai\/mistralai/,
      /\bnew\s+Mistral\s*\(/,
      /\.chat\.(?:complete|stream)\s*\(/,
      /\bMISTRAL_API_KEY\b/,
    ],
  },
  {
    provider: "mistral",
    languages: ["python"],
    patterns: [
      /^\s*from\s+mistralai(?:\.client)?\s+import\s+Mistral\b/,
      /^\s*import\s+mistralai\b/,
      /\bMistral\s*\(/,
      /\.chat\.(?:complete|stream)\s*\(/,
      /\bMISTRAL_API_KEY\b/,
    ],
  },
];

function isApiGuardianGeneratedFile(fileName: string): boolean {
  return (
    fileName.includes(".api-guardian-proposed.") ||
    fileName.includes(".api-guardian-backup-") ||
    fileName.includes(".api-guardian-temp-") ||
    fileName.includes(".api-guardian-validation-temp")
  );
}

function getSourceLanguage(fileName: string): SourceLanguage | null {
  if (fileName.endsWith(".d.ts")) {
    return null;
  }

  const extension = path.extname(fileName).toLowerCase();
  return EXTENSION_LANGUAGES.get(extension) ?? null;
}

function ensureValidRootDirectory(rootDir: string): string {
  const absoluteRoot = path.resolve(rootDir);

  if (!fs.existsSync(absoluteRoot)) {
    throw new Error(`Scan target does not exist: ${absoluteRoot}`);
  }

  const stats = fs.lstatSync(absoluteRoot);

  if (!stats.isDirectory()) {
    throw new Error(`Scan target is not a directory: ${absoluteRoot}`);
  }

  if (stats.isSymbolicLink()) {
    throw new Error(`Scan target must not be a symbolic link: ${absoluteRoot}`);
  }

  return absoluteRoot;
}

function readSourceFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error([`Failed to read source file: ${filePath}`, message].join("\n"));
  }
}

function detectProviders(
  line: string,
  language: SourceLanguage
): ApiProvider[] {
  const providers = new Set<ApiProvider>();

  for (const patternSet of PROVIDER_PATTERNS) {
    if (!patternSet.languages.includes(language)) {
      continue;
    }

    if (patternSet.patterns.some((pattern) => pattern.test(line))) {
      providers.add(patternSet.provider);
    }
  }

  return Array.from(providers);
}

export function scanForApiUsage(rootDir: string): ScanResult[] {
  const results: ScanResult[] = [];
  const absoluteRoot = ensureValidRootDirectory(rootDir);

  function scanDirectory(directory: string): void {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error([`Failed to scan directory: ${directory}`, message].join("\n"));
    }

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        scanDirectory(fullPath);
        continue;
      }

      if (!entry.isFile() || isApiGuardianGeneratedFile(entry.name)) {
        continue;
      }

      const language = getSourceLanguage(entry.name);

      if (!language) {
        continue;
      }

      const lines = readSourceFile(fullPath).split(/\r?\n/);

      lines.forEach((line, index) => {
        const providers = detectProviders(line, language);

        for (const provider of providers) {
          results.push({
            file: fullPath,
            line: index + 1,
            code: line.trim(),
            language,
            provider,
          });
        }
      });
    }
  }

  scanDirectory(absoluteRoot);
  return results;
}

export function scanForOpenAIUsage(rootDir: string): ScanResult[] {
  return scanForApiUsage(rootDir).filter(
    (result) => result.provider === "openai"
  );
}
