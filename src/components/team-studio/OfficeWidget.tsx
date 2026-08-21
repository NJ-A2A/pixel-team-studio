import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { birdAvatar, TEAM_ZONES } from '@/lib/team-studio/demo-data'
import { BIRD_ASSIGNMENTS_STORAGE_KEY, BIRD_CATALOG } from '@/lib/team-studio/bird-catalog'
import { buildIdentityRotationPlans, rotationTaskByMember } from '@/lib/team-studio/identity-rotation'
import { adaptLinearSnapshot, type LinearSnapshot, type LinearStudioData } from '@/lib/team-studio/linear-adapter'
import type { TeamMember } from '@/lib/team-studio/types'
import { useStudioLocale } from '@/lib/team-studio/i18n'

import { LanguageSwitch } from './LanguageSwitch'
import { MeetingRoomPanel } from './MeetingRoomPanel'
import styles from './OfficeWidget.module.css'

const WIDGET_ZONE_IDS = ['story', 'frontend', 'backend', 'qa']
const ROOM_SLICES: Record<string, [number, number]> = {
  story: [0, 0], frontend: [100, 0], backend: [0, 50], qa: [100, 50],
}
const ROOM_CENTERS: Record<string, [number, number]> = {
  story: [25, 27], frontend: [75, 27], backend: [25, 73], qa: [75, 73],
}

function withSavedBirds(members: TeamMember[]) {
  try {
    const assignments = JSON.parse(window.localStorage.getItem(BIRD_ASSIGNMENTS_STORAGE_KEY) ?? '{}') as Record<string, string>
    return members.map((member) => {
      const bird = BIRD_CATALOG.find((candidate) => candidate.id === assignments[member.id])
      return bird ? { ...member, bird: bird.id, species: bird.species } : member
    })
  } catch {
    return members
  }
}

