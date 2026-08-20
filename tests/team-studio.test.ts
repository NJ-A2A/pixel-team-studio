import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

import { buildActorInstances } from '../src/lib/team-studio/actor-instances'
import { pulseFor } from '../src/lib/team-studio/activity-score'
import { INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES } from '../src/lib/team-studio/demo-data'
import { applyBlockedDoorPlacement, diffActorTransits } from '../src/lib/team-studio/flow-motion'
import {
  buildStudioLayoutScene,
  createStudioLayout,
  placeStudioZone,
  resizeStudioLayout,
} from '../src/lib/team-studio/studio-layout'

test('parallel tasks create independent map actors', () => {
  const actors = buildActorInstances(INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES, 0, 45)

  assert.equal(INITIAL_TEAM_MEMBERS.length, 7)
  assert.equal(actors.length, 10)
  assert.equal(actors.filter((actor) => actor.member.id === 'frontend').length, 3)
  assert.equal(actors.filter((actor) => actor.member.id === 'qa').length, 2)
  assert.equal(actors.filter((actor) => actor.task && actor.task.zoneId !== actor.member.assignedZone).length, 3)
})

test('inactive members sleep while external waits are excluded', () => {
  const operations = INITIAL_TEAM_MEMBERS.find((member) => member.id === 'ops')!
  const release = INITIAL_TEAM_MEMBERS.find((member) => member.id === 'release')!
  const operationsPulse = pulseFor(operations, INITIAL_TEAM_TASKS, 0, 45)
  const releasePulse = pulseFor(release, INITIAL_TEAM_TASKS, 60, 45)

  assert.equal(operationsPulse.sleeping, true)
  assert.equal(releasePulse.sleeping, false)
  assert.equal(releasePulse.level, 'waiting')
  assert.equal(releasePulse.slackScore, null)
})

test('45 minutes of simulated time moves six members to sleep', () => {
  const actors = buildActorInstances(INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES, 45, 45)
  const sleepingActors = actors.filter((actor) => actor.zone.id === 'nap')

  assert.equal(sleepingActors.length, 6)
})

test('pixel sprites, movement paths and office scene remain wired', () => {
  const component = readFileSync('src/components/team-studio/TeamStudio.tsx', 'utf8')
  const styles = readFileSync('src/components/team-studio/TeamStudio.module.css', 'utf8')
  const officeMap = readFileSync('public/team-studio/office/office-map.png')

  assert.ok(officeMap.length > 20_000)
  assert.match(component, /data-motion=\{motion\}/)
  assert.match(styles, /@keyframes pixelWalk/)
  assert.match(styles, /@keyframes actorTransit/)
  assert.doesNotMatch(styles, /@keyframes actorRoam/)
  assert.doesNotMatch(styles, /@keyframes actorCommute/)
  assert.match(styles, /url\('\/team-studio\/office\/office-map\.png'\)/)
})

test('new bird kit exposes 17 species and seven 24-frame poses', () => {
  const manifest = JSON.parse(readFileSync('public/team-studio/pixel-birds/birds_sheet.json', 'utf8')) as {
    cols: number
    anim: Record<string, number[]>
    birds: Array<{ id: string }>
  }
  const craneSprite = readFileSync('public/team-studio/pixel-birds/crane.png')
  const spriteFiles = readdirSync('public/team-studio/pixel-birds').filter((file) => file.endsWith('.png') && !file.endsWith('_x8.png'))
  const component = readFileSync('src/components/team-studio/TeamStudio.tsx', 'utf8')
  const styles = readFileSync('src/components/team-studio/TeamStudio.module.css', 'utf8')

  assert.equal(manifest.cols, 24)
  assert.equal(manifest.birds.length, 17)
  assert.deepEqual(Object.keys(manifest.anim), ['idle', 'walk', 'run', 'work', 'sit', 'sleep', 'fly'])
  assert.equal(craneSprite.readUInt32BE(16), 768)
  assert.equal(craneSprite.readUInt32BE(20), 32)
  assert.ok(spriteFiles.includes('crow.png'))
  assert.ok(spriteFiles.includes('lorikeet.png'))
  assert.ok(spriteFiles.includes('raven.png'))
  assert.ok(spriteFiles.includes('starling.png'))
  assert.match(component, /type BirdAnimation = 'idle' \| 'walk' \| 'run' \| 'work' \| 'sit' \| 'sleep' \| 'fly'/)
  assert.match(styles, /@keyframes pixelWork/)
  assert.match(styles, /@keyframes pixelSleep/)
})

