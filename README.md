# ai-tools

A collection of utilities, hooks, and scripts for working with AI tools and platforms. The review skills work in Claude Code and Codex; hooks, native agent definitions, and mods are Claude-specific.

## Structure

```
ai-tools/
├── docs/
│   └── skills.md
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
        ├── drift-check/
        │   ├── SKILL.md
        │   ├── removed_names.py
        │   └── workflow_paths.py
        ├── full-review/
        │   └── SKILL.md
        ├── ready-check/
        │   └── SKILL.md
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

## Skills

Use the same folders in `claude/skills/` for Claude Code and Codex. See [installation and usage](docs/skills.md) for both hosts, dependencies, and model defaults. The examples below use Claude’s `/name` syntax; in Codex use `$name`.

A full review runs a baseline code review, test-review and drift-check, then challenge-review over their findings. An existing compatible code-review skill is optional: full-review includes a brief for a fresh reviewer when none is installed.

---

##### `full-review`

Runs the review flow in one command: the finders in parallel (test-review and drift-check while the baseline reviewer works, within the host’s worker limits), then `/challenge-review` over everything they found. It ends with a fix list in priority order (P1 first, by what to do first) and changes nothing until you pick.

```
/full-review [PR number | branch | base..head] [quick | standard | deep]
```

| Level | Runs |
|---|---|
| `quick` | a small, obvious change: baseline code review, then the audit |
| `standard` (default) | anything complex: baseline review, test-review, and drift-check when workflows change or removed names still have references |
| `deep` | auth, permissions, money, infrastructure or removals: also drift-check every time and the three focus passes |

Levels select review coverage; models and reasoning use the host’s native defaults, including any configured named agent. Runtime and cost depend on the diff, test suite, available workers, and those settings. Separate workers can run sequentially when concurrency is limited.

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

##### `ready-check`

Says whether a ticket is ready for a transcription, specified, or design handoff without the implementer inventing facts or making decisions outside that profile. It reads the whole ticket, comments included, and checks every claim against the code. Any set the ticket names (stores, callers, stacks) it rebuilds from its source. Then it lists the decisions still open, each with a recommendation and whose call it is. It ends with a verdict and changes nothing.

```
/ready-check <ticket> [transcription | specified | design] [intended-model]
```

The profile defaults to `specified`. Existing `haiku`, `sonnet`, and `opus` arguments remain aliases for the three profiles; they do not switch models. An optional intended model is context, not a capability guarantee.

---

##### `test-review`

Checks whether a change's tests would fail if the behavior they cover broke. It works in a scratch worktree: it lists each rule the diff adds or changes, breaks each one twice (removes it, then miswires it), runs the related tests, and reports every break that no test catches. It also reads the new assertions for expected values built with the code under test, text matched anywhere in a row, and counts that don't check which items.

Run it after a code review, which looks for bugs in the code rather than gaps in the tests:

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