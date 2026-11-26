import type { Level, PileView } from '../../../types'

import { frame } from '../../stage/frame'
import { isWarm, modeRule, noise, pathOf, pick, r } from '../../stage/svg'
import type { Parts, Point } from '../../stage/svg'
import { holdAfterPopout, visitMarkup } from '../../stage/visits'

import type { Clump, FallArt, PieceArt } from './types'

// Two 1000-unit stages pinned to the window's bottom corners, scaled to its shorter side:
// the tower on the right, the season's tree and scenery on the left. A stage unit is
// 0.1vmin, which is how leaves that fly between the two stages are placed.
const GROUND_Y = 985
const PILE_X = 850
const HALF_WIDTH = 112
const TOWER_MAX = 880
const PECK_X = 585
const SIGN_X = 668
const OFFSTAGE_X = 1120
const PIECE_SCALE = 1.65
const TEETER_FROM = 50
const EDGE_GAP = 22
const GUST_LEAVES = 9
const SWIRL_LEAVES = 22
const FAR_CLUSTERS = [18, 29, 40, 51, 62, 73]

type Spot = Point & { turn: number; i: number }
type Tower = { height: number; cap: number }
type Side = 'left' | 'right'

const placed = (spot: Spot, inner: string, scale = PIECE_SCALE) =>
  `<g transform="translate(${r(spot.x)} ${r(spot.y)}) rotate(${r(spot.turn)}) scale(${scale})">${inner}</g>`

// -- The tower --------------------------------------------------------------------------

// Height follows the fill; the width never changes, so a full window gets a silly, tall tower.
const towerOf = (fill: number): Tower => {
  const height = (fill / 100) * TOWER_MAX

  return { height, cap: Math.min(height, HALF_WIDTH * 0.95) }
}

// Half the tower's width at a height: a skirt of spilled leaves at the foot, a slight
// taper up the sides, rounded over the top.
const halfWidthAt = (tower: Tower, y: number): number => {
  const shoulder = tower.height - tower.cap
  const taper = (h: number) => HALF_WIDTH * (1 - 0.16 * (h / TOWER_MAX))
  const skirt = 1 + 0.24 * Math.max(0, 1 - y / 80) ** 2

  if (y <= shoulder) {
    return taper(y) * skirt
  }

  const k = (y - shoulder) / tower.cap

  return taper(shoulder) * skirt * Math.sqrt(Math.max(0, 1 - k * k))
}

// The outline, base-left up and over to base-right, with lumps; the base corners stay put.
const outlineOf = (tower: Tower): Point[] => {
  const shoulder = tower.height - tower.cap
  const sideRows = Math.max(1, Math.round(shoulder / 30))
  const side = shoulder > 0 ? Array.from({ length: sideRows }, (_, k) => (k / sideRows) * shoulder) : []
  const cap = Array.from({ length: 6 }, (_, k) => shoulder + tower.cap * Math.sin((k / 5) * (Math.PI / 2)))
  const heights = [...side, ...cap]
  const lump = (k: number, salt: number) => (k === 0 ? 1 : 1 + (noise(k * 31 + salt) - 0.5) * 0.16)
  const left = heights.map((y, k) => ({ x: PILE_X - halfWidthAt(tower, y) * lump(k, 7), y: GROUND_Y - y }))
  const right = heights.map((y, k) => ({ x: PILE_X + halfWidthAt(tower, y) * lump(k, 13), y: GROUND_Y - y }))

  return [...left, ...right.reverse().slice(1)]
}

// Leaves along the outline, so the silhouette reads as leaves, a few units inside it.
const edgeSpots = (points: readonly Point[], offset: number): Spot[] => {
  const spots: Spot[] = []
  let carry = 0

  for (const [k, point] of points.slice(0, -1).entries()) {
    const next = points[k + 1] ?? point
    const length = Math.hypot(next.x - point.x, next.y - point.y)

    for (let along = carry; along < length; along += EDGE_GAP) {
      const t = along / length
      const x = point.x + (next.x - point.x) * t
      const i = offset + spots.length
      spots.push({ x: x + Math.sign(PILE_X - x) * 3, y: point.y + (next.y - point.y) * t + 2, turn: noise(i * 7 + 3) * 360, i })
    }

    carry = (((carry - length) % EDGE_GAP) + EDGE_GAP) % EDGE_GAP
  }

  return spots
}

