# seasonal-theme

Claude Code mod: a seasonal look for the desktop app, with two signals on top of it. Each signal has its own channel, so they never get mixed up:

| Channel | Shows | Where |
| --- | --- | --- |
| Palette and backdrop | the season, picked by date | the app's colors and the scene behind the chat |
| Leaf pile in the bottom-right corner | how full the context window is, by its height | the backdrop |
| `WSL` / `WIN` badge | where Claude Code is running | the status line under the prompt |

Only fall exists so far: a cream and hearth-brown palette, leaves that drift down now and then, a cartoon turkey that wanders in to peck about, and a leaf pile. On the left, for balance, stand a tree whose last few leaves drop now and then, pumpkins at its foot, and a scarecrow far off on a hill. The left side is decoration only: it shows no signal.

## The pile

The pile keeps the same width and grows taller with every 5% of the context window used. At 100% it stands almost the full height of the window: a silly, teetering tower of leaves.

| Context used | Pile |
| --- | --- |
| under 5% | a few leaves on the ground |
| 5–50% | a pile that rises a step at a time |
| 50–75% | a tower that starts to teeter; leaves fall more often |
| 75–90% | the tower turns redder and wobbles more, as a gentle warning |
| 90% and up | the turkey launches itself to the top and dives in, and only its tail feathers stick out: time to wrap up or compact |

Each 5% step springs the tower up once. When the reading drops sharply (10 points or more, or it goes missing), as after a compact or `/clear`, the tower bursts apart, and if the turkey was in it, the turkey floats down from the top. The pile updates after each turn, since that's when Claude Code measures the context window.

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
   - `wanderer.peek`: what sticks out of the top of the pile at 90% and up.
   - `scenery`: still art for the bottom-left corner, with the points that left-side drifters fall from, such as a tree's branches. Groups classed `far` draw faint, as if in the distance.
2. Add it to `SEASONS` in `hooks/seasons/index.ts`.
3. Add its id to the `season` options in `.claude-plugin/plugin.json`.

`hooks/seasons/seasons.test.ts` checks every registered season. Its palette must have no "Desktop won't paint" line, and every level and transition must draw a scene the engine accepts. The pile's steps, levels and transitions live in `hooks/pile.ts` and `hooks/scene.ts` and don't change per season.

## Develop

```
claude plugin validate .
claude plugin test .
```

The palette goes through `hooks/make-colors.js`, which is copied from Claude Code's plugin-authoring skill. Don't edit it; copy it again when Claude Code updates.
