# Linear 脱敏示例

本页只使用虚构 ID 和成员，不需要 Linear Token，可以安全提交。

## 本地查看效果

```bash
cp public/team-studio/linear-snapshot.example.json \
   public/team-studio/linear-snapshot.local.json
pnpm dev
```

然后打开：

```text
http://localhost:5174/?source=linear
```

示例包含虚构成员 Avery、Mina、Theo 和四个任务。`.local.json` 已被 Git 忽略，真实导出不会被意外提交。

## 工作流映射

| Linear 状态 | `WorkflowState.type` | 办公室含义 | 事件 |
|---|---|---|---|
| Backlog | `backlog` | 上游池 | 确认投入后可记 `arrive` |
| Todo | `unstarted` | 下一工作区门口队列 | `arrive` |
| In Progress | `started` | 正在作业 | `start` |
| In Review | `started` | 团队确认后的评审环节 | 到达时 `arrive`，开始评审时 `start` |
| Done | `completed` | 已完成 | `done` |

连接时应发现工作区真实状态和值，未知分类保留为 `unmapped`，不要把猜测的枚举硬编码进业务逻辑。

## 三种真实流转

`Todo → In Progress` 会生成 `start`：鸟从门口队列走到工作位，然后停下工作。

`In Progress → In Review` 会在 QA/评审区生成 `arrive`：从这个时间点开始计算等待。

`In Review → In Progress` 是返工：UI 播放更慢的一次性回流，并显示红色回退标记。

Linear 仍显示 In Progress、但实际在等设计确认时，可以在用户授权后由 MCP 追加：

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

这不会改变 Linear 的任务归属，只补充操作上下文。鸟会停住，等待也不会被算成低活动。

完整 GraphQL 查询、历史分页、OAuth、删失和指标规则见 [INGEST_LINEAR.md](INGEST_LINEAR.md)。
