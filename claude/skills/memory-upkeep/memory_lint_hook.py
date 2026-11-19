#!/usr/bin/env python3
"""PostToolUse hook: lint the memory folder when a memory file is edited."""

import json
import os
import sys
from pathlib import Path
from typing import TextIO

try:
    from memory_lint import lint
except Exception:  # a broken sibling module must not break every edit
    lint = None

MAX_FINDINGS = 20


def memory_dir_for(file_path: str, projects_root: Path, extra_dirs: list[Path]) -> Path | None:
    # Paths are compared as given (no symlink resolution) so symlinked folders match.
    parent = Path(os.path.normpath(file_path)).parent
    for extra in extra_dirs:
        if parent == Path(os.path.normpath(extra)):
            return extra
    root = Path(os.path.normpath(projects_root))
    if parent.name == "memory" and parent.parent.parent == root:
        return parent
    return None


def main(argv: list[str] | None = None, stdin: TextIO = sys.stdin) -> int:
    try:
        args = sys.argv[1:] if argv is None else argv
        root = Path.home() / ".claude" / "projects"
        extras: list[Path] = []
        i = 0
        while i < len(args):
            if args[i] == "--projects-root":
                root = Path(args[i + 1])
            elif args[i] == "--dir":
                extras.append(Path(args[i + 1]))
            i += 2
        file_path = json.load(stdin)["tool_input"]["file_path"]
        mem = memory_dir_for(file_path, root, extras)
        if mem is None:
            return 0
        assert lint is not None
        findings = lint(mem)
        if findings:
            header = (
                f"memory lint ({mem}): findings on entries you didn't touch may be another "
                "session's edit in progress; re-lint after your last edit."
            )
            lines = [header] + [f"{f.code} {f.file}: {f.detail}" for f in findings[:MAX_FINDINGS]]
            if len(findings) > MAX_FINDINGS:
                lines.append(f"+{len(findings) - MAX_FINDINGS} more (run memory_lint.py for all)")
            print(json.dumps({"hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": "\n".join(lines),
            }}))
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
