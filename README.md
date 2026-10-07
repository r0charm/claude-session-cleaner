# claude-session-cleaner

[![checks](https://github.com/r0charm/claude-session-cleaner/actions/workflows/checks.yml/badge.svg)](https://github.com/r0charm/claude-session-cleaner/actions/workflows/checks.yml)

A Claude Code plugin that adds `/sessions`: a picker to filter and delete your sessions.

```
1. Browse
┌──────────────────────────────────────────────────────────────────────┐
│ Sessions (Current Folder)                    ● Current Folder | ○ All│
│ ↑↓ move · enter or d delete · shift+tab scope · esc close            │
│ > : filter                                                           │
│   add pagination to the orders API                           412K 2h │
│ ▶ fix flaky login test                                        88K 3d │
│   refactor auth middleware                                     1M 2w │
│ Claude Code deletes sessions older than 30 days (cleanupPeriodDays) [3]│
└──────────────────────────────────────────────────────────────────────┘
                │ d or enter
                ▼
2. Confirm
┌──────────────────────────────────────────────────────────────────────┐
│ Delete "fix flaky login test"? transcript + 2 more                   │
│   (file-history, todos) · enter confirm · esc cancel                 │
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
        │ enter                                   │ esc
        ▼                                         ▼
3. Deleted                                    back to 1, same row
┌──────────────────────────────────────────────────────────────────────┐
│ deleted: fix flaky login test · 2M freed                             │
│ > : filter                                                           │
│   add pagination to the orders API                           412K 2h │
│ ▶ refactor auth middleware                                     1M 2w │
│ Claude Code deletes sessions older than 30 days (cleanupPeriodDays) [2]│
└──────────────────────────────────────────────────────────────────────┘
```

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

## Install

```
/plugin install session-cleaner --marketplace r0charm/claude-session-cleaner
```

Answer `y` to add the marketplace, then pick a scope. Needs Claude Code 2.1.287 or newer, the release that added plugin mods; 2.1.290 or newer is safest. Mods are early access in Claude Code, so a later release may change what the plugin relies on.

To try it from a checkout without installing:

```
claude --plugin-dir /path/to/claude-session-cleaner
```
