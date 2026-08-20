import type { MemberPulse, TeamMember, TeamTask, TeamTaskStatus } from './types'

const ACTIVE_TASK_STATUSES: TeamTaskStatus[] = ['working', 'reviewing', 'waiting', 'blocked']

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function activeTasksFor(memberId: string, tasks: TeamTask[]) {
  return tasks.filter((task) => task.assigneeId === memberId && ACTIVE_TASK_STATUSES.includes(task.status))
}

export function currentAge(lastUpdateMinutes: number, offsetMinutes: number) {
  return Math.max(0, lastUpdateMinutes + offsetMinutes)
}

export function pulseFor(
  member: TeamMember,
  tasks: TeamTask[],
  offsetMinutes: number,
  sleepThresholdMinutes: number,
): MemberPulse {
  const age = currentAge(member.lastUpdateMinutes, offsetMinutes)
  const activeTasks = activeTasksFor(member.id, tasks)
  const waiting = member.mode === 'waiting' || activeTasks.some((task) => task.status === 'waiting')
  const blocked = member.mode === 'blocked' || activeTasks.some((task) => task.status === 'blocked')
  const sleeping = !waiting && !blocked && age >= sleepThresholdMinutes
  const effective30m = Math.max(0, member.updates30m - Math.floor(offsetMinutes / 8))
  const effective2h = Math.max(0, member.updates2h - Math.floor(offsetMinutes / 30))
  const freshnessScore = Math.max(0, 50 - age * 1.5)
  const frequencyScore = Math.min(30, effective30m * 3 + effective2h * 0.5)
  const parallelTaskLoad = Math.min(20, activeTasks.length * 10)
  const busyScore = clamp(Math.round(freshnessScore + frequencyScore + parallelTaskLoad))
  const slackScore = waiting || blocked ? null : clamp(100 - busyScore)

  let level: MemberPulse['level'] = 'steady'
  if (sleeping) level = 'sleep'
  else if (blocked) level = 'blocked'
  else if (waiting) level = 'waiting'
  else if (busyScore >= 92) level = 'turbo'
  else if (busyScore >= 65) level = 'busy'
  else if (busyScore < 35) level = 'slack'

  return {
    age,
    activeTasks,
    waiting,
    blocked,
    sleeping,
    busyScore,
    slackScore,
    level,
    effective30m,
    effective2h,
  }
}

export function pulseLabel(pulse: MemberPulse) {
  if (pulse.level === 'sleep') return `Asleep · no update for ${Math.round(pulse.age)}m`
  if (pulse.level === 'waiting') return 'Waiting externally · slack excluded'
  if (pulse.level === 'blocked') return 'Blocked · slack excluded'
  if (pulse.level === 'turbo') return `Busy ${pulse.busyScore} · slack ${pulse.slackScore}`
  if (pulse.level === 'busy') return `Progress ${pulse.busyScore} · slack ${pulse.slackScore}`
  if (pulse.level === 'steady') return `Steady ${pulse.busyScore} · slack ${pulse.slackScore}`
  return `Slack ${pulse.slackScore} · busy ${pulse.busyScore}`
}

export function shortAge(minutes: number) {
  const value = Math.round(minutes)
  if (value < 1) return 'just now'
  if (value < 60) return `${value}m ago`
  return `${Math.floor(value / 60)}h ${value % 60}m ago`
}

export const taskStatusLabel = (status: TeamTaskStatus) => ({
  working: 'In progress',
  reviewing: 'In review',
  waiting: 'Waiting',
  blocked: 'Blocked',
  paused: 'Paused',
  queued: 'Queued',
  done: 'Done',
})[status]
