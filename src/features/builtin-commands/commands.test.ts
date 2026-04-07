/// <reference path="../../../bun-test.d.ts" />

import { afterEach, beforeEach, describe, test, expect } from "bun:test"
import { loadBuiltinCommands } from "./commands"
import { HANDOFF_TEMPLATE } from "./templates/handoff"
import { REMOVE_AI_SLOPS_TEMPLATE } from "./templates/remove-ai-slops"
import { WIKI_INIT_TEMPLATE } from "./templates/wiki-init"
import { WIKI_INGEST_TEMPLATE } from "./templates/wiki-ingest"
import { WIKI_QUERY_TEMPLATE } from "./templates/wiki-query"
import { WIKI_LINT_TEMPLATE } from "./templates/wiki-lint"
import { WIKI_UPDATE_TEMPLATE } from "./templates/wiki-update"
import type { BuiltinCommandName } from "./types"
import { _resetForTesting, registerAgentName } from "../claude-code-session-state"

beforeEach(() => {
  _resetForTesting()
})

afterEach(() => {
  _resetForTesting()
})

describe("loadBuiltinCommands", () => {
  test("should include handoff command in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands.handoff).toBeDefined()
    expect(commands.handoff.name).toBe("handoff")
  })

  test("should exclude handoff when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["handoff"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands.handoff).toBeUndefined()
  })

  test("should include handoff template content in command template", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands.handoff.template).toContain(HANDOFF_TEMPLATE)
  })

  test("should include session context variables in handoff template", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands.handoff.template).toContain("$SESSION_ID")
    expect(commands.handoff.template).toContain("$TIMESTAMP")
    expect(commands.handoff.template).toContain("$ARGUMENTS")
  })

  test("should have correct description for handoff", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands.handoff.description).toContain("context summary")
  })

  test("should default start-work to Atlas for static slash-command discovery", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands["start-work"].agent).toBe("atlas")
  })

  test("should preassign Sisyphus as the native agent for start-work when command config checks registered agents", () => {
    //#given - no atlas registration

    //#when
    const commands = loadBuiltinCommands(undefined, { useRegisteredAgents: true })

    //#then
    expect(commands["start-work"].agent).toBe("sisyphus")
  })

  test("should preassign Atlas as the native agent for start-work when Atlas is registered", () => {
    //#given
    registerAgentName("atlas")

    //#when
    const commands = loadBuiltinCommands(undefined, { useRegisteredAgents: true })

    //#then
    expect(commands["start-work"].agent).toBe("atlas")
  })
})

describe("loadBuiltinCommands - remove-ai-slops", () => {
  test("should include remove-ai-slops command in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["remove-ai-slops"]).toBeDefined()
    expect(commands["remove-ai-slops"].name).toBe("remove-ai-slops")
  })

  test("should exclude remove-ai-slops when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["remove-ai-slops"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["remove-ai-slops"]).toBeUndefined()
  })

  test("should include remove-ai-slops template content in command template", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands["remove-ai-slops"].template).toContain(REMOVE_AI_SLOPS_TEMPLATE)
  })

  test("should have correct description for remove-ai-slops", () => {
    //#given - no disabled commands

    //#when
    const commands = loadBuiltinCommands()

    //#then
    expect(commands["remove-ai-slops"].description).toContain("AI-generated code smells")
  })
})

describe("REMOVE_AI_SLOPS_TEMPLATE", () => {
  test("should include phase structure", () => {
    //#given - the template string

    //#when / #then
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("Identify Changed Files")
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("Parallel AI Slop Removal")
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("Critical Review")
  })

  test("should reference ai-slop-remover skill", () => {
    //#given - the template string

    //#when / #then
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("ai-slop-remover")
  })

  test("should include safety verification checklist", () => {
    //#given - the template string

    //#when / #then
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("Safety Verification")
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("Behavior Preservation")
  })

  test("should detect the base branch dynamically instead of hardcoding main", () => {
    //#given - the template string

    //#when / #then
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain("git symbolic-ref refs/remotes/origin/HEAD")
    expect(REMOVE_AI_SLOPS_TEMPLATE).toContain('git merge-base "$BASE_BRANCH" HEAD')
    expect(REMOVE_AI_SLOPS_TEMPLATE).not.toContain("git merge-base main HEAD")
  })
})

