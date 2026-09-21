const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { scanForApiUsage } = require("../dist/scanner.js");
const { findMigrationCandidates } = require("../dist/migration-rule.js");
const { validateSourceFile } = require("../dist/validator.js");
const { runProjectTests } = require("../dist/test-runner.js");

const root = path.resolve(__dirname, "..");
const jsFixture = path.join(root, "fixtures", "sample-app");
const pythonFixture = path.join(root, "fixtures", "sample-python");

const jsUsages = scanForApiUsage(jsFixture);
assert.equal(jsUsages.length, 6);
assert(jsUsages.every((usage) => usage.provider === "openai"));
assert(jsUsages.every((usage) => usage.language === "typescript"));
assert.equal(findMigrationCandidates(jsUsages).length, 2);

const pythonUsages = scanForApiUsage(pythonFixture);
assert(pythonUsages.some((usage) => usage.provider === "openai"));
assert(pythonUsages.some((usage) => usage.provider === "anthropic"));
assert(pythonUsages.some((usage) => usage.provider === "google-gemini"));
assert(pythonUsages.every((usage) => usage.language === "python"));

const pythonRuleIds = new Set(
  findMigrationCandidates(pythonUsages).map((finding) => finding.rule.id)
);
assert(pythonRuleIds.has("openai-chat-completions-to-responses"));
assert(pythonRuleIds.has("google-generativeai-to-genai-python"));

for (const fileName of [
  "openai_app.py",
  "anthropic_app.py",
  "legacy_gemini.py",
]) {
  const result = validateSourceFile(
    path.join(pythonFixture, fileName),
    pythonFixture
  );
  assert.equal(result.valid, true, result.errors.join("\n"));
}

const tempDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "api-guardian-python-validation-")
);
try {
  const invalidPython = path.join(tempDirectory, "invalid.py");
  fs.writeFileSync(invalidPython, "def broken(:\n", "utf8");
  assert.equal(
    validateSourceFile(invalidPython, tempDirectory).valid,
    false
  );
} finally {
  fs.rmSync(tempDirectory, { recursive: true, force: true });
}

const jsTests = runProjectTests(jsFixture);
assert.equal(jsTests.passed, true);
assert.equal(jsTests.skipped, false);

const pythonTests = runProjectTests(pythonFixture);
assert.equal(pythonTests.passed, true);
assert.equal(pythonTests.skipped, true);

const providerFixture = fs.mkdtempSync(
  path.join(os.tmpdir(), "api-guardian-provider-scan-")
);

try {
  fs.writeFileSync(
    path.join(providerFixture, "providers.ts"),
    [
      'import { createXai } from "@ai-sdk/xai";',
      'import { Mistral } from "@mistralai/mistralai";',
      'const xai = createXai({ apiKey: process.env.XAI_API_KEY });',
      'const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });',
      'void xai;',
      'void mistral;',
      "",
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    path.join(providerFixture, "providers.py"),
    [
      "import xai_sdk",
      "from mistralai.client import Mistral",
      "xai_client = xai_sdk.Client()",
      "mistral_client = Mistral()",
      "",
    ].join("\n"),
    "utf8"
  );

  const providerUsages = scanForApiUsage(providerFixture);
  const providers = new Set(
    providerUsages.map((usage) => usage.provider)
  );

  assert(providers.has("xai"));
  assert(providers.has("mistral"));

  const scanEnvironment = { ...process.env };
  delete scanEnvironment.OPENAI_API_KEY;

  const scanOutput = execFileSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--scan",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert(scanOutput.includes("Mode: SCAN"));
  assert(scanOutput.includes("xai"));
  assert(scanOutput.includes("mistral"));
  assert(scanOutput.includes("Scan finished."));
  assert(!scanOutput.includes("OpenAI API key required."));
} finally {
  fs.rmSync(providerFixture, { recursive: true, force: true });
}

console.log("API Guardian smoke tests passed.");