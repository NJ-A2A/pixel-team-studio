'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'

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
import {
  arrangeStudioLayout,
  buildStudioLayoutScene,
  createStudioLayout,
  normalizeStudioLayout,
  placeStudioZone,
  removeStudioZone,
  resizeStudioLayout,
  STUDIO_LAYOUT_STORAGE_KEY,
  type StudioLayoutSlot,
} from '@/lib/team-studio/studio-layout'
import { applyBlockedDoorPlacement, diffActorTransits, type ActorTransit } from '@/lib/team-studio/flow-motion'
import type { ActorInstance, MemberPulse, TeamMember, TeamTask, TeamZone } from '@/lib/team-studio/types'

import { StudioLayoutControls } from './StudioLayoutControls'
import styles from './TeamStudio.module.css'

type DrawerState =
  | { type: 'member'; id: string }
  | { type: 'zone'; id: string }
  | { type: 'kpi'; tab: 'people' | 'project' }
  | { type: 'calendar'; memberId: string }
  | null

type BirdAnimation = 'idle' | 'walk' | 'run' | 'work' | 'sit' | 'sleep' | 'fly'

const UPDATE_ORDER = ['frontend', 'story', 'visual', 'backend', 'qa', 'ops', 'release']
const SLEEP_THRESHOLDS = [30, 45, 60, 90]
const DEFAULT_ZONE_ORDER = TEAM_ZONES.map((zone) => zone.id)
const WORKFLOW_ZONE_ORDER = ['story', 'visual', 'frontend', 'backend', 'qa', 'release', 'ops', 'lounge', 'nap']
const formatCount = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`

const cloneMembers = () => INITIAL_TEAM_MEMBERS.map((member) => ({
  ...member,
  kpis: member.kpis.map((kpi) => ({ ...kpi })),
  schedule: member.schedule.map((item) => ({ ...item })),
}))
const cloneTasks = () => INITIAL_TEAM_TASKS.map((task) => ({ ...task }))
const cloneFeed = () => INITIAL_TEAM_FEED.map((event) => ({ ...event }))
const loadLayout = () => {
  if (typeof window === 'undefined') return createStudioLayout(DEFAULT_ZONE_ORDER)
  try {
    const savedLayout = window.localStorage.getItem(STUDIO_LAYOUT_STORAGE_KEY)
    return normalizeStudioLayout(savedLayout ? JSON.parse(savedLayout) : null, DEFAULT_ZONE_ORDER)
  } catch {
    return createStudioLayout(DEFAULT_ZONE_ORDER)
  }
}

export function TeamStudio() {
  const [members, setMembers] = useState(cloneMembers)
  const [tasks, setTasks] = useState(cloneTasks)
  const [feed, setFeed] = useState(cloneFeed)
  const [offsetMinutes, setOffsetMinutes] = useState(0)
  const [sleepThreshold, setSleepThreshold] = useState(45)
  const [updateIndex, setUpdateIndex] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [clock, setClock] = useState({ time: '--:--', date: 'Seoul Studio' })
  const [layout, setLayout] = useState(loadLayout)
  const [layoutEditing, setLayoutEditing] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [actorTransits, setActorTransits] = useState<Map<string, ActorTransit>>(() => new Map())
  const studioRef = useRef<HTMLElement>(null)
  const previousActorsRef = useRef<Map<string, ActorInstance>>(new Map())
  const previousLayoutKeyRef = useRef('')

  const layoutScene = useMemo(() => buildStudioLayoutScene(layout, TEAM_ZONES), [layout])
  const unplacedZones = useMemo(() => layout.unplacedZoneIds.flatMap((zoneId) => {
    const zone = TEAM_ZONES.find((item) => item.id === zoneId)
    return zone ? [zone] : []
  }), [layout.unplacedZoneIds])
  const zoneStats = useMemo(() => Object.fromEntries(TEAM_ZONES.map((zone) => [zone.id, {
    members: members.filter((member) => member.assignedZone === zone.id).length,
    tasks: tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done').length,
  }])), [members, tasks])

  const pulses = useMemo(() => new Map(members.map((member) => [
    member.id,
    pulseFor(member, tasks, offsetMinutes, sleepThreshold),
  ])), [members, tasks, offsetMinutes, sleepThreshold])

  const actors = useMemo(() => buildActorInstances(
    members,
    tasks,
    layoutScene.zones,
    offsetMinutes,
    sleepThreshold,
  ), [members, tasks, layoutScene.zones, offsetMinutes, sleepThreshold])
  const displayActors = useMemo(() => applyBlockedDoorPlacement(
    actors,
    layoutScene.zones,
    WORKFLOW_ZONE_ORDER,
  ), [actors, layoutScene.zones])
  const layoutKey = `${layout.rows}x${layout.columns}:${layout.slots.join('|')}`

  const sleepingCount = members.filter((member) => pulses.get(member.id)?.sleeping).length
  const onlineCount = members.length - sleepingCount
  const actorCountByMember = useMemo(() => {
    const counts = new Map<string, number>()
    displayActors.forEach((actor) => counts.set(actor.member.id, (counts.get(actor.member.id) ?? 0) + 1))
    return counts
  }, [displayActors])
  const mappedMemberCount = actorCountByMember.size
  const extraActors = Math.max(0, actors.length - mappedMemberCount)
  const hiddenMemberCount = members.length - mappedMemberCount

  useLayoutEffect(() => {
    const nextActors = new Map(displayActors.map((actor) => [actor.id, actor]))
    if (previousLayoutKeyRef.current !== layoutKey || previousActorsRef.current.size === 0) {
      previousLayoutKeyRef.current = layoutKey
      previousActorsRef.current = nextActors
      setActorTransits((current) => current.size ? new Map() : current)
      return
    }

    const changedTransits = diffActorTransits(
      previousActorsRef.current,
      displayActors,
      WORKFLOW_ZONE_ORDER,
      layoutScene.height,
    )
    if (changedTransits.length) {
      setActorTransits((current) => {
        const next = new Map(current)
        changedTransits.forEach((transit) => next.set(transit.actorId, transit))
        return next
      })
    }
    previousActorsRef.current = nextActors
  }, [displayActors, layoutKey, layoutScene.height])

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClock({
        time: new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(now),
        date: new Intl.DateTimeFormat('en-US', {
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

  useEffect(() => {
    try {
      window.localStorage.setItem(STUDIO_LAYOUT_STORAGE_KEY, JSON.stringify(layout))
    } catch {
      // The editor still works when storage is unavailable; only persistence is skipped.
    }
  }, [layout])

  function advanceDemo(minutes: number) {
    const nextOffset = offsetMinutes + minutes
    setOffsetMinutes(nextOffset)
    setFeed((events) => [{
      id: `advance-${nextOffset}`,
      minutes: -nextOffset,
      text: `Advanced demo time by ${minutes} minutes. Busy, slack, and sleep positions were recalculated.`,
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
      text: `${member.name} posted an update${candidate ? `; ${candidate.short} advanced to ${clamp(candidate.progress + 4)}%` : ''}.`,
    }, ...events])
    setUpdateIndex((value) => value + 1)
  }

  function simulateForwardTransit() {
    const taskId = 't-story-1'
    const candidate = tasks.find((task) => task.id === taskId)
    if (!candidate) return
    const currentIndex = WORKFLOW_ZONE_ORDER.indexOf(candidate.zoneId)
    const nextZoneId = WORKFLOW_ZONE_ORDER[Math.min(currentIndex + 1, WORKFLOW_ZONE_ORDER.indexOf('release'))]
    if (!nextZoneId || nextZoneId === candidate.zoneId) {
      setFeed((events) => [{ id: `flow-end-${Date.now()}`, minutes: -offsetMinutes, text: `${candidate.short} is already at the end of the current workflow.` }, ...events])
      return
    }
    setTasks((items) => items.map((task) => task.id === taskId ? {
      ...task,
      zoneId: nextZoneId,
      status: nextZoneId === 'release' ? 'reviewing' : 'working',
      lastUpdateMinutes: -offsetMinutes,
      progress: clamp(task.progress + 3),
    } : task))
    setFeed((events) => [{
      id: `flow-forward-${Date.now()}`,
      minutes: -offsetMinutes,
      text: `${candidate.short} moved from ${TEAM_ZONES.find((zone) => zone.id === candidate.zoneId)?.name} to ${TEAM_ZONES.find((zone) => zone.id === nextZoneId)?.name}; only its actor entered transit.`,
    }, ...events])
  }

  function simulateRollbackTransit() {
    const taskId = 't-qa-2'
    const candidate = tasks.find((task) => task.id === taskId)
    if (!candidate) return
    const currentIndex = WORKFLOW_ZONE_ORDER.indexOf(candidate.zoneId)
    const previousZoneId = WORKFLOW_ZONE_ORDER[Math.max(0, currentIndex - 1)]
    if (!previousZoneId || previousZoneId === candidate.zoneId) return
    setTasks((items) => items.map((task) => task.id === taskId ? {
      ...task,
      zoneId: previousZoneId,
      status: 'working',
      lastUpdateMinutes: -offsetMinutes,
      note: 'Returned from review for rework',
    } : task))
    setFeed((events) => [{
      id: `flow-rollback-${Date.now()}`,
      minutes: -offsetMinutes,
      text: `${candidate.short} was returned from review and is moving back to ${TEAM_ZONES.find((zone) => zone.id === previousZoneId)?.name} with the slower red rollback animation.`,
    }, ...events])
  }

  function toggleBlockedDemo() {
    const taskId = 't-release-1'
    const candidate = tasks.find((task) => task.id === taskId)
    if (!candidate) return
    const nextStatus = candidate.status === 'blocked' ? 'waiting' : 'blocked'
    setTasks((items) => items.map((task) => task.id === taskId ? { ...task, status: nextStatus } : task))
    setFeed((events) => [{
      id: `flow-block-${Date.now()}`,
      minutes: -offsetMinutes,
      text: nextStatus === 'blocked'
        ? `${candidate.short} entered BLOCK: stop at the doorway, face the next zone, and do not translate.`
        : `${candidate.short} cleared BLOCK and may enter the target seat once.`,
    }, ...events])
  }

  function cycleSleepThreshold() {
    const next = SLEEP_THRESHOLDS[(SLEEP_THRESHOLDS.indexOf(sleepThreshold) + 1) % SLEEP_THRESHOLDS.length]
    setSleepThreshold(next)
    setFeed((events) => [{
      id: `threshold-${next}-${offsetMinutes}`,
      minutes: -offsetMinutes,
      text: `Sleep threshold changed to ${next} minutes.`,
    }, ...events])
  }

  function changeLayoutGrid(rows: number, columns: number) {
    setLayout((current) => resizeStudioLayout(current, rows, columns))
    setSelectedZoneId(null)
    setFeed((events) => [{
      id: `layout-${rows}-${columns}-${Date.now()}`,
      minutes: -offsetMinutes,
      text: `Office changed to ${rows} rows × ${columns} columns. Overflow rooms moved to the unplaced tray.`,
    }, ...events])
  }

  function selectUnplacedZone(zoneId: string) {
    setSelectedZoneId((current) => current === zoneId ? null : zoneId)
  }

  function selectLayoutSlot(slot: StudioLayoutSlot) {
    if (!layoutEditing) {
      if (slot.zoneId) setDrawer({ type: 'zone', id: slot.zoneId })
      return
    }
    if (!selectedZoneId) {
      setSelectedZoneId(slot.zoneId)
      return
    }
    setLayout((current) => placeStudioZone(current, selectedZoneId, slot.index))
    setFeed((events) => [{
      id: `layout-place-${selectedZoneId}-${slot.index}-${Date.now()}`,
      minutes: -offsetMinutes,
      text: `${TEAM_ZONES.find((zone) => zone.id === selectedZoneId)?.name ?? 'Room'} moved to workflow slot ${slot.index + 1}.`,
    }, ...events])
    setSelectedZoneId(null)
  }

  function arrangeByWorkflow() {
    setLayout((current) => arrangeStudioLayout(current, WORKFLOW_ZONE_ORDER))
    setSelectedZoneId(null)
    setFeed((events) => [{
      id: `layout-flow-${Date.now()}`,
      minutes: -offsetMinutes,
      text: 'The office was reordered by the Product → Visual → Frontend → Data → QA → Release delivery flow.',
    }, ...events])
  }

  function removeSelectedZone() {
    if (!selectedZoneId) return
    setLayout((current) => removeStudioZone(current, selectedZoneId))
    setSelectedZoneId(null)
  }

  function resetLayout() {
    setLayout(createStudioLayout(DEFAULT_ZONE_ORDER))
    setSelectedZoneId(null)
  }

  function resetDemo() {
    previousActorsRef.current = new Map()
    previousLayoutKeyRef.current = ''
    setActorTransits(new Map())
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
        <nav className={styles.navPills} aria-label="Team Studio navigation">
          <button type="button" className={styles.active} onClick={scrollToStudio}>Studio map</button>
          <button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>KPI</button>
          <button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>Team calendar</button>
        </nav>
        <div className={styles.topActions}>
          <button type="button" onClick={() => advanceDemo(15)}>Advance 15 minutes</button>
          <button type="button" onClick={cycleSleepThreshold}>Sleep threshold {sleepThreshold}m</button>
          <button type="button" className={styles.primaryAction} onClick={triggerDemoUpdate}>Simulate update</button>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>ADAPTIVE TEAM OPERATING SCENE · V3</span>
            <h1>See who is doing what, <em>at a glance.</em></h1>
            <p>Choose a grid and arrange rooms around your delivery flow. Tasks, KPIs, and member states stay bound to their logical departments while the map remains fully configurable.</p>
          </div>
          <div className={styles.clockCard}>
            <small>SEOUL STUDIO</small><strong>{clock.time}</strong><span>{clock.date} · demo +{offsetMinutes}m</span>
          </div>
        </section>

        <section className={styles.projectStrip} aria-label="Current project status">
          <ProjectCell label="CURRENT PROJECT" value="NestLinker Team Studio · Open Source Demo" />
          <ProjectCell label="BRANCH" value="main · demo-events" />
          <ProjectCell label="COMMIT" value="local-demo" />
          <ProjectCell label="DRAFT PR" value="#15 · Review pending" />
          <ProjectCell label="MEMBERS / ACTORS" value={`${members.length} / ${actors.length}`} />
          <ProjectCell label="STUDIO STATUS" value={`${onlineCount} online · ${sleepingCount} asleep`} live />
        </section>

        <section className={styles.dashboard} ref={studioRef} id="studio">
          <article className={styles.studioCard}>
            <header className={styles.studioHead}>
              <div><h2>NestLinker Configurable 2D Studio</h2><p>Choose a grid and reorder rooms. Outside edit mode, click a character or room for details.</p></div>
              <div className={styles.legend} aria-label="Character status legend">
                <span data-level="turbo"><i />Rapid updates</span>
                <span data-level="steady"><i />Steady progress</span>
                <span data-level="slack"><i />Low activity</span>
                <span data-level="waiting"><i />Waiting or blocked</span>
                <span data-level="sleep"><i />Asleep</span>
              </div>
            </header>
            <StudioLayoutControls
              layout={layout}
              unplacedZones={unplacedZones}
              zoneStats={zoneStats}
              editing={layoutEditing}
              selectedZoneId={selectedZoneId}
              onToggleEditing={() => {
                setLayoutEditing((current) => !current)
                setSelectedZoneId(null)
              }}
              onGridChange={changeLayoutGrid}
              onSelectUnplacedZone={selectUnplacedZone}
              onArrangeWorkflow={arrangeByWorkflow}
              onReset={resetLayout}
              onRemoveSelected={removeSelectedZone}
            />
            <div className={styles.mapTools}>
              <b>Layout {layout.rows}×{layout.columns} · {layoutScene.zones.length} placed · {unplacedZones.length} unplaced · {actors.length} actors · +{extraActors} clones{hiddenMemberCount ? ` · ${hiddenMemberCount} members off-map` : ''}</b>
              <button type="button" className={styles.flowAction} data-kind="forward" onClick={simulateForwardTransit}>Trigger forward move</button>
              <button type="button" className={styles.flowAction} data-kind="rollback" onClick={simulateRollbackTransit}>Trigger review rollback</button>
              <button type="button" className={styles.flowAction} data-kind="block" onClick={toggleBlockedDemo}>Toggle BLOCK</button>
              <button type="button" onClick={resetDemo}>Reset demo</button>
              <button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>Member progress</button>
              <button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>Team calendar</button>
            </div>
            <div className={styles.mapScroll}>
              <div
                className={styles.officeMap}
                data-layout-editing={layoutEditing}
                style={{ '--map-width': `${layoutScene.width}px`, '--map-height': `${layoutScene.height}px` } as CSSProperties}
              >
                <div className={styles.corridor}><span>SHARED ROUTE · TASK HANDOFF · REVIEW FLOW</span></div>
                <div className={styles.officeSign}>{layout.rows} × {layout.columns} WORKFLOW · {actors.length} TASK ACTORS</div>
                {layoutScene.slots.map((slot) => {
                  const zone = slot.zoneId ? layoutScene.zones.find((item) => item.id === slot.zoneId) : undefined
                  return zone ? (
                    <WorkZone
                      key={zone.id}
                      slot={slot}
                      zone={zone}
                      members={members}
                      tasks={tasks}
                      actors={displayActors}
                      editing={layoutEditing}
                      selected={selectedZoneId === zone.id}
                      onSelect={() => selectLayoutSlot(slot)}
                    />
                  ) : (
                    <EmptyLayoutSlot key={`empty-${slot.index}`} slot={slot} editing={layoutEditing} selectedZoneId={selectedZoneId} onSelect={() => selectLayoutSlot(slot)} />
                  )
                })}
                {displayActors.map((actor) => (
                  <AgentActor
                    key={actor.id}
                    actor={actor}
                    zones={layoutScene.zones}
                    transit={actorTransits.get(actor.id)}
                    onTransitEnd={() => setActorTransits((current) => {
                      if (!current.has(actor.id)) return current
                      const next = new Map(current)
                      next.delete(actor.id)
                      return next
                    })}
                    onOpen={() => setDrawer({ type: 'member', id: actor.member.id })}
                  />
                ))}
              </div>
            </div>
          </article>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>Team pulse</h3><small>Sorted by recency and event density</small></div><button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>All KPIs</button></header>
              <PulseSummary pulses={[...pulses.values()]} />
              <div className={styles.pulseList}>
                {[...members].sort((a, b) => (pulses.get(a.id)?.age ?? 0) - (pulses.get(b.id)?.age ?? 0)).map((member) => {
                  const pulse = pulses.get(member.id)!
                  const memberActorCount = actorCountByMember.get(member.id) ?? 0
                  return (
                    <button type="button" className={styles.pulseRow} key={member.id} onClick={() => setDrawer({ type: 'member', id: member.id })}>
                      <PixelBird bird={member.bird} size={48} />
                      <span className={styles.pulseCopy}><b>{member.name}</b><small>Updated {shortAge(pulse.age)} · {formatCount(memberActorCount, 'map actor')}</small></span>
                      <span className={styles.pulseScore}><b>{pulse.waiting ? 'WAIT' : pulse.sleeping ? 'SLEEP' : pulse.busyScore}</b><small>{pulse.slackScore === null ? 'slack excluded' : `slack ${pulse.slackScore}`}</small></span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>State rules</h3><small>Every position has a data source</small></div><button type="button" onClick={cycleSleepThreshold}>{sleepThreshold}m</button></header>
              <div className={styles.ruleList}>
                <Rule title="Update density">Recent updates, more events, and parallel tasks increase the activity signal.</Rule>
                <Rule title="Slack score">Inverse of the busy score; user, PR, and external waits are excluded.</Rule>
                <Rule title="Actor clones">Each parallel task creates one visible task actor in its responsibility zone.</Rule>
                <Rule title="Sleep state">After {sleepThreshold} minutes without an update, the actor moves to the dormant zone while the owner plate remains.</Rule>
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>Live activity</h3><small>Demo time +{offsetMinutes} minutes</small></div><button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>Calendar</button></header>
              <div className={styles.feed}>
                {feed.slice(0, 8).map((event) => <div className={styles.feedItem} key={event.id}><time>{shortAge(event.minutes + offsetMinutes)}</time><span>{event.text}</span></div>)}
              </div>
            </section>
          </aside>
        </section>

        <footer className={styles.footerNote}>
          <span>Interactive demo data is active; state scoring, task clones, cross-zone support, and sleep logic are fully functional.</span>
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
  animation?: BirdAnimation
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
  return <div className={styles.pulseSummary}><div><b>{busy}</b><span>Busy</span></div><div><b>{slack}</b><span>Low activity</span></div><div><b>{waiting}</b><span>Waiting</span></div><div><b>{sleeping}</b><span>Asleep</span></div></div>
}

function WorkZone({ slot, zone, members, tasks, actors, editing, selected, onSelect }: {
  slot: StudioLayoutSlot
  zone: TeamZone
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  editing: boolean
  selected: boolean
  onSelect: () => void
}) {
  const owner = members.find((member) => member.id === zone.ownerId)
  const zoneTasks = tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done')
  const workers = new Set(actors.filter((actor) => actor.zone.id === zone.id && !actor.pulse.sleeping).map((actor) => actor.member.id))
  const progress = zoneTasks.length ? Math.round(zoneTasks.reduce((sum, task) => sum + task.progress, 0) / zoneTasks.length) : 0
  const zoneStyle = {
    '--zone-x': `${zone.x}px`, '--zone-y': `${zone.y}px`, '--zone-width': `${zone.width}px`, '--zone-height': `${zone.height}px`,
  } as CSSProperties

  return (
    <button
      type="button"
      className={styles.zone}
      data-theme={zone.theme}
      data-editing={editing}
      data-selected={selected}
      style={zoneStyle}
      onClick={onSelect}
      aria-label={editing ? `Move ${zone.name}, currently in slot ${slot.index + 1}` : `View ${zone.name}`}
    >
      <span className={styles.zoneSlot}>#{slot.index + 1} · {slot.row + 1}-{slot.column + 1}{editing ? ' · click to swap' : ''}</span>
      <span className={styles.zoneHead}>
        <span className={styles.ownerPlate}>
          {owner && <PixelBird bird={owner.bird} size={42} />}
          <span><b>{zone.name}</b><small>{owner ? `Owner · ${owner.name}` : 'Shared facility'}</small></span>
        </span>
        <span className={styles.zoneProgress}><b>{owner ? `${progress}%` : 'FACILITY'}</b><small>{owner ? `${formatCount(workers.size, 'person', 'people')} / ${formatCount(zoneTasks.length, 'task')}` : 'Shared area'}</small></span>
      </span>
    </button>
  )
}

function EmptyLayoutSlot({ slot, editing, selectedZoneId, onSelect }: {
  slot: StudioLayoutSlot
  editing: boolean
  selectedZoneId: string | null
  onSelect: () => void
}) {
  const style = {
    '--zone-x': `${slot.x}px`, '--zone-y': `${slot.y}px`, '--zone-width': `${slot.width}px`, '--zone-height': `${slot.height}px`,
  } as CSSProperties
  return (
    <button type="button" className={styles.emptyZone} style={style} onClick={onSelect} disabled={!editing}>
      <b>Empty room #{slot.index + 1}</b>
      <span>{editing && selectedZoneId ? 'Place here' : editing ? 'Select a room first' : 'Available slot'}</span>
    </button>
  )
}

function AgentActor({ actor, zones, transit, onTransitEnd, onOpen }: {
  actor: ActorInstance
  zones: TeamZone[]
  transit?: ActorTransit
  onTransitEnd: () => void
  onOpen: () => void
}) {
  const crossZone = actor.zone.id !== actor.member.assignedZone
  const flowIndex = WORKFLOW_ZONE_ORDER.indexOf(actor.zone.id)
  const nextZone = zones.find((zone) => zone.id === WORKFLOW_ZONE_ORDER[flowIndex + 1])
  const facingForward = transit
    ? transit.route[5].x >= transit.route[0].x ? 1 : -1
    : actor.pulse.blocked && nextZone
      ? nextZone.x + nextZone.width / 2 >= actor.x ? 1 : -1
      : 1
  const motion = transit ? 'transit' : 'settled'
  const birdAnimation: BirdAnimation = actor.pulse.sleeping
    ? transit ? 'walk' : 'sleep'
    : transit
      ? 'walk'
      : actor.pulse.waiting || actor.pulse.blocked || actor.zone.id === 'lounge'
        ? 'sit'
        : actor.pulse.level === 'turbo'
          ? actor.member.bird === 'swift' ? 'fly' : 'run'
          : actor.task ? 'work' : 'idle'
  const fromZone = transit ? zones.find((zone) => zone.id === transit.fromZoneId) : undefined
  const toZone = transit ? zones.find((zone) => zone.id === transit.toZoneId) : undefined
  const taskLabel = transit
    ? `${transit.direction === 'rollback' ? 'Review rollback · ' : ''}${fromZone?.name ?? transit.fromZoneId} → ${toZone?.name ?? transit.toZoneId}`
    : actor.pulse.sleeping
      ? 'No recent updates; settled in the dormant zone'
    : actor.zone.id === 'lounge'
      ? 'Low update frequency; away from the desk'
      : actor.task?.short ?? 'No active task'
  const route = transit?.route
  const style = {
    '--actor-x': `${actor.x}px`,
    '--actor-y': `${actor.y}px`,
    '--transit-duration': `${transit?.durationMs ?? 0}ms`,
    '--route-0-x': `${(route?.[0].x ?? actor.x) - actor.x}px`,
    '--route-0-y': `${(route?.[0].y ?? actor.y) - actor.y}px`,
    '--route-1-x': `${(route?.[1].x ?? actor.x) - actor.x}px`,
    '--route-1-y': `${(route?.[1].y ?? actor.y) - actor.y}px`,
    '--route-2-x': `${(route?.[2].x ?? actor.x) - actor.x}px`,
    '--route-2-y': `${(route?.[2].y ?? actor.y) - actor.y}px`,
    '--route-3-x': `${(route?.[3].x ?? actor.x) - actor.x}px`,
    '--route-3-y': `${(route?.[3].y ?? actor.y) - actor.y}px`,
    '--route-4-x': `${(route?.[4].x ?? actor.x) - actor.x}px`,
    '--route-4-y': `${(route?.[4].y ?? actor.y) - actor.y}px`,
    zIndex: 20 + Math.round(actor.y),
  } as CSSProperties

  return (
    <button
      type="button"
      className={styles.actor}
      data-level={actor.pulse.level}
      data-motion={motion}
      data-direction={transit?.direction ?? 'none'}
      data-accounting={transit ? 'transit-excluded' : 'settled'}
      style={style}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onTransitEnd()
      }}
      onClick={onOpen}
    >
      <span className={styles.actorCore}>
        <span className={styles.busyLines}><i /><i /><i /><i /></span>
        {actor.cloneTotal > 1 && <span className={styles.cloneBadge}>Clone {actor.cloneIndex}/{actor.cloneTotal}</span>}
        {crossZone && <span className={styles.supportBadge}>Cross-zone support</span>}
        {transit?.direction === 'rollback' ? <span className={styles.rollbackBadge}>↩ ROLLBACK</span> : null}
        <span className={styles.thought}>{transit ? transit.direction === 'rollback' ? 'BACK' : '→' : actor.pulse.blocked ? 'BLOCK' : actor.pulse.waiting ? 'WAIT' : actor.pulse.sleeping ? 'Z Z' : actor.pulse.level === 'slack' ? '…' : ''}</span>
        <PixelBird bird={actor.member.bird} size={72} animation={birdAnimation} facing={facingForward} />
      </span>
      <span className={styles.actorName}>{actor.member.name}{crossZone ? ' · supporting outside owned zone' : ''}</span>
      <span className={styles.actorTask}>{taskLabel}</span>
      <span className={styles.actorMetric}>{transit ? 'TRANSIT · BUSY/SLACK FROZEN' : pulseLabel(actor.pulse)}</span>
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
    ? members.find((member) => member.id === drawer.id)?.name ?? 'Member details'
    : drawer.type === 'zone'
      ? TEAM_ZONES.find((zone) => zone.id === drawer.id)?.name ?? 'Zone details'
      : drawer.type === 'kpi' ? 'Team KPIs' : 'Team calendar'
  const subtitle = drawer.type === 'member' ? 'Tasks, clones, personal metrics, and schedule'
    : drawer.type === 'zone' ? 'Fixed owner, current executors, and zone tasks'
      : drawer.type === 'kpi' ? 'Every progress value comes from an explainable task state' : 'Filter by member; select an event to open its responsibility zone'

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={closeFromBackdrop}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="team-drawer-title">
        <header className={styles.drawerHead}><div><h2 id="team-drawer-title">{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header>
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
      <div><h3>{member.name}</h3><p>{member.role} · {member.species}. Logical ownership: {ownerZone.name}. Map position is derived from the current floor, task zone, and most recent update.</p><div className={styles.metricChips}><span>Updated {shortAge(pulse.age)}</span><span>30m updates {pulse.effective30m}</span><span>Parallel tasks {pulse.activeTasks.length}</span><span>{pulseLabel(pulse)}</span></div></div>
    </section>
    <SectionTitle title="Current and remaining tasks" meta={`${memberTasks.length} items`} />
    <div className={styles.taskList}>{memberTasks.map((task) => {
      const zone = TEAM_ZONES.find((item) => item.id === task.zoneId)!
      const crossZone = task.zoneId !== member.assignedZone
      return <article className={styles.taskCard} key={task.id}>
        <div className={styles.taskCardHead}><h4>{task.title}</h4><b>{task.progress}%</b></div>
        <p>{taskStatusLabel(task.status)} · updated {shortAge(currentAge(task.lastUpdateMinutes, offsetMinutes))} · due {task.due}</p>
        <ProgressBar value={task.progress} />
        <div className={styles.tagRow}><span>Zone: {zone.name}</span>{crossZone && <span data-kind="support">Cross-zone support · owned zone {ownerZone.name}</span>}{task.note && <span data-kind="wait">{task.note}</span>}</div>
      </article>
    })}</div>
    <SectionTitle title="Personal KPIs" meta={`Overall progress ${member.kpi}%`} />
    <div className={styles.kpiDetail}>{member.kpis.map((kpi) => <div className={styles.kpiLine} key={kpi.label}><b>{kpi.label}</b><span>{kpi.current} / {kpi.target}</span><ProgressBar value={kpi.current / kpi.target * 100} /></div>)}</div>
    <SectionTitle title="Today's schedule" meta="Open Team calendar to view everyone" />
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
  if (!owner) return <><SectionTitle title="Current members" meta={formatCount(workerIds.length, 'actor')} /><div className={styles.zoneWorkers}>{workerIds.length ? workerIds.map((id) => {
    const member = members.find((item) => item.id === id)!
    return <WorkerButton key={id} member={member} pulse={pulses.get(id)!} onClick={() => onOpenMember(id)} />
  }) : <article className={styles.taskCard}>Nobody is using this zone.</article>}</div></>
  const progress = zoneTasks.length ? Math.round(zoneTasks.reduce((sum, task) => sum + task.progress, 0) / zoneTasks.length) : 0
  return <>
    <section className={styles.zoneOwner}><PixelBird bird={owner.bird} size={112} label={owner.species} /><div><h3>{owner.name}</h3><p>{owner.role}. The desk plate always identifies this owner, regardless of who is currently working in the zone.</p></div></section>
    <SectionTitle title="Current executors" meta={formatCount(workerIds.length, 'person', 'people')} />
    <div className={styles.zoneWorkers}>{workerIds.length ? workerIds.map((id) => {
      const member = members.find((item) => item.id === id)!
      return <WorkerButton key={id} member={member} pulse={pulses.get(id)!} support={member.assignedZone !== zone.id} onClick={() => onOpenMember(id)} />
    }) : <article className={styles.taskCard}>No active executors in this zone.</article>}</div>
    <SectionTitle title="Zone tasks" meta={`${zoneTasks.length} items · ${progress}% zone progress`} />
    <div className={styles.taskList}>{zoneTasks.map((task) => <article className={styles.taskCard} key={task.id}><div className={styles.taskCardHead}><h4>{task.title}</h4><b>{task.progress}%</b></div><p>{members.find((member) => member.id === task.assigneeId)?.name} · {taskStatusLabel(task.status)} · updated {shortAge(currentAge(task.lastUpdateMinutes, offsetMinutes))}</p><ProgressBar value={task.progress} /></article>)}</div>
  </>
}

function WorkerButton({ member, pulse, support = false, onClick }: { member: TeamMember; pulse: MemberPulse; support?: boolean; onClick: () => void }) {
  return <button type="button" className={styles.zoneWorker} onClick={onClick}><PixelBird bird={member.bird} size={58} /><span><b>{member.name}</b><small>{support ? 'Cross-zone support · ' : ''}{pulseLabel(pulse)}</small></span><em>{support ? 'Support' : 'Owned'}</em></button>
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
  const actorCountByMember = new Map<string, number>()
  actors.forEach((actor) => actorCountByMember.set(actor.member.id, (actorCountByMember.get(actor.member.id) ?? 0) + 1))
  return <>
    <div className={styles.drawerTabs}><button type="button" data-active={tab === 'people'} onClick={() => onChangeTab('people')}>Member progress</button><button type="button" data-active={tab === 'project'} onClick={() => onChangeTab('project')}>Project metrics</button></div>
    <div className={styles.summaryGrid}><Summary label="Team members" value={members.length} /><Summary label="Map actors" value={actors.length} /><Summary label="Parallel clones" value={Math.max(0, actors.length - actorCountByMember.size)} /><Summary label="Sleeping members" value={sleeping} /></div>
    {tab === 'people' ? <div className={styles.memberKpiList}>{members.map((member) => {
      const pulse = pulses.get(member.id)!
      const memberActorCount = actorCountByMember.get(member.id) ?? 0
      return <button type="button" className={styles.memberKpiRow} key={member.id} onClick={() => onOpenMember(member.id)}><PixelBird bird={member.bird} size={72} /><div><h4>{member.name} · {member.role}</h4><p>Owned zone {TEAM_ZONES.find((zone) => zone.id === member.assignedZone)?.name} · updated {shortAge(pulse.age)} · {formatCount(memberActorCount, 'map actor')}</p><ProgressBar value={member.kpi} /></div><span className={styles.kpiNumbers}><b>{member.kpi}%</b><small>{pulse.slackScore === null ? 'wait excluded from slack' : `slack ${pulse.slackScore}`}</small></span></button>
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
    <div className={styles.calendarFilters}><button type="button" data-active={selectedMemberId === 'all'} onClick={() => onSelectMember('all')}>All members</button>{members.map((member) => <button type="button" data-active={selectedMemberId === member.id} key={member.id} onClick={() => onSelectMember(member.id)}><PixelBird bird={member.bird} size={28} />{member.name}</button>)}</div>
    <div className={styles.calendarWrap}><div className={styles.calendarGrid}>{TEAM_DAY_NAMES.map((day, dayIndex) => {
      const events = TEAM_CALENDAR_EVENTS.filter((event) => event.day === dayIndex && (selectedMemberId === 'all' || event.memberIds.includes(selectedMemberId)))
      return <section className={styles.dayColumn} key={day}><header><b>{day}</b><span>{formatCount(events.length, 'event')}</span></header><div>{events.length ? events.map((event) => <button type="button" className={styles.calendarEvent} key={event.id} onClick={() => onOpenEvent(event.memberIds, event.zoneId)}><time>{event.time}</time><b>{event.title}</b><span>{event.memberIds.map((id) => {
        const member = members.find((item) => item.id === id)!
        return <PixelBird bird={member.bird} size={28} label={member.name} key={id} />
      })}</span></button>) : <article className={styles.calendarEmpty}>No events</article>}</div></section>
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
