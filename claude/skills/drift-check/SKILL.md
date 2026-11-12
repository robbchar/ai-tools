---
name: drift-check
description: Use when reviewing or opening a PR that removes or renames something (a function, key, flag, env var, file, config entry or documented behavior), or that changes files a GitHub workflow uses, to find docs, comments, PR text and workflow path filters that still describe or miss the old state.
---

# Drift check

## Overview

Two searches a reviewer shouldn't have to do by hand. Both start from the diff and ask what else in the repo still believes the old state: docs and comments that describe what was removed, and workflows whose `paths:` filter won't run for a file they use. Report only; edit nothing.

## Arguments

`/drift-check [target]`. Target is a PR number, branch or `base..head` range; the default is the current branch against its merge base with the default branch. For a PR, fetch its head and its body (`gh pr view <N> --json body`): the PR text can be stale too.

## Before reading anything

Read the project's CLAUDE.md, and any data rules it points to, for paths that must never be read, such as sensitive or seed data. Pass each one to `removed_names.py` as `--exclude <pathspec>`; it already skips data, fixture, lock and binary files, and prints the full exclusion list as `git grep` pathspecs. **Every search you run yourself uses those same pathspecs.** `workflow_paths.py` reads only workflow YAML and Terraform files. Run both as `python3 -I <this skill's folder>/<script>.py`.

## Check A: names the diff removed

1. Run `removed_names.py --tree <tree> --base <base>`. It lists definitions the diff removed or renamed and no added line defines again (functions, classes, declarations, constants, keys and fields, flags, env vars, Terraform blocks, headings, deleted and renamed files), each with every remaining mention.
2. Read the diff's removed prose: doc paragraphs, comments, and anything the PR body says it removes. Pick two or three distinctive phrases for each removed behavior and rerun with `--name "<phrase>"` for each.
3. Search the PR body, and the ticket text if it's loaded, for each name too.
4. Classify every mention:
   - **Stale doc**: a README, runbook, ADR, guide or the PR body still describes the old state as current. A dated history line ("removed in X") is expected, not stale.
   - **Misleading comment**: a code comment that would tell the next maintainer to do the old thing.
   - **Possible dead reference**: live code still uses it. Flag it for the code review to judge.
   - **Expected**: still defined elsewhere, moved, kept on purpose, or history. One line each, so the list can be audited.

   Severity is **Low** by default, **Medium** for a runbook, a security or auth doc, an operator step, or a comment that would steer the next change wrong.

## Check B: workflow path filters

1. Run `workflow_paths.py --tree <tree> --base <base>` (needs PyYAML). It finds what each filtered workflow uses by looking for tokens that name tracked files and folders, plus local Terraform modules and called workflows, and lists:
   - **gaps in this diff**: changed files a filtered workflow uses but won't run for;
   - **direct gaps**: paths a workflow itself names that its filter misses;
   - **via called workflows**: paths a reusable workflow uses that the caller's filter misses.
2. Check every row against the workflow file before reporting it:
   - A gap can be deliberate, such as a deploy that builds from a pinned commit rather than the PR's tree. Say so when it is.
   - For a called-workflow row, check whether this caller's inputs actually reach that path.

   Severity is **Medium** for a gap in this diff the change relies on, **Low** for one that was already there.

## Report

**Header**: base, head, names checked, workflows checked, and the paths never read.

**Check A**: one row per mention that isn't expected: name · where it's still mentioned (`path:line`) · class · severity · what a reader would be told wrong. A stale PR body goes first, then Medium, then Low. Then the Expected list, one line each.

**Check B**: gaps in this diff, then pre-existing gaps, each with whether it looks deliberate and why.

## Common mistakes

| Mistake | Fix |
|---|---|
| Reading sensitive data while searching | Pass the project's off-limits paths as `--exclude`; reuse the printed pathspecs for every manual search |
| Calling dated history stale | "Removed in X" is expected; stale means it describes the old state as current |
| Reporting script rows unchecked | Every Check B row gets a look at the workflow file |
| Searching only names, missing removed behavior | Rerun with `--name` for phrases from removed prose |
| Fixing what you find | Report only; the author or caller decides |
