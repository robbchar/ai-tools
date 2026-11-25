# seasonal-theme

Claude Code mod: a seasonal look for the desktop app, with two signals on top of it. Each signal has its own channel, so they never get mixed up:

| Channel | Shows | Where |
| --- | --- | --- |
| Palette and backdrop | the season, picked by date | the app's colors and the scene behind the chat |
| Leaves: the big tree's crown and the pile in the bottom-right corner | how much of the context window is left (the tree) and used (the pile) | the backdrop |
| `WSL` / `WIN` badge | where Claude Code is running | the status line under the prompt |

Only fall exists so far: a cream and hearth-brown palette, leaves that drift down now and then, and a cartoon turkey that wanders in to peck about. The leaves are the context. A big tree on the left starts in full leaf and goes bare as the window fills, and with each step a gust carries its leaves across to the pile on the right. Far trees along the horizon thin a little too, and leaves gather on the ground. Pumpkins sit at the big tree's foot, and a scarecrow stands on a hill in the distance.

## The tree and the pile

Both move in steps of 5% of the context window. The pile keeps the same width and grows taller with each step; at 100% it stands almost the full height of the window, a silly, teetering tower of leaves.

| Context used | Big tree | Pile |
| --- | --- | --- |
| under 5% | in full leaf | a few leaves on the ground |
| 5–50% | thins with each step | rises a step at a time |
| 50–75% | about half bare | starts to teeter; leaves fall more often |
| 75–90% | nearly bare | turns redder and wobbles more, as a gentle warning |
| 90% and up | bare, but for one last leaf | the turkey launches itself to the top and dives in, and only its tail feathers stick out: time to wrap up or compact |

Each step plays once: a gust lifts leaves off the tree, the clumps it strips fall away, the leaves blow across the window, and the tower springs up as they land. When the reading drops sharply (10 points or more, or it goes missing), as after a compact or `/clear`, the tower sinks away, its leaves swirl back up into the tree, and the tree fills out again. If the turkey was in the pile, it floats down from the top. Everything updates after each turn, since that's when Claude Code measures the context window.

`/leaves 80` previews the pile at 80% without touching the live reading. `/leaves off` goes back to live, and `/leaves` on its own says where things stand.

## Where it draws

- **Desktop app:** everything.
- **Mobile app:** the backdrop, possibly still.
- **Terminal and editors:** no theme or backdrop, since they don't draw themes. The status line badge still shows.

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
   - `distance`: the field's color, and a cluster of far trees drawn at a fullness from 1 down to 0.5.
2. Add it to `SEASONS` in `hooks/seasons/index.ts`.
3. Add its id to the `season` options in `.claude-plugin/plugin.json`.

`hooks/seasons/seasons.test.ts` checks every registered season. Its palette must have no "Desktop won't paint" line, and every level and transition must draw a scene the engine accepts. The steps, levels, gusts and swirls live in `hooks/pile.ts` and `hooks/scene.ts` and don't change per season.

## Develop

```
claude plugin validate .
claude plugin test .
```

The palette goes through `hooks/make-colors.js`, which is copied from Claude Code's plugin-authoring skill. Don't edit it; copy it again when Claude Code updates.
