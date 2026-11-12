#!/usr/bin/env python3
"""Find files a GitHub workflow uses that its own `paths:` filter would not trigger on.

A workflow with `paths:` (or `paths-ignore:`) runs only for matching changes. A file it
uses but doesn't match can change without the workflow running. Paths are found, not
hardcoded: any token in the workflow that names a tracked file or directory counts.
"""
import argparse
import os
import re
import subprocess
import sys

try:
    import yaml
except ImportError:
    sys.exit("workflow_paths.py needs PyYAML (python3 -m pip install pyyaml)")

GATING_EVENTS = ("push", "pull_request", "pull_request_target")
PATH_TOKEN = re.compile(r"[\w.@+~-]*(?:/[\w.@+~-]+)+/?|[\w.@+~-]+\.[A-Za-z0-9]{1,5}")
TF_SOURCE = re.compile(r'source\s*=\s*"(\.{1,2}/[^"]+)"')
SHELL_COMMENT = re.compile(r"(^|\s)#.*$", re.M)
CWD_TOKEN = re.compile(r"(?:\bcd|--cwd|-C|--prefix|-chdir=)\s*([\w./@+~-]+)")


def git(tree, *args):
    return subprocess.run(["git", "-C", tree, *args], check=True, capture_output=True, text=True).stdout


def glob_to_regex(pattern):
    """GitHub filter glob: ** crosses directories, * and ? stay within one segment."""
    out, i = "", 0
    while i < len(pattern):
        c = pattern[i]
        if pattern.startswith("**/", i):
            out, i = out + "(?:.*/)?", i + 3
        elif pattern.startswith("**", i):
            out, i = out + ".*", i + 2
        elif c == "*":
            out, i = out + "[^/]*", i + 1
        elif c == "?":
            out, i = out + "[^/]", i + 1
        elif c == "[":
            j = pattern.find("]", i)
            out, i = (out + pattern[i : j + 1], j + 1) if j > i else (out + re.escape(c), i + 1)
        else:
            out, i = out + re.escape(c), i + 1
    return re.compile("^" + out + "$")


def included(patterns, path):
    """Later patterns win; a leading ! excludes."""
    result = False
    for p in patterns:
        neg = p.startswith("!")
        if glob_to_regex(p[1:] if neg else p).match(path):
            result = not neg
    return result


def triggers(doc):
    on = doc.get("on", doc.get(True))  # YAML 1.1 reads a bare `on` key as True
    if not isinstance(on, dict):
        return {}
    out = {}
    for event in GATING_EVENTS:
        cfg = on.get(event)
        if isinstance(cfg, dict) and ("paths" in cfg or "paths-ignore" in cfg):
            out[event] = (cfg.get("paths") or [], cfg.get("paths-ignore") or [])
    return out


