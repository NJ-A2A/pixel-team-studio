import type { TeamMember, TeamTask, TeamZone } from './types'

export const IDENTITY_ROTATION_DWELL_CYCLE_MS = 10_000
export const IDENTITY_ROTATION_TRANSIT_MS = 1_800

export type IdentityRotationSegment = {
  zoneId: string
  taskId: string
  taskCount: number
  weight: number
  share: number
  dwellMs: number
  segmentMs: number
}

export type IdentityRotationPlan = {
  memberId: string
  segments: IdentityRotationSegment[]
  totalMs: number
}

export function buildIdentityRotationPlans(
  members: TeamMember[],
  tasks: TeamTask[],
  zones: TeamZone[],
): IdentityRotationPlan[] {
  const visibleZoneIds = new Set(zones.map((zone) => zone.id))

  return members.map((member) => {
    const activeTasks = tasks.filter((task) => (
      task.assigneeId === member.id
      && ['working', 'reviewing'].includes(task.status)
      && visibleZoneIds.has(task.zoneId)
    ))
    const grouped = new Map<string, TeamTask[]>()
    activeTasks.forEach((task) => grouped.set(task.zoneId, [...(grouped.get(task.zoneId) ?? []), task]))
    const totalWeight = activeTasks.reduce((sum, task) => sum + Math.max(.01, task.workShare ?? 1), 0)
    const segments = [...grouped.entries()].map<IdentityRotationSegment>(([zoneId, zoneTasks]) => {
      const weight = zoneTasks.reduce((sum, task) => sum + Math.max(.01, task.workShare ?? 1), 0)
      const share = totalWeight ? weight / totalWeight : 1
      const dwellMs = Math.round(IDENTITY_ROTATION_DWELL_CYCLE_MS * share)
      return {
        zoneId,
        taskId: zoneTasks[0].id,
        taskCount: zoneTasks.length,
        weight,
        share,
        dwellMs,
        segmentMs: dwellMs + (grouped.size > 1 ? IDENTITY_ROTATION_TRANSIT_MS : 0),
      }
    })
    return {
      memberId: member.id,
      segments,
      totalMs: segments.reduce((sum, segment) => sum + segment.segmentMs, 0),
    }
  })
}

export function rotationTaskByMember(plans: IdentityRotationPlan[], elapsedMs: number): Map<string, string> {
  const selections = new Map<string, string>()
  plans.forEach((plan) => {
    if (!plan.segments.length || plan.totalMs <= 0) return
    let cursor = ((elapsedMs % plan.totalMs) + plan.totalMs) % plan.totalMs
    const selected = plan.segments.find((segment) => {
      if (cursor < segment.segmentMs) return true
      cursor -= segment.segmentMs
      return false
    }) ?? plan.segments[0]
    selections.set(plan.memberId, selected.taskId)
  })
  return selections
}
