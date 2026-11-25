import type { Level, PileView } from '../types'

import type { ModeColor, PieceArt, SceneArt } from './seasons/types'

export const MAX_SCENE_CHARS = 131_072

// Two 1000-unit stages pinned to the window's bottom corners, scaled to its shorter side:
// the tower on the right, the season's scenery on the left.
const GROUND_Y = 985
const PILE_X = 850
const HALF_WIDTH = 112
const TOWER_MAX = 880
const PECK_X = 620
const OFFSTAGE_X = 1120
const VISIT_SECONDS = 120
const PIECE_SCALE = 1.65
const TEETER_FROM = 50
const EDGE_GAP = 22
const BURST_BANDS = 6

const isWarm = (level: Level) => level >= 3

// Same input, same output: the tower looks the same on every redraw.
const noise = (n: number): number => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453

  return x - Math.floor(x)
}

const r = (n: number) => Math.round(n * 10) / 10

const pick = <T>(list: readonly T[], i: number): T | undefined => list[i % list.length]

const modeRule = (selector: string, prop: string, color: ModeColor) => ({
  light: `${selector}{${prop}:${color.light}}`,
  dark: `${selector}{${prop}:${color.dark}}`,
})

type Parts = { css: string[]; dark: string[] }
type Point = { x: number; y: number }
type Spot = Point & { turn: number; i: number }
type Tower = { height: number; cap: number }

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

