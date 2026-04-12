/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { pathToFileURL } from "node:url"

import { findPluginEntry, getPluginInfo } from "./system-plugin"

describe("system-plugin", () => {
  let testConfigDir = ""
  let testConfigPath = ""

  beforeEach(() => {
    testConfigDir = join(tmpdir(), `omo-system-plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    testConfigPath = join(testConfigDir, "opencode.json")

    mkdirSync(testConfigDir, { recursive: true })
    process.env.OPENCODE_CONFIG_DIR = testConfigDir
  })

  afterEach(() => {
    rmSync(testConfigDir, { recursive: true, force: true })
    delete process.env.OPENCODE_CONFIG_DIR
  })

  it("treats file URL plugin entries as local-dev installs", () => {
    // given
    const entry = pathToFileURL(join(testConfigDir, "node_modules", "oh-my-openagent")).href

    // when
    const result = findPluginEntry([entry])

    // then
    expect(result).toEqual({ entry, isLocalDev: true })
  })

  it("treats absolute plugin paths as local-dev installs", () => {
    // given
    const entry = "/home/test/.config/opencode/node_modules/oh-my-opencode"

    // when
    const result = findPluginEntry([entry])

    // then
    expect(result).toEqual({ entry, isLocalDev: true })
  })

  it("reports local path plugin entries as registered", () => {
    // given
    const pluginDir = join(testConfigDir, "plugin-root")
    mkdirSync(pluginDir, { recursive: true })
    writeFileSync(
      join(pluginDir, "package.json"),
      JSON.stringify({ name: "oh-my-opencode" }, null, 2) + "\n",
      "utf-8",
    )
    const entry = pathToFileURL(pluginDir).href
    writeFileSync(testConfigPath, JSON.stringify({ plugin: [entry] }, null, 2) + "\n", "utf-8")

    // when
    const pluginInfo = getPluginInfo()

    // then
    expect(pluginInfo.registered).toBe(true)
    expect(pluginInfo.entry).toBe(entry)
    expect(pluginInfo.isLocalDev).toBe(true)
    expect(pluginInfo.isPinned).toBe(false)
  })
})
