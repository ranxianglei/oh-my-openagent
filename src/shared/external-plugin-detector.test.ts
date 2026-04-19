import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import { detectExternalSkillPlugin, getSkillPluginConflictWarning } from "./external-plugin-detector"
import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"

async function importFreshExternalPluginDetectorModule(): Promise<typeof import("./external-plugin-detector")> {
  return import(`./external-plugin-detector?test=${Date.now()}-${Math.random()}`)
}

describe("external-plugin-detector", () => {
  let tempDir: string
  let tempHomeDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "omo-test-"))
    tempHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), "omo-home-"))
  })

  afterEach(() => {
    mock.restore()
    fs.rmSync(tempDir, { recursive: true, force: true })
    fs.rmSync(tempHomeDir, { recursive: true, force: true })
  })

  describe("detectExternalSkillPlugin", () => {
    test("returns detected=false when no plugins configured", () => {
      // when
      const result = detectExternalSkillPlugin(tempDir)

      // then
      expect(result.detected).toBe(false)
      expect(result.pluginName).toBeNull()
    })

    test("detects opencode-skills plugin", () => {
      // given
      const opencodeDir = path.join(tempDir, ".opencode")
      fs.mkdirSync(opencodeDir, { recursive: true })
      fs.writeFileSync(path.join(opencodeDir, "opencode.json"), JSON.stringify({ plugin: ["opencode-skills"] }))

      // when
      const result = detectExternalSkillPlugin(tempDir)

      // then
      expect(result.detected).toBe(true)
      expect(result.pluginName).toBe("opencode-skills")
    })

    test("detects @opencode/skills scoped package", () => {
      // given
      const opencodeDir = path.join(tempDir, ".opencode")
      fs.mkdirSync(opencodeDir, { recursive: true })
      fs.writeFileSync(path.join(opencodeDir, "opencode.json"), JSON.stringify({ plugin: ["@opencode/skills"] }))

      // when
      const result = detectExternalSkillPlugin(tempDir)

      // then
      expect(result.detected).toBe(true)
      expect(result.pluginName).toBe("@opencode/skills")
    })

    test("detects user-level plugin when project config has no plugin list", async () => {
      // given
      const projectConfigDir = path.join(tempDir, ".opencode")
      const userConfigDir = path.join(tempHomeDir, ".config", "opencode")
      fs.mkdirSync(projectConfigDir, { recursive: true })
      fs.mkdirSync(userConfigDir, { recursive: true })
      fs.writeFileSync(path.join(projectConfigDir, "opencode.json"), JSON.stringify({}))
      fs.writeFileSync(path.join(userConfigDir, "opencode.json"), JSON.stringify({ plugin: ["opencode-skills"] }))

      const nodeOs = await import("node:os")
      mock.module("node:os", () => ({
        ...nodeOs,
        homedir: () => tempHomeDir,
      }))
      const { detectExternalSkillPlugin: detectExternalSkillPluginFresh } = await importFreshExternalPluginDetectorModule()

      // when
      const result = detectExternalSkillPluginFresh(tempDir)

      // then
      expect(result.detected).toBe(true)
      expect(result.pluginName).toBe("opencode-skills")
      expect(result.allPlugins).toEqual(["opencode-skills"])
    })

    test("does not match opencode-skills-extra", () => {
      // given
      const opencodeDir = path.join(tempDir, ".opencode")
      fs.mkdirSync(opencodeDir, { recursive: true })
      fs.writeFileSync(path.join(opencodeDir, "opencode.json"), JSON.stringify({ plugin: ["opencode-skills-extra"] }))

      // when
      const result = detectExternalSkillPlugin(tempDir)

      // then
      expect(result.detected).toBe(false)
      expect(result.pluginName).toBeNull()
    })
  })

  describe("getSkillPluginConflictWarning", () => {
    test("generates warning message with plugin name", () => {
      // when
      const warning = getSkillPluginConflictWarning("opencode-skills")

      // then
      expect(warning).toContain("opencode-skills")
      expect(warning).toContain("Duplicate tool names detected")
      expect(warning).toContain("claude_code")
      expect(warning).toContain("skills")
    })
  })
})