describe("HANDOFF_TEMPLATE", () => {
  test("should include session reading instruction", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("session_read")
  })

  test("should include compaction-style sections in output format", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("USER REQUESTS (AS-IS)")
    expect(HANDOFF_TEMPLATE).toContain("EXPLICIT CONSTRAINTS")
  })

  test("should include programmatic context gathering instructions", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("todoread")
    expect(HANDOFF_TEMPLATE).toContain("git diff")
    expect(HANDOFF_TEMPLATE).toContain("git status")
  })

  test("should include context extraction format", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("WORK COMPLETED")
    expect(HANDOFF_TEMPLATE).toContain("CURRENT STATE")
    expect(HANDOFF_TEMPLATE).toContain("PENDING TASKS")
    expect(HANDOFF_TEMPLATE).toContain("KEY FILES")
    expect(HANDOFF_TEMPLATE).toContain("IMPORTANT DECISIONS")
    expect(HANDOFF_TEMPLATE).toContain("CONTEXT FOR CONTINUATION")
    expect(HANDOFF_TEMPLATE).toContain("GOAL")
  })

  test("should enforce first person perspective", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("first person perspective")
  })

  test("should limit key files to 10", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("Maximum 10 files")
  })

  test("should instruct plain text format without markdown", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("Plain text with bullets")
    expect(HANDOFF_TEMPLATE).toContain("No markdown headers")
  })

  test("should include user instructions for new session", () => {
    //#given - the template string

    //#when / #then
    expect(HANDOFF_TEMPLATE).toContain("new session")
    expect(HANDOFF_TEMPLATE).toContain("opencode")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(HANDOFF_TEMPLATE)).toBe(false)
  })
})

describe("loadBuiltinCommands - wiki commands", () => {
  test("should register wiki-init in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-init"]).toBeDefined()
    expect(commands["wiki-init"].name).toBe("wiki-init")
    expect(commands["wiki-init"].template).toContain(WIKI_INIT_TEMPLATE)
    expect(commands["wiki-init"].description).toContain("(builtin)")
  })

  test("should register wiki-ingest in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-ingest"]).toBeDefined()
    expect(commands["wiki-ingest"].name).toBe("wiki-ingest")
    expect(commands["wiki-ingest"].template).toContain(WIKI_INGEST_TEMPLATE)
    expect(commands["wiki-ingest"].template).toContain("$ARGUMENTS")
  })

  test("should register wiki-query in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-query"]).toBeDefined()
    expect(commands["wiki-query"].name).toBe("wiki-query")
    expect(commands["wiki-query"].template).toContain(WIKI_QUERY_TEMPLATE)
    expect(commands["wiki-query"].template).toContain("$ARGUMENTS")
  })

  test("should register wiki-lint in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-lint"]).toBeDefined()
    expect(commands["wiki-lint"].name).toBe("wiki-lint")
    expect(commands["wiki-lint"].template).toContain(WIKI_LINT_TEMPLATE)
  })

  test("should register wiki-update in loaded commands", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = []

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-update"]).toBeDefined()
    expect(commands["wiki-update"].name).toBe("wiki-update")
    expect(commands["wiki-update"].template).toContain(WIKI_UPDATE_TEMPLATE)
    expect(commands["wiki-update"].template).toContain("$ARGUMENTS")
  })

  test("should exclude wiki-init when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["wiki-init"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-init"]).toBeUndefined()
  })

  test("should exclude wiki-ingest when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["wiki-ingest"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-ingest"]).toBeUndefined()
  })

  test("should exclude wiki-query when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["wiki-query"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-query"]).toBeUndefined()
  })

  test("should exclude wiki-lint when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["wiki-lint"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-lint"]).toBeUndefined()
  })

  test("should exclude wiki-update when disabled", () => {
    //#given
    const disabledCommands: BuiltinCommandName[] = ["wiki-update"]

    //#when
    const commands = loadBuiltinCommands(disabledCommands)

    //#then
    expect(commands["wiki-update"]).toBeUndefined()
  })
})

