#!/usr/bin/env python3
"""List names a diff removed or renamed, and where the rest of the repo still mentions them.

A name counts as removed when it appears on a removed line and on no added line anywhere
in the diff. Data, lock and binary files are never read, and --exclude adds more pathspecs
(for example a project's sensitive-data folders).
"""
import argparse
import re
import subprocess
import sys

DEFAULT_EXCLUDES = [
    "*.csv", "*.tsv", "*.parquet", "*.jsonl", "*.ndjson", "*.xlsx", "*.lock", "*.lockb",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "*.min.js", "*.map", "*.snap",
    "*fixture*.json", "*/fixtures/*", "*/__fixtures__/*", "*/golden/*",
]
JS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs")
CONFIG = (".yml", ".yaml", ".json", ".toml")
SHELLISH = (".sh", ".bash", ".env", "Dockerfile", "Makefile")
# Definitions only: a removed use of a name that is still defined elsewhere is not drift.
DEFINITIONS = [
    ("function", re.compile(r"^\s*(?:async\s+)?def\s+([A-Za-z_]\w+)"), (".py",)),
    ("class", re.compile(r"^\s*class\s+([A-Za-z_]\w+)"), (".py",)),
    ("constant", re.compile(r"^([A-Z][A-Z0-9_]+)\s*[:=]"), (".py",)),
    ("declaration", re.compile(r"\b(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]+)"), JS),
    ("key or field", re.compile(r"""^\s*["']?([A-Za-z_][\w-]+)["']?\??\s*:(?!:)"""), JS + CONFIG + (".py",)),
    ("flag", re.compile(r"""add_argument\(\s*["'](--[\w-]+)"""), (".py",)),
    ("flag", re.compile(r"(?<![\w-])(--[a-z][a-z0-9-]{2,})"), SHELLISH + CONFIG + (".md",)),
    ("env var", re.compile(r"\b(?:export\s+)?([A-Z][A-Z0-9_]{3,})="), SHELLISH + CONFIG),
    ("env var", re.compile(r"^\s*([A-Z][A-Z0-9_]{3,}):"), CONFIG),
    ("terraform", re.compile(r'^\s*(?:resource|data)\s+"[\w-]+"\s+"([\w-]+)"'), (".tf",)),
    ("terraform", re.compile(r'^\s*(?:module|variable|output)\s+"([\w-]+)"'), (".tf",)),
    ("heading", re.compile(r"^#{1,6}\s+(.{4,80}?)\s*$"), (".md",)),
]
STOP = set("""true false null none self this that return import export const function class string number
value values name names type types data path paths error errors index default object array list items
item key keys test tests main else elif finally except while with lambda async await props state
children style title label description id""".split())
KIND_ORDER = ["deleted file", "renamed file", "function", "class", "declaration", "constant", "env var",
              "flag", "terraform", "key or field", "heading", "given"]


def git(tree, *args, check=True):
    r = subprocess.run(["git", "-C", tree, *args], capture_output=True, text=True)
    if check and r.returncode not in (0, 1):
        sys.exit(r.stderr.strip())
    return r.stdout


def parse_diff(text):
    """Yield (file, sign, old_line, content) for removed and added lines."""
    file, old_no = None, 0
    for line in text.splitlines():
        if line.startswith("+++ "):
            file = line[6:] if line.startswith("+++ b/") else file
        elif line.startswith("--- "):
            file = line[6:] if line.startswith("--- a/") else file
        elif line.startswith("@@"):
            m = re.match(r"@@ -(\d+)", line)
            old_no = int(m.group(1)) if m else 0
        elif line.startswith("-"):
            yield file, "-", old_no, line[1:]
            old_no += 1
        elif line.startswith("+"):
            yield file, "+", None, line[1:]


def tokens(file, content):
    out = []
    for kind, pat, exts in DEFINITIONS:
        if file and file.endswith(exts):
            out += [(kind, m.group(1)) for m in pat.finditer(content)]
    return [(k, t) for k, t in out if len(t) >= 4 and t.lower() not in STOP]


