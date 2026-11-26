# seasonal-theme

Claude Code mod: a seasonal look for the desktop app, with two signals on top of it. Each signal has its own channel, so they never get mixed up:

| Channel | Shows | Where |
| --- | --- | --- |
| Palette and backdrop | the season, picked by date | the app's colors and the scene behind the chat |
| The scene's gauge: fall's tree and leaf pile, winter's snow | how much of the context window is used (and, in fall, how much is left) | the backdrop |
| A wooden sign | the exact context percent | the backdrop |
| `WSL` / `WIN` badge, then the percent | where Claude Code is running, and the exact percent even when the scene is covered | the status line under the prompt |

Two seasons have scenes: fall (September to November) and winter (December to February). Both move in steps of 5% of the context window, warn from 75%, and play a wrap-up gag from 90%. Everything updates after each turn, since that's when Claude Code measures the context window. Coming back to a session later shows the scene as it stands, without replaying its last move.

The status line under the prompt shows the same percent as the sign, after the badge: `WSL · 42% context`.

## Fall: the tree and the pile

A cream and hearth-brown palette, leaves that drift down now and then, and a cartoon turkey that wanders in to peck about, coming back after a random 30 seconds to 2 minutes. A new turn doesn't restart a visit, and when you come back to a session, it's out within a few seconds. The leaves are the context. A big tree on the left starts in full leaf and goes bare as the window fills, and with each step a gust carries its leaves across to the pile on the right. Far trees along the horizon drop their leaves too, in three bigger steps at 30%, 60% and 90%, and leaves gather on the ground. Pumpkins sit at the big tree's foot, and a scarecrow stands on a hill in the distance.

The pile keeps the same width and grows taller with each step; at 100% it stands almost the full height of the window, a silly, teetering tower of leaves.

| Context used | Big tree | Pile |
| --- | --- | --- |
| under 5% | in full leaf | a few leaves on the ground |
| 5–50% | thins with each step | rises a step at a time |
| 50–75% | about half bare | starts to teeter; leaves fall more often |
| 75–90% | nearly bare | turns redder and wobbles more, as a gentle warning |
| 90% and up | bare, but for one last leaf | the turkey launches itself to the top and dives in, and only its tail feathers stick out: time to wrap up or compact |

A wooden sign on a post beside the tower shows the exact percent, updated every turn. It collects a couple of stuck leaves at 30%, 60% and 90%, and its numerals turn red from 75%.

Each 5% step plays once: a gust lifts leaves off the tree, the clumps it strips fall away, the leaves blow across the window, and the tower springs up as they land. When the reading drops sharply (10 points or more, or it goes missing), as after a compact or `/clear`, the tower sinks away, its leaves swirl back up into the tree, and the tree fills out again, the far trees with it. If the turkey was in the pile, it floats down from the top and stays away for at least 40 seconds.

## Winter: the snow and the house

A frosty blue-gray palette with an amber accent. Snow rises across the whole window, measured against an A-frame house on the right. A tall evergreen stands on the left, far evergreens are scattered across the back (closer and bigger toward the window's sides), and a sign hangs on two ropes from the top-left, in front of everything. The roof, the trees and the sign gather more snow as the window fills, and the far trees sink into their own snow, less the farther away they are.

Snow falls now and then at three depths: far flakes are small, slow, faint dots, and near ones are bigger, faster, soft-focus stars. Each flake rests unseen between falls, the timing reshuffles every redraw, and snow falls more often from 50%. A red fox visits on the same clock as fall's turkey, trotting in along the snow and cocking its head to listen.

| Context used | Snow | Everything else |
| --- | --- | --- |
| under 5% | a dusting along the bottom | light snow caps; the fox visits |
| 5–75% | rises a step at a time | more snow on the roof, the trees and the sign |
| 75–90% | keeps rising | the sign's numerals turn red and the house's windows glow warmer |
| 90% and up | just under the house's peak, about 43% of the window, a little higher at 100% | only the roof peak, the chimney and the treetop show; the fox has dived in and only its tail sticks out |

Each 5% step plays a short flurry of heavier snow, then the snow rises from its old level, however many steps it jumps. Crossing into 90%, the fox then runs in, leaps, and dives headfirst into the snow with a puff. A small drop eases the snow down. A compact or `/clear` sinks it, slides the roof's snow off both slopes, and blows the snow off the tree and the sign. If the fox was in the snow, it pops out, runs off, and stays away for at least 40 seconds.

The house and the tree keep their size as the window narrows, until there's no longer room for both side by side (below about 0.89 × the window's height in width). Then they shrink together, the sign with them. An open side pane covers the right of the backdrop without resizing it, so the house and the fox hide behind it, while the snow level and the sign stay in view.

