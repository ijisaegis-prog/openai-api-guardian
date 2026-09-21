const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const fixture = path.join(root, "examples", "demo-ai-project");
const cli = path.join(root, "dist", "index.js");

const environment = { ...process.env };
delete environment.OPENAI_API_KEY;

function run(args) {
  return execFileSync(
    process.execPath,
    [cli, fixture, ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: environment,
    }
  );
}

console.log("=== API Guardian demo: human scan ===");
console.log(run(["--scan"]).trim());

console.log("\n=== API Guardian demo: JSON scan ===");
console.log(run(["--scan", "--json"]).trim());

console.log("\n=== API Guardian demo: doctor ===");
console.log(run(["--doctor"]).trim());