const pathOf = (points: readonly Point[]): string => {
  const [first] = points
  const last = points.at(-1)

  if (first === undefined || last === undefined) {
    return ''
  }

  const curves = points.slice(1, -1).map((point, k) => {
    const next = points[k + 2] ?? point

    return `Q${r(point.x)} ${r(point.y)} ${r((point.x + next.x) / 2)} ${r((point.y + next.y) / 2)}`
  })

  return `M${r(first.x)} ${r(first.y)}${curves.join('')}L${r(last.x)} ${r(last.y)}Z`
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

const placed = (spot: Spot, inner: string) =>
  `<g transform="translate(${r(spot.x)} ${r(spot.y)}) rotate(${r(spot.turn)}) scale(${PIECE_SCALE})">${inner}</g>`

const towerColors = (art: SceneArt, level: Level) => (isWarm(level) ? art.pile.warmColors : art.pile.colors)

const ratio = (from: number, to: number) => Math.round((from / to) * 100) / 100

const peekMarkup = (art: SceneArt, tower: Tower, isRising: boolean) =>
  `<g transform="translate(${PILE_X + 4} ${r(GROUND_Y - tower.height + 16)})"><g class="peek">` +
  `<g${isRising ? ' class="rise"' : ''}><g class="wiggle">${art.wanderer.peek}</g></g></g></g>`

const towerMarkup = (art: SceneArt, view: PileView, parts: Parts): string => {
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

const litterMarkup = (art: SceneArt, view: PileView): string => {
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

// The old tower bursts apart band by band, top first, and the bits fall away.
const burstMarkup = (art: SceneArt, view: PileView, parts: Parts): string => {
  const tower = towerOf(view.fromFill)

  if (tower.height === 0) {
    return ''
  }

  const colors = towerColors(art, view.from)
  const face = faceSpots(tower)
  const spots = [...face, ...edgeSpots(outlineOf(tower), face.length)]
  const bandOf = (spot: Spot) =>
    Math.max(0, Math.min(BURST_BANDS - 1, Math.floor(((GROUND_Y - spot.y) / tower.height) * BURST_BANDS)))

  return Array.from({ length: BURST_BANDS }, (_, band) => {
    const dx = r((band % 2 === 0 ? -1 : 1) * (90 + noise(band + 40) * 180))
    const rise = r(-(30 + noise(band + 41) * 80))
    const fall = r(((band + 0.5) / BURST_BANDS) * tower.height)
    const spin = r((noise(band + 42) - 0.5) * 120)
    const delay = r((BURST_BANDS - 1 - band) * 0.08)
    parts.css.push(
      `@keyframes b${band}{from{transform:none;opacity:1}35%{transform:translate(${r(dx / 2)}px,${rise}px) rotate(${r(spin / 2)}deg);opacity:1}` +
        `to{transform:translate(${dx}px,${fall}px) rotate(${spin}deg);opacity:0}}`,
      `.b${band}{transform-box:fill-box;transform-origin:50% 50%;animation:b${band} 1.9s cubic-bezier(.3,.5,.5,1) ${delay}s both}`,
    )
    const bits = spots
      .filter(spot => bandOf(spot) === band)
      .map(spot => placed(spot, `<g class="bit">${art.pile.piece(pick(colors, spot.i) ?? '', spot.i)}</g>`))

    return `<g class="burst b${band}">${bits.join('')}</g>`
  }).join('')
}

// Alternating leg swings over walking stretches of a looping timeline.
const strideKeyframes = (name: string, walks: readonly [number, number][], step: number, swing: number) => {
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

const peckKeyframes = (name: string, pecks: readonly number[]) => {
  const stops = pecks.flatMap(at => [
    `${at}%{transform:none}`,
    `${r((at + 0.2) * 100) / 100}%{transform:rotate(-38deg)}`,
    `${r((at + 0.5) * 100) / 100}%{transform:none}`,
  ])

  return `@keyframes ${name}{0%{transform:none}${stops.join('')}100%{transform:none}}`
}

// Now and then the wanderer walks in from the right, pecks about, and walks off.
const visitMarkup = (art: SceneArt, delay: number, parts: Parts): string => {
  const away = OFFSTAGE_X - PECK_X
  const step = (0.4 / VISIT_SECONDS) * 100
  const loop = `${VISIT_SECONDS}s linear ${r(delay)}s infinite`
  parts.css.push(
    `.visit{transform:translateX(${away}px);animation:visit ${loop}}`,
    `@keyframes visit{0%{transform:translateX(${away}px)}4.5%,9.4%{transform:none}14%,100%{transform:translateX(${away}px)}}`,
    `.visit .turn{animation:visitturn ${loop}}`,
    '@keyframes visitturn{0%,9.1%{transform:none}9.4%,99.9%{transform:scaleX(-1)}100%{transform:none}}',
    `.visit .head{animation:visitpeck ${loop}}`,
    peckKeyframes('visitpeck', [5.6, 6.6, 7.1, 8.2]),
    `.visit .leg-a{animation:visitleg ${loop}}`,
    `.visit .leg-b{animation:visitleg2 ${loop}}`,
    strideKeyframes('visitleg', [[0, 4.5], [9.4, 14]], step, 20),
    strideKeyframes('visitleg2', [[0, 4.5], [9.4, 14]], step, -20),
  )

  return `<g transform="translate(${PECK_X} ${GROUND_Y})"><g class="visit"><g class="turn">${art.wanderer.body}</g></g></g>`
}

// Reaching the wrap-up level: the wanderer crouches, launches up the tower, and dives in at the top.
const diveMarkup = (art: SceneArt, view: PileView, parts: Parts): string => {
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

// After a compact or clear: the wanderer pops out of the top and floats down as the tower bursts.
const popoutMarkup = (art: SceneArt, view: PileView, parts: Parts): string => {
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

type Lane = { name: string; salt: number; starts: readonly Point[]; landAt: (x: number) => number }

// Pieces that drift down now and then from their lane's starts; more often from 50%.
const driftMarkup = (piece: PieceArt, colors: readonly string[], view: PileView, lane: Lane, parts: Parts) =>
  lane.starts.map((start, i) => {
    const n = view.seed + i * 13 + lane.salt * 101
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

const baseCss = (art: SceneArt, level: Level): Parts => {
  const ground = modeRule('.ground', 'fill', art.ground)
  const mound = modeRule('.mound', 'fill', isWarm(level) ? art.pile.warmMound : art.pile.mound)

  return {
    css: [
      ground.light,
      mound.light,
      '.art{opacity:.8}',
      '.far{opacity:.55}',
      '.drift{opacity:0}',
      '.burst{opacity:0}',
      '.head,.leg-a,.leg-b{transform-box:fill-box}',
      '.head{transform-origin:85% 90%}',
      '.leg-a,.leg-b{transform-origin:50% 0}',
      '.heap,.teeter{transform-box:fill-box;transform-origin:50% 100%}',
      '.grow{animation:grow 2.2s cubic-bezier(.3,.8,.4,1) both}',
      '.shrink{animation:shrink 1.8s ease-in-out both}',
      '.regrow{animation:regrow 1.4s ease-out 1.4s both}',
      '@keyframes regrow{from{transform:scaleY(.2);opacity:0}to{transform:none;opacity:1}}',
      '.teeter{animation:teeter 7s ease-in-out infinite alternate}',
      '.wobbly{animation-name:teeter2;animation-duration:5s}',
      '@keyframes teeter{from{transform:rotate(-.7deg)}to{transform:rotate(.7deg)}}',
      '@keyframes teeter2{from{transform:rotate(-1.4deg)}to{transform:rotate(1.4deg)}}',
      '.sway{animation:sway 5s ease-in-out infinite alternate}',
      '@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}',
      '@keyframes stride{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}',
      '.wiggle{transform-box:fill-box;transform-origin:50% 100%;animation:wiggle 9s ease-in-out infinite}',
      '@keyframes wiggle{0%,88%{transform:none}92%{transform:rotate(-6deg)}96%{transform:rotate(5deg)}100%{transform:none}}',
    ],
    dark: [ground.dark, mound.dark, '.art{opacity:.62}', '.far{opacity:.4}'],
  }
}

export const renderScene = (art: SceneArt, view: PileView): string => {
  const parts = baseCss(art, view.level)
  const tower = towerOf(view.fill)
  const isScatter = view.transition === 'scatter'
  const drifter = art.drifter
  const right: Lane = {
    name: 'dr',
    salt: 1,
    starts: Array.from({ length: view.level >= 2 ? 4 : 3 }, (_, i) => ({ x: 600 + noise(i * 3 + 17) * 380, y: -60 })),
    landAt: x => (tower.height > 0 && Math.abs(x - PILE_X) < HALF_WIDTH * 0.7 ? GROUND_Y - tower.height + 12 : GROUND_Y - 4),
  }
  const drops = art.scenery.dropFrom
  const left: Lane = {
    name: 'dl',
    salt: 2,
    starts: Array.from({ length: 3 }, (_, i) => pick(drops, i) ?? { x: 30 + noise(i * 3 + 29) * 270, y: -60 }),
    landAt: () => GROUND_Y - 4,
  }
  const shadow = tower.height > 0
    ? `<ellipse cx="${PILE_X}" cy="${GROUND_Y + 4}" rx="${HALF_WIDTH + 10}" ry="6" fill="#000" fill-opacity=".08"/>`
    : ''
  const burst = isScatter ? burstMarkup(art, view, parts) : ''
  const towerPart = towerMarkup(art, view, parts)
  const isPopout = isScatter && view.from === 4
  const visitDelay = isPopout ? 40 : -noise(view.seed) * VISIT_SECONDS
  const wanderer = view.level === 4
    ? (view.transition === 'dive' ? diveMarkup(art, view, parts) : '')
    : visitMarkup(art, visitDelay, parts) + (isPopout ? popoutMarkup(art, view, parts) : '')
  const rightLane = driftMarkup(drifter.piece, drifter.colors, view, right, parts)
  const leftLane = driftMarkup(drifter.piece, drifter.colors, view, left, parts)

  const style =
    parts.css.join('') +
    `@media (prefers-color-scheme: dark){${parts.dark.join('')}}` +
    '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" data-level="${view.level}" data-fill="${view.fill}"` +
    `${isWarm(view.level) ? ' class="warm"' : ''}>` +
    `<style>${style}</style>` +
    '<rect class="ground" width="100%" height="100%"/>' +
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMinYMax meet">' +
    `<g class="art"><g class="scenery">${art.scenery.markup}</g>${leftLane}</g></svg>` +
    '<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMaxYMax meet">' +
    `<g class="art">${shadow}${litterMarkup(art, view)}${towerPart}${burst}${rightLane}${wanderer}</g></svg>` +
    '</svg>'
  )
}

const RULES: readonly [RegExp, string][] = [
  [/<(image|foreignObject|script|iframe|video|audio)\b/i, 'embedded content (image, script or frame)'],
  [/href/i, 'a link attribute'],
  [/<!--|\/\*/, 'a comment'],
  [/CDATA/, 'a CDATA section'],
  [/&(?![a-z]+;|#\d+;)/i, 'a bare ampersand'],
  [/url\(|@font-face|@import/i, 'an outside reference'],
]

// The engine's rules for a backdrop, as lines; empty when the scene passes.
export const sceneProblems = (svg: string): string[] => [
  ...(svg.length > MAX_SCENE_CHARS ? [`${svg.length} characters, over ${MAX_SCENE_CHARS}`] : []),
  ...RULES.filter(([pattern]) => pattern.test(svg)).map(([, what]) => `holds ${what}`),
]
