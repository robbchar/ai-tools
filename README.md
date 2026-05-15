# ai-tools

A collection of utilities, hooks, and scripts for working with AI tools and platforms. Currently focused on [Claude Code](https://docs.anthropic.com/en/docs/claude-code), with room to grow.

## Structure

```
ai-tools/
└── claude/
    └── hooks/
        └── PreToolUse/
            └── smart_approve.py
```

## Claude

Tools and configuration for Claude Code, Anthropic's agentic coding CLI.

### Hooks

Claude Code supports lifecycle hooks that run before and after tool use. These live in `.claude/settings.json` and are invoked with JSON on stdin.

See the [Claude Code hooks documentation](https://docs.anthropic.com/en/docs/claude-code/hooks) for the full hook API.

#### PreToolUse

Hooks that run before Claude Code executes a tool, allowing you to approve, deny, or pass through the action.

---

##### `smart_approve.py`

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
            "command": "python3 /path/to/ai-tools/claude/hooks/PreToolUse/smart_approve.py"
          }
        ]
      }
    ]
  }
}
```

**Verbose logging:**

```bash
SMART_APPROVE_VERBOSE=1 claude
```

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