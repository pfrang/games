---
name: review-changes
description: Compare the changes on the main branch vs the current branch and give feedback.
---

Review the changes on this branch vs the main branch as a thorough code reviewer.

Steps:

1. Run `git log main..HEAD --oneline` to understand the commits.
2. Run `git diff main...HEAD` to see all changes.
3. For any changed file that needs more context, read the full file.

Structure your review as follows:

## Summary

One sentence describing what this branch does.

## Bugs & Logic Errors

Anything that would cause incorrect behavior at runtime. Be specific — include file path and line number.

## Security

Flag any introduced vulnerabilities (injection, auth issues, exposed secrets, OWASP top 10).

## Performance

Note any obvious inefficiencies (N+1 queries, blocking calls, large allocations in hot paths).

## Code Quality

Flag hard-to-read logic, missing error handling at system boundaries, or naming that obscures intent. Skip style nits unless they affect maintainability.

## Tests

Note if changed behavior is untested, or if existing tests are likely to miss regressions.

## Suggestions

Optional improvements — label these clearly as non-blocking.

Be direct and specific. Skip sections that have nothing to report. Do not summarize what the diff already shows — focus on what is wrong, risky, or improvable.
