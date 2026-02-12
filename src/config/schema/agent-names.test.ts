import { describe, expect, test } from "bun:test"
import { BuiltinAgentNameSchema, OverridableAgentNameSchema } from "./agent-names"
import { OhMyOpenCodeConfigSchema } from "./oh-my-opencode-config"

describe("OhMyOpenCodeConfigSchema disabled_skills", () => {
  test("accepts review-work and ai-slop-remover", () => {
    // given
    const config = {
      disabled_skills: ["review-work", "ai-slop-remover"],
    }

    // when
    const result = OhMyOpenCodeConfigSchema.safeParse(config)

    // then
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.disabled_skills).toEqual([
        "review-work",
        "ai-slop-remover",
      ])
    }
  })
})

describe("agent name schemas", () => {
  test("BuiltinAgentNameSchema accepts athena", () => {
    //#given
    const candidate = "athena"

    //#when
    const result = BuiltinAgentNameSchema.safeParse(candidate)

    //#then
    expect(result.success).toBe(true)
  })

  test("OverridableAgentNameSchema accepts athena", () => {
    //#given
    const candidate = "athena"

    //#when
    const result = OverridableAgentNameSchema.safeParse(candidate)

    //#then
    expect(result.success).toBe(true)
  })
})
