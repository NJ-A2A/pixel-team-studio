'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'

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
  STUDIO_WORKFLOW_PRESETS,
  type StudioLayoutSlot,
} from '@/lib/team-studio/studio-layout'
import { applyBlockedDoorPlacement, diffActorTransits, type ActorTransit } from '@/lib/team-studio/flow-motion'
import { adaptLinearSnapshot, type LinearSnapshot, type LinearStudioSummary } from '@/lib/team-studio/linear-adapter'
import { BIRD_ASSIGNMENTS_STORAGE_KEY, BIRD_CATALOG, type BirdProfile } from '@/lib/team-studio/bird-catalog'
import { buildIdentityRotationPlans, rotationTaskByMember } from '@/lib/team-studio/identity-rotation'
import type { ActorInstance, MemberPulse, ProjectKpi, TeamCalendarEvent, TeamMember, TeamTask, TeamZone } from '@/lib/team-studio/types'

import { MeetingRoomPanel } from './MeetingRoomPanel'
import { StudioLayoutControls } from './StudioLayoutControls'
import styles from './TeamStudio.module.css'

type DrawerState =
  | { type: 'member'; id: string }
  | { type: 'zone'; id: string }
  | { type: 'kpi'; tab: 'people' | 'project' }
  | { type: 'calendar'; memberId: string }
  | { type: 'casting' }
  | { type: 'meeting' }
  | null

type BirdAnimation = 'idle' | 'walk' | 'run' | 'work' | 'sit' | 'sleep' | 'fly'
type DataSourceMode = 'demo' | 'linear'
type SourceState = 'idle' | 'loading' | 'ready' | 'error'

