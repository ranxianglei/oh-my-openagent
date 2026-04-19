import type { Hooks, Plugin, PluginModule } from "@opencode-ai/plugin"
import { getSessionTodoState } from "../hooks/session-todo-status"

type Platform = "darwin" | "linux" | "win32" | "unsupported"

interface SessionState {
  isSubagent: boolean
  idleTimer: ReturnType<typeof setTimeout> | null
}

function detectPlatform(): Platform {
  if (process.platform === "darwin") return "darwin"
  if (process.platform === "linux") return "linux"
  if (process.platform === "win32") return "win32"
  return "unsupported"
}

function getSessionId(properties: unknown): string | null {
  if (!properties || typeof properties !== "object") return null
  const props = properties as Record<string, unknown>

  if (typeof props.sessionID === "string" && props.sessionID.length > 0) return props.sessionID

  const info = props.info
  if (!info || typeof info !== "object") return null
  const infoRecord = info as Record<string, unknown>
  if (typeof infoRecord.sessionID === "string" && infoRecord.sessionID.length > 0) return infoRecord.sessionID
  if (typeof infoRecord.id === "string" && infoRecord.id.length > 0) return infoRecord.id
  return null
}

async function sendDarwinNotification(ctx: Parameters<Plugin>[0], title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/"/g, '\\"')
  const escapedMessage = message.replace(/"/g, '\\"')

  await ctx.$`command -v terminal-notifier`.nothrow().quiet()
    .then((result) => {
      if (result.exitCode !== 0) {
        return ctx.$`osascript -e ${`display notification "${escapedMessage}" with title "${escapedTitle}"`}`.nothrow().quiet()
      }

      return ctx.$`terminal-notifier -title ${title} -message ${message}`.nothrow().quiet()
    })
}

async function sendLinuxNotification(ctx: Parameters<Plugin>[0], title: string, message: string): Promise<void> {
  await ctx.$`notify-send ${title} ${message}`.nothrow().quiet()
}

async function sendWindowsNotification(ctx: Parameters<Plugin>[0], title: string, message: string): Promise<void> {
  const escapedTitle = title.replace(/'/g, "''")
  const escapedMessage = message.replace(/'/g, "''")
  const script = `
Add-Type -AssemblyName System.Windows.Forms | Out-Null
$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Information
$notify.BalloonTipTitle = '${escapedTitle}'
$notify.BalloonTipText = '${escapedMessage}'
$notify.Visible = $true
$notify.ShowBalloonTip(3000)
Start-Sleep -Milliseconds 3500
$notify.Dispose()
`
  await ctx.$`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ${script}`.nothrow().quiet()
}

async function sendSessionNotification(ctx: Parameters<Plugin>[0], title: string, message: string): Promise<void> {
  const platform = detectPlatform()
  if (platform === "unsupported") return

  if (platform === "darwin") {
    await sendDarwinNotification(ctx, title, message)
    return
  }

  if (platform === "linux") {
    await sendLinuxNotification(ctx, title, message)
    return
  }

  await sendWindowsNotification(ctx, title, message)
}

async function sendIdleReadyNotification(ctx: Parameters<Plugin>[0], sessionID: string): Promise<void> {
  const todoState = await getSessionTodoState(ctx, sessionID)
  if (todoState !== "clear") return
  await sendSessionNotification(ctx, "OpenCode", "Agent is ready for input")
}

const ACTIVITY_EVENTS = new Set(["message.updated", "session.status"])
const QUESTION_TOOLS = new Set(["question", "ask_user_question", "askuserquestion"])

const serverPlugin: Plugin = async (input): Promise<Hooks> => {
  const sessionState = new Map<string, SessionState>()

  function getOrCreateSession(sessionID: string): SessionState {
    const existing = sessionState.get(sessionID)
    if (existing) return existing
    const created: SessionState = { isSubagent: false, idleTimer: null }
    sessionState.set(sessionID, created)
    return created
  }

  function clearIdleTimer(state: SessionState): void {
    if (!state.idleTimer) return
    clearTimeout(state.idleTimer)
    state.idleTimer = null
  }

  return {
    "tool.execute.before": async (toolInput: { tool: string; sessionID?: string | null }): Promise<void> => {
      const sessionID = typeof toolInput.sessionID === "string" && toolInput.sessionID.length > 0
        ? toolInput.sessionID
        : null
      if (!sessionID) return

      const state = getOrCreateSession(sessionID)
      if (state.isSubagent) return
      clearIdleTimer(state)

      const normalizedToolName = toolInput.tool.toLowerCase()
      if (!QUESTION_TOOLS.has(normalizedToolName)) return
      await sendSessionNotification(input, "OpenCode", "Agent is asking a question")
    },

    event: async ({ event }): Promise<void> => {
      const sessionID = getSessionId(event.properties)
      if (!sessionID) return

      const state = getOrCreateSession(sessionID)

      if (event.type === "session.created") {
        const info = (event.properties as { info?: { parentID?: string } } | undefined)?.info
        state.isSubagent = typeof info?.parentID === "string" && info.parentID.length > 0
        clearIdleTimer(state)
        return
      }

      if (event.type === "session.deleted") {
        clearIdleTimer(state)
        sessionState.delete(sessionID)
        return
      }

      if (state.isSubagent) return

      if (ACTIVITY_EVENTS.has(event.type)) {
        clearIdleTimer(state)
      }

      if (event.type !== "session.idle") return

      clearIdleTimer(state)
      state.idleTimer = setTimeout(() => {
        void sendIdleReadyNotification(input, sessionID)
      }, 1500)
    },
  }
}

const pluginModule: PluginModule = {
  id: "oh-my-openagent-bundled-notify",
  server: serverPlugin,
}

export default pluginModule