def strings(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from strings(k)
            yield from strings(v)
    elif isinstance(node, list):
        for v in node:
            yield from strings(v)


class Repo:
    def __init__(self, tree):
        self.tree = tree
        self.files = set(git(tree, "ls-files").splitlines())
        self.dirs = {os.path.dirname(f) for f in self.files}
        for d in list(self.dirs):
            while d:
                d = os.path.dirname(d)
                self.dirs.add(d)
        self.dirs.discard("")

    def under(self, d):
        prefix = d.rstrip("/") + "/"
        return sorted(f for f in self.files if f.startswith(prefix))

    def resolve(self, token, bases):
        token = token.strip().rstrip("/")
        if token.startswith("./"):
            token = token[2:]
        if "*" in token or not token or token.startswith(("http", "$", "/")):
            return None
        for base in ["", *bases]:
            cand = os.path.normpath(os.path.join(base, token)) if base else os.path.normpath(token)
            if cand in self.files or cand in self.dirs:
                return cand
        return None


def terraform_modules(repo, root, seen):
    """Local modules a Terraform directory sources, transitively."""
    for f in repo.files:
        if os.path.dirname(f) == root and f.endswith(".tf"):
            with open(os.path.join(repo.tree, f), encoding="utf-8", errors="replace") as fh:
                for src in TF_SOURCE.findall(fh.read()):
                    mod = os.path.normpath(os.path.join(root, src))
                    if mod in repo.dirs and mod not in seen:
                        seen[mod] = f"module sourced by {root}"
                        terraform_modules(repo, mod, seen)


def consumed(repo, wf_path, seen_workflows=None):
    """{path: (why, called workflow or None)} for what a workflow uses, following local called workflows."""
    seen_workflows = seen_workflows or set()
    seen_workflows.add(wf_path)
    with open(os.path.join(repo.tree, wf_path), encoding="utf-8") as fh:
        doc = yaml.safe_load(fh) or {}
    body = {k: v for k, v in doc.items() if k not in ("on", True)}  # filters aren't uses
    texts = [SHELL_COMMENT.sub("", s) for s in strings(body)]
    bases = sorted(set(_working_dirs(body)))
    out = {wf_path: ("the workflow file itself", None)}
    for base in bases:
        path = repo.resolve(base, [])
        if path:
            out.setdefault(path, ("working-directory", None))
    for text in texts:
        for token in [*PATH_TOKEN.findall(text), *CWD_TOKEN.findall(text)]:
            path = repo.resolve(token, bases)
            if path and path not in out:
                out[path] = ("named in the workflow", None)
    for path in list(out):
        if path in repo.dirs:
            mods = {}
            terraform_modules(repo, path, mods)
            for mod, why in mods.items():
                out.setdefault(mod, (why, None))
        called = path.endswith((".yml", ".yaml")) and path.startswith(".github/workflows/")
        if called and path not in seen_workflows:
            for sub, (why, via) in consumed(repo, path, seen_workflows).items():
                out.setdefault(sub, (why, via or path))
    return out


def _working_dirs(node):
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "working-directory" and isinstance(v, str):
                yield v
            else:
                yield from _working_dirs(v)
    elif isinstance(node, list):
        for v in node:
            yield from _working_dirs(v)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tree", default=".")
    ap.add_argument("--base", help="base ref; files changed in base...HEAD are reported as gaps in this diff")
    args = ap.parse_args()
    tree = git(args.tree, "rev-parse", "--show-toplevel").strip()
    repo = Repo(tree)
    wf_dir = ".github/workflows"
    workflows = sorted(f for f in repo.files if os.path.dirname(f) == wf_dir and f.endswith((".yml", ".yaml")))
    if not workflows:
        print("No workflows under .github/workflows; nothing to check.")
        return
    changed = set()
    if args.base:
        changed = set(git(tree, "diff", "--name-only", f"{args.base}...HEAD").splitlines())
        changed |= set(git(tree, "diff", "--name-only", "HEAD").splitlines())

    filtered, in_diff, direct, via_called = 0, {}, [], {}
    for wf in workflows:
        with open(os.path.join(tree, wf), encoding="utf-8") as fh:
            doc = yaml.safe_load(fh) or {}
        trig = triggers(doc)
        if not trig:
            continue
        filtered += 1
        reported = []  # (origin, dir) already reported, so their subfolders aren't repeated
        for path, (why, via) in sorted(consumed(repo, wf).items()):
            if any(o == via and path.startswith(d + "/") for o, d in reported):
                continue
            files = repo.under(path) if path in repo.dirs else [path]
            events, missed = [], set()
            for event, (paths, ignore) in trig.items():
                m = [f for f in files if (paths and not included(paths, f)) or (ignore and included(ignore, f))]
                if m:
                    events.append(event)
                    missed.update(m)
            if not missed:
                continue
            if path in repo.dirs:
                reported.append((via, path))
            missed = sorted(missed)
            ev = ", ".join(events)
            for f in missed:
                if f not in changed:
                    continue
                prev = in_diff.get((wf, f))
                if prev is None or (prev[2] and not via):  # a direct use outranks one via a called workflow
                    in_diff[(wf, f)] = (ev, why, via)
            label = f"{path}/ ({len(missed)} of {len(files)} files)" if path in repo.dirs else path
            if via:
                via_called.setdefault((wf, via, ev), []).append(label)
            else:
                direct.append(f"{wf} [{ev}]: {label}  ({why})")

    print(f"Workflows: {len(workflows)}; with path filters: {filtered}")
    if args.base:
        print("\nGAPS IN THIS DIFF: changed files a filtered workflow uses but won't run for")
        grouped = {}
        for (wf, f), (ev, why, via) in sorted(in_diff.items()):
            if via:
                grouped.setdefault((wf, via, ev), []).append(f)
            else:
                print(f"{wf} [{ev}]: {f}  ({why})")
        for (wf, via, ev), files in sorted(grouped.items()):
            shown = ", ".join(files[:5]) + (f" and {len(files) - 5} more" if len(files) > 5 else "")
            print(f"{wf} -> {via} [{ev}]: {shown}  (used by the called workflow; check this caller's inputs)")
        if not in_diff:
            print("none")
    print("\nDIRECT GAPS: paths the workflow itself uses that its filter misses")
    print("\n".join(direct) if direct else "none")
    print("\nVIA CALLED WORKFLOWS: paths a called workflow uses; check whether this caller's inputs reach them")
    if via_called:
        for (wf, via, ev), labels in sorted(via_called.items()):
            print(f"{wf} -> {via} [{ev}]: {', '.join(labels)}")
    else:
        print("none")


if __name__ == "__main__":
    main()
