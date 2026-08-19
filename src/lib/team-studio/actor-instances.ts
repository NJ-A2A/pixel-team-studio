import { pulseFor } from './activity-score'
import type { ActorInstance, TeamMember, TeamTask, TeamZone } from './types'

const ZONE_SLOTS: Record<string, Array<[number, number]>> = {
  story: [[208, 112], [292, 112], [80, 168]],
  visual: [[224, 108], [304, 108], [60, 160]],
  frontend: [[56, 120], [140, 120], [216, 120]],
  backend: [[244, 132], [316, 132], [60, 156]],
  lounge: [[116, 152], [200, 152], [256, 88]],
  qa: [[204, 128], [284, 128], [60, 140]],
  release: [[208, 104], [288, 104], [88, 128]],
  ops: [[248, 112], [320, 112], [124, 164]],
  nap: [[60, 36], [60, 116], [256, 36], [256, 116]],
}

export function buildActorInstances(
  members: TeamMember[],
  tasks: TeamTask[],
  zones: TeamZone[],
  offsetMinutes: number,
  sleepThresholdMinutes: number,
): ActorInstance[] {
  const instances: ActorInstance[] = []
  const slotIndex = Object.fromEntries(zones.map((zone) => [zone.id, 0])) as Record<string, number>
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]))

  members.forEach((member) => {
    const pulse = pulseFor(member, tasks, offsetMinutes, sleepThresholdMinutes)
    let assignments: Array<{ task: TeamTask | null; zone: TeamZone }>

    if (pulse.sleeping) {
      assignments = [{ task: null, zone: zoneById.get('nap')! }]
    } else if (pulse.activeTasks.length === 0 || (pulse.level === 'slack' && pulse.age >= 20)) {
      assignments = [{ task: pulse.activeTasks[0] ?? null, zone: zoneById.get('lounge')! }]
    } else {
      assignments = pulse.activeTasks.map((task) => ({ task, zone: zoneById.get(task.zoneId)! }))
    }

    assignments.forEach(({ task, zone }, index) => {
      const slots = ZONE_SLOTS[zone.id] ?? [[zone.width / 2, zone.height / 2] as [number, number]]
      const slotPosition = slotIndex[zone.id]++
      const [slotX, slotY] = slots[slotPosition % slots.length]
      instances.push({
        id: `${member.id}-${task?.id ?? zone.id}`,
        member,
        task,
        zone,
        x: zone.x + slotX,
        y: zone.y + slotY,
        pulse,
        cloneIndex: index + 1,
        cloneTotal: assignments.length,
      })
    })
  })

  return instances
}
