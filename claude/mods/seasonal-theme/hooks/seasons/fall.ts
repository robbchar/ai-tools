import type { Level } from '../../types'

import type { Clump, Palette, PieceArt, Season } from './types'

// Harvest: cream paper by day, hearth-lit brown by night.
const palette: Palette = {
  label: 'Harvest',
  roles: { accent: '#c2571a', danger: '#a3271f', success: '#526d24', warning: '#c48a14', pro: '#7d3c5c' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#f4ead9',
        'surface-1': '#f6eddd',
        'surface-2': '#fbf5ea',
        'text-primary': '#2a1b12',
        'text-secondary': '#533b2a',
        'text-muted': '#6b5240',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#1b130e',
        'surface-1': '#241a13',
        'surface-2': '#2d2118',
        'surface-3': '#35271c',
        'text-primary': '#f5e9d6',
        'text-secondary': '#d8c5aa',
        'text-muted': '#b39b7e',
      },
    },
  },
}

const CREAM = '#f2dcb3'
const VEIN = '#5a3418'

// Each leaf outline with its vein.
const LEAF_SHAPES: readonly [string, string][] = [
  ['M0-12C7-8 8 4 0 12C-8 4-7-8 0-12Z', 'M0-8V10'],
  ['M0-12L3-5 9-7 6-1 11 2 4 3 5 10 0 6-5 10-4 3-11 2-6-1-9-7-3-5Z', 'M0-5V12'],
  ['M-11 0C-6-6 6-6 11 0C6 6-6 6-11 0Z', 'M-8 0H9'],
]

const leaf: PieceArt = (fill, variant) => {
  const [outline, vein] = LEAF_SHAPES[variant % LEAF_SHAPES.length] ?? ['', '']

  return `<path d="${outline}" fill="${fill}"/><path d="${vein}" stroke="${VEIN}" stroke-opacity=".35" stroke-width="1"/>`
}

// A fan of feathers about a pivot; cream tips on each.
const fan = (cx: number, cy: number, reach: number, angles: readonly number[], colors: readonly string[]) =>
  angles
    .map((angle, i) => {
      const turn = `rotate(${angle} ${cx} ${cy})`

      return (
        `<ellipse cx="${cx}" cy="${cy - reach * 0.55}" rx="${reach * 0.18}" ry="${reach * 0.52}" fill="${colors[i % colors.length] ?? ''}" transform="${turn}"/>` +
        `<ellipse cx="${cx}" cy="${cy - reach * 0.95}" rx="${reach * 0.12}" ry="${reach * 0.14}" fill="${CREAM}" transform="${turn}"/>`
      )
    })
    .join('')

const FEATHERS = ['#7a4a22', '#b4481e', '#d39b2a', '#b4481e', '#7a4a22']
const LEG = 'stroke="#d48a2a" stroke-width="3" stroke-linecap="round" fill="none"'

// An original cartoon turkey, facing left, feet on y=0.
const turkey =
  fan(14, -40, 52, [-18, 6, 30, 54, 78], FEATHERS) +
  `<g class="leg-a"><path d="M-2-18V0h-6" ${LEG}/></g>` +
  `<g class="leg-b"><path d="M8-18V0h-6" ${LEG}/></g>` +
  '<ellipse cx="4" cy="-34" rx="22" ry="20" fill="#6b4121"/>' +
  '<ellipse cx="-8" cy="-32" rx="9" ry="12" fill="#7d4c27"/>' +
  '<path d="M-2-40C10-44 22-36 20-26C12-22 2-26-2-40Z" fill="#8a5a30"/>' +
  '<g class="head">' +
  '<path d="M-10-44C-14-52-16-58-18-64" stroke="#c98a5b" stroke-width="7" stroke-linecap="round" fill="none"/>' +
  '<circle cx="-20" cy="-66" r="8" fill="#c98a5b"/>' +
  '<circle cx="-23" cy="-68" r="1.6" fill="#2a1b12"/>' +
  '<path d="M-27-67L-34-64-27-62Z" fill="#e0a030"/>' +
  '<path d="M-27-62C-30-58-29-53-26-52C-24-55-24-60-25-63Z" fill="#b8321f"/>' +
  '<path d="M-25-71C-29-72-31-68-29-65" stroke="#b8321f" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
  '</g>'

const GROUND = 985
const BARK = '#5e3a1f'
const VINE = '#5b6a2b'

