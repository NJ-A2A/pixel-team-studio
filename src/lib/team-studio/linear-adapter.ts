import type { ProjectKpi, TeamCalendarEvent, TeamFeedEvent, TeamMember, TeamTask } from './types'

export type LinearSnapshot = {
  schema: 'pixel-team-linear-snapshot/1'
  generatedAt: string
  team: { id: string; name: string }
  statuses: Array<{ id: string; name: string; type: string }>
  members: Array<{ id: string; name: string; displayName: string; isActive: boolean }>
  projects: Array<{ id: string; name: string; status: string | null; statusType: string | null; targetDate: string | null }>
  issues: Array<{
    id: string
    title: string
    status: string
    statusType: string
    priority: string
    dueDate: string | null
    createdAt: string
    updatedAt: string
    startedAt: string | null
    completedAt: string | null
    assigneeId: string | null
    projectId: string | null
    labels: string[]
  }>
}

export type LinearStudioSummary = {
  teamName: string
  generatedAt: string
  issueCount: number
  queueCount: number
  activeCount: number
  reviewCount: number
  doneCount: number
  canceledCount: number
  statusCounts: Record<string, number>
}

export type LinearStudioData = {
  members: TeamMember[]
  tasks: TeamTask[]
  feed: TeamFeedEvent[]
  projectKpis: ProjectKpi[]
  calendarEvents: TeamCalendarEvent[]
  summary: LinearStudioSummary
}

const fallbackBirds = ['sparrow', 'pigeon', 'falcon', 'bowerbird']
const fallbackZones = ['story', 'frontend', 'ops', 'visual']

const statusProgress: Record<string, number> = {
  backlog: 5,
  unstarted: 20,
  started: 55,
  completed: 100,
  canceled: 0,
  duplicate: 100,
}

function minutesBetween(earlier: string, later: string) {
  return Math.max(0, Math.round((Date.parse(later) - Date.parse(earlier)) / 60_000))
}

function taskStatus(issue: LinearSnapshot['issues'][number]): TeamTask['status'] {
  if (issue.statusType === 'completed' || issue.statusType === 'canceled' || issue.statusType === 'duplicate') return 'done'
  if (issue.statusType === 'unstarted' || issue.statusType === 'backlog') return 'queued'
  if (issue.status === 'In Review') return 'reviewing'
  return 'working'
}

function taskZone(issue: LinearSnapshot['issues'][number]) {
  if (issue.statusType === 'backlog') return 'story'
  if (issue.statusType === 'unstarted') return 'frontend'
  if (issue.status === 'In Review') return 'qa'
  if (issue.statusType === 'started') return 'backend'
  return 'release'
}

function statusCount(issues: LinearSnapshot['issues'], status: string) {
  return issues.filter((issue) => issue.status === status).length
}

function weightedProgress(issues: LinearSnapshot['issues']) {
  if (!issues.length) return 0
  return Math.round(issues.reduce((sum, issue) => sum + (statusProgress[issue.statusType] ?? 0), 0) / issues.length)
}

