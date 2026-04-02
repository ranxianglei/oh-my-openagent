import { describe, expect, test } from "bun:test"
import { stripTerminalProbes } from "../tmux"
import { sanitizeReplyInput } from "../reply-listener"

describe("terminal probe text sanitization", () => {
  describe("stripTerminalProbes", () => {
    test("should strip CSI device attributes reply (DA)", () => {
      // given — DA reply: ESC[?64;1;2;6;22c
      const text = "normal text\x1b[?64;1;2;6;22c more text"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("normal text more text")
    })

    test("should strip CSI cursor position reply (CPR)", () => {
      // given — CPR reply: ESC[24;80R
      const text = "hello\x1b[24;80R world"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("hello world")
    })

    test("should strip OSC color query reply", () => {
      // given — OSC 4 color reply with BEL terminator
      const text = "before\x1b]4;0;rgb:0000/0000/0000\x07after"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("beforeafter")
    })

    test("should strip OSC color query reply with ST terminator", () => {
      // given — OSC 10 foreground color reply with ST (ESC\)
      const text = "before\x1b]10;rgb:ffff/ffff/ffff\x1b\\after"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("beforeafter")
    })

    test("should strip SGR color/formatting sequences", () => {
      // given — typical colored output
      const text = "\x1b[32m✓\x1b[0m test passed"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("✓ test passed")
    })

    test("should strip multiple mixed probe sequences", () => {
      // given — multiple probe replies in one capture
      const text = "\x1b[?64;1;2c\x1b]4;0;rgb:0000/0000/0000\x07\x1b[24;80Rnormal output"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("normal output")
    })

    test("should strip control characters but preserve newlines and tabs", () => {
      // given
      const text = "line1\nline2\t\x03indented\x08backspace"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("line1\nline2\tindentedbackspace")
    })

    test("should pass through clean text unchanged", () => {
      // given
      const text = "opencode\nAsk anything...\nRun /help"

      // when
      const result = stripTerminalProbes(text)

      // then
      expect(result).toBe("opencode\nAsk anything...\nRun /help")
    })

    test("should handle the exact bug report pattern (hex-like probe residue)", () => {
      // given — the pattern from issue #2887:
      // "414/21212a2/6969717/98989f9f/b3b3f2f2/f2f2414/2121"
      // This is what remains after partial escape sequence processing.
      // The actual raw bytes would include ESC sequences that produce this residue.
      // After stripping ESC sequences, only the residue digits/letters remain.
      // The key fix is preventing the ESC sequences from being captured in the first place.
      const rawWithEsc = "\x1b[?64;1;2c414/21212a2\x1b[?6n"

      // when
      const result = stripTerminalProbes(rawWithEsc)

      // then — ESC sequences stripped, residue text remains but is harmless
      expect(result).toBe("414/21212a2")
    })
  })

  describe("sanitizeReplyInput handles escape sequences", () => {
    test("should strip ANSI escape sequences from reply input", () => {
      // given
      const text = "reply text\x1b[?64;1;2c with probe"

      // when
      const result = sanitizeReplyInput(text)

      // then — escape sequence stripped, newlines collapsed to spaces
      expect(result).toBe("reply text with probe")
    })

    test("should strip OSC sequences from reply input", () => {
      // given
      const text = "before\x1b]4;0;rgb:0000/0000/0000\x07after"

      // when
      const result = sanitizeReplyInput(text)

      // then
      expect(result).toBe("beforeafter")
    })
  })
})
