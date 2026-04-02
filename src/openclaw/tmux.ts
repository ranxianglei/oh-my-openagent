import { spawn } from "bun"

export function getCurrentTmuxSession(): string | null {
  const env = process.env.TMUX
  if (!env) return null
  const match = env.match(/(\d+)$/)
  return match ? `session-${match[1]}` : null // Wait, TMUX env is /tmp/tmux-501/default,1234,0
  // Reference tmux.js gets session name via `tmux display-message -p '#S'`
}

export async function getTmuxSessionName(): Promise<string | null> {
  try {
    const proc = spawn(["tmux", "display-message", "-p", "#S"], {
      stdout: "pipe",
      stderr: "ignore",
    })
    const outputPromise = new Response(proc.stdout).text()
    await proc.exited
    const output = await outputPromise
    // Await proc.exited ensures exitCode is set; avoid race condition
    if (proc.exitCode !== 0) return null
    return output.trim() || null
  } catch {
    return null
  }
}

/**
 * Strip terminal probe/control sequences from captured pane text.
 * Tmux capture-pane can include ANSI CSI, OSC, and DCS sequences
 * from terminal capability probes during pane startup.
 */
export function stripTerminalProbes(text: string): string {
  return text
    // CSI sequences: ESC [ ... <letter> (device attributes, cursor position, etc.)
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
    // OSC sequences: ESC ] ... (BEL or ST) (color queries, window title, etc.)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    // DCS sequences: ESC P ... ST
    .replace(/\x1bP[^\x1b]*\x1b\\/g, "")
    // Remaining bare ESC sequences
    .replace(/\x1b[^\[\]P]/g, "")
    // Bare control characters (except newline/tab)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
}

export async function captureTmuxPane(paneId: string, lines = 15): Promise<string | null> {
  try {
    const proc = spawn(
      ["tmux", "capture-pane", "-p", "-t", paneId, "-S", `-${lines}`],
      {
        stdout: "pipe",
        stderr: "ignore",
      },
    )
    const outputPromise = new Response(proc.stdout).text()
    await proc.exited
    const output = await outputPromise
    if (proc.exitCode !== 0) return null
    const cleaned = stripTerminalProbes(output).trim()
    return cleaned || null
  } catch {
    return null
  }
}

export async function sendToPane(paneId: string, text: string, confirm = true): Promise<boolean> {
  try {
    const literalProc = spawn(["tmux", "send-keys", "-t", paneId, "-l", "--", text], {
      stdout: "ignore",
      stderr: "ignore",
    })
    await literalProc.exited
    if (literalProc.exitCode !== 0) return false

    if (!confirm) return true

    const enterProc = spawn(["tmux", "send-keys", "-t", paneId, "Enter"], {
      stdout: "ignore",
      stderr: "ignore",
    })
    await enterProc.exited
    return enterProc.exitCode === 0
  } catch {
    return false
  }
}

export async function isTmuxAvailable(): Promise<boolean> {
  try {
    const proc = spawn(["tmux", "-V"], {
      stdout: "ignore",
      stderr: "ignore",
    })
    await proc.exited
    return proc.exitCode === 0
  } catch {
    return false
  }
}

export function analyzePaneContent(content: string | null): { confidence: number } {
  if (!content) return { confidence: 0 }

  let confidence = 0
  if (content.includes("opencode")) confidence += 0.3
  if (content.includes("Ask anything...")) confidence += 0.5
  if (content.includes("Run /help")) confidence += 0.2

  return { confidence: Math.min(1, confidence) }
}
