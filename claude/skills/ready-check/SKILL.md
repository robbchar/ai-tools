---
name: ready-check
description: Use when asked whether a ticket is ready to implement, or ready to hand to an implementer subagent or a stated handoff profile or intended model, before writing an implementation brief or dispatching anyone.
---

# Ready check

## Overview

Decide whether a ticket can go to an implementer with a stated handoff profile without inventing facts or making decisions outside that profile. Tickets are drafted from partial context, and the better one reads, the more it invites trust: treat every factual claim as unverified until the code backs it. Report only; edit nothing.

## Arguments

`ready-check <TICKET> [transcription|specified|design] [intended-model]` (Claude: `/ready-check`; Codex: `$ready-check`). TICKET is a GitHub issue number, Linear identifier, or supplied complete ticket export (report the export as a snapshot). The profile defaults to `specified`. For existing Claude invocations, `haiku`, `sonnet`, and `opus` remain aliases for `transcription`, `specified`, and `design`, respectively; retain the alias as the intended model in the report. An intended model is context, not a request to switch the session model or proof of capability. A model name alone uses the default profile; ask only if the intended handoff permissions remain unclear.

## Steps

1. **Read the whole ticket.** Description, every comment, relations, status, assignee and author. Use the available Linear or GitHub tools and fetch comments separately if the issue response omits them; with GitHub CLI use `gh issue view <N> --comments`. If a required ticket field or comments cannot be read, identify the missing information and keep the verdict unverified rather than treating it as empty. Follow the host's project instructions (`CLAUDE.md` in Claude, `AGENTS.md` in Codex), and linked guidelines, for its PR size budget, reviewer rules and data rules, and any memory note on the ticket.
2. **Verify every claim on the target branch.** Paths, names, fields, mechanisms, the state of linked work, and each precedent the ticket points at ("follow X"): check what X actually does, not only that it exists. When the claims span more than a few files, use 1-3 fresh native subagents (a named scout if available, otherwise general-purpose), each returning `path:line` per claim. Give each the target files, project exclusions, and claims to verify, without inherited conversation; use native model defaults and session permissions. Run them sequentially when slots are limited, or verify claims inline when delegation is unavailable. Check a small ticket inline. When a claim is about runtime behavior, also check what each environment actually runs (pinned commits, deployed versions), not only the branch. Spot-check yourself every claim the verdict rests on.
3. **Rebuild every set the ticket defines from its source.** When the ticket names a set (the stores holding some data, the callers of a function, the stacks that deploy a service), derive the full set from the authoritative source: a data register, the producer, a route table, or the library or provider docs for what an API can do. Never stop at the ticket's list. For each member, ask what else shares it: a bucket that holds two products' prefixes, a table two services write. Report members the ticket omits.
4. **Find the open decisions.** An "A or B" in the criteria, an undefined term or matcher, a rule the implementer would have to invent, a precedent that covers only part of the work. Each becomes a numbered ruling with options and a recommendation. Before recommending a mechanism, check what else it changes: a shared module edit alters every stack that uses it, frozen ones included.
5. **Name whose call each ruling is.** When the ticket's author is not the user, say so in the verdict line: rulings on the author's design may be questions for the author, and the user may want to wait until the author is reachable.
6. **Score the rest.** PR plan and size against the project's budget; a test for each acceptance criterion that would fail without it (for a docs-only criterion, the doc or grep that shows it is met); blockers and order (relations, open PRs, freezes); constraints the implementer must be told (reviewer rules, data and secret handling).
7. **Judge handoff readiness** with the table below.

## Handoff profiles

| Profile | Permitted work | Not ready for it if |
|---|---|---|
| transcription | Transcribing exact text and code from a brief | Any sentence must be written from source, or any list built |
| specified | Implementing from a pinned spec: named files, stated rules, a case table for any logic that needs judgment | A rule, matcher, inventory or design call is left to it |
| design | Design inside stated goals; security or semantic rules worked out from first principles | The goal itself, or a call that belongs to another person, is open |

A precise brief ships its own errors verbatim. A claim that fails step 2 must be fixed before handoff, not left for the implementer to notice.

## Output

In this order:

1. **Verdict line**: `Ready for <profile>`, `Ready for <profile> after rulings`, or `Not ready: <reason>`. Use Not ready when the goal or scope itself is in question; use after rulings when the goal holds and every fix fits in a brief. Include the intended model when supplied, without claiming models are interchangeable. If required ticket information or code claims remain unverified, say `Unverified: <missing evidence>` instead of Ready. Next line: author, assignee, status, blockers.
2. **Wrong claims**, each with `path:line` and what is true; then one line naming the claims that held.
3. **Missing members** from step 3, each with `path:line`.
4. **Rulings needed**: numbered, with options, a recommendation and whose call it is.
5. **Other gaps**: PR plan, tests, gates.
6. **Next steps offered**, one line each: ticket corrections for the user to post, and the implementation brief. Write their exact text after the rulings land.

Stop there. Editing the ticket, writing the brief and dispatching an implementer each wait for the user's go.

## Common mistakes

| Mistake | Instead |
|---|---|
| Treating the ticket's precedent as a template for all of the work | Say which part it covers; often only the hygiene |
| Inventory stops at the ticket's list | Rebuild it from the source, then ask what else shares each member |
| Recommending a mechanism without its blast radius | Name every stack, caller or plan it changes |
| Calling a ticket ready because it reads well | Readiness is verified claims plus no open calls |
