import type { Season } from '../types'

import { fallArt, fallPalette } from './art'
import { renderFall } from './scene'

export const fall: Season = {
  id: 'fall',
  label: 'Fall',
  palette: fallPalette,
  draw: (view, phase) => renderFall(fallArt, view, phase),
  describe: fallArt.describe,
  visitor: fallArt.wanderer.body,
}
