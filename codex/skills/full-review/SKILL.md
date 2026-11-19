---
name: full-review
description: Use when a diff, branch or PR needs more than one review pass, such as before marking an important PR ready, or when the user asks for a full, deep or thorough review.
---

# Full review (Codex)

This is the Claude Code skill of the same name, run in Codex.

1. Run `pwd -P` in the folder this file was loaded from. `<repo>` is three levels up from the result.
2. Read `<repo>/claude/skills/full-review/SKILL.md` completely and follow it, with the substitutions below. Where it says "this skill's folder", use `<repo>/claude/skills/full-review/`.

| The Claude skill says | Do this in Codex |
| --- | --- |
| Run `/code-review` on the target at level L | Don't review it yourself. `$review-agent` is a built-in Codex skill that your skills list hides; it still loads when a message names it, so always try it first. Spawn a separate reviewer with the other finders: `spawn_agent` with `agent_type: "default"`, `fork_context: false`, `reasoning_effort: L` (`medium` for quick, `xhigh` for standard and deep), and the message `$review-agent Review <base>..<head> in <read-only checkout>. Never read <off-limits paths>. Report findings only; change nothing.` Its findings join the others for challenge-review. |
| (that spawn fails) | If `reasoning_effort` is rejected, spawn it without one. If the child reports that `$review-agent` isn't available, spawn it again with this message instead: `Review only <base>..<head> and the code around it in <read-only checkout>. Check correctness, caller and data contracts, blast radius and missing tests. Return concrete failure scenarios with path:line, severity and evidence; no findings is valid. Never read <off-limits paths>. Change nothing.` The report header names the route and effort that ran. |
| `/code-review` at `max` or `ultra` | Only when the user asks. |
| `/test-review`, `/drift-check`, `/challenge-review`, or a sibling at `<this skill's folder>/../<name>/SKILL.md` | The Codex skills `$test-review`, `$drift-check` and `$challenge-review`, at `<repo>/codex/skills/<name>/SKILL.md`. Start each finder's message with its `$name`. |
| `<drift-check folder>` | `<repo>/claude/skills/drift-check/` |
| The project's CLAUDE.md | AGENTS.md and CLAUDE.md, whichever exist. Pass the off-limits paths from both. |
| General-purpose subagents | `spawn_agent` with `fork_context: false`, so they don't see this conversation. |
