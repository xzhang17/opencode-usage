# Dual deterministic command surfaces

## Status

Accepted.

## Context

OpenCode exposes slash commands through more than one UI path.

The TUI can register local palette/slash commands through the TUI plugin. Those commands can render deterministic output in local dialogs without calling a model and without writing command output to the OpenCode session transcript.

OpenCode web and desktop discover plugin commands from the server config command registry (`cfg.command`). If opencode-quota only registers TUI dialog commands, web and desktop users cannot reliably discover or run `/quota`, `/quota_status`, `/quota_announcements`, `/pricing_refresh`, or `/tokens_*`. That caused the web/desktop command regression tracked by the issue #139 work.

The server command execution hook has an important upstream limitation: `command.execute.before` has no clean handled/cancel return. If a plugin returns normally, OpenCode continues into the normal prompt/model path. To stop continuation today, a plugin must throw. That behavior can surface harmless web/desktop popup or log noise, as described in [anomalyco/opencode#18554](https://github.com/anomalyco/opencode/issues/18554). [anomalyco/opencode#18559](https://github.com/anomalyco/opencode/pull/18559) tracks the upstream cancellation support that could make this cleaner in the future.

## Decision

Use dual deterministic command surfaces.

1. The server plugin registers every command in `QUOTA_DIALOG_COMMANDS` into `cfg.command` for web/desktop discovery.
2. The server `command.execute.before` hook handles those commands by:
   - building deterministic output with `buildQuotaDialogCommandOutput()`;
   - injecting visible ignored/no-reply output with `session.prompt({ noReply: true, ignored: true })` when output exists;
   - throwing the branded `handled()` sentinel after output or no-op handling so OpenCode does not continue to the model.
3. The TUI plugin keeps its separate dialog implementation. TUI slash/palette commands continue to render local dialogs and must not call `session.prompt()`.

The shared command-output builder remains the source of truth for command content across both surfaces.

## Consequences

- Web and desktop regain deterministic slash command discovery and execution.
- TUI commands keep the cleaner dialog behavior with no session transcript write.
- Server/web/desktop command output is inserted as ignored/no-reply session output so it remains visible without polluting future model context.
- Server/web/desktop commands may produce popup/log noise until OpenCode provides a clean command cancellation API.
- If anomalyco/opencode#18559 or a later upstream API provides clean cancellation, the server path can replace the thrown sentinel while preserving the same command registration and shared output builder.
