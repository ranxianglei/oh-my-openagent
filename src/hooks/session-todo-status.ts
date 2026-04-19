import type { PluginInput } from "@opencode-ai/plugin"
import { normalizeSDKResponse } from "../shared"
import { getIncompleteCount } from "./todo-continuation-enforcer/todo"

interface Todo {
  content: string
  status: string
  priority: string
  id?: string
}

export type SessionTodoState = "pending" | "clear" | "unknown"

export async function getSessionTodoState(ctx: PluginInput, sessionID: string): Promise<SessionTodoState> {
  try {
    const response = await ctx.client.session.todo({ path: { id: sessionID } })
    const todos = normalizeSDKResponse(response, [] as Todo[], { preferResponseOnMissingData: true })
    if (!todos || todos.length === 0) return "clear"
    return getIncompleteCount(todos) > 0 ? "pending" : "clear"
  } catch {
    return "unknown"
  }
}

export async function hasIncompleteTodos(ctx: PluginInput, sessionID: string): Promise<boolean> {
  return (await getSessionTodoState(ctx, sessionID)) === "pending"
}