// The big tree on the left stage: trunk and boughs; its leaves are clumps the scene thins out.
const BOUGHS: readonly [string, number][] = [
  ['M188 600C160 540 110 505 50 475', 20],
  ['M200 590C240 535 300 505 370 485', 20],
  ['M193 575C188 490 198 410 188 310', 18],
  ['M120 515C100 470 90 430 70 392', 10],
  ['M300 507C322 462 340 424 360 384', 10],
  ['M190 430C152 388 122 348 102 306', 9],
  ['M192 410C232 368 262 338 292 306', 9],
  ['M50 475C28 460 6 450 -16 446', 8],
  ['M370 485C396 474 418 468 444 470', 8],
  ['M188 330C174 302 168 282 162 260', 7],
  ['M70 392C58 372 54 354 50 336', 6],
  ['M360 384C372 364 378 346 380 326', 6],
]

const branches =
  `<path d="M140 985C152 900 162 800 170 700C174 640 176 600 178 560L208 560C208 600 210 640 214 700C222 800 234 900 250 985Z" fill="${BARK}"/>` +
  BOUGHS.map(([d, width]) => `<path d="${d}" stroke="${BARK}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`).join('')

const CLUMPS: readonly Clump[] = [
  { x: 190, y: 340, r: 95 }, { x: 110, y: 390, r: 88 }, { x: 285, y: 380, r: 90 }, { x: 190, y: 450, r: 92 },
  { x: 45, y: 455, r: 78 }, { x: 365, y: 455, r: 80 }, { x: 120, y: 505, r: 72 }, { x: 270, y: 505, r: 74 },
  { x: 150, y: 270, r: 72 }, { x: 245, y: 272, r: 70 }, { x: 60, y: 330, r: 66 }, { x: 335, y: 305, r: 66 },
  { x: -12, y: 405, r: 60 }, { x: 425, y: 410, r: 62 }, { x: 200, y: 545, r: 62 }, { x: 25, y: 525, r: 56 },
  { x: 410, y: 525, r: 56 }, { x: 195, y: 225, r: 58 },
]

// A ribbed pumpkin sitting on the ground, about `size` units wide.
const pumpkin = (cx: number, size: number) => {
  const ry = size * 0.42
  const cy = GROUND - ry

  return (
    `<ellipse cx="${cx - size * 0.28}" cy="${cy}" rx="${size * 0.36}" ry="${ry}" fill="#c25a1a"/>` +
    `<ellipse cx="${cx + size * 0.28}" cy="${cy}" rx="${size * 0.36}" ry="${ry}" fill="#c25a1a"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${size * 0.34}" ry="${ry * 1.02}" fill="#d9721f"/>` +
    `<ellipse cx="${cx - size * 0.1}" cy="${cy - ry * 0.45}" rx="${size * 0.08}" ry="${ry * 0.3}" fill="#f0a050" fill-opacity=".5"/>` +
    `<path d="M${cx - 2} ${cy - ry + 2}c-1-8 1-13 5-16" stroke="${VINE}" stroke-width="${Math.max(3, size * 0.08)}" stroke-linecap="round" fill="none"/>`
  )
}

const pumpkins =
  `<path d="M266 983C288 975 308 990 338 980S378 975 416 984" stroke="${VINE}" stroke-width="2.5" stroke-opacity=".8" fill="none"/>` +
  pumpkin(300, 64) +
  pumpkin(360, 44) +
  pumpkin(398, 30)

// A small, faint scarecrow on a low hill in the distance; feet on y=0 before it is placed.
const STRAW = 'stroke="#d8b65a" stroke-width="3" stroke-linecap="round"'
const scarecrow =
  '<rect x="-3" y="-150" width="6" height="150" fill="#7a5230"/>' +
  '<rect x="-50" y="-114" width="100" height="6" rx="3" fill="#7a5230"/>' +
  '<path d="M-46 -116L46 -116 38 -104 28 -106 26 -62 -26 -62 -28 -106 -38 -104Z" fill="#a4583a"/>' +
  '<rect x="8" y="-96" width="10" height="10" fill="#d39b2a"/>' +
  '<path d="M-26 -62H26L22 -24H6L0 -50 -6 -24H-22Z" fill="#5f6b7a"/>' +
  `<path d="M-46 -112l-10 -4M-46 -110l-11 3M-46 -108l-8 8M46 -112l10 -4M46 -110l11 3M46 -108l8 8" ${STRAW}/>` +
  `<path d="M-14 -24l-3 9M-12 -24l1 10M12 -24l-1 10M14 -24l3 9" ${STRAW}/>` +
  '<circle cy="-130" r="15" fill="#d9c08a"/>' +
  '<circle cx="-5" cy="-132" r="1.8" fill="#4a3320"/><circle cx="5" cy="-132" r="1.8" fill="#4a3320"/>' +
  '<path d="M-6 -124q6 4 12 0" stroke="#4a3320" stroke-width="1.6" fill="none"/>' +
  '<ellipse cy="-142" rx="26" ry="5" fill="#6b4a2a"/>' +
  '<path d="M-13 -143L-10 -160H10L13 -143Z" fill="#6b4a2a"/>' +
  '<rect x="-12" y="-148" width="24" height="3" fill="#a4583a"/>'

