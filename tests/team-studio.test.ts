import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { buildActorInstances } from '../src/lib/team-studio/actor-instances'
import { pulseFor } from '../src/lib/team-studio/activity-score'
import { INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES } from '../src/lib/team-studio/demo-data'

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
  assert.match(styles, /@keyframes actorCommute/)
  assert.match(styles, /url\('\/team-studio\/office\/office-map\.png'\)/)
})
