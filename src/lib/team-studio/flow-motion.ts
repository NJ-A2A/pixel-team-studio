import type { ActorInstance, TeamZone } from './types'

export type TransitDirection = 'forward' | 'rollback' | 'neutral'

export type TransitPoint = {
  x: number
  y: number
}

export type ActorTransit = {
  actorId: string
  fromZoneId: string
  toZoneId: string
  direction: TransitDirection
  durationMs: number
  route: [TransitPoint, TransitPoint, TransitPoint, TransitPoint, TransitPoint, TransitPoint]
}

const FORWARD_DURATION_MS = 2200
const ROLLBACK_DURATION_MS = 3200
const NEUTRAL_DURATION_MS = 2500
const DOOR_INSET = 10

const zoneCenter = (zone: TeamZone): TransitPoint => ({
  x: zone.x + zone.width / 2,
  y: zone.y + zone.height / 2,
})

export function doorAnchor(zone: TeamZone, towardZone: TeamZone): TransitPoint {
  const from = zoneCenter(zone)
  const toward = zoneCenter(towardZone)
  const dx = toward.x - from.x
  const dy = toward.y - from.y

  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: dx < 0 ? zone.x + DOOR_INSET : zone.x + zone.width - DOOR_INSET,
      y: zone.y + zone.height * .7,
    }
  }

  return {
    x: zone.x + zone.width * .5,
    y: dy < 0 ? zone.y + DOOR_INSET : zone.y + zone.height - DOOR_INSET,
  }
}

function corridorY(fromZone: TeamZone, toZone: TeamZone, sceneHeight: number): number {
  const fromCenter = zoneCenter(fromZone)
  const toCenter = zoneCenter(toZone)
  const overlapsVertically = Math.abs(fromCenter.y - toCenter.y) < Math.min(fromZone.height, toZone.height) * .45

  if (!overlapsVertically) {
    const upper = fromCenter.y < toCenter.y ? fromZone : toZone
    const lower = upper === fromZone ? toZone : fromZone
    return (upper.y + upper.height + lower.y) / 2
  }

  const below = Math.max(fromZone.y + fromZone.height, toZone.y + toZone.height) + 7
  if (below < sceneHeight - 8) return below
  return Math.max(8, Math.min(fromZone.y, toZone.y) - 7)
}

function transitDirection(fromZoneId: string, toZoneId: string, flowOrder: string[]): TransitDirection {
  const fromIndex = flowOrder.indexOf(fromZoneId)
  const toIndex = flowOrder.indexOf(toZoneId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return 'neutral'
  return toIndex < fromIndex ? 'rollback' : 'forward'
}

function durationFor(direction: TransitDirection): number {
  if (direction === 'rollback') return ROLLBACK_DURATION_MS
  if (direction === 'forward') return FORWARD_DURATION_MS
  return NEUTRAL_DURATION_MS
}

function routeBetween(
  previous: ActorInstance,
  next: ActorInstance,
  sceneHeight: number,
): ActorTransit['route'] {
  const from = { x: previous.x, y: previous.y }
  const to = { x: next.x, y: next.y }

  if (previous.zone.id === next.zone.id) {
    const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    return [from, from, midpoint, midpoint, to, to]
  }

  const exit = doorAnchor(previous.zone, next.zone)
  const entry = doorAnchor(next.zone, previous.zone)
  const laneY = corridorY(previous.zone, next.zone, sceneHeight)
  return [
    from,
    exit,
    { x: exit.x, y: laneY },
    { x: entry.x, y: laneY },
    entry,
    to,
  ]
}

export function applyBlockedDoorPlacement(
  actors: ActorInstance[],
  zones: TeamZone[],
  flowOrder: string[],
): ActorInstance[] {
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]))
  return actors.map((actor) => {
    if (!actor.pulse.blocked) return actor
    const currentIndex = flowOrder.indexOf(actor.zone.id)
    const previousZone = currentIndex > 0 ? zoneById.get(flowOrder[currentIndex - 1]) : undefined
    if (!previousZone) return actor
    const anchor = doorAnchor(actor.zone, previousZone)
    return { ...actor, x: anchor.x, y: anchor.y }
  })
}

export function diffActorTransits(
  previousActors: Map<string, ActorInstance>,
  nextActors: ActorInstance[],
  flowOrder: string[],
  sceneHeight: number,
): ActorTransit[] {
  return nextActors.flatMap((actor) => {
    const previous = previousActors.get(actor.id)
    if (!previous || actor.pulse.blocked) return []

    const zoneChanged = previous.zone.id !== actor.zone.id
    const resumedFromBlock = previous.pulse.blocked && !actor.pulse.blocked
    if (!zoneChanged && !resumedFromBlock) return []

    const direction = transitDirection(previous.zone.id, actor.zone.id, flowOrder)
    return [{
      actorId: actor.id,
      fromZoneId: previous.zone.id,
      toZoneId: actor.zone.id,
      direction,
      durationMs: durationFor(direction),
      route: routeBetween(previous, actor, sceneHeight),
    }]
  })
}
