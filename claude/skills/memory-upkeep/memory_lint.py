#!/usr/bin/env python3
"""Lint a Claude Code auto-memory folder: index files linking to topic files."""

import re
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Finding:
    code: str
    file: str
    detail: str


@dataclass(frozen=True)
class Caps:
    load_lines: int = 200
    load_bytes: int = 25_000
    index_bytes: int = 20_000
    topic_bytes: int = 25_000
    state_within_lines: int = 60


LINK = re.compile(r"\]\(([^)\s#]+\.md)(?:#[^)]*)?\)")
COUNT_CLAIM = re.compile(r"\]\(([^)\s#]+\.md)(?:#[^)]*)?\)\s*[-–—]\s*(\d+)\b")
REQUIRED_KEYS = ("name", "description", "type")


def is_index(name: str) -> bool:
    return name == "MEMORY.md" or name.startswith(("INDEX", "ARCHIVE"))


def split_lines(text: str) -> list[str]:
    """Split on LF only (str.splitlines also breaks on form feed, U+2028, etc.)."""
    lines = [ln.removesuffix("\r") for ln in text.split("\n")]
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def normalize(target: str) -> str:
    return target[2:] if target.startswith("./") else target


def links_in(line: str) -> list[str]:
    return [normalize(t) for t in LINK.findall(line) if "://" not in t]


def frontmatter_keys(lines: list[str]) -> tuple[set[str], int]:
    """Return the keys found between the first two `---` lines and the body start."""
    if not lines or lines[0].strip() != "---":
        return set(), 0
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            keys = {ln.split(":", 1)[0].strip() for ln in lines[1:i] if ":" in ln}
            return keys, i + 1
    return set(), 0


def lint(memory_dir: Path, caps: Caps = Caps()) -> list[Finding]:
    findings: list[Finding] = []
    files = sorted(p for p in memory_dir.iterdir() if p.is_file())
    names = {p.name for p in files}
    texts: dict[str, str] = {}
    sizes: dict[str, int] = {}

    for p in files:
        if p.suffix != ".md":
            findings.append(Finding("STRAY", p.name, "not a markdown file"))
            continue
        raw = p.read_bytes()
        sizes[p.name] = len(raw)
        texts[p.name] = raw.decode("utf-8", errors="replace")
        crlf = raw.count(b"\r\n")
        if crlf and raw.count(b"\n") > crlf:
            findings.append(Finding("MIXED_EOL", p.name, "both CRLF and LF line endings"))

    index_names = [n for n in texts if is_index(n)]
    topic_names = [n for n in texts if not is_index(n)]

    if "MEMORY.md" in texts:
        n_lines = len(split_lines(texts["MEMORY.md"]))
        if n_lines > caps.load_lines or sizes["MEMORY.md"] > caps.load_bytes:
            findings.append(Finding(
                "LOAD_CAP", "MEMORY.md",
                f"{n_lines} lines, {sizes['MEMORY.md']} bytes "
                f"(caps {caps.load_lines} lines, {caps.load_bytes} bytes)",
            ))
    for n in index_names:
        if n != "MEMORY.md" and sizes[n] > caps.index_bytes:
            findings.append(Finding("INDEX_CAP", n, f"{sizes[n]} bytes (cap {caps.index_bytes})"))

    linked: set[str] = set()
    index_links: dict[str, set[str]] = {}
    topic_lines: dict[str, set[tuple[str, int]]] = {}
    for idx in index_names:
        dangling: set[str] = set()
        for lineno, line in enumerate(split_lines(texts[idx]), 1):
            for target in links_in(line):
                index_links.setdefault(idx, set()).add(target)
                if target not in names:
                    dangling.add(target)
                elif target in topic_names:
                    topic_lines.setdefault(target, set()).add((idx, lineno))
            m = COUNT_CLAIM.search(line)
            if m and is_index(normalize(m.group(1))) and normalize(m.group(1)) in texts:
                target, claimed = normalize(m.group(1)), int(m.group(2))
                actual = sum(1 for ln in split_lines(texts[target]) if ln.startswith("- ["))
                if claimed != actual:
                    findings.append(Finding("COUNT", target, f"claims {claimed}, has {actual}"))
        for target in sorted(dangling):
            findings.append(Finding("DANGLING", idx, f"links missing file {target}"))

    # Only indexes reachable from MEMORY.md through other indexes make a topic linked.
    reachable: set[str] = set()
    pending = ["MEMORY.md"] if "MEMORY.md" in texts else []
    while pending:
        cur = pending.pop()
        if cur in reachable:
            continue
        reachable.add(cur)
        pending += [t for t in index_links.get(cur, ()) if t in index_names]
    for idx in sorted(index_names):
        if idx != "MEMORY.md" and idx not in reachable:
            findings.append(Finding("ORPHAN", idx, "index not reachable from MEMORY.md"))
        elif idx in reachable:
            linked |= index_links.get(idx, set())

    for n in topic_names:
        if n not in linked:
            findings.append(Finding("ORPHAN", n, "linked from no index file"))
        if len(topic_lines.get(n, ())) > 1:
            where = ", ".join(f"{f}:{ln}" for f, ln in sorted(topic_lines[n]))
            findings.append(Finding("DUP_POINTER", n, f"linked from {where}"))

        lines = split_lines(texts[n])
        keys, body_start = frontmatter_keys(lines)
        missing = [k for k in REQUIRED_KEYS if k not in keys]
        if missing:
            findings.append(Finding("FRONTMATTER", n, "missing " + ", ".join(missing)))
        archived_only = bool(topic_lines.get(n)) and all(
            f.startswith("ARCHIVE") for f, _ in topic_lines[n]
        )
        if sizes[n] > caps.topic_bytes and not archived_only:
            window = lines[body_start:body_start + caps.state_within_lines]
            if not any(ln.startswith("## Current state") for ln in window):
                findings.append(Finding(
                    "NO_CURRENT_STATE", n,
                    f"{sizes[n]} bytes (cap {caps.topic_bytes}) and no '## Current state' "
                    f"within {caps.state_within_lines} lines",
                ))

    return sorted(findings, key=lambda f: (f.code, f.file, f.detail))


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1 or not Path(args[0]).is_dir():
        shown = args[0] if args else ""
        print(f"memory_lint: {shown}: not a directory", file=sys.stderr)
        return 2
    findings = lint(Path(args[0]))
    for f in findings:
        print(f"{f.code} {f.file}: {f.detail}")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
