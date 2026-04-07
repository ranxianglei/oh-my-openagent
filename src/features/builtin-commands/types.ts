import type { CommandDefinition } from "../claude-code-command-loader"

export type BuiltinCommandName =
  | "init-deep"
  | "ralph-loop"
  | "cancel-ralph"
  | "ulw-loop"
  | "refactor"
  | "start-work"
  | "stop-continuation"
  | "handoff"
  | "remove-ai-slops"
  | "wiki-init"
  | "wiki-ingest"
  | "wiki-query"
  | "wiki-lint"
  | "wiki-update"

export interface BuiltinCommandConfig {
  disabled_commands?: BuiltinCommandName[]
}

export type BuiltinCommands = Record<string, CommandDefinition>
