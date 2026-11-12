Audit the review in this brief. Read the code at <head commit> in <cold tree> before ruling on any entry; a plausible argument is not evidence.

F (kept): CONFIRMED, PARTLY RIGHT or REFUTED. Then the severity: STANDS, RAISE to <level> or LOWER to <level>, on the scale given. Then the proposed fix: does it close the hole without opening another? Name a better fix if there is one. Try fixes only in <scratch dir>.

D (dismissed): STAYS DISMISSED, or REVIVED at <level>.

NEW: anything every earlier reviewer missed, in the F format. Start from the "Not probed" lists at the end of the brief before searching cold.

An entry tagged unverified is yours to settle: run a repro in <scratch dir> and report what printed. That lifts or confirms its cap. An entry backed by a break no test caught is evidence, not opinion: to lower it, name the test that catches the break.

Cite file:line for every verdict, or the command you ran and what it printed. Do not modify <cold tree>.
