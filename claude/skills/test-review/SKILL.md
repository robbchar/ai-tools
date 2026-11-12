---
name: test-review
description: Use when reviewing a diff, branch or PR for whether its tests would catch the changed behavior breaking, such as after /code-review, before marking a PR ready, or when tests look thin, vacuous or written to fit their fixture.
---

# Test review

## Overview

A test guards a behavior only if breaking that behavior makes it fail. Reading the tests can't show that; breaking the code and running them can. Report every break the tests miss.

## Arguments

`/test-review [target] [max-breaks]`. Target is a PR number, branch or `base..head` range; the default is the current branch against its merge base with the default branch. For a PR, fetch its head first. `max-breaks` defaults to 20.

## Procedure

1. **Isolate.** Check the head out as a detached worktree in a scratch directory and install dependencies there. Never break code in the user's working tree. Restore each break from a copy of the file, not with `git checkout`.
2. **List the rules.** From the non-test hunks, list each behavior the diff adds or changes, one line each with `path:line`: an ordering, a filter, a guard or branch, a default or fallback, a format, which value reaches which component, a state reset, an option flag.
3. **Break each rule twice.**
   - **Remove it:** delete the sort, the filter, the guard, the `key`, the option flag. A test that survives removal passes only because its data already looks like the output.
   - **Miswire it:** invert the comparison, pass the first item instead of the current one, swap two columns or arguments, take the max instead of the sum.

   Keep each break compiling and type-checking. Spend the budget on money, ordering, filtering and wiring first.
4. **Run.** For each break, run the tests related to the changed file (`vitest related --run <file>`, or the module's test file), record pass or fail, and restore. Count a failure only when the failing assertion is about the broken behavior, not a compile error or a timeout. Finish with one clean run of the same tests.
5. **Read the assertions** the diff adds, without running anything. Flag:
   - an expected value built with the function under test or its helpers;
   - text found anywhere in a row or container when the column matters;
   - a count with no check of which items, or of which item carries a mark;
   - sample data missing the case the rule exists for: ties, empty, negative, unavailable, out of order.
6. **Clean up.** Remove the worktree.

## Report

**Missed**, most severe first. Each: `path:line` of the behavior · the break · why the tests miss it · the test that would catch it (one sentence or a short snippet). The suggested test must fail under its break: take its expected value from the input data, never from another output of the code under review.

**Weak assertions**, from step 5, each with the test's `path:line`.

**Caught**, one line per break that failed a test, naming the test.

**How checked**: breaks run, tests run, the clean-run result.

## Common mistakes

| Mistake | Fix |
|---|---|
| Only inverting a sort or comparison | Also remove it; a pre-sorted fixture survives removal but not inversion |
| Breaking code in the user's tree, restoring with `git checkout` | Scratch worktree; restore from a copy |
| Counting a compile error or timeout as a catch | Check the failing assertion names the behavior |
| Suggesting a test that compares two outputs (panel A matches panel B) | Both can be wrong together; expect a value from the input data |
| Running the whole suite per break | Related tests per break, one clean run at the end |
| Reporting style or naming | Out of scope: this review asks only whether tests can fail |
