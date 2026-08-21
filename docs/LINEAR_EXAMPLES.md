# Linear worked examples

This page uses fictional IDs and members. It is safe to commit and can be run without a Linear token.

## Try the local snapshot

Copy the checked-in example to the ignored local filename:

```bash
cp public/team-studio/linear-snapshot.example.json \
   public/team-studio/linear-snapshot.local.json
pnpm dev
```

Open:

```text
http://localhost:5174/?source=linear
```

The example contains Avery, Mina, and Theo plus four fictional issues. The `.local.json` filename is ignored by Git so a real export cannot be committed accidentally.

## Example workflow mapping

Linear's broad state `type` gives the first semantic split; the actual state name determines the office zone.

| Linear state | `WorkflowState.type` | Studio interpretation | Event |
|---|---|---|---|
| Backlog | `backlog` | upstream queue | optional `arrive` when committed |
| Todo | `unstarted` | doorway queue for the next work room | `arrive` |
| In Progress | `started` | active work room | `start` |
| In Review | `started` | review room after team confirmation | `arrive` then `start` when review begins |
| Done | `completed` | released/complete | `done` |

Do not hard-code an assumed enum. Discover the actual string values and all workspace states when connecting, keep unknown categories as `unmapped`, then ask only the ambiguous workflow questions.

## Transition examples

### Todo → In Progress

```json
{
  "task_id": "DEMO-102",
  "zone": "frontend",
  "event": "start",
  "ts": "2026-08-20T09:10:00Z",
  "source": "linear",
  "source_event_id": "linear-history-1002",
  "actor": "system"
}
```

The bird leaves the Frontend doorway queue, walks once to its seat, and stops in the work pose.

### In Progress → In Review

```json
{
  "task_id": "DEMO-102",
  "zone": "qa",
  "event": "arrive",
  "ts": "2026-08-20T11:40:00Z",
  "source": "linear",
  "source_event_id": "linear-history-1003",
  "actor": "system"
}
```

This starts review-queue waiting. A later assignee or state event can emit `start` when review work truly begins.

### Review → In Progress (rework)

```json
{
  "task_id": "DEMO-102",
  "zone": "frontend",
  "event": "start",
  "direction": "rollback",
  "ts": "2026-08-20T13:05:00Z",
  "source": "linear",
  "source_event_id": "linear-history-1004",
  "actor": "system"
}
```

The UI uses a slower one-shot return movement and a red rollback marker.

### MCP-only blocker detail

Linear may still say “In Progress” while the agent is actually waiting for design confirmation. After user approval, the MCP tool appends a separate event:

```json
{
  "id": "evt_demo_blocked_1",
  "projectId": "demo-launch",
  "memberId": "member-mina",
  "type": "agent.blocked",
  "taskId": "DEMO-102",
  "zoneId": "frontend",
  "summary": "Waiting for design confirmation",
  "occurredAt": "2026-08-20T13:20:00Z",
  "source": "mcp"
}
```

The task remains attached to Linear; the blocker is additional operational context. The bird stops instead of running, and waiting is excluded from low-activity scoring.

## Minimum live pipeline

1. OAuth with least-privilege read access and PKCE.
2. Query teams, workflow states, projects, members, issues, and history.
3. Store source IDs and timestamps; never infer timestamps from a user form.
4. Backfill history, then subscribe to issue webhooks.
5. Normalize changes into append-only `arrive`, `start`, `block`, `unblock`, and `done` events.
6. Fold the event stream into current task state and push it over SSE/WebSocket.
7. Show measured, estimated, left-truncated, and no-data provenance differently.

The exact GraphQL discovery queries, history pagination rules, OAuth notes, censoring rules, and metrics are in [INGEST_LINEAR.md](INGEST_LINEAR.md).
