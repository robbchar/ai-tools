# Plan for portable skills across Claude Code and Codex

Add Codex support for all five skills while keeping one authoritative workflow
per skill. Put host-specific invocation, model selection, agent dispatch, and
installation behavior behind adapters. Claude Code and Codex are the first two
adapters; another host should need an adapter and conformance checks rather than
copies of the review logic.

This is a proposed implementation plan. This branch changes documentation only.

## Current coupling

The baseline is commit `d2384854142357bc7ede4f4a5f6b56017a1f2795`.

| Location | Coupling to remove from shared instructions |
| --- | --- |
| `claude/skills/*/SKILL.md` | Claude command syntax, `CLAUDE.md` discovery, and sibling skill paths. |
| `full-review` | Named `/code-review` dependency, concrete effort levels, and background subagent instructions. |
| `challenge-review` | `diff-reviewer` / `general-purpose` dispatch and fresh-context assumptions. |
| `ready-check` | Sonnet, Haiku, and Opus as both model selectors and readiness criteria; connector-specific ticket calls. |
| `claude/agents/*.md` | Claude frontmatter, model aliases, tool names, and native worktree configuration. |
| `drift-check` | Python helpers already use Git and Python directly; workflow analysis additionally needs PyYAML. |

Preserve the review levels, report formats, evidence requirements, coverage
ledgers, scratch-tree mutation rules, and report-only stopping points. Hooks and
`term-here` stay Claude-specific and outside this migration.

## Shared source and host packages

Use a small deterministic packaging script rather than a new agent runner.
Native hosts remain responsible for execution and permissions. The following
layout is proposed, not an existing installation interface:

```text
shared/
  skills/<name>/            # canonical metadata, workflow, helpers, and lenses
  roles/                   # scout, reviewer, auditor, test runner, diagnostic role
adapters/
  claude/                  # entry templates, native agent templates, role mapping
  codex/                   # entry templates, native agent templates, role mapping
scripts/
  build_skills.py          # render packages and check generated-file freshness
  test_build_skills.py     # colocated packaging and adapter contract checks
claude/skills/<name>/       # generated installable packages; preserve existing paths
claude/agents/              # native agent definitions rendered from shared roles
codex/skills/<name>/        # generated installable packages
codex/agents/               # generated native Codex agent definitions
```

Each generated skill contains its full workflow, a local host reference, and all
its own scripts and prompts. Installation by copying one skill directory must
not depend on files left in the source checkout. Declare sibling skill and native
agent dependencies separately; install the complete suite for `full-review`.
Resolve sibling skills through the adapter's installed inventory rather than
assuming that every host installs them side by side.

Generated files are committed so existing Claude installs and GitHub path-based
installers still work. Mark them as generated, document their source, and make
CI fail when regeneration changes them. Update workflows in `shared/`, never in
both host packages by hand. Keep host instructions short and load their reference
only when the skill runs.

## Adapter interface and configuration

An adapter supplies these facts and behaviors to the shared workflow:

| Concern | Adapter responsibility |
| --- | --- |
| Host and version | Identify the host explicitly and record the tested client version. |
| Instructions | Follow the host's instruction discovery and precedence; propagate project data exclusions to every worker. |
| Skills and dependencies | Resolve installed skill locations and bind the baseline code review operation. |
| Roles | Map shared roles to available native agents, model policy, and supported reasoning settings. |
| Delegation | Launch, wait, collect results, and respect the actual concurrency limit. |
| Isolation | Supply a cold context and scratch checkout where required; separate mutation writers from readers. |
| Integrations | Read the full ticket and comments through available GitHub or Linear tools. |
| Reporting | Record the resolved configuration, executed passes, failures, omissions, and evidence. |

Select the adapter when packaging or installing (`claude` or `codex`). The host
then discovers only its own entry point; shared instructions do not guess which
product is running them. A future automatic installer may use reliable host
metadata as a fallback, but ambiguous detection must require an explicit choice.

Keep model names and native effort enums in adapter configuration. Shared roles
describe the task and required independence, not a claim that two providers'
models have equal capability. Use the host's inherited model by default; allow
documented native configuration to specialize roles. Treat `quick`, `standard`,
and `deep` as review coverage choices, independently of model settings.

Map both `Explore` and `scout` to exploration roles while preserving their output
contracts; map `diff-reviewer`, `test-runner`, and `sleuth` to review, verification,
and diagnosis roles. Preserve role tool limits and `sleuth`'s worktree and turn
budget where the host can enforce them. Record unsupported controls explicitly:
a read-only prompt is intent, not an independently enforced sandbox. Keep the
auditor separate from the original reviewer even when both use the same model.

Resolve effective settings using each host's native precedence, including managed
policy and user settings. Validate requested role settings against the installed
client and available models, then report the effective model and effort when
observable. An unsupported explicit setting is a configuration error, not a
reason to silently select another model. Keep permission and sandbox policy with
the host; an adapter cannot authorize additional access.

### Missing capabilities

Sequential execution of independent passes is acceptable when fresh worker
contexts are available but concurrency is limited. Running the auditor in the
author's context does not provide an independent audit. When a required fresh
context, tool, permission, dependency, or isolated checkout is unavailable,
report that stage as unavailable and the review as incomplete. A limited report
may include completed stages, but must not claim the requested review passed.
Never launch a separate unrestricted agent process to bypass session policy.

The baseline review binding is configurable. Do not assume `/code-review` is
bundled or installed just because a host has a review feature. Bind an installed
review skill or a documented native operation that supports the pinned target,
returns findings to the coordinator, and preserves the report-only contract.
If neither fits, use the repository's shared diff-reviewer role as the explicit
fallback and disclose it. Check the binding before starting expensive passes;
stop with an actionable dependency error if no compatible binding is available.

