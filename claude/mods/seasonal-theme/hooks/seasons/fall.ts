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

const DESCRIPTIONS: Record<Level, string> = {
  0: 'A quiet fall corner: a few leaves on the ground, and now and then a turkey wanders by.',
  1: 'A small pile of fall leaves in the corner.',
  2: 'A respectable pile of fall leaves in the corner.',
  3: 'A big pile of leaves, turning red: the context window is getting full.',
  4: 'A turkey has dived into a big leaf pile, only its tail feathers showing: time to wrap up or compact.',
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
    wanderer: {
      body: turkey,
      peek: fan(0, 0, 48, [-50, -25, 0, 25, 50], FEATHERS),
    },
  },
}
