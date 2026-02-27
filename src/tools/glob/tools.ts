import { resolve } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import { tool, type ToolDefinition } from "@opencode-ai/plugin/tool"
import { runRgFiles } from "./cli"
import { resolveGrepCliWithAutoInstall } from "./constants"
import { formatGlobResult } from "./result-formatter"

export function createGlobTools(ctx: PluginInput): Record<string, ToolDefinition> {
  const glob: ToolDefinition = tool({
    description:
      "Fast file pattern matching tool with safety limits (60s timeout, 100 file limit). " +
      "Supports glob patterns like \"**/*.js\" or \"src/**/*.ts\". " +
      "Returns matching file paths sorted by modification time. " +
      "Use this tool when you need to find files by name patterns.",
    args: {
      pattern: tool.schema.string().describe("The glob pattern to match files against"),
      path: tool.schema
        .string()
        .optional()
        .describe(
          "The directory to search in. If not specified, the current working directory will be used. " +
            "IMPORTANT: Omit this field to use the default directory. DO NOT enter \"undefined\" or \"null\" - " +
            "simply omit it for the default behavior. Must be a valid directory path if provided."
        ),
    },
    execute: async (args, context) => {
      try {
        const cli = await resolveGrepCliWithAutoInstall()
<<<<<<< HEAD
        const runtimeCtx = context as Record<string, unknown>
        const dir = typeof runtimeCtx.directory === "string" ? runtimeCtx.directory : ctx.directory
        const searchPath = args.path ? resolve(dir, args.path) : dir
||||||| parent of 804d517f (fix(tools): resolve relative paths in glob/grep against project directory)
        const searchPath = args.path ?? ctx.directory
        const paths = [searchPath]
=======
        const searchPath = args.path ? resolve(ctx.directory, args.path) : ctx.directory
        const paths = [searchPath]
>>>>>>> 804d517f (fix(tools): resolve relative paths in glob/grep against project directory)

        const result = await runRgFiles(
          {
            pattern: args.pattern,
            paths: [searchPath],
          },
          cli
        )

        return formatGlobResult(result)
      } catch (e) {
        return `Error: ${e instanceof Error ? e.message : String(e)}`
      }
    },
  })

  return { glob }
}
