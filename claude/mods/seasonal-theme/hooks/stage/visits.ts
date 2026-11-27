import type { PileView } from '../../types'

import { noise, r } from './svg'
import type { Parts } from './svg'

// The visitor's clock, shared by every season: when it visits, and how a redraw picks up the loop.

export const strideKeyframes = (name: string, walks: readonly [number, number][], step: number, swing: number) => {
  const stops: string[] = ['0%{transform:none}']

  for (const [start, end] of walks) {
    let sign = 1
    for (let at = start; at < end; at += step) {
      stops.push(`${r(at * 100) / 100}%{transform:rotate(${sign * swing}deg)}`)
      sign = -sign
    }
    stops.push(`${end}%{transform:none}`)
  }
  stops.push('100%{transform:none}')

  return `@keyframes ${name}{${stops.join('')}}`
}

// One visit, in seconds from its start: walk in, busy about at each beat, turn round, walk off.
export const VISIT = { arrive: 5.4, turn: 10.9, leave: 11.3, gone: 16.8, beats: [6.7, 7.9, 8.5, 9.8] } as const
export const STRIDE = 0.4
const VISITS_PER_LOOP = 5
// Whole seconds off stage between visits, and at least this long after popping out.
const GAP_MIN = 30
const GAP_MAX = 120
const POPOUT_HOLD = 40

// Visits at uneven gaps; the loop repeats, the same in every session.
const visitSchedule = (): { starts: readonly number[]; seconds: number } => {
  const starts: number[] = []
  let at = 0
  for (let k = 0; k < VISITS_PER_LOOP; k++) {
    starts.push(at)
    at += VISIT.gone + Math.round(GAP_MIN + noise(k * 19 + 11) * (GAP_MAX - GAP_MIN))
  }

  return { starts, seconds: r(at) }
}

export const SCHEDULE = visitSchedule()

// A drawing this long after its reading is the view shown again (a switch back), not a new move.
const FRESH_MS = 5_000
// Seconds from such a showing to the visitor stepping on stage.
const VISIT_LEAD = 4

// Seconds into the visit loop at `now`, with the loop's start at `anchor` on the clock (both ms).
const loopAt = (now: number, anchor: number) => {
  const at = ((now - anchor) / 1000) % SCHEDULE.seconds

  return at < 0 ? at + SCHEDULE.seconds : at
}

// Seconds until the next visit steps on stage, or 0 while one is under way.
const untilVisit = (phase: number) => {
  const start = SCHEDULE.starts.findLast(s => s <= phase) ?? 0

  return phase - start < VISIT.gone ? 0 : (SCHEDULE.starts.find(s => s > phase) ?? SCHEDULE.seconds) - phase
}

export type Showing = { view: PileView; phase: number; anchor: number }

// A drawing made `now`. Soon after its reading it plays the view's move, and the visits run on from
// `anchor`. Later, as on a switch back, it shows the view settled and brings the next visit close.
export const showing = (view: PileView, now: number, anchor: number): Showing => {
  const phase = loopAt(now, anchor)

  if (now - view.time < FRESH_MS) {
    return { view, phase, anchor }
  }

  const settled: PileView = { ...view, from: view.level, fromFill: view.fill, transition: 'none' }
  const wait = untilVisit(phase)

  if (wait <= VISIT_LEAD + 2) {
    return { view: settled, phase, anchor }
  }

  const moved = anchor - Math.round((wait - VISIT_LEAD) * 1000)

  return { view: settled, phase: loopAt(now, moved), anchor: moved }
}

// How long the visitor stays away after popping out; a visit still under way then is skipped whole.
export const holdAfterPopout = (phase: number) => {
  const then = (phase + POPOUT_HOLD) % SCHEDULE.seconds
  const into = then - (SCHEDULE.starts.findLast(start => start <= then) ?? 0)

  return into < VISIT.gone ? POPOUT_HOLD + VISIT.gone - into : POPOUT_HOLD
}

// Who visits, where it stands, and what its head does at each beat.
export type Visitor = {
  body: string
  x: number
  y: number
  offstageX: number
  head: (name: string, beats: readonly number[], pct: (at: number) => number) => string
}

// Now and then the visitor walks in from the right, busies about, and walks off.
export const visitMarkup = (who: Visitor, phase: number, hold: number, parts: Parts): string => {
  const { starts, seconds } = SCHEDULE
  const pct = (at: number) => Math.round((at / seconds) * 100_000) / 1000
  const away = `transform:translateX(${who.offstageX - who.x}px)`
  const loop = (ahead = 0) => `${seconds}s linear ${r(-phase - ahead)}s infinite`
  const walk = starts.map(s =>
    `${pct(s)}%{${away}}${pct(s + VISIT.arrive)}%,${pct(s + VISIT.leave)}%{transform:none}${pct(s + VISIT.gone)}%{${away}}`)
  const turn = starts.map(s =>
    `${pct(s + VISIT.turn)}%{transform:none}${pct(s + VISIT.leave)}%,${pct(s + VISIT.gone)}%{transform:scaleX(-1)}` +
    `${pct(s + VISIT.gone + 0.1)}%{transform:none}`)
  const walks = starts.flatMap((s): [number, number][] => [
    [pct(s), pct(s + VISIT.arrive)],
    [pct(s + VISIT.leave), pct(s + VISIT.gone)],
  ])
  parts.css.push(
    `.visit{${away};animation:visit ${loop()}}`,
    `@keyframes visit{${walk.join('')}100%{${away}}}`,
    `.visit .turn{animation:visitturn ${loop()}}`,
    `@keyframes visitturn{0%{transform:none}${turn.join('')}100%{transform:none}}`,
    `.visit .head{animation:visitpeck ${loop()}}`,
    who.head('visitpeck', starts.flatMap(s => VISIT.beats.map(at => s + at)), pct),
    // One set of strides: leg-b runs a stride ahead, so the legs swing opposite ways.
    `.visit .leg-a{animation:visitleg ${loop()}}`,
    `.visit .leg-b{animation:visitleg ${loop(STRIDE)}}`,
    strideKeyframes('visitleg', walks, (STRIDE / seconds) * 100, 20),
  )
  const body = `<g class="visit"><g class="turn">${who.body}</g></g>`

  if (hold === 0) {
    return `<g transform="translate(${who.x} ${who.y})">${body}</g>`
  }

  parts.css.push(`.hold{animation:hold ${Math.ceil(hold * 10) / 10}s step-end both}`, '@keyframes hold{from{opacity:0}to{opacity:1}}')

  return `<g transform="translate(${who.x} ${who.y})"><g class="hold">${body}</g></g>`
}
