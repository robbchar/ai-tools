---
name: drift-check
description: Use when reviewing or opening a PR that removes or renames something (a function, key, flag, env var, file, config entry or documented behavior), or that changes files a GitHub workflow uses, to find docs, comments, PR text and workflow path filters that still describe or miss the old state.
---

# Drift check (Codex)

This is the Claude Code skill of the same name, run in Codex.

1. Run `pwd -P` in the folder this file was loaded from. `<repo>` is three levels up from the result.
2. Read `<repo>/claude/skills/drift-check/SKILL.md` completely and follow it, with the substitution below. Where it says "this skill's folder", use `<repo>/claude/skills/drift-check/`; its helper scripts are there.

| The Claude skill says | Do this in Codex |
| --- | --- |
| The project's CLAUDE.md | AGENTS.md and CLAUDE.md, whichever exist. Exclude the off-limits paths from both. |
