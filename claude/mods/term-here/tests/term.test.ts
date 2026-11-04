import { describe, expect, test } from 'claude-code/testing'

const run = (command: string) => ({
  command, args: '', origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 120 },
})

const DIR = 'C:\\Users\\robb\\code\\proj\\packages\\api'
const POSIX_DIR = '/home/robb/code/my proj'
const WT_FROM_WSL = '/mnt/c/Users/Admin/AppData/Local/Microsoft/WindowsApps/wt.exe'

const ok = { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
const fail = { value: { ...ok.value, exitCode: 1 } }
const label = (argv: readonly string[]) =>
  argv[0] !== 'powershell.exe'
    ? (argv[0] ?? '')
    : argv[4]?.includes('Git Bash') ? 'wt-git-bash'
    : argv[4]?.includes('git-bash') ? 'git-bash'
    : 'powershell'

describe('term-here', () => {
  test('/term opens Windows Terminal with the Git Bash profile first', async ($, on) => {
    const launched: string[] = []
    const envs: Array<Record<string, string> | undefined> = []
    on('session.cwd', () => ({ value: DIR }))
    on('process.run', (_$, e) => {
      launched.push(label(e.argv))
      envs.push(e.init?.env)
      return ok
    })

    const out = await $.command.run(run('term'))

    expect(launched).toEqual(['wt-git-bash'])
    expect(envs[0]).toEqual({ TERM_HERE_DIR: DIR })
    expect(out.text).toBe(`Opened Windows Terminal (Git Bash) at ${DIR}`)
  })

  test('mintty Git Bash gets the path through the env', async ($, on) => {
    const envs: Array<Record<string, string> | undefined> = []
    on('session.cwd', () => ({ value: DIR }))
    on('process.run', (_$, e) => {
      envs.push(e.init?.env)
      return label(e.argv) === 'git-bash' ? ok : fail
    })

    const out = await $.command.run(run('term'))

    expect(envs[1]).toEqual({ TERM_HERE_DIR: DIR })
    expect(out.text).toContain(`Opened Git Bash at ${DIR} (skipped Windows Terminal (Git Bash): exit 1`)
  })

  test('/term falls back wt+bash -> bash -> powershell -> wt', async ($, on) => {
    const launched: string[] = []
    on('session.cwd', () => ({ value: DIR }))
    on('process.run', (_$, e) => {
      const which = label(e.argv)
      launched.push(which)
      return which === 'wt.exe' ? ok : fail
    })

    const out = await $.command.run(run('term'))

    expect(launched).toEqual(['wt-git-bash', 'git-bash', 'powershell', 'wt.exe'])
    expect(out.text).toContain(`Opened Windows Terminal at ${DIR} (skipped`)
  })

  test('/term keeps going when a program cannot start', async ($, on) => {
    const launched: string[] = []
    on('session.cwd', () => ({ value: DIR }))
    on('process.run', (_$, e) => {
      launched.push(label(e.argv))
      return e.argv[0] === 'open' ? ok : { deny: 'ENOENT' }
    })

    const out = await $.command.run(run('term'))

    expect(launched).toEqual(['wt-git-bash', 'git-bash', 'powershell', 'wt.exe', 'open'])
    expect(out.text).toContain('Terminal')
  })

  test('a POSIX path opens the Ubuntu profile through its full wt.exe path, spaces intact', async ($, on) => {
    const argvs: Array<readonly string[]> = []
    on('session.cwd', () => ({ value: POSIX_DIR }))
    on('process.run', (_$, e) => {
      argvs.push(e.argv)
      return ok
    })

    const out = await $.command.run(run('term'))

    expect(argvs).toEqual([
      [WT_FROM_WSL, 'new-tab', '-p', 'Ubuntu', 'wsl.exe', '--cd', POSIX_DIR],
    ])
    expect(out.text).toBe(`Opened Windows Terminal (WSL) at ${POSIX_DIR}`)
  })

  test('a POSIX path falls through to the rest when wt.exe is not there', async ($, on) => {
    const launched: string[] = []
    on('session.cwd', () => ({ value: POSIX_DIR }))
    on('process.run', (_$, e) => {
      launched.push(label(e.argv))
      return e.argv[0] === 'open' ? ok : { deny: 'ENOENT' }
    })

    const out = await $.command.run(run('term'))

    expect(launched).toEqual([WT_FROM_WSL, 'wt-git-bash', 'git-bash', 'powershell', 'wt.exe', 'open'])
    expect(out.text).toContain(`Opened Terminal at ${POSIX_DIR}`)
  })
})
