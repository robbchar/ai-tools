import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PileView, Reading } from '../types'

import { badgeFor } from './environment'
import { makeColors } from './make-colors.js'
import { describeReading, parseLeaves, settle } from './pile'
import { renderScene } from './scene'
import { parseChoice, pickSeason } from './season'
import { AVAILABLE, seasonById } from './seasons'

const PLUGIN = 'seasonal-theme'

// Change a shape tag when its value's fields change: a reload keeps what older code stored.
const pileAtom = atom(
  { plugin: 'seasonal-theme', key: 'pile' } as const,
  { level: 0, fill: 0, from: 0, fromFill: 0, transition: 'none', seed: 0 } satisfies PileView as PileView,
  { shape: 'pile-2' },
)
const readingAtom = atom(
  { plugin: 'seasonal-theme', key: 'reading' } as const,
  { live: null, preview: null } satisfies Reading as Reading,
  { shape: 'reading-1' },
)

// Moves the reading; redraws the backdrop only when the pile changes level.
const applyReading = async ($: EngineInterface, change: (reading: Reading) => Reading) => {
  const before = await read($, readingAtom)
  const after = await update($, readingAtom, change)
  const next = settle(await read($, pileAtom), before, after, Math.floor(await $.clock.now()) % 100_000)

  if (next !== null) {
    await update($, pileAtom, () => next)
  }

  return after
}

const isOurs = (plugin: string) => plugin === PLUGIN || plugin.startsWith(`${PLUGIN}@`)

export const register: Register = (on, options) => {
  const choice = parseChoice(options.season)

  on('session.start', async ($, e, next) => {
    const season = seasonById(pickSeason(choice, new Date(await $.clock.now()), AVAILABLE))
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

    $.ui.status(badgeFor((await $.session.info()).platform))
    await $.command.register({
      name: 'leaves',
      description: 'Preview the seasonal pile at a context fill (/leaves 80), or go back to live (/leaves off)',
      argumentHint: '<percent> | off',
    })

    // A resumed session starts with its pile already sized.
    const { context } = await $.session.usage()
    await applyReading($, reading => ({ ...reading, live: context.percent ?? reading.live }))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('context')) {
      await applyReading($, reading => ({ ...reading, live: e.context.percent ?? null }))
    }

    return next(e)
  })

  on('command.run', { command: 'leaves' }, async ($, e) => {
    const parsed = parseLeaves(e.args)

    if (parsed.kind === 'bad') {
      return { text: parsed.reason }
    }

    if (parsed.kind === 'show') {
      return { text: describeReading(await read($, readingAtom)) }
    }

    const preview = parsed.kind === 'preview' ? parsed.percent : null
    const reading = await applyReading($, current => ({ ...current, preview }))

    return { text: describeReading(reading) }
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || !isOurs(e.props.plugin)) {
      return next(e)
    }

    const season = seasonById(e.props.scene)
    const view = await read($, pileAtom)
    const { Svg } = $.ui.resolve(e)

    return <Svg source={renderScene(season.art, view)} alt={season.art.describe(view.level)} isInteractive />
  })
}
