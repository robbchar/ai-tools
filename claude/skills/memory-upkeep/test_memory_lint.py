from pathlib import Path

from memory_lint import Finding, lint, main

VALID = "---\nname: a\ndescription: d\nmetadata:\n  type: project\n---\nbody\n"


def make(d: Path, name: str, body: str) -> None:
    with open(d / name, "w", newline="") as f:
        f.write(body)


def codes(findings):
    return [f.code for f in findings]


def base(d: Path, memory: str = "- [A](a.md) - x\n") -> None:
    make(d, "MEMORY.md", memory)
    make(d, "a.md", VALID)


def test_clean_dir_has_no_findings(tmp_path):
    base(tmp_path)
    assert lint(tmp_path) == []


def test_load_cap_lines(tmp_path):
    base(tmp_path, "- [A](a.md) - x\n" + "filler\n" * 200)
    assert codes(lint(tmp_path)) == ["LOAD_CAP"]


def test_load_cap_bytes(tmp_path):
    line = "- [A](a.md) - " + "x" * (25_001 - len("- [A](a.md) - "))
    assert len(line.encode()) == 25_001
    base(tmp_path, line)
    assert codes(lint(tmp_path)) == ["LOAD_CAP"]


def test_index_cap(tmp_path):
    base(tmp_path, "- [A](a.md) - x\n- [X](INDEX-x.md) - y\n")
    make(tmp_path, "INDEX-x.md", "x" * 20_001)
    found = lint(tmp_path)
    assert len(found) == 1
    assert found[0].code == "INDEX_CAP" and found[0].file == "INDEX-x.md"


def test_topic_over_cap_without_current_state(tmp_path):
    base(tmp_path)
    make(tmp_path, "a.md", VALID + "x" * 25_001)
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("NO_CURRENT_STATE", "a.md")]


def test_topic_over_cap_with_current_state(tmp_path):
    base(tmp_path)
    make(tmp_path, "a.md", VALID + "## Current state\n" + "x" * 25_001)
    assert lint(tmp_path) == []


def test_current_state_heading_with_suffix(tmp_path):
    base(tmp_path)
    heading = "## Current state (updated 2026-11-18)\n"
    make(tmp_path, "a.md", VALID + heading + "x" * 25_001)
    assert lint(tmp_path) == []


def test_current_state_outside_window(tmp_path):
    base(tmp_path)
    body = "filler\n" * 61 + "## Current state\n" + "x" * 25_001
    make(tmp_path, "a.md", VALID + body)
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("NO_CURRENT_STATE", "a.md")]


def archive_fixture(d: Path, parked: bool) -> None:
    make(d, "MEMORY.md", "- [R](ARCHIVE.md) - x\n- [P](INDEX-parked.md) - y\n")
    make(d, "ARCHIVE.md", "- [A](a.md) - done\n")
    make(d, "INDEX-parked.md", "- [A](a.md) - open\n" if parked else "")
    make(d, "a.md", VALID + "x" * 25_001)


def test_archived_topic_exempt_from_current_state(tmp_path):
    archive_fixture(tmp_path, parked=False)
    assert lint(tmp_path) == []


def test_archived_and_parked_topic_still_checked(tmp_path):
    archive_fixture(tmp_path, parked=True)
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [
        ("DUP_POINTER", "a.md"),
        ("NO_CURRENT_STATE", "a.md"),
    ]


def test_orphan(tmp_path):
    base(tmp_path)
    make(tmp_path, "b.md", VALID)
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("ORPHAN", "b.md")]
    assert isinstance(found[0], Finding)


def test_dangling(tmp_path):
    base(tmp_path, "- [A](a.md) - x\n- [M](missing.md) - y\n")
    found = lint(tmp_path)
    assert codes(found) == ["DANGLING"]
    assert "missing.md" in found[0].detail


def test_dup_pointer(tmp_path):
    base(tmp_path, "- [A](a.md) - x\n- [P](INDEX-p.md) - y\n- [P](INDEX-p.md) - z\n")
    make(tmp_path, "INDEX-p.md", "- [A](a.md) - x\n")
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("DUP_POINTER", "a.md")]


