# NestLinker Team Studio

> 一个开源的像素团队工作室：让 AI Agent 和团队成员的任务、位置、KPI、等待状态与日程变得一眼可见。

[![CI](https://github.com/NJforYunman/nestlinker-team-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/NJforYunman/nestlinker-team-studio/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)

![Pixel office map](docs/office-map.png)

NestLinker Team Studio 把抽象的工作流变成一间会动的 2D 办公室。每个职责区有固定负责人，真正执行任务的角色会根据任务位置移动；一个成员并行处理多项任务时会生成分身，等待 Review 或外部输入时会停步，长时间没有更新则会走到休眠区。

## 功能

- 1280×896 九区像素办公室
- 13 种 32×32 像素鸟，每种包含 4 帧待机和 4 帧行走动画
- 固定负责人、当前执行者和跨区支援分离
- 并行任务自动生成角色分身
- 工位巡走、跨区通勤和入睡路径动画
- 忙碌、正常、摸鱼偏高、等待、阻塞和休眠状态
- 成员 KPI、项目指标、任务详情和团队周历
- 可调休眠阈值、时间推进和模拟事件
- 为 Codex MCP、Hooks、GitHub Webhooks 和日历事件预留统一状态层

## 快速开始

需要 Node.js 22+ 和 pnpm。

```bash
git clone https://github.com/NJforYunman/nestlinker-team-studio.git
cd nestlinker-team-studio
pnpm install
pnpm dev
```

打开终端显示的本机地址即可。

## 项目结构

```text
src/components/team-studio/   页面与像素动画
src/lib/team-studio/          成员、任务、活动分和角色实例模型
public/team-studio/           像素鸟与办公室素材
docs/REALTIME_INTEGRATION.md   MCP、Hooks、Webhook 与 SSE 接入建议
tests/                        状态与地图回归测试
```

## 如何接入真实状态

默认页面使用可交互演示数据。正式版本建议统一接入：

```text
Codex MCP / Codex Hooks / GitHub / Calendar
                    ↓
             Team Events API
                    ↓
              SSE / WebSocket
                    ↓
             Pixel Office UI
```

详细事件模型、权限和隐私建议见 [Real-time integration](docs/REALTIME_INTEGRATION.md)。

## 自定义

- 在 `src/lib/team-studio/demo-data.ts` 修改成员、任务、KPI 和日历。
- 在 `TEAM_ZONES` 修改职责区域和负责人。
- 在 `actor-instances.ts` 修改角色座位。
- 替换 `public/team-studio/office/office-map.png` 可使用自己的办公室底图。
- 像素鸟条带遵循 `idle 0–3 / walk 4–7` 帧约定。

![Pixel birds](docs/birds-sheet.png)

## 负责任地使用

活动频率不是绩效。等待用户、等待 Review、等待 CI、会议、休假和外部阻塞都不应被计算为“摸鱼”。请勿把本项目作为员工监控或单一绩效判断工具，也不要采集代码正文、提示词、完整终端输出或私人日历内容。

## Contributing

欢迎提交 Issue 和 Pull Request。参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## License

[MIT](LICENSE) © 2026 NJ_A2A and NestLinker contributors.

---

## English

NestLinker Team Studio is an open-source pixel office for visualizing AI agents and team workflows. It separates role ownership from current execution, creates actor clones for parallel tasks, animates cross-zone movement, and exposes task progress, KPI signals and schedules in one interactive view.

The bundled app runs with demo data. See [Real-time integration](docs/REALTIME_INTEGRATION.md) for a suggested Codex MCP + Hooks + GitHub + SSE architecture.