test('office layouts can switch between 2x4, 3x2 and 1x8 grids', () => {
  const zoneIds = TEAM_ZONES.map((zone) => zone.id)
  const initial = createStudioLayout(zoneIds)
  const twoByFour = resizeStudioLayout(initial, 2, 4)
  const threeByTwo = resizeStudioLayout(twoByFour, 3, 2)
  const oneByEight = resizeStudioLayout(threeByTwo, 1, 8)

  assert.equal(twoByFour.slots.length, 8)
  assert.equal(twoByFour.unplacedZoneIds.length, 1)
  assert.equal(threeByTwo.slots.length, 6)
  assert.equal(threeByTwo.unplacedZoneIds.length, 3)
  assert.equal(oneByEight.slots.length, 8)
  assert.equal(oneByEight.unplacedZoneIds.length, 1)
})

test('an unplaced department can replace any room without changing logical task data', () => {
  const zoneIds = TEAM_ZONES.map((zone) => zone.id)
  const compact = resizeStudioLayout(createStudioLayout(zoneIds), 3, 2)
  const hiddenZoneId = compact.unplacedZoneIds[0]
  const replacedZoneId = compact.slots[1]
  const arranged = placeStudioZone(compact, hiddenZoneId, 1)
  const scene = buildStudioLayoutScene(arranged, TEAM_ZONES)

  assert.equal(arranged.slots[1], hiddenZoneId)
  assert.ok(replacedZoneId && arranged.unplacedZoneIds.includes(replacedZoneId))
  assert.equal(scene.zones.length, 6)
  assert.equal(INITIAL_TEAM_TASKS.find((task) => task.zoneId === hiddenZoneId)?.zoneId, hiddenZoneId)
})

test('only real zone diffs create one-shot transit events', () => {
  const flowOrder = ['story', 'visual', 'frontend', 'backend', 'qa', 'release', 'ops', 'lounge', 'nap']
  const actors = buildActorInstances(INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES, 0, 45)
  const source = actors.find((actor) => actor.id === 'story-t-story-1')!
  const visualZone = TEAM_ZONES.find((zone) => zone.id === 'visual')!
  const target = { ...source, zone: visualZone, x: visualZone.x + 210, y: visualZone.y + 150 }

  assert.equal(diffActorTransits(new Map([[source.id, source]]), [source], flowOrder, 896).length, 0)
  const [transit] = diffActorTransits(new Map([[source.id, source]]), [target], flowOrder, 896)
  assert.equal(transit.direction, 'forward')
  assert.equal(transit.durationMs, 2200)
  assert.equal(transit.route.length, 6)
  assert.deepEqual(transit.route[0], { x: source.x, y: source.y })
  assert.deepEqual(transit.route[5], { x: target.x, y: target.y })
})

test('rollback is slower while BLOCK remains settled at the doorway', () => {
  const flowOrder = ['story', 'visual', 'frontend', 'backend', 'qa', 'release', 'ops', 'lounge', 'nap']
  const actors = buildActorInstances(INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES, 0, 45)
  const releaseActor = actors.find((actor) => actor.id === 'qa-t-qa-2')!
  const qaZone = TEAM_ZONES.find((zone) => zone.id === 'qa')!
  const rollbackTarget = { ...releaseActor, zone: qaZone, x: qaZone.x + 210, y: qaZone.y + 150 }
  const [rollback] = diffActorTransits(new Map([[releaseActor.id, releaseActor]]), [rollbackTarget], flowOrder, 896)

  assert.equal(rollback.direction, 'rollback')
  assert.equal(rollback.durationMs, 3200)

  const blockedActor = { ...releaseActor, pulse: { ...releaseActor.pulse, blocked: true, waiting: false, level: 'blocked' as const } }
  const [doorActor] = applyBlockedDoorPlacement([blockedActor], TEAM_ZONES, flowOrder)
  assert.notEqual(doorActor.x, blockedActor.x)
  assert.equal(diffActorTransits(new Map([[releaseActor.id, releaseActor]]), [doorActor], flowOrder, 896).length, 0)
})

test('state layout config defines anchors, transit accounting and non-looping movement', () => {
  const layouts = JSON.parse(readFileSync('public/team-studio/office/office_layouts.json', 'utf8')) as {
    state_runtime: {
      transition: { loop: boolean; route: string[] }
      accounting: { transit: string }
      blocked: { movement: string }
      rollback: { marker: string }
      anchors: Record<string, { flow: string[]; zones: Record<string, { entry_door: number[]; exit_door: number[] }> } | unknown>
    }
  }

  assert.equal(layouts.state_runtime.transition.loop, false)
  assert.deepEqual(layouts.state_runtime.transition.route, ['exit_door', 'corridor_lane', 'entry_door'])
  assert.equal(layouts.state_runtime.accounting.transit, 'exclude')
  assert.equal(layouts.state_runtime.blocked.movement, 'none')
  assert.equal(layouts.state_runtime.rollback.marker, 'red back arrow')
  const sprint = layouts.state_runtime.anchors.sprint6 as { flow: string[]; zones: Record<string, { entry_door: number[]; exit_door: number[] }> }
  assert.deepEqual(sprint.flow, ['todo', 'doing', 'review', 'done'])
  assert.deepEqual(sprint.zones.review.entry_door, [4, 112])
})
