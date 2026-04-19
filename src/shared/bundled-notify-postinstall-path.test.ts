import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

describe("bundled notify postinstall bootstrap path", () => {
  test("build script emits ownership module consumed by postinstall", () => {
    // given
    const packageJsonPath = resolve(import.meta.dir, "..", "..", "package.json")
    const postinstallPath = resolve(import.meta.dir, "..", "..", "postinstall.mjs")
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      scripts?: { build?: string }
    }
    const postinstallScript = readFileSync(postinstallPath, "utf-8")

    // when
    const buildScript = packageJson.scripts?.build ?? ""

    // then
    expect(buildScript).toContain("src/shared/bundled-notify-ownership.ts --outdir dist/shared")
    expect(postinstallScript).toContain("dist/shared/bundled-notify-ownership.js")
  })
})
