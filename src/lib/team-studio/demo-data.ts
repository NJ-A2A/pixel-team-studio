import type { ProjectKpi, TeamCalendarEvent, TeamFeedEvent, TeamMember, TeamTask, TeamZone } from './types'

export const TEAM_ZONES: TeamZone[] = [
  { id: 'story', name: 'Product & Story', short: 'STORY', ownerId: 'story', theme: 'pink', x: 16, y: 92, width: 408, height: 252 },
  { id: 'visual', name: 'Visual & Character', short: 'VISUAL', ownerId: 'visual', theme: 'yellow', x: 436, y: 92, width: 408, height: 252 },
  { id: 'frontend', name: 'Frontend', short: 'FRONTEND', ownerId: 'frontend', theme: 'blue', x: 856, y: 92, width: 408, height: 252 },
  { id: 'backend', name: 'State & Data', short: 'STATE', ownerId: 'backend', theme: 'mint', x: 16, y: 362, width: 408, height: 252 },
  { id: 'lounge', name: 'Shared Lounge', short: 'LOUNGE', ownerId: null, theme: 'white', x: 436, y: 362, width: 408, height: 252 },
  { id: 'qa', name: 'Playtest & QA', short: 'QA', ownerId: 'qa', theme: 'yellow', x: 856, y: 362, width: 408, height: 252 },
  { id: 'release', name: 'PR & Release', short: 'RELEASE', ownerId: 'release', theme: 'lavender', x: 16, y: 632, width: 408, height: 252 },
  { id: 'ops', name: 'Operations & Schedule', short: 'OPS', ownerId: 'ops', theme: 'coral', x: 436, y: 632, width: 408, height: 252 },
  { id: 'nap', name: 'Dormant Zone', short: 'SLEEP', ownerId: null, theme: 'sleep', x: 856, y: 632, width: 408, height: 252 },
]

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'story', name: 'Story Nesty', role: 'Product & Story Lead', bird: 'crane', species: 'Red-crowned Crane', assignedZone: 'story',
    lastUpdateMinutes: 1, updates30m: 8, updates2h: 24, kpi: 82,
    kpis: [
      { label: 'Product-flow acceptance', current: 17, target: 20 },
      { label: 'Interaction-branch fixes', current: 11, target: 13 },
      { label: 'Requirement validity', current: 8, target: 10 },
    ],
    schedule: [
      { time: '10:00', title: 'Lock product rules' },
      { time: '13:30', title: 'Cross-team workflow review' },
      { time: '16:20', title: 'Interaction copy acceptance' },
    ],
  },
  {
    id: 'visual', name: 'Visual Nesty', role: 'Visual & Character Lead', bird: 'tit', species: 'Long-tailed Tit', assignedZone: 'visual',
    lastUpdateMinutes: 16, updates30m: 1, updates2h: 7, kpi: 74,
    kpis: [
      { label: 'Character assets complete', current: 13, target: 16 },
      { label: 'UI visual consistency', current: 8, target: 12 },
      { label: 'Share-card adaptations', current: 5, target: 6 },
    ],
    schedule: [
      { time: '09:30', title: 'Organize bird assets' },
      { time: '14:10', title: 'Review result-card visuals' },
      { time: '17:00', title: 'Accept mobile assets' },
    ],
  },
  {
    id: 'frontend', name: 'Frontend Nesty', role: 'Frontend Lead', bird: 'swift', species: 'Swift', assignedZone: 'frontend',
    lastUpdateMinutes: 0, updates30m: 15, updates2h: 36, kpi: 86,
    kpis: [
      { label: 'Page components', current: 11, target: 12 },
      { label: 'Interaction states', current: 8, target: 9 },
      { label: 'Responsive viewports', current: 2, target: 3 },
    ],
    schedule: [
      { time: '09:00', title: 'Build the 2D map' },
      { time: '12:40', title: 'Integrate live state' },
      { time: '15:20', title: 'Fix mobile regressions' },
      { time: '18:00', title: 'Production build check' },
    ],
  },
  {
    id: 'backend', name: 'State Nesty', role: 'State & Data Lead', bird: 'nutcracker', species: "Clark's Nutcracker", assignedZone: 'backend',
    lastUpdateMinutes: 7, updates30m: 3, updates2h: 12, kpi: 67,
    kpis: [
      { label: 'Event mappings', current: 18, target: 24 },
      { label: 'State schemas', current: 7, target: 9 },
      { label: 'Failure fallbacks', current: 4, target: 8 },
    ],
    schedule: [
      { time: '09:40', title: 'Normalize AgentEvent' },
      { time: '13:00', title: 'Persist task state' },
      { time: '16:40', title: 'Map GitHub events' },
    ],
  },
  {
    id: 'qa', name: 'QA Nesty', role: 'QA & Acceptance Lead', bird: 'falcon', species: 'Peregrine Falcon', assignedZone: 'qa',
    lastUpdateMinutes: 3, updates30m: 6, updates2h: 18, kpi: 76,
    kpis: [
      { label: 'Automated test cases', current: 47, target: 52 },
      { label: 'Critical paths passing', current: 14, target: 16 },
      { label: 'Viewport coverage', current: 3, target: 3 },
    ],
    schedule: [
      { time: '10:20', title: 'Critical-path regression' },
      { time: '14:00', title: 'Three-viewport check' },
      { time: '17:30', title: 'PR acceptance report' },
    ],
  },
  {
    id: 'release', name: 'PR Nesty', role: 'PR & Release Lead', bird: 'tern', species: 'Arctic Tern', assignedZone: 'release',
    lastUpdateMinutes: 28, updates30m: 0, updates2h: 4, kpi: 72, mode: 'waiting',
    kpis: [
      { label: 'PR checks', current: 7, target: 10 },
      { label: 'Review approvals', current: 0, target: 1 },
      { label: 'Release readiness', current: 72, target: 100 },
    ],
    schedule: [
      { time: '11:00', title: 'Prepare draft PR' },
      { time: '15:00', title: 'Wait for review' },
      { time: '18:30', title: 'Merge and deploy window' },
    ],
  },
  {
    id: 'ops', name: 'Ops Nesty', role: 'Operations & Scheduling Lead', bird: 'pigeon', species: 'Homing Pigeon', assignedZone: 'ops',
    lastUpdateMinutes: 76, updates30m: 0, updates2h: 1, kpi: 49,
    kpis: [
      { label: 'Team-calendar syncs', current: 8, target: 12 },
      { label: 'External coordination items', current: 3, target: 6 },
      { label: 'Weekly report', current: 1, target: 1 },
    ],
    schedule: [
      { time: '09:20', title: 'Schedule sync' },
      { time: '11:30', title: 'External coordination' },
      { time: '16:00', title: 'Update team calendar' },
    ],
  },
]

