import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test"

import bundledNotifyPlugin from "./index"

interface TodoItem {
  status: string
}

type TodoResponseMode = {
  todos?: TodoItem[]
  throwError?: boolean
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

function createPluginInput(todoMode: TodoResponseMode, notificationCommands: string[]) {
  return {
    $: createMockShellExecutor(notificationCommands),
    client: {
      session: {
        todo: async () => {
          if (todoMode.throwError) {
            throw new Error("todo fetch failed")
          }

          return { data: todoMode.todos ?? [] }
        },
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
      createPluginInput({ todos: [{ status: "in_progress" }] }, notificationCommands),
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
      createPluginInput({ todos: [{ status: "completed" }] }, notificationCommands),
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
      createPluginInput({
        todos: [
          { status: "blocked" },
          { status: "deleted" },
        ],
      }, notificationCommands),
    )

    // when
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-3" } } })
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    await Promise.resolve()

    // then
    expect(notificationCommands.length).toBeGreaterThan(0)
  })

  test("suppresses ready notification when todo fetch state is unknown", async () => {
    // given
    const notificationCommands: string[] = []
    const hooks = await bundledNotifyPlugin.server(
      createPluginInput({ throwError: true }, notificationCommands),
    )

    // when
    await hooks.event?.({ event: { type: "session.idle", properties: { sessionID: "session-4" } } })
    jest.advanceTimersByTime(1500)
    await Promise.resolve()
    await Promise.resolve()

    // then
    expect(notificationCommands).toHaveLength(0)
  })
})