export function OfficeWidget() {
  const { t, zoneName } = useStudioLocale()
  const [data, setData] = useState<LinearStudioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [now, setNow] = useState(0)
  const [epoch, setEpoch] = useState(0)
  const [movingMembers, setMovingMembers] = useState<Set<string>>(() => new Set())
  const [meetingOpen, setMeetingOpen] = useState(false)
  const previousZoneRef = useRef<Map<string, string>>(new Map())
  const widgetZones = useMemo(() => TEAM_ZONES.filter((zone) => WIDGET_ZONE_IDS.includes(zone.id)), [])

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const response = await fetch('/team-studio/linear-snapshot.local.json', { cache: 'no-store' })
      if (!response.ok) throw new Error(String(response.status))
      const snapshot = await response.json() as LinearSnapshot
      const adapted = adaptLinearSnapshot(snapshot)
      const next = { ...adapted, members: withSavedBirds(adapted.members) }
      const start = Date.now()
      setData(next)
      setEpoch(start)
      setNow(start)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [])

  const plans = useMemo(() => data ? buildIdentityRotationPlans(data.members, data.tasks, widgetZones) : [], [data, widgetZones])
  const selections = useMemo(() => rotationTaskByMember(plans, now - epoch), [plans, now, epoch])
  const activeZoneByMember = useMemo(() => new Map((data?.members ?? []).flatMap((member) => {
    const taskId = selections.get(member.id)
    const task = data?.tasks.find((candidate) => candidate.id === taskId)
    return task ? [[member.id, task.zoneId] as const] : []
  })), [data, selections])

  useEffect(() => {
    const next = new Map(activeZoneByMember)
    const changed = [...next].filter(([memberId, zoneId]) => {
      const previous = previousZoneRef.current.get(memberId)
      return previous && previous !== zoneId
    }).map(([memberId]) => memberId)
    previousZoneRef.current = next
    if (!changed.length) return
    setMovingMembers((current) => new Set([...current, ...changed]))
    const timer = window.setTimeout(() => setMovingMembers((current) => {
      const updated = new Set(current)
      changed.forEach((memberId) => updated.delete(memberId))
      return updated
    }), 1500)
    return () => window.clearTimeout(timer)
  }, [activeZoneByMember])

  const activeMembers = data?.members.filter((member) => activeZoneByMember.has(member.id)) ?? []
  const idleMembers = data?.members.filter((member) => !activeZoneByMember.has(member.id)) ?? []

  return <main className={styles.widget}>
    <header>
      <div><span className={styles.liveDot} /><span><b>{t('widget.title')}</b><small>{data?.summary.teamName ?? 'Linear'} · {t('widget.live')}</small></span></div>
      <nav><LanguageSwitch compact /><button type="button" onClick={() => void load()} aria-label={t('action.refresh')}>↻</button><a href="/?source=linear" target="_blank" rel="noreferrer">{t('widget.openFull')}</a></nav>
    </header>

    <section className={styles.summary}>
      <span><b>{data?.summary.activeCount ?? 0}</b> {t('widget.active')}</span>
      <span><b>{data?.summary.reviewCount ?? 0}</b> {t('widget.review')}</span>
      <span><b>{data?.summary.queueCount ?? 0}</b> {t('widget.queued')}</span>
      <span><b>{data?.members.length ?? 0}</b> {t('widget.birds')}</span>
    </section>

    <section className={styles.office} aria-label="Compact live office">
      <button type="button" className={styles.meetingMini} onClick={() => setMeetingOpen(true)}>{t('meeting.room')}</button>
      {widgetZones.map((zone) => {
        const [backgroundX, backgroundY] = ROOM_SLICES[zone.id] ?? [50, 50]
        const zoneTasks = data?.tasks.filter((task) => task.zoneId === zone.id && task.status !== 'done') ?? []
        const peopleHere = activeMembers.filter((member) => activeZoneByMember.get(member.id) === zone.id)
        return <article key={zone.id} style={{ '--room-x': `${backgroundX}%`, '--room-y': `${backgroundY}%` } as CSSProperties}>
          <div><b>{zoneName(zone.id, zone.name)}</b><small>{t('room.peopleTasks', { people: peopleHere.length, tasks: zoneTasks.length })}</small></div>
          {zoneTasks.filter((task) => task.status === 'queued').length > 0 && <em>{t('room.queued', { count: zoneTasks.filter((task) => task.status === 'queued').length })}</em>}
        </article>
      })}
      <div className={styles.widgetActors}>{activeMembers.map((member) => {
        const zoneId = activeZoneByMember.get(member.id)!
        const [left, top] = ROOM_CENTERS[zoneId] ?? [50, 50]
        const peers = activeMembers.filter((candidate) => activeZoneByMember.get(candidate.id) === zoneId)
        const peerIndex = peers.findIndex((candidate) => candidate.id === member.id)
        return <span className={styles.widgetActor} data-moving={movingMembers.has(member.id)} key={member.id} style={{ '--actor-left': `${left + (peerIndex - (peers.length - 1) / 2) * 8}%`, '--actor-top': `${top}%` } as CSSProperties}>
          <i style={{ backgroundImage: `url(${birdAvatar(member.bird)})` }} /><b>{member.name}</b><small>{movingMembers.has(member.id) ? t('widget.running') : data?.tasks.find((task) => task.id === selections.get(member.id))?.short}</small>
        </span>
      })}</div>
      {loading && <div className={styles.widgetState}>{t('widget.loading')}</div>}
      {failed && <div className={styles.widgetState}>{t('widget.unavailable')} <button type="button" onClick={() => void load()}>{t('action.retry')}</button></div>}
    </section>

    <footer><span>{t('widget.offDesk')}</span><div>{idleMembers.map((member) => <span key={member.id} title={member.name} style={{ backgroundImage: `url(${birdAvatar(member.bird)})` }} />)}</div><small>{data ? new Date(data.summary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} {t('widget.snapshot')}</small></footer>
    {meetingOpen && <div className={styles.meetingOverlay} role="dialog" aria-modal="true" aria-label={t('meeting.room')}><section><header><div><b>{t('meeting.room')}</b><small>{t('meeting.shared')}</small></div><button type="button" onClick={() => setMeetingOpen(false)} aria-label="Close">×</button></header><div><MeetingRoomPanel /></div></section></div>}
  </main>
}
