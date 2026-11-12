---
name: deep-review
description: Use when a diff, branch or PR needs more than one review pass, such as before marking an important PR ready, or when the user asks for a deep or thorough review.
---

# Deep review

## Overview

One command for the whole review flow. `/code-review`, `/test-review` and `/drift-check` look for problems; `/challenge-review` then checks what they found; the user picks what gets fixed. The finders run in parallel, so the wall time is close to the slowest one.

## Arguments

`/deep-review [target] [quick | standard | full]`. Target is a PR number, branch or `base..head` range, as for `/code-review`; the default is the current branch against its merge base with the default branch. The level defaults to `standard`.

| Level | Finders | `/code-review` level | Challenge |
|---|---|---|---|
| `quick` | `/code-review` | `medium` | audit only |
| `standard` | `/code-review`, `/test-review`, and `/drift-check` when step 3 says so | `xhigh` | audit only |
| `full` | `/code-review`, `/test-review`, `/drift-check` | `xhigh` | focus passes and audit |

`quick` suits a small, obvious change; `standard` anything complex; `full` changes to auth, permissions, money, infrastructure, or anything that removes behavior.

Never run `/code-review` at `max` or `ultra` unless the user asks for it.

## Procedure

The sibling skills live next to this one: `<this skill's folder>/../<name>/SKILL.md`.

1. **Resolve the target.** Record the base and head commits. For a PR, fetch its head (`gh pr view <N> --json headRefOid,baseRefName`). Read the project's CLAUDE.md for paths that must never be read, and pass them to every subagent below.
2. **Make one read-only checkout:** a detached worktree of the head in a scratch directory. `/drift-check`, the focus passes and the auditor all read it. `/test-review` makes its own, because it edits code while it runs.
3. **Decide on `/drift-check`** (`standard` only). Run it when the diff touches `.github/workflows/`, or when `python3 -I <drift-check folder>/removed_names.py --tree <checkout> --base <base>`, with the project's off-limits paths as `--exclude`, reports any name with remaining mentions.
4. **Launch the background finders in one message**, as general-purpose subagents. Give each the path of its skill file, the target, the project's off-limits paths, and "follow the skill exactly and return its report format; don't commit or push":
   - `/test-review` (`standard` and `full`), with a scratch directory of its own;
   - `/drift-check` (`full`, or `standard` per step 3), pointed at the read-only checkout.
5. **Run `/code-review`** on the target at the level in the table, while they work.
6. **Wait for every finder.** One that errored or returned nothing "did not run"; never report it as "found nothing".
7. **Invoke `/challenge-review`** on the target, with lenses `none` for `quick` and `standard`, and the default lenses for `full`. Tell it to reuse the read-only checkout. It takes the findings from this conversation.
8. **Report, then stop.**
   - A header: target, base and head commits, level, and each reviewer with whether it ran.
   - `/challenge-review`'s report.
   - **Fix list:** the surviving findings, numbered, most severe first, each with its fix. Mark an *unverified* Low "decide" rather than "fix".

   Fix, post or push nothing until the user picks from the list. Then remove the read-only checkout.

## Common mistakes

| Mistake | Fix |
|---|---|
| Running the finders one after another | Launch `/test-review` and `/drift-check` in the background, then run `/code-review` |
| `/test-review` in the shared checkout | It edits code; it makes its own worktree |
| Reporting a finder that failed as "found nothing" | "Did not run" |
| Fixing before the user picks | Stop at the fix list |
| `/code-review` at `max` or `ultra` by default | Only when the user asks |
