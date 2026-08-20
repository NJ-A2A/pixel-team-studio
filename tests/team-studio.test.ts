import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import test from 'node:test'

import { buildActorInstances } from '../src/lib/team-studio/actor-instances'
import { pulseFor } from '../src/lib/team-studio/activity-score'
import { INITIAL_TEAM_MEMBERS, INITIAL_TEAM_TASKS, TEAM_ZONES } from '../src/lib/team-studio/demo-data'
import { applyBlockedDoorPlacement, diffActorTransits } from '../src/lib/team-studio/flow-motion'
import { adaptLinearSnapshot, type LinearSnapshot } from '../src/lib/team-studio/linear-adapter'
import { buildIdentityRotationPlans, rotationTaskByMember } from '../src/lib/team-studio/identity-rotation'
import { INITIAL_MEETING_ITEMS, isMeetingItemDraft, MEETING_ROOM_EVENT } from '../src/lib/team-studio/meeting-room'
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
  assert.match(component, /OFFICE_BACKGROUND_SLICES/)
  assert.match(component, /layoutEditing && <div className=\{styles\.layoutEditorPage\}>/)
  assert.match(styles, /background-position: 0 0, var\(--room-bg-x\) var\(--room-bg-y\)/)
})

test('new bird kit exposes 17 species and seven 32-frame poses', () => {
  const manifest = JSON.parse(readFileSync('public/team-studio/pixel-birds/birds_sheet.json', 'utf8')) as {
    cols: number
    anim: Record<string, number[]>
    birds: Array<{ id: string }>
  }
  const craneSprite = readFileSync('public/team-studio/pixel-birds/crane.png')
  const spriteFiles = readdirSync('public/team-studio/pixel-birds').filter((file) => file.endsWith('.png') && !file.endsWith('_x8.png'))
  const component = readFileSync('src/components/team-studio/TeamStudio.tsx', 'utf8')
  const styles = readFileSync('src/components/team-studio/TeamStudio.module.css', 'utf8')

  assert.equal(manifest.cols, 32)
  assert.equal(manifest.birds.length, 17)
  assert.deepEqual(Object.keys(manifest.anim), ['idle', 'walk', 'run', 'work', 'sit', 'sleep', 'fly'])
  assert.deepEqual(manifest.anim.run, [8, 9, 10, 11, 12, 13])
  assert.deepEqual(manifest.anim.fly, [26, 27, 28, 29, 30, 31])
  assert.equal(craneSprite.readUInt32BE(16), 1024)
  assert.equal(craneSprite.readUInt32BE(20), 32)
  assert.ok(spriteFiles.includes('crow.png'))
  assert.ok(spriteFiles.includes('lorikeet.png'))
  assert.ok(spriteFiles.includes('raven.png'))
  assert.ok(spriteFiles.includes('starling.png'))
  assert.match(component, /type BirdAnimation = 'idle' \| 'walk' \| 'run' \| 'work' \| 'sit' \| 'sleep' \| 'fly'/)
  assert.match(styles, /@keyframes pixelWork/)
  assert.match(styles, /@keyframes pixelSleep/)
  assert.match(styles, /steps\(6, end\)/)
  assert.doesNotMatch(component, /POSE SILHOUETTE QA/)
  assert.doesNotMatch(component, /ALL 32 FRAMES/)
  assert.match(component, /Choose team birds/)
  assert.match(component, /Three-question bird test/)
  assert.match(styles, /\.mapStage/)
  assert.match(styles, /scale\(var\(--map-scale/)
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

test('workflow templates and row-column room selectors are exposed', () => {
  const controls = readFileSync('src/components/team-studio/StudioLayoutControls.tsx', 'utf8')
  const layoutModule = readFileSync('src/lib/team-studio/studio-layout.ts', 'utf8')

  assert.match(controls, /Workflow template/)
  assert.match(controls, /ROOMS BY ROW \/ COLUMN/)
  assert.match(controls, /R\{row\} · C\{column\}/)
  assert.match(layoutModule, /product-delivery/)
  assert.match(layoutModule, /software-sprint/)
})

test('one identity bird rotates across offices using weighted dwell time', () => {
  const member = { ...INITIAL_TEAM_MEMBERS[0], id: 'rotating-member', lastUpdateMinutes: 0 }
  const tasks = [
    { ...INITIAL_TEAM_TASKS[0], id: 'task-a', assigneeId: member.id, zoneId: 'story', status: 'working' as const, workShare: 40 },
    { ...INITIAL_TEAM_TASKS[1], id: 'task-b', assigneeId: member.id, zoneId: 'qa', status: 'working' as const, workShare: 60 },
  ]
  const plans = buildIdentityRotationPlans([member], tasks, TEAM_ZONES)
  const [plan] = plans

  assert.deepEqual(plan.segments.map((segment) => Math.round(segment.share * 100)), [40, 60])
  assert.deepEqual(plan.segments.map((segment) => segment.dwellMs), [4_000, 6_000])

  const firstSelection = rotationTaskByMember(plans, 0)
  const secondSelection = rotationTaskByMember(plans, plan.segments[0].segmentMs + 1)
  const firstActor = buildActorInstances([member], tasks, TEAM_ZONES, 0, 20_160, true, firstSelection)[0]
  const secondActor = buildActorInstances([member], tasks, TEAM_ZONES, 0, 20_160, true, secondSelection)[0]
  const [transit] = diffActorTransits(new Map([[firstActor.id, firstActor]]), [secondActor], ['story', 'qa'], 896, new Set([firstActor.id]))

  assert.equal(firstActor.id, secondActor.id)
  assert.equal(firstActor.zone.id, 'story')
  assert.equal(secondActor.zone.id, 'qa')
  assert.equal(transit.reason, 'rotation')
  assert.equal(transit.durationMs, 1800)
})

test('multiple members in one office receive separate visible seats', () => {
  const members = INITIAL_TEAM_MEMBERS.slice(0, 2).map((member, index) => ({ ...member, id: `shared-${index}`, lastUpdateMinutes: 0 }))
  const tasks = members.map((member, index) => ({
    ...INITIAL_TEAM_TASKS[index],
    id: `shared-task-${index}`,
    assigneeId: member.id,
    zoneId: 'qa',
    status: 'working' as const,
  }))
  const actors = buildActorInstances(members, tasks, TEAM_ZONES, 0, 20_160, true)

  assert.equal(actors.length, 2)
  assert.ok(actors.every((actor) => actor.zone.id === 'qa'))
  assert.notDeepEqual([actors[0].x, actors[0].y], [actors[1].x, actors[1].y])
  assert.match(readFileSync('src/components/team-studio/TeamStudio.tsx', 'utf8'), /PEOPLE HERE/)
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

test('Linear flow config is progressive, runtime-discovered and censoring-aware', () => {
  const layouts = JSON.parse(readFileSync('public/team-studio/office/office_layouts.json', 'utf8')) as {
    flow_schema: {
      onboarding: { mode: string }
      source_contracts: {
        linear: {
          workflow_state_type: { graphql_type: string; is_enum: boolean; discover_on_connect: boolean; unknown_category: string }
          history_fields: string[]
        }
      }
      linear_default_mapping: Record<string, string>
    }
    layout_derivation: { algorithm: string[] }
    metrics: { time_basis: string; backlog_area: { unit: string }; censoring: { right: string; left: string } }
    rendering: { provenance_skins: Record<string, string>; migration: { trigger: string } }
  }

  assert.equal(layouts.flow_schema.onboarding.mode, 'play_first_progressive_connect')
  assert.equal(layouts.flow_schema.source_contracts.linear.workflow_state_type.graphql_type, 'String!')
  assert.equal(layouts.flow_schema.source_contracts.linear.workflow_state_type.is_enum, false)
  assert.equal(layouts.flow_schema.source_contracts.linear.workflow_state_type.discover_on_connect, true)
  assert.match(layouts.flow_schema.source_contracts.linear.workflow_state_type.unknown_category, /unmapped/)
  assert.deepEqual(layouts.flow_schema.source_contracts.linear.history_fields, [
    'fromState', 'toState', 'fromAssignee', 'toAssignee', 'actor',
  ])
  assert.equal(layouts.flow_schema.linear_default_mapping.unstarted, 'queue')
  assert.equal(layouts.flow_schema.linear_default_mapping.started, 'work')
  assert.ok(layouts.layout_derivation.algorithm.some((step) => step.includes('fold every queue')))
  assert.equal(layouts.metrics.time_basis, 'business_hours')
  assert.equal(layouts.metrics.backlog_area.unit, 'item-hours')
  assert.match(layouts.metrics.censoring.right, /tasks with no start event/)
  assert.match(layouts.metrics.censoring.left, /[Ll]eft-truncated/)
  assert.match(layouts.rendering.provenance_skins.no_data, /never render missing data/)
  assert.match(layouts.rendering.migration.trigger, /event-driven/)
})

test('Linear ingestion guide records verified schema and least-privilege limits', () => {
  const guide = readFileSync('docs/INGEST_LINEAR.md', 'utf8')

  assert.match(guide, /GraphQL type is `String!`, \*\*not an enum\*\*/)
  assert.match(guide, /must say \*\*"NestLinker queries and stores only status/)
  assert.match(guide, /plain `read` token cannot provision them itself/)
  assert.match(guide, /nested connection cannot be resumed independently/)
  assert.match(guide, /Missing data must never look like an empty, healthy queue/)
})

test('Linear snapshots map status to queues, work rooms and one identity bird', () => {
  const snapshot: LinearSnapshot = {
    schema: 'nestlinker-linear-snapshot/1',
    generatedAt: '2026-08-20T06:15:00.000Z',
    team: { id: 'team-1', name: 'Nestlinker' },
    statuses: [
      { id: 'todo', name: 'Todo', type: 'unstarted' },
      { id: 'doing', name: 'In Progress', type: 'started' },
      { id: 'review', name: 'In Review', type: 'started' },
    ],
    members: [{ id: 'member-1', name: 'NJ LEE', displayName: 'nj', isActive: true }],
    projects: [{ id: 'project-1', name: 'Product', status: 'In Progress', statusType: 'started', targetDate: null }],
    issues: [
      { id: 'NES-1', title: 'Queued', status: 'Todo', statusType: 'unstarted', priority: 'High', dueDate: '2026-08-20', createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-19T00:00:00.000Z', startedAt: null, completedAt: null, assigneeId: 'member-1', projectId: 'project-1', labels: [] },
      { id: 'NES-2', title: 'Building', status: 'In Progress', statusType: 'started', priority: 'Urgent', dueDate: null, createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-20T05:00:00.000Z', startedAt: '2026-08-19T00:00:00.000Z', completedAt: null, assigneeId: 'member-1', projectId: 'project-1', labels: [] },
      { id: 'NES-3', title: 'Reviewing', status: 'In Review', statusType: 'started', priority: 'Urgent', dueDate: null, createdAt: '2026-08-18T00:00:00.000Z', updatedAt: '2026-08-20T06:00:00.000Z', startedAt: '2026-08-19T00:00:00.000Z', completedAt: null, assigneeId: 'member-1', projectId: 'project-1', labels: [] },
    ],
  }
  const data = adaptLinearSnapshot(snapshot)
  const actors = buildActorInstances(data.members, data.tasks, TEAM_ZONES, 0, 20_160, true)

  assert.equal(data.tasks.find((task) => task.id === 'NES-1')?.status, 'queued')
  assert.equal(data.tasks.find((task) => task.id === 'NES-1')?.zoneId, 'frontend')
  assert.equal(data.tasks.find((task) => task.id === 'NES-2')?.zoneId, 'backend')
  assert.equal(data.tasks.find((task) => task.id === 'NES-3')?.zoneId, 'qa')
  assert.equal(actors.length, 1)
  assert.equal(actors[0].task?.id, 'NES-3')
  assert.match(readFileSync('.gitignore', 'utf8'), /linear-snapshot\.local\.json/)
})

test('compact office route and browser-extension shells stay wired', () => {
  const app = readFileSync('src/App.tsx', 'utf8')
  const widget = readFileSync('src/components/team-studio/OfficeWidget.tsx', 'utf8')
  const widgetStyles = readFileSync('src/components/team-studio/OfficeWidget.module.css', 'utf8')
  const manifest = JSON.parse(readFileSync('browser-extension/manifest.json', 'utf8')) as {
    manifest_version: number
    permissions: string[]
    side_panel: { default_path: string }
  }

  assert.match(app, /view === 'widget'/)
  assert.match(widget, /buildIdentityRotationPlans/)
  assert.match(widget, /linear-snapshot\.local\.json/)
  assert.match(widgetStyles, /@keyframes run/)
  assert.equal(manifest.manifest_version, 3)
  assert.ok(manifest.permissions.includes('sidePanel'))
  assert.equal(manifest.side_panel.default_path, 'panel.html')
  assert.deepEqual(readdirSync('browser-extension').sort(), [
    'README.md', 'background.js', 'content.js', 'manifest.json', 'options.html', 'options.js', 'panel.html', 'panel.js',
  ])
})

test('meeting room keeps AI ideas behind human review and accepts Markdown materials', () => {
  const studio = readFileSync('src/components/team-studio/TeamStudio.tsx', 'utf8')
  const widget = readFileSync('src/components/team-studio/OfficeWidget.tsx', 'utf8')
  const panel = readFileSync('src/components/team-studio/MeetingRoomPanel.tsx', 'utf8')
  const guide = readFileSync('docs/MEETING_ROOM.md', 'utf8')

  assert.ok(INITIAL_MEETING_ITEMS.some((item) => item.source === 'GPT-5' && item.stage === 'inbox'))
  assert.ok(INITIAL_MEETING_ITEMS.some((item) => item.kind === 'material' && item.fileName?.endsWith('.md')))
  assert.ok(INITIAL_MEETING_ITEMS.some((item) => item.kind === 'minutes'))
  assert.equal(MEETING_ROOM_EVENT, 'nestlinker:meeting-item')
  assert.equal(isMeetingItemDraft({ kind: 'idea', source: 'Codex', title: 'Idea', content: 'Context' }), true)
  assert.equal(isMeetingItemDraft({ kind: 'idea', source: 'Codex', title: 'Missing content' }), false)
  assert.match(studio, /MeetingRoomDock/)
  assert.match(widget, /meetingMini/)
  assert.match(panel, /Send to board/)
  assert.match(panel, /Import \.md \/ \.txt/)
  assert.match(panel, /Create summary draft/)
  assert.match(guide, /AI suggestions never become decisions automatically/)
})
