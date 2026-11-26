import type { ModeColor, Palette } from '../types'

// Frost: cool blue-gray surfaces, with one warm amber accent from the windows' glow.
export const winterPalette: Palette = {
  label: 'Frost',
  roles: { accent: '#b8741f', danger: '#b3261e', success: '#3f7a5a', warning: '#c48a14', pro: '#5b5b9e' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#eef2f5',
        'surface-1': '#f1f4f7',
        'surface-2': '#f8fafc',
        'text-primary': '#16202a',
        'text-secondary': '#3a4856',
        'text-muted': '#56677a',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#11161d',
        'surface-1': '#171e27',
        'surface-2': '#1e2631',
        'surface-3': '#25303c',
        'text-primary': '#e8eef4',
        'text-secondary': '#bcc8d4',
        'text-muted': '#93a3b4',
      },
    },
  },
}

const pair = (light: string, dark: string): ModeColor => ({ light, dark })

// The scene's colors in each mode; the ground matches surface-0 so the frosted panels blend.
export const COLORS = {
  ground: pair('#eef2f5', '#11161d'),
  field: pair('#e8edf1', '#27313d'),
  snow: pair('#fbfdff', '#8e9bab'),
  snowShade: pair('#cfdbe6', '#6f7c8c'),
  tree: pair('#4d7062', '#2f4b43'),
  treeDark: pair('#3e5d51', '#263d37'),
  trunk: pair('#6b5446', '#4a3a31'),
  roof: pair('#7c3a2c', '#5c2c23'),
  gable: pair('#c79a68', '#7d6145'),
  plank: pair('#ad7f4b', '#6a5038'),
  glass: pair('#f3d084', '#d9a85a'),
  warmGlass: pair('#f09a55', '#d9773f'),
  frame: pair('#5e4330', '#3b2b20'),
  door: pair('#6e4a33', '#4a3324'),
  chimney: pair('#8a8f96', '#5d6268'),
  smoke: pair('#9aa5ae', '#6b7682'),
  wood: pair('#a97c52', '#7a5a3c'),
  woodEdge: pair('#7d5a3a', '#5a4029'),
  ink: pair('#4a3426', '#efe4d3'),
  warmInk: pair('#b5412c', '#f28a6c'),
  rope: pair('#8b7458', '#6e5c46'),
  farTree0: pair('#a9b8c1', '#323e4a'),
  farTree1: pair('#91a7ab', '#384852'),
  farTree2: pair('#78948f', '#3d524d'),
} as const satisfies Record<string, ModeColor>
