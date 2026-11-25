import { describe, expect, test } from 'claude-code/testing'

import { badgeFor } from './environment'

describe('badgeFor', () => {
  test('WSL and native Windows get different words', () => {
    expect(badgeFor('wsl')).toBe('WSL')
    expect(badgeFor('windows')).toBe('WIN')
  })

  test('other systems get their own', () => {
    expect(badgeFor('macos')).toBe('MAC')
    expect(badgeFor('linux')).toBe('LINUX')
  })

  test('an unknown system shows no badge', () => {
    expect(badgeFor('unknown')).toBeUndefined()
    expect(badgeFor(undefined)).toBeUndefined()
  })
})
