import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { applyEdits, modify } from "jsonc-parser"

import { parseJsoncSafe } from "./jsonc-parser"
import { getOpenCodeConfigPaths } from "./opencode-config-dir"
import { writeFileAtomically } from "./write-file-atomically"

type ConfigFormat = "json" | "jsonc" | "none"
type ConfigScope = "project" | "user"

type OpenCodePluginEntry = string | [string, ...unknown[]]

interface OpenCodeConfig {
  plugin?: OpenCodePluginEntry[]
  [key: string]: unknown
}

interface ScopeConfig {
  scope: ConfigScope
  format: ConfigFormat
  path: string
  content: string | null
  data: OpenCodeConfig
  pluginEntries: OpenCodePluginEntry[]
}

interface ClassifiedEntry {
  kind: "bundled" | "recognized-external" | "unsafe-external" | "other"
  entry: OpenCodePluginEntry
  index: number
  reason?: string
}

export interface BundledNotifyOwnershipResult {
  skipped: boolean
  changedUserConfig: boolean
  changedProjectConfig: boolean
  canonicalEntry: string
}

export interface EnsureBundledNotifyOwnershipArgs {
  projectDirectory: string
  packageRoot?: string
  env?: NodeJS.ProcessEnv
}

const BUNDLED_NOTIFY_DISABLE_ENV = "OMO_DISABLE_BUNDLED_NOTIFY_BOOTSTRAP"
const KNOWN_EXTERNAL_NOTIFY_IDS = ["kdco/notify", "npm:kdco/notify"] as const

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPathLikePluginEntry(entry: string): boolean {
  if (entry.startsWith("file://")) return true
  if (entry.startsWith("./") || entry.startsWith("../") || entry.startsWith("/") || entry.startsWith("~/")) return true
  if (/^[A-Za-z]:[\\/]/.test(entry)) return true
  return false
}

function isRecognizedExternalNotifyId(entry: string): boolean {
  const normalized = entry.trim().toLowerCase()

  return KNOWN_EXTERNAL_NOTIFY_IDS.some((base) => {
    if (normalized === base) return true
    if (!normalized.startsWith(`${base}@`)) return false

    const versionSuffix = normalized.slice(base.length + 1)
    if (versionSuffix.length === 0) return false
    if (versionSuffix.includes("@")) return false
    if (versionSuffix.includes("://")) return false
    if (versionSuffix.includes(":")) return false
    if (versionSuffix.includes("/")) return false
    if (versionSuffix.includes("\\")) return false

    return /^[a-z0-9.*+!~^<>=| -]+$/i.test(versionSuffix)
  })
}

function isRecognizedNotifyIdWithUnsupportedSuffix(entry: string): boolean {
  const normalized = entry.trim().toLowerCase()

  return KNOWN_EXTERNAL_NOTIFY_IDS.some((base) => {
    if (!normalized.startsWith(`${base}@`)) return false
    return !isRecognizedExternalNotifyId(normalized)
  })
}

function stripNpmPrefix(entry: string): string {
  return entry.startsWith("npm:") ? entry.slice("npm:".length) : entry
}

function stripVersionSuffix(entry: string): string {
  const trimmed = entry.trim()
  const versionSeparatorIndex = trimmed.lastIndexOf("@")
  if (versionSeparatorIndex <= 0) return trimmed

  const slashIndex = trimmed.indexOf("/")
  if (trimmed.startsWith("@") && versionSeparatorIndex <= slashIndex) {
    return trimmed
  }

  return trimmed.slice(0, versionSeparatorIndex)
}

function extractPackageIdentifierFromSpec(entry: string): string | null {
  const normalized = stripNpmPrefix(entry.trim().toLowerCase())
  if (normalized.length === 0) return null
  if (normalized.includes("://")) return null

  const aliasSeparatorIndex = normalized.indexOf("@npm:")
  const packageSpec = aliasSeparatorIndex >= 0
    ? normalized.slice(aliasSeparatorIndex + "@npm:".length)
    : normalized

  if (packageSpec.length === 0) return null
  return stripVersionSuffix(packageSpec)
}