// Leaves over the face of the tower, spread by area.
const faceSpots = (tower: Tower): Spot[] => {
  const count = Math.round((2 * HALF_WIDTH * 0.92 * tower.height) / 1500)

  return Array.from({ length: count }, (_, i) => {
    const y = (0.03 + noise(i * 7 + 2) * 0.92) * tower.height

    return {
      x: PILE_X + (noise(i * 7 + 1) * 2 - 1) * halfWidthAt(tower, y) * 0.82,
      y: GROUND_Y - y,
      turn: noise(i * 7 + 3) * 360,
      i,
    }
  })
}

const towerColors = (art: FallArt, level: Level) => (isWarm(level) ? art.pile.warmColors : art.pile.colors)

const ratio = (from: number, to: number) => Math.round((from / to) * 100) / 100

const peekMarkup = (art: FallArt, tower: Tower, isRising: boolean) =>
  `<g transform="translate(${PILE_X + 4} ${r(GROUND_Y - tower.height + 16)})"><g class="peek">` +
  `<g${isRising ? ' class="rise"' : ''}><g class="wiggle">${art.wanderer.peek}</g></g></g></g>`

const towerMarkup = (art: FallArt, view: PileView, parts: Parts): string => {
  const tower = towerOf(view.fill)

  if (tower.height === 0) {
    return ''
  }

  const colors = towerColors(art, view.level)
  const outline = outlineOf(tower)
  const face = faceSpots(tower)
  const edge = edgeSpots(outline, face.length)
  const leaf = (spot: Spot) => placed(spot, `<g class="piece">${art.pile.piece(pick(colors, spot.i) ?? '', spot.i)}</g>`)
  const from = towerOf(view.fromFill).height
  const move = { grow: 'grow', dive: 'grow', shrink: 'shrink', scatter: 'regrow', none: '' }[view.transition]

  if (move === 'grow' || move === 'shrink') {
    parts.css.push(
      `@keyframes ${move}{from{transform:scaleY(${Math.max(0.05, ratio(from, tower.height))})}` +
        `${move === 'grow' ? '75%{transform:scaleY(1.03)}' : ''}to{transform:none}}`,
    )
  }

  const heap =
    `<g class="${move === '' ? 'heap' : `heap ${move}`}">` +
    `<path class="mound" d="${pathOf(outline)}"/>${face.map(leaf).join('')}` +
    `${view.level === 4 ? peekMarkup(art, tower, view.transition === 'dive') : ''}${edge.map(leaf).join('')}</g>`
  const teeter = view.fill < TEETER_FROM ? '' : view.level >= 3 ? 'teeter wobbly' : 'teeter'

  return teeter === '' ? heap : `<g class="${teeter}">${heap}</g>`
}

// After a compact: the old tower's outline sinks and fades where it stood.
const collapseMarkup = (art: FallArt, view: PileView): string => {
  const tower = towerOf(view.fromFill)

  if (tower.height === 0) {
    return ''
  }

  const colors = towerColors(art, view.from)
  const outline = outlineOf(tower)
  const bits = edgeSpots(outline, 0).map(spot => placed(spot, `<g class="bit">${art.pile.piece(pick(colors, spot.i) ?? '', spot.i)}</g>`))

  return `<g class="collapse"><path class="mound" d="${pathOf(outline)}"/>${bits.join('')}</g>`
}

const litterMarkup = (art: FallArt, view: PileView): string => {
  const reach = view.fill === 0 ? 0 : HALF_WIDTH
  const colors = towerColors(art, view.level)

  return Array.from({ length: view.fill === 0 ? 5 : 4 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const spot: Spot = {
      x: Math.min(PILE_X + side * (reach + 18 + noise(i * 5 + 11) * 90), 990),
      y: GROUND_Y - 2 - noise(i * 5 + 12) * 5,
      turn: noise(i * 5 + 13) * 360,
      i,
    }

    return placed(spot, `<g class="litter">${art.pile.piece(pick(colors, i + 3) ?? '', i + 1)}</g>`)
  }).join('')
}

// -- The big tree -----------------------------------------------------------------------

// How full the tree is: 1 with no context used, 0 at 100%.
const fullnessOf = (fill: number) => 1 - fill / 100

// Each clump holds on until the tree's fullness drops to its own mark; all are gone by 90%.
const marksOf = (count: number): number[] => {
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => noise(a * 11 + 5) - noise(b * 11 + 5))
  const marks = Array.from({ length: count }, () => 0)
  order.forEach((i, rank) => {
    marks[i] = 0.1 + 0.85 * (count === 1 ? 0 : rank / (count - 1))
  })

  return marks
}

