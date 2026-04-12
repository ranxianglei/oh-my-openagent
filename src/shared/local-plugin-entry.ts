import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { ACCEPTED_PACKAGE_NAMES } from "./plugin-identity"

const ACCEPTED_PACKAGE_NAME_SET = new Set<string>(ACCEPTED_PACKAGE_NAMES)
const PACKAGE_JSON_SEARCH_DEPTH = 10

type PackageJsonShape = {
  name?: string
}

export function isLocalPluginPath(entry: string): boolean {
  return entry.startsWith("file://") || entry.startsWith("/") || /^[A-Za-z]:[\\/]/.test(entry)
}

function toFilePath(entry: string): string | null {
  if (entry.startsWith("file://")) {
    try {
      return fileURLToPath(entry)
    } catch {
      return null
    }
  }

  if (entry.startsWith("/") || /^[A-Za-z]:[\\/]/.test(entry)) {
    return entry
  }

  return null
}

export function resolveLocalPluginPackageName(entry: string): string | null {
  const filePath = toFilePath(entry)
  if (!filePath || !existsSync(filePath)) {
    return null
  }

  let directory = filePath
  try {
    const stat = statSync(filePath)
    directory = stat.isDirectory() ? filePath : dirname(filePath)
  } catch {
    directory = dirname(filePath)
  }

  for (let depth = 0; depth < PACKAGE_JSON_SEARCH_DEPTH; depth += 1) {
    const packageJsonPath = join(directory, "package.json")
    if (existsSync(packageJsonPath)) {
      try {
        const content = readFileSync(packageJsonPath, "utf-8")
        const packageJson = JSON.parse(content) as PackageJsonShape
        if (typeof packageJson.name === "string" && packageJson.name.length > 0) {
          return packageJson.name
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

export function isAcceptedLocalPluginEntry(entry: string): boolean {
  if (!isLocalPluginPath(entry)) {
    return false
  }

  const packageName = resolveLocalPluginPackageName(entry)
  if (packageName && ACCEPTED_PACKAGE_NAME_SET.has(packageName)) {
    return true
  }

  return ACCEPTED_PACKAGE_NAMES.some((name) => entry.includes(name))
}
