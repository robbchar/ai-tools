import io
import json
import shutil
import subprocess
import sys
from pathlib import Path

import memory_lint_hook as hook

VALID = "---\nname: a\ndescription: d\nmetadata:\n  type: project\n---\nbody\n"


def make_memory(root: Path, orphan: bool = False) -> Path:
    mem = root / "k" / "memory"
    mem.mkdir(parents=True)
    (mem / "MEMORY.md").write_text("- [A](a.md) - x\n")
    (mem / "a.md").write_text(VALID)
    if orphan:
        (mem / "b.md").write_text(VALID)
    return mem


def run(root: Path, file_path: str, capsys, raw: str | None = None):
    payload = raw if raw is not None else json.dumps({"tool_input": {"file_path": file_path}})
    code = hook.main(["--projects-root", str(root)], stdin=io.StringIO(payload))
    out = capsys.readouterr()
    return code, out.out, out.err


def boom(*_a, **_k):
    raise RuntimeError("boom")


def test_memory_dir_for_matches_memory_file(tmp_path):
    assert hook.memory_dir_for(str(tmp_path / "k/memory/a.md"), tmp_path, []) == tmp_path / "k/memory"


def test_memory_dir_for_ignores_other_paths(tmp_path):
    for p in (
        "/repo/src/a.md",
        str(tmp_path / "k/memory-snapshots/x.md"),
        str(tmp_path / "k/memory/sub/a.md"),
        "/repo/.claude/memory/a.md",
        str(tmp_path / "a/b/memory/x.md"),
    ):
        assert hook.memory_dir_for(p, tmp_path, []) is None


def test_memory_dir_for_extra_dir(tmp_path):
    extra = tmp_path / "elsewhere"
    assert hook.memory_dir_for(str(extra / "a.md"), tmp_path / "root", [extra]) == extra


def test_memory_dir_for_symlinked_memory_folder(tmp_path):
    real = tmp_path / "real"
    real.mkdir()
    (tmp_path / "k").mkdir()
    (tmp_path / "k" / "memory").symlink_to(real, target_is_directory=True)
    assert hook.memory_dir_for(str(tmp_path / "k/memory/a.md"), tmp_path, []) == tmp_path / "k/memory"


def test_hook_silent_when_clean(tmp_path, capsys):
    mem = make_memory(tmp_path)
    assert run(tmp_path, str(mem / "MEMORY.md"), capsys) == (0, "", "")


def test_hook_reports_findings(tmp_path, capsys):
    mem = make_memory(tmp_path, orphan=True)
    code, out, err = run(tmp_path, str(mem / "b.md"), capsys)
    assert code == 0 and err == ""
    spec = json.loads(out)["hookSpecificOutput"]
    assert spec["hookEventName"] == "PostToolUse"
    text = spec["additionalContext"]
    assert text.startswith(f"memory lint ({mem}):")
    assert any(ln.startswith("ORPHAN") and "b.md" in ln for ln in text.splitlines()[1:])


def test_hook_ignores_non_memory_edit(tmp_path, capsys, monkeypatch):
    calls = []
    monkeypatch.setattr(hook, "lint", lambda *a, **k: calls.append(a))
    assert run(tmp_path, "/repo/src/a.md", capsys) == (0, "", "")
    assert calls == []


def test_hook_bad_input_exits_0(tmp_path, capsys):
    assert run(tmp_path, "", capsys, raw="not json") == (0, "", "")


def test_hook_missing_file_path_exits_0(tmp_path, capsys):
    assert run(tmp_path, "", capsys, raw=json.dumps({"tool_input": {}})) == (0, "", "")


def test_hook_lint_error_exits_0(tmp_path, capsys, monkeypatch):
    mem = make_memory(tmp_path)
    monkeypatch.setattr(hook, "lint", boom)
    assert run(tmp_path, str(mem / "MEMORY.md"), capsys) == (0, "", "")


def test_hook_dir_flag_reports_findings(tmp_path, capsys):
    extra = tmp_path / "custom"
    extra.mkdir()
    (extra / "MEMORY.md").write_text("- [A](a.md) - x\n")
    (extra / "a.md").write_text(VALID)
    (extra / "b.md").write_text(VALID)
    payload = json.dumps({"tool_input": {"file_path": str(extra / "b.md")}})
    code = hook.main(["--projects-root", str(tmp_path / "none"), "--dir", str(extra)], stdin=io.StringIO(payload))
    out = capsys.readouterr()
    assert code == 0 and out.err == ""
    text = json.loads(out.out)["hookSpecificOutput"]["additionalContext"]
    assert any(ln.startswith("ORPHAN") for ln in text.splitlines())


def test_hook_dir_flag_without_value_exits_0(tmp_path, capsys):
    payload = json.dumps({"tool_input": {"file_path": "/repo/a.md"}})
    assert hook.main(["--dir"], stdin=io.StringIO(payload)) == 0
    out = capsys.readouterr()
    assert (out.out, out.err) == ("", "")


def test_hook_missing_linter_module_exits_0_silently(tmp_path):
    shutil.copy(Path(hook.__file__), tmp_path / "memory_lint_hook.py")
    mem = tmp_path / "root" / "k" / "memory"
    mem.mkdir(parents=True)
    payload = json.dumps({"tool_input": {"file_path": str(mem / "a.md")}})
    r = subprocess.run(
        [sys.executable, str(tmp_path / "memory_lint_hook.py"), "--projects-root", str(tmp_path / "root")],
        input=payload, capture_output=True, text=True,
    )
    assert (r.returncode, r.stdout, r.stderr) == (0, "", "")


def test_hook_header_warns_about_concurrent_edits(tmp_path, capsys):
    mem = make_memory(tmp_path, orphan=True)
    _, out, _ = run(tmp_path, str(mem / "b.md"), capsys)
    lines = json.loads(out)["hookSpecificOutput"]["additionalContext"].splitlines()
    assert lines[0] == (
        f"memory lint ({mem}): findings on entries you didn't touch may be another "
        "session's edit in progress; re-lint after your last edit."
    )
    assert lines[1].startswith("ORPHAN")


def test_hook_caps_findings_at_20_lines(tmp_path, capsys):
    mem = make_memory(tmp_path)
    for i in range(25):
        (mem / f"o{i:02}.md").write_text(VALID)
    _, out, _ = run(tmp_path, str(mem / "MEMORY.md"), capsys)
    lines = json.loads(out)["hookSpecificOutput"]["additionalContext"].splitlines()
    findings = [ln for ln in lines if ln.startswith("ORPHAN")]
    assert len(findings) == 20
    assert lines[-1] == "+5 more (run memory_lint.py for all)"
