/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test"

import { buildBootstrapAgentFiles } from "./opencode-agent-bootstrap"

describe("buildBootstrapAgentFiles", () => {
  test("keeps ZWSP runtime names while writing plain-key agent files", () => {
    const files = buildBootstrapAgentFiles({
      "\u200BSisyphus - Ultraworker": {
        name: "\u200BSisyphus - Ultraworker",
        mode: "primary",
        model: "openai/gpt-5.4",
        topP: 0.9,
        prompt: "sisyphus prompt",
      },
      build: {
        name: "build",
        mode: "primary",
        prompt: "build prompt",
      },
    })

    expect(files).toHaveLength(1)
    expect(files[0]?.fileName).toBe("sisyphus.md")
    expect(files[0]?.content).toContain("name: \u200BSisyphus - Ultraworker")
    expect(files[0]?.content).toContain("top_p: 0.9")
    expect(files[0]?.content).toContain("sisyphus prompt")
    expect(files[0]?.content).not.toContain("build prompt")
  })
})