const hill =
  '<g class="far">' +
  '<path d="M440 985C500 950 590 935 680 942C740 948 780 965 820 985Z" fill="#b98a55" fill-opacity=".35"/>' +
  `<g transform="translate(610 944) scale(.55)">${scarecrow}</g>` +
  '</g>'

// A cluster of far trees in a 120 by 100 box. Crowns shrink in steps and are gone when bare.
const FAR_CROWNS = ['#c98a4e', '#b96b3c', '#d2a457', '#a85a34']
const FAR_BARK = '#7a5a40'
const f1 = (n: number) => n.toFixed(1)
const farTrees = (fullness: number, variant: number) =>
  [0, 1, 2, 3]
    .slice(0, 2 + (variant % 3))
    .map(k => {
      const x = 12 + k * 32 + ((variant * 17 + k * 11) % 18)
      const height = 34 + ((variant * 13 + k * 29) % 50)
      const lean = ((variant + k) % 3) - 1
      const fork = 100 - height * 0.5
      const bare =
        `<path d="M${x - 2} 100L${x + lean} ${f1(100 - height * 0.8)}L${x + 2} 100Z" fill="${FAR_BARK}"/>` +
        `<path d="M${f1(x + lean * 0.5)} ${f1(fork)}l${f1(-height * 0.18)} ${f1(-height * 0.2)}M${f1(x + lean * 0.6)} ${f1(fork - height * 0.1)}l${f1(height * 0.16)} ${f1(-height * 0.18)}" ` +
        `stroke="${FAR_BARK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`

      if (fullness === 0) {
        return bare
      }

      const size = 0.45 + 0.55 * fullness
      const main = `<ellipse cx="${x + lean}" cy="${f1(100 - height * 0.6)}" rx="${f1(height * 0.26 * size)}" ry="${f1(height * 0.36 * size)}" fill="${FAR_CROWNS[(variant + k) % FAR_CROWNS.length] ?? ''}"/>`
      const top =
        fullness > 0.5
          ? `<ellipse cx="${f1(x + lean + height * 0.1)}" cy="${f1(100 - height * 0.72)}" rx="${f1(height * 0.16 * size)}" ry="${f1(height * 0.2 * size)}" fill="${FAR_CROWNS[(variant + k + 2) % FAR_CROWNS.length] ?? ''}"/>`
          : ''

      return `${bare}<g class="crown">${main}${top}</g>`
    })
    .join('')

const DESCRIPTIONS: Record<Level, string> = {
  0: 'A quiet fall scene: a big tree in full leaf, pumpkins, a scarecrow and far trees, and now and then a turkey wanders by.',
  1: 'Leaves blowing off a big tree into a small pile in the corner.',
  2: 'A thinning tree, and its leaves heaped into a wobbly tower in the corner.',
  3: 'A nearly bare tree and a tall, teetering tower of leaves, turning red: the context window is getting full.',
  4: 'A bare tree holding one last leaf, and a turkey dived into the top of a towering leaf pile: time to wrap up or compact.',
}

export const fall: Season = {
  id: 'fall',
  label: 'Fall',
  palette,
  art: {
    describe: level => DESCRIPTIONS[level],
    ground: { light: '#f4ead9', dark: '#1b130e' },
    pile: {
      mound: { light: '#9a5a2c', dark: '#5a3520' },
      warmMound: { light: '#8e3a22', dark: '#5e2618' },
      piece: leaf,
      colors: ['#c8641e', '#d39b2a', '#8a5426', '#b4481e', '#dfae45', '#9e2f22'],
      warmColors: ['#b8321f', '#9e2b1f', '#c84a1c', '#d0601c', '#a83a24', '#c8641e'],
    },
    drifter: { piece: leaf, colors: ['#c8641e', '#d39b2a', '#b4481e', '#9e2f22'] },
    scenery: {
      markup: hill + pumpkins,
      tree: {
        branches,
        clumps: CLUMPS,
        colors: ['#9e3f22', '#b8521e', '#c8641e', '#d6862a', '#dfae45', '#b4481e'],
        lastLeaf: { x: 444, y: 472 },
      },
    },
    distance: { field: { light: '#e8d6b6', dark: '#2a1e15' }, trees: farTrees },
    wanderer: {
      body: turkey,
      peek: fan(0, 0, 48, [-50, -25, 0, 25, 50], FEATHERS),
    },
  },
}