const blobPath = (clump: Clump, radius: number, salt: number): string => {
  const points = Array.from({ length: 9 }, (_, k) => {
    const angle = (k / 9) * Math.PI * 2
    const reach = radius * (0.86 + noise(salt * 13 + k) * 0.26)

    return { x: clump.x + Math.cos(angle) * reach, y: clump.y + Math.sin(angle) * reach }
  })
  const mid = (a: Point, b: Point) => `${r((a.x + b.x) / 2)} ${r((a.y + b.y) / 2)}`
  const curves = points.map((point, k) => `Q${r(point.x)} ${r(point.y)} ${mid(point, points[(k + 1) % points.length] ?? point)}`)

  return `M${mid(points.at(-1) ?? clump, points[0] ?? clump)}${curves.join('')}Z`
}

const clumpMarkup = (art: FallArt, clump: Clump, i: number, radius: number, extra: string, delay: number): string => {
  const colors = art.scenery.tree.colors
  const count = Math.max(4, Math.round((2 * Math.PI * radius) / 58))
  const leaves = Array.from({ length: count }, (_, j) => {
    const angle = (j / count) * Math.PI * 2 + noise(i * 17 + j)
    const spot: Spot = {
      x: clump.x + Math.cos(angle) * radius * 0.92,
      y: clump.y + Math.sin(angle) * radius * 0.92,
      turn: noise(i * 17 + j + 3) * 360,
      i: j,
    }

    return placed(spot, art.pile.piece(pick(colors, i + j + 1) ?? '', j), 1.5)
  })
  const style = delay > 0 ? ` style="animation-delay:${r(delay)}s"` : ''

  return `<g class="clump${extra}"${style}><path d="${blobPath(clump, radius, i)}" fill="${pick(colors, i) ?? ''}"/>${leaves.join('')}</g>`
}

type CrownState = { visible: Clump[]; leaving: Clump[] }

const crownOf = (art: FallArt, fill: number, fromFill: number): CrownState & { marks: number[] } => {
  const clumps = art.scenery.tree.clumps
  const marks = marksOf(clumps.length)
  const now = fullnessOf(fill)
  const before = fullnessOf(fromFill)

  return {
    marks,
    visible: clumps.filter((_, i) => now > (marks[i] ?? 1)),
    leaving: clumps.filter((_, i) => before > (marks[i] ?? 1) && now <= (marks[i] ?? 1)),
  }
}

const treeMarkup = (art: FallArt, view: PileView): string => {
  const tree = art.scenery.tree
  const now = fullnessOf(view.fill)
  const before = fullnessOf(view.fromFill)
  const marks = marksOf(tree.clumps.length)
  const isGust = view.transition === 'grow' || view.transition === 'dive'
  const isRefill = view.transition === 'scatter' || view.transition === 'shrink'
  let arrivals = 0
  const clumps = tree.clumps.map((clump, i) => {
    const mark = marks[i] ?? 1
    const isVisible = now > mark
    const wasVisible = before > mark

    if (isVisible) {
      const radius = clump.r * (0.62 + 0.38 * Math.min(1, (now - mark) / 0.2))
      const isArriving = isRefill && !wasVisible
      const delay = isArriving ? (view.transition === 'scatter' ? 1.8 : 0.1) + arrivals++ * 0.12 : 0

      return clumpMarkup(art, clump, i, radius, isArriving ? ' arrive' : '', delay)
    }

    return isGust && wasVisible ? clumpMarkup(art, clump, i, clump.r * 0.7, ' leave', 0.2 + noise(i + 7) * 0.6) : ''
  })
  const last =
    view.level === 4
      ? `<g transform="translate(${tree.lastLeaf.x} ${tree.lastLeaf.y}) scale(1.6)"><g class="cling">${art.pile.piece(pick(tree.colors, 2) ?? '', 0)}</g></g>`
      : ''

  return `<g class="tree${isGust ? ' gusting' : ''}">${tree.branches}${clumps.join('')}${last}</g>`
}

// -- Leaves that fly between the stages -------------------------------------------------

type StagePoint = Point & { side: Side }

// A point between two stage points, as CSS lengths for the unscaled root layer.
const between = (a: StagePoint, b: StagePoint, t: number, lift: number, sway: number): string => {
  const width = (side: Side) => (side === 'left' ? 0 : 100)
  const across = (p: StagePoint) => (p.side === 'left' ? p.x / 10 : -(1000 - p.x) / 10)
  const vw = width(a.side) * (1 - t) + width(b.side) * t
  const vmin = across(a) * (1 - t) + across(b) * t + sway
  const x = vw === 0 ? `${r(vmin)}vmin` : vmin <= 0 ? `calc(${r(vw)}vw - ${r(-vmin)}vmin)` : `calc(${r(vw)}vw + ${r(vmin)}vmin)`
  const up = ((1000 - a.y) / 10) * (1 - t) + ((1000 - b.y) / 10) * t + lift

  return `${x},calc(100vh - ${r(up)}vmin)`
}

