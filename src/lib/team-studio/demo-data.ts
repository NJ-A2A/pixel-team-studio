import type { ProjectKpi, TeamCalendarEvent, TeamFeedEvent, TeamMember, TeamTask, TeamZone } from './types'

export const TEAM_ZONES: TeamZone[] = [
  { id: 'story', name: '产品与剧情', short: 'STORY', ownerId: 'story', theme: 'pink', x: 16, y: 92, width: 408, height: 252 },
  { id: 'visual', name: '视觉与角色', short: 'VISUAL', ownerId: 'visual', theme: 'yellow', x: 436, y: 92, width: 408, height: 252 },
  { id: 'frontend', name: '前端实现', short: 'FRONTEND', ownerId: 'frontend', theme: 'blue', x: 856, y: 92, width: 408, height: 252 },
  { id: 'backend', name: '状态与数据', short: 'STATE', ownerId: 'backend', theme: 'mint', x: 16, y: 362, width: 408, height: 252 },
  { id: 'lounge', name: '共享休息区', short: 'LOUNGE', ownerId: null, theme: 'white', x: 436, y: 362, width: 408, height: 252 },
  { id: 'qa', name: '试玩与测试', short: 'QA', ownerId: 'qa', theme: 'yellow', x: 856, y: 362, width: 408, height: 252 },
  { id: 'release', name: 'PR 与发布', short: 'RELEASE', ownerId: 'release', theme: 'lavender', x: 16, y: 632, width: 408, height: 252 },
  { id: 'ops', name: '运营与排期', short: 'OPS', ownerId: 'ops', theme: 'coral', x: 436, y: 632, width: 408, height: 252 },
  { id: 'nap', name: '无更新休眠区', short: 'SLEEP', ownerId: null, theme: 'sleep', x: 856, y: 632, width: 408, height: 252 },
]

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'story', name: '剧情 Nesty', role: '产品与剧情负责人', bird: 'crane', species: '丹顶鹤', assignedZone: 'story',
    lastUpdateMinutes: 1, updates30m: 8, updates2h: 24, kpi: 82,
    kpis: [
      { label: '产品流程验收', current: 17, target: 20 },
      { label: '交互分支修复', current: 11, target: 13 },
      { label: '需求条件有效性', current: 8, target: 10 },
    ],
    schedule: [
      { time: '10:00', title: '产品规则锁定' },
      { time: '13:30', title: '跨组流程评审' },
      { time: '16:20', title: '交互文案验收' },
    ],
  },
  {
    id: 'visual', name: '视觉 Nesty', role: '视觉与角色负责人', bird: 'tit', species: '长尾山雀', assignedZone: 'visual',
    lastUpdateMinutes: 16, updates30m: 1, updates2h: 7, kpi: 74,
    kpis: [
      { label: '角色素材完成', current: 13, target: 16 },
      { label: '界面视觉统一', current: 8, target: 12 },
      { label: '分享卡适配', current: 5, target: 6 },
    ],
    schedule: [
      { time: '09:30', title: '鸟角色资产整理' },
      { time: '14:10', title: '结果卡视觉复核' },
      { time: '17:00', title: '移动端素材验收' },
    ],
  },
  {
    id: 'frontend', name: '前端 Nesty', role: '前端实现负责人', bird: 'swift', species: '雨燕', assignedZone: 'frontend',
    lastUpdateMinutes: 0, updates30m: 15, updates2h: 36, kpi: 86,
    kpis: [
      { label: '页面组件', current: 11, target: 12 },
      { label: '交互状态', current: 8, target: 9 },
      { label: '响应式视口', current: 2, target: 3 },
    ],
    schedule: [
      { time: '09:00', title: '2D 地图实现' },
      { time: '12:40', title: '状态接入联调' },
      { time: '15:20', title: '移动端回归修复' },
      { time: '18:00', title: '构建检查' },
    ],
  },
  {
    id: 'backend', name: '状态 Nesty', role: '状态与数据负责人', bird: 'nutcracker', species: '克拉克星鸦', assignedZone: 'backend',
    lastUpdateMinutes: 7, updates30m: 3, updates2h: 12, kpi: 67,
    kpis: [
      { label: '事件映射', current: 18, target: 24 },
      { label: '状态 Schema', current: 7, target: 9 },
      { label: '异常兜底', current: 4, target: 8 },
    ],
    schedule: [
      { time: '09:40', title: 'AgentEvent 归一化' },
      { time: '13:00', title: '任务状态存储' },
      { time: '16:40', title: 'GitHub 事件映射' },
    ],
  },
  {
    id: 'qa', name: 'QA Nesty', role: '测试与验收负责人', bird: 'falcon', species: '游隼', assignedZone: 'qa',
    lastUpdateMinutes: 3, updates30m: 6, updates2h: 18, kpi: 76,
    kpis: [
      { label: '自动化用例', current: 47, target: 52 },
      { label: '关键路径通过', current: 14, target: 16 },
      { label: '视口覆盖', current: 3, target: 3 },
    ],
    schedule: [
      { time: '10:20', title: '关键路径回归' },
      { time: '14:00', title: '三档视口检查' },
      { time: '17:30', title: 'PR 验收报告' },
    ],
  },
  {
    id: 'release', name: 'PR Nesty', role: 'PR 与发布负责人', bird: 'tern', species: '北极燕鸥', assignedZone: 'release',
    lastUpdateMinutes: 28, updates30m: 0, updates2h: 4, kpi: 72, mode: 'waiting',
    kpis: [
      { label: 'PR 检查项', current: 7, target: 10 },
      { label: 'Review 批准', current: 0, target: 1 },
      { label: '发布准备度', current: 72, target: 100 },
    ],
    schedule: [
      { time: '11:00', title: 'Draft PR 整理' },
      { time: '15:00', title: '等待 Review' },
      { time: '18:30', title: '合并与部署窗口' },
    ],
  },
  {
    id: 'ops', name: '运营 Nesty', role: '运营与团队排期负责人', bird: 'pigeon', species: '信鸽', assignedZone: 'ops',
    lastUpdateMinutes: 76, updates30m: 0, updates2h: 1, kpi: 49,
    kpis: [
      { label: '团队日历同步', current: 8, target: 12 },
      { label: '外部协调事项', current: 3, target: 6 },
      { label: '周报汇总', current: 1, target: 1 },
    ],
    schedule: [
      { time: '09:20', title: '排期同步' },
      { time: '11:30', title: '外部沟通' },
      { time: '16:00', title: '团队日历更新' },
    ],
  },
]

