import type { SessionInfo } from 'claude-code'

import type { Reading } from '../types'

// Words, not colors, so the badge reads at a glance on any palette.
const BADGES: Partial<Record<NonNullable<SessionInfo['platform']>, string>> = {
  wsl: 'WSL',
  windows: 'WIN',
  macos: 'MAC',
  linux: 'LINUX',
}

export const badgeFor = (platform: SessionInfo['platform']): string | undefined =>
  platform === undefined ? undefined : BADGES[platform]

// The status line: the badge, then the context percent once there is one.
export const statusLine = (badge: string | undefined, reading: Reading): string | undefined => {
  const percent = reading.preview ?? reading.live
  const context =
    percent === null ? undefined : `${Math.round(percent)}% context${reading.preview === null ? '' : ' (preview)'}`
  const parts = [badge, context].filter((part): part is string => part !== undefined)

  return parts.length === 0 ? undefined : parts.join(' · ')
}