## Preview a scene

`/scene` previews a scene, a context percent or both, in this session only and without touching the live reading. `/scene winter` shows another scene, `/scene 80` shows this one at 80%, and `/scene winter 80` does both; the words can come in either order. The status line marks a percent preview `(preview)`. `/scene off` ends both previews, and `/scene` on its own says what's showing and why. A scene preview lasts through the mod reloading, which helps while you edit a season.

## Where it draws

- **Desktop app:** everything.
- **Mobile app:** the backdrop, possibly still.
- **Terminal and editors:** no theme or backdrop, since they don't draw themes. The status line, with its badge and percent, still shows.

With reduced motion turned on, the app takes the scene's animation out, and each scene shows its settled picture. Fall's tree still shows its leaves and the pile its size, and the tail still shows at 90% and up; there are no gusts, swirls or wandering turkey. Winter's snow sits at its level and the fox's tail still shows at 90% and up; there are no flakes, flurries, visits, dives or sliding snow.

With no context reading yet, as in a new session, each scene shows its plain level: a few leaves on the ground, or a dusting of snow.

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

Each season draws its own scene. A season is a `Season` (`hooks/seasons/types.ts`) in its own folder under `hooks/seasons/`, with:

- `palette`: the app's colors, run through `makeColors`.
- `draw(view, phase)`: the backdrop as an SVG string, for a view (level, fill, percent, and the move from the last view) and `phase`, the seconds into the visitor's loop.
- `describe(level)`: what a reader who can't see the scene is told, for each level.
- `visitor`: the visiting critter's markup, facing left, feet on y=0, with groups classed `head`, `leg-a` and `leg-b` that carry no transform of their own.

Shared pieces live in `hooks/stage/`:

- `frame` wraps a scene in its root, with the dark-mode and reduced-motion rules.
- `cornerStages` and `topLeftStage` pin art to the window's corners at one shared scale.
- `coverLayer` covers the window without squashing.
- `visitMarkup` and `holdAfterPopout` run a visitor on the shared clock.
- `sceneProblems` checks a drawing against the engine's rules.

`hooks/seasons/fall/` and `hooks/seasons/winter/` show two quite different scenes built from them.

1. Add the season's folder, with an `index.ts` that exports its `Season`.
2. Add it to `SEASONS` in `hooks/seasons/index.ts`.
3. Add its id to the `season` options in `.claude-plugin/plugin.json`.

To see it, run `/scene <season>` in a session, then `/scene 30`, `/scene 60`, `/scene 80` and `/scene 95` to step through its levels. `/scene off` then drops back to the live reading, which plays the compact when that's 10 or more points lower.

`hooks/seasons/seasons.test.ts` checks every registered season. Its palette must have no "Desktop won't paint" line, every level and move must draw a scene the engine accepts, and so must every move between any two fills, under the 131,072-character cap. The steps and levels live in `hooks/pile.ts` and don't change per season.

## Develop

```
claude plugin validate .
claude plugin test .
```

The palette goes through `hooks/make-colors.js`, which is copied from Claude Code's plugin-authoring skill. Don't edit it; copy it again when Claude Code updates.