type Flight = { name: string; from: StagePoint; to: StagePoint; stops: readonly [number, number, number, number][]; seconds: number; delay: number }

// Each stop is [percent, t along the way, lift in vmin, sideways sway in vmin].
const flightMarkup = (art: FallArt, flight: Flight, i: number, parts: Parts): string => {
  const spin = 300 + noise(i + 61) * 500
  const frames = flight.stops.map(([at, t, lift, sway]) => {
    const fade = at === 0 || at === 100 ? 0 : 0.95

    return `${at}%{transform:translate(${between(flight.from, flight.to, t, lift, sway)}) rotate(${r(spin * t)}deg);opacity:${fade}}`
  })
  parts.css.push(
    `@keyframes ${flight.name}{${frames.join('')}}`,
    `.${flight.name}{animation:${flight.name} ${r(flight.seconds)}s ease-in-out ${r(flight.delay)}s both}`,
  )

  return `<g class="${flight.name.startsWith('g') ? 'gust' : 'swirl'} ${flight.name}"><g transform="scale(1.5)">${art.pile.piece(pick(art.drifter.colors, i) ?? '', i)}</g></g>`
}

// Each step up: a gust lifts leaves off the tree and carries them across to the pile.
const gustMarkup = (art: FallArt, view: PileView, parts: Parts): string => {
  const crown = crownOf(art, view.fill, view.fromFill)
  const sources = crown.leaving.length > 0 ? crown.leaving : crown.visible.length > 0 ? crown.visible : art.scenery.tree.clumps
  const topOfPile = GROUND_Y - towerOf(view.fill).height + 20

  return Array.from({ length: GUST_LEAVES }, (_, i) => {
    const source = pick(sources, i) ?? { x: 200, y: 500, r: 40 }
    const from: StagePoint = { side: 'left', x: source.x + (noise(i + 31) - 0.5) * source.r, y: source.y + (noise(i + 32) - 0.5) * source.r }
    const to: StagePoint = { side: 'right', x: PILE_X + (noise(i + 33) - 0.5) * 120, y: topOfPile }
    const lift = 6 + noise(i + 34) * 8

    return flightMarkup(art, {
      name: `g${i}`,
      from,
      to,
      stops: [[0, 0, 0, 0], [8, 0.06, 2, 0], [35, 0.3, lift, 2], [60, 0.58, lift * 0.6, -2], [85, 0.86, lift * 0.4, 1], [100, 1, 0, 0]],
      seconds: 3.6 + noise(i + 35) * 0.9,
      delay: i * 0.14,
    }, i, parts)
  }).join('')
}

// After a compact: leaves swirl up off the old pile and back into the tree.
const swirlMarkup = (art: FallArt, view: PileView, parts: Parts): string => {
  const old = towerOf(view.fromFill)
  const spots = old.height === 0 ? [] : edgeSpots(outlineOf(old), 0)
  const crown = crownOf(art, view.fill, view.fromFill)
  const targets = crown.visible.length > 0 ? crown.visible : art.scenery.tree.clumps

  return Array.from({ length: SWIRL_LEAVES }, (_, i) => {
    const spot = pick(spots, i * 7) ?? { x: PILE_X, y: GROUND_Y - 20 }
    const target = pick(targets, i) ?? { x: 200, y: 500, r: 40 }
    const from: StagePoint = { side: 'right', x: spot.x, y: spot.y }
    const to: StagePoint = { side: 'left', x: target.x + (noise(i + 41) - 0.5) * target.r, y: target.y + (noise(i + 42) - 0.5) * target.r }
    const curl = 4 + noise(i + 43) * 6

    return flightMarkup(art, {
      name: `s${i}`,
      from,
      to,
      stops: [[0, 0, 0, 0], [6, 0.01, 4, 0], [22, 0.06, 16, curl], [42, 0.22, 26, -curl], [62, 0.5, 22, 0], [82, 0.82, 10, curl / 2], [100, 1, 0, 0]],
      seconds: 3 + noise(i + 44) * 0.8,
      delay: 0.2 + i * 0.05,
    }, i, parts)
  }).join('')
}

