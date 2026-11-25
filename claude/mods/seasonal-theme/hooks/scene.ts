import type { Level, PileView } from '../types'

import type { ModeColor, PieceArt, SceneArt } from './seasons/types'

export const MAX_SCENE_CHARS = 131_072

// The stage is a 1000-unit box pinned to the bottom-right corner, scaled to the
// window's shorter side, so the pile keeps its size and stays clear of the chat.
const GROUND_Y = 985
const PILE_X = 850
const PECK_X = 620
const OFFSTAGE_X = 1120
const VISIT_SECONDS = 120

type Heap = { width: number; height: number; pieces: number; litter: number }

const HEAPS: Record<Level, Heap> = {
  0: { width: 0, height: 0, pieces: 0, litter: 5 },
  1: { width: 120, height: 36, pieces: 16, litter: 3 },
  2: { width: 180, height: 62, pieces: 28, litter: 4 },
  3: { width: 240, height: 96, pieces: 56, litter: 4 },
  4: { width: 270, height: 112, pieces: 66, litter: 5 },
}

const PIECE_SCALE = 1.4

const isWarm = (level: Level) => level >= 3

// Same input, same output: the pile looks the same on every redraw.
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

type Spot = { x: number; y: number; turn: number }

// Pieces keep their place across levels, so a growing pile looks like the same pile.
const heapSpot = (i: number, heap: Heap): Spot => {
  const across = noise(i * 7 + 1) * 2 - 1
  // A third ride the outline to break its edge; the rest cover the face.
  const up = noise(i * 7 + 5) < 0.33 ? 1 : 0.12 + noise(i * 7 + 2) * 0.85

  return {
    x: PILE_X + across * heap.width * 0.46,
    y: GROUND_Y - up * heap.height * Math.sqrt(1 - across * across),
    turn: noise(i * 7 + 3) * 360,
  }
}

const litterSpot = (i: number, heap: Heap): Spot => {
  const side = i % 2 === 0 ? -1 : 1
  const reach = heap.width / 2 + 18 + noise(i * 5 + 11) * 90

  return {
    x: Math.min(PILE_X + side * reach, 990),
    y: GROUND_Y - 2 - noise(i * 5 + 12) * 5,
    turn: noise(i * 5 + 13) * 360,
  }
}

const placed = (spot: Spot, inner: string) =>
  `<g transform="translate(${r(spot.x)} ${r(spot.y)}) rotate(${r(spot.turn)}) scale(${PIECE_SCALE})">${inner}</g>`

// Deeper pieces first, so the ones near the surface draw on top.
const depth = (i: number) => (noise(i * 7 + 5) < 0.33 ? 2 : noise(i * 7 + 2))

const heapOrder = (count: number) =>
  Array.from({ length: count }, (_, i) => i).sort((a, b) => depth(a) - depth(b))

type Parts = { css: string[]; dark: string[] }

// A lumpy heap: points around a half-ellipse, nudged, joined by smooth curves.
const moundPath = (heap: Heap) => {
  const steps = 10
  const points = Array.from({ length: steps + 1 }, (_, k) => {
    const angle = Math.PI - (k / steps) * Math.PI
    const bump = k === 0 || k === steps ? 1 : 0.88 + noise(k * 31) * 0.2

    return [PILE_X + Math.cos(angle) * heap.width / 2, GROUND_Y - Math.sin(angle) * heap.height * bump] as const
  })
  const curves = points.slice(1, -1).map(([x, y], k) => {
    const [nx, ny] = points[k + 2] ?? [x, y]

    return `Q${r(x)} ${r(y)} ${r((x + nx) / 2)} ${r((y + ny) / 2)}`
  })

  return `M${r(PILE_X - heap.width / 2)} ${GROUND_Y}${curves.join('')}L${r(PILE_X + heap.width / 2)} ${GROUND_Y}Z`
}

