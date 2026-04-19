# src/config/ — Zod v4 Schema System

**Generated:** 2026-04-18

## OVERVIEW

28 schema files composing `OhMyOpenCodeConfigSchema`. Zod v4 validation with `safeParse()`. All fields optional — omitted fields use plugin defaults.

## SCHEMA TREE

```
config/schema/
├── oh-my-opencode-config.ts    # ROOT: OhMyOpenCodeConfigSchema (composes all below)
├── agent-names.ts              # BuiltinAgentNameSchema (11), OverridableAgentNameSchema (14)
├── agent-definitions.ts        # AgentDefinitionsConfigSchema (external files)
├── agent-overrides.ts          # AgentOverrideConfigSchema (22 base fields; hephaestus adds allow_non_gpt_model)
├── categories.ts               # 8 built-in + custom categories
├── hooks.ts                    # HookNameSchema (51 hooks)
├── skills.ts                   # SkillsConfigSchema (sources, paths, recursive)
├── commands.ts                 # BuiltinCommandNameSchema
├── experimental.ts             # Feature flags (plugin_load_timeout_ms min 1000)
├── sisyphus.ts                 # SisyphusConfigSchema (task system)
├── sisyphus-agent.ts           # SisyphusAgentConfigSchema
├── ralph-loop.ts               # RalphLoopConfigSchema
├── tmux.ts                     # TmuxConfigSchema + TmuxLayoutSchema
├── websearch.ts                # provider: "exa" | "tavily"
├── claude-code.ts              # CC compatibility settings
├── comment-checker.ts          # AI comment detection config
├── git-master.ts               # commit_footer: boolean | string
├── browser-automation.ts       # provider: playwright | agent-browser | dev-browser | playwright-cli
├── background-task.ts          # Concurrency limits per model/provider
├── fallback-models.ts          # FallbackModelsConfigSchema
├── runtime-fallback.ts         # RuntimeFallbackConfigSchema
├── babysitting.ts              # Unstable agent monitoring
├── dynamic-context-pruning.ts  # Context pruning settings
├── start-work.ts              # StartWorkConfigSchema (auto_commit)
├── openclaw.ts                # OpenClaw integration settings
├── git-env-prefix.ts          # Git environment prefix config
├── model-capabilities.ts      # Model capabilities config
└── internal/permission.ts      # AgentPermissionSchema

```

## ROOT SCHEMA FIELDS (34)

`$schema`, `new_task_system_enabled`, `default_run_agent`, `agent_definitions`, `disabled_mcps`, `disabled_agents`, `disabled_skills`, `disabled_hooks`, `disabled_commands`, `disabled_tools`, `mcp_env_allowlist`, `hashline_edit`, `model_fallback`, `agents`, `categories`, `claude_code`, `sisyphus_agent`, `comment_checker`, `experimental`, `auto_update`, `skills`, `ralph_loop`, `runtime_fallback`, `background_task`, `model_capabilities`, `openclaw`, `babysitting`, `git_master`, `browser_automation_engine`, `websearch`, `tmux`, `sisyphus`, `start_work`, `_migrations`

## AGENT OVERRIDE FIELDS (22)

`model`, `fallback_models`, `variant`, `category`, `skills`, `temperature`, `top_p`, `prompt`, `prompt_append`, `tools`, `disable`, `description`, `mode`, `color`, `permission`, `maxTokens`, `thinking`, `reasoningEffort`, `textVerbosity`, `providerOptions`, `ultrawork`, `compaction`

Note: `hephaestus` extends this base schema with `allow_non_gpt_model`.

## HOW TO ADD CONFIG

1. Create `src/config/schema/{name}.ts` with Zod schema
2. Add field to `oh-my-opencode-config.ts` root schema
3. Reference via `z.infer<typeof YourSchema>` for TypeScript types
4. Access in handlers via `pluginConfig.{name}`
