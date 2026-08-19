# Contributing

欢迎为 NestLinker Team Studio 提交改进。请保持变更小而清晰，并说明它解决的具体问题。

## 本地开发

```bash
pnpm install
pnpm dev
```

提交前请运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Pull Request

- 一个 PR 聚焦一个主题。
- UI 改动请附截图或短视频。
- 状态算法改动请补充测试。
- 新数据适配器不得上传源代码、终端完整输出、密钥或私人日历内容。

## 设计原则

- 地图位置必须来自任务或活动事件，不能随机伪造工作状态。
- 等待用户、等待 Review、CI 和外部阻塞不计为“摸鱼”。
- KPI 应来自可验证的任务、测试和交付条件，不以在线时长代替产出。
- 默认只传递最少状态数据，避免收集提示词、代码内容和敏感日志。
