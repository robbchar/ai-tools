---
name: ready-check
description: Use when asked whether a ticket is ready to implement, or ready to hand to an implementer subagent or a specific model (Sonnet, Haiku, Opus), before writing an implementation brief or dispatching anyone.
---

# Ready check

## Overview

Decide whether a ticket can go to an implementer of a given model without that model making design calls or inventing facts. Tickets are drafted from partial context, and the better one reads, the more it invites trust: treat every factual claim as unverified until the code backs it. Report only; edit nothing.

## Arguments

`/ready-check <TICKET> [sonnet|haiku|opus]`. The model defaults to `sonnet`. TICKET is a Linear identifier or a GitHub issue number.

## Steps

1. **Read the whole ticket.** Description, every comment, relations, status, assignee and author. Linear's `get_issue` returns no comments, so also call `list_comments`; for GitHub use `gh issue view <N> --comments`. Read the project's CLAUDE.md, and the files it points to, for its PR size budget, reviewer rules and data rules, and any memory note on the ticket.
2. **Verify every claim on the target branch.** Paths, names, fields, mechanisms, the state of linked work, and each precedent the ticket points at ("follow X"): check what X actually does, not only that it exists. When the claims span more than a few files, use 1-3 parallel scouts, each returning `path:line` per claim; check a small ticket inline. When a claim is about runtime behavior, also check what each environment actually runs (pinned commits, deployed versions), not only the branch. Spot-check yourself every claim the verdict rests on.
3. **Rebuild every set the ticket defines from its source.** When the ticket names a set (the stores holding some data, the callers of a function, the stacks that deploy a service), derive the full set from the authoritative source: a data register, the producer, a route table, or the library or provider docs for what an API can do. Never stop at the ticket's list. For each member, ask what else shares it: a bucket that holds two products' prefixes, a table two services write. Report members the ticket omits.
4. **Find the open decisions.** An "A or B" in the criteria, an undefined term or matcher, a rule the implementer would have to invent, a precedent that covers only part of the work. Each becomes a numbered ruling with options and a recommendation. Before recommending a mechanism, check what else it changes: a shared module edit alters every stack that uses it, frozen ones included.
5. **Name whose call each ruling is.** When the ticket's author is not the user, say so in the verdict line: rulings on the author's design may be questions for the author, and the user may want to wait until the author is reachable.
6. **Score the rest.** PR plan and size against the project's budget; a test for each acceptance criterion that would fail without it (for a docs-only criterion, the doc or grep that shows it is met); blockers and order (relations, open PRs, freezes); constraints the implementer must be told (reviewer rules, data and secret handling).
7. **Judge model fit** with the table below.

## Model fit

| Model | Trust it with | Not ready for it if |
|---|---|---|
| haiku | Transcribing exact text and code from a brief | Any sentence must be written from source, or any list built |
| sonnet | Implementing from a pinned spec: named files, stated rules, a case table for any logic that needs judgment | A rule, matcher, inventory or design call is left to it |
| opus | Design inside stated goals; security or semantic rules worked out from first principles | The goal itself, or a call that belongs to another person, is open |

A precise brief ships its own errors verbatim. A claim that fails step 2 must be fixed before handoff, not left for the implementer to notice.

## Output

In this order:

1. **Verdict line**: `Ready for <model>`, `Ready for <model> after rulings`, or `Not ready: <reason>`. Use Not ready when the goal or scope itself is in question; use after rulings when the goal holds and every fix fits in a brief. Next line: author, assignee, status, blockers.
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
