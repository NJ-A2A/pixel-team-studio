# Real-time integration

当前仓库默认使用演示数据。正式接入时，建议让地图只消费统一的团队状态，不直接解析不同 Agent、Git 平台或日历的原始日志。

## 数据流

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

## 推荐事件

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

示例：

```json
{
  "id": "evt_01",
  "projectId": "nestlinker",
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

MCP 负责有语义的任务更新，建议提供：

- `team_start_task`
- `team_update_progress`
- `team_report_blocker`
- `team_complete_task`
- `team_get_my_tasks`

## Codex Hooks

Hooks 负责自动捕获真实动作：

- `SessionStart`：成员上线。
- `PostToolUse`：根据文件修改、命令、测试和 MCP 调用生成活动事件。
- `Stop` / `SessionEnd`：进入等待或离线。

上报 Hook 应异步运行，并对命令参数、输出和路径做脱敏。

## 区域映射

| 事件 | 默认区域 |
|---|---|
| `agent.reading` | 产品与剧情 / 当前任务区 |
| `agent.editing` | 前端实现或视觉与角色 |
| `agent.testing` | 试玩与测试 |
| `pull_request.reviewed` | PR 与发布 |
| `calendar.updated` | 运营与排期 |
| `agent.waiting` | 原地停步 |
| 长时间无事件 | 无更新休眠区 |

显式任务 `zoneId` 的优先级应高于自动推断。

## 权限与隐私

- 每个成员使用独立身份和作用域令牌。
- 普通成员只允许更新自己的任务状态。
- 管理者可以读取团队聚合状态。
- 不上传代码、提示词、终端完整输出、密钥和精确位置。
- “摸鱼指数”只能作为演示活动信号，不能作为单一绩效依据。
