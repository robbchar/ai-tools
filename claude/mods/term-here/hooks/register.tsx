import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'
import type { TermHereCwd } from '../types'

const cwdAtom = atom({ plugin: 'term-here', key: 'cwd' } as const, '' as TermHereCwd)

type Launcher = { name: string; argv: (dir: string) => string[] }

// Windows launches go through PowerShell's Start-Process: it detaches the new
// window (so this call returns at once), reads the path from an env var (no
// quoting trouble with spaces), and -ErrorAction Stop makes a missing program
// exit non-zero so the next launcher gets its turn.
const ps = (script: string) => ['powershell.exe', '-NoProfile', '-NonInteractive', '-Command', script]

// Tried in order; the first that exits 0 wins. Reorder to change preference.
const LAUNCHERS: readonly Launcher[] = [
  // Same window as the pinned "Git Bash" shortcut: Windows Terminal's profile.
  {
    name: 'Windows Terminal (Git Bash)',
    argv: () =>
      ps(
        "Start-Process wt.exe -ArgumentList ('-p \"Git Bash\" -d \"' + $env:TERM_HERE_DIR + '\"') -ErrorAction Stop",
      ),
  },
  {
    // Git's own mintty window
    name: 'Git Bash',
    argv: () =>
      ps(
        "$exe = (Get-Command git-bash.exe -ErrorAction SilentlyContinue).Source; " +
          "if (-not $exe) { $exe = Join-Path $env:ProgramFiles 'Git\\git-bash.exe' }; " +
          'Start-Process -FilePath $exe -WorkingDirectory $env:TERM_HERE_DIR -ErrorAction Stop',
      ),
  },
  {
    name: 'PowerShell',
    argv: () => ps('Start-Process powershell.exe -WorkingDirectory $env:TERM_HERE_DIR -ErrorAction Stop'),
  },
  { name: 'Windows Terminal', argv: dir => ['wt.exe', '-d', dir] },
  { name: 'Terminal', argv: dir => ['open', '-a', 'Terminal', dir] }, // macOS
]

async function refreshCwd($: EngineInterface): Promise<string> {
  const cwd = await $.session.cwd()
  await update($, cwdAtom, () => cwd)
  return cwd
}

async function openTerminal($: EngineInterface): Promise<string> {
  const dir = await refreshCwd($)
  const skipped: string[] = []
  for (const launcher of LAUNCHERS) {
    try {
      const { exitCode, stderr } = await $.process.run(launcher.argv(dir), {
        timeoutMs: 10_000,
        env: { TERM_HERE_DIR: dir },
      })
      if (exitCode === 0) {
        const note = skipped.length ? ` (skipped ${skipped.join('; ')})` : ''
        return `Opened ${launcher.name} at ${dir}${note}`
      }
      skipped.push(`${launcher.name}: exit ${exitCode} ${stderr.trim().split('\n')[0] ?? ''}`.trim())
    } catch (err) {
      // program not present on this machine; try the next one
      skipped.push(`${launcher.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  return `Couldn't start a terminal at ${dir}: ${skipped.join('; ')}`
}

async function copyCwd($: EngineInterface, surface?: RenderSurface): Promise<string> {
  const dir = await refreshCwd($)
  const done = await $.ui.copy({ text: dir, surface })
  return done.isCopied ? `Copied ${dir}` : `Couldn't copy (${done.reason}): ${dir}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.command.register({
      name: 'term',
      description: 'Open a terminal at the directory the model is working in',
    })
    await $.command.register({
      name: 'cwd',
      description: "Copy the model's current working directory",
    })
    await refreshCwd($)
    return started
  })

  on('command.run', { command: 'term' }, async $ => ({ text: await openTerminal($) }))
  on('command.run', { command: 'cwd' }, async $ => ({ text: await copyCwd($) }))

  // A foreground `cd` in a Bash call is what moves the session's directory.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    await refreshCwd($)
    return ran
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const dir = await read($, cwdAtom)
    if (!dir || e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    return (
      <Box>
        <Text dimColor>cwd: {dir} </Text>
        <Button
          key="term"
          label="Terminal"
          onPress={async () => $.ui.toast(await openTerminal($))}
        />
        <Text> </Text>
        <Button
          key="copy"
          label="Copy"
          onPress={async () => $.ui.toast(await copyCwd($, e.surface))}
        />
      </Box>
    )
  })
}
