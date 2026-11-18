# Plan for using the skills in Codex

The five skills in `claude/skills/` stay exactly as they are. Codex gets a thin
wrapper per skill that points back at the Claude skill and says what its
Claude-only references mean in Codex. This is a plan, not an implementation.

## Who it's for

One teammate who uses Codex and installs skills the way the owner does: put the
folders into their own setup and call them by name. Nothing is published.

**Goals**

- `$full-review`, `$test-review`, `$drift-check`, `$challenge-review` and
  `$ready-check` run in Codex.
- Codex uses its closest equivalents: its subagents, its `review-agent` skill,
  and the same effort level where Codex has one.
- Edits to the Claude skills reach Codex with no extra work, unless an edit adds
  a new Claude-only reference.

**Non-goals:** other agents; porting `claude/agents/`, hooks or mods; making
Codex behave exactly like Claude.

**Hard rule:** nothing under `claude/` changes for Codex. A Codex need that
seems to require a Claude change comes back as a proposal, not an edit.

## Layout

```
codex/skills/
  full-review/SKILL.md        wrapper
  challenge-review/SKILL.md
  drift-check/SKILL.md
  test-review/SKILL.md
  ready-check/SKILL.md
```

Each folder holds only its wrapper. No link to the Claude folder goes inside it:
Codex scans skill folders up to six levels deep and follows symlinks, so a link
would register the untranslated Claude skill a second time under the same name.

## What a wrapper contains

- **Frontmatter:** the same `name`, and a description with the same triggers.
- **Find the repo:** run `pwd -P` in the wrapper's folder to get its real path
  through the install symlink; the repo root, `<repo>`, is three levels up.
- **One instruction:** read `<repo>/claude/skills/<name>/SKILL.md` and follow it
  exactly. Where it says "this skill's folder", use `<repo>/claude/skills/<name>/`,
  which is where its helpers, lenses and prompts already live.
- **A translation table** of only the Claude-only references that skill uses.

Translate, don't restate. A wrapper never copies steps from the Claude skill, so
it can't fall behind on them. When a step has no Codex equivalent, the wrapper
says how to report it ("did not run"), never to skip it quietly.

## Translations

Shared by every wrapper that needs them:

| The Claude skill says | In Codex |
| --- | --- |
| `/name` | `$name` |
| A sibling skill, `<this skill's folder>/../<name>/SKILL.md` | The Codex wrapper, `<repo>/codex/skills/<name>/SKILL.md`. Never the Claude file: it's untranslated. |
| The project's CLAUDE.md | AGENTS.md and CLAUDE.md, whichever exist. Combine their off-limits paths. |
| A general-purpose subagent, or `diff-reviewer` | `spawn_agent` without forking this conversation (`fork_context: false`) |
| Launch in one message / in the background | Spawn them all, then wait |

Per skill:

| Skill | Also needs |
| --- | --- |
| `full-review` | `/code-review` at level L: one more subagent as above, with `reasoning_effort` L, told to run `$review-agent` on the pinned range in the read-only checkout and report only. Levels stay as written: `medium` for quick, `xhigh` for standard and deep, never `max` or `ultra` unless asked. If the spawn rejects L, run it at the session default and say so in the report header. `<drift-check folder>` is `<repo>/claude/skills/drift-check/`. |
| `ready-check` | Scouts are `explorer` subagents. The wrapper maps the Codex models the teammate uses onto the three rows of the fit table, and the argument takes either a row name (`haiku`, `sonnet`, `opus`) or one of those Codex models. The verdict line names what was asked for. The mapping is the teammate's call, and the report calls it unverified until a real run backs it. A memory note means Codex memories if they're on; otherwise skip it. |
| `challenge-review`, `drift-check`, `test-review` | Nothing beyond the shared table. |

## Example: the `full-review` wrapper

```markdown
---
name: full-review
description: Use when a diff, branch or PR needs more than one review pass, such as before marking an important PR ready, or when the user asks for a full, deep or thorough review.
---

# Full review (Codex)

Run `pwd -P` in this file's folder; `<repo>` is three levels up from the result.
Read `<repo>/claude/skills/full-review/SKILL.md` and follow it exactly, with the
translations below. Where it says "this skill's folder", use
`<repo>/claude/skills/full-review/`.

| The Claude skill says | In Codex |
| --- | --- |
| `/full-review`, `/test-review`, … | `$full-review`, `$test-review`, … |
| Sibling skills at `<this skill's folder>/../<name>/SKILL.md` | `<repo>/codex/skills/<name>/SKILL.md`, never the Claude file |
| `<drift-check folder>` | `<repo>/claude/skills/drift-check/` |
| The project's CLAUDE.md | AGENTS.md and CLAUDE.md, whichever exist; combine their off-limits paths |
| General-purpose subagents, in one message | `spawn_agent` with `fork_context: false`; spawn all, then wait |
| Run `/code-review` at level L | Spawn one more subagent the same way with `reasoning_effort` L: "Run $review-agent on <base>..<head> in <read-only checkout>. Report findings only." If the spawn rejects L, spawn it without an effort and name the effort used in the report header. |

Everything else applies as written, including "did not run" and stopping at the fix list.
```

## Install (macOS or Linux)

Set `AI_TOOLS` to wherever you want the clone, and keep it there: the links
point into it. Nothing else depends on where it lives.

```bash
AI_TOOLS=~/code/ai-tools
git clone https://github.com/robbchar/ai-tools.git "$AI_TOOLS"
mkdir -p ~/.agents/skills
for d in "$AI_TOOLS"/codex/skills/*/; do ln -s "${d%/}" ~/.agents/skills/; done
```

Then start a new Codex session. `git pull` updates both the Claude skills and the
wrappers. Install by symlink only: a copied wrapper can't find the repo.

**Needs:** `git`, `gh`, and Python 3 with PyYAML for drift-check; Linear's MCP
server in Codex for Linear tickets in ready-check. Claude Code isn't needed.

**Permissions:** the skills write to `.git` (scratch worktrees), use the network
(`gh`, test-review's dependency installs), and run tests. Under Codex's default
sandbox, expect approval prompts for these. The teammate picks their own
sandbox settings; the wrappers don't change them.

## Ownership

The owner of this repo owns `claude/`; the teammate owns `codex/` and builds the
follow-up PR, since the ready-check mapping and the checks need their Codex
setup. When a Claude skill gains a new Claude-only reference (an agent name, a
built-in command, a model name), its wrapper needs a line. Nothing automates
that yet: the teammate watches changes to `claude/skills/`.

## Delivery and checks

One follow-up PR adds the five wrappers and an install section in the README.
Before it's ready:

- `git diff main -- claude/` is empty.
- Codex's `/skills` lists each of the five once, and `$review-agent` is
  installed. If it isn't, the `full-review` wrapper falls back to a short review
  brief for the subagent and says so in the report header.
- On a small fixture diff with a rename and a behavior change, `$full-review
  standard` runs the review subagent at `xhigh` (or reports the fallback),
  test-review, drift-check and the audit; `deep` adds the focus passes.
- `$ready-check` runs on a sample ticket from the tracker the team uses.
- The PR records the Codex version and sandbox settings used.

## What changed from the first version of this plan

The first version edited the Claude skills: host notes inline, native defaults
in place of the `/code-review` levels, and handoff profiles in place of model
names. Each of those changed how the skills behave in Claude. This version keeps
its good parts (honest "did not run" reporting, fresh workers, approval before
fixes) and moves every Codex difference into `codex/`.

## Technical references

- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