// -- The wanderer -----------------------------------------------------------------------

// Alternating leg swings over walking stretches of a looping timeline.
const peckKeyframes = (name: string, pecks: readonly number[], pct: (at: number) => number) => {
  const stops = pecks.flatMap(at => [
    `${pct(at)}%{transform:none}`,
    `${pct(at + 0.24)}%{transform:rotate(-38deg)}`,
    `${pct(at + 0.6)}%{transform:none}`,
  ])

  return `@keyframes ${name}{0%{transform:none}${stops.join('')}100%{transform:none}}`
}

// Reaching the wrap-up level: the wanderer crouches, launches up the tower, and dives in at the top.
const diveMarkup = (art: FallArt, view: PileView, parts: Parts): string => {
  const top = r(towerOf(view.fill).height)
  parts.css.push(
    '.dive{opacity:0;animation:dive 7s linear both}',
    `@keyframes dive{0%{transform:translate(${OFFSTAGE_X}px,0);opacity:1}30%{transform:translate(1010px,0)}` +
      '36%{transform:translate(1010px,0) scale(1.08,.84)}40%{transform:translate(1005px,-40px) scale(.94,1.1)}' +
      `60%{transform:translate(940px,-${r(Math.min(top + 150, 890))}px) rotate(-15deg)}` +
      `70%{transform:translate(${PILE_X + 12}px,-${r(top + 20)}px) rotate(-75deg) scale(.85);opacity:1}` +
      `76%{transform:translate(${PILE_X + 6}px,-${r(top - 30)}px) rotate(-85deg) scale(.6);opacity:0}` +
      `100%{transform:translate(${PILE_X}px,-${r(top - 30)}px);opacity:0}}`,
    '.dive .leg-a{animation:stride .35s linear 6 alternate}',
    '.dive .leg-b{animation:stride .35s linear 6 alternate-reverse}',
    '.rise{animation:rise 2s ease-out 5.3s both}',
    '@keyframes rise{from{transform:translateY(46px);opacity:0}70%{transform:translateY(-6px);opacity:1}to{transform:none;opacity:1}}',
  )

  return `<g transform="translate(0 ${GROUND_Y})"><g class="dive">${art.wanderer.body}</g></g>`
}

// After a compact or clear: the wanderer pops out of the top and floats down as the tower goes.
const popoutMarkup = (art: FallArt, view: PileView, parts: Parts): string => {
  const top = r(towerOf(view.fromFill).height)
  parts.css.push(
    '.popout{opacity:0;animation:popout 10s linear both}',
    `@keyframes popout{0%{transform:translate(${PILE_X}px,-${top}px) scale(.4);opacity:0}` +
      `6%{transform:translate(${PILE_X - 10}px,-${r(top + 60)}px);opacity:1}` +
      `13%{transform:translate(800px,-${r(top * 0.65)}px) rotate(12deg)}20%{transform:translate(750px,-${r(top * 0.3)}px) rotate(-10deg)}` +
      '28%{transform:translate(700px,0)}31%{transform:translate(700px,-14px)}34%,46%{transform:translate(700px,0)}' +
      `80%{transform:translate(${OFFSTAGE_X}px,0);opacity:1}100%{transform:translate(${OFFSTAGE_X}px,0);opacity:0}}`,
    '.popout .turn{animation:popturn 10s linear both}',
    '@keyframes popturn{0%,46%{transform:none}48%,100%{transform:scaleX(-1)}}',
    '.popout .leg-a{animation:stride .4s linear 4.8s 9 alternate}',
    '.popout .leg-b{animation:stride .4s linear 4.8s 9 alternate-reverse}',
  )

  return `<g transform="translate(0 ${GROUND_Y})"><g class="popout"><g class="turn">${art.wanderer.body}</g></g></g>`
}

// -- Drifting, the ground, the distance -------------------------------------------------

type Lane = { name: string; salt: number; starts: readonly Point[]; landAt: (x: number) => number }

