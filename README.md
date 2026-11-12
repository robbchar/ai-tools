# ai-tools

A collection of utilities, hooks, and scripts for working with AI tools and platforms. Currently focused on [Claude Code](https://docs.anthropic.com/en/docs/claude-code), with room to grow.

## Structure

```
ai-tools/
└── claude/
    ├── hooks/
    │   └── PreToolUse/
    │       └── smart_approver.py
    └── skills/
        └── test-review/
            └── SKILL.md
```

## Claude

Tools and configuration for Claude Code, Anthropic's agentic coding CLI.

### Hooks

Claude Code supports lifecycle hooks that run before and after tool use. These live in `.claude/settings.json` and are invoked with JSON on stdin.

See the [Claude Code hooks documentation](https://docs.anthropic.com/en/docs/claude-code/hooks) for the full hook API.

#### PreToolUse

Hooks that run before Claude Code executes a tool, allowing you to approve, deny, or pass through the action.

---

##### `smart_approver.py`

Decomposes compound bash commands and checks each sub-command against the `allow`/`deny` patterns in your `settings.json`. Solves the problem of Claude Code's built-in pattern matching not handling `&&`, `||`, `;`, pipes, subshells `$()`, or git's `-C` flag.

**What it handles:**
- Compound operators: `&&`, `||`, `;`, `|`, newlines
- Subshell extraction: `$(...)`  and backticks
- git global flags: `-C /path`, `--git-dir`, `--work-tree`
- Environment variable prefixes: `FOO=bar git status`
- Heredoc stripping
- Shell structural keywords (`do`, `done`, `then`, etc.)
- Merged settings from global, project, and project-local `settings.json` layers

**Install:**

Add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python3 /path/to/ai-tools/claude/hooks/PreToolUse/smart_approver.py"
          }
        ]
      }
    ]
  }
}
```

**Verbose logging:**

```bash
SMART_APPROVER_VERBOSE=1 claude
```

---

### Skills

Personal skills for Claude Code. Install one by copying or symlinking its folder into `~/.claude/skills/`; it then runs as `/<name>`.

---

##### `test-review`

Checks whether a change's tests would fail if the behavior they cover broke. It works in a scratch worktree: it lists each rule the diff adds or changes, breaks each one twice (removes it, then miswires it), runs the related tests, and reports every break that no test catches. It also reads the new assertions for expected values built with the code under test, text matched anywhere in a row, and counts that don't check which items.

Run it after `/code-review`, which looks for bugs in the code rather than gaps in the tests:

```
/test-review [PR number | branch | base..head] [max-breaks]
```

`max-breaks` defaults to 20. Each break is a test run, so a review costs several minutes.

---

## Roadmap / Ideas

This repo is intentionally open-ended. Some directions it could grow:

- **Other Claude hooks** — PostToolUse, Notification, Stop
- **Other AI platforms** — Cursor rules, Copilot config, platform-agnostic prompt utilities
- **Prompt libraries** — Reusable system prompts or task templates
- **MCP utilities** — Helpers for building or debugging MCP servers

## Contributing

This is a personal tools repo. If something here is useful to you, feel free to adapt it.

## License

MIT