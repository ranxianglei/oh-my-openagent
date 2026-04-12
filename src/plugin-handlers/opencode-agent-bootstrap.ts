import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import yaml from "js-yaml"

import type { OhMyOpenCodeConfig } from "../config"
import { detectPluginConfigFile, getOpenCodeConfigDir, parseJsonc } from "../shared"
import { getAgentConfigKey } from "../shared/agent-display-names"
import { applyAgentConfig } from "./agent-config-handler"
import { applyToolConfig } from "./tool-config-handler"

const MANIFEST_FILE_NAME = ".oh-my-openagent-agent-bootstrap.json"
const AGENT_DIRECTORY_NAME = "agent"
const EXCLUDED_AGENT_KEYS = new Set(["build", "plan"])

type PluginComponents = {
  commands: Record<string, unknown>
  skills: Record<string, unknown>
  agents: Record<string, unknown>
  mcpServers: Record<string, unknown>
  hooksConfigs: Array<{ hooks?: Record<string, unknown> }>
  plugins: Array<{ name: string; version: string }>
  errors: Array<{ pluginKey: string; installPath: string; error: string }>
}

type AgentFileEntry = {
  fileName: string
  content: string
}

type AgentManifest = {
  files: string[]
}

function createEmptyPluginComponents(): PluginComponents {
  return {
    commands: {},
    skills: {},
    agents: {},
    mcpServers: {},
    hooksConfigs: [],
    plugins: [],
    errors: [],
  }
}

function normalizeFrontmatterValue(value: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...value }

  if ("prompt" in normalized) {
    delete normalized.prompt
  }

  if ("topP" in normalized && normalized.topP !== undefined) {
    normalized["top_p"] = normalized.topP
    delete normalized.topP
  }

  return normalized
}

export function buildBootstrapAgentFiles(agentResult: Record<string, unknown>): AgentFileEntry[] {
  const files: AgentFileEntry[] = []

  for (const [runtimeKey, agentConfig] of Object.entries(agentResult)) {
    if (!agentConfig || typeof agentConfig !== "object") {
      continue
    }

    const configKey = getAgentConfigKey(runtimeKey)
    if (!configKey || EXCLUDED_AGENT_KEYS.has(configKey)) {
      continue
    }

    const normalized = normalizeFrontmatterValue(agentConfig as Record<string, unknown>)
    const prompt = typeof (agentConfig as Record<string, unknown>).prompt === "string"
      ? ((agentConfig as Record<string, unknown>).prompt as string)
      : ""

    const frontmatter = yaml.dump(normalized, {
      lineWidth: 1000,
      noRefs: true,
      sortKeys: true,
    }).trim()

    files.push({
      fileName: `${configKey}.md`,
      content: `---\n${frontmatter}\n---\n${prompt}\n`,
    })
  }

  return files
}

function readManifest(manifestPath: string): AgentManifest {
  if (!existsSync(manifestPath)) {
    return { files: [] }
  }

  try {
    const content = readFileSync(manifestPath, "utf-8")
    const parsed = parseJsonc<AgentManifest>(content)
    if (Array.isArray(parsed?.files)) {
      return { files: parsed.files.filter((file) => typeof file === "string") }
    }
  } catch {
    // Ignore malformed manifests and rebuild from scratch.
  }

  return { files: [] }
}

function writeManifest(manifestPath: string, files: string[]): void {
  writeFileSync(manifestPath, `${JSON.stringify({ files }, null, 2)}\n`, "utf-8")
}

export function resolveBootstrapTargetDir(directory: string): string {
  const projectPluginConfig = detectPluginConfigFile(join(directory, ".opencode"))
  if (projectPluginConfig.format !== "none") {
    return join(directory, ".opencode")
  }

  return getOpenCodeConfigDir({ binary: "opencode" })
}

export async function syncBootstrapAgents(params: {
  directory: string
  pluginConfig: OhMyOpenCodeConfig
  targetDir?: string
}): Promise<{ agentCount: number; targetDir: string }> {
  const targetDir = params.targetDir ?? resolveBootstrapTargetDir(params.directory)
  const config: Record<string, unknown> = { agent: {} }

  const agentResult = await applyAgentConfig({
    config,
    pluginConfig: params.pluginConfig,
    ctx: { directory: params.directory },
    pluginComponents: createEmptyPluginComponents(),
  })

  applyToolConfig({
    config,
    pluginConfig: params.pluginConfig,
    agentResult,
  })

  const files = buildBootstrapAgentFiles(agentResult)
  const agentDir = join(targetDir, AGENT_DIRECTORY_NAME)
  const manifestPath = join(targetDir, MANIFEST_FILE_NAME)
  const previousManifest = readManifest(manifestPath)

  mkdirSync(agentDir, { recursive: true })

  const nextFileNames = new Set(files.map((file) => file.fileName))
  for (const previousFile of previousManifest.files) {
    if (nextFileNames.has(previousFile)) {
      continue
    }

    rmSync(join(agentDir, previousFile), { force: true })
  }

  for (const file of files) {
    writeFileSync(join(agentDir, file.fileName), file.content, "utf-8")
  }

  writeManifest(manifestPath, files.map((file) => file.fileName))

  return {
    agentCount: files.length,
    targetDir,
  }
}
