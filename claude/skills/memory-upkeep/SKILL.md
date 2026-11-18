---
name: memory-upkeep
description: Use when the user says "update memory", when writing, updating, moving or archiving Claude Code auto-memory entries (MEMORY.md and its topic files), when MEMORY.md nears its 200-line load limit, when a memory linter reports findings, or when deciding where memory should live or whether worktrees share it.
---

# Memory upkeep

Keep auto-memory small enough to load, current enough to trust, and lossless.

## Where memory lives

- One folder per git repo: the path your system prompt names (`~/.claude/projects/<project>/memory/`). Every worktree and subdirectory of the repo shares it; outside a git repo, the project root is the key.
- It may be a symlink: snapshot it with `tar -czhf`.
- To move it, set `autoMemoryDirectory` (absolute path or `~/...`) in settings. A project's own `.claude/settings*.json` is honored only in a trusted workspace, and not at all with `permissions.blockReadsOutsideWorkingDirectories`.
- Never put memory in a committed folder (it publishes personal notes) or a per-worktree ignored folder (one copy per worktree).

## "update memory" means this pass

1. Grep the memory folder first: entries you didn't load may already cover the topic.
2. Capture anything durable this session learned; update the entries it changed.
3. A thread that closed (PR merged, ticket done, decision settled): add its line to `ARCHIVE.md` (creating it, with a pointer in `MEMORY.md`, if it doesn't exist), update that pointer's entry count, then remove the line from the index.
4. Delete only what proved wrong. Never delete or merge entries to make room: move them.
5. Run the linter and fix what it reports.

## Shapes

Index line: `- [Title](file.md) - <what it is>; PRs #a (1/3), #b (2/3); waiting on: <who>; next: <action>; not done: <items>`

Open threads go under a `# Active work` heading in `MEMORY.md`; `pr_status.py` reads that section.

Thread topic file, after the frontmatter:

```markdown
## Current state (updated YYYY-MM-DD)
- Status: <one line>
- PRs: #N (<role>) (live state: pr_status.py)
- Waiting on: <person or event>
- Next: <action>
- Decisions in force: <one bullet each, dated>
- Not done: <unposted, unfiled, owed>

## History
- YYYY-MM-DD: <entry>
```

Rewrite Current state in place; append to History. Live PR state (commit SHAs, CI results, behind counts, draft or open status) goes in neither: it is stale by the next session. Read it with `pr_status.py` instead.

## Scale

- Flat `MEMORY.md` until about 100 lines.
- Then tier 2: closed threads to `ARCHIVE.md`, situation-keyed gotchas to `INDEX-gotchas*.md`, idle threads to `INDEX-parked.md`. Each tier-2 file gets one `MEMORY.md` pointer: entry count first, then its topics ("read BEFORE work on: ...").
- Keep each tier-2 file under 20 KB; split it at its headings.

## Other sessions edit concurrently

Edit lines in place, never rewrite a whole file; re-read before editing; add the new line before removing the old one. Findings on entries you didn't touch may be another session's move in progress: re-lint after your last edit, and leave them unless they persist. The one whole-file rewrite allowed: fixing MIXED_EOL (re-read, then convert in one command).

## Tools (in this skill's folder)

- `python3 memory_lint.py <memory folder>`: load limits, orphaned, dangling or duplicate pointers, wrong entry counts, stray files, mixed line endings, missing frontmatter keys, oversized files without a Current state block. Exit 0 means clean, 1 means findings, 2 means a bad path.
- `python3 pr_status.py <MEMORY.md> [--repo OWNER/REPO]`: live state of every PR named in Active work. Run it from the project checkout, or pass `--repo`.
- `memory_lint_hook.py`: optional PostToolUse hook that lints after each memory Edit/Write (see the README for the settings entry).

Subagents don't see memory: paste matching gotchas into their briefs.
