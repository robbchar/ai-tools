# ai-tools

A collection of utilities, hooks, and scripts for working with AI tools and platforms. Currently focused on [Claude Code](https://docs.anthropic.com/en/docs/claude-code), with room to grow.

## Structure

```
ai-tools/
└── claude/
    ├── Claude.md
    ├── agents/
    │   ├── Explore.md
    │   ├── diff-reviewer.md
    │   ├── scout.md
    │   ├── sleuth.md
    │   └── test-runner.md
    ├── hooks/
    │   └── PreToolsUse/
    │       ├── smart_approver.py
    │       └── test_smart_approver.py
    ├── mods/
    │   └── term-here/
    └── skills/
        ├── challenge-review/
        │   ├── SKILL.md
        │   ├── adversary-prompt.md
        │   └── lenses/
        ├── deep-review/
        │   └── SKILL.md
        ├── drift-check/
        │   ├── SKILL.md
        │   ├── removed_names.py
        │   └── workflow_paths.py
        └── test-review/
            └── SKILL.md
```

## Claude

Tools and configuration for Claude Code, Anthropic's agentic coding CLI.

### Agents

Subagent definitions that Claude hands work to; you don't call them yourself. Install one by copying or symlinking its file into `~/.claude/agents/`.

- **`Explore`**: read-only codebase exploration on a fast model. Returns file paths, line numbers and how the pieces connect.
- **`diff-reviewer`**: a cold review of a change set by a reviewer that doesn't know why the code was written that way. Reports findings only as concrete failure scenarios.
- **`scout`**: answers "where is X" and "how is Y wired" with `file:line` anchors, never file contents.
- **`sleuth`**: reproduces a failing build, test or command in its own worktree and narrows it to a cause. Returns the diagnosis and a suggested fix, not the fix.
- **`test-runner`**: runs tests, lint and typecheck after a change and reports only the failures.

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
            "command": "python3 /path/to/ai-tools/claude/hooks/PreToolsUse/smart_approver.py"
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

### Mods

Claude Code plugins, each loaded from its folder through `CLAUDE_CODE_PLUGIN_DIRS`. Each has its own README with setup steps.

---

##### `term-here`

Opens a terminal at the directory Claude is working in: a band above the prompt with Terminal and Copy buttons, `/term` to open a terminal there, and `/cwd` to copy the path. Setup: [claude/mods/term-here/README.md](claude/mods/term-here/README.md).

---

### Skills

Personal skills for Claude Code. Install one by copying or symlinking its folder into `~/.claude/skills/`; it then runs as `/<name>`.

A full review is `/code-review`, `/test-review` and `/drift-check`, then `/challenge-review` over what they found. `/deep-review` runs that flow in one command.

---

##### `deep-review`

Runs the review flow in one command: the finders in parallel (`/test-review` and `/drift-check` as background subagents while `/code-review` runs), then `/challenge-review` over everything they found. It ends with a numbered fix list and changes nothing until you pick.

```
/deep-review [PR number | branch | base..head] [quick | standard | full]
```

| Level | Runs | Roughly |
|---|---|---|
| `quick` | `/code-review` (medium), then the audit | ~200–250k tokens, ~15 min |
| `standard` (default) | adds `/test-review`, and `/drift-check` when the diff removes or renames something or touches workflows; `/code-review` at high | ~350–400k tokens, ~20 min |
| `full` | always `/drift-check`, `/code-review` at xhigh, and the three focus passes | ~700k+ tokens, ~30–40 min |

The token and time figures are estimates from test runs of the parts, not from a full run.

---

##### `challenge-review`

Hardens the findings a review has produced before anything is posted or fixed:

- **Focus passes**, one subagent each for failure paths, data exposure and permissions. Each must list every item in scope (each operation, sink or API call) and give an outcome for every one, so it can't stop after its first few finds.
- **An evidence bar**: a High or Medium finding needs a repro that was actually run, or a code change no test caught. Otherwise it's capped at Low and tagged unverified.
- **An audit round**: a fresh subagent gets the findings numbered, with no reviewer names, and confirms or refutes each one, checks each proposed fix, and reconsiders dismissed findings.

Every subagent works in a scratch worktree, so it can't read plans or notes left in your own tree.

```
/challenge-review [PR number | branch | base..head] [failure-paths,data-exposure,permissions | none]
```

---

##### `drift-check`

Finds what still believes the state a change removed:

- **Removed names**: `removed_names.py` lists definitions the diff removed or renamed (functions, classes, keys and fields, flags, env vars, Terraform blocks, headings, files) and every remaining mention. The model then sorts each mention: stale doc, misleading comment, possible dead reference, or expected.
- **Workflow path filters**: `workflow_paths.py` finds files a GitHub workflow uses, directly or through a called workflow, that its own `paths:` filter won't run for.

Neither script hardcodes a repo layout: a token counts as a path only if it names a tracked file or folder. Data, lock and binary files are never read, and the project's off-limits paths go in with `--exclude`. The scripts need Python 3 and PyYAML.

```
/drift-check [PR number | branch | base..head]
```

---

##### `test-review`

Checks whether a change's tests would fail if the behavior they cover broke. It works in a scratch worktree: it lists each rule the diff adds or changes, breaks each one twice (removes it, then miswires it), runs the related tests, and reports every break that no test catches. It also reads the new assertions for expected values built with the code under test, text matched anywhere in a row, and counts that don't check which items.

Run it after `/code-review`, which looks for bugs in the code rather than gaps in the tests:

```
/test-review [PR number | branch | base..head] [max-breaks]
```

`max-breaks` defaults to 20. Each break is a test run, so a review costs several minutes. For Python it runs the tests against the scratch tree's own source, since a shared venv's editable install can point at another checkout.

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