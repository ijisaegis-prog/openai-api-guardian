const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { scanForApiUsage } = require("../dist/scanner.js");
const { findMigrationCandidates } = require("../dist/migration-rule.js");
const { findModelLifecycleWarnings } = require("../dist/deprecation-rule.js");
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
assert(pythonUsages.some((usage) => usage.provider === "mistral"));
assert(pythonUsages.every((usage) => usage.language === "python"));

const pythonRuleIds = new Set(
  findMigrationCandidates(pythonUsages).map((finding) => finding.rule.id)
);
assert(pythonRuleIds.has("openai-chat-completions-to-responses"));
assert(pythonRuleIds.has("google-generativeai-to-genai-python"));

for (const fileName of [
  "openai_app.py",
  "anthropic_app.py",
  "mistral_app.py",
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
      'const retiredClaudeModel = "claude-opus-4-1-20250805";',
      'const deprecatedXaiImageModel = "grok-imagine-image-quality";',
      'void retiredClaudeModel;',
      'void deprecatedXaiImageModel;',
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
  assert(providers.has("anthropic"));

  const lifecycleWarnings =
    findModelLifecycleWarnings(
      providerUsages
    );

  const lifecycleRuleIds =
    new Set(
      lifecycleWarnings.map(
        (finding) =>
          finding.rule.id
      )
    );

  assert(
    lifecycleRuleIds.has(
      "anthropic-opus-4-1-retired"
    )
  );

  assert(
    lifecycleRuleIds.has(
      "xai-imagine-quality-deprecated"
    )
  );

  assert.equal(
    lifecycleWarnings.length,
    2
  );

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

  const jsonOutput = execFileSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--scan",
      "--json",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  const jsonReport = JSON.parse(jsonOutput);
  assert.equal(jsonReport.mode, "scan");
  assert.equal(jsonReport.target, "user-project");
  assert.equal(jsonReport.providers.xai > 0, true);
  assert.equal(jsonReport.providers.mistral > 0, true);
  assert.equal(jsonReport.providers.anthropic > 0, true);
  assert.equal(jsonReport.hasMigrationCandidates, false);
  assert.equal(jsonReport.hasModelLifecycleWarnings, true);
  assert.equal(jsonReport.modelLifecycleWarnings.length, 2);

  const cleanCiScan = spawnSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--scan",
      "--fail-on-candidates",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert.equal(cleanCiScan.status, 0);

  const lifecycleCiScan = spawnSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--scan",
      "--fail-on-deprecations",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert.equal(lifecycleCiScan.status, 1);
  assert(
    lifecycleCiScan.stdout.includes(
      "Model lifecycle warnings: 2"
    )
  );

  const candidateCiScan = spawnSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      jsFixture,
      "--scan",
      "--fail-on-candidates",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert.equal(candidateCiScan.status, 1);
  assert(candidateCiScan.stdout.includes("Migration candidates: 2"));

  const invalidJsonMode = spawnSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--json",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert.equal(invalidJsonMode.status, 1);
  assert(invalidJsonMode.stderr.includes("may only be used with --scan"));

  const doctorOutput = execFileSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      providerFixture,
      "--doctor",
    ],
    {
      encoding: "utf8",
      env: scanEnvironment,
    }
  );

  assert(doctorOutput.includes("Mode: DOCTOR"));
  assert(doctorOutput.includes("Doctor checks:"));
  assert(doctorOutput.includes("AI proposal key: not configured"));
  assert(doctorOutput.includes("Model lifecycle warnings: 2"));
  assert(doctorOutput.includes("Files changed: no"));
  assert(!doctorOutput.includes("OpenAI API key required."));
} finally {
  fs.rmSync(providerFixture, { recursive: true, force: true });
}

const agentIntegrations = [
  {
    name: "codex",
    destination: [
      ".agents",
      "skills",
      "api-guardian",
      "SKILL.md",
    ],
  },
  {
    name: "claude",
    destination: [
      "CLAUDE.md",
    ],
  },
  {
    name: "cursor",
    destination: [
      ".cursor",
      "rules",
      "api-guardian.mdc",
    ],
  },
  {
    name: "github-actions",
    destination: [
      ".github",
      "workflows",
      "api-guardian.yml",
    ],
  },
];

for (const integration of agentIntegrations) {
  const installDirectory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      `api-guardian-agent-${integration.name}-`
    )
  );

  try {
    const installOutput = execFileSync(
      process.execPath,
      [
        path.join(root, "dist", "index.js"),
        installDirectory,
        "--init-agent",
        integration.name,
      ],
      {
        encoding: "utf8",
      }
    );

    const installedPath = path.join(
      installDirectory,
      ...integration.destination
    );

    assert.equal(
      fs.existsSync(installedPath),
      true,
      `missing installed integration: ${integration.name}`
    );

    const installedContent = fs.readFileSync(
      installedPath,
      "utf8"
    );

    assert(
      installedContent.includes("API Guardian"),
      `unexpected integration content: ${integration.name}`
    );

    assert(
      installOutput.includes(
        `Installed ${integration.name} integration`
      )
    );

    const overwriteAttempt = spawnSync(
      process.execPath,
      [
        path.join(root, "dist", "index.js"),
        installDirectory,
        "--init-agent",
        integration.name,
      ],
      {
        encoding: "utf8",
      }
    );

    assert.equal(
      overwriteAttempt.status,
      1
    );

    assert(
      overwriteAttempt.stderr.includes(
        "Refusing to overwrite existing agent integration"
      )
    );
  } finally {
    fs.rmSync(
      installDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}

const invalidAgentDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "api-guardian-agent-invalid-")
);

try {
  const invalidAgent = spawnSync(
    process.execPath,
    [
      path.join(root, "dist", "index.js"),
      invalidAgentDirectory,
      "--init-agent",
      "unknown-agent",
    ],
    {
      encoding: "utf8",
    }
  );

  assert.equal(
    invalidAgent.status,
    1
  );

  assert(
    invalidAgent.stderr.includes(
      "--init-agent requires one of"
    )
  );
} finally {
  fs.rmSync(
    invalidAgentDirectory,
    {
      recursive: true,
      force: true,
    }
  );
}

console.log("API Guardian smoke tests passed.");