import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { ACCEPTED_PACKAGE_NAMES, PLUGIN_NAME } from "../../shared"
import { getPluginNameWithVersion } from "./plugin-name-with-version"

const ACCEPTED_PACKAGE_NAME_SET = new Set<string>(ACCEPTED_PACKAGE_NAMES)
const PACKAGE_JSON_SEARCH_DEPTH = 10

type PackageJsonShape = {
  name?: string
}

function findInstalledPluginRoot(startPath: string): string | null {
  let directory = dirname(startPath)

  for (let depth = 0; depth < PACKAGE_JSON_SEARCH_DEPTH; depth += 1) {
    const packageJsonPath = join(directory, "package.json")
    if (existsSync(packageJsonPath)) {
      try {
        const content = readFileSync(packageJsonPath, "utf-8")
        const packageJson = JSON.parse(content) as PackageJsonShape
        if (packageJson.name && ACCEPTED_PACKAGE_NAME_SET.has(packageJson.name)) {
          return directory
        }
      } catch {
        // Ignore malformed package.json files while searching upward.
      }
    }

    const parentDirectory = dirname(directory)
    if (parentDirectory === directory) {
      break
    }
    directory = parentDirectory
  }

  return null
}

export async function getPreferredPluginEntry(currentVersion: string): Promise<string> {
  const installedPluginRoot = findInstalledPluginRoot(fileURLToPath(import.meta.url))
  if (installedPluginRoot) {
    return pathToFileURL(installedPluginRoot).href
  }

  return getPluginNameWithVersion(currentVersion, PLUGIN_NAME)
}

export { findInstalledPluginRoot }