export const INITIAL_TEAM_TASKS: TeamTask[] = [
  { id: 't-story-1', title: '整理产品流程与关键交互分支', short: '产品流程校准', assigneeId: 'story', zoneId: 'story', progress: 84, status: 'working', lastUpdateMinutes: 1, due: '今天 16:20' },
  { id: 't-visual-1', title: '统一结果卡、工作室与鸟角色视觉', short: '鸟角色视觉统一', assigneeId: 'visual', zoneId: 'visual', progress: 72, status: 'working', lastUpdateMinutes: 16, due: '今天 17:00' },
  { id: 't-front-1', title: '实现 2D 办公室地图与成员点击交互', short: '2D 地图交互', assigneeId: 'frontend', zoneId: 'frontend', progress: 91, status: 'working', lastUpdateMinutes: 0, due: '今天 15:20' },
  { id: 't-front-2', title: '接入成员更新频率与休眠状态计算', short: '状态计算接入', assigneeId: 'frontend', zoneId: 'backend', progress: 69, status: 'working', lastUpdateMinutes: 2, due: '今天 17:10' },
  { id: 't-front-3', title: '修复 375px 横向地图与抽屉交互', short: '移动端修复', assigneeId: 'frontend', zoneId: 'qa', progress: 63, status: 'working', lastUpdateMinutes: 4, due: '今天 18:00' },
  { id: 't-back-1', title: '定义 AgentEvent 到团队状态的归一化模型', short: 'AgentEvent 映射', assigneeId: 'backend', zoneId: 'backend', progress: 62, status: 'working', lastUpdateMinutes: 7, due: '今天 16:40' },
  { id: 't-qa-1', title: '回归 375 / 768 / 1440 三档视口', short: '三档视口回归', assigneeId: 'qa', zoneId: 'qa', progress: 68, status: 'working', lastUpdateMinutes: 3, due: '今天 17:30' },
  { id: 't-qa-2', title: '复核 Draft PR #15 的关键路径和阻断项', short: 'PR 关键路径复核', assigneeId: 'qa', zoneId: 'release', progress: 54, status: 'reviewing', lastUpdateMinutes: 6, due: '今天 18:10' },
  { id: 't-release-1', title: '等待 Draft PR #15 审查与 CI 结果', short: '等待 PR Review', assigneeId: 'release', zoneId: 'release', progress: 70, status: 'waiting', lastUpdateMinutes: 28, due: '等待外部事件', note: '等待审查，不计入摸鱼' },
  { id: 't-ops-1', title: '整理团队日历与外部协调节点', short: '团队排期同步', assigneeId: 'ops', zoneId: 'ops', progress: 44, status: 'paused', lastUpdateMinutes: 76, due: '今天 16:00' },
]

