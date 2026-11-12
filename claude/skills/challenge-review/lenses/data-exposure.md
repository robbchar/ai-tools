LENS: data exposure.

Your question: what does the changed code store, log or send, where does each value come from, and can sensitive data reach it?

Work through these steps before you conclude:

1. List every sink in the changed code: storage keys and bodies, database rows, log lines, metric names and labels, error messages, URLs and query strings, browser storage, analytics events, and anything sent outside the process.
2. For each sink, trace every value it writes back to its source: a constant, a generated id, a validated input, or a caller-supplied value. Follow the trace through helpers the diff calls, even when they aren't in the diff.
3. For each caller-supplied value, find the validation it passes through and work out exactly what it accepts. Is it an allowlist or a denylist? What happens to a field or type it has no rule for? Does it run before the first write?
4. Decide, for each sink, whether personal, health, financial or secret values can reach it, judged against the project's own data rules and the sink's retention. Anything written to an append-only or immutable store can't be redacted later.
5. Check the reverse direction too: sensitive values read back and then logged, put in an error, rendered, or returned to a caller.
