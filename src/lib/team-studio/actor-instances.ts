import { pulseFor } from './activity-score'
import type { ActorInstance, TeamMember, TeamTask, TeamZone } from './types'

const DEFAULT_SLOT_RATIOS: Array<[number, number]> = [
  [.28, .53], [.52, .52], [.76, .53], [.22, .74],
  [.42, .73], [.62, .74], [.80, .73], [.52, .84],
]
const NAP_SLOT_RATIOS: Array<[number, number]> = [
  [.25, .48], [.25, .76], [.72, .48], [.72, .76],
]

function actorPosition(zone: TeamZone, slotIndex: number): [number, number] {
  const slots = zone.id === 'nap' ? NAP_SLOT_RATIOS : DEFAULT_SLOT_RATIOS
  const [xRatio, yRatio] = slots[slotIndex % slots.length]
  const x = Math.min(zone.width - 74, Math.max(74, zone.width * xRatio))
  const y = Math.min(zone.height - 48, Math.max(98, zone.height * yRatio))
  return [zone.x + x, zone.y + y]
}

export function buildActorInstances(
  members: TeamMember[],
  tasks: TeamTask[],
  zones: TeamZone[],
  offsetMinutes: number,
  sleepThresholdMinutes: number,
  identityMode = false,
  identityTaskByMember: Map<string, string> = new Map(),
): ActorInstance[] {
  const instances: ActorInstance[] = []
  const slotIndex = Object.fromEntries(zones.map((zone) => [zone.id, 0])) as Record<string, number>
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]))

  members.forEach((member) => {
    const pulse = pulseFor(member, tasks, offsetMinutes, sleepThresholdMinutes)
    let assignments: Array<{ task: TeamTask | null; zone: TeamZone }>

    const ownerZone = zoneById.get(member.assignedZone)
    const visibleTasks = pulse.activeTasks.flatMap((task) => {
      const zone = zoneById.get(task.zoneId)
      return zone ? [{ task, zone }] : []
    })
    const scheduledTaskId = identityTaskByMember.get(member.id)
    const identityTask = visibleTasks.find(({ task }) => task.id === scheduledTaskId)
      ?? visibleTasks.find(({ task }) => task.status === 'reviewing')
      ?? visibleTasks[0]

    if (pulse.sleeping) {
      const sleepZone = zoneById.get('nap') ?? ownerZone
      assignments = sleepZone ? [{ task: null, zone: sleepZone }] : []
    } else if (pulse.activeTasks.length === 0 || (pulse.level === 'slack' && pulse.age >= 20)) {
      const idleZone = zoneById.get('lounge') ?? ownerZone
      assignments = idleZone ? [{ task: pulse.activeTasks[0] ?? null, zone: idleZone }] : []
    } else if (identityMode && identityTask) {
      assignments = [identityTask]
    } else {
      assignments = visibleTasks.length
        ? visibleTasks
        : ownerZone ? [{ task: pulse.activeTasks[0] ?? null, zone: ownerZone }] : []
    }

    assignments.forEach(({ task, zone }, index) => {
      const slotPosition = slotIndex[zone.id]++
      const [x, y] = actorPosition(zone, slotPosition)
      instances.push({
        id: identityMode ? `${member.id}-identity` : `${member.id}-${task?.id ?? zone.id}`,
        member,
        task,
        zone,
        x,
        y,
        pulse,
        cloneIndex: index + 1,
        cloneTotal: assignments.length,
      })
    })
  })

  return instances
}
