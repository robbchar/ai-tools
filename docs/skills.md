# Using the skills in Claude Code and Codex

Install the same five folders from `claude/skills/` in either host. The directory
name is historical; no conversion, generated package, or native agent definition
is required. The skills use the host's existing tools and model defaults,
including settings on any named agent you have configured.

## Install

Clone the repository and run the commands below from its root. Choose one
destination:

For Codex personal skills:

```sh
skill_destination="$HOME/.agents/skills"
```

For Claude Code personal skills:

```sh
skill_destination="$HOME/.claude/skills"
```

Then install all five without replacing existing skills:

```sh
mkdir -p "$skill_destination"
for skill_name in full-review challenge-review drift-check test-review ready-check; do
  skill_target="$skill_destination/$skill_name"
  if [ -e "$skill_target" ] || [ -L "$skill_target" ]; then
    echo "Already exists; leaving unchanged: $skill_target"
  else
    ln -s "$PWD/claude/skills/$skill_name" "$skill_target"
  fi
done
```

Keep this checkout available while using symlinks. You can instead copy each
whole folder, including its scripts and supporting Markdown. For project-only
installation, use `<project>/.agents/skills` for Codex or
`<project>/.claude/skills` for Claude. Start a new host session if the skills do
not appear. If another same-name skill is installed, confirm which path the host
loads; the install commands above intentionally leave existing entries alone.

Both hosts need Git, a shell, and the relevant project's test dependencies.
Drift-check needs Python 3; its workflow check additionally needs PyYAML in that
Python environment. Install PyYAML in a virtual environment and activate it
before starting the host, so `python3 -I` can import it. Reviewing GitHub PRs or
tickets also needs an authenticated GitHub CLI or equivalent available tools;
Linear tickets need a connected Linear tool. Native delegation must be available
for independent reviewers. Missing required tools or workers are reported as
unavailable, with the review marked incomplete.

## Invoke

| Task | Claude Code | Codex |
| --- | --- | --- |
| Full review | `/full-review 42 standard` | `$full-review 42 standard` |
| Challenge findings | `/challenge-review main..HEAD none` | `$challenge-review main..HEAD none` |
| Check stale references | `/drift-check main..HEAD` | `$drift-check main..HEAD` |
| Check test sensitivity | `/test-review main..HEAD 4` | `$test-review main..HEAD 4` |
| Check a ticket | `/ready-check 42 specified` | `$ready-check 42 specified` |

Replace `42` with a PR or issue number in the target repository. Review commands
also accept a branch or range; ready-check accepts a Linear issue identifier or
a supplied complete ticket export, identified as a snapshot in its report.
For challenge-review, provide previous findings in the conversation or a file.
The skills report findings and wait for your choice before fixing or posting.

Full-review locates the other installed skills by name. Its baseline review can
use an installed compatible code-review skill, but one is not required: it also
contains a short brief for a fresh general-purpose reviewer. The selected route
appears in the report. A compatible skill must review the pinned target, return
findings, and stay report-only.

`quick`, `standard`, and `deep` select review coverage, not model settings.
Claude-native agents in this repository are optional; Codex uses its own fresh
workers. Both use native model settings without the skills choosing a provider
or translating model names. A cold checkout and a fresh conversation are both
required where the skill calls for independence. Sequential fresh workers are
allowed when there are too few slots for parallel passes.

Ready-check defaults to a `specified` handoff. `transcription` permits exact
transcription, `specified` permits implementation from settled rules, and
`design` permits design within settled goals. Existing `haiku`, `sonnet`, and
`opus` arguments map to those profiles. You can supply an intended model after
the profile; this adds context and does not switch the running model.

## References

- [Codex skills](https://learn.chatgpt.com/docs/build-skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
