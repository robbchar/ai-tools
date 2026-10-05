import { describe, expect, test } from 'claude-code/testing'

const run = (command: string) => ({
  command, args: '', origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})

const DIR = 'C:\\Users\\robb\\code\\proj'
const props = {
  hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 3 }, view: {},
}

describe('term-here band', () => {
  for (const surface of ['terminal', 'desktop'] as const) {
    test(`shows the cwd and copies it on ${surface}`, async ($, on) => {
      const copied: string[] = []
      on('session.cwd', () => ({ value: DIR }))
      on('ui.copy', (_$, e) => {
        copied.push(e.text)
        return { value: { isCopied: true as const } }
      })

      // /cwd refreshes the stored path (what session.start does in a live session)
      await $.command.run(run('cwd'))
      copied.length = 0

      const ui = await $.ui.mount({ plugin: 'term-here', surface, component: 'AbovePrompt', props })
      expect(await ui.find({ type: 'Text', text: DIR })).toBeDefined()

      await ui.press({ key: 'copy' })
      expect(copied).toEqual([DIR])
    })
  }
})