export const PROJECT_KPIS: ProjectKpi[] = [
  { label: '工作室核心交互', current: 8, target: 10, description: '地图、角色、分身、负责人、KPI、日历、休眠和状态模拟' },
  { label: '真实状态接入准备', current: 4, target: 8, description: '事件模型、Webhook、持久化、SSE、权限隔离、脱敏、错误恢复、监控' },
  { label: '团队工作室回归', current: 47, target: 52, description: '当前演示数据；正式接入后读取 CI 与测试报告' },
  { label: 'PR 发布关卡', current: 4, target: 6, description: '需求、视觉、实现已完成；测试与联调进行中' },
]

export const TEAM_CALENDAR_EVENTS: TeamCalendarEvent[] = [
  { id: 'cal-1', day: 0, time: '09:00–10:30', title: '2D 工作室地图实现', memberIds: ['frontend'], zoneId: 'frontend' },
  { id: 'cal-2', day: 0, time: '10:00–11:10', title: '产品规则锁定', memberIds: ['story'], zoneId: 'story' },
  { id: 'cal-3', day: 0, time: '14:10–15:00', title: '鸟角色视觉复核', memberIds: ['visual'], zoneId: 'visual' },
  { id: 'cal-4', day: 1, time: '09:40–11:20', title: 'AgentEvent 归一化', memberIds: ['backend', 'frontend'], zoneId: 'backend' },
  { id: 'cal-5', day: 1, time: '13:30–14:20', title: '跨组流程评审', memberIds: ['story', 'visual', 'frontend'], zoneId: 'story' },
  { id: 'cal-6', day: 1, time: '15:00–16:00', title: 'Draft PR 整理', memberIds: ['release', 'qa'], zoneId: 'release' },
  { id: 'cal-7', day: 2, time: '10:20–11:30', title: '关键路径回归', memberIds: ['qa'], zoneId: 'qa' },
  { id: 'cal-8', day: 2, time: '12:40–14:00', title: '状态接入联调', memberIds: ['frontend', 'backend'], zoneId: 'backend' },
  { id: 'cal-9', day: 2, time: '16:00–16:40', title: '团队日历更新', memberIds: ['ops'], zoneId: 'ops' },
  { id: 'cal-10', day: 3, time: '09:30–10:30', title: '分享卡视觉适配', memberIds: ['visual'], zoneId: 'visual' },
  { id: 'cal-11', day: 3, time: '14:00–15:30', title: '三档视口检查', memberIds: ['qa', 'frontend'], zoneId: 'qa' },
  { id: 'cal-12', day: 3, time: '16:40–17:30', title: 'GitHub 事件映射', memberIds: ['backend', 'release'], zoneId: 'backend' },
  { id: 'cal-13', day: 4, time: '10:30–11:10', title: '发布前产品验收', memberIds: ['story', 'qa'], zoneId: 'story' },
  { id: 'cal-14', day: 4, time: '15:00–16:00', title: 'PR Review 窗口', memberIds: ['release', 'qa'], zoneId: 'release' },
  { id: 'cal-15', day: 4, time: '18:30–19:00', title: '合并与部署窗口', memberIds: ['release', 'frontend', 'backend'], zoneId: 'release' },
]

export const INITIAL_TEAM_FEED: TeamFeedEvent[] = [
  { id: 'feed-1', minutes: 0, text: '前端 Nesty 更新了 2D 地图交互与 KPI 抽屉。' },
  { id: 'feed-2', minutes: 3, text: 'QA Nesty 完成 375px 视口检查，记录 2 个待修项。' },
  { id: 'feed-3', minutes: 7, text: '状态 Nesty 更新 AgentEvent 映射规则。' },
  { id: 'feed-4', minutes: 16, text: '视觉 Nesty 上传鸟角色视觉修订。' },
  { id: 'feed-5', minutes: 28, text: 'PR Nesty 进入等待 Review 状态，不计入摸鱼。' },
  { id: 'feed-6', minutes: 76, text: '运营 Nesty 长时间无更新，已进入休眠区。' },
]

export const TEAM_DAY_NAMES = ['周一', '周二', '周三', '周四', '周五']

export const birdAvatar = (bird: string) => `/team-studio/pixel-birds/${bird}.png`
