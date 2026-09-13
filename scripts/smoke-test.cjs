const assert = require("node:assert/strict");
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

console.log("API Guardian smoke tests passed.");