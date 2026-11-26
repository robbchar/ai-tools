import type { Level } from '../../../types'
import type { Season } from '../types'

import { winterPalette } from './palette'
import { renderWinter } from './scene'

const DESCRIPTIONS: Record<Level, string> = {
  0: 'A snowy clearing: an A-frame house with warm windows, a tall evergreen, and a light dusting of snow.',
  1: 'Snow is piling up around the A-frame house and the tall evergreen.',
  2: "Deep snow has climbed the A-frame house past its door, and the evergreen's branches sag with it.",
  3: "Snow has buried the A-frame house up to its big window, which glows a warmer orange.",
  4: "Snow is up to the roof: only the A-frame's peak, its chimney and the treetop show, and a fox's tail sticks out of a drift.",
}

export const winter: Season = {
  id: 'winter',
  label: 'Winter',
  palette: winterPalette,
  draw: renderWinter,
  describe: level => DESCRIPTIONS[level],
  visitor: '',
}