def search_args(kind, tok):
    """A key or field name is often a common word, so match only the forms that read or write it."""
    if kind == "key or field":
        t = re.sub(r"([.\[\]()*+?{}|^$\\])", r"\\\1", tok)
        return ["-E", "-e", rf"([\"'`]{t}[\"'`]|\.{t}\b|\b{t}\??[[:space:]]*:)"]
    whole_word = kind not in ("heading", "deleted file", "renamed file", "given")
    return ["-F", *(["-w"] if whole_word else []), "-e", tok]


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--tree", default=".")
    ap.add_argument("--base", required=True, help="base ref; the diff is base...HEAD plus uncommitted changes")
    ap.add_argument("--exclude", action="append", default=[], help="pathspec never read, e.g. 'data/seeds/'")
    ap.add_argument("--name", action="append", default=[], help="extra name or phrase to search, e.g. from removed prose")
    ap.add_argument("--max-hits", type=int, default=12, help="hits shown per name")
    ap.add_argument("--max-names", type=int, default=150)
    args = ap.parse_args()

    tree = git(args.tree, "rev-parse", "--show-toplevel").strip()
    spec = ["--", "."] + [f":(exclude){p}" for p in DEFAULT_EXCLUDES + args.exclude]
    diff = git(tree, "diff", "--unified=0", "--no-color", "--no-ext-diff", "-M", f"{args.base}...HEAD", *spec)
    diff += git(tree, "diff", "--unified=0", "--no-color", "--no-ext-diff", "-M", "HEAD", *spec)

    removed, added = {}, set()
    for file, sign, old_no, content in parse_diff(diff):
        for kind, tok in tokens(file, content):
            if sign == "+":
                added.add(tok)
            else:
                removed.setdefault(tok, (kind, f"{file}:{old_no}"))
    for status_line in git(tree, "diff", "--name-status", "-M", f"{args.base}...HEAD", *spec).splitlines():
        parts = status_line.split("\t")
        if parts[0] == "D":
            removed.setdefault(parts[1], ("deleted file", parts[1]))
        elif parts[0].startswith("R") and len(parts) == 3:
            removed.setdefault(parts[1], ("renamed file", f"{parts[1]} -> {parts[2]}"))

    for extra in args.name:
        removed[extra] = ("given", "--name")
    names = sorted(
        ((t, k, where) for t, (k, where) in removed.items() if t not in added),
        key=lambda x: (KIND_ORDER.index(x[1]), x[0]),
    )
    dropped = max(0, len(names) - args.max_names)
    names = names[: args.max_names]

    grep_spec = ["--", "."] + [f":(exclude){p}" for p in DEFAULT_EXCLUDES + args.exclude]
    clean, found = [], 0
    print(f"Base: {args.base}; names removed or renamed: {len(names)}"
          + (f" (first {args.max_names}; {dropped} more not checked)" if dropped else ""))
    print(f"Never read: {', '.join(DEFAULT_EXCLUDES + args.exclude)}")
    print("Reuse for any other search: git grep <pattern> " + " ".join(f"'{a}'" for a in grep_spec) + "\n")
    for tok, kind, where in names:
        hits = git(tree, "grep", "-n", "-I", *search_args(kind, tok), *grep_spec).splitlines()
        if not hits:
            clean.append(tok)
            continue
        found += 1
        print(f"== {tok}  [{kind}, removed at {where}]  {len(hits)} remaining mention(s)")
        for h in hits[: args.max_hits]:
            print("   " + (h if len(h) <= 160 else h[:157] + "..."))
        if len(hits) > args.max_hits:
            print(f"   ... {len(hits) - args.max_hits} more")
    print(f"\nNames with remaining mentions: {found}. With none: {len(clean)}")
    if clean:
        print("   " + ", ".join(clean))


if __name__ == "__main__":
    main()
