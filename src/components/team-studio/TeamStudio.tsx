'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'

import { buildActorInstances } from '@/lib/team-studio/actor-instances'
import { clamp, currentAge, pulseFor, pulseLabel, shortAge, taskStatusLabel } from '@/lib/team-studio/activity-score'
import {
  birdAvatar,
  INITIAL_TEAM_FEED,
  INITIAL_TEAM_MEMBERS,
  INITIAL_TEAM_TASKS,
  PROJECT_KPIS,
  TEAM_CALENDAR_EVENTS,
  TEAM_DAY_NAMES,
  TEAM_ZONES,
} from '@/lib/team-studio/demo-data'
import type { ActorInstance, MemberPulse, TeamMember, TeamTask, TeamZone } from '@/lib/team-studio/types'

import styles from './TeamStudio.module.css'

type DrawerState =
  | { type: 'member'; id: string }
  | { type: 'zone'; id: string }
  | { type: 'kpi'; tab: 'people' | 'project' }
  | { type: 'calendar'; memberId: string }
  | null

const UPDATE_ORDER = ['frontend', 'story', 'visual', 'backend', 'qa', 'ops', 'release']
const SLEEP_THRESHOLDS = [30, 45, 60, 90]

const cloneMembers = () => INITIAL_TEAM_MEMBERS.map((member) => ({
  ...member,
  kpis: member.kpis.map((kpi) => ({ ...kpi })),
  schedule: member.schedule.map((item) => ({ ...item })),
}))
const cloneTasks = () => INITIAL_TEAM_TASKS.map((task) => ({ ...task }))
const cloneFeed = () => INITIAL_TEAM_FEED.map((event) => ({ ...event }))

