# Connect Codex or Claude through MCP

MCP is the agent-facing control surface. It does not move birds directly. An MCP tool appends a semantic team event; the Team Events API folds that event into current state; SSE or WebSocket pushes the new state to the office; the UI then derives the bird's room and one-shot corridor movement.

```text
Codex / Claude
      │ MCP tool call
      ▼
Pixel Team Studio MCP server
      │ append-only TeamEvent
      ▼
Team Events API ── SSE / WebSocket ──► Pixel Office UI
```

This separation keeps presentation state out of Linear and prevents an agent animation from being mistaken for work evidence.

## What the agent can do

| Tool | Kind | Effect |
|---|---|---|
| `team_get_state` | read | Return a bounded view of current tasks/events |
| `team_start_task` | write | Append `task.started` and move the bird after the new state arrives |
| `team_update_progress` | write | Append a progress checkpoint without overwriting history |
| `team_report_blocker` | write | Append `agent.blocked`; the bird stops at the next doorway |
| `team_complete_task` | write | Append `task.completed` and advance the workflow |

Write tools should require approval unless the user explicitly asked the agent to keep a task updated. A hook may report observable tool activity, but it must redact source code, prompts, file paths, terminal output, and credentials.

The runnable implementation is in [`examples/mcp-server`](../examples/mcp-server/README.md).

## Codex setup

Codex CLI, the IDE extension, and the Codex desktop app share the MCP configuration in `~/.codex/config.toml`. Register the local stdio example with:

```bash
codex mcp add pixel-team-studio \
  --env TEAM_EVENTS_FILE=/absolute/path/team-events.jsonl \
  -- pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
codex mcp list
```

Or configure it directly:

```toml
[mcp_servers.pixel_team_studio]
command = "pnpm"
args = ["--dir", "/absolute/path/pixel-team-studio/examples/mcp-server", "start"]
env = { TEAM_EVENTS_FILE = "/absolute/path/team-events.jsonl" }
default_tools_approval_mode = "writes"
```

Restart Codex and use `/mcp` to verify the tools. For a shared remote server, use `url` instead of `command` and keep bearer tokens in an environment variable.

## Claude Code setup

```bash
claude mcp add pixel-team-studio --scope project -- \
  pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
```

Use `/mcp` to inspect the connection. Project scope creates `.mcp.json`, which is useful for sharing a server command with a team; do not commit access tokens.

## Safe intervention pattern

1. The agent calls `team_get_state` before acting.
2. It performs the real task or observes a confirmed external transition.
3. It asks before a write unless the session already grants that authority.
4. The write tool appends an event with stable IDs, a zone, progress, and at most a short summary.
5. The backend validates membership, task ownership, monotonic progress rules, and event idempotency.
6. The UI receives the folded state and animates only genuine zone changes.

Example prompt:

```text
Check DEMO-102 with team_get_state. Run the requested checks. If they pass, ask me
before recording 80% progress in qa. Never include source code or terminal output.
```

## Linear plus MCP

Linear remains the task-system source of truth. MCP is useful for information Linear does not naturally contain, such as “waiting for design confirmation,” an AI agent starting a test run, or an approved progress checkpoint.

```text
Linear webhook/history ─┐
                       ├─► normalized append-only events ─► current state ─► office
MCP task tools ─────────┘
```

Deduplicate by source event ID. Never let MCP overwrite a newer Linear transition. See [Linear worked examples](LINEAR_EXAMPLES.md) and the complete [Linear ingestion contract](INGEST_LINEAR.md).

## Production checklist

- Authenticate every workspace and member independently.
- Authorize writes by project, task, and actor—not just by server connection.
- Use an idempotency key for retries.
- Preserve the append-only event log and derive current state from it.
- Keep secrets in deployment environment variables.
- Return bounded summaries from read tools.
- Treat activity as operational context, never as a standalone performance score.

References: [OpenAI Codex MCP](https://developers.openai.com/codex/mcp/), [Anthropic MCP](https://docs.anthropic.com/en/docs/mcp), and [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/).