export const INITIAL_TEAM_TASKS: TeamTask[] = [
  { id: 't-story-1', title: 'Refine the product flow and critical interaction branches', short: 'Product-flow calibration', assigneeId: 'story', zoneId: 'story', progress: 84, status: 'working', lastUpdateMinutes: 1, due: 'Today 16:20' },
  { id: 't-visual-1', title: 'Unify result-card, studio, and bird-character visuals', short: 'Bird visual consistency', assigneeId: 'visual', zoneId: 'visual', progress: 72, status: 'working', lastUpdateMinutes: 16, due: 'Today 17:00' },
  { id: 't-front-1', title: 'Build the 2D office map and member interactions', short: '2D map interactions', assigneeId: 'frontend', zoneId: 'frontend', progress: 91, status: 'working', lastUpdateMinutes: 0, due: 'Today 15:20' },
  { id: 't-front-2', title: 'Integrate update-frequency and sleep-state scoring', short: 'State scoring integration', assigneeId: 'frontend', zoneId: 'backend', progress: 69, status: 'working', lastUpdateMinutes: 2, due: 'Today 17:10' },
  { id: 't-front-3', title: 'Fix the 375px landscape map and drawer interactions', short: 'Mobile fixes', assigneeId: 'frontend', zoneId: 'qa', progress: 63, status: 'working', lastUpdateMinutes: 4, due: 'Today 18:00' },
  { id: 't-back-1', title: 'Define the normalized AgentEvent-to-team-state model', short: 'AgentEvent mapping', assigneeId: 'backend', zoneId: 'backend', progress: 62, status: 'working', lastUpdateMinutes: 7, due: 'Today 16:40' },
  { id: 't-qa-1', title: 'Regress 375 / 768 / 1440 viewports', short: 'Three-viewport regression', assigneeId: 'qa', zoneId: 'qa', progress: 68, status: 'working', lastUpdateMinutes: 3, due: 'Today 17:30' },
  { id: 't-qa-2', title: 'Review critical paths and blockers in draft PR #15', short: 'PR critical-path review', assigneeId: 'qa', zoneId: 'release', progress: 54, status: 'reviewing', lastUpdateMinutes: 6, due: 'Today 18:10' },
  { id: 't-release-1', title: 'Wait for draft PR #15 review and CI results', short: 'Waiting for PR review', assigneeId: 'release', zoneId: 'release', progress: 70, status: 'waiting', lastUpdateMinutes: 28, due: 'External dependency', note: 'Review wait; excluded from slack scoring' },
  { id: 't-ops-1', title: 'Organize the team calendar and external coordination points', short: 'Team schedule sync', assigneeId: 'ops', zoneId: 'ops', progress: 44, status: 'paused', lastUpdateMinutes: 76, due: 'Today 16:00' },
]

