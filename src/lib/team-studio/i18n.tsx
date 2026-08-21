import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type StudioLocale = 'zh' | 'ko' | 'en'

const STORAGE_KEY = 'pixel-team-studio:locale:v1'

const en = {
  'language.label': 'Language',
  'language.zh': '中文',
  'language.ko': '한국어',
  'language.en': 'English',
  'nav.studio': 'Studio map',
  'nav.kpi': 'KPI',
  'nav.calendar': 'Team calendar',
  'action.refresh': 'Refresh snapshot',
  'action.reload': 'Reload Linear snapshot',
  'action.backDemo': 'Back to demo',
  'action.edit': 'Edit room layout',
  'action.closeEdit': 'Close room editor',
  'action.birds': 'Choose team birds',
  'action.widget': 'Open floating office',
  'action.progress': 'Member progress',
  'action.retry': 'Retry',
  'action.advance': 'Advance 15 minutes',
  'action.simulate': 'Simulate update',
  'action.useLinear': 'Use Linear snapshot',
  'action.loadingLinear': 'Loading Linear…',
  'action.retryLinear': 'Retry Linear snapshot',
  'action.resetDemo': 'Reset demo',
  'hero.eyebrow': 'LINEAR READ-ONLY SNAPSHOT · REAL TEAM STATE',
  'hero.titleA': 'See who is doing what,',
  'hero.titleB': 'at a glance.',
  'hero.linear': 'Connected to {team}: current issue states drive bird positions, doorway queues, member progress, project metrics, and due-date calendar entries. Historical arrival times are not available through this snapshot, so queue age is marked left-truncated.',
  'hero.seoul': 'SEOUL STUDIO',
  'hero.loaded': 'snapshot loaded',
  'hero.demoEyebrow': 'ADAPTIVE TEAM OPERATING SCENE · V3',
  'hero.demoTitleA': 'See who is doing what,',
  'hero.demoTitleB': 'at a glance.',
  'hero.demoDescription': 'Choose a grid and arrange rooms around your delivery flow. Tasks, KPIs, and member states stay bound to their logical departments while the map remains fully configurable.',
  'hero.demoTime': 'demo +{minutes}m',
  'studio.title': 'Configurable 2D Team Studio',
  'studio.linear': 'Real Linear current state · one bird per person · active task shares rotate that bird through every office where they work.',
  'studio.layout': 'Layout {rows}×{columns} · {placed} placed · {unplaced} unplaced · {actors} actors · {rotating} rotating',
  'studio.rapid': 'Rapid updates',
  'studio.steady': 'Steady progress',
  'studio.low': 'Low activity',
  'studio.waiting': 'Waiting or blocked',
  'studio.asleep': 'Asleep',
  'studio.demoDescription': 'Choose a grid and reorder rooms. Outside edit mode, click a character or room for details.',
  'studio.demoLayout': 'Layout {rows}×{columns} · {placed} placed · {unplaced} unplaced · {actors} actors · {rotating} rotating · +{clones} clones',
  'demo.teamPulse': 'Team pulse',
  'demo.teamPulseHelp': 'Sorted by recency and event density',
  'demo.allKpis': 'All KPIs',
  'demo.stateRules': 'State rules',
  'demo.stateRulesHelp': 'Every position has a data source',
  'demo.liveActivity': 'Live activity',
  'demo.calendar': 'Calendar',
  'demo.footer': 'Interactive demo data is active; state scoring, task clones, cross-zone support, and sleep logic are fully functional.',
  'demo.footerState': 'READY FOR CODEX MCP · HOOKS · GITHUB · CALENDAR',
  'linear.workload': 'Linear workload',
  'linear.workloadHelp': 'Current state, not presence or productivity',
  'linear.allKpis': 'All KPIs',
  'linear.activeQueued': '{active} active · {queued} queued · {birds} identity bird(s)',
  'linear.statusProxy': 'status proxy',
  'linear.rules': 'State rules',
  'linear.rulesHelp': 'Every position has a data source',
  'linear.identity': 'Identity',
  'linear.identityRule': 'Exactly one bird per Linear member. Members with active work in multiple offices rotate between them instead of cloning.',
  'linear.timeShare': 'Time share',
  'linear.timeRule': 'Office dwell time follows active task weight. Without estimates, each active Linear issue contributes one equal share.',
  'linear.queuePile': 'Queue pile',
  'linear.queueRule': 'Todo height is the current item count. Cracked boxes mean arrival time is unknown at first connection.',
  'linear.position': 'Position',
  'linear.positionRule': 'In Progress maps to State & Data; In Review maps to QA. Several members in one office are all rendered in separate seats.',
  'linear.kpiProxy': 'KPI proxy',
  'linear.kpiRule': 'Progress is a transparent status-weighted snapshot, not an employee performance score.',
  'linear.activity': 'Linear activity',
  'linear.calendar': 'Calendar',
  'linear.footer': 'Linear current-state snapshot is active; no emails, descriptions, comments, or tokens are stored.',
  'linear.footerState': 'CURRENT STATE · HISTORY/WEBHOOK NOT YET CONNECTED',
  'linear.todo': 'Todo',
  'linear.inProgress': 'In progress',
  'linear.inReview': 'In review',
  'linear.done': 'Done',
  'drawer.member': 'Member details',
  'drawer.zone': 'Zone details',
  'drawer.kpis': 'Team KPIs',
  'drawer.calendar': 'Team calendar',
  'drawer.birds': 'Team bird casting',
  'drawer.memberHelp': 'Linear tasks, transparent status-weighted progress, and due dates',
  'drawer.zoneHelp': 'Fixed owner, current executors, and zone tasks',
  'drawer.kpiHelp': 'Every progress value comes from an explainable task state',
  'drawer.calendarHelp': 'Filter by member; select an event to open its responsibility zone',
  'drawer.meetingHelp': 'Brainstorm inbox, Markdown materials, shared memos, and meeting summaries',
  'drawer.birdsHelp': 'Play a short work-style test or choose any bird manually',
  'meeting.room': 'MEETING ROOM',
  'meeting.shared': 'Shared ideas, materials, and minutes',
  'room.owner': 'Owner · {name}',
  'room.shared': 'Shared facility',
  'room.peopleTasks': '{people} here · {tasks} tasks',
  'room.peopleHere': '{count} PEOPLE HERE',
  'room.queued': '{count} QUEUED',
  'room.arrivalUnknown': 'ARRIVAL UNKNOWN · LEFT-TRUNCATED',
  'room.facility': 'FACILITY',
  'room.sharedArea': 'Shared area',
  'widget.title': 'PIXEL TEAM OFFICE',
  'widget.live': 'live widget',
  'widget.openFull': 'Open full',
  'widget.active': 'active',
  'widget.review': 'review',
  'widget.queued': 'queued',
  'widget.birds': 'birds',
  'widget.running': 'RUNNING',
  'widget.loading': 'Loading Linear…',
  'widget.unavailable': 'Snapshot unavailable',
  'widget.offDesk': 'OFF-DESK',
  'widget.snapshot': 'snapshot',
  'gate.private': 'PRIVATE LINEAR STUDIO',
  'gate.checking': 'Checking team access…',
  'gate.enter': 'Enter your team room',
  'gate.description': 'Linear member names, issue titles, schedules, and workload state are protected. Ask the studio owner for the viewing password.',
  'gate.password': 'Team password',
  'gate.opening': 'Opening…',
  'gate.open': 'Open private studio',
  'gate.wrong': 'The team password is incorrect.',
  'gate.unavailable': 'Sign-in is temporarily unavailable.',
  'gate.unreachable': 'Could not reach the team access service.',
  'gate.footer': 'Protected by an HTTP-only session · Linear data is never included in the public site bundle',
  'layout.editor': 'ROOM LAYOUT EDITOR',
  'layout.size': '{rows} rows × {columns} columns',
  'layout.summary': '{note} · {count} rooms placed · office backgrounds move with their rooms',
  'layout.custom': 'Custom layout',
  'layout.close': 'Close editor',
  'layout.rows': 'Rows',
  'layout.columns': 'Columns',
  'layout.workflow': 'Workflow template',
  'layout.workflowHelp': 'Selecting a workflow immediately reorders the rooms. Tasks and Linear data stay attached to their logical stage.',
  'layout.matrix': 'ROOMS BY ROW / COLUMN',
  'layout.empty': 'Empty room',
  'layout.tasks': '{count} tasks',
  'layout.selected': 'Room selected. Click a destination slot to place or swap it.',
  'layout.select': 'Select a room, then choose its destination.',
  'layout.saved': 'The layout is saved in this browser. Moving rooms never changes tasks or KPIs.',
  'layout.reapply': 'Reapply selected workflow',
  'layout.remove': 'Move off map',
  'layout.restore': 'Restore 3 × 3',
  'layout.unplaced': 'Unplaced rooms · {count}',
  'layout.allPlaced': 'All rooms are placed. Empty slots remain available for swaps.',
  'meeting.memory': 'MEETING ROOM · SHARED MEMORY',
  'meeting.headline': 'Ideas enter as drafts. Decisions leave with context.',
  'meeting.description': 'AI suggestions stay in the inbox until a person sends them to the board. Markdown, memos, references, and meeting summaries are kept together.',
  'meeting.aiInbox': 'AI inbox',
  'meeting.onBoard': 'on board',
  'meeting.materials': 'materials',
  'meeting.summaries': 'summaries',
  'meeting.brainstorm': 'Brainstorm',
  'meeting.minutes': 'Minutes',
  'meeting.ideaInbox': 'AI idea inbox',
  'meeting.reviewRequired': 'Human review required before the board',
  'meeting.sendBoard': 'Send to board',
  'meeting.reviewed': 'All AI suggestions have been reviewed.',
  'meeting.board': 'Brainstorm board',
  'meeting.accepted': '{count} accepted ideas and team memos',
  'meeting.emptyBoard': 'Send an idea here or write a team memo below.',
  'meeting.materialTitle': 'Meeting materials',
  'meeting.materialHelp': 'Markdown is imported as readable text and saved locally.',
  'meeting.import': 'Import .md / .txt',
  'meeting.noMaterials': 'No materials yet.',
  'meeting.summaryTitle': 'Meeting summaries',
  'meeting.summaryHelp': 'Build a reviewable draft from the current board and materials.',
  'meeting.createSummary': 'Create summary draft',
  'meeting.noSummaries': 'No meeting summaries yet.',
  'meeting.post': 'Post to the meeting room',
  'meeting.types': 'Idea · memo · material · minutes',
  'meeting.type': 'Type',
  'meeting.idea': 'Brainstorm idea',
  'meeting.memo': 'Memo',
  'meeting.material': 'Meeting material',
  'meeting.summary': 'Meeting summary',
  'meeting.source': 'Source',
  'meeting.title': 'Title',
  'meeting.titlePlaceholder': 'A clear name for this note',
  'meeting.content': 'Markdown / memo',
  'meeting.contentPlaceholder': '# Context\n\nWrite or paste an idea, memo, meeting document, or summary…',
  'meeting.url': 'Reference URL · optional',
  'meeting.postAction': 'Post to meeting room',
  'meeting.openReference': 'Open reference ↗',
  'meeting.localNote': 'Local-first prototype · agent submissions use the meeting-item event schema. Connect the same schema to the authenticated Team Events API for shared real-time storage.',
  'zone.story': 'Product & Story',
  'zone.visual': 'Visual Design',
  'zone.frontend': 'Frontend',
  'zone.backend': 'State & Data',
  'zone.lounge': 'Break Area',
  'zone.qa': 'Playtest & QA',
  'zone.release': 'PR & Release',
  'zone.ops': 'Operations & Schedule',
  'zone.nap': 'Dormant Zone',
} as const

