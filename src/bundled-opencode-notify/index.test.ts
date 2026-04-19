import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test"

import bundledNotifyPlugin from "./index"

interface TodoItem {
  status: string
}

function createMockShellExecutor(notificationCommands: string[]) {
  return (cmd: TemplateStringsArray | string, ...values: unknown[]) => {
    const command = typeof cmd === "string"
      ? cmd
      : cmd.reduce((acc, part, index) => `${acc}${part}${String(values[index] ?? "")}`, "")

    const isLookupCommand = command.includes("command -v terminal-notifier")
    const exitCode = isLookupCommand ? 1 : 0
    if (!isLookupCommand) {
      notificationCommands.push(command)
    }

    const result = { stdout: "", stderr: "", exitCode }
    const promise = Promise.resolve(result) as Promise<typeof result> & {
      quiet: () => Promise<typeof result>
      nothrow: () => Promise<typeof result> & { quiet: () => Promise<typeof result> }
    }

    promise.quiet = () => promise
    promise.nothrow = () => {
      const inner = Promise.resolve(result) as Promise<typeof result> & { quiet: () => Promise<typeof result> }
      inner.quiet = () => inner
      return inner
    }

    return promise
  }
}

function createPluginInput(todos: TodoItem[], notificationCommands: string[]) {
  return {
    $: createMockShellExecutor(notificationCommands),
    client: {
      session: {
        todo: async () => ({ data: todos }),
      },
    },
  } as Parameters<typeof bundledNotifyPlugin.server>[0]
}

describe("bundled-opencode-notify idle suppression", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  test("suppresses ready notification when todos are incomplete", async () => {
    // given
    const notificationCommands: string[] = []
    const hooks = await bundledNotifyPlugin.server(
      createPluginInput([{ status: "in_progress" }], notificationCommands),
    )

    // when
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-1" } } })
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    await Promise.resolve()

    // then
    expect(notificationCommands).toHaveLength(0)
  })

  test("sends ready notification when todos are complete", async () => {
    // given
    const notificationCommands: string[] = []
    const hooks = await bundledNotifyPlugin.server(
      createPluginInput([{ status: "completed" }], notificationCommands),
    )

    // when
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-2" } } })
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    await Promise.resolve()

    // then
    expect(notificationCommands.length).toBeGreaterThan(0)
  })

  test("sends ready notification when remaining todos are only blocked or deleted", async () => {
    // given
    const notificationCommands: string[] = []
    const hooks = await bundledNotifyPlugin.server(
      createPluginInput([
        { status: "blocked" },
        { status: "deleted" },
      ], notificationCommands),
    )

    // when
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-3" } } })
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    await Promise.resolve()

    // then
    expect(notificationCommands.length).toBeGreaterThan(0)
  })
})
