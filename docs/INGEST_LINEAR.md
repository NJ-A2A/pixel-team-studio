# Linear-first flow ingestion

This is the reference pipeline for turning Linear workflow history into the studio's append-only flow events. Jira and GitHub Projects adapters should preserve the same three stages and event contract while replacing source-specific discovery and backfill queries.

## Product decision: play first, connect progressively

The office opens immediately with demo or manually dragged birds. Connecting Linear later replaces estimated and no-data skins with measured history without resetting the layout. This preserves the game-like first-run experience while still giving connected teams a useful historical view.

## Schema verification result

The public Linear GraphQL endpoint was introspected on 2026-08-20.

- `WorkflowState.type` exists, but its GraphQL type is `String!`, **not an enum**. Values cannot be safely compiled into business logic from enum introspection.
- Linear's documented workflow categories include Triage, Backlog, Unstarted, Started, Completed, Canceled, and Duplicate.
- `Issue.history` is an `IssueHistoryConnection` with independent pagination.
- `IssueHistory` currently exposes `fromState`, `toState`, `fromAssignee`, `toAssignee`, and `actor`, plus their ID fields.

Treat the category list below as a known baseline, not a closed enum. Every connection must read the workspace's states, validate observed `type` strings, persist the discovered mapping with a verification timestamp, and leave unknown values unmapped for confirmation.

```graphql
query VerifyLinearContract {
  workflowState: __type(name: "WorkflowState") {
    fields { name type { kind name ofType { kind name } } }
  }
  issueHistory: __type(name: "IssueHistory") {
    fields { name type { kind name ofType { kind name } } }
  }
}
```

The default semantic mapping is:

| Observed `WorkflowState.type` | Flow meaning | Event on entry |
|---|---|---|
| `triage`, `backlog` | Outside the measured delivery flow by default | none |
| `unstarted` | Queue folded into the next work room | `arrive` |
| `started` | Active work room | `start` |
| `completed`, `canceled`, `duplicate` | Terminal | `done` |
| Any unknown string | Unmapped | ask for confirmation |

This makes the queue/work split structurally available in Linear. It is still a product interpretation: teams may use a Started-category column as an internal queue, so the post-import interview remains the final authority.

## Authorization and data minimization

- GraphQL endpoint: `https://api.linear.app/graphql`
- Request only the OAuth `read` scope. Do not request `write` or `admin` for ingestion.
- Use PKCE and a CSRF `state` value in the browser authorization flow.
- Store encrypted refresh tokens server-side and support token revocation.

The `read` scope technically permits reading issue content visible to the authorizing principal. The integration therefore must say **"NestLinker queries and stores only status, assignment identifiers, and timestamps"**, not "the token cannot read titles or descriptions." Do not select, log, or persist titles, descriptions, comments, or member names.

## Stage 1: interactive structure discovery

Discovery produces a confirmed flow graph and a layout preview. It is suitable for an interactive connector or MCP tool because the result is small.

```graphql
query Discover($teamId: String!) {
  team(id: $teamId) {
    id
    name
    states { nodes { id name type position } }
    issues(first: 30, orderBy: updatedAt) {
      nodes {
        id
        state { id name type }
        history(first: 50) {
          nodes {
            createdAt
            fromState { id type }
            toState { id type }
            fromAssignee { id }
            toAssignee { id }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }
}
```

1. Persist the observed state IDs, names, positions, and raw `type` strings.
2. Map known categories to queue, work, terminal, or outside-flow semantics; never silently coerce an unknown string.
3. Count observed transitions. Frequent forward edges form the initial spine; reverse edges become rework candidates.
4. Fold queue steps into the doorway pile of the next work step and derive rooms using `layout_derivation` in `office_layouts.json`.
5. Present the flow graph and office preview for confirmation.

## Stage 2: background historical backfill

Large backfills do not pass through an LLM or MCP response. Run them as a background job and return only a job handle.

