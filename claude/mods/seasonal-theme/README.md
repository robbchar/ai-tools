# seasonal-theme

Claude Code mod: a seasonal look for the desktop app, with two signals on top of it. Each signal has its own channel, so they never get mixed up:

| Channel | Shows | Where |
| --- | --- | --- |
| Palette and backdrop | the season, picked by date | the app's colors and the scene behind the chat |
| Leaves: the big tree's crown and the pile in the bottom-right corner | how much of the context window is left (the tree) and used (the pile) | the backdrop |
| Sign beside the pile | the exact context percent | the backdrop |
| `WSL` / `WIN` badge, then the percent | where Claude Code is running, and the exact percent even when the corner is covered | the status line under the prompt |

Only fall exists so far: a cream and hearth-brown palette, leaves that drift down now and then, and a cartoon turkey that wanders in to peck about, coming back after a random 30 seconds to 2 minutes. A new turn doesn't restart a visit, and when you come back to a session, it's out within a few seconds. The leaves are the context. A big tree on the left starts in full leaf and goes bare as the window fills, and with each step a gust carries its leaves across to the pile on the right. Far trees along the horizon drop their leaves too, in three bigger steps at 30%, 60% and 90%, and leaves gather on the ground. Pumpkins sit at the big tree's foot, and a scarecrow stands on a hill in the distance.

## The tree and the pile

Both move in steps of 5% of the context window. The pile keeps the same width and grows taller with each step; at 100% it stands almost the full height of the window, a silly, teetering tower of leaves.

| Context used | Big tree | Pile |
| --- | --- | --- |
| under 5% | in full leaf | a few leaves on the ground |
| 5–50% | thins with each step | rises a step at a time |
| 50–75% | about half bare | starts to teeter; leaves fall more often |
| 75–90% | nearly bare | turns redder and wobbles more, as a gentle warning |
| 90% and up | bare, but for one last leaf | the turkey launches itself to the top and dives in, and only its tail feathers stick out: time to wrap up or compact |

A wooden sign on a post beside the tower shows the exact percent, updated every turn. It collects a couple of stuck leaves at 30%, 60% and 90%, and its numerals turn red from 75%. The status line under the prompt shows the same number after the badge, as `WSL · 42% context`.

Each 5% step plays once: a gust lifts leaves off the tree, the clumps it strips fall away, the leaves blow across the window, and the tower springs up as they land. When the reading drops sharply (10 points or more, or it goes missing), as after a compact or `/clear`, the tower sinks away, its leaves swirl back up into the tree, and the tree fills out again, the far trees with it. If the turkey was in the pile, it floats down from the top and stays away for at least 40 seconds. Everything updates after each turn, since that's when Claude Code measures the context window. Coming back to a session later shows the scene as it stands, without replaying its last move.

`/scene` previews a scene, a context percent or both, in this session only and without touching the live reading. `/scene winter` shows another scene, `/scene 80` shows this one at 80%, and `/scene winter 80` does both; the words can come in either order. The status line marks a percent preview `(preview)`. `/scene off` ends both previews, and `/scene` on its own says what's showing and why. A scene preview lasts through the mod reloading, which helps while you edit a season.

## Where it draws

- **Desktop app:** everything.
- **Mobile app:** the backdrop, possibly still.
- **Terminal and editors:** no theme or backdrop, since they don't draw themes. The status line, with its badge and percent, still shows.

With reduced motion turned on, the app takes the scene's animation out. The tree still shows its leaves and the pile its size, the tail still shows at 90% and up, and there are no gusts, swirls or wandering turkey.

With no context reading yet, as in a new session, the scene shows the plain level: a few leaves on the ground.

## Load it in the desktop app

Add this folder to `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`. Under WSL, separate the folders with `:`:

```json
"env": {
  "CLAUDE_CODE_PLUGIN_DIRS": "~/Projects/ai-tools/claude/mods/term-here:~/Projects/ai-tools/claude/mods/seasonal-theme",
  "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
}
```

New Code sessions pick it up.

## Pin a season

The mod's **Season** setting is `auto` by default, which picks by date: December–February winter, March–May spring, June–August summer, September–November fall. Pick a season to pin it. A season without art yet shows fall.

## Add a season

1. Copy `hooks/seasons/fall.ts` to `hooks/seasons/<season>.ts` and give it its own palette and art:
   - `pile.piece`: one pile piece, such as a snow clump.
   - `pile.mound`, `pile.warmMound`: the heap under the pieces, and its warning color.
   - `drifter`: what falls now and then.
   - `wanderer.body`: the visiting critter, facing left, feet on y=0, with groups classed `head`, `leg-a` and `leg-b`.
   - `wanderer.peek`: what sticks out of the top of the pile at 90% and up.
   - `scenery.tree`: the big tree's branches, the clumps of leaves it loses as context fills, their colors, and where the last leaf clings.
   - `scenery.markup`: still art for the bottom-left corner. Groups classed `far` draw faint, as if in the distance.
   - `sign`: the board's wood, the numerals' ink and their warning ink in each mode, and an ornament for the board's corner.
   - `distance`: the field's color, and a cluster of far trees drawn at a fullness of 1, 0.66, 0.33 or 0 (bare), with each crown in a group classed `crown` so it can regrow.
2. Add it to `SEASONS` in `hooks/seasons/index.ts`.
3. Add its id to the `season` options in `.claude-plugin/plugin.json`.

To see it, run `/scene <season>` in a session, then `/scene 30`, `/scene 60`, `/scene 80` and `/scene 95` to step through its levels. `/scene off` then drops back to the live reading, which plays the compact's swirl when that's 10 or more points lower.

`hooks/seasons/seasons.test.ts` checks every registered season. Its palette must have no "Desktop won't paint" line, and every level and transition must draw a scene the engine accepts. The steps, levels, gusts and swirls live in `hooks/pile.ts` and `hooks/scene.ts` and don't change per season.

## Develop

```
claude plugin validate .
claude plugin test .
```

The palette goes through `hooks/make-colors.js`, which is copied from Claude Code's plugin-authoring skill. Don't edit it; copy it again when Claude Code updates.