export const PROJECT_KPIS: ProjectKpi[] = [
  { label: 'Studio core interactions', current: 8, target: 10, description: 'Map, actors, clones, ownership, KPIs, calendar, sleep, and state simulation' },
  { label: 'Live-state integration readiness', current: 4, target: 8, description: 'Event model, webhooks, persistence, SSE, permissions, redaction, recovery, and monitoring' },
  { label: 'Team Studio regression', current: 47, target: 52, description: 'Demo values; production reads CI and test reports' },
  { label: 'PR release gates', current: 4, target: 6, description: 'Requirements, visuals, and implementation complete; testing and integration in progress' },
]

export const TEAM_CALENDAR_EVENTS: TeamCalendarEvent[] = [
  { id: 'cal-1', day: 0, time: '09:00–10:30', title: 'Build the 2D studio map', memberIds: ['frontend'], zoneId: 'frontend' },
  { id: 'cal-2', day: 0, time: '10:00–11:10', title: 'Lock product rules', memberIds: ['story'], zoneId: 'story' },
  { id: 'cal-3', day: 0, time: '14:10–15:00', title: 'Review bird visuals', memberIds: ['visual'], zoneId: 'visual' },
  { id: 'cal-4', day: 1, time: '09:40–11:20', title: 'Normalize AgentEvent', memberIds: ['backend', 'frontend'], zoneId: 'backend' },
  { id: 'cal-5', day: 1, time: '13:30–14:20', title: 'Cross-team workflow review', memberIds: ['story', 'visual', 'frontend'], zoneId: 'story' },
  { id: 'cal-6', day: 1, time: '15:00–16:00', title: 'Prepare draft PR', memberIds: ['release', 'qa'], zoneId: 'release' },
  { id: 'cal-7', day: 2, time: '10:20–11:30', title: 'Critical-path regression', memberIds: ['qa'], zoneId: 'qa' },
  { id: 'cal-8', day: 2, time: '12:40–14:00', title: 'Integrate live state', memberIds: ['frontend', 'backend'], zoneId: 'backend' },
  { id: 'cal-9', day: 2, time: '16:00–16:40', title: 'Update team calendar', memberIds: ['ops'], zoneId: 'ops' },
  { id: 'cal-10', day: 3, time: '09:30–10:30', title: 'Adapt share-card visuals', memberIds: ['visual'], zoneId: 'visual' },
  { id: 'cal-11', day: 3, time: '14:00–15:30', title: 'Three-viewport check', memberIds: ['qa', 'frontend'], zoneId: 'qa' },
  { id: 'cal-12', day: 3, time: '16:40–17:30', title: 'Map GitHub events', memberIds: ['backend', 'release'], zoneId: 'backend' },
  { id: 'cal-13', day: 4, time: '10:30–11:10', title: 'Pre-release product acceptance', memberIds: ['story', 'qa'], zoneId: 'story' },
  { id: 'cal-14', day: 4, time: '15:00–16:00', title: 'PR review window', memberIds: ['release', 'qa'], zoneId: 'release' },
  { id: 'cal-15', day: 4, time: '18:30–19:00', title: 'Merge and deploy window', memberIds: ['release', 'frontend', 'backend'], zoneId: 'release' },
]

export const INITIAL_TEAM_FEED: TeamFeedEvent[] = [
  { id: 'feed-1', minutes: 0, text: 'Frontend Nesty updated the 2D map interactions and KPI drawer.' },
  { id: 'feed-2', minutes: 3, text: 'QA Nesty completed the 375px viewport check and logged two fixes.' },
  { id: 'feed-3', minutes: 7, text: 'State Nesty updated the AgentEvent mapping rules.' },
  { id: 'feed-4', minutes: 16, text: 'Visual Nesty uploaded revised bird-character assets.' },
  { id: 'feed-5', minutes: 28, text: 'PR Nesty entered review wait; slack scoring is excluded.' },
  { id: 'feed-6', minutes: 76, text: 'Ops Nesty has no recent updates and moved to the dormant zone.' },
]

export const TEAM_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export const birdAvatar = (bird: string) => `/team-studio/pixel-birds/${bird}.png`
