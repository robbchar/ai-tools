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

1. **Isolate.** Check the head out as a detached worktree in a scratch directory and install dependencies there. Never break code in the user's working tree. Confirm `git status --porcelain` in the scratch tree is empty.
   - **Python:** a shared venv's editable install can point at another checkout, so the tests would import code you never broke. Run with the tree's source first (`PYTHONPATH=<tree>/src`) and `PYTHONDONTWRITEBYTECODE=1`, and confirm with `python -c "import <pkg>; print(<pkg>.__file__)"` that the path is inside the scratch tree.
2. **List the rules.** From the non-test hunks, list each behavior the diff adds or changes, one line each with `path:line`: an ordering, a filter, a guard or branch, a default or fallback, a format, which value reaches which component, a state reset, an option flag.
3. **Break each rule twice.**
   - **Remove it:** delete the sort, the filter, the guard, the `key`, the option flag. A test that survives removal passes only because its data already looks like the output.
   - **Miswire it:** invert the comparison, pass the first item instead of the current one, swap two columns or arguments, take the max instead of the sum.

   Make each break by replacing text that occurs exactly once in the file, and keep it compiling and type-checking. Spend the budget on money, security and data-handling guards, ordering, filtering and wiring first.
4. **Run.** For each break, run the tests related to the changed file (`vitest related --run <file>`, or the module's test file) and record pass or fail. Restore the file from a copy, then confirm `git status --porcelain` is empty again; if it isn't, stop and report nothing from that run on. Count a failure only when the failing assertion is about the broken behavior, not a compile error, import error or timeout.
   - **Before calling a break a survivor,** re-apply it and run the whole test suite for that package once. If another test fails, the behavior is guarded elsewhere: report it under Caught with that test's name, not as a miss.
   - Finish with one clean run of the same tests.
5. **Read the assertions** the diff adds or changes, without running anything. Flag:
   - an expected value built with the function under test or its helpers;
   - text found anywhere in a row or container when the column matters;
   - a count, `contains` or length check where an exact value or set is the rule, or no check of which item carries a mark;
   - a filter that selects by the very field the assertion then checks;
   - an expected exception class that a different, wrong failure also raises;
   - a negative test whose input fails for an earlier reason than the one under test;
   - sample data missing the case the rule exists for: ties, empty, negative, unavailable, out of order, a second distinct element.

   For each deleted or weakened test, compare with the base (`git show <base>:<path>`) and name the behavior that lost its guard, if no other test still covers it.
6. **Clean up.** Remove the worktree.

## Report

**Missed**, most severe first. Each: `path:line` of the behavior · the break · why the tests miss it · severity · the test that would catch it (one sentence or a short snippet). The suggested test must fail under its break: take its expected value from the input data, never from another output of the code under review.

Severity: **Medium** when the break defeats a guard on security, permissions, money or sensitive data; **Low** otherwise. A survivor is never a Nit.

**Weak assertions**, from step 5, each with the test's `path:line`.

**Caught**, one line per break that failed a test, naming the test.

**Not probed**: each changed behavior or test you didn't break, and why (budget, couldn't break it without a compile error, environment).

**How checked**: breaks run, tests run, the clean-run result, and that the scratch tree was clean after every restore.

## Common mistakes

| Mistake | Fix |
|---|---|
| Only inverting a sort or comparison | Also remove it; a pre-sorted fixture survives removal but not inversion |
| Breaking code in the user's tree, restoring with `git checkout` | Scratch worktree; restore from a copy; check `git status --porcelain` after each |
| Python tests importing an editable install from another checkout | `PYTHONPATH=<tree>/src`, then print the package's `__file__` |
| Counting a compile error or timeout as a catch | Check the failing assertion names the behavior |
| Calling a break a miss when a sibling test catches it | Run the package's whole suite before reporting a survivor |
| Running the whole suite for every break | Related tests per break; the whole suite only to confirm survivors |
| Suggesting a test that compares two outputs (panel A matches panel B) | Both can be wrong together; expect a value from the input data |
| Reporting style or naming | Out of scope: this review asks only whether tests can fail |