export function TeamStudio() {
  const [members, setMembers] = useState(cloneMembers)
  const [tasks, setTasks] = useState(cloneTasks)
  const [feed, setFeed] = useState(cloneFeed)
  const [offsetMinutes, setOffsetMinutes] = useState(0)
  const [sleepThreshold, setSleepThreshold] = useState(45)
  const [updateIndex, setUpdateIndex] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [clock, setClock] = useState({ time: '--:--', date: '首尔工作室' })
  const studioRef = useRef<HTMLElement>(null)

  const pulses = useMemo(() => new Map(members.map((member) => [
    member.id,
    pulseFor(member, tasks, offsetMinutes, sleepThreshold),
  ])), [members, tasks, offsetMinutes, sleepThreshold])

  const actors = useMemo(() => buildActorInstances(
    members,
    tasks,
    TEAM_ZONES,
    offsetMinutes,
    sleepThreshold,
  ), [members, tasks, offsetMinutes, sleepThreshold])

  const sleepingCount = members.filter((member) => pulses.get(member.id)?.sleeping).length
  const onlineCount = members.length - sleepingCount
  const extraActors = Math.max(0, actors.length - members.length)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock({
        time: new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(now),
        date: new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short',
        }).format(now),
      })
    }
    updateClock()
    const timer = window.setInterval(updateClock, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && setDrawer(null)
    document.addEventListener('keydown', closeOnEscape)
    document.body.style.overflow = drawer ? 'hidden' : ''
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.body.style.overflow = ''
    }
  }, [drawer])

  function advanceDemo(minutes: number) {
    const nextOffset = offsetMinutes + minutes
    setOffsetMinutes(nextOffset)
    setFeed((events) => [{
      id: `advance-${nextOffset}`,
      minutes: -nextOffset,
      text: `演示时间推进 ${minutes} 分钟，系统重新计算忙碌、摸鱼与休眠位置。`,
    }, ...events])
  }

  function triggerDemoUpdate() {
    const memberId = UPDATE_ORDER[updateIndex % UPDATE_ORDER.length]
    const member = members.find((item) => item.id === memberId)
    const candidate = tasks.find((task) => task.assigneeId === memberId && task.status !== 'done')
    if (!member) return

    setMembers((items) => items.map((item) => item.id === memberId ? {
      ...item,
      lastUpdateMinutes: -offsetMinutes,
      updates30m: item.updates30m + 2,
      updates2h: item.updates2h + 2,
      kpi: clamp(item.kpi + 1),
      mode: memberId === 'ops' ? undefined : item.mode,
    } : item))

    if (candidate) {
      setTasks((items) => items.map((task) => task.id === candidate.id ? {
        ...task,
        lastUpdateMinutes: -offsetMinutes,
        progress: clamp(task.progress + 4),
        status: task.status === 'paused' ? 'working' : task.status,
      } : task))
    }

    setFeed((events) => [{
      id: `update-${updateIndex}-${memberId}`,
      minutes: -offsetMinutes,
      text: `${member.name} 产生新更新${candidate ? `，${candidate.short} 推进至 ${clamp(candidate.progress + 4)}%` : ''}。`,
    }, ...events])
    setUpdateIndex((value) => value + 1)
  }

  function cycleSleepThreshold() {
    const next = SLEEP_THRESHOLDS[(SLEEP_THRESHOLDS.indexOf(sleepThreshold) + 1) % SLEEP_THRESHOLDS.length]
    setSleepThreshold(next)
    setFeed((events) => [{
      id: `threshold-${next}-${offsetMinutes}`,
      minutes: -offsetMinutes,
      text: `休眠阈值调整为 ${next} 分钟。`,
    }, ...events])
  }

  function resetDemo() {
    setMembers(cloneMembers())
    setTasks(cloneTasks())
    setFeed(cloneFeed())
    setOffsetMinutes(0)
    setSleepThreshold(45)
    setUpdateIndex(0)
    setDrawer(null)
  }

  function scrollToStudio() {
    studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className={styles.page} id="top">
      <header className={styles.topbar}>
        <a href="#top" className={styles.brand}>
          <span className={styles.brandMark}>NL</span>
          <span className={styles.brandCopy}><b>NESTLINKER</b><small>Footprints Studio</small></span>
        </a>
        <nav className={styles.navPills} aria-label="团队工作室导航">
          <button type="button" className={styles.active} onClick={scrollToStudio}>工作室地图</button>
          <button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>KPI</button>
          <button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>团队日历</button>
        </nav>
        <div className={styles.topActions}>
          <button type="button" onClick={() => advanceDemo(15)}>推进 15 分钟</button>
          <button type="button" onClick={cycleSleepThreshold}>休眠阈值 {sleepThreshold}m</button>
          <button type="button" className={styles.primaryAction} onClick={triggerDemoUpdate}>模拟新更新</button>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>LIVE TEAM OPERATING SCENE · V2</span>
            <h1>谁在做什么，<em>一眼就知道。</em></h1>
            <p>固定负责人留在工位牌，当前执行者跟着任务移动；并行任务生成分身，长时间没有更新的成员会真的去休眠区睡觉。</p>
          </div>
          <div className={styles.clockCard}>
            <small>SEOUL STUDIO</small><strong>{clock.time}</strong><span>{clock.date} · 演示时间 +{offsetMinutes}m</span>
          </div>
        </section>

        <section className={styles.projectStrip} aria-label="当前项目状态">
          <ProjectCell label="CURRENT PROJECT" value="NestLinker Team Studio · Open Source Demo" />
          <ProjectCell label="BRANCH" value="main · demo-events" />
          <ProjectCell label="COMMIT" value="local-demo" />
          <ProjectCell label="DRAFT PR" value="#15 · Review pending" />
          <ProjectCell label="MEMBERS / ACTORS" value={`${members.length} / ${actors.length}`} />
          <ProjectCell label="STUDIO STATUS" value={`${onlineCount} 在线 · ${sleepingCount} 休眠`} live />
        </section>

        <section className={styles.dashboard} ref={studioRef} id="studio">
          <article className={styles.studioCard}>
            <header className={styles.studioHead}>
              <div><h2>巢链 2D 工作室地图</h2><p>区域头像是岗位负责人；地图角色是当前实际执行者。点击任何角色或区域查看详情。</p></div>
              <div className={styles.legend} aria-label="角色状态图例">
                <span data-level="turbo"><i />高速更新</span>
                <span data-level="steady"><i />正常推进</span>
                <span data-level="slack"><i />摸鱼偏高</span>
                <span data-level="waiting"><i />等待或阻塞</span>
                <span data-level="sleep"><i />休眠</span>
              </div>
            </header>
            <div className={styles.mapTools}>
              <b>实际成员 {members.length} · 地图角色 {actors.length} · 并行分身 +{extraActors} · 休眠 {sleepingCount}</b>
              <button type="button" onClick={resetDemo}>重置演示</button>
              <button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>成员进度</button>
              <button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>团队日历</button>
            </div>
            <div className={styles.mapScroll}>
              <div className={styles.officeMap}>
                <div className={styles.corridor}><span>SHARED ROUTE · TASK HANDOFF · REVIEW FLOW</span></div>
                <div className={styles.officeSign}>{actors.length} 个任务角色 · {sleepThreshold}m 无更新休眠</div>
                {TEAM_ZONES.map((zone) => (
                  <WorkZone
                    key={zone.id}
                    zone={zone}
                    members={members}
                    tasks={tasks}
                    actors={actors}
                    onOpen={() => setDrawer({ type: 'zone', id: zone.id })}
                  />
                ))}
                {actors.map((actor) => (
                  <AgentActor key={actor.id} actor={actor} onOpen={() => setDrawer({ type: 'member', id: actor.member.id })} />
                ))}
              </div>
            </div>
          </article>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>团队脉冲</h3><small>按最近更新与事件密度排序</small></div><button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>全部 KPI</button></header>
              <PulseSummary pulses={[...pulses.values()]} />
              <div className={styles.pulseList}>
                {[...members].sort((a, b) => (pulses.get(a.id)?.age ?? 0) - (pulses.get(b.id)?.age ?? 0)).map((member) => {
                  const pulse = pulses.get(member.id)!
                  return (
                    <button type="button" className={styles.pulseRow} key={member.id} onClick={() => setDrawer({ type: 'member', id: member.id })}>
                      <PixelBird bird={member.bird} size={48} />
                      <span className={styles.pulseCopy}><b>{member.name}</b><small>{shortAge(pulse.age)}更新 · {Math.max(1, pulse.activeTasks.length)} 个地图角色</small></span>
                      <span className={styles.pulseScore}><b>{pulse.waiting ? 'WAIT' : pulse.sleeping ? 'SLEEP' : pulse.busyScore}</b><small>{pulse.slackScore === null ? '摸鱼不计' : `摸鱼 ${pulse.slackScore}`}</small></span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>状态判定规则</h3><small>每个位置都有数据来源</small></div><button type="button" onClick={cycleSleepThreshold}>{sleepThreshold}m</button></header>
              <div className={styles.ruleList}>
                <Rule title="更新密集">最近更新时间短、事件多、并行任务多，角色动作更快。</Rule>
                <Rule title="摸鱼指数">忙碌分的反向值；等待用户、PR 或外部阻塞不计摸鱼。</Rule>
                <Rule title="角色分身">每多一项并行任务，就在对应职责区生成一个任务实例。</Rule>
                <Rule title="进入休眠">超过 {sleepThreshold} 分钟无更新，角色进入休眠区，原工位仍保留负责人。</Rule>
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>实时动态</h3><small>演示时间 +{offsetMinutes} 分钟</small></div><button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>看日历</button></header>
              <div className={styles.feed}>
                {feed.slice(0, 8).map((event) => <div className={styles.feedItem} key={event.id}><time>{shortAge(event.minutes + offsetMinutes)}</time><span>{event.text}</span></div>)}
              </div>
            </section>
          </aside>
        </section>

        <footer className={styles.footerNote}>
          <span>当前为交互演示数据；状态判定、任务分身、跨区支援与休眠逻辑均实际运行。</span>
          <span>READY FOR CODEX MCP · HOOKS · GITHUB · CALENDAR</span>
        </footer>
      </div>

      {drawer && (
        <Drawer
          drawer={drawer}
          members={members}
          tasks={tasks}
          actors={actors}
          pulses={pulses}
          offsetMinutes={offsetMinutes}
          onClose={() => setDrawer(null)}
          onNavigate={setDrawer}
        />
      )}
    </main>
  )
}

function PixelBird({ bird, size, animation = 'idle', facing = 1, label }: {
  bird: string
  size: number
  animation?: 'idle' | 'walk'
  facing?: 1 | -1 | number
  label?: string
}) {
  const style = {
    '--bird-size': `${size}px`,
    '--bird-facing': facing,
    backgroundImage: `url(${birdAvatar(bird)})`,
  } as CSSProperties

  return (
    <span
      className={styles.pixelBird}
      data-animation={animation}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}

function ProjectCell({ label, value, live = false }: { label: string; value: string; live?: boolean }) {
  return <div className={styles.projectCell}><small>{label}</small><b>{live && <i className={styles.liveDot} />}{value}</b></div>
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className={styles.ruleItem}><b>{title}</b><span>{children}</span></div>
}

function PulseSummary({ pulses }: { pulses: MemberPulse[] }) {
  const busy = pulses.filter((pulse) => ['turbo', 'busy'].includes(pulse.level)).length
  const slack = pulses.filter((pulse) => pulse.level === 'slack').length
  const waiting = pulses.filter((pulse) => ['waiting', 'blocked'].includes(pulse.level)).length
  const sleeping = pulses.filter((pulse) => pulse.level === 'sleep').length
  return <div className={styles.pulseSummary}><div><b>{busy}</b><span>忙碌</span></div><div><b>{slack}</b><span>摸鱼偏高</span></div><div><b>{waiting}</b><span>等待</span></div><div><b>{sleeping}</b><span>睡眠</span></div></div>
}

function WorkZone({ zone, members, tasks, actors, onOpen }: {
  zone: TeamZone
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  onOpen: () => void
}) {
  const owner = members.find((member) => member.id === zone.ownerId)
  const zoneTasks = tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done')
  const workers = new Set(actors.filter((actor) => actor.zone.id === zone.id && !actor.pulse.sleeping).map((actor) => actor.member.id))
  const progress = zoneTasks.length ? Math.round(zoneTasks.reduce((sum, task) => sum + task.progress, 0) / zoneTasks.length) : 0
  const zoneStyle = {
    '--zone-x': `${zone.x}px`, '--zone-y': `${zone.y}px`, '--zone-width': `${zone.width}px`, '--zone-height': `${zone.height}px`,
  } as CSSProperties

  return (
    <button type="button" className={styles.zone} data-theme={zone.theme} style={zoneStyle} onClick={onOpen}>
      <span className={styles.zoneHead}>
        <span className={styles.ownerPlate}>
          {owner && <PixelBird bird={owner.bird} size={42} />}
          <span><b>{zone.name}</b><small>{owner ? `负责人 · ${owner.name}` : '共享设施'}</small></span>
        </span>
        <span className={styles.zoneProgress}><b>{owner ? `${progress}%` : 'FACILITY'}</b><small>{owner ? `${workers.size} 人 / ${zoneTasks.length} 任务` : '共享区域'}</small></span>
      </span>
    </button>
  )
}

function AgentActor({ actor, onOpen }: { actor: ActorInstance; onOpen: () => void }) {
  const crossZone = Boolean(actor.task && actor.task.zoneId !== actor.member.assignedZone)
  const ownerZone = TEAM_ZONES.find((zone) => zone.id === actor.member.assignedZone)!
  const routeStartX = ownerZone.x + ownerZone.width / 2
  const routeStartY = ownerZone.y + ownerZone.height * 0.55
  const routeCorridorY = Math.max(ownerZone.y, actor.zone.y) - 8
  const facingForward = actor.x >= routeStartX ? 1 : -1
  const motion = actor.pulse.sleeping
    ? 'sleepwalk'
    : actor.pulse.waiting || actor.pulse.blocked
      ? 'idle'
      : crossZone ? 'commute' : 'roam'
  const roamDuration = actor.pulse.level === 'turbo' ? 2.8 : actor.pulse.level === 'busy' ? 3.8 : actor.pulse.level === 'slack' ? 7.5 : 5.3
  const commuteDuration = Math.max(9, roamDuration * 2.6)
  const taskLabel = actor.pulse.sleeping
    ? '无更新，自动进入休眠区'
    : actor.zone.id === 'lounge'
      ? '更新频率偏低，暂离工位'
      : actor.task?.short ?? '暂无执行任务'
  const style = {
    '--actor-x': `${actor.x}px`,
    '--actor-y': `${actor.y}px`,
    '--route-start-x': `${routeStartX - actor.x}px`,
    '--route-start-y': `${routeStartY - actor.y}px`,
    '--route-corridor-y': `${routeCorridorY - actor.y}px`,
    '--roam-duration': `${roamDuration}s`,
    '--commute-duration': `${commuteDuration}s`,
    '--facing-forward': facingForward,
    '--facing-backward': -facingForward,
    zIndex: 20 + Math.round(actor.y),
  } as CSSProperties

  return (
    <button type="button" className={styles.actor} data-level={actor.pulse.level} data-motion={motion} style={style} onClick={onOpen}>
      <span className={styles.actorCore}>
        <span className={styles.busyLines}><i /><i /><i /><i /></span>
        {actor.cloneTotal > 1 && <span className={styles.cloneBadge}>分身 {actor.cloneIndex}/{actor.cloneTotal}</span>}
        {crossZone && <span className={styles.supportBadge}>跨区支援</span>}
        <span className={styles.thought}>{actor.pulse.waiting ? 'WAIT' : actor.pulse.blocked ? 'BLOCK' : actor.pulse.sleeping ? 'Z Z' : actor.pulse.level === 'slack' ? '…' : ''}</span>
        <PixelBird bird={actor.member.bird} size={72} animation={motion === 'idle' ? 'idle' : 'walk'} facing={facingForward} />
      </span>
      <span className={styles.actorName}>{actor.member.name}{crossZone ? ' · 非本区负责人' : ''}</span>
      <span className={styles.actorTask}>{taskLabel}</span>
      <span className={styles.actorMetric}>{pulseLabel(actor.pulse)}</span>
    </button>
  )
}

function Drawer({ drawer, members, tasks, actors, pulses, offsetMinutes, onClose, onNavigate }: {
  drawer: Exclude<DrawerState, null>
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  pulses: Map<string, MemberPulse>
  offsetMinutes: number
  onClose: () => void
  onNavigate: (state: Exclude<DrawerState, null>) => void
}) {
  const title = drawer.type === 'member'
    ? members.find((member) => member.id === drawer.id)?.name ?? '成员详情'
    : drawer.type === 'zone'
      ? TEAM_ZONES.find((zone) => zone.id === drawer.id)?.name ?? '区域详情'
      : drawer.type === 'kpi' ? '团队 KPI' : '团队日历'
  const subtitle = drawer.type === 'member' ? '任务、分身、个人指标与日程'
    : drawer.type === 'zone' ? '固定负责人、当前执行者与区域任务'
      : drawer.type === 'kpi' ? '每一项进度都来自可解释的任务状态' : '按成员筛选；点击日程进入对应职责区域'

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={closeFromBackdrop}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="team-drawer-title">
        <header className={styles.drawerHead}><div><h2 id="team-drawer-title">{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label="关闭">×</button></header>
        <div className={styles.drawerBody}>
          {drawer.type === 'member' && <MemberDetail member={members.find((member) => member.id === drawer.id)!} tasks={tasks} pulse={pulses.get(drawer.id)!} offsetMinutes={offsetMinutes} />}
          {drawer.type === 'zone' && <ZoneDetail zone={TEAM_ZONES.find((zone) => zone.id === drawer.id)!} members={members} tasks={tasks} actors={actors} pulses={pulses} offsetMinutes={offsetMinutes} onOpenMember={(id) => onNavigate({ type: 'member', id })} />}
          {drawer.type === 'kpi' && <KpiDetail tab={drawer.tab} members={members} actors={actors} pulses={pulses} onChangeTab={(tab) => onNavigate({ type: 'kpi', tab })} onOpenMember={(id) => onNavigate({ type: 'member', id })} />}
          {drawer.type === 'calendar' && <CalendarDetail selectedMemberId={drawer.memberId} members={members} onSelectMember={(memberId) => onNavigate({ type: 'calendar', memberId })} onOpenEvent={(memberIds, zoneId) => memberIds.length === 1 ? onNavigate({ type: 'member', id: memberIds[0] }) : onNavigate({ type: 'zone', id: zoneId })} />}
        </div>
      </aside>
    </div>
  )
}

function MemberDetail({ member, tasks, pulse, offsetMinutes }: { member: TeamMember; tasks: TeamTask[]; pulse: MemberPulse; offsetMinutes: number }) {
  const ownerZone = TEAM_ZONES.find((zone) => zone.id === member.assignedZone)!
  const memberTasks = tasks.filter((task) => task.assigneeId === member.id)
  return <>
    <section className={styles.memberHero}>
      <PixelBird bird={member.bird} size={128} label={member.species} />
      <div><h3>{member.name}</h3><p>{member.role} · {member.species}。固定负责区域：{ownerZone.name}；地图位置由任务区域和最近更新决定。</p><div className={styles.metricChips}><span>最近更新 {shortAge(pulse.age)}</span><span>30m 更新 {pulse.effective30m}</span><span>并行分身 {Math.max(1, pulse.activeTasks.length)}</span><span>{pulseLabel(pulse)}</span></div></div>
    </section>
    <SectionTitle title="当前与剩余任务" meta={`${memberTasks.length} 项`} />
    <div className={styles.taskList}>{memberTasks.map((task) => {
      const zone = TEAM_ZONES.find((item) => item.id === task.zoneId)!
      const crossZone = task.zoneId !== member.assignedZone
      return <article className={styles.taskCard} key={task.id}>
        <div className={styles.taskCardHead}><h4>{task.title}</h4><b>{task.progress}%</b></div>
        <p>{taskStatusLabel(task.status)} · 最近更新 {shortAge(currentAge(task.lastUpdateMinutes, offsetMinutes))} · 截止 {task.due}</p>
        <ProgressBar value={task.progress} />
        <div className={styles.tagRow}><span>区域：{zone.name}</span>{crossZone && <span data-kind="support">跨区支援 · 本职 {ownerZone.name}</span>}{task.note && <span data-kind="wait">{task.note}</span>}</div>
      </article>
    })}</div>
    <SectionTitle title="个人 KPI" meta={`总进度 ${member.kpi}%`} />
    <div className={styles.kpiDetail}>{member.kpis.map((kpi) => <div className={styles.kpiLine} key={kpi.label}><b>{kpi.label}</b><span>{kpi.current} / {kpi.target}</span><ProgressBar value={kpi.current / kpi.target * 100} /></div>)}</div>
    <SectionTitle title="今日日程" meta="点击团队日历可查看全员" />
    <div className={styles.scheduleCards}>{member.schedule.map((item) => <article className={styles.scheduleCard} key={`${item.time}-${item.title}`}><b>{item.title}</b><time>{item.time}</time></article>)}</div>
  </>
}

function ZoneDetail({ zone, members, tasks, actors, pulses, offsetMinutes, onOpenMember }: {
  zone: TeamZone
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  pulses: Map<string, MemberPulse>
  offsetMinutes: number
  onOpenMember: (id: string) => void
}) {
  const owner = members.find((member) => member.id === zone.ownerId)
  const zoneTasks = tasks.filter((task) => task.zoneId === zone.id)
  const workerIds = [...new Set(actors.filter((actor) => actor.zone.id === zone.id).map((actor) => actor.member.id))]
  if (!owner) return <><SectionTitle title="当前成员" meta={`${workerIds.length} 个角色`} /><div className={styles.zoneWorkers}>{workerIds.length ? workerIds.map((id) => {
    const member = members.find((item) => item.id === id)!
    return <WorkerButton key={id} member={member} pulse={pulses.get(id)!} onClick={() => onOpenMember(id)} />
  }) : <article className={styles.taskCard}>当前无人使用此区域。</article>}</div></>
  const progress = zoneTasks.length ? Math.round(zoneTasks.reduce((sum, task) => sum + task.progress, 0) / zoneTasks.length) : 0
  return <>
    <section className={styles.zoneOwner}><PixelBird bird={owner.bird} size={112} label={owner.species} /><div><h3>{owner.name}</h3><p>{owner.role}。无论当前谁在该区域工作，工位牌始终保留这位负责人。</p></div></section>
    <SectionTitle title="当前执行者" meta={`${workerIds.length} 人`} />
    <div className={styles.zoneWorkers}>{workerIds.length ? workerIds.map((id) => {
      const member = members.find((item) => item.id === id)!
      return <WorkerButton key={id} member={member} pulse={pulses.get(id)!} support={member.assignedZone !== zone.id} onClick={() => onOpenMember(id)} />
    }) : <article className={styles.taskCard}>当前没有活跃执行者。</article>}</div>
    <SectionTitle title="区域任务" meta={`${zoneTasks.length} 项 · 区域进度 ${progress}%`} />
    <div className={styles.taskList}>{zoneTasks.map((task) => <article className={styles.taskCard} key={task.id}><div className={styles.taskCardHead}><h4>{task.title}</h4><b>{task.progress}%</b></div><p>{members.find((member) => member.id === task.assigneeId)?.name} · {taskStatusLabel(task.status)} · {shortAge(currentAge(task.lastUpdateMinutes, offsetMinutes))}更新</p><ProgressBar value={task.progress} /></article>)}</div>
  </>
}

function WorkerButton({ member, pulse, support = false, onClick }: { member: TeamMember; pulse: MemberPulse; support?: boolean; onClick: () => void }) {
  return <button type="button" className={styles.zoneWorker} onClick={onClick}><PixelBird bird={member.bird} size={58} /><span><b>{member.name}</b><small>{support ? '跨区支援 · ' : ''}{pulseLabel(pulse)}</small></span><em>{support ? '支援' : '本区'}</em></button>
}

function KpiDetail({ tab, members, actors, pulses, onChangeTab, onOpenMember }: {
  tab: 'people' | 'project'
  members: TeamMember[]
  actors: ActorInstance[]
  pulses: Map<string, MemberPulse>
  onChangeTab: (tab: 'people' | 'project') => void
  onOpenMember: (id: string) => void
}) {
  const sleeping = [...pulses.values()].filter((pulse) => pulse.sleeping).length
  return <>
    <div className={styles.drawerTabs}><button type="button" data-active={tab === 'people'} onClick={() => onChangeTab('people')}>成员进度</button><button type="button" data-active={tab === 'project'} onClick={() => onChangeTab('project')}>项目指标</button></div>
    <div className={styles.summaryGrid}><Summary label="实际成员" value={members.length} /><Summary label="地图角色" value={actors.length} /><Summary label="并行分身" value={Math.max(0, actors.length - members.length)} /><Summary label="休眠成员" value={sleeping} /></div>
    {tab === 'people' ? <div className={styles.memberKpiList}>{members.map((member) => {
      const pulse = pulses.get(member.id)!
      return <button type="button" className={styles.memberKpiRow} key={member.id} onClick={() => onOpenMember(member.id)}><PixelBird bird={member.bird} size={72} /><div><h4>{member.name} · {member.role}</h4><p>负责人区域 {TEAM_ZONES.find((zone) => zone.id === member.assignedZone)?.name} · 最近更新 {shortAge(pulse.age)} · {Math.max(1, pulse.activeTasks.length)} 个地图角色</p><ProgressBar value={member.kpi} /></div><span className={styles.kpiNumbers}><b>{member.kpi}%</b><small>{pulse.slackScore === null ? '等待不计摸鱼' : `摸鱼 ${pulse.slackScore}`}</small></span></button>
    })}</div> : <div className={styles.projectKpis}>{PROJECT_KPIS.map((kpi) => <article className={styles.projectKpi} key={kpi.label}><div><h4>{kpi.label}</h4><b>{kpi.current} / {kpi.target}</b></div><ProgressBar value={kpi.current / kpi.target * 100} /><p>{kpi.description}</p></article>)}</div>}
  </>
}

function CalendarDetail({ selectedMemberId, members, onSelectMember, onOpenEvent }: {
  selectedMemberId: string
  members: TeamMember[]
  onSelectMember: (id: string) => void
  onOpenEvent: (memberIds: string[], zoneId: string) => void
}) {
  return <>
    <div className={styles.calendarFilters}><button type="button" data-active={selectedMemberId === 'all'} onClick={() => onSelectMember('all')}>全部成员</button>{members.map((member) => <button type="button" data-active={selectedMemberId === member.id} key={member.id} onClick={() => onSelectMember(member.id)}><PixelBird bird={member.bird} size={28} />{member.name}</button>)}</div>
    <div className={styles.calendarWrap}><div className={styles.calendarGrid}>{TEAM_DAY_NAMES.map((day, dayIndex) => {
      const events = TEAM_CALENDAR_EVENTS.filter((event) => event.day === dayIndex && (selectedMemberId === 'all' || event.memberIds.includes(selectedMemberId)))
      return <section className={styles.dayColumn} key={day}><header><b>{day}</b><span>{events.length} 项安排</span></header><div>{events.length ? events.map((event) => <button type="button" className={styles.calendarEvent} key={event.id} onClick={() => onOpenEvent(event.memberIds, event.zoneId)}><time>{event.time}</time><b>{event.title}</b><span>{event.memberIds.map((id) => {
        const member = members.find((item) => item.id === id)!
        return <PixelBird bird={member.bird} size={28} label={member.name} key={id} />
      })}</span></button>) : <article className={styles.calendarEmpty}>暂无安排</article>}</div></section>
    })}</div></div>
  </>
}

function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return <div className={styles.sectionTitle}><h3>{title}</h3><span>{meta}</span></div>
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className={styles.summaryCard}><small>{label}</small><b>{value}</b></div>
}

function ProgressBar({ value }: { value: number }) {
  return <span className={styles.progressBar} style={{ '--progress': `${clamp(value)}%` } as CSSProperties}><i /></span>
}
