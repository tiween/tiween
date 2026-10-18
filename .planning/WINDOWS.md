---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-10-18T21:22:34.796Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id  | phase | kind         | file                                                                          | line | description                                                                                                                                                           | status | reason | recorded_at              | resolved_at |
| --- | ----- | ------------ | ----------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ------------------------ | ----------- |
| 1   | 1     | unrun-verify | apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx |      | 01-09 admin UAT (create, publish, AR/EN translate, unpublish in a running admin) not executed: no real browser in the run; request flow proven by jsdom + boot suites | open   |        | 2026-10-18T21:22:34.535Z |             |
| 2   | 1     | deviation    | apps/strapi/src/plugins/events-manager/admin/src/hooks/usePeople.ts           |      | 01-09 found content-manager bodies must be flat; usePeople and SubEventModal still wrap in { data } (server drops it); see deferred-items.md                          | open   |        | 2026-10-18T21:22:34.796Z |             |

```json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "1",
    "file": "apps/strapi/src/plugins/events-manager/admin/src/pages/Works/WorkFormPage.tsx",
    "line": null,
    "description": "01-09 admin UAT (create, publish, AR/EN translate, unpublish in a running admin) not executed: no real browser in the run; request flow proven by jsdom + boot suites",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-18T21:22:34.535Z",
    "resolved_at": null,
    "milestone": "v1.0"
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "1",
    "file": "apps/strapi/src/plugins/events-manager/admin/src/hooks/usePeople.ts",
    "line": null,
    "description": "01-09 found content-manager bodies must be flat; usePeople and SubEventModal still wrap in { data } (server drops it); see deferred-items.md",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-10-18T21:22:34.796Z",
    "resolved_at": null,
    "milestone": "v1.0"
  }
]
```
