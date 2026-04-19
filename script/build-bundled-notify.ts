#!/usr/bin/env bun
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const DIST_NOTIFY_DIR = join("dist", "opencode-notify")
const SOURCE_NOTICE_PATH = join("src", "bundled-opencode-notify", "THIRD_PARTY_NOTICES.md")
const DIST_NOTICE_PATH = join(DIST_NOTIFY_DIR, "THIRD_PARTY_NOTICES.md")
const DIST_PACKAGE_PATH = join(DIST_NOTIFY_DIR, "package.json")

const bundledPackageJson = {
  name: "@oh-my-openagent/bundled-opencode-notify",
  private: true,
  type: "module",
  main: "./index.js",
}

function main(): void {
  mkdirSync(DIST_NOTIFY_DIR, { recursive: true })
  writeFileSync(DIST_PACKAGE_PATH, `${JSON.stringify(bundledPackageJson, null, 2)}\n`, "utf-8")
  copyFileSync(SOURCE_NOTICE_PATH, DIST_NOTICE_PATH)
}

main()