describe("WIKI_INIT_TEMPLATE", () => {
  test("should reference the canonical wiki root .sisyphus/wiki/", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INIT_TEMPLATE).toContain(".sisyphus/wiki/")
  })

  test("should create the four canonical top-level files and pages directory", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INIT_TEMPLATE).toContain("index.md")
    expect(WIKI_INIT_TEMPLATE).toContain("log.md")
    expect(WIKI_INIT_TEMPLATE).toContain("overview.md")
    expect(WIKI_INIT_TEMPLATE).toContain("SCHEMA.md")
    expect(WIKI_INIT_TEMPLATE).toContain("pages/")
  })

  test("should refuse to clobber an existing wiki without explicit user consent", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INIT_TEMPLATE).toContain("already exists")
  })

  test("should declare the page front-matter contract", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INIT_TEMPLATE).toContain("front-matter")
    expect(WIKI_INIT_TEMPLATE).toContain("sources")
    expect(WIKI_INIT_TEMPLATE).toContain("backlinks")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(WIKI_INIT_TEMPLATE)).toBe(false)
  })
})

describe("WIKI_INGEST_TEMPLATE", () => {
  test("should require reading the source before writing anything", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain("Read")
    expect(WIKI_INGEST_TEMPLATE).toContain("source")
  })

  test("should ban writing claims that are not present in the source", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain("memory")
    expect(WIKI_INGEST_TEMPLATE).toContain("only what the source supports")
  })

  test("should require extracting takeaways before drafting the page", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain("Takeaways")
  })

  test("should require updating index.md and appending to log.md", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain("index.md")
    expect(WIKI_INGEST_TEMPLATE).toContain("log.md")
  })

  test("should require a backlink audit pass", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain("backlink")
  })

  test("should write pages under .sisyphus/wiki/pages/", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_INGEST_TEMPLATE).toContain(".sisyphus/wiki/pages/")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(WIKI_INGEST_TEMPLATE)).toBe(false)
  })
})

describe("WIKI_QUERY_TEMPLATE", () => {
  test("should answer strictly from wiki contents and never from memory", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_QUERY_TEMPLATE).toContain("never")
    expect(WIKI_QUERY_TEMPLATE).toContain("memory")
  })

  test("should require reading index.md first", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_QUERY_TEMPLATE).toContain("index.md")
  })

  test("should require citing every claim by source", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_QUERY_TEMPLATE).toContain("cite")
  })

  test("should offer to save the answer as a new cited page", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_QUERY_TEMPLATE).toContain("save")
    expect(WIKI_QUERY_TEMPLATE).toContain("page")
  })

  test("should declare an explicit fallback when the wiki has no answer", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_QUERY_TEMPLATE).toContain("not in the wiki")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(WIKI_QUERY_TEMPLATE)).toBe(false)
  })
})

describe("WIKI_LINT_TEMPLATE", () => {
  test("should detect contradictions across pages", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("contradiction")
  })

  test("should detect broken internal links", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("broken link")
  })

  test("should detect orphan pages with no inbound backlinks", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("orphan")
  })

  test("should detect coverage gaps", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("gap")
  })

  test("should write the report to pages/lint-report.md", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("pages/lint-report.md")
  })

  test("should not modify any other page", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_LINT_TEMPLATE).toContain("read-only")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(WIKI_LINT_TEMPLATE)).toBe(false)
  })
})

describe("WIKI_UPDATE_TEMPLATE", () => {
  test("should show diffs of every modified page before writing", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_UPDATE_TEMPLATE).toContain("diff")
  })

  test("should require citing the new source for every changed claim", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_UPDATE_TEMPLATE).toContain("cite")
    expect(WIKI_UPDATE_TEMPLATE).toContain("source")
  })

  test("should sweep stale claims that no longer match the source", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_UPDATE_TEMPLATE).toContain("stale")
  })

  test("should append the update to log.md", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_UPDATE_TEMPLATE).toContain("log.md")
  })

  test("should bump the updated timestamp in front-matter", () => {
    //#given - the template string

    //#when / #then
    expect(WIKI_UPDATE_TEMPLATE).toContain("updated")
    expect(WIKI_UPDATE_TEMPLATE).toContain("front-matter")
  })

  test("should not contain emojis", () => {
    //#given - the template string

    //#when / #then
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    expect(emojiRegex.test(WIKI_UPDATE_TEMPLATE)).toBe(false)
  })
})