type TranslationKey = keyof typeof en

const zh: Record<TranslationKey, string> = {
  ...en,
  'language.label': '语言', 'nav.studio': '工作室地图', 'nav.calendar': '团队日历',
  'action.refresh': '刷新快照', 'action.reload': '重新载入 Linear', 'action.backDemo': '返回演示', 'action.edit': '编辑办公室布局', 'action.closeEdit': '关闭布局编辑', 'action.birds': '选择团队鸟形象', 'action.widget': '打开办公室浮窗', 'action.progress': '成员进度', 'action.retry': '重试', 'action.advance': '推进 15 分钟', 'action.simulate': '模拟更新', 'action.useLinear': '使用 Linear 快照', 'action.loadingLinear': '正在载入 Linear…', 'action.retryLinear': '重试 Linear 快照', 'action.resetDemo': '重置演示',
  'hero.eyebrow': 'LINEAR 只读快照 · 真实团队状态', 'hero.titleA': '一眼看清每个人', 'hero.titleB': '正在做什么。', 'hero.linear': '已连接 {team}：当前任务状态会决定鸟的位置、门口队列、成员进度、项目指标和截止日期。当前快照没有历史到达时间，因此队列年龄会标记为左截断。', 'hero.seoul': '首尔工作室', 'hero.loaded': '快照已载入', 'hero.demoEyebrow': '自适应团队运行场景 · V3', 'hero.demoTitleA': '一眼看清每个人', 'hero.demoTitleB': '正在做什么。', 'hero.demoDescription': '选择网格并按照交付流程安排办公室。任务、KPI 和成员状态始终绑定对应部门，地图布局则可以自由调整。', 'hero.demoTime': '演示 +{minutes} 分钟',
  'studio.title': '可配置 2D 团队工作室', 'studio.linear': 'Linear 实时状态 · 每人一只鸟 · 鸟会按照活跃任务占比，在参与工作的办公室之间移动。', 'studio.layout': '布局 {rows}×{columns} · 已放置 {placed} · 未放置 {unplaced} · {actors} 位成员 · {rotating} 位轮转中', 'studio.rapid': '快速更新', 'studio.steady': '稳定推进', 'studio.low': '低活动', 'studio.waiting': '等待或阻塞', 'studio.asleep': '休眠', 'studio.demoDescription': '选择网格并重新排列办公室。退出编辑模式后，点击角色或办公室可查看详情。', 'studio.demoLayout': '布局 {rows}×{columns} · 已放置 {placed} · 未放置 {unplaced} · {actors} 个角色 · {rotating} 位轮转 · +{clones} 个克隆', 'demo.teamPulse': '团队脉搏', 'demo.teamPulseHelp': '按最近更新和事件密度排序', 'demo.allKpis': '全部 KPI', 'demo.stateRules': '状态规则', 'demo.stateRulesHelp': '每个位置都有数据来源', 'demo.liveActivity': '实时动态', 'demo.calendar': '日历', 'demo.footer': '当前使用交互式演示数据；状态评分、任务克隆、跨区支援和休眠逻辑均已启用。', 'demo.footerState': '可接入 CODEX MCP · HOOKS · GITHUB · 日历',
  'linear.workload': 'Linear 工作负载', 'linear.workloadHelp': '展示当前状态，不代表出勤或生产力', 'linear.allKpis': '全部 KPI', 'linear.activeQueued': '{active} 个进行中 · {queued} 个排队 · {birds} 只身份鸟', 'linear.statusProxy': '状态代理值', 'linear.rules': '状态规则', 'linear.rulesHelp': '每个位置都有数据来源', 'linear.identity': '身份', 'linear.identityRule': '每位 Linear 成员只对应一只鸟。若同时参与多个办公室的工作，这只鸟会在办公室间轮转，不会克隆。', 'linear.timeShare': '时间占比', 'linear.timeRule': '鸟在办公室的停留时间按活跃任务权重分配。没有估算值时，每个活跃 Linear 任务权重相同。', 'linear.queuePile': '排队箱堆', 'linear.queueRule': '待办箱堆高度代表当前任务数。裂纹箱表示首次接入时无法得知到达时间。', 'linear.position': '位置', 'linear.positionRule': '进行中映射到状态与数据区，评审中映射到 QA。多人在同一办公室时会分别显示。', 'linear.kpiProxy': 'KPI 代理值', 'linear.kpiRule': '进度是透明的状态加权快照，不是员工绩效评分。', 'linear.activity': 'Linear 动态', 'linear.calendar': '日历', 'linear.footer': '当前正在使用 Linear 状态快照；不会存储邮件、描述、评论或令牌。', 'linear.footerState': '当前状态 · 尚未接入历史 / WEBHOOK', 'linear.todo': '待办', 'linear.inProgress': '进行中', 'linear.inReview': '评审中', 'linear.done': '已完成',
  'drawer.member': '成员详情', 'drawer.zone': '办公室详情', 'drawer.kpis': '团队 KPI', 'drawer.calendar': '团队日历', 'drawer.birds': '团队鸟形象', 'drawer.memberHelp': 'Linear 任务、透明的状态加权进度和截止日期', 'drawer.zoneHelp': '固定负责人、当前执行者和办公室任务', 'drawer.kpiHelp': '每个进度值都来自可解释的任务状态', 'drawer.calendarHelp': '按成员筛选；点击日程可打开对应办公室', 'drawer.meetingHelp': '头脑风暴、Markdown 资料、共享 memo 和会议小结', 'drawer.birdsHelp': '完成简短工作风格测试，或手动选择任意鸟形象',
  'meeting.room': '会议室', 'meeting.shared': '共享想法、资料和会议小结',
  'room.owner': '负责人 · {name}', 'room.shared': '共享空间', 'room.peopleTasks': '{people} 人在这里 · {tasks} 个任务', 'room.peopleHere': '{count} 人在这里', 'room.queued': '{count} 个排队中', 'room.arrivalUnknown': '到达时间未知 · 左截断', 'room.facility': '公共空间', 'room.sharedArea': '共享区域',
  'widget.title': 'PIXEL TEAM 办公室', 'widget.live': '实时浮窗', 'widget.openFull': '打开完整页面', 'widget.active': '进行中', 'widget.review': '评审中', 'widget.queued': '待处理', 'widget.birds': '只鸟', 'widget.running': '移动中', 'widget.loading': '正在载入 Linear…', 'widget.unavailable': '快照暂时不可用', 'widget.offDesk': '暂离工位', 'widget.snapshot': '快照',
  'gate.private': '私有 LINEAR 工作室', 'gate.checking': '正在检查团队访问权限…', 'gate.enter': '进入团队工作室', 'gate.description': 'Linear 成员姓名、任务标题、日程和工作状态均受保护。请向工作室所有者索取访问密码。', 'gate.password': '团队密码', 'gate.opening': '正在进入…', 'gate.open': '打开私有工作室', 'gate.wrong': '团队密码不正确。', 'gate.unavailable': '登录服务暂时不可用。', 'gate.unreachable': '无法连接团队访问服务。', 'gate.footer': '由 HTTP-only 会话保护 · Linear 数据不会进入公开网站包',
  'layout.editor': '办公室布局编辑器', 'layout.size': '{rows} 行 × {columns} 列', 'layout.summary': '{note} · 已放置 {count} 个办公室 · 背景会随办公室一起移动', 'layout.custom': '自定义布局', 'layout.close': '关闭编辑器', 'layout.rows': '行数', 'layout.columns': '列数', 'layout.workflow': '工作流模板', 'layout.workflowHelp': '选择工作流后会立即重排办公室。任务和 Linear 数据仍会绑定到对应逻辑环节。', 'layout.matrix': '按行 / 列分配办公室', 'layout.empty': '空办公室', 'layout.tasks': '{count} 个任务', 'layout.selected': '已选中办公室，请点击目标位置进行放置或交换。', 'layout.select': '先选择办公室，再选择目标位置。', 'layout.saved': '布局会保存在此浏览器中。移动办公室不会改变任务或 KPI。', 'layout.reapply': '重新应用工作流', 'layout.remove': '移出地图', 'layout.restore': '恢复 3 × 3', 'layout.unplaced': '未放置办公室 · {count}', 'layout.allPlaced': '所有办公室均已放置，空位置仍可用于交换。',
  'meeting.memory': '会议室 · 团队共享记忆', 'meeting.headline': '想法先进入草稿，决策带着上下文离开。', 'meeting.description': 'AI 建议先进入收件箱，只有人工确认后才会上墙。Markdown、memo、参考资料和会议小结集中保存。', 'meeting.aiInbox': 'AI 收件箱', 'meeting.onBoard': '已上墙', 'meeting.materials': '会议资料', 'meeting.summaries': '会议小结', 'meeting.brainstorm': '头脑风暴', 'meeting.minutes': '会议小结', 'meeting.ideaInbox': 'AI 想法收件箱', 'meeting.reviewRequired': '上墙前需要人工确认', 'meeting.sendBoard': '发到想法墙', 'meeting.reviewed': '所有 AI 建议都已处理。', 'meeting.board': '头脑风暴墙', 'meeting.accepted': '{count} 条已采纳想法和团队 memo', 'meeting.emptyBoard': '把想法发到这里，或在下方写一条团队 memo。', 'meeting.materialTitle': '会议资料', 'meeting.materialHelp': 'Markdown 会以可读文本导入并保存在本地。', 'meeting.import': '导入 .md / .txt', 'meeting.noMaterials': '还没有会议资料。', 'meeting.summaryTitle': '会议小结', 'meeting.summaryHelp': '根据当前想法墙和资料生成可审核的草稿。', 'meeting.createSummary': '生成小结草稿', 'meeting.noSummaries': '还没有会议小结。', 'meeting.post': '发布到会议室', 'meeting.types': '想法 · memo · 资料 · 小结', 'meeting.type': '类型', 'meeting.idea': '头脑风暴想法', 'meeting.memo': 'Memo', 'meeting.material': '会议资料', 'meeting.summary': '会议小结', 'meeting.source': '来源', 'meeting.title': '标题', 'meeting.titlePlaceholder': '给这条内容起一个清楚的名字', 'meeting.content': 'Markdown / memo', 'meeting.contentPlaceholder': '# 背景\n\n写下或粘贴想法、memo、会议资料或小结…', 'meeting.url': '参考链接 · 可选', 'meeting.postAction': '发布到会议室', 'meeting.openReference': '打开参考链接 ↗', 'meeting.localNote': '本地优先原型 · 智能体提交使用统一的 meeting-item 事件结构。接入已认证的 Team Events API 后即可团队实时共享。',
  'zone.story': '产品与策划', 'zone.visual': '视觉设计', 'zone.frontend': '前端开发', 'zone.backend': '状态与数据', 'zone.lounge': '休息区', 'zone.qa': '试玩与测试', 'zone.release': 'PR 与发布', 'zone.ops': '运营与排期', 'zone.nap': '休眠区',
}

