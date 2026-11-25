import { describe, expect, test } from 'claude-code/testing'

import { badgeFor, statusLine } from './environment'

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

describe('statusLine', () => {
  test('the badge alone before any reading', () => {
    expect(statusLine('WSL', { live: null, preview: null })).toBe('WSL')
  })

  test('the badge and the live percent, rounded', () => {
    expect(statusLine('WSL', { live: 41.6, preview: null })).toBe('WSL · 42% context')
  })

  test('a preview says so', () => {
    expect(statusLine('WIN', { live: 30, preview: 95 })).toBe('WIN · 95% context (preview)')
  })

  test('with no badge the percent still shows', () => {
    expect(statusLine(undefined, { live: 12, preview: null })).toBe('12% context')
  })

  test('with neither, the line clears', () => {
    expect(statusLine(undefined, { live: null, preview: null })).toBeUndefined()
  })
})
