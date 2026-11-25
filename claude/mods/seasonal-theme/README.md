# seasonal-theme

Claude Code mod: a seasonal look for the desktop app, with two signals on top of it. Each signal has its own channel, so they never get mixed up:

| Channel | Shows | Where |
| --- | --- | --- |
| Palette and backdrop | the season, picked by date | the app's colors and the scene behind the chat |
| Pile in the bottom-right corner | how full the context window is | the backdrop |
| `WSL` / `WIN` badge | where Claude Code is running | the status line under the prompt |

Only fall exists so far: a cream and hearth-brown palette, leaves that drift down now and then, a cartoon turkey that wanders in to peck about, and a leaf pile.

## The pile

| Context used | Pile |
| --- | --- |
| under 25% | a few scattered leaves |
| 25–50% | a small pile |
| 50–75% | a respectable pile; leaves fall more often |
| 75–90% | a big pile that turns redder, as a gentle warning |
| 90% and up | the turkey dives in, and only its tail feathers stick out: time to wrap up or compact |

When the reading drops sharply (10 points or more, or it goes missing), as after a compact or `/clear`, the leaves scatter, and if the turkey was in the pile it pops back out. Growing, diving and scattering each play once, when the level changes. The pile updates after each turn, since that's when Claude Code measures the context window.

`/leaves 80` previews the pile at 80% without touching the live reading. `/leaves off` goes back to live, and `/leaves` on its own says where things stand.

## Where it draws

- **Desktop app:** everything.
- **Mobile app:** the backdrop, possibly still.
- **Terminal and editors:** no theme or backdrop, since they don't draw themes. The status line badge still shows.

With reduced motion turned on, the app takes the scene's animation out. The pile still shows its size, the tail still shows at 90% and up, and the turkey stays out of sight.

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
   - `wanderer.peek`: what sticks out of the pile at 90% and up.
2. Add it to `SEASONS` in `hooks/seasons/index.ts`.
3. Add its id to the `season` options in `.claude-plugin/plugin.json`.

`hooks/seasons/seasons.test.ts` checks every registered season. Its palette must have no "Desktop won't paint" line, and every level and transition must draw a scene the engine accepts. The pile, the levels and the transitions live in `hooks/pile.ts` and `hooks/scene.ts` and don't change per season.

## Develop

```
claude plugin validate .
claude plugin test .
```

The palette goes through `hooks/make-colors.js`, which is copied from Claude Code's plugin-authoring skill. Don't edit it; copy it again when Claude Code updates.