function isAliasedRecognizedNotifyTarget(entry: string): boolean {
  const normalized = stripNpmPrefix(entry.trim().toLowerCase())
  const aliasSeparatorIndex = normalized.indexOf("@npm:")
  if (aliasSeparatorIndex <= 0) return false

  const aliasedTargetSpec = normalized.slice(aliasSeparatorIndex + "@npm:".length)
  if (aliasedTargetSpec.length === 0) return false

  const aliasedPackageIdentifier = stripVersionSuffix(stripNpmPrefix(aliasedTargetSpec))
  return aliasedPackageIdentifier === "kdco/notify"
}

function isCustomPackageNotifyCandidate(entry: string): boolean {
  const packageIdentifier = extractPackageIdentifierFromSpec(entry)
  if (!packageIdentifier) return false
  if (packageIdentifier === "opencode-notify") return true
  if (/^@[a-z0-9._-]+\/opencode-notify$/i.test(packageIdentifier)) return true
  if (/^[a-z0-9._-]+\/opencode-notify$/i.test(packageIdentifier)) return true
  return false
}

function normalizePathForComparison(pathValue: string): string {
  return resolve(pathValue).replace(/\\/g, "/").replace(/\/+$/, "")
}

function tryParseFileUrlPath(entry: string): string | null {
  if (!entry.startsWith("file://")) return null

  try {
    return fileURLToPath(entry)
  } catch {
    return null
  }
}

function hasBundledNotifyArtifactPathShape(pathValue: string): boolean {
  const normalizedPath = normalizePathForComparison(pathValue)
  return normalizedPath.endsWith("/dist/opencode-notify")
}

function isBundledNotifyArtifactEntry(entry: string, canonicalEntry: string): boolean {
  if (entry === canonicalEntry) return true

  const filePath = tryParseFileUrlPath(entry)
  if (!filePath) return false

  return hasBundledNotifyArtifactPathShape(filePath)
}

function isPathBasedNotifyEntry(entry: string): boolean {
  if (!isPathLikePluginEntry(entry)) return false

  const filePath = tryParseFileUrlPath(entry)
  const pathCandidate = filePath ?? entry
  const normalizedPath = normalizePathForComparison(pathCandidate).toLowerCase()
  return normalizedPath.includes("/opencode-notify")
}

function areTupleOptionsEmptyOrDefault(options: unknown[]): boolean {
  if (options.length === 0) return true
  if (options.every((option) => option === null || option === undefined)) return true

  if (options.length !== 1) return false
  const firstOption = options[0]
  if (Array.isArray(firstOption)) return firstOption.length === 0
  if (!isPlainObject(firstOption)) return false
  return Object.keys(firstOption).length === 0
}

function classifyPluginEntry(entry: OpenCodePluginEntry, index: number, canonicalEntry: string): ClassifiedEntry {
  if (typeof entry === "string") {
    if (isBundledNotifyArtifactEntry(entry, canonicalEntry)) {
      return { kind: "bundled", entry, index }
    }

    if (isRecognizedExternalNotifyId(entry)) {
      return { kind: "recognized-external", entry, index }
    }

    if (isPathBasedNotifyEntry(entry)) {
      return {
        kind: "unsafe-external",
        entry,
        index,
        reason: "path-based notify plugin entries are not auto-migrated",
      }
    }

    if (isRecognizedNotifyIdWithUnsupportedSuffix(entry)) {
      return {
        kind: "unsafe-external",
        entry,
        index,
        reason: "recognized notify package uses unsupported source/custom suffix",
      }
    }

    if (isAliasedRecognizedNotifyTarget(entry)) {
      return {
        kind: "unsafe-external",
        entry,
        index,
        reason: "aliased kdco/notify entries are treated as custom notify owners",
      }
    }

    if (isCustomPackageNotifyCandidate(entry)) {
      return {
        kind: "unsafe-external",
        entry,
        index,
        reason: "notify package entry is not an exact recognized kdco/notify identifier",
      }
    }

    return { kind: "other", entry, index }
  }

  const [tupleKey, ...tupleOptions] = entry
  if (isBundledNotifyArtifactEntry(tupleKey, canonicalEntry)) {
    if (areTupleOptionsEmptyOrDefault(tupleOptions)) {
      return { kind: "bundled", entry, index }
    }

    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "bundled notify entry must not include custom tuple options",
    }
  }

  if (isRecognizedExternalNotifyId(tupleKey)) {
    if (areTupleOptionsEmptyOrDefault(tupleOptions)) {
      return { kind: "recognized-external", entry, index }
    }

    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "recognized kdco/notify tuple has non-empty custom options",
    }
  }

  if (isPathBasedNotifyEntry(tupleKey)) {
    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "path-based notify plugin entries are not auto-migrated",
    }
  }

  if (isRecognizedNotifyIdWithUnsupportedSuffix(tupleKey)) {
    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "recognized notify package uses unsupported source/custom suffix",
    }
  }

  if (isAliasedRecognizedNotifyTarget(tupleKey)) {
    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "aliased kdco/notify entries are treated as custom notify owners",
    }
  }

  if (isCustomPackageNotifyCandidate(tupleKey)) {
    return {
      kind: "unsafe-external",
      entry,
      index,
      reason: "notify package tuple entry is not an exact recognized kdco/notify identifier",
    }
  }

  return { kind: "other", entry, index }
}

