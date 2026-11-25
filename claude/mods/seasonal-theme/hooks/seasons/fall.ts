import type { Level } from '../../types'

import type { Palette, PieceArt, Season } from './types'

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

// A small tree with a few leaves left on its twigs, on the left stage.
const BOUGHS: readonly [string, number][] = [
  ['M150 790C128 752 102 730 74 712', 10],
  ['M156 778C178 742 208 722 242 708', 10],
  ['M153 765C150 728 156 692 150 650', 9],
  ['M100 728C94 712 96 698 88 684', 5],
  ['M210 720C220 704 232 694 248 688', 5],
  ['M152 700C170 686 184 672 198 662', 5],
  ['M151 672C138 660 128 646 122 630', 4],
  ['M74 712C62 706 54 698 48 690', 4],
]
const TREE_LEAVES: readonly [number, number][] = [
  [88, 684], [198, 662], [122, 630], [248, 688], [48, 690], [150, 650],
  [242, 708], [74, 712], [106, 700], [176, 684], [136, 646], [222, 702],
]
const LEAF_COLORS = ['#c8641e', '#d39b2a', '#b4481e', '#9e2f22', '#dfae45']

const tree =
  `<path d="M128 985C134 930 138 860 142 800C144 780 146 770 147 760L159 760C161 772 163 784 165 800C169 860 174 930 182 985Z" fill="${BARK}"/>` +
  BOUGHS.map(([d, width]) => `<path d="${d}" stroke="${BARK}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`).join('') +
  TREE_LEAVES.map(([x, y], i) =>
    `<g transform="translate(${x} ${y}) rotate(${(i * 67) % 360}) scale(1.4)">${leaf(LEAF_COLORS[i % LEAF_COLORS.length] ?? '', i)}</g>`,
  ).join('')

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
  `<path d="M228 983C250 975 270 990 300 980S340 975 378 984" stroke="${VINE}" stroke-width="2.5" stroke-opacity=".8" fill="none"/>` +
  pumpkin(262, 64) +
  pumpkin(322, 44) +
  pumpkin(360, 30)

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

const distance =
  '<g class="far">' +
  '<path d="M330 985C380 950 470 935 560 942C620 948 660 965 700 985Z" fill="#b98a55" fill-opacity=".35"/>' +
  `<g transform="translate(480 944) scale(.55)">${scarecrow}</g>` +
  '</g>'

const DESCRIPTIONS: Record<Level, string> = {
  0: 'A quiet fall scene: a tree, pumpkins, a scarecrow far off, and now and then a turkey wanders by.',
  1: 'A small leaf pile in the corner, across from a tree and pumpkins.',
  2: 'A leaf pile in the corner, growing into a wobbly tower.',
  3: 'A tall, teetering tower of leaves, turning red: the context window is getting full.',
  4: 'A turkey has dived into the top of a towering leaf pile, only its tail feathers showing: time to wrap up or compact.',
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
      markup: distance + tree + pumpkins,
      dropFrom: TREE_LEAVES.slice(0, 4).map(([x, y]) => ({ x, y })),
    },
    wanderer: {
      body: turkey,
      peek: fan(0, 0, 48, [-50, -25, 0, 25, 50], FEATHERS),
    },
  },
}
