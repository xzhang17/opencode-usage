<p align="center">
  <a href="https://github.com/xzhang17/opencode-usage/tree/opencode-customized">
    <picture>
      <source srcset="opencode-quota-logo-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="opencode-quota-logo-light.svg" media="(prefers-color-scheme: light)">
      <img src="opencode-quota-logo-light.svg" alt="OpenCode Quota logo">
    </picture>
  </a>
</p>
<p align="center">Quota, usage, and token visibility for OpenCode and CLI.</p>
<p align="center">
  <a href="https://github.com/xzhang17/opencode-usage/actions/workflows/ci.yml"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/xzhang17/opencode-usage/ci.yml?style=flat-square&branch=opencode-customized&label=CI" /></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" /></a>
</p>

[![OpenCode Quota sidebar](https://shawnkiser.com/opencode-quota/opencode-quota-sidebar.webp)](https://github.com/xzhang17/opencode-usage/tree/opencode-customized)

---

## Quick start

Clone and build the customized branch in the global OpenCode plugin directory:

```bash
git clone --branch opencode-customized https://github.com/xzhang17/opencode-usage.git ~/.config/opencode/plugins/opencode-usage
cd ~/.config/opencode/plugins/opencode-usage
pnpm install --frozen-lockfile
pnpm run build
```

Add the server entry to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["./plugins/opencode-usage/index.js"]
}
```

Add the local TUI entry to `~/.config/opencode/tui.json`:

```json
{
  "plugin": ["./plugins/opencode-usage/tui.tsx"]
}
```

> [!IMPORTANT]
> OpenCode `>= 1.4.3` and Node.js `>= 20` are required.

1. Restart OpenCode.
2. Run `/usage` in OpenCode, or use `opencode-usage show` from your terminal.
3. If you enabled the Sidebar panel, open the session sidebar and look for `Quota`.
4. If you enabled Compact status line, look for the home-bottom quota line and the chat/session prompt quota line.
5. If something looks wrong, see [Troubleshooting](docs/readme/troubleshooting.md).

## Update OpenCode Quota safely

1. Close OpenCode.
2. Run:

   ```bash
   npx @slkiser/opencode-quota@latest update
   ```

3. Review the exact config edits and cache directories, then confirm.
4. Restart OpenCode.

Use `--dry-run` to preview without changing anything. Use `--yes` only for explicit noninteractive confirmation. The update command changes only canonical OpenCode Quota plugin entries and removes only verified OpenCode Quota cache directories; it preserves settings, JSONC comments, tuple options, and other plugins.

## What you get

<table>
  <tr>
    <td width="50%">
      <img src="https://shawnkiser.com/opencode-quota/opencode-quota-sidebar.webp" alt="OpenCode Quota TUI sidebar panel" />
    </td>
    <td width="50%">
      <img src="https://shawnkiser.com/opencode-quota/opencode-quota-toast.webp" alt="OpenCode Quota popup toast" />
    </td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>Sidebar panel</strong><br />A full quota view in OpenCode's session sidebar.</td>
    <td width="50%" align="center"><strong>Toast</strong><br />Popup quota checks after idle, question, or compact events.</td>
  </tr>
  <tr>
    <td width="50%">
      <img src="https://shawnkiser.com/opencode-quota/opencode-quota-statusbar.webp" alt="OpenCode Quota TUI status line" />
    </td>
    <td width="50%">
      <img src="https://shawnkiser.com/opencode-quota/opencode-quota-tokens-command.webp" alt="OpenCode Quota token report" />
    </td>
  </tr>
  <tr>
    <td width="50%" align="center"><strong>Compact status line</strong><br />Short quota text on home and chat/session prompt surfaces.</td>
    <td width="50%" align="center"><strong>Token reports</strong><br /><code>/tokens_today</code>, <code>/tokens_weekly</code>, session reports, and more.</td>
  </tr>
</table>

More ways to use it:

- Terminal checks with `opencode-usage show` before or without opening OpenCode
- JSON output for scripts, status bars, CI checks, and external tools
- Deterministic local `/usage` output in the TUI without model invocation
- Provider diagnostics for auth, quota sources, pricing, and bundled maintainer announcements

See [Configuration](docs/readme/configuration.md) for UI options and [Manual install](docs/readme/manual-install.md) for setup details.

## Commands

### TUI command

The customized TUI registers only one command. It renders deterministic local output without calling the model or adding output to model context.

| Command  | Use when                          |
| -------- | --------------------------------- |
| `/usage` | Show subscription usage and quota |

### CLI commands

| Command                                        | Use when                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `opencode-usage update`                        | Preview and confirm a scoped OpenCode Usage update                    |
| `opencode-usage update --dry-run`              | Preview exact config and cache targets without changing them          |
| `opencode-usage show`                          | Check quota from your terminal                                        |
| `opencode-usage show --provider <id>`          | Check one provider only, such as `copilot` or `openai`                |
| `opencode-usage show --json`                   | Print JSON for scripts, status bars, and other tools                  |
| `opencode-usage show --json --threshold <pct>` | Fail the command when cached quota drops below your chosen percentage |

## Providers

Most providers work automatically. If a provider has a “Needs setup” link, open that setup note only if you use that provider.

| Provider                 | Auth/setup                                                     | Source             | Reports         |
| ------------------------ | -------------------------------------------------------------- | ------------------ | --------------- |
| Anthropic (Claude)       | [Needs setup](docs/readme/providers.md#anthropic-claude)       | Local CLI/OAuth    | Usage/quota     |
| GitHub Copilot           | OpenCode OAuth or PAT                                          | Remote API         | Quota/usage     |
| OpenAI                   | Automatic                                                      | Remote API         | Usage/quota     |
| Cursor                   | [Needs setup](docs/readme/providers.md#cursor)                 | Local estimate     | Estimated quota |
| Qwen Code                | [Needs setup](docs/readme/providers.md#qwen-code)              | Local estimate     | Estimated quota |
| Alibaba Coding Plan      | OpenCode config                                                | Local estimate     | Estimated quota |
| MiniMax Coding Plan      | OpenCode config                                                | Remote API         | Usage/quota     |
| MiniMax Coding Plan (CN) | OpenCode config                                                | Remote API         | Usage/quota     |
| Kimi Code                | OpenCode config                                                | Remote API         | Usage/quota     |
| Chutes AI                | API key/config                                                 | Remote API         | Usage/quota     |
| Synthetic                | Automatic                                                      | Remote API         | Quota           |
| Google Antigravity       | [Needs setup](docs/readme/providers.md#google-antigravity)     | Remote API         | Usage/quota     |
| Google AGY               | [Needs setup](docs/readme/providers.md#google-agy-quick-setup) | Remote API         | Usage/quota     |
| Gemini CLI               | [Needs setup](docs/readme/providers.md#gemini-cli)             | Remote API         | Usage/quota     |
| Z.ai Coding Plan         | OpenCode config                                                | Remote API         | Usage/quota     |
| Zhipu Coding Plan        | OpenCode config                                                | Remote API         | Usage/quota     |
| NanoGPT                  | API key/config                                                 | Remote API         | Usage + balance |
| DeepSeek                 | API key/config                                                 | Remote API         | Balance/status  |
| Ollama Cloud             | [Needs setup](docs/readme/providers.md#ollama-cloud)           | Dashboard scraping | Dashboard usage |
| OpenCode Go              | [Needs setup](docs/readme/providers.md#opencode-go)            | Dashboard scraping | Dashboard usage |

Setup details live in the [Provider setup guide](docs/readme/providers.md).

## Troubleshooting

Start here when quota or token data looks wrong:

1. Run `/quota_status`, or start with `opencode-quota show` for a terminal quota summary.
2. Confirm the expected provider appears in the detected provider list.
3. Confirm companion auth plugins are before `@slkiser/opencode-quota` in `opencode.json`.
4. If token reports are empty, start OpenCode once so it creates `opencode.db`, then run a session with model usage.
5. Check [Troubleshooting](docs/readme/troubleshooting.md) for common symptoms and provider-specific fixes.

## Reference

- [Manual install](docs/readme/manual-install.md)
- [Configuration](docs/readme/configuration.md)
- [Providers](docs/readme/providers.md)
- [Troubleshooting](docs/readme/troubleshooting.md)
- [External integration](docs/readme/external-integration.md)

## Contributors

Thanks to everyone who has contributed to OpenCode Quota.

<a href="https://github.com/slkiser/opencode-quota/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=slkiser/opencode-quota" />
</a>

## License

MIT

## Remarks

OpenCode Quota is not built by the OpenCode team and is not affiliated with OpenCode or any provider listed above.

## Star history

![Star History Chart](https://shawnkiser.com/opencode-quota/star-history-2026710.webp)