function getProjectOpenCodeConfigPath(projectDirectory: string): { format: ConfigFormat; path: string } {
  const baseDir = join(projectDirectory, ".opencode")
  const jsoncPath = join(baseDir, "opencode.jsonc")
  const jsonPath = join(baseDir, "opencode.json")

  if (existsSync(jsoncPath)) return { format: "jsonc", path: jsoncPath }
  if (existsSync(jsonPath)) return { format: "json", path: jsonPath }
  return { format: "none", path: jsonPath }
}

function getUserOpenCodeConfigPath(): { format: ConfigFormat; path: string } {
  const { configJsonc, configJson } = getOpenCodeConfigPaths({ binary: "opencode", version: null })
  if (existsSync(configJsonc)) return { format: "jsonc", path: configJsonc }
  if (existsSync(configJson)) return { format: "json", path: configJson }
  return { format: "none", path: configJson }
}

function loadScopeConfig(scope: ConfigScope, format: ConfigFormat, filePath: string): ScopeConfig {
  if (format === "none") {
    return {
      scope,
      format,
      path: filePath,
      content: null,
      data: {},
      pluginEntries: [],
    }
  }

  const content = readFileSync(filePath, "utf-8")
  const parseResult = parseJsoncSafe<OpenCodeConfig>(content)
  if (!parseResult.data || !isPlainObject(parseResult.data)) {
    throw new Error(`Cannot parse ${scope} OpenCode config: ${filePath}`)
  }

  const pluginEntriesRaw = parseResult.data.plugin
  const pluginEntries = Array.isArray(pluginEntriesRaw)
    ? pluginEntriesRaw.filter((entry): entry is OpenCodePluginEntry => {
        if (typeof entry === "string") return true
        if (!Array.isArray(entry) || entry.length === 0) return false
        return typeof entry[0] === "string"
      })
    : []

  return {
    scope,
    format,
    path: filePath,
    content,
    data: parseResult.data,
    pluginEntries,
  }
}

function writeScopePlugins(scopeConfig: ScopeConfig, pluginEntries: OpenCodePluginEntry[]): void {
  const pluginDir = dirname(scopeConfig.path)
  mkdirSync(pluginDir, { recursive: true })

  if (scopeConfig.format === "none" || scopeConfig.format === "json") {
    const nextData: OpenCodeConfig = {
      ...scopeConfig.data,
      plugin: pluginEntries,
    }
    writeFileAtomically(scopeConfig.path, `${JSON.stringify(nextData, null, 2)}\n`)
    return
  }

  if (!scopeConfig.content) {
    throw new Error(`Cannot rewrite JSONC config without source content: ${scopeConfig.path}`)
  }

  const edits = modify(scopeConfig.content, ["plugin"], pluginEntries, {
    formattingOptions: {
      insertSpaces: true,
      tabSize: 2,
      eol: "\n",
    },
    getInsertionIndex: () => 0,
  })

  if (edits.length === 0) return
  const nextContent = applyEdits(scopeConfig.content, edits)
  writeFileAtomically(scopeConfig.path, nextContent)
}

function formatUnsafeEntry(scope: ConfigScope, configPath: string, entry: OpenCodePluginEntry, reason: string): string {
  return `- ${scope} (${configPath}): ${JSON.stringify(entry)} (${reason})`
}

function resolvePackageRoot(moduleUrl: string): string {
  return resolve(dirname(fileURLToPath(moduleUrl)), "..", "..")
}

