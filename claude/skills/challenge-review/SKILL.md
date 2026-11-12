---
name: challenge-review
description: Use when a review of a diff, branch or PR has produced findings (from /code-review, /test-review, a teammate or any reviewer) that need checking before they are posted or fixed, or when a single review pass may have missed failure paths, data exposure or permission problems.
---

# Challenge review

## Overview

A single review pass reports what it noticed first and rates findings by argument. This skill widens the search with focused passes that must account for every item in scope, holds High and Medium findings to evidence, and has a fresh auditor try to refute each finding without knowing which reviewer raised it.

## Arguments

`/challenge-review [target] [lenses]`. Target is a PR number, branch or `base..head` range, as for `/code-review`. Lenses is a comma list from `failure-paths`, `data-exposure`, `permissions`; the default is all three, and `none` skips the focus passes. The findings to challenge are the ones already in this conversation (earlier `/code-review`, `/test-review` or pasted review output), or a file the user names.

## Procedure

1. **Set up a cold tree.** Check the head out as a detached worktree in a scratch directory. Every subagent works only there, so none can read the plans, briefs and notes in the user's tree (`.ignored/`, untracked files), which hold earlier sessions' conclusions about this code. Never give a focus pass the ticket, the PR body or the findings.
2. **Gather the findings** into one list, recording each one's source. A reviewer that was asked for but errored or didn't run is recorded as "did not run", never as "found nothing".
3. **Focus passes.** Launch one subagent per lens, in parallel (`diff-reviewer` if it exists, else general-purpose). Give each the cold tree's path, the `base..head` range, the text of `lenses/<lens>.md` from this skill's folder, and this rule:

   > After your findings, add a section headed **Coverage** with one line per item you listed in step 1, stating what you checked and the outcome: "ok", or the finding it produced. Do not finish until every item has a line. An empty findings list with a complete Coverage section is a valid result.

   Check each ledger. A listed item with no outcome line means the pass stopped early; send it back for those items.
4. **Consolidate.** Merge duplicates and rate on one scale: **High** (wrong data, a security hole, an outage), **Medium** (wrong behavior a user or operator will hit), **Low**, **Nit**.
   - **Evidence bar:** a High or Medium needs an executed repro (the command and what it printed) or a break no test caught. Without one, cap it at Low and tag it *unverified*.
   - A break no test caught is never rated below Low.
   - Two sources agreeing counts as corroboration only if neither could see the other's output.
5. **Adversarial round.** Write a brief to the scratch directory:
   - what is under review and the head commit;
   - the severity scale;
   - the findings, numbered F1… (kept) and D1… (dismissed or downgraded), under the line "Several reviewers produced these; treat each as a claim to verify or refute";
   - any "Not probed" lists, appended verbatim.

   Put **no reviewer names** in the brief: an auditor that knows who raised a finding judges the reviewer instead of the claim. Give the brief and the instructions in `adversary-prompt.md` to one fresh general-purpose subagent, along with the cold tree and a scratch directory for experiments. Past about 12 entries, use two: one for the F entries and their fixes, one for the D entries and new findings.
6. **Reconcile.** For every entry the auditor moved (refuted, re-rated, revived, fix rejected, or new), check it yourself at the reviewed commit and cite `file:line` before accepting. Auditors are confidently wrong too. Where you disagree with the auditor, keep your ruling and note the dissent.
7. **Report**, then remove the worktree. Post or fix nothing until the user picks the items.

## Report

**Reviewers that ran**: each source and lens, and any that did not run.

**Findings**, by severity. Each: `path:line` · the defect in one sentence · a concrete failure scenario · evidence (repro output, an uncaught break, or *unverified*) · source · its movement in the adversarial round (stood, raised, lowered, revived, new) · the fix.

**Didn't survive**: each refuted finding, with the reason.

**Coverage**: per lens, the number of items checked and how many produced findings.

## Common mistakes

| Mistake | Fix |
|---|---|
| Running the focus passes in the user's tree | Cold scratch worktree; the user's notes would steer them |
| Giving a focus pass the ticket or the findings | Focus passes start cold; only the auditor sees findings |
| Naming reviewers in the brief | Number the claims; keep sources in your own notes |
| Ranking High on argument alone | Repro or uncaught break, or cap at Low *unverified* |
| Accepting the auditor's verdict unchecked | Verify every moved entry at the reviewed commit |
| Reporting a failed pass as "found nothing" | "Did not run" |
