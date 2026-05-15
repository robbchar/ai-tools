# test_smart_approve.py
from smart_approver import decide, decompose_command

def test_git_dash_C_normalizes():
    settings = {"permissions": {"allow": ["Bash(git status:*)"], "deny": []}}
    decision, _ = decide("git -C /some/path status", settings)
    assert decision == "allow"
    
def test_git_amp_amp_normalizes():
    settings = {"permissions": {"allow": ["Bash(cd:*)","Bash(git switch:*)"], "deny": []}}
    decision, _ = decide("cd /some/path && git switch main", settings)
    assert decision == "allow"