const ko: Record<TranslationKey, string> = {
  ...en,
  'language.label': '언어', 'nav.studio': '스튜디오 맵', 'nav.calendar': '팀 캘린더',
  'action.refresh': '스냅샷 새로고침', 'action.reload': 'Linear 다시 불러오기', 'action.backDemo': '데모로 돌아가기', 'action.edit': '오피스 배치 편집', 'action.closeEdit': '배치 편집 닫기', 'action.birds': '팀 새 캐릭터 선택', 'action.widget': '오피스 팝업 열기', 'action.progress': '멤버 진행률', 'action.retry': '다시 시도', 'action.advance': '15분 진행', 'action.simulate': '업데이트 시뮬레이션', 'action.useLinear': 'Linear 스냅샷 사용', 'action.loadingLinear': 'Linear 불러오는 중…', 'action.retryLinear': 'Linear 스냅샷 재시도', 'action.resetDemo': '데모 초기화',
  'hero.eyebrow': 'LINEAR 읽기 전용 스냅샷 · 실제 팀 상태', 'hero.titleA': '누가 무엇을 하는지', 'hero.titleB': '한눈에 확인하세요.', 'hero.linear': '{team}에 연결됨: 현재 이슈 상태가 새의 위치, 입구 대기열, 멤버 진행률, 프로젝트 지표와 마감 일정을 결정합니다. 이 스냅샷에는 과거 도착 시간이 없어 대기열 나이는 좌측 절단으로 표시됩니다.', 'hero.seoul': '서울 스튜디오', 'hero.loaded': '스냅샷 로드됨', 'hero.demoEyebrow': '적응형 팀 운영 장면 · V3', 'hero.demoTitleA': '누가 무엇을 하는지', 'hero.demoTitleB': '한눈에 확인하세요.', 'hero.demoDescription': '그리드를 선택하고 전달 흐름에 맞춰 오피스를 배치하세요. 작업, KPI와 멤버 상태는 논리 부서에 연결된 채 맵만 자유롭게 구성할 수 있습니다.', 'hero.demoTime': '데모 +{minutes}분',
  'studio.title': '구성형 2D 팀 스튜디오', 'studio.linear': '실제 Linear 현재 상태 · 한 사람당 한 마리 · 활성 작업 비율에 따라 참여 중인 오피스 사이를 이동합니다.', 'studio.layout': '배치 {rows}×{columns} · 배치됨 {placed} · 미배치 {unplaced} · {actors}명 · 순환 중 {rotating}명', 'studio.rapid': '빠른 업데이트', 'studio.steady': '안정적 진행', 'studio.low': '낮은 활동', 'studio.waiting': '대기 또는 차단', 'studio.asleep': '휴면', 'studio.demoDescription': '그리드를 선택하고 오피스를 재배치하세요. 편집 모드 밖에서는 캐릭터나 오피스를 클릭해 상세 정보를 볼 수 있습니다.', 'studio.demoLayout': '배치 {rows}×{columns} · 배치됨 {placed} · 미배치 {unplaced} · 캐릭터 {actors}명 · 순환 {rotating}명 · 복제 +{clones}', 'demo.teamPulse': '팀 상태', 'demo.teamPulseHelp': '최근 업데이트와 이벤트 밀도로 정렬', 'demo.allKpis': '전체 KPI', 'demo.stateRules': '상태 규칙', 'demo.stateRulesHelp': '모든 위치에는 데이터 출처가 있습니다', 'demo.liveActivity': '실시간 활동', 'demo.calendar': '캘린더', 'demo.footer': '인터랙티브 데모 데이터 사용 중; 상태 점수, 작업 복제, 부서 간 지원과 휴면 로직이 모두 작동합니다.', 'demo.footerState': 'CODEX MCP · HOOKS · GITHUB · 캘린더 연결 준비됨',
  'linear.workload': 'Linear 업무량', 'linear.workloadHelp': '현재 상태이며 출근 또는 생산성 지표가 아닙니다', 'linear.allKpis': '전체 KPI', 'linear.activeQueued': '진행 {active}개 · 대기 {queued}개 · 신원 새 {birds}마리', 'linear.statusProxy': '상태 기반 값', 'linear.rules': '상태 규칙', 'linear.rulesHelp': '모든 위치에는 데이터 출처가 있습니다', 'linear.identity': '신원', 'linear.identityRule': 'Linear 멤버 한 명당 새 한 마리만 표시합니다. 여러 오피스의 활성 작업을 맡으면 복제하지 않고 오피스 사이를 순환합니다.', 'linear.timeShare': '시간 비율', 'linear.timeRule': '오피스 체류 시간은 활성 작업 가중치를 따릅니다. 추정치가 없으면 활성 Linear 이슈마다 동일한 비율을 적용합니다.', 'linear.queuePile': '대기 상자', 'linear.queueRule': 'Todo 상자 높이는 현재 항목 수입니다. 갈라진 상자는 최초 연결 시 도착 시간을 알 수 없음을 뜻합니다.', 'linear.position': '위치', 'linear.positionRule': '진행 중은 상태 및 데이터, 리뷰 중은 QA로 매핑합니다. 같은 오피스의 여러 멤버는 각각 표시됩니다.', 'linear.kpiProxy': 'KPI 대리값', 'linear.kpiRule': '진행률은 설명 가능한 상태 가중 스냅샷이며 직원 성과 점수가 아닙니다.', 'linear.activity': 'Linear 활동', 'linear.calendar': '캘린더', 'linear.footer': 'Linear 현재 상태 스냅샷을 사용 중이며 이메일, 설명, 댓글 또는 토큰을 저장하지 않습니다.', 'linear.footerState': '현재 상태 · 기록 / WEBHOOK 미연결', 'linear.todo': '할 일', 'linear.inProgress': '진행 중', 'linear.inReview': '리뷰 중', 'linear.done': '완료',
  'drawer.member': '멤버 상세', 'drawer.zone': '오피스 상세', 'drawer.kpis': '팀 KPI', 'drawer.calendar': '팀 캘린더', 'drawer.birds': '팀 새 캐스팅', 'drawer.memberHelp': 'Linear 작업, 설명 가능한 상태 가중 진행률과 마감일', 'drawer.zoneHelp': '고정 담당자, 현재 실행자와 오피스 작업', 'drawer.kpiHelp': '모든 진행률 값은 설명 가능한 작업 상태에서 나옵니다', 'drawer.calendarHelp': '멤버별 필터; 일정을 선택하면 담당 오피스가 열립니다', 'drawer.meetingHelp': '브레인스토밍, Markdown 자료, 공유 메모와 회의 요약', 'drawer.birdsHelp': '짧은 업무 스타일 테스트를 하거나 새를 직접 선택하세요',
  'meeting.room': '회의실', 'meeting.shared': '아이디어, 자료, 회의 요약 공유',
  'room.owner': '담당자 · {name}', 'room.shared': '공용 공간', 'room.peopleTasks': '{people}명 근무 중 · 작업 {tasks}개', 'room.peopleHere': '{count}명 근무 중', 'room.queued': '대기 {count}개', 'room.arrivalUnknown': '도착 시간 미상 · 좌측 절단', 'room.facility': '공용 시설', 'room.sharedArea': '공용 구역',
  'widget.title': 'PIXEL TEAM 오피스', 'widget.live': '실시간 위젯', 'widget.openFull': '전체 화면 열기', 'widget.active': '진행 중', 'widget.review': '리뷰 중', 'widget.queued': '대기', 'widget.birds': '마리', 'widget.running': '이동 중', 'widget.loading': 'Linear 불러오는 중…', 'widget.unavailable': '스냅샷을 사용할 수 없습니다', 'widget.offDesk': '자리 비움', 'widget.snapshot': '스냅샷',
  'gate.private': '비공개 LINEAR 스튜디오', 'gate.checking': '팀 접근 권한 확인 중…', 'gate.enter': '팀 스튜디오 입장', 'gate.description': 'Linear 멤버 이름, 이슈 제목, 일정과 업무 상태는 보호됩니다. 스튜디오 소유자에게 열람 비밀번호를 요청하세요.', 'gate.password': '팀 비밀번호', 'gate.opening': '입장 중…', 'gate.open': '비공개 스튜디오 열기', 'gate.wrong': '팀 비밀번호가 올바르지 않습니다.', 'gate.unavailable': '로그인 서비스를 잠시 사용할 수 없습니다.', 'gate.unreachable': '팀 접근 서비스에 연결할 수 없습니다.', 'gate.footer': 'HTTP-only 세션으로 보호 · Linear 데이터는 공개 사이트 번들에 포함되지 않습니다',
  'layout.editor': '오피스 배치 편집기', 'layout.size': '{rows}행 × {columns}열', 'layout.summary': '{note} · 오피스 {count}개 배치 · 배경은 오피스와 함께 이동합니다', 'layout.custom': '사용자 지정 배치', 'layout.close': '편집기 닫기', 'layout.rows': '행', 'layout.columns': '열', 'layout.workflow': '워크플로 템플릿', 'layout.workflowHelp': '워크플로를 선택하면 오피스가 즉시 재배치됩니다. 작업과 Linear 데이터는 논리 단계에 그대로 연결됩니다.', 'layout.matrix': '행 / 열별 오피스 배치', 'layout.empty': '빈 오피스', 'layout.tasks': '작업 {count}개', 'layout.selected': '오피스가 선택되었습니다. 이동 또는 교환할 위치를 클릭하세요.', 'layout.select': '오피스를 선택한 뒤 목적지를 선택하세요.', 'layout.saved': '배치는 이 브라우저에 저장됩니다. 오피스를 이동해도 작업이나 KPI는 바뀌지 않습니다.', 'layout.reapply': '선택한 워크플로 다시 적용', 'layout.remove': '맵 밖으로 이동', 'layout.restore': '3 × 3 복원', 'layout.unplaced': '미배치 오피스 · {count}', 'layout.allPlaced': '모든 오피스가 배치되었습니다. 빈 칸은 교환에 사용할 수 있습니다.',
  'meeting.memory': '회의실 · 팀 공유 메모리', 'meeting.headline': '아이디어는 초안으로 들어오고, 결정은 맥락과 함께 나갑니다.', 'meeting.description': 'AI 제안은 사람이 확인해 보드로 보내기 전까지 받은 편지함에 머뭅니다. Markdown, 메모, 참고 자료와 회의 요약을 함께 보관합니다.', 'meeting.aiInbox': 'AI 받은 편지함', 'meeting.onBoard': '보드', 'meeting.materials': '회의 자료', 'meeting.summaries': '회의 요약', 'meeting.brainstorm': '브레인스토밍', 'meeting.minutes': '회의 요약', 'meeting.ideaInbox': 'AI 아이디어 받은 편지함', 'meeting.reviewRequired': '보드로 보내기 전 사람의 검토가 필요합니다', 'meeting.sendBoard': '보드로 보내기', 'meeting.reviewed': '모든 AI 제안을 검토했습니다.', 'meeting.board': '브레인스토밍 보드', 'meeting.accepted': '채택된 아이디어와 팀 메모 {count}개', 'meeting.emptyBoard': '아이디어를 보내거나 아래에서 팀 메모를 작성하세요.', 'meeting.materialTitle': '회의 자료', 'meeting.materialHelp': 'Markdown을 읽기 쉬운 텍스트로 가져와 로컬에 저장합니다.', 'meeting.import': '.md / .txt 가져오기', 'meeting.noMaterials': '아직 자료가 없습니다.', 'meeting.summaryTitle': '회의 요약', 'meeting.summaryHelp': '현재 보드와 자료를 바탕으로 검토 가능한 초안을 만듭니다.', 'meeting.createSummary': '요약 초안 만들기', 'meeting.noSummaries': '아직 회의 요약이 없습니다.', 'meeting.post': '회의실에 게시', 'meeting.types': '아이디어 · 메모 · 자료 · 요약', 'meeting.type': '유형', 'meeting.idea': '브레인스토밍 아이디어', 'meeting.memo': '메모', 'meeting.material': '회의 자료', 'meeting.summary': '회의 요약', 'meeting.source': '출처', 'meeting.title': '제목', 'meeting.titlePlaceholder': '이 메모의 명확한 이름', 'meeting.content': 'Markdown / 메모', 'meeting.contentPlaceholder': '# 배경\n\n아이디어, 메모, 회의 문서 또는 요약을 작성하거나 붙여넣으세요…', 'meeting.url': '참고 URL · 선택', 'meeting.postAction': '회의실에 게시', 'meeting.openReference': '참고 자료 열기 ↗', 'meeting.localNote': '로컬 우선 프로토타입 · 에이전트 제출은 meeting-item 이벤트 스키마를 사용합니다. 인증된 Team Events API에 연결하면 팀 실시간 공유가 가능합니다.',
  'zone.story': '제품 및 기획', 'zone.visual': '비주얼 디자인', 'zone.frontend': '프론트엔드', 'zone.backend': '상태 및 데이터', 'zone.lounge': '휴게 공간', 'zone.qa': '플레이테스트 및 QA', 'zone.release': 'PR 및 릴리스', 'zone.ops': '운영 및 일정', 'zone.nap': '휴면 구역',
}