const peekMarkup = (art: SceneArt, heap: Heap, isRising: boolean) =>
  `<g transform="translate(${PILE_X + 6} ${r(GROUND_Y - heap.height * 0.9)})"><g class="peek">` +
  `<g${isRising ? ' class="rise"' : ''}><g class="wiggle">${art.wanderer.peek}</g></g></g></g>`

const heapMarkup = (art: SceneArt, view: PileView, parts: Parts): string => {
  const heap = HEAPS[view.level]
  const pile = art.pile
  const colors = isWarm(view.level) ? pile.warmColors : pile.colors
  const isGrowing = view.transition === 'grow' || view.transition === 'dive'
  const firstNew = isGrowing ? HEAPS[view.from].pieces : heap.pieces
  const fromWidth = HEAPS[view.from].width
  const animation = { grow: 'grow', dive: 'grow', shrink: 'shrink', scatter: 'regrow', none: '' }[view.transition]

  if (animation !== '' && heap.width > 0) {
    const start = fromWidth === 0 ? 0.15 : r(fromWidth / heap.width * 100) / 100
    parts.css.push(`@keyframes ${animation}{from{transform:scale(${animation === 'regrow' ? 0.6 : start});opacity:${animation === 'regrow' ? 0 : 1}}to{transform:none;opacity:1}}`)
  }

  const pieces = heapOrder(heap.pieces).map(i => {
    const isNew = i >= firstNew
    const delay = isNew ? ` style="animation-delay:${r(0.5 + noise(i + 99) * 1.4)}s"` : ''
    const inner = `<g class="piece${isNew ? ' new' : ''}"${delay}>${pile.piece(pick(colors, i) ?? '', i)}</g>`

    return placed(heapSpot(i, heap), inner)
  })
  const mound = heap.width > 0 ? `<path class="mound" d="${moundPath(heap)}"/>` : ''
  const peek = view.level === 4 ? peekMarkup(art, heap, view.transition === 'dive') : ''
  const heapClass = animation === '' || heap.width === 0 ? 'heap' : `heap ${animation}`

  return `<g class="${heapClass}">${mound}${peek}${pieces.join('')}</g>`
}

const litterMarkup = (art: SceneArt, level: Level): string => {
  const heap = HEAPS[level]
  const colors = isWarm(level) ? art.pile.warmColors : art.pile.colors

  return Array.from({ length: heap.litter }, (_, i) =>
    placed(litterSpot(i, heap), `<g class="litter">${art.pile.piece(pick(colors, i + 3) ?? '', i + 1)}</g>`),
  ).join('')
}