// Pieces that drift down now and then from their lane's starts; more often from 50%.
const driftMarkup = (piece: PieceArt, colors: readonly string[], view: PileView, lane: Lane, parts: Parts) =>
  lane.starts.map((start, i) => {
    const n = (view.time % 100_000) + i * 13 + lane.salt * 101
    const dx = r((noise(n + 1) - 0.5) * 120)
    const drop = r(lane.landAt(start.x + dx) - start.y)
    const seconds = r((view.level >= 2 ? 16 : 28) + noise(n + 2) * 12)
    const fallEnd = r((Math.max(4, drop / 80) / seconds) * 100)
    const at = `transform:translate(${dx}px,${drop}px) rotate(${r(noise(n + 3) * 300)}deg)`
    const name = `${lane.name}${i}`
    parts.css.push(
      `.${name}{animation:${name} ${seconds}s linear -${r(noise(n + 4) * seconds)}s infinite}`,
      `@keyframes ${name}{0%{transform:none;opacity:0}4%{opacity:.9}${fallEnd}%{${at};opacity:.9}${r(fallEnd + 6)}%,100%{${at};opacity:0}}`,
    )

    return `<g transform="translate(${r(start.x)} ${r(start.y)})"><g class="drift ${name}"><g class="sway">${piece(pick(colors, i) ?? '', i)}</g></g></g>`
  }).join('')

// Leaves on the ground, a few more with every step; each keeps its place as more arrive.
const groundMarkup = (art: FallArt, view: PileView, side: Side): string => {
  const count = 3 + Math.round((9 * view.fill) / 100)
  const [from, span, salt] = side === 'left' ? [250, 470, 71] : [360, 620, 91]

  return Array.from({ length: count }, (_, i) => {
    const spot: Spot = {
      x: from + noise(i * 5 + salt) * span,
      y: GROUND_Y - 1 - noise(i * 5 + salt + 1) * 6,
      turn: noise(i * 5 + salt + 2) * 360,
      i,
    }

    return placed(spot, `<g class="ground-leaf">${art.pile.piece(pick(art.drifter.colors, i + salt) ?? '', i)}</g>`, 1.4)
  }).join('')
}

// Far trees lose their leaves in three steps, less often than the big tree; the sign
// collects leaves on the same steps.
const farStep = (fill: number) => (fill >= 90 ? 3 : fill >= 60 ? 2 : fill >= 30 ? 1 : 0)
const farFullness = (fill: number) => [1, 0.66, 0.33, 0][farStep(fill)] ?? 0

// A few tiny leaves falling from a far cluster, in its 120 by 100 box.
const farDrops = (art: FallArt, cluster: number): string =>
  [0, 1, 2]
    .map(k => {
      const x = 20 + noise(cluster * 7 + k) * 80
      const y = 38 + noise(cluster * 7 + k + 3) * 14
      const delay = r(0.3 + noise(cluster * 7 + k + 5) * 1.6)

      return `<g transform="translate(${r(x)} ${r(y)})"><g class="far-drop fd${k}" style="animation-delay:${delay}s"><g transform="scale(.45)">` +
        `${art.pile.piece(pick(art.drifter.colors, cluster + k) ?? '', k)}</g></g></g>`
    })
    .join('')

// A field across the back of the window, and clusters of far trees standing on it.
const distanceMarkup = (art: FallArt, view: PileView): string => {
  const fullness = farFullness(view.fill)
  const before = farFullness(view.fromFill)
  const isDrop = (view.transition === 'grow' || view.transition === 'dive') && fullness < before
  const isRefill = (view.transition === 'scatter' || view.transition === 'shrink') && fullness > before
  const trees = FAR_CLUSTERS.map((x, i) => {
    const cluster = art.distance.trees(fullness, i)

    return (
      `<svg x="${x}%" y="${76 + (i % 2)}%" width="10%" height="11%" viewBox="0 0 120 100" preserveAspectRatio="xMidYMax meet" overflow="visible">` +
      `${isRefill ? `<g class="far-refill">${cluster}</g>` : cluster}${isDrop ? farDrops(art, i) : ''}</svg>`
    )
  })

  return (
    '<g class="distance">' +
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">' +
    '<path class="field" d="M0 876C180 858 340 872 520 860S820 866 1000 852V1000H0Z"/></svg>' +
    `${trees.join('')}</g>`
  )
}

// Where leaves stick to the sign's frame, two more at each far step: x, y, turn.
const STUCK: readonly [number, number, number][] = [
  [44, -52, 30], [-40, 2, 200], [46, 0, 120], [-6, -56, 80], [-48, -26, 250], [20, 4, 10],
]