const dictionaries: Record<StudioLocale, Record<TranslationKey, string>> = { zh, ko, en }

function initialLocale(): StudioLocale {
  if (typeof window === 'undefined') return 'en'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh' || saved === 'ko' || saved === 'en') return saved
  const browserLanguage = window.navigator.language.toLowerCase()
  return browserLanguage.startsWith('zh') ? 'zh' : browserLanguage.startsWith('ko') ? 'ko' : 'en'
}

type I18nContextValue = {
  locale: StudioLocale
  setLocale: (locale: StudioLocale) => void
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
  zoneName: (zoneId: string, fallback?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function StudioLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<StudioLocale>(initialLocale)
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : locale === 'ko' ? 'ko' : 'en'
  }, [locale])
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      setLocaleState(nextLocale)
      window.localStorage.setItem(STORAGE_KEY, nextLocale)
      document.documentElement.lang = nextLocale === 'zh' ? 'zh-CN' : nextLocale === 'ko' ? 'ko' : 'en'
    },
    t(key, values) {
      return Object.entries(values ?? {}).reduce((text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)), dictionaries[locale][key])
    },
    zoneName(zoneId, fallback = zoneId) {
      const key = `zone.${zoneId}` as TranslationKey
      return key in dictionaries[locale] ? dictionaries[locale][key] : fallback
    },
  }), [locale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useStudioLocale() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useStudioLocale must be used inside StudioLocaleProvider')
  return value
}

export const STUDIO_LOCALES: StudioLocale[] = ['zh', 'ko', 'en']