def count_fixture(d: Path, claim: int) -> None:
    base(d, f"- [A](a.md) - x\n- [P](INDEX-p.md) - {claim} entries; t\n")
    make(d, "b.md", VALID)
    make(d, "c.md", VALID)
    make(d, "INDEX-p.md", "- [B](b.md) - x\n- [C](c.md) - y\n")


def test_count_mismatch(tmp_path):
    count_fixture(tmp_path, 3)
    found = lint(tmp_path)
    assert codes(found) == ["COUNT"]
    assert found[0].detail == "claims 3, has 2"


def test_count_matches(tmp_path):
    count_fixture(tmp_path, 2)
    assert lint(tmp_path) == []


def test_stray_file(tmp_path):
    base(tmp_path)
    stray = tmp_path / "x.stackdump"
    stray.write_bytes(b"\xff\xfe junk")
    stray.chmod(0o000)  # any read attempt raises, so strays must never be opened
    try:
        found = lint(tmp_path)
    finally:
        stray.chmod(0o644)
    assert [(f.code, f.file) for f in found] == [("STRAY", "x.stackdump")]


def test_frontmatter_missing_description(tmp_path):
    base(tmp_path)
    make(tmp_path, "a.md", "---\nname: a\nmetadata:\n  type: project\n---\nbody\n")
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("FRONTMATTER", "a.md")]
    assert "description" in found[0].detail


def test_mixed_eol(tmp_path):
    base(tmp_path, "- [A](a.md) - x\r\nmore\n")
    make(tmp_path, "a.md", VALID.replace("\n", "\r\n"))
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("MIXED_EOL", "MEMORY.md")]


def test_link_forms(tmp_path):
    base(tmp_path, "- [A](./a.md) - x\n- [A](a.md#h) - y\n")
    found = lint(tmp_path)
    assert "ORPHAN" not in codes(found) and "DANGLING" not in codes(found)
    assert [(f.code, f.file) for f in found] == [("DUP_POINTER", "a.md")]


def test_only_lf_splits_lines(tmp_path):
    lines = ["- [A](a.md) - x"] + ["filler"] * 148 + ["- [A](a.md) - tail"]
    lines[10] = "form\x0cfeed and\u2028separator"
    base(tmp_path, "\n".join(lines) + "\n")
    found = lint(tmp_path)
    assert codes(found) == ["DUP_POINTER"]
    assert "MEMORY.md:1" in found[0].detail and "MEMORY.md:150" in found[0].detail


def test_main_exit_codes(tmp_path, capsys):
    clean = tmp_path / "clean"
    dirty = tmp_path / "dirty"
    clean.mkdir()
    dirty.mkdir()
    base(clean)
    base(dirty)
    make(dirty, "x.stackdump", "junk")
    assert main([str(clean)]) == 0
    assert capsys.readouterr().out == ""
    assert main([str(dirty)]) == 1
    out = capsys.readouterr().out.splitlines()
    expected = [f"{f.code} {f.file}: {f.detail}" for f in lint(dirty)]
    assert out == expected and len(out) == 1
    assert out[0].startswith("STRAY x.stackdump: ")


def test_missing_dir(capsys):
    assert main(["/nonexistent"]) == 2
    assert "not a directory" in capsys.readouterr().err


def test_unreachable_index_is_orphan(tmp_path):
    base(tmp_path)
    make(tmp_path, "INDEX-x.md", "- [B](b.md) - y\n")
    make(tmp_path, "b.md", VALID)
    found = lint(tmp_path)
    assert [(f.code, f.file) for f in found] == [("ORPHAN", "INDEX-x.md"), ("ORPHAN", "b.md")]
    assert found[0].detail == "index not reachable from MEMORY.md"


def test_index_reachable_through_index(tmp_path):
    base(tmp_path, "- [A](a.md) - x\n- [I](INDEX-a.md) - 1 entry\n")
    make(tmp_path, "INDEX-a.md", "- [Old](ARCHIVE-old.md) - 1\n")
    make(tmp_path, "ARCHIVE-old.md", "- [C](c.md) - z\n")
    make(tmp_path, "c.md", VALID)
    assert lint(tmp_path) == []