```graphql
query BackfillIssuePage($teamId: ID!, $after: String, $since: DateTimeOrDuration!) {
  issues(
    filter: { team: { id: { eq: $teamId } }, updatedAt: { gte: $since } }
    first: 50
    after: $after
  ) {
    nodes {
      id
      createdAt
      history(first: 100) {
        nodes {
          id
          createdAt
          fromState { id type }
          toState { id type }
          fromAssignee { id }
          toAssignee { id }
          actor { id }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

Outer issue pagination and inner history pagination are separate. A nested connection cannot be resumed independently for many issues with one shared cursor. When a history connection has another page, queue an issue-specific query:

```graphql
query BackfillIssueHistory($issueId: String!, $after: String!) {
  issue(id: $issueId) {
    history(first: 100, after: $after) {
      nodes {
        id
        createdAt
        fromState { id type }
        toState { id type }
        fromAssignee { id }
        toAssignee { id }
        actor { id }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

Use a 90-day default window, retry per issue, respect rate-limit headers, and use exponential backoff. Linear notes that property changes during the first three minutes after issue creation may not appear in activity history, so synthesize only the initial state event from `createdAt` and mark it `inferred: true`.

### Append-only event contract

```json
{
  "event_id": "sha256(source:history_node_id:event)",
  "task_id": "sha256(workspace_salt:linear_issue_id)",
  "zone": "review",
  "event": "arrive",
  "ts": "2026-08-20T09:14:00+09:00",
  "actor": "sha256(workspace_salt:linear_actor_id)",
  "source": "linear",
  "provenance": "measured",
  "inferred": false
}
```

Never update an event in place. Rebuild current state by folding the event stream. Use `event_id` as the idempotency key so overlapping backfill and webhook windows cannot duplicate events.

| History change | Output |
|---|---|
| Entry into a confirmed queue state | `arrive` for its downstream work zone |
| Entry into a confirmed work state | `start` |
| Entry into a terminal state | `done` |
| Work state back to an earlier queue/work state | `rework` plus the destination's normal entry event |
| Assignee becomes non-null before any observed start | optional inferred `start`, only when the confirmed proxy is enabled |

`block` and `unblock` require an explicit Linear label/status convention, manual office action, or another source signal; do not infer them from inactivity.

## Stage 3: continuous synchronization

Prefer Linear Issue webhooks for near-real-time updates, verify their HMAC signature, enqueue them, and reconcile them through the same mapper used by backfill. Configure the webhook on the OAuth application or have a workspace admin provision it; creating or reading workspace webhooks through the API requires admin authority, so a plain `read` token cannot provision them itself.

Use polling as a degraded mode when webhooks are unavailable. Record its timestamp precision as the poll interval and never present it as event-exact history.

## MCP surface

MCP tools return handles and bounded summaries, never raw event rows. Responses are capped at 8 KB and sample paths at ten.

```text
discover_workflow(source, team_id)
  -> { flow_id, steps[], transitions[], sample_paths[<=10], confidence }
propose_layout(flow_id)
  -> { layout_id, grid, preview_url }
confirm_state_mapping(flow_id, mapping)
  -> { ok, unresolved[] }
start_backfill(flow_id, since, scope)
  -> { job_id }
backfill_status(job_id)
  -> { state, pct, events_imported, left_truncated_count, gaps[] }
get_bottleneck(flow_id)
  -> { zone, area_hours, queue_len, max_wait_h, diagnosis, confidence }
get_flow_efficiency(flow_id, zone?)
  -> { touch_h, wait_h, ratio, censored_n }
replay(flow_id, date)
  -> { job_id }
```

## Three-question confirmation

Ask after import using the team's real state names. Skipped questions use explicit defaults and do not block setup.

1. **Business calendar:** timezone, workdays, working hours, and holiday region. Multi-timezone teams calculate member work intervals locally.
2. **Rework edges:** confirm whether each observed reverse edge is actual rework or a normal iteration.
3. **Started proxy:** ask only when there is one Started-category column whether entry means work began or the task is still waiting. If it is waiting, enable the assignee proxy and label resulting starts as inferred.

## Cold start and provenance

| State | Rendering | Provenance |
|---|---|---|
| Backfill complete | Full measured metrics | `measured` |
| Already queued when connected | `waited >= X` and cracked box | `truncated` |
| Manual/demo baseline | Dashed translucent box | `estimated` |
| No observations for a zone | Gray empty-box outline and `Not connected` | `no_data` |

Missing data must never look like an empty, healthy queue.

## Measurement rules

- Calculate wait and touch time in business hours, not wall-clock hours.
- Include currently waiting tasks as right-censored observations; completed-only averages are biased low.
- Mark tasks already present on connection as left-truncated instead of guessing their arrival time.
- Queue height encodes item count. Box aging encodes the oldest wait. Backlog area is the sum of current wait hours in item-hours.
- Highlight only one current bottleneck after the minimum sample threshold is met.

## Official references

- [Linear GraphQL API and introspection](https://linear.app/developers/graphql)
- [Linear OAuth scopes and PKCE](https://linear.app/developers/oauth-2-0-authentication)
- [Linear workflow categories](https://linear.app/docs/configuring-workflows)
- [Linear webhooks](https://linear.app/developers/webhooks)
- [Linear pagination](https://linear.app/developers/pagination)
