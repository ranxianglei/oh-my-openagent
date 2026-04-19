import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { parseJsoncSafe } from "./jsonc-parser"
import { ensureBundledNotifyOwnership, getBundledNotifyCanonicalEntry } from "./bundled-notify-ownership"

interface OpenCodeConfig {
  plugin?: unknown[]
}

function readConfig(path: string): OpenCodeConfig {
  const result = parseJsoncSafe<OpenCodeConfig>(readFileSync(path, "utf-8"))
  if (!result.data) {
    throw new Error(`Failed to parse config: ${path}`)
  }

  return result.data
}

describe("ensureBundledNotifyOwnership", () => {
  let rootDir = ""
  let projectDir = ""
  let userConfigDir = ""
  let packageRoot = ""
  let canonicalEntry = ""

  beforeEach(() => {
    rootDir = join(tmpdir(), `omo-bundled-notify-${Date.now()}-${Math.random().toString(16).slice(2)}`)
    projectDir = join(rootDir, "project")
    userConfigDir = join(rootDir, "user-config")
    packageRoot = join(rootDir, "package")
    mkdirSync(join(projectDir, ".opencode"), { recursive: true })
    mkdirSync(userConfigDir, { recursive: true })
    mkdirSync(join(packageRoot, "dist", "opencode-notify"), { recursive: true })
    canonicalEntry = getBundledNotifyCanonicalEntry(packageRoot)
    process.env.OPENCODE_CONFIG_DIR = userConfigDir
    delete process.env.OMO_DISABLE_BUNDLED_NOTIFY_BOOTSTRAP
  })

  afterEach(() => {
    delete process.env.OPENCODE_CONFIG_DIR
    delete process.env.OMO_DISABLE_BUNDLED_NOTIFY_BOOTSTRAP
    rmSync(rootDir, { recursive: true, force: true })
  })

  test("adds bundled notify to user config when no notify owner exists", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["oh-my-openagent"] }, null, 2) + "\n")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("creates user opencode.json with bundled owner when user config is missing", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual([canonicalEntry])
  })

  test("rewrites recognized external notify in user config to bundled owner", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["kdco/notify@1.2.3", "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("rewrites recognized tuple notify in user config when tuple options are empty", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(
      userConfigPath,
      JSON.stringify({ plugin: [["kdco/notify", {}], "oh-my-openagent"] }, null, 2) + "\n",
    )

    // when
    ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("does not classify unrelated notify-like plugin names as unsafe", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["team-notify-center", "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual(["team-notify-center", "oh-my-openagent", canonicalEntry])
  })

  test("fails loudly for custom package-based notify plugin id", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["@custom/opencode-notify", "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const run = () => ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(run).toThrow("Unsafe external notify plugin ownership detected")
    expect(readConfig(userConfigPath).plugin).toEqual(["@custom/opencode-notify", "oh-my-openagent"])
  })

  test("fails loudly for custom tuple-based notify package id", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: [["npm:@custom/opencode-notify@1.2.3", {}], "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const run = () => ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(run).toThrow("Unsafe external notify plugin ownership detected")
    expect(readConfig(userConfigPath).plugin).toEqual([["npm:@custom/opencode-notify@1.2.3", {}], "oh-my-openagent"])
  })

  test("migrates stale bundled dist/opencode-notify file URL to canonical bundled entry", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    const stalePackageRoot = join(rootDir, "package-old")
    mkdirSync(join(stalePackageRoot, "dist", "opencode-notify"), { recursive: true })
    const staleBundledEntry = getBundledNotifyCanonicalEntry(stalePackageRoot)
    writeFileSync(userConfigPath, JSON.stringify({ plugin: [staleBundledEntry, "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("removes project recognized notify and adds bundled user owner", () => {
    // given
    const projectConfigPath = join(projectDir, ".opencode", "opencode.json")
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(projectConfigPath, JSON.stringify({ plugin: ["kdco/notify"] }, null, 2) + "\n")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["oh-my-openagent"] }, null, 2) + "\n")

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.changedProjectConfig).toBe(true)
    expect(result.changedUserConfig).toBe(true)
    expect(readConfig(projectConfigPath).plugin).toEqual([])
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("rewrites user recognized owner and removes project recognized duplicate", () => {
    // given
    const projectConfigPath = join(projectDir, ".opencode", "opencode.json")
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(projectConfigPath, JSON.stringify({ plugin: ["npm:kdco/notify"] }, null, 2) + "\n")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["kdco/notify", "oh-my-openagent"] }, null, 2) + "\n")

    // when
    ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(readConfig(projectConfigPath).plugin).toEqual([])
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent", canonicalEntry])
  })

  test("fails loudly for custom unsafe notify entry in user config", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["file:///custom/plugins/opencode-notify"] }, null, 2) + "\n")

    // when
    const run = () => ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(run).toThrow("Unsafe external notify plugin ownership detected")
    expect(readConfig(userConfigPath).plugin).toEqual(["file:///custom/plugins/opencode-notify"])
  })

  test("fails loudly for custom unsafe notify tuple in project config", () => {
    // given
    const projectConfigPath = join(projectDir, ".opencode", "opencode.json")
    writeFileSync(projectConfigPath, JSON.stringify({ plugin: [["kdco/notify", { mode: "custom" }]] }, null, 2) + "\n")

    // when
    const run = () => ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(run).toThrow("Unsafe external notify plugin ownership detected")
    expect(readConfig(projectConfigPath).plugin).toEqual([["kdco/notify", { mode: "custom" }]])
  })

  test("fails loudly when project reintroduces recognized external notify after bundled owner exists", () => {
    // given
    const projectConfigPath = join(projectDir, ".opencode", "opencode.json")
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(projectConfigPath, JSON.stringify({ plugin: ["kdco/notify"] }, null, 2) + "\n")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: [canonicalEntry, "oh-my-openagent"] }, null, 2) + "\n")

    // when
    const run = () => ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(run).toThrow("Duplicate notify owners detected")
    expect(readConfig(projectConfigPath).plugin).toEqual(["kdco/notify"])
    expect(readConfig(userConfigPath).plugin).toEqual([canonicalEntry, "oh-my-openagent"])
  })

  test("skips bootstrap when disable env is set", () => {
    // given
    const userConfigPath = join(userConfigDir, "opencode.json")
    writeFileSync(userConfigPath, JSON.stringify({ plugin: ["oh-my-openagent"] }, null, 2) + "\n")
    process.env.OMO_DISABLE_BUNDLED_NOTIFY_BOOTSTRAP = "1"

    // when
    const result = ensureBundledNotifyOwnership({ projectDirectory: projectDir, packageRoot })

    // then
    expect(result.skipped).toBe(true)
    expect(readConfig(userConfigPath).plugin).toEqual(["oh-my-openagent"])
  })
})