## Changes to each skill

| Skill | Planned changes | Behavior that must remain |
| --- | --- | --- |
| `drift-check` | Move helpers with the shared workflow; use adapter instruction discovery and absolute installed helper paths. | Excluded paths, manual verification of script output, stale prose search, and workflow dependency checks. |
| `test-review` | Use common scratch-tree lifecycle instructions and host-specific test-runner dispatch when available. | Remove and miswire each rule; check the whole package before declaring a survivor; verify Python import provenance and clean restoration. |
| `challenge-review` | Request focus reviewers and an independent auditor through adapter roles. | Cold inputs for focus passes, complete coverage ledgers, executed evidence for higher severity, and verification of auditor changes. |
| `full-review` | Resolve the baseline review binding and sibling dependencies; schedule finders within host limits. | Existing level coverage, conditional drift checks, audit after all finders, and the prioritized fix list. |
| `ready-check` | Replace brand names in readiness criteria with explicit implementation profiles and adapt ticket reads. | Verify claims, rebuild named sets, identify decision owners, and stop before editing or dispatching. |

For `ready-check`, introduce `transcription`, `specified`, and `design` profiles.
Default to `specified`, matching the current brief-driven intent. A profile
describes how much unresolved judgment the handoff permits; it does not guarantee
that a model will succeed. Keep Sonnet, Haiku, and Opus arguments as documented
Claude compatibility aliases. A Codex or future model selection must name its
profile or use a configured mapping; avoid inferring competence from its brand.
Show both the readiness profile and intended model in the verdict when known.

## Implementation sequence

1. **Extract the source and preserve Claude behavior.** Move workflows, roles,
   lenses, and helpers into shared source; render the existing Claude paths.
   Add deterministic regeneration and package link checks. Exit when every
   existing skill has a traceable shared source and existing installation paths
   still contain complete packages.
2. **Define and implement both adapters.** Add the role mapping, baseline review
   binding, dependency checks, and capability reporting. Render Codex skills and
   native agents. Document installation for the supported CLI surfaces and the
   tested versions. Exit when both hosts discover all five skills from installed
   packages outside the source checkout and load their native role definitions.
3. **Adapt orchestration and readiness.** Remove concrete dispatch names and
   model enums from shared workflows, add readiness profiles and Claude aliases,
   and exercise missing-capability handling. Exit when the same fixture targets
   run through both adapters with the required stages and honest omissions.
4. **Document and check portability.** Update README installation and invocation
   examples, dependency requirements, model configuration, and measured costs per
   host. Add an adapter contract document and a minimal synthetic third-adapter
   fixture. Exit when adding that fixture needs no edits to the shared workflows.

Land these as small dependent implementation PRs after the plan is agreed. The
planning PR introduces no runtime behavior or installation changes.

Keep existing Claude command names and install paths throughout rollout. Publish
Codex packages only after their smoke checks pass; document skill destinations
and native agent installation separately. Preserve user configuration during
installation and upgrades, and make conflicts explicit. A user can roll back by
reinstalling the previous pinned package revision; keep package source and
adapter revisions together so an upgrade cannot mix incompatible versions.

## Validation and acceptance

Run deterministic checks in CI and record actual host smoke runs separately.
Mock dispatch alone does not establish that a native host loads a skill or agent.

| Check | Required evidence |
| --- | --- |
| Package completeness | Copy packages to a temporary install root, hide the source checkout, and resolve every script, prompt, lens, and declared dependency. Include paths containing spaces. |
| Generation | Two builds produce identical bytes; changing a shared rule updates both host packages; stale generated content makes the check fail. |
| Native configuration | Parse emitted YAML/TOML and load it in each tested client. Check a valid configuration and an invalid or unavailable explicit model/effort selection. |
| Routing and settings | Explicit host selection wins; ambiguous automatic selection fails; effective native configuration is recorded without claiming uniform precedence across hosts. |
| Review orchestration | Exercise all three levels with a concurrency limit, a failed finder, a missing dependency, and a missing fresh-context capability. Verify the audit only follows completed finder collection. |
| Isolation | Plant an untracked author note in the source tree and verify cold workers do not receive it; mutations affect only the writer's scratch tree; cleanup preserves the user's work. |
| Review behavior | A synthetic rename leaves stale documentation; a workflow misses a local module path; a mutation survives tests; the auditor refutes a planted false finding. Both hosts retain the expected report obligations. |
| Readiness | Exercise a wrong ticket claim, an omitted set member, an open design decision, all profiles, Claude compatibility aliases, and an unmapped model selector. |
| Extensibility | A synthetic third adapter packages and resolves the existing workflows without introducing host branches into shared instructions. |

Done means all five skills are usable in Claude Code and Codex, current Claude
installation paths remain supported, installed packages are complete, shared
review rules have one source of truth, and unavailable stages are visible in the
report. Brand independence is established at the adapter interface; support for
another real product still requires its own implementation and smoke runs.

## Technical references

The proposed layout and adapter interface are project design choices. Verify
native fields and discovery behavior against the client versions used during
implementation; the current references were checked on November 17, 2026.

- [Codex skills](https://learn.chatgpt.com/docs/build-skills): skill packaging,
  discovery, supporting files, and invocation.
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents):
  native agent definitions, model configuration, and inherited permissions.
- [Claude Code skills](https://code.claude.com/docs/en/skills): skill discovery,
  invocation, and supporting files.
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents): agent
  frontmatter, role configuration, and execution capabilities.
