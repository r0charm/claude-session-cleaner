# claude-session-cleaner

[![checks](https://img.shields.io/github/actions/workflow/status/r0charm/claude-session-cleaner/checks.yml?branch=main&label=checks)](https://github.com/r0charm/claude-session-cleaner/actions/workflows/checks.yml) [![version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fr0charm%2Fclaude-session-cleaner%2Fmain%2F.claude-plugin%2Fplugin.json&query=%24.version&label=version)](.claude-plugin/plugin.json) [![license](https://img.shields.io/github/license/r0charm/claude-session-cleaner)](LICENSE)

A Claude Code plugin that adds `/sessions`: a picker to filter and delete your sessions.

- **Filter, then delete**: by title, id or folder, in the current folder or all of them, with a confirm before anything goes.
- **Safe by default**: running sessions are hidden, and only paths named by the session id are removed.
- **Local only**: no network calls, no shell; it touches nothing outside your Claude Code configuration directory.

![The sessions picker](docs/sessions.png)

## Installation

Requires Claude Code 2.1.287 or newer, the release that added plugin mods; 2.1.290 or newer is safest.

<details>
<summary><strong>Claude Code</strong></summary>

```
/plugin install session-cleaner --marketplace r0charm/claude-session-cleaner
```

Answer `y` to add the marketplace, then pick a scope.

</details>

<details>
<summary><strong>From a clone</strong> (to try it without installing)</summary>

```
claude --plugin-dir /path/to/claude-session-cleaner
```

</details>

## Usage

In a session, `/sessions`; from a terminal, `claude /sessions`.

- type: filter by title, id or folder
- `↑` `↓`: move between the filter and the sessions
- `enter` or `d` on a session: ask to delete it, then `enter` confirms, `esc` cancels
- `enter` on the filter: select the first match (the filter clears)
- `shift+tab` from the filter to the scope toggle, then `enter`: current folder or all
- `esc`: close

![Confirming a delete](docs/confirm.png)

## What it runs and sends

It sends nothing: no network calls. It works only inside your Claude Code configuration directory (`$CLAUDE_CONFIG_DIR`, else `~/.claude`), and runs these programs directly, never through a shell:

| Program | Why |
|---|---|
| `grep` | read a session's title without loading the whole transcript |
| `ps` | hide sessions that are still running |
| `rm -rf --` | the delete, after you confirm: the session's transcript and its leftover folders, only paths named by the session id |

Hooks: `session.start` registers `/sessions`, `command.run` opens the picker on `/sessions` only, and `ui.focus`, `ui.close`, `ui.render` act on the picker's own pane only.

## What it does not do

- Resume a session: use Claude Code's own `/resume`.
- Undo a delete: the files are removed, not moved.
- Promise stability across Claude Code releases: mods are early access, so a later release may change what the plugin relies on.

## License

[MIT](LICENSE)
