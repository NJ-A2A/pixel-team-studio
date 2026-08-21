# Real-time integration

The repository uses interactive demo data by default. In production, the map should consume one normalized team state instead of parsing raw logs from individual agents, Git providers, or calendars.

## Data flow

```text
Codex MCP / Codex Hooks / GitHub Webhooks / Calendar
                         ↓
                POST /api/team-events
                         ↓
                 normalize + persist
                         ↓
                    SSE / WebSocket
                         ↓
                    Team Studio UI
```

## Recommended event model

```ts
type TeamEvent = {
  id: string
  projectId: string
  memberId: string
  type:
    | 'task.started'
    | 'task.progressed'
    | 'task.completed'
    | 'agent.reading'
    | 'agent.editing'
    | 'agent.testing'
    | 'agent.waiting'
    | 'agent.blocked'
    | 'git.commit.created'
    | 'pull_request.reviewed'
    | 'ci.completed'
    | 'calendar.updated'
  taskId?: string
  zoneId?: string
  progress?: number
  summary?: string
  occurredAt: string
}
```

Example:

```json
{
  "id": "evt_01",
  "projectId": "pixel-team-studio",
  "memberId": "frontend",
  "type": "agent.testing",
  "taskId": "team-studio-realtime",
  "zoneId": "qa",
  "progress": 72,
  "summary": "Running responsive regression",
  "occurredAt": "2026-08-20T01:00:00Z"
}
```

## Codex MCP

Use MCP for intentional, semantic task updates. A minimal server can expose:

- `team_start_task`
- `team_update_progress`
- `team_report_blocker`
- `team_complete_task`
- `team_get_my_tasks`

For commands, approval boundaries, a runnable TypeScript server, Claude Code setup, and a Linear + MCP example, see [MCP integration](MCP_INTEGRATION.md).

## Codex Hooks

Use Hooks to capture real actions automatically:

- `SessionStart`: mark a member or agent online.
- `PostToolUse`: generate activity events from file changes, commands, tests, and MCP calls.
- `Stop` / `SessionEnd`: enter a waiting or offline state.

Reporting hooks should run asynchronously and redact command arguments, outputs, and file paths.

## Zone mapping

| Event | Default zone |
|---|---|
| `agent.reading` | Story or the task's current zone |
| `agent.editing` | Frontend or Visual |
| `agent.testing` | QA |
| `pull_request.reviewed` | Release |
| `calendar.updated` | Operations |
| `agent.waiting` | Stay in place |
| No events beyond the threshold | Dormant zone |

An explicit `task.zoneId` always takes priority over inferred placement.

## Configurable floor layouts

Physical room placement is presentation state and must not be written back to task records. `task.zoneId` remains bound to a logical department while the floor layout is stored separately:

```json
{
  "version": 1,
  "rows": 2,
  "columns": 4,
  "slots": ["story", "visual", "frontend", "backend", "qa", "release", "ops", "lounge"],
  "unplacedZoneIds": ["nap"]
}
```

The demo stores a versioned layout in the browser. A multi-user version can save it as a workspace setting and broadcast `studio.layout.updated` over SSE or WebSocket. Administrators should control shared layouts while individual members may keep private views.

## Workflow-position state machine

Layouts with `model: "state"` treat position as state, not ambient animation:

```text
settled -- zone diff --> transit -- animationend --> settled
   │                         │
   └── no diff: no move      └── busy/slack scoring frozen
```

- Every tick compares the previous and next `zoneId` by `actor_instance_id`. No zone change means no positional animation.
- The transit route is deterministic: seat → exit doorway → corridor → entry doorway → new seat. It does not run A*.
- When `task.status = blocked`, the actor stops at the target-zone entrance, faces the next zone, and displays BLOCK. No transit event is created.
- When the new workflow index is lower than the previous index, the move is a rollback: it uses a slower one-shot animation and a red return marker.
- Busy and slack scoring is frozen during transit and resumes only after `animationend` commits the settled state.

Doorway coordinates, workflow order, and presentation parameters live in `public/team-studio/office/office_layouts.json` under `state_runtime`. The server sends real task events only; transit is a temporary UI state derived from the previous and next snapshots and should not be persisted as employee activity.

## Permissions and privacy

- Give every member an independent identity and scoped token.
- Regular members may update only their own task states.
- Managers may read aggregated team state.
- Never upload source code, prompts, complete terminal output, secrets, or precise physical locations.
- Treat the demo “slack score” as an illustrative activity signal, never as a standalone performance metric.
