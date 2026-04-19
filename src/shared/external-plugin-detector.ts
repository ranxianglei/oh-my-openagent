/**
 * Detects external plugins that may conflict with oh-my-opencode features.
 * Used to prevent duplicate feature ownership.
 */

import { loadOpencodePlugins } from "./load-opencode-plugins"
import { log } from "./logger"
import { CONFIG_BASENAME, PLUGIN_NAME } from "./plugin-identity"

/**
 * Known skill plugins that conflict with oh-my-opencode's skill loading.
 * Both plugins scan ~/.config/opencode/skills/ and register tools independently,
 * causing "Duplicate tool names detected" warnings and HTTP 400 errors.
 */
const KNOWN_SKILL_PLUGINS = [
  "opencode-skills",
  "@opencode/skills",
]

function matchesKnownPlugin(entry: string, knownPlugins: readonly string[]): string | null {
  const normalized = entry.toLowerCase()
  for (const known of knownPlugins) {
    if (normalized === known) return known
    if (normalized.startsWith(`${known}@`)) return known
    if (normalized === `npm:${known}` || normalized.startsWith(`npm:${known}@`)) return known
    if (normalized.startsWith("file://") && (
      normalized.endsWith(`/${known}`) ||
      normalized.endsWith(`\\${known}`)
    )) return known
  }

  return null
}

export interface ExternalSkillPluginResult {
  detected: boolean
  pluginName: string | null
  allPlugins: string[]
}

/**
 * Detect if any external skill plugin is configured.
 * Returns information about detected plugins for logging/warning.
 */
export function detectExternalSkillPlugin(directory: string): ExternalSkillPluginResult {
  const plugins = loadOpencodePlugins(directory)

  for (const plugin of plugins) {
    const match = matchesKnownPlugin(plugin, KNOWN_SKILL_PLUGINS)
    if (match) {
      log(`Detected external skill plugin: ${plugin}`)
      return {
        detected: true,
        pluginName: match,
        allPlugins: plugins,
      }
    }
  }

  return {
    detected: false,
    pluginName: null,
    allPlugins: plugins,
  }
}

/**
 * Generate a warning message for users with conflicting skill plugins.
 */
export function getSkillPluginConflictWarning(pluginName: string): string {
  return `[${PLUGIN_NAME}] External skill plugin detected: ${pluginName}

Both ${PLUGIN_NAME} and ${pluginName} scan ~/.config/opencode/skills/ and register tools independently.
   Running both simultaneously causes "Duplicate tool names detected" warnings and HTTP 400 errors.

   Consider either:
   1. Remove ${pluginName} from your opencode.json plugins to use ${PLUGIN_NAME}'s skill loading
   2. Or disable ${PLUGIN_NAME}'s skill loading by setting "claude_code.skills": false in ${CONFIG_BASENAME}.json
   3. Or uninstall ${PLUGIN_NAME} if you prefer ${pluginName}'s skill management`
}
