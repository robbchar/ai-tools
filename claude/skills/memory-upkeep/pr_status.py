#!/usr/bin/env python3
"""Print the live GitHub state of every PR named in a memory index section."""

import argparse
import json
import re
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

PR_REF = re.compile(r"#(\d+)")
FAILED = {"FAILURE", "ERROR", "TIMED_OUT", "CANCELLED"}
VIEW_FIELDS = (
    "number,title,state,isDraft,headRefOid,baseRefName,headRefName,statusCheckRollup"
)


@dataclass(frozen=True)
class PrState:
    number: int
    title: str
    state: str
    draft: bool
    behind_by: int | None
    head: str
    checks: str


def extract_prs(memory_md: str, section: str = "Active work") -> list[int]:
    return scan_section(memory_md, section)[0]


def scan_section(memory_md: str, section: str) -> tuple[list[int], bool]:
    """Return the PR numbers in the section and whether its heading exists."""
    found: list[int] = []
    inside = False
    seen_heading = False
    for line in memory_md.splitlines():
        if line.startswith("# "):
            heading = line[2:].strip()
            inside = heading == section or heading.startswith(section + " ")
            seen_heading = seen_heading or inside
            continue
        if inside:
            for m in PR_REF.finditer(line):
                n = int(m.group(1))
                if n not in found:
                    found.append(n)
    return found, seen_heading


def summarize_checks(rollup: list[dict]) -> str:
    if not rollup:
        return "none"
    # CheckRun has conclusion/status; StatusContext has only state.
    outcomes = [(c.get("conclusion") or c.get("state") or "").upper() for c in rollup]
    if any(o in FAILED for o in outcomes):
        return "fail"
    unfinished = any(
        (c.get("status") or "COMPLETED").upper() != "COMPLETED"
        or o in {"", "PENDING", "EXPECTED"}
        for c, o in zip(rollup, outcomes)
    )
    return "pending" if unfinished else "pass"


GH_TIMEOUT = 30
_reported: set[str] = set()
_reported_lock = threading.Lock()


def _report(reason: str) -> None:
    # One line per distinct reason, so a run of failing PRs stays readable.
    with _reported_lock:
        if reason in _reported:
            return
        _reported.add(reason)
    print(f"gh: {reason}", file=sys.stderr)


def _gh(*args: str) -> str | None:
    try:
        result = subprocess.run(
            ["gh", *args], capture_output=True, text=True, timeout=GH_TIMEOUT
        )
    except (OSError, subprocess.TimeoutExpired, UnicodeDecodeError) as e:
        _report(type(e).__name__ if not str(e) else str(e).splitlines()[0])
        return None
    if result.returncode != 0:
        lines = (result.stderr or "").strip().splitlines()
        _report(lines[0] if lines else f"exit {result.returncode}")
        return None
    return result.stdout


def _resolve_repo() -> str | None:
    out = _gh("repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner")
    return out.strip() if out else None


def fetch(n: int, repo: str | None = None) -> PrState | None:
    view_args = ["pr", "view", str(n), "--json", VIEW_FIELDS]
    if repo:
        view_args += ["--repo", repo]
    out = _gh(*view_args)
    if out is None:
        return None
    try:
        return _parse(n, out, repo)
    except (KeyError, TypeError, ValueError, AttributeError) as e:
        _report(f"unexpected output for #{n}: {type(e).__name__}")
        return None


def _parse(n: int, out: str, repo: str | None) -> PrState:
    pr = json.loads(out)
    behind_by = None
    if pr["state"] == "OPEN":
        repo = repo or _resolve_repo()
        if repo:
            compare = f"repos/{repo}/compare/{pr['baseRefName']}...{pr['headRefOid']}"
            behind = _gh("api", compare, "--jq", ".behind_by")
            if behind is not None and behind.strip().isdigit():
                behind_by = int(behind.strip())
    return PrState(
        number=pr["number"],
        title=pr["title"],
        state=pr["state"],
        draft=pr["isDraft"],
        behind_by=behind_by,
        head=pr["headRefOid"][:8],
        checks=summarize_checks(pr["statusCheckRollup"] or []),
    )


def render(rows: list[tuple[int, PrState | None]]) -> str:
    lines = []
    for n, s in rows:
        if s is None:
            lines.append(f"#{n} unknown (gh failed)")
            continue
        draft = " draft" if s.draft else ""
        behind = "-" if s.behind_by is None else s.behind_by
        lines.append(
            f"#{n} {s.state}{draft} behind:{behind} {s.head} checks:{s.checks}  {s.title}"
        )
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("memory_md")
    parser.add_argument("--section", default="Active work")
    parser.add_argument("--repo")
    args = parser.parse_args(argv)
    with open(args.memory_md, encoding="utf-8") as f:
        numbers, has_heading = scan_section(f.read(), args.section)
    if not has_heading:
        print(
            f"pr_status: no '# {args.section}' heading in {args.memory_md} (use --section)",
            file=sys.stderr,
        )
        return 2
    if not numbers:
        return 0
    repo = args.repo or _resolve_repo()
    with ThreadPoolExecutor(max_workers=8) as pool:
        states = list(pool.map(lambda n: fetch(n, repo), numbers))
    print(render(list(zip(numbers, states))))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
