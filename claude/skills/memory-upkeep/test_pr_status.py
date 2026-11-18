import json
import subprocess

import pr_status
from pr_status import PrState, extract_prs, fetch, render, summarize_checks


def test_extract_prs_reads_only_the_section():
    text = "# Active work\n- thing #1\n\n# Working agreements\n- other #2\n"
    assert extract_prs(text) == [1]


def test_extract_prs_dedupes_in_order():
    text = "# Active work\n- a #5 b #3\n- c #5\n"
    assert extract_prs(text) == [5, 3]


def test_summarize_checks():
    ok = {"conclusion": "SUCCESS", "status": "COMPLETED"}
    running = {"conclusion": "", "status": "IN_PROGRESS"}
    bad = {"conclusion": "FAILURE", "status": "COMPLETED"}
    assert summarize_checks([]) == "none"
    assert summarize_checks([ok, ok]) == "pass"
    assert summarize_checks([ok, running]) == "pending"
    assert summarize_checks([ok, running, bad]) == "fail"


def _done(stdout, code=0):
    return subprocess.CompletedProcess([], code, stdout=stdout, stderr="")


def test_fetch_parses_gh_json(monkeypatch):
    view = {
        "number": 814,
        "title": "LABS-865: audit events",
        "state": "OPEN",
        "isDraft": True,
        "headRefOid": "7475b1b1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "baseRefName": "main",
        "headRefName": "labs-865-3",
        "statusCheckRollup": [{"conclusion": "SUCCESS", "status": "COMPLETED"}],
    }
    # Call order: gh pr view, then gh api compare.
    canned = [_done(json.dumps(view)), _done("2\n")]
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return canned[len(calls) - 1]

    monkeypatch.setattr(subprocess, "run", fake_run)
    assert fetch(814, repo="acme/app") == PrState(
        number=814,
        title="LABS-865: audit events",
        state="OPEN",
        draft=True,
        behind_by=2,
        head="7475b1b1",
        checks="pass",
    )
    assert calls[0][:3] == ["gh", "pr", "view"]
    assert "repos/acme/app/compare/main...7475b1b1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" in calls[1]


def test_fetch_merged_pr_skips_compare(monkeypatch):
    view = {
        "number": 7,
        "title": "t",
        "state": "MERGED",
        "isDraft": False,
        "headRefOid": "abcdef0123456789",
        "baseRefName": "main",
        "headRefName": "x",
        "statusCheckRollup": [],
    }
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        return _done(json.dumps(view))

    monkeypatch.setattr(subprocess, "run", fake_run)
    state = fetch(7, repo="acme/app")
    assert state is not None and state.behind_by is None
    assert len(calls) == 1


def test_fetch_failure_returns_none(monkeypatch):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: _done("", code=1))
    assert fetch(9, repo="acme/app") is None


def test_render_unknown():
    assert render([(9, None)]) == "#9 unknown (gh failed)"


def test_render_row():
    state = PrState(814, "Audit events", "OPEN", True, 2, "7475b1b1", "pass")
    merged = PrState(5, "Done", "MERGED", False, None, "deadbeef", "none")
    assert render([(814, state), (5, merged)]) == (
        "#814 OPEN draft behind:2 7475b1b1 checks:pass  Audit events\n"
        "#5 MERGED behind:- deadbeef checks:none  Done"
    )


def _mem(tmp_path, body="# Active work\n- #1 and #2\n"):
    mem = tmp_path / "MEMORY.md"
    mem.write_text(body)
    return str(mem)


def test_main_resolves_repo_once(monkeypatch, tmp_path, capsys):
    resolved = []
    seen = []
    monkeypatch.setattr(pr_status, "_resolve_repo", lambda: resolved.append(1) or "acme/app")
    monkeypatch.setattr(pr_status, "fetch", lambda n, repo=None: seen.append((n, repo)))
    assert pr_status.main([_mem(tmp_path)]) == 0
    assert len(resolved) == 1
    assert sorted(seen) == [(1, "acme/app"), (2, "acme/app")]
    assert "#1 unknown (gh failed)" in capsys.readouterr().out


def test_main_repo_flag_skips_resolution(monkeypatch, tmp_path):
    resolved = []
    seen = []
    monkeypatch.setattr(pr_status, "_resolve_repo", lambda: resolved.append(1) or "x/y")
    monkeypatch.setattr(pr_status, "fetch", lambda n, repo=None: seen.append(repo))
    pr_status.main([_mem(tmp_path), "--repo", "me/mine"])
    assert resolved == []
    assert seen == ["me/mine", "me/mine"]


def test_extract_prs_accepts_heading_suffix_but_not_prefix_match():
    text = "# Active work (x)\n- #1\n# Active workflow\n- #2\n# Other\n- #3\n"
    assert extract_prs(text) == [1]


def test_summarize_checks_status_context():
    assert summarize_checks([{"state": "FAILURE"}]) == "fail"
    assert summarize_checks([{"state": "PENDING"}]) == "pending"
    assert summarize_checks([{"state": "SUCCESS"}]) == "pass"


