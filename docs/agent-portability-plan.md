# Plan for using the existing skills in Codex

Make the five existing skills usable in Codex through small instruction changes
and installation documentation. Keep one copy of each skill in `claude/skills/`;
the historical directory name does not prevent another host from loading it.
Keep Claude usage working. This is a plan, not an implementation.

## Smallest change

Install the same skill folders in either host. Keep their Python helpers, lenses,
and prompts beside the skills that use them. Use the host's existing tools and
model defaults. Add short Claude/Codex notes only where execution differs.

This needs no generated packages, adapter framework, host detection, role
registry, new configuration format, or port of `claude/agents/`. The current
Claude agents remain optional conveniences. Hooks and `term-here` stay outside
this work.

## Instruction changes

| Area | Change |
| --- | --- |
| Invocation | Document Claude's `/name` and Codex's `$name` invocation. Refer to sibling skills by name and resolve their installed locations rather than assuming command syntax or adjacent directories. |
| Project rules | Follow the host's project instructions: `CLAUDE.md` for Claude, `AGENTS.md` for Codex, including linked guidelines and data exclusions. Pass those exclusions to workers, scripts, and manual searches. |
| Agents | Use the named Claude agent when available, otherwise a fresh general-purpose subagent with the task and output instructions supplied explicitly. Inherit the session's model and settings; respect its tool, permission, and concurrency limits. |
| Baseline review | Use an installed compatible code-review skill if available and keep it report-only. Otherwise give a fresh subagent a short diff-review brief: correctness, blast radius, concrete failure scenarios, and `path:line` findings. State which route ran. |
| Readiness | Judge `transcription`, `specified`, or `design` handoffs instead of equating model brands with capability. Default to `specified`; retain Haiku, Sonnet, and Opus as Claude aliases for those profiles. Allow an intended model as context, not a new model-routing system. |

Put the short host-specific notes in the affected skill. Extract a small local
reference only if a note becomes substantial; keep installed folders complete.
Future hosts can reuse the workflow and add their own short execution notes when
needed. No support claim for an untested host is required.

## Changes to the five skills

- **`drift-check`:** update instruction discovery and locate its existing helper
  scripts relative to the installed skill. Keep Python 3 and PyYAML requirements.
- **`test-review`:** keep the existing scratch worktree, remove/miswire probes,
  Python import check, restoration checks, and full-suite confirmation of misses.
  Its shell and test commands already work independently of the model brand.
- **`challenge-review`:** replace Claude-only dispatch names with the available
  fresh subagent mechanism. Preserve cold inputs, coverage ledgers, evidence
  requirements, and the separate anonymized auditor.
- **`full-review`:** resolve its sibling skills and baseline review as above.
  Preserve quick/standard/deep coverage and conditional drift checks; use native
  model defaults instead of prescribing effort enums. Collect every finder
  before the audit, running separate workers sequentially if slots are limited.
- **`ready-check`:** add the handoff profiles, use available ticket tools to read
  the description and every comment, and retain code verification, full-set
  discovery, decision ownership, and report-only behavior.

A scratch checkout and a fresh conversation solve different problems; preserve
both wherever the current skill requires them. If a required tool, dependency,
or fresh subagent is unavailable, report the affected pass as unavailable and
the review as incomplete. Never present an inline reread as an independent audit.
Keep the existing approval points before fixes, ticket edits, or posting findings.

## Delivery and checks

Implement this in one focused follow-up PR:

1. Edit the existing skill instructions and README. Document installing all five
   folders into each host's supported skill directory, invocation examples, and
   the optional code-review dependency. Keep existing Claude paths and commands.
2. Install from those same folders into temporary supported locations outside
   the checkout. Verify both hosts discover all five skills and resolve their
   helpers, prompts, and sibling dependencies. Leave existing personal skills
   and agent configuration intact.
3. Use a tiny fixture diff with a rename and a testable behavior change for a
   standard full review in each host, plus a sample ticket for `ready-check`.
   Confirm the three review finders and audit run,
   cold workers exclude author notes, mutations stay in scratch trees, and
   existing report obligations survive. Check that missing dependencies or
   workers produce an honest incomplete result. Record client versions and runs.

Keep checks proportional: validate Markdown/resource links and exercise the real
installation and review flow. Add targeted regressions only if executable helper
behavior changes. Native model configuration and another host can be addressed
when someone actually needs them.

Done means a user can install these folders in Codex and invoke the skills,
existing Claude usage still works, and required review stages run or report why
they could not. This planning PR claims no host smoke tests have already run.

## Technical references

Verify installation and invocation against the client versions used during
implementation: [Codex skills](https://learn.chatgpt.com/docs/build-skills),
[Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents),
[Claude Code skills](https://code.claude.com/docs/en/skills), and
[Claude Code subagents](https://code.claude.com/docs/en/sub-agents).