// A wooden sign on a post beside the tower, showing the context percent.
const signMarkup = (art: FallArt, view: PileView): string => {
  const text = view.percent === null ? '—' : `${view.percent}%`
  const stuck = STUCK.slice(0, farStep(view.fill) * 2).map(([x, y, turn], i) =>
    placed({ x: SIGN_X + x, y: 886 + y, turn, i }, `<g class="stuck">${art.pile.piece(pick(art.drifter.colors, i + 2) ?? '', i)}</g>`, 1.1),
  )

  return (
    `<g class="sign${isWarm(view.level) ? ' warn' : ''}">` +
    `<rect class="post" x="${SIGN_X - 5}" y="880" width="10" height="${GROUND_Y - 880}"/>` +
    `<rect class="board" x="${SIGN_X - 50}" y="830" width="100" height="58" rx="6"/>` +
    `<path class="grain" d="M${SIGN_X - 42} 846h30M${SIGN_X + 10} 876h32"/>` +
    `<g transform="translate(${SIGN_X - 44} 834)">${art.sign.ornament}</g>` +
    `<text class="numerals" x="${SIGN_X}" y="866" text-anchor="middle" font-family="Georgia, serif" font-size="30" font-weight="700">${text}</text>` +
    `<text class="caption" x="${SIGN_X}" y="881" text-anchor="middle" font-family="Georgia, serif" font-size="11" letter-spacing="1.5">CONTEXT</text>` +
    `${stuck.join('')}</g>`
  )
}

// What a reader who can't see the backdrop is told: the scene, then the percent.
const baseCss = (art: FallArt, level: Level): Parts => {
  const ground = modeRule('.ground', 'fill', art.ground)
  const mound = modeRule('.mound', 'fill', isWarm(level) ? art.pile.warmMound : art.pile.mound)
  const field = modeRule('.field', 'fill', art.distance.field)
  const wood = modeRule('.board', 'fill', art.sign.wood)
  const ink = modeRule('.numerals,.caption', 'fill', art.sign.ink)
  const warmInk = modeRule('.warn .numerals', 'fill', art.sign.warmInk)

  return {
    css: [
      ground.light,
      mound.light,
      field.light,
      wood.light,
      ink.light,
      warmInk.light,
      '.sign{opacity:.94}.post{fill:#7a5230}.board{stroke:#7a5230;stroke-width:3}.grain{stroke:#7a5230;stroke-opacity:.25;stroke-width:1.5}.caption{opacity:.75}',
      '.art{opacity:.8}',
      '.far{opacity:.55}',
      '.distance{opacity:.38}',
      '.drift,.gust,.swirl,.leave,.collapse,.far-drop{opacity:0}',
      '.fd0{animation:fd0 2.6s ease-in both}.fd1{animation:fd1 3s ease-in both}.fd2{animation:fd2 2.8s ease-in both}',
      '@keyframes fd0{0%{transform:none;opacity:0}10%,85%{opacity:1}100%{transform:translate(-12px,46px) rotate(220deg);opacity:0}}',
      '@keyframes fd1{0%{transform:none;opacity:0}10%,85%{opacity:1}100%{transform:translate(9px,50px) rotate(-180deg);opacity:0}}',
      '@keyframes fd2{0%{transform:none;opacity:0}10%,85%{opacity:1}100%{transform:translate(-4px,42px) rotate(260deg);opacity:0}}',
      '.far-refill .crown{transform-box:fill-box;transform-origin:50% 80%;animation:arrive 1.1s cubic-bezier(.3,1.4,.5,1) 2s both}',
      '.head,.leg-a,.leg-b{transform-box:fill-box}',
      '.head{transform-origin:85% 90%}',
      '.leg-a,.leg-b{transform-origin:50% 0}',
      '.heap,.teeter,.collapse{transform-box:fill-box;transform-origin:50% 100%}',
      '.grow{animation:grow 2.2s cubic-bezier(.3,.8,.4,1) both}',
      '.shrink{animation:shrink 1.8s ease-in-out both}',
      '.regrow{animation:regrow 1.4s ease-out 1.4s both}',
      '@keyframes regrow{from{transform:scaleY(.2);opacity:0}to{transform:none;opacity:1}}',
      '.collapse{animation:collapse 1.5s ease-in both}',
      '@keyframes collapse{from{transform:none;opacity:1}to{transform:scale(.8,.1);opacity:0}}',
      '.teeter{animation:teeter 7s ease-in-out infinite alternate}',
      '.wobbly{animation-name:teeter2;animation-duration:5s}',
      '@keyframes teeter{from{transform:rotate(-.7deg)}to{transform:rotate(.7deg)}}',
      '@keyframes teeter2{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}',
      '.tree{transform-box:fill-box;transform-origin:40% 100%}',
      '.gusting{animation:gusty 3.4s ease-in-out both}',
      '@keyframes gusty{0%{transform:none}30%{transform:rotate(1.6deg)}60%{transform:rotate(-.5deg)}100%{transform:none}}',
      '.clump{transform-box:fill-box;transform-origin:50% 50%}',
      '.leave{animation:leave 1.6s ease-in both}',
      '@keyframes leave{from{transform:none;opacity:1}to{transform:translate(40px,20px) scale(.4);opacity:0}}',
      '.arrive{animation:arrive 1.1s cubic-bezier(.3,1.4,.5,1) both}',
      '@keyframes arrive{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}',
      '.cling{transform-box:fill-box;transform-origin:50% 0;animation:cling 3s ease-in-out infinite alternate}',
      '@keyframes cling{from{transform:rotate(-14deg)}to{transform:rotate(10deg)}}',
      '.sway{animation:sway 5s ease-in-out infinite alternate}',
      '@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}',
      '@keyframes stride{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}',
      '.wiggle{transform-box:fill-box;transform-origin:50% 100%;animation:wiggle 9s ease-in-out infinite}',
      '@keyframes wiggle{0%,88%{transform:none}92%{transform:rotate(-6deg)}96%{transform:rotate(5deg)}100%{transform:none}}',
    ],
    dark: [ground.dark, mound.dark, field.dark, wood.dark, ink.dark, warmInk.dark, '.art{opacity:.62}', '.far{opacity:.4}', '.distance{opacity:.3}'],
  }
}

