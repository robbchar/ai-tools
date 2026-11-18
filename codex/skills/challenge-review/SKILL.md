---
name: challenge-review
description: Use when a review of a diff, branch or PR has produced findings (from a code review, $test-review, a teammate or any reviewer) that need checking before they are posted or fixed, or when a single review pass may have missed failure paths, data exposure or permission problems.
---

# Challenge review (Codex)

This is the Claude Code skill of the same name, run in Codex.

1. Run `pwd -P` in the folder this file was loaded from. `<repo>` is three levels up from the result.
2. Read `<repo>/claude/skills/challenge-review/SKILL.md` completely and follow it, with the substitutions below. Where it says "this skill's folder", use `<repo>/claude/skills/challenge-review/`; the lenses and `adversary-prompt.md` are there.

| The Claude skill says | Do this in Codex |
| --- | --- |
| Findings from `/code-review` or `/test-review` | Findings from any review in this conversation, including `$review-agent` and `$test-review` runs. |
| `diff-reviewer`, a general-purpose subagent, or a fresh subagent | `spawn_agent` with `fork_context: false`. The focus passes and the auditor must not see this conversation. |
