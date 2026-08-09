---
tags:
  - kind/project
  - status/active
stage: 04 - Triage
---

# Triage Log

One row per incoming change. The log is append only: a row is never deleted, only closed.
Invented example.

| Raised | Change | Owner | Decision |
|---|---|---|---|
| Week one | Depot swap for two morning runs | Dispatcher | Acted |
| Week one | Ask for a mobile view of the plan | Planning | Deferred, revisit after validation |
| Week two | Driver wants the plan printed again | Dispatcher | Declined, plan changes too often to print |

## Why append only

The value is in the declined and deferred rows. They are the record of what was already
considered, which is what stops the same request arriving twice.

## Links

- [[_example-project/03 - Manual/Procedures/Intake Procedure]]
- [[_example-project/06 - Validation/Acceptance Checklist]]
