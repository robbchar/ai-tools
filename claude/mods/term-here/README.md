# term-here

Claude Code mod: open a terminal at the directory the model is working in right now.

- **Band above the prompt:** `cwd: <path>  [ Terminal ] [ Copy ]`
- **`/term`:** opens a terminal there. It tries Windows Terminal with its "Git Bash" profile (same window as the pinned shortcut), then Git's own Git Bash window, then a PowerShell window, then Windows Terminal's default profile, and uses the first one that starts. To change the preference, reorder `LAUNCHERS` in `hooks/register.tsx`. Under WSL it first tries a new tab in Windows Terminal's "Ubuntu" profile; the path to `wt.exe` includes the Windows user name, so change `WSL_LAUNCHER` on another machine.
- **`/cwd`:** copies the path to the clipboard, so you can `cd` there in the built-in terminal panel.

The path is re-read after every Bash call, because a foreground `cd` is what moves the session's directory.

## Load it in the desktop app

Add this to the `env` block of `~/.claude/settings.json`, using the absolute path to this folder:

```json
"env": {
  "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\Admin\\Projects\\ai-tools\\claude\\mods\\term-here",
  "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
}
```

New Code sessions pick it up. `CLAUDE_CODE_PLUGIN_DIR_WATCH=1` makes edits to the mod hot-reload in open sessions. To load several plugin folders, separate them with `;` on Windows or `:` on Linux and WSL. Under WSL, use the path to a clone inside the Linux filesystem, such as `~/Projects/ai-tools/claude/mods/term-here`.

## Develop

```
claude plugin validate .
claude plugin test .
```
