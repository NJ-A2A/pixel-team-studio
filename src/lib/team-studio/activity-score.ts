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
  if (pulse.level === 'sleep') return `已睡 · ${Math.round(pulse.age)}m 无更新`
  if (pulse.level === 'waiting') return '等待外部事件 · 不计摸鱼'
  if (pulse.level === 'blocked') return '被阻塞 · 不计摸鱼'
  if (pulse.level === 'turbo') return `忙碌 ${pulse.busyScore} · 摸鱼 ${pulse.slackScore}`
  if (pulse.level === 'busy') return `推进 ${pulse.busyScore} · 摸鱼 ${pulse.slackScore}`
  if (pulse.level === 'steady') return `正常 ${pulse.busyScore} · 摸鱼 ${pulse.slackScore}`
  return `摸鱼 ${pulse.slackScore} · 忙碌 ${pulse.busyScore}`
}

export function shortAge(minutes: number) {
  const value = Math.round(minutes)
  if (value < 1) return '刚刚'
  if (value < 60) return `${value} 分钟前`
  return `${Math.floor(value / 60)} 小时 ${value % 60} 分前`
}

export const taskStatusLabel = (status: TeamTaskStatus) => ({
  working: '进行中',
  reviewing: '审查中',
  waiting: '等待中',
  blocked: '被阻塞',
  paused: '暂停',
  queued: '待开始',
  done: '已完成',
})[status]
