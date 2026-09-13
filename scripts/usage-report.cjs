const fs = require("node:fs");

const PACKAGE_NAME = "openai-api-guardian";
const REPOSITORY = "ijisaegis-prog/openai-api-guardian";

async function getJson(url, token) {
  const headers = {
    "User-Agent": "openai-api-guardian-usage-report",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}: ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function safeGet(label, url, token) {
  try {
    return await getJson(url, token);
  } catch (error) {
    console.error(`[usage-report] ${label} unavailable: ${error.message}`);
    return null;
  }
}

async function main() {
  const npmBase = "https://api.npmjs.org/downloads/point";
  const [day, week, month, repo] = await Promise.all([
    safeGet("npm last-day", `${npmBase}/last-day/${PACKAGE_NAME}`),
    safeGet("npm last-week", `${npmBase}/last-week/${PACKAGE_NAME}`),
    safeGet("npm last-month", `${npmBase}/last-month/${PACKAGE_NAME}`),
    safeGet("GitHub repository", `https://api.github.com/repos/${REPOSITORY}`),
  ]);

  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  let clones = null;
  let views = null;
  if (token) {
    [clones, views] = await Promise.all([
      safeGet("GitHub clone traffic", `https://api.github.com/repos/${REPOSITORY}/traffic/clones`, token),
      safeGet("GitHub view traffic", `https://api.github.com/repos/${REPOSITORY}/traffic/views`, token),
    ]);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    npm: {
      lastDay: day?.downloads ?? null,
      lastWeek: week?.downloads ?? null,
      lastMonth: month?.downloads ?? null,
    },
    github: {
      stars: repo?.stargazers_count ?? null,
      forks: repo?.forks_count ?? null,
      watchers: repo?.subscribers_count ?? null,
      clones14d: clones?.count ?? null,
      uniqueCloners14d: clones?.uniques ?? null,
      views14d: views?.count ?? null,
      uniqueVisitors14d: views?.uniques ?? null,
    },
  };

  const lines = [
    "# API Guardian usage report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## npm downloads",
    `- Last day: ${report.npm.lastDay ?? "unavailable"}`,
    `- Last 7 days: ${report.npm.lastWeek ?? "unavailable"}`,
    `- Last 30 days: ${report.npm.lastMonth ?? "unavailable"}`,
    "",
    "## GitHub",
    `- Stars: ${report.github.stars ?? "unavailable"}`,
    `- Forks: ${report.github.forks ?? "unavailable"}`,
    `- Watchers: ${report.github.watchers ?? "unavailable"}`,
    `- Clones (14d): ${report.github.clones14d ?? "unavailable"}`,
    `- Unique cloners (14d): ${report.github.uniqueCloners14d ?? "unavailable"}`,
    `- Views (14d): ${report.github.views14d ?? "unavailable"}`,
    `- Unique visitors (14d): ${report.github.uniqueVisitors14d ?? "unavailable"}`,
    "",
    "> This report only reads aggregate npm/GitHub statistics. API Guardian does not send user source code, file paths, API keys, or CLI usage telemetry to this script.",
  ];

  const markdown = `${lines.join("\n")}\n`;
  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
  }

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((error) => {
  console.error("Usage report failed:", error);
  process.exitCode = 1;
});
