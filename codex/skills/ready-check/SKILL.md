---
name: ready-check
description: Use when asked whether a ticket is ready to implement, or ready to hand to an implementer subagent or a specific model, before writing an implementation brief or dispatching anyone.
---

# Ready check (Codex)

This is the Claude Code skill of the same name, run in Codex.

1. Run `pwd -P` in the folder this file was loaded from. `<repo>` is three levels up from the result.
2. Read `<repo>/claude/skills/ready-check/SKILL.md` completely and follow it, with the substitutions below.

| The Claude skill says | Do this in Codex |
| --- | --- |
| The model argument, `sonnet`, `haiku` or `opus`, and the Model fit table | The table's rows are the bar to judge against. Map the argument to a row with the model mapping below. |
| Scouts | `explorer` subagents: `spawn_agent` with `agent_type: "explorer"`. |
| The project's CLAUDE.md | AGENTS.md and CLAUDE.md, whichever exist. |
| Linear's `get_issue` and `list_comments` | Linear's MCP tools, if configured. If they aren't, say the ticket couldn't be read in full and stop. |
| A memory note on the ticket | Codex memories, if they're on; otherwise skip it. |

## Model mapping

| Fit-table row | Codex models |
| --- | --- |
| `haiku` | not mapped yet |
| `sonnet` | not mapped yet |
| `opus` | not mapped yet |

The argument takes a row name, or a Codex model listed in this table. The default is `sonnet`. While the argument's row lists no Codex models, the verdict line adds "(no Codex model checked against this bar yet)".
