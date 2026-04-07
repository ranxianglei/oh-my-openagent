import { z } from "zod"

export const BuiltinCommandNameSchema = z.enum([
  "init-deep",
  "ralph-loop",
  "ulw-loop",
  "cancel-ralph",
  "refactor",
  "start-work",
  "stop-continuation",
  "remove-ai-slops",
  "wiki-init",
  "wiki-ingest",
  "wiki-query",
  "wiki-lint",
  "wiki-update",
])

export type BuiltinCommandName = z.infer<typeof BuiltinCommandNameSchema>
