# MCP Server 示例

这是一个可直接运行的 Pixel Team Studio MCP Server。默认把脱敏事件追加到 `data/team-events.jsonl`；设置 `TEAM_EVENTS_URL` 后，会把相同事件发送到你的 Team Events API。

```bash
cd examples/mcp-server
pnpm install
pnpm typecheck
pnpm start
```

接入 Codex：

```bash
codex mcp add pixel-team-studio \
  --env TEAM_EVENTS_FILE=/absolute/path/team-events.jsonl \
  -- pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
codex mcp list
```

接入 Claude Code：

```bash
claude mcp add pixel-team-studio --scope project -- \
  pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
```

可用工具为：`team_get_state`、`team_start_task`、`team_update_progress`、`team_report_blocker`、`team_complete_task`。

生产环境使用 `TEAM_EVENTS_URL` 和 `TEAM_EVENTS_TOKEN`，Token 只放部署环境，不要提交到 Git。完整解释见[中文 MCP 接入说明](../../docs/MCP_INTEGRATION.zh-CN.md)。
