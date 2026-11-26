import { describe, expect, test } from 'claude-code/testing'
import type { Engine, TestBody } from 'claude-code/testing'
import type { SessionInfo, ThemeSetArgs } from 'claude-code'

const PLUGIN = 'seasonal-theme'
const BACKDROP = { scene: 'fall', plugin: PLUGIN, glass: false } as const

const leaves = (args: string) => ({
  command: 'leaves',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})

const reading = (percent: number | undefined) => ({
  context: { window: 200_000, ...(percent === undefined ? {} : { percent, tokens: percent * 2000 }) },
  rateLimits: [],
  changed: ['context' as const],
})

type On = Parameters<TestBody>[1]

// Stands in for the engine beneath the plugin.
const engine = (
  on: On,
  {
    platform = 'wsl',
    date = new Date(2026, 10, 25, 12),
    now = () => date.getTime(),
  }: { platform?: SessionInfo['platform']; date?: Date; now?: () => number } = {},
) => {
  const looks: ThemeSetArgs[] = []
  const statuses: (string | undefined)[] = []
  on('clock.now', () => ({ value: now() }))
  on('session.info', () => ({ value: { transcriptPath: '/t', platform } }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('theme.set', (_, e) => {
    looks.push(e)

    return { value: { isDrawn: true, requestId: 'r' } }
  })
  on('ui.status', (_, e) => {
    statuses.push(e.text)

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'leaves' } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.measure', (_, e) => ({ changed: e.changed }))

  return { looks, statuses }
}

const start = ($: Engine) =>
  $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

const drawn = async ($: Engine, plugin: string = PLUGIN) => {
  const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'desktop', component: 'Backdrop', props: { ...BACKDROP, plugin } })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()

  return svg
}

const drawnScene = async ($: Engine, plugin: string = PLUGIN) => {
  const svg = await drawn($, plugin)

  return svg === undefined ? undefined : String(svg.props.source)
}

// The turkey's visit loop as drawn: its length and its start, in seconds.
const visitLoop = (svg: string | undefined) => {
  const [, seconds = 'NaN', delay = 'NaN'] = svg?.match(/animation:visit ([\d.]+)s linear (-?[\d.]+)s infinite/) ?? []

  return { seconds: Number(seconds), delay: Number(delay) }
}

describe('seasonal-theme', () => {
  test('in November it sets the fall look with its backdrop', async ($, on) => {
    const { looks } = engine(on)
    await start($)

    expect(looks).toHaveLength(1)
    expect(looks[0]?.backdrop).toEqual({ scene: 'fall' })
    expect(looks[0]?.colors).toBeDefined()
  })

  test('a date whose season has no art yet still gets fall', async ($, on) => {
    const { looks } = engine(on, { date: new Date(2026, 0, 15, 12) })
    await start($)

    expect(looks[0]?.backdrop).toEqual({ scene: 'fall' })
  })

  test('the status line says WSL under WSL', async ($, on) => {
    const { statuses } = engine(on, { platform: 'wsl' })
    await start($)

    expect(statuses).toEqual(['WSL'])
  })

  test('the status line says WIN on native Windows', async ($, on) => {
    const { statuses } = engine(on, { platform: 'windows' })
    await start($)

    expect(statuses).toEqual(['WIN'])
  })

  test('the status line adds the context percent once there is a reading', async ($, on) => {
    const { statuses } = engine(on, { platform: 'wsl' })
    await start($)
    await $.session.measure(reading(41.6))

    expect(statuses.at(-1)).toBe('WSL · 42% context')
  })

  test('a /leaves preview shows in the status line as a preview', async ($, on) => {
    const { statuses } = engine(on, { platform: 'windows' })
    await start($)
    await $.session.measure(reading(30))
    await $.command.run(leaves('95'))

    expect(statuses.at(-1)).toBe('WIN · 95% context (preview)')
  })

  test('the sign and the description carry the exact percent', async ($, on) => {
    engine(on)
    await start($)
    await $.session.measure(reading(43))

    const svg = await drawn($)
    expect(String(svg?.props.source)).toMatch(/>43%<\/text>/)
    expect(String(svg?.props.alt)).toContain('43% of the context window is used.')
  })

  test('with no reading yet the backdrop is the plain fall scene', async ($, on) => {
    engine(on)
    await start($)

    expect(await drawnScene($)).toContain('data-level="0"')
  })

  test('a context reading sizes the pile', async ($, on) => {
    engine(on)
    await start($)
    await $.session.measure(reading(80))

    const svg = await drawnScene($)
    expect(svg).toContain('data-level="3"')
    expect(svg).toContain('data-fill="80"')
    expect(svg).toContain('class="heap grow"')
  })

  test('each 5% step of a later reading grows the pile again', async ($, on) => {
    engine(on)
    await start($)
    await $.session.measure(reading(31))
    await $.session.measure(reading(37))

    expect(await drawnScene($)).toContain('data-fill="35"')
  })

  test('a pile an older version stored is replaced, not misread', async ($, on) => {
    engine(on)
    // What the code before the clock-tied visits stored: a seed, not a time, under the old tag.
    const old = { level: 3, fill: 80, percent: 80, from: 3, fromFill: 80, transition: 'none', seed: 1 }
    on('state.get', (_, e, next) =>
      e.key === 'pile' ? { value: { value: { shape: 'pile-3', value: old }, version: 1 } } : next(e),
    )

    const svg = await drawnScene($)
    expect(svg).toContain('data-fill="0"')
    expect(svg).not.toContain('undefined')
    expect(svg).not.toContain('NaN')
  })

  test('the turkey keeps to the clock from one reading to the next', async ($, on) => {
    let time = new Date(2026, 10, 25, 12).getTime()
    engine(on, { now: () => time })
    await start($)
    await $.session.measure(reading(31))
    const first = visitLoop(await drawnScene($))
    time += 150_000
    await $.session.measure(reading(37))
    const second = visitLoop(await drawnScene($))
    const moved = (((first.delay - second.delay) % first.seconds) + first.seconds) % first.seconds

    expect(Math.abs(moved - 150)).toBeLessThan(0.2)
  })

  test('crossing 90% dives, and a compact scatters the pile', async ($, on) => {
    engine(on)
    await start($)
    await $.session.measure(reading(85))
    await $.session.measure(reading(93))

    expect(await drawnScene($)).toContain('class="dive"')

    await $.session.measure(reading(8))
    const after = await drawnScene($)
    expect(after).toContain('data-level="0"')
    expect(after).toContain('class="popout"')
  })

  test('/leaves previews a fill, and /leaves off goes back to live', async ($, on) => {
    engine(on)
    await start($)
    await $.session.measure(reading(30))

    const previewed = await $.command.run(leaves('95'))
    expect(previewed.text).toBe('Previewing 95%: wrap-up (time to compact). Live is 30%; /leaves off returns to it.')
    expect(await drawnScene($)).toContain('data-level="4"')

    const back = await $.command.run(leaves('off'))
    expect(back.text).toBe('Context 30% (live): small pile.')
    expect(await drawnScene($)).toContain('data-level="1"')
  })

  test('a live reading under a preview does not move the pile', async ($, on) => {
    engine(on)
    await start($)
    await $.command.run(leaves('60'))
    await $.session.measure(reading(10))

    expect(await drawnScene($)).toContain('data-level="2"')
  })

  test('/leaves refuses what it cannot read', async ($, on) => {
    engine(on)
    await start($)

    const out = await $.command.run(leaves('lots'))
    expect(out.text).toBe('"lots" isn\'t a percentage from 0 to 100, or "off".')
  })

  test("another plugin's backdrop is left alone", async ($, on) => {
    engine(on)
    await start($)

    expect(await drawnScene($, 'someone-else')).toBeUndefined()
  })
})
