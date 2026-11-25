import type { Level } from '../../types'
import type { makeColors } from '../make-colors.js'

export type SeasonId = 'fall' | 'winter' | 'spring' | 'summer'

export type Palette = Parameters<typeof makeColors>[0]

// A color for each of the app's modes.
export type ModeColor = { light: string; dark: string }

// SVG markup for one piece, centred on 0,0 and about 24 units across.
export type PieceArt = (fill: string, variant: number) => string

export type SceneArt = {
  // What a reader who can't see the scene is told, for each pile level.
  describe: (level: Level) => string
  // Behind everything; match the palette's surface-0 so the frosted panels blend.
  ground: ModeColor
  pile: {
    mound: ModeColor
    // The mound at the warning levels (3 and up).
    warmMound: ModeColor
    piece: PieceArt
    colors: readonly string[]
    warmColors: readonly string[]
  }
  // What drifts down now and then: leaves, snowflakes, petals.
  drifter: { piece: PieceArt; colors: readonly string[] }
  // Still art in the bottom-left corner, on a 1000-unit stage with the ground at y=985.
  // Groups classed `far` are drawn faint, as if in the distance. Drifters on the left
  // fall from the `dropFrom` points, such as a tree's branches.
  scenery: { markup: string; dropFrom: readonly { x: number; y: number }[] }
  // Faces left with feet on y=0, about 90 units tall. Groups classed `head`,
  // `leg-a` and `leg-b` are animated, so they carry no transform attribute.
  wanderer: {
    body: string
    // What sticks out of the pile at the wrap-up level, standing on y=0.
    peek: string
  }
}

export type Season = { id: SeasonId; label: string; palette: Palette; art: SceneArt }
