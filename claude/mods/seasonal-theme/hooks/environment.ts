import type { SessionInfo } from 'claude-code'

// Words, not colors, so the badge reads at a glance on any palette.
const BADGES: Partial<Record<NonNullable<SessionInfo['platform']>, string>> = {
  wsl: 'WSL',
  windows: 'WIN',
  macos: 'MAC',
  linux: 'LINUX',
}

export const badgeFor = (platform: SessionInfo['platform']): string | undefined =>
  platform === undefined ? undefined : BADGES[platform]
