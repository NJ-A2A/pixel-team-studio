export type TeamActivityLevel =
  | 'turbo'
  | 'busy'
  | 'steady'
  | 'slack'
  | 'waiting'
  | 'blocked'
  | 'sleep'

export type TeamTaskStatus = 'working' | 'reviewing' | 'waiting' | 'blocked' | 'paused' | 'queued' | 'done'

export type TeamZone = {
  id: string
  name: string
  short: string
  ownerId: string | null
  theme: 'pink' | 'yellow' | 'blue' | 'mint' | 'lavender' | 'coral' | 'white' | 'sleep'
  x: number
  y: number
  width: number
  height: number
}

export type TeamKpi = {
  label: string
  current: number
  target: number
}

export type TeamMember = {
  id: string
  name: string
  role: string
  bird: string
  species: string
  assignedZone: string
  lastUpdateMinutes: number
  updates30m: number
  updates2h: number
  kpi: number
  mode?: 'waiting' | 'blocked'
  kpis: TeamKpi[]
  schedule: Array<{ time: string; title: string }>
}

export type TeamTask = {
  id: string
  title: string
  short: string
  assigneeId: string
  zoneId: string
  progress: number
  status: TeamTaskStatus
  lastUpdateMinutes: number
  due: string
  note?: string
}

export type ProjectKpi = TeamKpi & {
  description: string
}

export type TeamCalendarEvent = {
  id: string
  day: number
  time: string
  title: string
  memberIds: string[]
  zoneId: string
}

export type TeamFeedEvent = {
  id: string
  minutes: number
  text: string
}

export type MemberPulse = {
  age: number
  activeTasks: TeamTask[]
  waiting: boolean
  blocked: boolean
  sleeping: boolean
  busyScore: number
  slackScore: number | null
  level: TeamActivityLevel
  effective30m: number
  effective2h: number
}

export type ActorInstance = {
  id: string
  member: TeamMember
  task: TeamTask | null
  zone: TeamZone
  x: number
  y: number
  pulse: MemberPulse
  cloneIndex: number
  cloneTotal: number
}
