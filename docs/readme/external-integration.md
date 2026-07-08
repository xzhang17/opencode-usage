# External integration

[← Back to README](../../README.md)

Use this when another tool needs quota data: shell scripts, tmux, Starship, CI, status bars, or routers.

There are two ways to get the same JSON data:

| Use this | When you want |
| --- | --- |
| `opencode-quota show --json` | A command that prints quota JSON now |
| Export file | A file other tools can read repeatedly without running a command every time |

Both use the local provider cache. They do **not** make extra provider network requests.

## Option 1: print JSON now

```bash
opencode-quota show --json
```

Common variants:

```bash
# One provider only
opencode-quota show --json --provider copilot

# Fail if comparable cached quota is below 5%
opencode-quota show --json --threshold 5
```

Threshold exits:

| Exit | Meaning |
| --- | --- |
| `0` | Quota is available and above the threshold |
| `1` | At least one comparable cached provider is below the threshold |
| `2` | No cached percentage was available to compare |

## Option 2: write an export file

Use this when a status bar or background tool reads quota often.

Add this to `opencode-quota/quota-toast.json`:

```jsonc
{
  "export": {
    "enabled": true
  }
}
```

Default output path:

```text
$XDG_CACHE_HOME/opencode/quota-export.json
```

Usually that means:

```text
~/.cache/opencode/quota-export.json
```

The TUI updates this file after each home-bottom background refresh, about every 60 seconds. Write errors are logged as warnings and never break TUI rendering.

## Copy-paste examples

### CI: stop when quota is low

```bash
npx @slkiser/opencode-quota show --json --threshold 5
```

### Shell: branch on Copilot quota

```bash
PCT=$(opencode-quota show --json | jq '.providers["copilot"].entries[0].percentRemaining')
(( ${PCT%.*} < 10 )) && echo "Low quota, skipping." && exit 0
```

### tmux: read the export file

```bash
set -g status-interval 30
set -g status-right '#(jq -r "[.providers|to_entries[]|select(.value.status==\"ok\")|(.value.entries[0].percentRemaining|floor|tostring)+\"%\"]|join(\" · \")" ~/.cache/opencode/quota-export.json 2>/dev/null)'
```

### Starship: run the JSON command

```toml
[custom.quota]
command = "opencode-quota show --json 2>/dev/null | jq -r '[.providers|to_entries[]|select(.value.status==\"ok\")|(.value.entries[0].percentRemaining|floor|tostring)+\"%\"]|join(\" \")'"
when = "true"
interval = 60
```

<details>
<summary><strong>JSON shape</strong></summary>

Both `show --json` and the export file use this structure:

```jsonc
{
  "version": 1,
  "exportedAt": 1748736000,
  "fromCache": true,
  "cacheAgeSeconds": 42,
  "providers": {
    "copilot": {
      "status": "ok",
      "fetchedAt": 1748735958,
      "entries": [
        {
          "name": "Premium Requests",
          "window": "Monthly",
          "percentRemaining": 62.3,
          "resetAt": 1748908800,
          "unlimited": false
        }
      ]
    },
    "opencode-go": {
      "status": "error",
      "fetchedAt": 1748735958,
      "error": "Request timeout after 5000ms"
    },
    "anthropic": {
      "status": "unavailable"
    }
  }
}
```

Provider statuses:

| Value | Meaning |
| --- | --- |
| `ok` | Cached fetch succeeded; `entries` is populated |
| `error` | Cached fetch failed; `error` has the message |
| `unavailable` | No cached quota is available |

Optional fields:

- `window` appears only when the provider reports a reset window.
- `percentRemaining` is absent for value-only rows.
- `resetAt` is absent when the provider does not report a reset time.

</details>

<details>
<summary><strong>More integration ideas</strong></summary>

### File watcher: refresh only when the export changes

```bash
# macOS
fswatch -o ~/.cache/opencode/quota-export.json | xargs -I{} my-status-refresh

# Linux
inotifywait -m -e close_write ~/.cache/opencode/quota-export.json \
  | while read; do my-status-refresh; done
```

### Router: pick the provider with the most headroom

```python
import json, subprocess

data = json.loads(subprocess.check_output(
    ["opencode-quota", "show", "--json"], timeout=1
))
best = max(
    (k for k, v in data["providers"].items() if v["status"] == "ok"),
    key=lambda k: next(
        (e.get("percentRemaining", 0) for e in data["providers"][k]["entries"]), 0
    ),
    default=None,
)
```

</details>
