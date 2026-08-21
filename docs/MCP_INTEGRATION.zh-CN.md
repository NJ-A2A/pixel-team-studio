# 通过 MCP 接入 Codex 或 Claude

MCP 是 Agent 面向团队状态的操作层，但不会直接移动鸟。MCP 工具先追加一条语义事件，Team Events API 再把事件折叠成当前状态，通过 SSE 或 WebSocket 推送到办公室；UI 最后根据真实的区域变化生成一次性走廊动画。

```text
Codex / Claude
      │ MCP 工具调用
      ▼
Pixel Team Studio MCP Server
      │ append-only TeamEvent
      ▼
Team Events API ── SSE / WebSocket ──► Pixel Office UI
```

可运行代码在 [`examples/mcp-server`](../examples/mcp-server/README.zh-CN.md)。

## MCP 能介入什么

| 工具 | 权限 | 效果 |
|---|---|---|
| `team_get_state` | 只读 | 返回有数量限制的当前任务和事件 |
| `team_start_task` | 写入 | 追加 `task.started`，新状态到达后鸟才移动 |
| `team_update_progress` | 写入 | 追加进度节点，不覆盖历史 |
| `team_report_blocker` | 写入 | 追加 `agent.blocked`，鸟停在下一环节门口 |
| `team_complete_task` | 写入 | 追加 `task.completed` 并推进流程 |

除非用户已经明确授权持续同步，否则写工具应先请求确认。Hook 可以报告已经发生的工具活动，但必须删除源码、Prompt、文件路径、终端输出和凭据。

## Codex 配置

```bash
codex mcp add pixel-team-studio \
  --env TEAM_EVENTS_FILE=/absolute/path/team-events.jsonl \
  -- pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
codex mcp list
```

等价的 `~/.codex/config.toml`：

```toml
[mcp_servers.pixel_team_studio]
command = "pnpm"
args = ["--dir", "/absolute/path/pixel-team-studio/examples/mcp-server", "start"]
env = { TEAM_EVENTS_FILE = "/absolute/path/team-events.jsonl" }
default_tools_approval_mode = "writes"
```

重启 Codex 后输入 `/mcp` 检查五个工具。`writes` 会允许只读查询，并在改变任务状态前请求确认。

## Claude Code 配置

```bash
claude mcp add pixel-team-studio --scope project -- \
  pnpm --dir /absolute/path/pixel-team-studio/examples/mcp-server start
```

在 Claude Code 中输入 `/mcp` 查看连接。项目级配置会生成 `.mcp.json`，可以提交命令配置，但不要把 Token 写进去。

## 安全介入流程

1. Agent 先用 `team_get_state` 读取任务现状。
2. 执行真实任务，或观察到已确认的外部状态变化。
3. 没有预先授权时，写入前先询问用户。
4. 工具只提交稳定 ID、区域、进度和一段短说明。
5. 后端校验成员、任务权限、进度规则与幂等键。
6. UI 收到折叠后的状态，只为真实区域变化播放一次移动。

示例 Prompt：

```text
先用 team_get_state 检查 DEMO-102。完成测试后，如果通过，先问我，
再把它在 qa 区的进度更新为 80%。不要提交源码或终端输出。
```

## 和 Linear 一起使用

Linear 继续作为任务事实来源。MCP 用来补充 Linear 不擅长表达的上下文，例如“正在等待设计确认”、AI Agent 开始测试，或用户批准的进度节点。

```text
Linear webhook/history ─┐
                       ├─► 统一 append-only 事件 ─► 当前状态 ─► 办公室
MCP task tools ─────────┘
```

必须按来源事件 ID 去重，MCP 不能覆盖时间更新的 Linear 状态。具体例子见 [Linear 示例](LINEAR_EXAMPLES.zh-CN.md)，完整管道见 [Linear 接入规范](INGEST_LINEAR.md)。

官方参考：[OpenAI Codex MCP](https://developers.openai.com/codex/mcp/)、[Anthropic MCP](https://docs.anthropic.com/en/docs/mcp)、[MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/v2/)。
