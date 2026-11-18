---
name: full-review
description: Use when a diff, branch or PR needs more than one review pass, such as before marking an important PR ready, or when the user asks for a full, deep or thorough review.
---

# Full review

## Overview

One command for the whole review flow. A code review, test-review and drift-check
look for problems; challenge-review then checks what they found; the user picks
what gets fixed. Run independent finders in parallel when worker slots permit.

## Arguments

`full-review [target] [quick | standard | deep]` (Claude: `/full-review`; Codex:
`$full-review`). Target is a PR number, branch or `base..head` range; the default
is the current branch against its merge base with the default branch. The level
defaults to `standard`.

| Level | Finders | Challenge |
| --- | --- | --- |
| `quick` | Code review | Audit only |
| `standard` | Code review, test-review, and drift-check when step 3 says so | Audit only |
| `deep` | Code review, test-review, drift-check | Focus passes and audit |

`quick` suits a small, obvious change; `standard` anything complex; `deep` changes
to auth, permissions, money, infrastructure, or anything that removes behavior.
Use the host's native model and reasoning defaults; these levels select review
coverage, not a different model or effort setting.

## Host tools and dependencies

Follow the host's project instructions (`CLAUDE.md` in Claude, `AGENTS.md` in
Codex), including linked guidelines and data exclusions. Resolve test-review,
drift-check and challenge-review from the host's installed skill list and record
their absolute `SKILL.md` paths. Locate drift-check's helpers in its own installed
directory. Do not assume the skills are siblings or use Claude command syntax to
invoke them in another host. If a required skill or tool is missing, identify it
before launching work and mark the requested review incomplete.

Use native subagents, with the task, target, project exclusions and report format
provided explicitly. Use a named Claude agent when available, otherwise a fresh
general-purpose worker. Disable inherited conversation for independent workers;
a scratch worktree alone does not supply a fresh context or enforce permissions.
Keep native model defaults and session permissions. When slots are limited, run
separate workers sequentially. If a required fresh worker is unavailable, report
that pass as **did not run** and the review as incomplete; an inline reread is not
an independent audit.

For the baseline code review, use an installed code-review skill only if it can
review the pinned target, return findings, and remain report-only. Read its
instructions before selecting it; it is an optional dependency, not assumed to
be built in. Otherwise give a fresh worker this brief:

> Review only the pinned diff and the surrounding code needed to judge it, in
> the cold checkout. Check correctness, caller and data contracts, blast radius,
> and missing tests. Return concrete failure scenarios with `path:line`, severity
> and evidence; no findings is valid. Make no fixes, commits, posts or pushes.

Record whether the installed skill or this fallback ran. The fallback needs no
separately installed native agent definition.

## Procedure

1. **Resolve the target.** Record base and head commits. For a PR, fetch its head
   (`gh pr view <N> --json headRefOid,baseRefName`). For a range, use its explicit
   head rather than the working branch. Pass the pinned commits and project
   exclusions to every worker below.
2. **Make one read-only checkout:** a detached worktree of the head in a scratch
   directory. The baseline reviewer, drift-check, focus passes and auditor read
   it; provide its path and keep author notes out of their context. Test-review
   makes its own worktree because it edits code while it runs.
3. **Decide on drift-check** (`standard` only). Run it when the diff touches
   `.github/workflows/`, or when
   `python3 -I "<installed drift-check directory>/removed_names.py" --tree "<checkout>" --base <base>`,
   with the project's off-limits paths as `--exclude`, reports any name with
   remaining mentions. If this decision cannot be checked, record the missing
   check; do not silently skip the pass or claim a complete review.
4. **Launch the independent finders**, in parallel when possible. Give each its
   installed skill path, pinned target, project exclusions, and “follow the skill
   and return its report; don't commit, post or push”:
   - test-review (`standard` and `deep`), with a scratch directory of its own;
   - drift-check (`deep`, or `standard` per step 3), in the read-only checkout.
5. **Run the baseline code review** using the selected skill or fallback while
   the other finders work. Use the same pinned target and cold checkout.
6. **Collect every finder.** An error or empty response means **did not run**,
   never “found nothing”. Mark partial or missing passes explicitly.
7. **Run challenge-review** after collecting the finders. Use lenses `none` for
   `quick` and `standard`, default lenses for `deep`, and reuse the read-only
   checkout. Give it every finding and every failed or partial pass so its report
   preserves coverage limits. Its focus workers and auditor still start fresh.
8. **Report, then stop.**
   - Header: target, base/head commits, level, baseline review route, every
     reviewer with whether it ran, and whether the requested review is complete.
   - Challenge-review's report.
   - **Fix list**, P1 first: surviving findings this change should fix, ranked by
     what the author should do first. Severity sets the starting order; move an
     item up when later work builds on it or it blocks the merge. Each item:
     `P<n>` · Blocking or Non-blocking · finding IDs · the fix · why that rank.
     Mark an *unverified* Low “decide” rather than “fix”.
   - **Not this change's to fix**: findings for another PR, older gaps for a
     separate ticket, and findings that no longer apply, with where they go or
     why they dropped.

   Fix, post or push nothing until the user picks. Then remove the read-only
   checkout, leaving the user's working tree unchanged.

## Common mistakes

| Mistake | Fix |
| --- | --- |
| Assuming Claude-only agents or commands exist | Resolve installed skills and use native fresh workers |
| Test-review in the shared checkout | Give it a separate mutable worktree |
| Calling a failed pass “found nothing” | Report “did not run” and an incomplete review |
| Fixing before the user picks | Stop at the fix list |
| Sorting the fix list only by severity | Rank by what to do first and explain why |
