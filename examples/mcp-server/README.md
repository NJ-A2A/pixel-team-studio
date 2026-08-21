# MCP server example

This is a small, runnable MCP server for Pixel Team Studio. It exposes one read tool and four append-only write tools. By default it writes sanitized events to `data/team-events.jsonl`; set `TEAM_EVENTS_URL` to send the same events to your Team Events API.

It intentionally accepts stable IDs, progress, zone, and a short summary only. Do not send source code, prompts, terminal output, secrets, or private calendar details.

## Run it

```bash
cd examples/mcp-server
pnpm install
pnpm typecheck
pnpm start
```

To inspect the protocol during development:

```bash
npx @modelcontextprotocol/inspector pnpm start
```

## Add it to Codex

Replace both absolute paths before running this command:

```bash
codex mcp add pixel-team-studio \
  --env TEAM_EVENTS_FILE=/absolute/path/team-events.jsonl \
  -- pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
codex mcp list
```

The equivalent `~/.codex/config.toml` entry is:

```toml
[mcp_servers.pixel_team_studio]
command = "pnpm"
args = ["--dir", "/absolute/path/pixel-team-studio/examples/mcp-server", "start"]
env = { TEAM_EVENTS_FILE = "/absolute/path/team-events.jsonl" }
default_tools_approval_mode = "writes"
```

`writes` lets read-only state checks run while asking before a task-state mutation. Restart Codex, open `/mcp`, and confirm that the five tools appear.

## Add it to Claude Code

```bash
claude mcp add pixel-team-studio --scope project -- \
  pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
```

Run `/mcp` in Claude Code to inspect the connection. Project scope writes `.mcp.json`; never place a secret token directly in that committed file.

## Try it

Ask the agent:

```text
Use team_get_state to check task DEMO-12. If I confirm the implementation is complete,
record 80% progress in the qa zone with the summary "Responsive checks passed".
```

For a real dashboard, set:

```bash
TEAM_EVENTS_URL=https://your-domain.example/api/team-events
TEAM_EVENTS_TOKEN=replace-at-deploy-time
```

Keep `TEAM_EVENTS_TOKEN` in the host environment, never in Git.