// The old pile thrown outward, each piece on its own path, then gone.
const burstMarkup = (art: SceneArt, from: Level, parts: Parts): string => {
  const heap = HEAPS[from]
  const colors = isWarm(from) ? art.pile.warmColors : art.pile.colors

  return heapOrder(heap.pieces).map(i => {
    const spot = heapSpot(i, heap)
    const dx = r((spot.x - PILE_X) * 1.8 + (noise(i + 40) - 0.5) * 260)
    const dy = r(-60 - noise(i + 41) * 160)
    const spin = r((noise(i + 42) - 0.5) * 540)
    parts.css.push(
      `@keyframes b${i}{from{transform:none;opacity:1}45%{transform:translate(${dx * 0.6}px,${dy}px) rotate(${spin / 2}deg);opacity:1}to{transform:translate(${dx}px,${r(GROUND_Y - spot.y)}px) rotate(${spin}deg);opacity:0}}`,
      `.b${i}{animation:b${i} 1.8s cubic-bezier(.2,.6,.4,1) both}`,
    )

    return placed(spot, `<g class="burst b${i}">${art.pile.piece(pick(colors, i) ?? '', i)}</g>`)
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

// Reaching the wrap-up level: the wanderer hops up and dives into the pile.
const diveMarkup = (art: SceneArt, parts: Parts): string => {
  const top = HEAPS[4].height
  parts.css.push(
    '.dive{opacity:0;animation:dive 6s linear both}',
    `@keyframes dive{0%{transform:translate(${OFFSTAGE_X}px,0);opacity:1}40%{transform:translate(1010px,0)}` +
      `58%{transform:translate(930px,-${top + 60}px) rotate(-20deg)}` +
      `74%{transform:translate(${PILE_X + 10}px,-${r(top * 0.6)}px) rotate(-70deg) scale(.8);opacity:1}` +
      `80%{transform:translate(${PILE_X + 10}px,-${r(top * 0.4)}px) rotate(-80deg) scale(.6);opacity:0}` +
      `100%{transform:translate(${PILE_X}px,-${r(top * 0.4)}px);opacity:0}}`,
    '.dive .leg-a{animation:stride .4s linear 6 alternate}',
    '.dive .leg-b{animation:stride .4s linear 6 alternate-reverse}',
    '.rise{animation:rise 2.2s ease-out 4.6s both}',
    '@keyframes rise{from{transform:translateY(46px);opacity:0}70%{transform:translateY(-6px);opacity:1}to{transform:none;opacity:1}}',
  )

  return `<g transform="translate(0 ${GROUND_Y})"><g class="dive">${art.wanderer.body}</g></g>`
}

// After a compact or clear: the wanderer pops out of the scattered pile and wanders off.
const popoutMarkup = (art: SceneArt, parts: Parts): string => {
  const top = HEAPS[4].height
  parts.css.push(
    '.popout{opacity:0;animation:popout 10s linear both}',
    `@keyframes popout{0%{transform:translate(${PILE_X}px,-${r(top * 0.5)}px) scale(.4);opacity:0}` +
      `8%{transform:translate(${PILE_X - 10}px,-${top + 50}px);opacity:1}` +
      `18%,28%{transform:translate(700px,0)}31%{transform:translate(700px,-14px)}34%,46%{transform:translate(700px,0)}` +
      `80%{transform:translate(${OFFSTAGE_X}px,0);opacity:1}100%{transform:translate(${OFFSTAGE_X}px,0);opacity:0}}`,
    '.popout .turn{animation:popturn 10s linear both}',
    '@keyframes popturn{0%,46%{transform:none}48%,100%{transform:scaleX(-1)}}',
    '.popout .leg-a{animation:stride .4s linear 4.8s 9 alternate}',
    '.popout .leg-b{animation:stride .4s linear 4.8s 9 alternate-reverse}',
  )

  return `<g transform="translate(0 ${GROUND_Y})"><g class="popout"><g class="turn">${art.wanderer.body}</g></g></g>`
}

type DriftLane = { prefix: string; salt: number; xFrom: number; xTo: number }

// Pieces that drift down now and then; more often once the pile is respectable.
const driftMarkup = (piece: PieceArt, colors: readonly string[], view: PileView, lane: DriftLane, count: number, parts: Parts) => {
  const isBusy = view.level >= 2
  const heap = HEAPS[view.level]

  return Array.from({ length: count }, (_, i) => {
    const n = view.seed + i * 13 + lane.salt * 101
    const x = lane.xFrom + noise(i * 3 + lane.salt * 17) * (lane.xTo - lane.xFrom)
    const dx = r((noise(n + 1) - 0.5) * 120)
    const across = (x + dx - PILE_X) / (heap.width / 2 || 1)
    const land = Math.abs(across) < 1 ? GROUND_Y - heap.height * Math.sqrt(1 - across * across) * 0.9 : GROUND_Y - 4
    const seconds = r((isBusy ? 16 : 28) + noise(n + 2) * 12)
    const fallEnd = r((12 / seconds) * 100)
    const at = `transform:translate(${dx}px,${r(land)}px) rotate(${r(noise(n + 3) * 300)}deg)`
    const name = `${lane.prefix}${i}`
    parts.css.push(
      `.${name}{animation:${name} ${seconds}s linear -${r(noise(n + 4) * seconds)}s infinite}`,
      `@keyframes ${name}{0%{transform:translate(0,-60px);opacity:0}4%{opacity:.9}${fallEnd}%{${at};opacity:.9}${r(fallEnd + 6)}%,100%{${at};opacity:0}}`,
    )

    return `<g transform="translate(${r(x)} 0)"><g class="drift ${name}"><g class="sway">${piece(pick(colors, i) ?? '', i)}</g></g></g>`
  }).join('')
}

const baseCss = (art: SceneArt, level: Level): Parts => {
  const mound = isWarm(level) ? art.pile.warmMound : art.pile.mound
  const ground = modeRule('.ground', 'fill', art.ground)
  const heap = modeRule('.mound', 'fill', mound)

  return {
    css: [
      ground.light,
      heap.light,
      '.art{opacity:.8}',
      '.drift{opacity:0}',
      '.burst{opacity:0}',
      '.head,.leg-a,.leg-b{transform-box:fill-box}',
      '.head{transform-origin:85% 90%}',
      '.leg-a,.leg-b{transform-origin:50% 0}',
      '.heap{transform-box:fill-box;transform-origin:50% 100%}',
      '.grow{animation:grow 2.4s cubic-bezier(.3,.8,.4,1) both}',
      '.shrink{animation:shrink 2s ease-in-out both}',
      '.regrow{animation:regrow 1.6s ease-out 1.2s both}',
      '.new{animation:land 1.2s ease-out both}',
      '@keyframes land{from{transform:translateY(-40px);opacity:0}to{transform:none;opacity:1}}',
      '.sway{animation:sway 5s ease-in-out infinite alternate}',
      '@keyframes sway{from{transform:translateX(-18px)}to{transform:translateX(18px)}}',
      '@keyframes stride{from{transform:rotate(-20deg)}to{transform:rotate(20deg)}}',
      '.wiggle{transform-box:fill-box;transform-origin:50% 100%;animation:wiggle 9s ease-in-out infinite}',
      '@keyframes wiggle{0%,88%{transform:none}92%{transform:rotate(-6deg)}96%{transform:rotate(5deg)}100%{transform:none}}',
    ],
    dark: [ground.dark, heap.dark, '.art{opacity:.62}'],
  }
}

export const renderScene = (art: SceneArt, view: PileView): string => {
  const parts = baseCss(art, view.level)
  const heap = HEAPS[view.level]
  const isScatter = view.transition === 'scatter'
  const drifter = art.drifter
  const rightLane = driftMarkup(drifter.piece, drifter.colors, view, { prefix: 'dr', salt: 1, xFrom: 600, xTo: 980 }, view.level >= 2 ? 4 : 3, parts)
  const leftLane = driftMarkup(drifter.piece, drifter.colors, view, { prefix: 'dl', salt: 2, xFrom: 30, xTo: 300 }, 2, parts)
  const shadow = heap.width > 0
    ? `<ellipse cx="${PILE_X}" cy="${GROUND_Y + 4}" rx="${heap.width / 2 + 10}" ry="6" fill="#000" fill-opacity=".08"/>`
    : ''
  const burst = isScatter ? burstMarkup(art, view.from, parts) : ''
  const heapPart = heapMarkup(art, view, parts)
  const visitDelay = isScatter && view.from === 4 ? 40 : -noise(view.seed) * VISIT_SECONDS
  const wanderer = view.level === 4
    ? (view.transition === 'dive' ? diveMarkup(art, parts) : '')
    : visitMarkup(art, visitDelay, parts) + (isScatter && view.from === 4 ? popoutMarkup(art, parts) : '')

  const style =
    parts.css.join('') +
    `@media (prefers-color-scheme: dark){${parts.dark.join('')}}` +
    '@media (prefers-reduced-motion: reduce){*{animation:none!important}}'

  const corner = `${shadow}${litterMarkup(art, view.level)}${heapPart}${burst}${rightLane}${wanderer}`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" data-level="${view.level}"${isWarm(view.level) ? ' class="warm"' : ''}>` +
    `<style>${style}</style>` +
    '<rect class="ground" width="100%" height="100%"/>' +
    `<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMinYMax meet"><g class="art">${leftLane}</g></svg>` +
    `<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMaxYMax meet"><g class="art">${corner}</g></svg>` +
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
