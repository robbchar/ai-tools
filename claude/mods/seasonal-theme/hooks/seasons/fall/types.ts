import type { Level } from '../../../types'

import type { ModeColor } from '../types'

// SVG markup for one piece, centred on 0,0 and about 24 units across.
export type PieceArt = (fill: string, variant: number) => string

// A clump of a tree's leaves: a lumpy disc at x, y with radius r.
export type Clump = { x: number; y: number; r: number }

// What fall draws its scene from.
export type FallArt = {
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
  // The bottom-left corner, on a 1000-unit stage with the ground at y=985.
  scenery: {
    // Still art; groups classed `far` draw faint, as if in the distance.
    markup: string
    // The big tree: full with no context used, bare by 90%. Its clumps of leaves fall
    // away as the pile grows, and the gusts that feed the pile start from them.
    tree: {
      branches: string
      clumps: readonly Clump[]
      colors: readonly string[]
      lastLeaf: { x: number; y: number }
    }
  }
  // Across the back of the window: a field, and clusters of far trees on it.
  distance: {
    field: ModeColor
    // One cluster in a 120 by 100 box, base on y=100, at a fullness of 1, 0.66, 0.33 or 0
    // (bare). Each crown goes in a group classed `crown`, which regrows after a compact.
    trees: (fullness: number, variant: number) => string
  }
  // The sign beside the pile that shows the context percent. The ornament sits on the
  // board's top-left corner, drawn about 0,0.
  sign: { wood: ModeColor; ink: ModeColor; warmInk: ModeColor; ornament: string }
  // Faces left with feet on y=0, about 90 units tall. Groups classed `head`,
  // `leg-a` and `leg-b` are animated, so they carry no transform attribute.
  wanderer: {
    body: string
    // What sticks out of the pile at the wrap-up level, standing on y=0.
    peek: string
  }
}
