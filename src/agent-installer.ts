import fs from "node:fs";
import path from "node:path";

export type AgentIntegration =
  | "codex"
  | "claude"
  | "cursor"
  | "github-actions";

interface IntegrationDefinition {
  source: string;
  destination: string;
}

const INTEGRATIONS:
  Record<
    AgentIntegration,
    IntegrationDefinition
  > = {
    codex: {
      source:
        "integrations/codex/.agents/skills/api-guardian/SKILL.md",
      destination:
        ".agents/skills/api-guardian/SKILL.md",
    },
    claude: {
      source:
        "integrations/claude/CLAUDE.md",
      destination:
        "CLAUDE.md",
    },
    cursor: {
      source:
        "integrations/cursor/.cursor/rules/api-guardian.mdc",
      destination:
        ".cursor/rules/api-guardian.mdc",
    },
    "github-actions": {
      source:
        "integrations/github-actions/api-guardian.yml",
      destination:
        ".github/workflows/api-guardian.yml",
    },
  };

export interface AgentInstallResult {
  integration: AgentIntegration;
  destinationPath: string;
}

export function isAgentIntegration(
  value: string
): value is AgentIntegration {
  return Object.prototype.hasOwnProperty.call(
    INTEGRATIONS,
    value
  );
}

export function installAgentIntegration(
  targetDirectory: string,
  integration: AgentIntegration
): AgentInstallResult {
  const definition =
    INTEGRATIONS[integration];

  const packageRoot =
    path.resolve(
      __dirname,
      ".."
    );

  const sourcePath =
    path.resolve(
      packageRoot,
      definition.source
    );

  const destinationPath =
    path.resolve(
      targetDirectory,
      definition.destination
    );

  if (
    !destinationPath.startsWith(
      path.resolve(
        targetDirectory
      ) + path.sep
    )
  ) {
    throw new Error(
      "Agent integration destination escaped the target directory."
    );
  }

  if (
    !fs.existsSync(
      sourcePath
    )
  ) {
    throw new Error(
      `Packaged agent template is missing: ${definition.source}`
    );
  }

  if (
    fs.existsSync(
      destinationPath
    )
  ) {
    throw new Error(
      `Refusing to overwrite existing agent integration: ${destinationPath}`
    );
  }

  fs.mkdirSync(
    path.dirname(
      destinationPath
    ),
    {
      recursive: true,
    }
  );

  fs.copyFileSync(
    sourcePath,
    destinationPath
  );

  return {
    integration,
    destinationPath,
  };
}