const UPDATE_ORDER = ['frontend', 'story', 'visual', 'backend', 'qa', 'ops', 'release']
const SLEEP_THRESHOLDS = [30, 45, 60, 90]
const DEFAULT_ZONE_ORDER = TEAM_ZONES.map((zone) => zone.id)
const OFFICE_BACKGROUND_SLICES: Record<string, [number, number]> = {
  story: [0, 0], visual: [50, 0], frontend: [100, 0],
  backend: [0, 50], lounge: [50, 50], qa: [100, 50],
  release: [0, 100], ops: [50, 100], nap: [100, 100],
}
const formatCount = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`

const openOfficeWidget = () => {
  const widgetUrl = new URL(window.location.origin)
  widgetUrl.searchParams.set('view', 'widget')
  widgetUrl.searchParams.set('source', 'linear')
  window.open(widgetUrl.toString(), 'NestlinkerOfficeWidget', 'popup=yes,width=460,height=620,resizable=yes,scrollbars=no')
}

type BirdAssignments = Record<string, string>

const loadBirdAssignments = (): BirdAssignments => {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(window.localStorage.getItem(BIRD_ASSIGNMENTS_STORAGE_KEY) ?? '{}') as BirdAssignments
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

const applyBirdAssignments = (members: TeamMember[]) => {
  const assignments = loadBirdAssignments()
  return members.map((member) => {
    const bird = BIRD_CATALOG.find((candidate) => candidate.id === assignments[member.id])
    return bird ? { ...member, bird: bird.id, species: bird.species } : member
  })
}

const cloneMembers = () => INITIAL_TEAM_MEMBERS.map((member) => ({
  ...member,
  kpis: member.kpis.map((kpi) => ({ ...kpi })),
  schedule: member.schedule.map((item) => ({ ...item })),
}))
const cloneTasks = () => INITIAL_TEAM_TASKS.map((task) => ({ ...task }))
const cloneFeed = () => INITIAL_TEAM_FEED.map((event) => ({ ...event }))
const cloneProjectKpis = () => PROJECT_KPIS.map((kpi) => ({ ...kpi }))
const cloneCalendarEvents = () => TEAM_CALENDAR_EVENTS.map((event) => ({ ...event, memberIds: [...event.memberIds] }))
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
  const [members, setMembers] = useState(() => applyBirdAssignments(cloneMembers()))
  const [tasks, setTasks] = useState(cloneTasks)
  const [feed, setFeed] = useState(cloneFeed)
  const [projectKpis, setProjectKpis] = useState(cloneProjectKpis)
  const [calendarEvents, setCalendarEvents] = useState(cloneCalendarEvents)
  const [sourceMode, setSourceMode] = useState<DataSourceMode>('demo')
  const [sourceState, setSourceState] = useState<SourceState>('idle')
  const [linearSummary, setLinearSummary] = useState<LinearStudioSummary | null>(null)
  const [offsetMinutes, setOffsetMinutes] = useState(0)
  const [sleepThreshold, setSleepThreshold] = useState(45)
  const [updateIndex, setUpdateIndex] = useState(0)
  const [drawer, setDrawer] = useState<DrawerState>(null)
  const [clock, setClock] = useState({ time: '--:--', date: 'Seoul Studio' })
  const [layout, setLayout] = useState(loadLayout)
  const [activeWorkflowId, setActiveWorkflowId] = useState('product-delivery')
  const [layoutEditing, setLayoutEditing] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [mapScale, setMapScale] = useState(1)
  const [rotationNow, setRotationNow] = useState(0)
  const [rotationEpoch, setRotationEpoch] = useState(0)
  const [actorTransits, setActorTransits] = useState<Map<string, ActorTransit>>(() => new Map())
  const studioRef = useRef<HTMLElement>(null)
  const mapViewportRef = useRef<HTMLDivElement>(null)
  const previousActorsRef = useRef<Map<string, ActorInstance>>(new Map())
  const previousLayoutKeyRef = useRef('')

  const activeWorkflow = useMemo(() => STUDIO_WORKFLOW_PRESETS.find((candidate) => candidate.id === activeWorkflowId) ?? STUDIO_WORKFLOW_PRESETS[0]!, [activeWorkflowId])
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

  const rotationPlans = useMemo(() => buildIdentityRotationPlans(members, tasks, layoutScene.zones), [members, tasks, layoutScene.zones])
  const rotatingActorIds = useMemo(() => new Set(rotationPlans
    .filter((plan) => plan.segments.length > 1)
    .map((plan) => `${plan.memberId}-identity`)), [rotationPlans])
  const rotationSelections = useMemo(() => sourceMode === 'linear'
    ? rotationTaskByMember(rotationPlans, rotationNow - rotationEpoch)
    : new Map<string, string>(), [rotationPlans, rotationNow, rotationEpoch, sourceMode])
  const rotationShareByMemberZone = useMemo(() => new Map(rotationPlans.flatMap((plan) => plan.segments.map((segment) => [
    `${plan.memberId}:${segment.zoneId}`,
    { share: segment.share, taskCount: segment.taskCount },
  ] as const))), [rotationPlans])

  const actors = useMemo(() => buildActorInstances(
    members,
    tasks,
    layoutScene.zones,
    offsetMinutes,
    sleepThreshold,
    sourceMode === 'linear',
    rotationSelections,
  ), [members, tasks, layoutScene.zones, offsetMinutes, sleepThreshold, sourceMode, rotationSelections])
  const displayActors = useMemo(() => applyBlockedDoorPlacement(
    actors,
    layoutScene.zones,
    activeWorkflow.zoneOrder,
  ), [actors, layoutScene.zones, activeWorkflow.zoneOrder])
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

  const loadLinearSnapshot = useCallback(async () => {
    setSourceState('loading')
    try {
      const response = await fetch('/team-studio/linear-snapshot.local.json', { cache: 'no-store' })
      if (!response.ok) throw new Error(`Linear snapshot returned ${response.status}`)
      const snapshot = await response.json() as LinearSnapshot
      const data = adaptLinearSnapshot(snapshot)
      previousActorsRef.current = new Map()
      previousLayoutKeyRef.current = ''
      setActorTransits(new Map())
      setMembers(applyBirdAssignments(data.members))
      setTasks(data.tasks)
      setFeed(data.feed)
      setProjectKpis(data.projectKpis)
      setCalendarEvents(data.calendarEvents)
      setLinearSummary(data.summary)
      setSourceMode('linear')
      setSourceState('ready')
      const rotationStart = Date.now()
      setRotationEpoch(rotationStart)
      setRotationNow(rotationStart)
      setOffsetMinutes(0)
      setSleepThreshold(20_160)
      setUpdateIndex(0)
      setDrawer(null)
      setLayout((current) => arrangeStudioLayout(current, ['story', 'frontend', 'backend', 'qa', 'release', 'ops', 'visual', 'lounge', 'nap']))
      const url = new URL(window.location.href)
      url.searchParams.set('source', 'linear')
      window.history.replaceState(null, '', url)
    } catch {
      setSourceState('error')
    }
  }, [])

  useEffect(() => {
    if (sourceMode !== 'linear') return
    const timer = window.setInterval(() => setRotationNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [sourceMode])

  useLayoutEffect(() => {
    const viewport = mapViewportRef.current
    if (!viewport) return
    const updateScale = () => {
      const availableWidth = Math.max(280, viewport.clientWidth - 28)
      const availableHeight = Math.max(294, Math.min(window.innerHeight * 0.68, 760) - 66)
      setMapScale(Math.min(1, availableWidth / layoutScene.width, availableHeight / layoutScene.height))
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    window.addEventListener('resize', updateScale)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [layoutScene.width, layoutScene.height])

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
      activeWorkflow.zoneOrder,
      layoutScene.height,
      rotatingActorIds,
    )
    if (changedTransits.length) {
      setActorTransits((current) => {
        const next = new Map(current)
        changedTransits.forEach((transit) => next.set(transit.actorId, transit))
        return next
      })
    }
    previousActorsRef.current = nextActors
  }, [displayActors, layoutKey, layoutScene.height, activeWorkflow.zoneOrder, rotatingActorIds])

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
    const source = new URLSearchParams(window.location.search).get('source')
    if (source !== 'linear') return
    const timer = window.setTimeout(() => void loadLinearSnapshot(), 0)
    return () => window.clearTimeout(timer)
  }, [loadLinearSnapshot])

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
    const currentIndex = activeWorkflow.zoneOrder.indexOf(candidate.zoneId)
    const nextZoneId = activeWorkflow.zoneOrder[Math.min(currentIndex + 1, activeWorkflow.zoneOrder.indexOf('release'))]
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
    const currentIndex = activeWorkflow.zoneOrder.indexOf(candidate.zoneId)
    const previousZoneId = activeWorkflow.zoneOrder[Math.max(0, currentIndex - 1)]
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

  function arrangeByWorkflow(workflowId = activeWorkflowId) {
    const workflow = STUDIO_WORKFLOW_PRESETS.find((candidate) => candidate.id === workflowId) ?? STUDIO_WORKFLOW_PRESETS[0]
    setActiveWorkflowId(workflow.id)
    setLayout((current) => arrangeStudioLayout(current, workflow.zoneOrder))
    setSelectedZoneId(null)
    setFeed((events) => [{
      id: `layout-flow-${Date.now()}`,
      minutes: -offsetMinutes,
      text: `The office was reordered with the ${workflow.label} workflow.`,
    }, ...events])
  }

  function changeLayoutSlot(slotIndex: number, zoneId: string | null) {
    setLayout((current) => {
      const existingZoneId = current.slots[slotIndex]
      if (!zoneId) return existingZoneId ? removeStudioZone(current, existingZoneId) : current
      return placeStudioZone(current, zoneId, slotIndex)
    })
    setSelectedZoneId(null)
  }

  function changeMemberBird(memberId: string, bird: BirdProfile) {
    setMembers((current) => current.map((member) => member.id === memberId
      ? { ...member, bird: bird.id, species: bird.species }
      : member))
    try {
      const assignments = loadBirdAssignments()
      window.localStorage.setItem(BIRD_ASSIGNMENTS_STORAGE_KEY, JSON.stringify({ ...assignments, [memberId]: bird.id }))
    } catch {
      // Character selection still works for this session if persistence is unavailable.
    }
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
    setMembers(applyBirdAssignments(cloneMembers()))
    setTasks(cloneTasks())
    setFeed(cloneFeed())
    setProjectKpis(cloneProjectKpis())
    setCalendarEvents(cloneCalendarEvents())
    setLinearSummary(null)
    setSourceMode('demo')
    setSourceState('idle')
    setOffsetMinutes(0)
    setSleepThreshold(45)
    setUpdateIndex(0)
    setDrawer(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('source')
    window.history.replaceState(null, '', url)
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
          {sourceMode === 'demo' ? <>
            <button type="button" onClick={() => advanceDemo(15)}>Advance 15 minutes</button>
            <button type="button" onClick={triggerDemoUpdate}>Simulate update</button>
            <button type="button" className={styles.primaryAction} onClick={() => void loadLinearSnapshot()}>{sourceState === 'loading' ? 'Loading Linear…' : sourceState === 'error' ? 'Retry Linear snapshot' : 'Use Linear snapshot'}</button>
          </> : <>
            <button type="button" onClick={() => void loadLinearSnapshot()}>Refresh snapshot</button>
            <button type="button" className={styles.primaryAction} onClick={resetDemo}>Back to demo</button>
          </>}
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>{sourceMode === 'linear' ? 'LINEAR READ-ONLY SNAPSHOT · REAL TEAM STATE' : 'ADAPTIVE TEAM OPERATING SCENE · V3'}</span>
            <h1>See who is doing what, <em>at a glance.</em></h1>
            <p>{sourceMode === 'linear'
              ? `Connected to ${linearSummary?.teamName ?? 'Linear'}: current issue states drive bird positions, doorway queues, member progress, project metrics, and due-date calendar entries. Historical arrival times are not available through this snapshot, so queue age is marked left-truncated.`
              : 'Choose a grid and arrange rooms around your delivery flow. Tasks, KPIs, and member states stay bound to their logical departments while the map remains fully configurable.'}</p>
          </div>
          <div className={styles.clockCard}>
            <small>SEOUL STUDIO</small><strong>{clock.time}</strong><span>{clock.date} · {sourceMode === 'linear' ? 'snapshot loaded' : `demo +${offsetMinutes}m`}</span>
          </div>
        </section>

        <section className={styles.projectStrip} aria-label="Current project status">
          <ProjectCell label={sourceMode === 'linear' ? 'LINEAR TEAM' : 'CURRENT PROJECT'} value={sourceMode === 'linear' ? `${linearSummary?.teamName ?? 'Nestlinker'} · ${linearSummary?.issueCount ?? 0} issues` : 'NestLinker Team Studio · Open Source Demo'} />
          <ProjectCell label={sourceMode === 'linear' ? 'SOURCE' : 'BRANCH'} value={sourceMode === 'linear' ? 'Read-only local snapshot' : 'main · demo-events'} />
          <ProjectCell label={sourceMode === 'linear' ? 'TODO QUEUE' : 'COMMIT'} value={sourceMode === 'linear' ? `${linearSummary?.queueCount ?? 0} items` : 'local-demo'} />
          <ProjectCell label={sourceMode === 'linear' ? 'ACTIVE / REVIEW' : 'DRAFT PR'} value={sourceMode === 'linear' ? `${linearSummary?.activeCount ?? 0} / ${linearSummary?.reviewCount ?? 0}` : '#15 · Review pending'} />
          <ProjectCell label="MEMBERS / ACTORS" value={`${members.length} / ${actors.length}`} />
          <ProjectCell label="STUDIO STATUS" value={sourceMode === 'linear' ? `${new Set(tasks.filter((task) => ['working', 'reviewing'].includes(task.status)).map((task) => task.assigneeId)).size} with active work · ${members.length} identities` : `${onlineCount} online · ${sleepingCount} asleep`} live />
        </section>

        <section className={styles.dashboard} ref={studioRef} id="studio">
          <article className={styles.studioCard}>
            <header className={styles.studioHead}>
              <div><h2>NestLinker Configurable 2D Studio</h2><p>{sourceMode === 'linear' ? 'Real Linear current state · one bird per person · active task shares rotate that bird through every office where they work.' : 'Choose a grid and reorder rooms. Outside edit mode, click a character or room for details.'}</p></div>
              <div className={styles.legend} aria-label="Character status legend">
                <span data-level="turbo"><i />Rapid updates</span>
                <span data-level="steady"><i />Steady progress</span>
                <span data-level="slack"><i />Low activity</span>
                <span data-level="waiting"><i />Waiting or blocked</span>
                <span data-level="sleep"><i />Asleep</span>
              </div>
            </header>
            <div className={styles.mapTools}>
              <b>Layout {layout.rows}×{layout.columns} · {layoutScene.zones.length} placed · {unplacedZones.length} unplaced · {actors.length} actors · {rotatingActorIds.size} rotating · +{extraActors} clones{hiddenMemberCount ? ` · ${hiddenMemberCount} members off-map` : ''}</b>
              {sourceMode === 'demo' && <>
                <button type="button" className={styles.flowAction} data-kind="forward" onClick={simulateForwardTransit}>Trigger forward move</button>
                <button type="button" className={styles.flowAction} data-kind="rollback" onClick={simulateRollbackTransit}>Trigger review rollback</button>
                <button type="button" className={styles.flowAction} data-kind="block" onClick={toggleBlockedDemo}>Toggle BLOCK</button>
              </>}
              <button type="button" className={styles.layoutEditButton} data-active={layoutEditing} onClick={() => {
                setLayoutEditing((current) => !current)
                setSelectedZoneId(null)
              }}>{layoutEditing ? 'Close room editor' : 'Edit room layout'}</button>
              <button type="button" onClick={sourceMode === 'linear' ? () => void loadLinearSnapshot() : resetDemo}>{sourceMode === 'linear' ? 'Reload Linear snapshot' : 'Reset demo'}</button>
              <button type="button" className={styles.castingAction} onClick={() => setDrawer({ type: 'casting' })}>Choose team birds</button>
              <button type="button" className={styles.widgetAction} onClick={openOfficeWidget}>Open floating office</button>
              <button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>Member progress</button>
              <button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>Team calendar</button>
            </div>
            {layoutEditing && <div className={styles.layoutEditorPage}>
              <StudioLayoutControls
                layout={layout}
                zones={TEAM_ZONES}
                unplacedZones={unplacedZones}
                zoneStats={zoneStats}
                selectedZoneId={selectedZoneId}
                activeWorkflowId={activeWorkflowId}
                onToggleEditing={() => {
                  setLayoutEditing(false)
                  setSelectedZoneId(null)
                }}
                onGridChange={changeLayoutGrid}
                onWorkflowChange={arrangeByWorkflow}
                onSlotChange={changeLayoutSlot}
                onSelectUnplacedZone={selectUnplacedZone}
                onArrangeWorkflow={() => arrangeByWorkflow()}
                onReset={resetLayout}
                onRemoveSelected={removeSelectedZone}
              />
            </div>}
            <div className={styles.mapViewport} ref={mapViewportRef}>
              <MeetingRoomDock onOpen={() => setDrawer({ type: 'meeting' })} />
              <div className={styles.mapStage} style={{ width: `${layoutScene.width * mapScale}px`, height: `${layoutScene.height * mapScale}px` }}>
                <div
                  className={styles.officeMap}
                  data-layout-editing={layoutEditing}
                  style={{
                    '--map-width': `${layoutScene.width}px`,
                    '--map-height': `${layoutScene.height}px`,
                    '--map-scale': mapScale,
                  } as CSSProperties}
                >
                  <CorridorNetwork slots={layoutScene.slots} rows={layout.rows} columns={layout.columns} />
                <div className={styles.corridor}><span>SHARED ROUTE · TASK HANDOFF · REVIEW FLOW</span></div>
                <div className={styles.officeSign}>{sourceMode === 'linear' ? `LINEAR · ${linearSummary?.queueCount ?? 0} TODO · ${linearSummary?.activeCount ?? 0} ACTIVE` : `${layout.rows} × ${layout.columns} WORKFLOW · ${actors.length} TASK ACTORS`}</div>
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
                      linearMode={sourceMode === 'linear'}
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
                    workflowZoneOrder={activeWorkflow.zoneOrder}
                    rotationShare={rotationShareByMemberZone.get(`${actor.member.id}:${actor.zone.id}`)}
                    isRotating={rotatingActorIds.has(actor.id)}
                    linearMode={sourceMode === 'linear'}
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
            </div>
          </article>

          <aside className={styles.sidebar}>
            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>{sourceMode === 'linear' ? 'Linear workload' : 'Team pulse'}</h3><small>{sourceMode === 'linear' ? 'Current state, not presence or productivity' : 'Sorted by recency and event density'}</small></div><button type="button" onClick={() => setDrawer({ type: 'kpi', tab: 'people' })}>All KPIs</button></header>
              {sourceMode === 'linear' && linearSummary ? <LinearStatusSummary summary={linearSummary} /> : <PulseSummary pulses={[...pulses.values()]} />}
              <div className={styles.pulseList}>
                {[...members].sort((a, b) => (pulses.get(a.id)?.age ?? 0) - (pulses.get(b.id)?.age ?? 0)).map((member) => {
                  const pulse = pulses.get(member.id)!
                  const memberActorCount = actorCountByMember.get(member.id) ?? 0
                  const memberTasks = tasks.filter((task) => task.assigneeId === member.id)
                  const memberActive = memberTasks.filter((task) => ['working', 'reviewing'].includes(task.status)).length
                  const memberQueued = memberTasks.filter((task) => task.status === 'queued').length
                  return (
                    <button type="button" className={styles.pulseRow} key={member.id} onClick={() => setDrawer({ type: 'member', id: member.id })}>
                      <PixelBird bird={member.bird} size={48} />
                      <span className={styles.pulseCopy}><b>{member.name}</b><small>{sourceMode === 'linear' ? `${memberActive} active · ${memberQueued} queued · ${formatCount(memberActorCount, 'identity bird')}` : `Updated ${shortAge(pulse.age)} · ${formatCount(memberActorCount, 'map actor')}`}</small></span>
                      <span className={styles.pulseScore}><b>{sourceMode === 'linear' ? `${member.kpi}%` : pulse.waiting ? 'WAIT' : pulse.sleeping ? 'SLEEP' : pulse.busyScore}</b><small>{sourceMode === 'linear' ? 'status proxy' : pulse.slackScore === null ? 'slack excluded' : `slack ${pulse.slackScore}`}</small></span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>State rules</h3><small>Every position has a data source</small></div>{sourceMode === 'demo' && <button type="button" onClick={cycleSleepThreshold}>{sleepThreshold}m</button>}</header>
              <div className={styles.ruleList}>
                {sourceMode === 'linear' ? <>
                  <Rule title="Identity">Exactly one bird per Linear member. Members with active work in multiple offices rotate between them instead of cloning.</Rule>
                  <Rule title="Time share">Office dwell time follows active task weight. Without estimates, each active Linear issue contributes one equal share.</Rule>
                  <Rule title="Queue pile">Todo height is the current item count. Cracked boxes mean arrival time is unknown at first connection.</Rule>
                  <Rule title="Position">In Progress maps to State & Data; In Review maps to QA. Several members in one office are all rendered in separate seats.</Rule>
                  <Rule title="KPI proxy">Progress is a transparent status-weighted snapshot, not an employee performance score.</Rule>
                </> : <>
                  <Rule title="Update density">Recent updates, more events, and parallel tasks increase the activity signal.</Rule>
                  <Rule title="Slack score">Inverse of the busy score; user, PR, and external waits are excluded.</Rule>
                  <Rule title="Actor clones">Each parallel task creates one visible task actor in its responsibility zone.</Rule>
                  <Rule title="Sleep state">After {sleepThreshold} minutes without an update, the actor moves to the dormant zone while the owner plate remains.</Rule>
                </>}
              </div>
            </section>

            <section className={styles.sideCard}>
              <header className={styles.sideHead}><div><h3>{sourceMode === 'linear' ? 'Linear activity' : 'Live activity'}</h3><small>{sourceMode === 'linear' ? `Snapshot ${linearSummary ? new Date(linearSummary.generatedAt).toLocaleString() : ''}` : `Demo time +${offsetMinutes} minutes`}</small></div><button type="button" onClick={() => setDrawer({ type: 'calendar', memberId: 'all' })}>Calendar</button></header>
              <div className={styles.feed}>
                {feed.slice(0, 8).map((event) => <div className={styles.feedItem} key={event.id}><time>{shortAge(event.minutes + offsetMinutes)}</time><span>{event.text}</span></div>)}
              </div>
            </section>
          </aside>
        </section>

        <footer className={styles.footerNote}>
          <span>{sourceMode === 'linear' ? 'Linear current-state snapshot is active; no emails, descriptions, comments, or tokens are stored.' : 'Interactive demo data is active; state scoring, task clones, cross-zone support, and sleep logic are fully functional.'}</span>
          <span>{sourceMode === 'linear' ? 'CURRENT STATE · HISTORY/WEBHOOK NOT YET CONNECTED' : 'READY FOR CODEX MCP · HOOKS · GITHUB · CALENDAR'}</span>
        </footer>
      </div>

      {drawer && (
        <Drawer
          drawer={drawer}
          members={members}
          tasks={tasks}
          actors={actors}
          pulses={pulses}
          projectKpis={projectKpis}
          calendarEvents={calendarEvents}
          sourceMode={sourceMode}
          offsetMinutes={offsetMinutes}
          onChangeBird={changeMemberBird}
          onClose={() => setDrawer(null)}
          onNavigate={setDrawer}
        />
      )}
    </main>
  )
}

function CorridorNetwork({ slots, rows, columns }: { slots: StudioLayoutSlot[]; rows: number; columns: number }) {
  if (!slots.length) return null
  const first = slots[0]
  const last = slots[slots.length - 1]
  const verticalLanes = Array.from({ length: Math.max(0, columns - 1) }, (_, column) => {
    const leftSlot = slots[column]
    const rightSlot = slots[column + 1]
    return {
      left: leftSlot.x + leftSlot.width,
      top: first.y,
      width: rightSlot.x - (leftSlot.x + leftSlot.width),
      height: last.y + last.height - first.y,
    }
  })
  const horizontalLanes = Array.from({ length: Math.max(0, rows - 1) }, (_, row) => {
    const upperSlot = slots[row * columns]
    const lowerSlot = slots[(row + 1) * columns]
    return {
      left: first.x,
      top: upperSlot.y + upperSlot.height,
      width: last.x + last.width - first.x,
      height: lowerSlot.y - (upperSlot.y + upperSlot.height),
    }
  })
  return <div className={styles.corridorNetwork} aria-hidden="true">
    {verticalLanes.map((lane, index) => <i key={`v-${index}`} data-direction="vertical" style={{ left: lane.left, top: lane.top, width: lane.width, height: lane.height }} />)}
    {horizontalLanes.map((lane, index) => <i key={`h-${index}`} data-direction="horizontal" style={{ left: lane.left, top: lane.top, width: lane.width, height: lane.height }} />)}
  </div>
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

function MeetingRoomDock({ onOpen }: { onOpen: () => void }) {
  return <button type="button" className={styles.meetingRoomDock} onClick={onOpen}>MEETING ROOM</button>
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

function LinearStatusSummary({ summary }: { summary: LinearStudioSummary }) {
  return <div className={styles.pulseSummary}><div><b>{summary.queueCount}</b><span>Todo</span></div><div><b>{summary.activeCount - summary.reviewCount}</b><span>In progress</span></div><div><b>{summary.reviewCount}</b><span>In review</span></div><div><b>{summary.doneCount}</b><span>Done</span></div></div>
}

function WorkZone({ slot, zone, members, tasks, actors, linearMode, editing, selected, onSelect }: {
  slot: StudioLayoutSlot
  zone: TeamZone
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  linearMode: boolean
  editing: boolean
  selected: boolean
  onSelect: () => void
}) {
  const owner = members.find((member) => member.id === zone.ownerId) ?? members.find((member) => member.assignedZone === zone.id)
  const zoneTasks = tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done')
  const queuedTasks = zoneTasks.filter((task) => task.status === 'queued')
  const workers = new Set(actors.filter((actor) => actor.zone.id === zone.id && !actor.pulse.sleeping).map((actor) => actor.member.id))
  const workerMembers = members.filter((member) => workers.has(member.id))
  const progress = zoneTasks.length ? Math.round(zoneTasks.reduce((sum, task) => sum + task.progress, 0) / zoneTasks.length) : 0
  const [backgroundX, backgroundY] = OFFICE_BACKGROUND_SLICES[zone.id] ?? [50, 50]
  const zoneStyle = {
    '--zone-x': `${zone.x}px`, '--zone-y': `${zone.y}px`, '--zone-width': `${zone.width}px`, '--zone-height': `${zone.height}px`,
    '--room-bg-x': `${backgroundX}%`, '--room-bg-y': `${backgroundY}%`,
  } as CSSProperties

  return (
    <button
      type="button"
      className={styles.zone}
      data-zone-id={zone.id}
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
      {linearMode && queuedTasks.length > 0 && <span className={styles.queuePile}>
        <span className={styles.queueBoxes}>{Array.from({ length: Math.min(queuedTasks.length, 8) }, (_, index) => <i key={index} />)}</span>
        <b>{queuedTasks.length} QUEUED</b>
        <small>ARRIVAL UNKNOWN · LEFT-TRUNCATED</small>
      </span>}
      {workerMembers.length > 1 && <span className={styles.zoneRoster}>
        <small>{workerMembers.length} PEOPLE HERE</small>
        <span>{workerMembers.map((member) => <span key={member.id} title={member.name}><PixelBird bird={member.bird} size={28} /><b>{member.name}</b></span>)}</span>
      </span>}
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

function AgentActor({ actor, zones, workflowZoneOrder, rotationShare, isRotating, linearMode, transit, onTransitEnd, onOpen }: {
  actor: ActorInstance
  zones: TeamZone[]
  workflowZoneOrder: string[]
  rotationShare?: { share: number; taskCount: number }
  isRotating: boolean
  linearMode: boolean
  transit?: ActorTransit
  onTransitEnd: () => void
  onOpen: () => void
}) {
  const crossZone = actor.zone.id !== actor.member.assignedZone
  const flowIndex = workflowZoneOrder.indexOf(actor.zone.id)
  const nextZone = zones.find((zone) => zone.id === workflowZoneOrder[flowIndex + 1])
  const facingForward = transit
    ? transit.route[5].x >= transit.route[0].x ? 1 : -1
    : actor.pulse.blocked && nextZone
      ? nextZone.x + nextZone.width / 2 >= actor.x ? 1 : -1
      : 1
  const motion = transit ? 'transit' : 'settled'
  const birdAnimation: BirdAnimation = actor.pulse.sleeping
    ? transit ? transit.reason === 'rotation' ? 'run' : 'walk' : 'sleep'
    : transit
      ? transit.reason === 'rotation' ? 'run' : 'walk'
      : actor.pulse.waiting || actor.pulse.blocked || actor.zone.id === 'lounge'
        ? 'sit'
        : actor.pulse.level === 'turbo'
          ? actor.member.bird === 'swift' ? 'fly' : 'run'
          : actor.task ? 'work' : 'idle'
  const fromZone = transit ? zones.find((zone) => zone.id === transit.fromZoneId) : undefined
  const toZone = transit ? zones.find((zone) => zone.id === transit.toZoneId) : undefined
  const taskLabel = transit
    ? `${transit.reason === 'rotation' ? 'Work rotation · ' : transit.direction === 'rollback' ? 'Review rollback · ' : ''}${fromZone?.name ?? transit.fromZoneId} → ${toZone?.name ?? transit.toZoneId}`
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
      data-transit-reason={transit?.reason ?? 'none'}
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
        {isRotating && <span className={styles.rotationBadge}>{transit ? '↻ RUNNING' : '↻ ROTATING'}</span>}
        {crossZone && <span className={styles.supportBadge}>Cross-zone support</span>}
        {transit?.direction === 'rollback' ? <span className={styles.rollbackBadge}>↩ ROLLBACK</span> : null}
        <span className={styles.thought}>{transit ? transit.direction === 'rollback' ? 'BACK' : '→' : actor.pulse.blocked ? 'BLOCK' : actor.pulse.waiting ? 'WAIT' : actor.pulse.sleeping ? 'Z Z' : actor.pulse.level === 'slack' ? '…' : ''}</span>
        <PixelBird bird={actor.member.bird} size={72} animation={birdAnimation} facing={facingForward} />
      </span>
      <span className={styles.actorName}>{actor.member.name}{crossZone ? ' · supporting outside owned zone' : ''}</span>
      <span className={styles.actorTask}>{taskLabel}</span>
      <span className={styles.actorMetric}>{transit
        ? transit.reason === 'rotation' ? 'RUNNING · ROTATION TRANSIT' : 'TRANSIT · BUSY/SLACK FROZEN'
        : linearMode && rotationShare
          ? `${Math.round(rotationShare.share * 100)}% DWELL · MOVE ≤ ${Math.ceil(rotationShare.share * 10 + 2)}S · ${rotationShare.taskCount} ${rotationShare.taskCount === 1 ? 'ISSUE' : 'ISSUES'}`
          : linearMode ? `LINEAR · ${actor.pulse.activeTasks.length} ACTIVE ISSUES` : pulseLabel(actor.pulse)}</span>
    </button>
  )
}

function Drawer({ drawer, members, tasks, actors, pulses, projectKpis, calendarEvents, sourceMode, offsetMinutes, onChangeBird, onClose, onNavigate }: {
  drawer: Exclude<DrawerState, null>
  members: TeamMember[]
  tasks: TeamTask[]
  actors: ActorInstance[]
  pulses: Map<string, MemberPulse>
  projectKpis: ProjectKpi[]
  calendarEvents: TeamCalendarEvent[]
  sourceMode: DataSourceMode
  offsetMinutes: number
  onChangeBird: (memberId: string, bird: BirdProfile) => void
  onClose: () => void
  onNavigate: (state: Exclude<DrawerState, null>) => void
}) {
  const title = drawer.type === 'member'
    ? members.find((member) => member.id === drawer.id)?.name ?? 'Member details'
    : drawer.type === 'zone'
      ? TEAM_ZONES.find((zone) => zone.id === drawer.id)?.name ?? 'Zone details'
      : drawer.type === 'kpi' ? 'Team KPIs'
        : drawer.type === 'calendar' ? 'Team calendar'
          : drawer.type === 'meeting' ? 'Meeting room' : 'Team bird casting'
  const subtitle = drawer.type === 'member' ? sourceMode === 'linear' ? 'Linear tasks, transparent status-weighted progress, and due dates' : 'Tasks, clones, personal metrics, and schedule'
    : drawer.type === 'zone' ? 'Fixed owner, current executors, and zone tasks'
      : drawer.type === 'kpi' ? 'Every progress value comes from an explainable task state'
        : drawer.type === 'calendar' ? 'Filter by member; select an event to open its responsibility zone'
          : drawer.type === 'meeting' ? 'Brainstorm inbox, Markdown materials, shared memos, and meeting summaries'
            : 'Play a short work-style test or choose any bird manually'

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={closeFromBackdrop}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="team-drawer-title">
        <header className={styles.drawerHead}><div><h2 id="team-drawer-title">{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className={styles.drawerBody}>
          {drawer.type === 'member' && <MemberDetail member={members.find((member) => member.id === drawer.id)!} tasks={tasks} pulse={pulses.get(drawer.id)!} sourceMode={sourceMode} offsetMinutes={offsetMinutes} />}
          {drawer.type === 'zone' && <ZoneDetail zone={TEAM_ZONES.find((zone) => zone.id === drawer.id)!} members={members} tasks={tasks} actors={actors} pulses={pulses} offsetMinutes={offsetMinutes} onOpenMember={(id) => onNavigate({ type: 'member', id })} />}
          {drawer.type === 'kpi' && <KpiDetail tab={drawer.tab} members={members} actors={actors} pulses={pulses} projectKpis={projectKpis} sourceMode={sourceMode} onChangeTab={(tab) => onNavigate({ type: 'kpi', tab })} onOpenMember={(id) => onNavigate({ type: 'member', id })} />}
          {drawer.type === 'calendar' && <CalendarDetail selectedMemberId={drawer.memberId} members={members} events={calendarEvents} onSelectMember={(memberId) => onNavigate({ type: 'calendar', memberId })} onOpenEvent={(memberIds, zoneId) => memberIds.length === 1 ? onNavigate({ type: 'member', id: memberIds[0] }) : onNavigate({ type: 'zone', id: zoneId })} />}
          {drawer.type === 'meeting' && <MeetingRoomPanel />}
          {drawer.type === 'casting' && <BirdCastingDetail members={members} onChangeBird={onChangeBird} />}
        </div>
      </aside>
    </div>
  )
}

const CASTING_QUESTIONS: Array<{
  prompt: string
  options: Array<{ label: string; archetype: BirdProfile['archetype'] }>
}> = [
  {
    prompt: 'When work gets uncertain, what do you do first?',
    options: [
      { label: 'Run a fast experiment', archetype: 'speed' },
      { label: 'Map the whole system', archetype: 'strategy' },
      { label: 'Make a clear prototype', archetype: 'craft' },
      { label: 'Stabilize the process', archetype: 'reliability' },
    ],
  },
  {
    prompt: 'What do teammates rely on you for?',
    options: [
      { label: 'Momentum', archetype: 'speed' },
      { label: 'Decisions', archetype: 'strategy' },
      { label: 'Taste and detail', archetype: 'craft' },
      { label: 'Consistency', archetype: 'reliability' },
    ],
  },
  {
    prompt: 'Pick your ideal work rhythm.',
    options: [
      { label: 'Short energetic bursts', archetype: 'speed' },
      { label: 'Long focused blocks', archetype: 'strategy' },
      { label: 'Iterate until it feels right', archetype: 'craft' },
      { label: 'A dependable daily cadence', archetype: 'reliability' },
    ],
  },
]

function BirdCastingDetail({ members, onChangeBird }: {
  members: TeamMember[]
  onChangeBird: (memberId: string, bird: BirdProfile) => void
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? '')
  const [answers, setAnswers] = useState<Array<BirdProfile['archetype'] | null>>([null, null, null])
  const member = members.find((candidate) => candidate.id === memberId) ?? members[0]
  const completed = answers.every(Boolean)
  const result = useMemo(() => {
    if (!completed || !member) return null
    const counts = answers.reduce<Record<BirdProfile['archetype'], number>>((current, answer) => {
      if (answer) current[answer] += 1
      return current
    }, { speed: 0, strategy: 0, craft: 0, reliability: 0 })
    const archetype = (Object.entries(counts) as Array<[BirdProfile['archetype'], number]>)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'reliability'
    const candidates = BIRD_CATALOG.filter((bird) => bird.archetype === archetype)
    const seed = [...member.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)
    return candidates[seed % candidates.length] ?? BIRD_CATALOG[0]
  }, [answers, completed, member])

  if (!member) return <article className={styles.taskCard}>No team members are available for casting.</article>

  return <>
    <section className={styles.castingMemberBar}>
      <PixelBird bird={member.bird} size={88} animation="idle" label={member.species} />
      <label><span>Choose a team member</span><select value={member.id} onChange={(event) => {
        setMemberId(event.target.value)
        setAnswers([null, null, null])
      }}>{members.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>
      <div><b>{member.name}</b><small>Current character · {member.species}</small></div>
    </section>

    <SectionTitle title="Three-question bird test" meta={completed ? 'Recommendation ready' : `${answers.filter(Boolean).length} / 3 answered`} />
    <div className={styles.castingQuiz}>{CASTING_QUESTIONS.map((question, questionIndex) => (
      <fieldset key={question.prompt}>
        <legend>{questionIndex + 1}. {question.prompt}</legend>
        <div>{question.options.map((option) => <button type="button" key={option.label} data-selected={answers[questionIndex] === option.archetype} onClick={() => setAnswers((current) => current.map((answer, index) => index === questionIndex ? option.archetype : answer))}>{option.label}</button>)}</div>
      </fieldset>
    ))}</div>
    {result && <section className={styles.castingResult}>
      <PixelBird bird={result.id} size={104} animation="idle" label={result.species} />
      <div><small>YOUR TEAM BIRD MATCH</small><h3>{result.species}</h3><p>A {result.archetype} archetype, selected from the answers above. This changes appearance only—tasks, KPIs, and Linear identity stay unchanged.</p></div>
      <button type="button" onClick={() => onChangeBird(member.id, result)}>Use this bird</button>
    </section>}

    <SectionTitle title="Or choose manually" meta={`${BIRD_CATALOG.length} animated birds`} />
    <div className={styles.birdGallery}>{BIRD_CATALOG.map((bird) => (
      <button type="button" key={bird.id} data-selected={member.bird === bird.id} onClick={() => onChangeBird(member.id, bird)}>
        <PixelBird bird={bird.id} size={66} animation="idle" />
        <span><b>{bird.species}</b><small>{bird.archetype}</small></span>
      </button>
    ))}</div>
  </>
}

function MemberDetail({ member, tasks, pulse, sourceMode, offsetMinutes }: { member: TeamMember; tasks: TeamTask[]; pulse: MemberPulse; sourceMode: DataSourceMode; offsetMinutes: number }) {
  const ownerZone = TEAM_ZONES.find((zone) => zone.id === member.assignedZone)!
  const memberTasks = tasks.filter((task) => task.assigneeId === member.id)
  return <>
    <section className={styles.memberHero}>
      <PixelBird bird={member.bird} size={128} label={member.species} />
      <div><h3>{member.name}</h3><p>{member.role} · {member.species}. Logical ownership: {ownerZone.name}. Map position is derived from the current floor and task state.</p><div className={styles.metricChips}>{sourceMode === 'linear' ? <><span>{pulse.activeTasks.length} active issues</span><span>{memberTasks.filter((task) => task.status === 'queued').length} queued</span><span>{memberTasks.length} total assigned</span><span>Status progress {member.kpi}%</span></> : <><span>Updated {shortAge(pulse.age)}</span><span>30m updates {pulse.effective30m}</span><span>Parallel tasks {pulse.activeTasks.length}</span><span>{pulseLabel(pulse)}</span></>}</div></div>
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
  const owner = members.find((member) => member.id === zone.ownerId) ?? members.find((member) => member.assignedZone === zone.id)
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

function KpiDetail({ tab, members, actors, pulses, projectKpis, sourceMode, onChangeTab, onOpenMember }: {
  tab: 'people' | 'project'
  members: TeamMember[]
  actors: ActorInstance[]
  pulses: Map<string, MemberPulse>
  projectKpis: ProjectKpi[]
  sourceMode: DataSourceMode
  onChangeTab: (tab: 'people' | 'project') => void
  onOpenMember: (id: string) => void
}) {
  const sleeping = [...pulses.values()].filter((pulse) => pulse.sleeping).length
  const actorCountByMember = new Map<string, number>()
  actors.forEach((actor) => actorCountByMember.set(actor.member.id, (actorCountByMember.get(actor.member.id) ?? 0) + 1))
  return <>
    <div className={styles.drawerTabs}><button type="button" data-active={tab === 'people'} onClick={() => onChangeTab('people')}>Member progress</button><button type="button" data-active={tab === 'project'} onClick={() => onChangeTab('project')}>Project metrics</button></div>
    <div className={styles.summaryGrid}><Summary label="Team members" value={members.length} /><Summary label={sourceMode === 'linear' ? 'Identity birds' : 'Map actors'} value={actors.length} /><Summary label="Parallel clones" value={Math.max(0, actors.length - actorCountByMember.size)} /><Summary label={sourceMode === 'linear' ? 'No active issues' : 'Sleeping members'} value={sourceMode === 'linear' ? members.filter((member) => !(pulses.get(member.id)?.activeTasks.length)).length : sleeping} /></div>
    {tab === 'people' ? <div className={styles.memberKpiList}>{members.map((member) => {
      const pulse = pulses.get(member.id)!
      const memberActorCount = actorCountByMember.get(member.id) ?? 0
      return <button type="button" className={styles.memberKpiRow} key={member.id} onClick={() => onOpenMember(member.id)}><PixelBird bird={member.bird} size={72} /><div><h4>{member.name} · {member.role}</h4><p>Owned zone {TEAM_ZONES.find((zone) => zone.id === member.assignedZone)?.name} · {sourceMode === 'linear' ? `${pulse.activeTasks.length} active issues` : `updated ${shortAge(pulse.age)}`} · {formatCount(memberActorCount, sourceMode === 'linear' ? 'identity bird' : 'map actor')}</p><ProgressBar value={member.kpi} /></div><span className={styles.kpiNumbers}><b>{member.kpi}%</b><small>{sourceMode === 'linear' ? 'status proxy' : pulse.slackScore === null ? 'wait excluded from slack' : `slack ${pulse.slackScore}`}</small></span></button>
    })}</div> : <div className={styles.projectKpis}>{projectKpis.map((kpi) => <article className={styles.projectKpi} key={kpi.label}><div><h4>{kpi.label}</h4><b>{kpi.current} / {kpi.target}</b></div><ProgressBar value={kpi.current / kpi.target * 100} /><p>{kpi.description}</p></article>)}</div>}
  </>
}

function CalendarDetail({ selectedMemberId, members, events, onSelectMember, onOpenEvent }: {
  selectedMemberId: string
  members: TeamMember[]
  events: TeamCalendarEvent[]
  onSelectMember: (id: string) => void
  onOpenEvent: (memberIds: string[], zoneId: string) => void
}) {
  return <>
    <div className={styles.calendarFilters}><button type="button" data-active={selectedMemberId === 'all'} onClick={() => onSelectMember('all')}>All members</button>{members.map((member) => <button type="button" data-active={selectedMemberId === member.id} key={member.id} onClick={() => onSelectMember(member.id)}><PixelBird bird={member.bird} size={28} />{member.name}</button>)}</div>
    <div className={styles.calendarWrap}><div className={styles.calendarGrid}>{TEAM_DAY_NAMES.map((day, dayIndex) => {
      const dayEvents = events.filter((event) => event.day === dayIndex && (selectedMemberId === 'all' || event.memberIds.includes(selectedMemberId)))
      return <section className={styles.dayColumn} key={day}><header><b>{day}</b><span>{formatCount(dayEvents.length, 'event')}</span></header><div>{dayEvents.length ? dayEvents.map((event) => <button type="button" className={styles.calendarEvent} key={event.id} onClick={() => onOpenEvent(event.memberIds, event.zoneId)}><time>{event.time}</time><b>{event.title}</b><span>{event.memberIds.map((id) => {
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