_VIEW = {
    "number": 3,
    "title": "t",
    "state": "OPEN",
    "isDraft": False,
    "headRefOid": "0123456789abcdef",
    "baseRefName": "main",
    "headRefName": "x",
    "statusCheckRollup": [],
}


def test_fetch_compare_failure_keeps_row(monkeypatch):
    for compare in (_done("", code=1), _done("not-a-number\n")):
        canned = [_done(json.dumps(_VIEW)), compare]
        monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: canned.pop(0))
        state = fetch(3, repo="acme/app")
        assert state is not None and state.behind_by is None
        assert state.head == "01234567"


def test_fetch_malformed_json_returns_none(monkeypatch):
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: _done("{not json"))
    assert fetch(3, repo="acme/app") is None
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: _done("{}"))
    assert fetch(3, repo="acme/app") is None


def test_fetch_timeout_and_missing_gh_return_none(monkeypatch):
    def hang(cmd, **kw):
        assert kw["timeout"] == 30
        raise subprocess.TimeoutExpired(cmd, 30)

    monkeypatch.setattr(subprocess, "run", hang)
    assert fetch(3, repo="acme/app") is None

    def missing(cmd, **kw):
        raise FileNotFoundError("gh")

    monkeypatch.setattr(subprocess, "run", missing)
    assert fetch(3, repo="acme/app") is None


def test_gh_failure_prints_first_stderr_line_once(monkeypatch, capsys):
    monkeypatch.setattr(pr_status, "_reported", set())
    err = subprocess.CompletedProcess([], 1, stdout="", stderr="boom: no auth\nsecond line\n")
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: err)
    assert fetch(1, repo="a/b") is None
    assert fetch(2, repo="a/b") is None
    assert capsys.readouterr().err == "gh: boom: no auth\n"


def test_main_isolates_a_bad_pr(monkeypatch, tmp_path, capsys):
    good = lambda n: json.dumps({**_VIEW, "number": n, "title": f"pr{n}", "state": "MERGED"})

    def fake_run(cmd, **kw):
        n = int(cmd[3])
        if n == 2:
            raise subprocess.TimeoutExpired(cmd, 30)
        if n == 3:
            return _done("{broken")
        return _done(good(n))

    monkeypatch.setattr(subprocess, "run", fake_run)
    body = "# Active work\n- #1 #2 #3 #4\n"
    assert pr_status.main([_mem(tmp_path, body), "--repo", "a/b"]) == 0
    lines = capsys.readouterr().out.splitlines()
    assert [l.split()[0] for l in lines] == ["#1", "#2", "#3", "#4"]
    assert lines[1] == "#2 unknown (gh failed)" and lines[2] == "#3 unknown (gh failed)"
    assert lines[0].endswith("pr1") and lines[3].endswith("pr4")


def test_main_preserves_order_when_fetches_finish_out_of_order(monkeypatch, tmp_path, capsys):
    import time

    def slow_first(n, repo=None):
        time.sleep(0.2 if n == 1 else 0)
        return PrState(n, f"pr{n}", "MERGED", False, None, "deadbeef", "none")

    monkeypatch.setattr(pr_status, "fetch", slow_first)
    pr_status.main([_mem(tmp_path, "# Active work\n- #1 #2 #3\n"), "--repo", "a/b"])
    out = capsys.readouterr().out.splitlines()
    assert [l.split()[0] for l in out] == ["#1", "#2", "#3"]
    assert [l.split("  ")[-1] for l in out] == ["pr1", "pr2", "pr3"]


def test_fetch_undecodable_output_returns_none(monkeypatch):
    def bad(cmd, **kw):
        raise UnicodeDecodeError("utf-8", b"\xff", 0, 1, "invalid start byte")

    monkeypatch.setattr(subprocess, "run", bad)
    assert fetch(3, repo="acme/app") is None


def test_fetch_non_dict_check_entry_returns_none(monkeypatch):
    view = {**_VIEW, "statusCheckRollup": ["oops"]}
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: _done(json.dumps(view)))
    assert fetch(3, repo="acme/app") is None


def _no_gh(monkeypatch):
    calls = []
    monkeypatch.setattr(subprocess, "run", lambda *a, **k: calls.append(a))
    return calls


def test_main_missing_section_heading_exits_2(monkeypatch, tmp_path, capsys):
    calls = _no_gh(monkeypatch)
    mem = tmp_path / "MEMORY.md"
    mem.write_text("## Active work\n- #12 and #13\n")
    assert pr_status.main([str(mem)]) == 2
    out = capsys.readouterr()
    assert out.out == ""
    assert out.err == f"pr_status: no '# Active work' heading in {mem} (use --section)\n"
    assert calls == []


def test_main_empty_section_exits_0_without_gh(monkeypatch, tmp_path, capsys):
    calls = _no_gh(monkeypatch)
    mem = tmp_path / "MEMORY.md"
    mem.write_text("# Active work\nnothing open\n\n# Other\n- #9\n")
    assert pr_status.main([str(mem)]) == 0
    out = capsys.readouterr()
    assert (out.out, out.err) == ("", "")
    assert calls == []