export function adaptLinearSnapshot(snapshot: LinearSnapshot): LinearStudioData {
  const snapshotTime = snapshot.generatedAt
  const members = snapshot.members.map<TeamMember>((sourceMember, index) => {
    const profile = {
      bird: fallbackBirds[index % fallbackBirds.length],
      species: 'Studio Bird',
      zone: fallbackZones[index % fallbackZones.length],
      role: 'Linear team member',
    }
    const assigned = snapshot.issues.filter((issue) => issue.assigneeId === sourceMember.id)
    const active = assigned.filter((issue) => issue.statusType === 'started')
    const queued = assigned.filter((issue) => ['unstarted', 'backlog'].includes(issue.statusType))
    const done = assigned.filter((issue) => ['completed', 'duplicate'].includes(issue.statusType))
    const urgent = assigned.filter((issue) => issue.priority === 'Urgent')
    const urgentStarted = urgent.filter((issue) => issue.statusType === 'started').length
    const latestUpdate = assigned.reduce<string | null>((latest, issue) => !latest || issue.updatedAt > latest ? issue.updatedAt : latest, null)
    const actualAge = latestUpdate ? minutesBetween(latestUpdate, snapshotTime) : 60 * 24 * 30

    return {
      id: sourceMember.id,
      name: sourceMember.name,
      role: `${profile.role} · ${assigned.length} assigned issues`,
      bird: profile.bird,
      species: profile.species,
      assignedZone: profile.zone,
      lastUpdateMinutes: active.length ? 0 : actualAge,
      updates30m: Math.min(10, active.length),
      updates2h: Math.min(24, active.length + queued.length),
      kpi: weightedProgress(assigned),
      kpis: [
        { label: 'Started or in review', current: active.length, target: Math.max(assigned.length, 1) },
        { label: 'Terminal completion', current: done.length, target: Math.max(assigned.length, 1) },
        { label: 'Urgent items started', current: urgentStarted, target: Math.max(urgent.length, 1) },
      ],
      schedule: assigned
        .filter((issue) => issue.dueDate)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 5)
        .map((issue) => ({ time: issue.dueDate!, title: `${issue.id} · ${issue.title}` })),
    }
  })

  const memberIds = new Set(members.map((member) => member.id))
  const fallbackAssignee = members[0]?.id ?? 'linear-unassigned'
  const tasks = snapshot.issues.map<TeamTask>((issue) => ({
    id: issue.id,
    title: issue.title,
    short: `${issue.id} · ${issue.status}`,
    assigneeId: issue.assigneeId && memberIds.has(issue.assigneeId) ? issue.assigneeId : fallbackAssignee,
    zoneId: taskZone(issue),
    progress: issue.status === 'In Review' ? 80 : statusProgress[issue.statusType] ?? 0,
    status: taskStatus(issue),
    lastUpdateMinutes: minutesBetween(issue.updatedAt, snapshotTime),
    due: issue.dueDate ? `Due ${issue.dueDate}` : 'No due date',
    note: issue.statusType === 'unstarted'
      ? 'Linear current-state snapshot · arrival time is left-truncated'
      : `Linear ${issue.status} · ${issue.priority}`,
  }))

  const statusCounts = Object.fromEntries(snapshot.statuses.map((status) => [status.name, statusCount(snapshot.issues, status.name)]))
  const summary: LinearStudioSummary = {
    teamName: snapshot.team.name,
    generatedAt: snapshot.generatedAt,
    issueCount: snapshot.issues.length,
    queueCount: statusCount(snapshot.issues, 'Todo'),
    activeCount: statusCount(snapshot.issues, 'In Progress') + statusCount(snapshot.issues, 'In Review'),
    reviewCount: statusCount(snapshot.issues, 'In Review'),
    doneCount: statusCount(snapshot.issues, 'Done'),
    canceledCount: statusCount(snapshot.issues, 'Canceled'),
    statusCounts,
  }

  const projectKpis = snapshot.projects.map<ProjectKpi>((project) => {
    const issues = snapshot.issues.filter((issue) => issue.projectId === project.id)
    const progress = weightedProgress(issues)
    return {
      label: project.name,
      current: Math.round(progress / 100 * Math.max(issues.length, 1)),
      target: Math.max(issues.length, 1),
      description: `${issues.length} issues · weighted status progress ${progress}% · ${project.status ?? 'No project status'}`,
    }
  })

  const calendarEvents = snapshot.issues
    .filter((issue) => issue.dueDate && issue.assigneeId && memberIds.has(issue.assigneeId))
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 25)
    .flatMap<TeamCalendarEvent>((issue) => {
      const day = new Date(`${issue.dueDate}T00:00:00Z`).getUTCDay() - 1
      if (day < 0 || day > 4) return []
      return [{ id: `linear-${issue.id}`, day, time: `Due ${issue.dueDate}`, title: `${issue.id} · ${issue.title}`, memberIds: [issue.assigneeId!], zoneId: taskZone(issue) }]
    })

  const memberName = new Map(members.map((member) => [member.id, member.name]))
  const feed = snapshot.issues.slice(0, 10).map<TeamFeedEvent>((issue) => ({
    id: `linear-feed-${issue.id}`,
    minutes: minutesBetween(issue.updatedAt, snapshotTime),
    text: `${issue.id} is ${issue.status}${issue.assigneeId ? ` · ${memberName.get(issue.assigneeId) ?? 'Unassigned'}` : ' · Unassigned'}.`,
  }))

  return { members, tasks, feed, projectKpis, calendarEvents, summary }
}
