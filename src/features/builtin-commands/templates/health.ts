export const HEALTH_TEMPLATE = `# Health Command

## Purpose

Ping each configured model provider with a tiny request and report latency and connectivity status. Useful for debugging provider connectivity, authentication failures, and rate limiting.

---

# PHASE 1: DISCOVER CONFIGURED PROVIDERS

Read the OpenCode configuration to enumerate the providers the user has set up.

Configuration locations to check, in order:
1. Project: \`.opencode/opencode.json\` or \`.opencode/opencode.jsonc\`
2. User: \`~/.config/opencode/opencode.json\` or \`~/.config/opencode/opencode.jsonc\`

Use the Read tool to load whichever file exists. If both exist, the project file takes precedence but you should still check the user file for additional providers.

Look for the top-level \`provider\` object. Each key under it is a provider id (for example \`anthropic\`, \`openai\`, \`google\`, \`openrouter\`, \`groq\`, \`deepseek\`, \`xai\`, \`mistral\`, \`cohere\`, \`opencode\`, etc.). Each value can have:
- \`options.baseURL\` - custom endpoint (use this when present)
- \`options.apiKey\` - API key (NEVER print this in output)
- \`models\` - object whose keys are model ids

If no \`provider\` block exists, inform the user that no providers are configured in opencode.json and stop.

---

# PHASE 2: RESOLVE ENDPOINT FOR EACH PROVIDER

For each discovered provider, determine the health check endpoint. Prefer the cheapest read-only endpoint that still validates auth.

| Provider id            | Default base URL                              | Health endpoint suffix |
|------------------------|-----------------------------------------------|------------------------|
| anthropic              | https://api.anthropic.com                     | /v1/models             |
| openai                 | https://api.openai.com                        | /v1/models             |
| google                 | https://generativelanguage.googleapis.com     | /v1beta/models         |
| openrouter             | https://openrouter.ai/api                     | /v1/models             |
| groq                   | https://api.groq.com/openai                   | /v1/models             |
| deepseek               | https://api.deepseek.com                      | /v1/models             |
| xai                    | https://api.x.ai                              | /v1/models             |
| mistral                | https://api.mistral.ai                        | /v1/models             |
| cohere                 | https://api.cohere.com                        | /v1/models             |
| together               | https://api.together.xyz                      | /v1/models             |
| fireworks              | https://api.fireworks.ai/inference            | /v1/models             |
| perplexity             | https://api.perplexity.ai                     | /v1/models             |
| opencode               | https://opencode.ai                           | /                      |

Rules:
- If the provider config has \`options.baseURL\`, use that instead of the default.
- If the provider id is not in the table above, default to \`<baseURL>/v1/models\` if \`baseURL\` is set, otherwise mark the provider as \`unknown\` and skip the network call.

---

# PHASE 3: PING EACH PROVIDER

For each provider, run a single curl call via the Bash tool. Use the smallest possible request (HTTP GET, no body) and a 5 second timeout.

Construct the auth header per provider id:
- \`anthropic\`: \`-H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01"\`
- \`google\`: append \`?key=$KEY\` to the URL, no Authorization header
- everything else: \`-H "Authorization: Bearer $KEY"\`

Read the API key from the appropriate environment variable when the config does not contain \`options.apiKey\`. Common env var names:
- \`ANTHROPIC_API_KEY\`, \`OPENAI_API_KEY\`, \`GOOGLE_API_KEY\` / \`GEMINI_API_KEY\`, \`OPENROUTER_API_KEY\`, \`GROQ_API_KEY\`, \`DEEPSEEK_API_KEY\`, \`XAI_API_KEY\`, \`MISTRAL_API_KEY\`, \`COHERE_API_KEY\`, \`TOGETHER_API_KEY\`, \`FIREWORKS_API_KEY\`, \`PERPLEXITY_API_KEY\`

Bash command template (do NOT echo the key):

\`\`\`
curl -sS -o /dev/null \\
  --max-time 5 \\
  -w "%{http_code} %{time_total}" \\
  -H "Authorization: Bearer $API_KEY" \\
  "$ENDPOINT"
\`\`\`

The output is two whitespace-separated values: HTTP status code and total time in seconds.

Interpret results:
- HTTP \`200\`-\`299\`: status \`ok\`
- HTTP \`401\` / \`403\`: status \`auth_failed\` (reachable, key is bad or missing)
- HTTP \`429\`: status \`rate_limited\`
- HTTP \`5xx\`: status \`server_error\`
- curl exit non-zero or empty status: status \`unreachable\`

Convert latency to milliseconds (multiply by 1000, round to nearest integer).

CRITICAL SAFETY RULES:
- Never include the API key value in the printed output.
- Never write the API key to a file or to the terminal. Pass it through environment variables only.
- Do not call any endpoint that costs tokens (chat completions, messages, etc). Only the listed read-only endpoints.

---

# PHASE 4: REPORT RESULTS

Print a single Markdown table with one row per configured provider:

\`\`\`
| Provider | Endpoint | Status | HTTP | Latency |
|----------|----------|--------|------|---------|
| anthropic | https://api.anthropic.com/v1/models | ok | 200 | 142 ms |
| openai | https://api.openai.com/v1/models | auth_failed | 401 | 89 ms |
| google | https://generativelanguage.googleapis.com/v1beta/models | unreachable | - | - |
\`\`\`

After the table, add a short \`Summary\` line: \`<N> ok / <N> failing / <N> total\`.

If any provider returned \`auth_failed\`, \`server_error\`, or \`unreachable\`, add a \`Suggested next steps\` section with one bullet per failing provider explaining the most likely cause (missing env var, wrong base URL, network firewall, expired key).

---

# IMPORTANT CONSTRAINTS

- Read-only command: do not modify any file.
- Do not call delegate_task, ralph_loop, or any background agent.
- Do not retry failed pings - one attempt per provider is enough.
- Total wall time budget: under 30 seconds.
- The user must be able to run /health from any directory; tolerate missing project config gracefully.
`