export function getBundledNotifyCanonicalEntry(packageRoot: string): string {
  return pathToFileURL(resolve(packageRoot, "dist", "opencode-notify")).href
}

export function isBundledNotifyBootstrapDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[BUNDLED_NOTIFY_DISABLE_ENV] === "1"
}

export function ensureBundledNotifyOwnership(args: EnsureBundledNotifyOwnershipArgs): BundledNotifyOwnershipResult {
  const env = args.env ?? process.env
  const canonicalEntry = getBundledNotifyCanonicalEntry(args.packageRoot ?? resolvePackageRoot(import.meta.url))

  if (isBundledNotifyBootstrapDisabled(env)) {
    return {
      skipped: true,
      changedUserConfig: false,
      changedProjectConfig: false,
      canonicalEntry,
    }
  }

  const projectPath = getProjectOpenCodeConfigPath(args.projectDirectory)
  const userPath = getUserOpenCodeConfigPath()
  const projectScope = loadScopeConfig("project", projectPath.format, projectPath.path)
  const userScope = loadScopeConfig("user", userPath.format, userPath.path)

  const projectClassified = projectScope.pluginEntries.map((entry, index) => classifyPluginEntry(entry, index, canonicalEntry))
  const userClassified = userScope.pluginEntries.map((entry, index) => classifyPluginEntry(entry, index, canonicalEntry))

  const unsafeEntries = [
    ...projectClassified
      .filter((entry) => entry.kind === "unsafe-external")
      .map((entry) => formatUnsafeEntry("project", projectScope.path, entry.entry, entry.reason ?? "unsafe")),
    ...userClassified
      .filter((entry) => entry.kind === "unsafe-external")
      .map((entry) => formatUnsafeEntry("user", userScope.path, entry.entry, entry.reason ?? "unsafe")),
  ]

  if (unsafeEntries.length > 0) {
    throw new Error(
      `[oh-my-openagent] Unsafe external notify plugin ownership detected.\n`
      + `${unsafeEntries.join("\n")}\n`
      + `Remove custom notify entries and keep exactly one user-scope bundled entry:\n${canonicalEntry}`,
    )
  }

  const projectRecognized = projectClassified.filter((entry) => entry.kind === "recognized-external")
  const userRecognized = userClassified.filter((entry) => entry.kind === "recognized-external")
  const projectBundled = projectClassified.filter((entry) => entry.kind === "bundled")
  const userBundled = userClassified.filter((entry) => entry.kind === "bundled")

  if (userBundled.length > 0 && projectRecognized.length > 0) {
    throw new Error(
      `[oh-my-openagent] Duplicate notify owners detected.\n`
      + `Project config (${projectScope.path}) reintroduced recognized external kdco/notify entries while bundled ownership is active.\n`
      + `Remove project-level kdco/notify entries and keep exactly one user-scope bundled entry:\n${canonicalEntry}`,
    )
  }

  const recognizedOrBundledProjectIndexes = new Set<number>([
    ...projectRecognized.map((entry) => entry.index),
    ...projectBundled.map((entry) => entry.index),
  ])

  const recognizedOrBundledUserIndexes = new Set<number>([
    ...userRecognized.map((entry) => entry.index),
    ...userBundled.map((entry) => entry.index),
  ])

  const nextProjectPlugins = projectScope.pluginEntries.filter((_entry, index) => !recognizedOrBundledProjectIndexes.has(index))
  const userOtherPlugins = userScope.pluginEntries.filter((_entry, index) => !recognizedOrBundledUserIndexes.has(index))
  const nextUserPlugins = [...userOtherPlugins, canonicalEntry]

  const changedProjectConfig = nextProjectPlugins.length !== projectScope.pluginEntries.length
  const changedUserConfig = nextUserPlugins.length !== userScope.pluginEntries.length
    || nextUserPlugins.some((entry, index) => userScope.pluginEntries[index] !== entry)

  if (changedProjectConfig) {
    writeScopePlugins(projectScope, nextProjectPlugins)
  }

  if (changedUserConfig) {
    writeScopePlugins(userScope, nextUserPlugins)
  }

  return {
    skipped: false,
    changedProjectConfig,
    changedUserConfig,
    canonicalEntry,
  }
}
