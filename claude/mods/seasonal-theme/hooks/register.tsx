import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PileView, Reading, SceneChoice } from '../types'

import { describeScene, parseScene } from './command'
import { badgeFor, statusLine } from './environment'
import { makeColors } from './make-colors.js'
import { settle } from './pile'
import { altFor } from './stage/frame'
import { showing } from './stage/visits'
import { parseChoice, pickScene } from './season'
import type { SeasonChoice } from './season'
import { AVAILABLE, seasonById } from './seasons'
import type { Season } from './seasons/types'

const PLUGIN = 'seasonal-theme'

// Change a shape tag when its value's fields change: a reload keeps what older code stored.
const pileAtom = atom(
  { plugin: 'seasonal-theme', key: 'pile' } as const,
  { level: 0, fill: 0, percent: null, from: 0, fromFill: 0, transition: 'none', time: 0 } satisfies PileView as PileView,
  { shape: 'pile-4' },
)
const readingAtom = atom(
  { plugin: 'seasonal-theme', key: 'reading' } as const,
  { live: null, preview: null } satisfies Reading as Reading,
  { shape: 'reading-1' },
)
const sceneAtom = atom(
  { plugin: 'seasonal-theme', key: 'scene' } as const,
  { preview: null } satisfies SceneChoice as SceneChoice,
  { shape: 'scene-1' },
)

// The scene this session shows; the preview is state, so it outlasts a reload.
const currentScene = async ($: EngineInterface, choice: SeasonChoice) =>
  pickScene(choice, new Date(await $.clock.now()), AVAILABLE, (await read($, sceneAtom)).preview)

// Sets a scene's look: its palette and its backdrop.
const applyLook = async ($: EngineInterface, season: Season) => {
  const { theme, problems } = makeColors(season.palette)
  const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

  if (unpainted !== undefined) {
    $.ui.log(`${PLUGIN}: ${unpainted}`)
  }

  try {
    await $.theme.set({ colors: theme, backdrop: { scene: season.id } })
  } catch (error) {
    $.ui.log(`${PLUGIN}: ${String(error)}`)
  }
}

// Moves the reading; redraws the backdrop only when what it shows changes.
const applyReading = async ($: EngineInterface, change: (reading: Reading) => Reading) => {
  const before = await read($, readingAtom)
  const after = await update($, readingAtom, change)
  const next = settle(await read($, pileAtom), before, after, Math.floor(await $.clock.now()))

  if (next !== null) {
    await update($, pileAtom, () => next)
  }

  return after
}

// When a drawing is made; the view's own time where the clock can't be read while drawing.
const drawingTime = async ($: EngineInterface, view: PileView) => {
  try {
    return await $.clock.now()
  } catch {
    return view.time
  }
}

const isOurs = (plugin: string) => plugin === PLUGIN || plugin.startsWith(`${PLUGIN}@`)

export const register: Register = (on, options) => {
  const choice = parseChoice(options.season)
  // Set at each session start, which a reload runs again.
  let badge: string | undefined
  // Where the turkey's visit loop starts on the clock (ms); a drawing can't write state, so it lives here.
  let visitAnchor = 0

  on('session.start', async ($, e, next) => {
    await applyLook($, seasonById((await currentScene($, choice)).id))

    badge = badgeFor((await $.session.info()).platform)
    await $.command.register({
      name: 'scene',
      description: 'Preview a scene, a context percent or both (/scene winter 80), or end the preview (/scene off)',
      argumentHint: '[scene] [percent] | off',
    })

    // A resumed session starts with its pile already sized.
    const { context } = await $.session.usage()
    const reading = await applyReading($, current => ({ ...current, live: context.percent ?? current.live }))
    $.ui.status(statusLine(badge, reading))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      const reading = await applyReading($, current => ({ ...current, live: e.context.percent ?? null }))
      $.ui.status(statusLine(badge, reading))
    }

    return next(e)
  })

  on('command.run', { command: 'scene' }, async ($, e) => {
    const parsed = parseScene(e.args, AVAILABLE)

    if (parsed.kind === 'bad') {
      return { text: parsed.reason }
    }

    if (parsed.kind !== 'show') {
      const before = await currentScene($, choice)
      const scene = parsed.kind === 'off' ? null : parsed.scene
      await update($, sceneAtom, current => ({ preview: parsed.kind === 'off' ? null : (scene ?? current.preview) }))
      const after = await currentScene($, choice)

      // The look first, so a percent preview's move plays in the new scene.
      if (after.id !== before.id) {
        await applyLook($, seasonById(after.id))
      }

      if (parsed.kind === 'off' || parsed.percent !== null) {
        const preview = parsed.kind === 'off' ? null : parsed.percent
        $.ui.status(statusLine(badge, await applyReading($, current => ({ ...current, preview }))))
      }
    }

    return { text: describeScene(await currentScene($, choice), await read($, readingAtom)) }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || !isOurs(e.props.plugin)) {
      return next(e)
    }

    const season = seasonById(e.props.scene)
    const view = await read($, pileAtom)
    const shown = showing(view, await drawingTime($, view), visitAnchor)
    visitAnchor = shown.anchor
    const { Svg } = $.ui.resolve(e)

    return <Svg source={season.draw(shown.view, shown.phase)} alt={altFor(season.describe, shown.view)} isInteractive />
  })
}