// `phase`: seconds into the turkey's visit loop as this drawing starts.
export const renderFall = (art: FallArt, view: PileView, phase = 0): string => {
  const parts = baseCss(art, view.level)
  const tower = towerOf(view.fill)
  const crown = crownOf(art, view.fill, view.fromFill)
  const isScatter = view.transition === 'scatter'
  const isGust = view.transition === 'grow' || view.transition === 'dive'
  const drifter = art.drifter
  const right: Lane = {
    name: 'dr',
    salt: 1,
    starts: Array.from({ length: view.level >= 2 ? 4 : 3 }, (_, i) => ({ x: 600 + noise(i * 3 + 17) * 380, y: -60 })),
    landAt: x => (tower.height > 0 && Math.abs(x - PILE_X) < HALF_WIDTH * 0.7 ? GROUND_Y - tower.height + 12 : GROUND_Y - 4),
  }
  const left: Lane = {
    name: 'dl',
    salt: 2,
    starts: crown.visible.length === 0 ? [] : Array.from({ length: 3 }, (_, i) => {
      const clump = pick(crown.visible, i * 2) ?? { x: 200, y: 500, r: 40 }

      return { x: clump.x + (noise(i + 51) - 0.5) * clump.r, y: clump.y + clump.r * 0.6 }
    }),
    landAt: () => GROUND_Y - 4,
  }
  const shadow = tower.height > 0
    ? `<ellipse cx="${PILE_X}" cy="${GROUND_Y + 4}" rx="${HALF_WIDTH + 10}" ry="6" fill="#000" fill-opacity=".08"/>`
    : ''
  const towerPart = towerMarkup(art, view, parts)
  const collapse = isScatter ? collapseMarkup(art, view) : ''
  const isPopout = isScatter && view.from === 4
  const wanderer = view.level === 4
    ? (view.transition === 'dive' ? diveMarkup(art, view, parts) : '')
    : visitMarkup({ body: art.wanderer.body, x: PECK_X, y: GROUND_Y, offstageX: OFFSTAGE_X, head: peckKeyframes }, phase, isPopout ? holdAfterPopout(phase) : 0, parts) +
      (isPopout ? popoutMarkup(art, view, parts) : '')
  const flights = isGust ? gustMarkup(art, view, parts) : isScatter ? swirlMarkup(art, view, parts) : ''
  const rightLane = driftMarkup(drifter.piece, drifter.colors, view, right, parts)
  const leftLane = driftMarkup(drifter.piece, drifter.colors, view, left, parts)

  return frame(
    view,
    parts,
    '<rect class="ground" width="100%" height="100%"/>' +
    distanceMarkup(art, view) +
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMinYMax meet"><g class="art">' +
    `<g class="scenery">${art.scenery.markup}</g>${treeMarkup(art, view)}${groundMarkup(art, view, 'left')}${leftLane}</g></svg>` +
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMaxYMax meet"><g class="art">' +
    `${shadow}${towerPart}${collapse}${rightLane}</g>${signMarkup(art, view)}` +
    `<g class="art">${litterMarkup(art, view)}${groundMarkup(art, view, 'right')}</g><g class="critter">${wanderer}</g></svg>` +
    (flights === '' ? '' : `<g class="art">${flights}</g>`),
  )
}
