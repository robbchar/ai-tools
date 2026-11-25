# Codex wrappers

Run the skills in `claude/skills/` from Codex without changing them. Each folder
in `codex/skills/` is a small Codex skill with the same name as a Claude skill.
It reads that skill and says what its Claude-only parts mean in Codex.
`memory-upkeep` has no wrapper: it manages Claude Code's own memory files.

## How it works

When you type `$full-review` in Codex:

1. Codex loads `codex/skills/full-review/SKILL.md`, the wrapper.
2. The wrapper runs `pwd -P` in its own folder to find its real path through the
   install symlink. The repo root is three levels up.
3. It reads `claude/skills/full-review/SKILL.md` and follows it, using its table
   for anything Claude-only: `/code-review`, Claude's subagents, CLAUDE.md,
   sibling skills.

The Claude skill's helpers, lenses and prompts stay in `claude/skills/`, and the
wrappers point at them there. No wrapper contains a link to the Claude folder.
Codex scans skill folders several levels deep and follows symlinks, so a link
would register the Claude skill a second time under the same name, and `$name`
only works when exactly one skill has that name.

## Install (macOS or Linux)

Set `AI_TOOLS` to wherever you want the clone, and keep it there: the links
point into it. Nothing else depends on where it lives.

```bash
AI_TOOLS=~/code/ai-tools
git clone https://github.com/robbchar/ai-tools.git "$AI_TOOLS"
mkdir -p ~/.agents/skills
for d in "$AI_TOOLS"/codex/skills/*/; do ln -s "${d%/}" ~/.agents/skills/; done
```

Start a new Codex session; `/skills` should list all five once each. `git pull`
updates both the Claude skills and the wrappers. Install by symlink only: a
copied wrapper can't find the repo.

**Needs:** `git`, `gh`, and Python 3 with PyYAML for drift-check; Linear's MCP
server in Codex for Linear tickets in ready-check. Claude Code isn't needed.

**Permissions:** the skills write to `.git` (scratch worktrees), use the network
(`gh`, test-review's dependency installs) and run tests. Codex's default sandbox
will ask before these. Choose your own sandbox settings; the wrappers don't
change them.

## Not yet verified in Codex

The wrappers were checked by dry runs, not in Codex itself. Before relying on
them, confirm in a real session:

- `spawn_agent` accepts `reasoning_effort` (`medium`, `xhigh`) for your model.
  If it doesn't, full-review runs the code review at the default and says so.
- `$review-agent` loads when a subagent's message names it.
- ready-check's Codex model mapping, which is still empty.

## Keeping them in sync

A wrapper translates; it never copies steps, so most edits to a Claude skill
reach Codex untouched. When a Claude skill gains a new Claude-only reference (an
agent name, a built-in command, a model name), its wrapper needs a row.
