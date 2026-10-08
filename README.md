# session-cleaner

[![checks](https://github.com/r0charm/claude-session-cleaner/actions/workflows/checks.yml/badge.svg)](https://github.com/r0charm/claude-session-cleaner/actions/workflows/checks.yml)

A Claude Code plugin that adds `/sessions`: a picker to filter and delete your sessions.

![The sessions picker](docs/sessions.png)

![Confirming a delete](docs/confirm.png)

## Keys

- type: filter by title, id or folder
- `↑` `↓`: move between the filter and the sessions
- `enter` or `d` on a session: ask to delete it, then `enter` confirms, `esc` cancels
- `enter` on the filter: select the first match (the filter clears)
- `shift+tab` from the filter to the scope toggle, then `enter`: current folder or all
- `esc`: close

To resume a session, use Claude Code's own `/resume`.

To open it straight from a terminal:

```
claude /sessions
```

or, with `alias sessions='claude /sessions'` in your shell profile, just `sessions`.

## What it reads, runs and sends

It sends nothing anywhere: no network calls, and none of the programs below reach the network. Everything stays inside your Claude Code configuration directory (`$CLAUDE_CONFIG_DIR`, else `~/.claude`).

Reads, with Claude Code's file calls:

- `projects/`: the session transcripts, their names, sizes and dates
- `sessions/*.json`: which sessions are running, so they are hidden
- `settings.json` (global and the folder's `.claude/`): `cleanupPeriodDays`
- the per-session folders listed below, to size them before a delete

Runs these programs, each by name with its own arguments, never through a shell:

- `grep -E -m 16 -e '"type": ?"user"' -- <transcript>` and `grep -E -e '"type": ?"(custom-title|summary|last-prompt)"' -- <transcript>`: read a session's title without loading the whole transcript
- `ps -o pid= -p <pids>`: check which recorded Claude Code processes are still alive, so a running session is never offered for deletion
- `du -sk -- <paths>`: size what a delete would free, shown in the confirm line
- `rm -rf -- <paths>`: the delete, only after you confirm it. The paths are the session's transcript `projects/<folder>/<id>.jsonl` and, where present, `projects/<folder>/<id>/`, `session-env/<id>`, `file-history/<id>`, `tasks/<id>`, `debug/<id>.txt` and `todos/<id>-*.json`. Every path contains the session's id.

Hooks:

- `session.start`: registers the `/sessions` command
- `command.run` (only `/sessions`): opens the picker
- `ui.focus`, `ui.close`, `ui.render` (only the picker's own pane): track the selected row, turn `esc` during a confirm into a cancel, and draw the picker

## Install

```
/plugin install session-cleaner --marketplace r0charm/claude-session-cleaner
```

Answer `y` to add the marketplace, then pick a scope. Needs Claude Code 2.1.287 or newer, the release that added plugin mods; 2.1.290 or newer is safest. Mods are early access in Claude Code, so a later release may change what the plugin relies on.

To try it from a checkout without installing:

```
claude --plugin-dir /path/to/claude-session-cleaner
```
