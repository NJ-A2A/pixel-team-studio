export type MeetingItemKind = 'idea' | 'memo' | 'material' | 'minutes'
export type MeetingItemStage = 'inbox' | 'board'

export type MeetingItem = {
  id: string
  kind: MeetingItemKind
  stage: MeetingItemStage
  source: string
  title: string
  content: string
  createdAt: string
  url?: string
  fileName?: string
}

export type MeetingItemDraft = Pick<MeetingItem, 'kind' | 'source' | 'title' | 'content'> & Partial<Pick<MeetingItem, 'stage' | 'url' | 'fileName'>>

export const MEETING_ROOM_STORAGE_KEY = 'nestlinker-team-studio:meeting-room:v1'
export const MEETING_ROOM_EVENT = 'nestlinker:meeting-item'

export const INITIAL_MEETING_ITEMS: MeetingItem[] = [
  {
    id: 'gpt-flow-brief',
    kind: 'idea',
    stage: 'inbox',
    source: 'GPT-5',
    title: 'Turn every meeting decision into a visible workflow event',
    content: 'When a decision names an owner and a next step, create a proposed task event instead of leaving it inside minutes. Keep a human confirmation step before sending it to Linear.',
    createdAt: '2026-08-20T05:40:00.000Z',
  },
  {
    id: 'codex-premeeting-diff',
    kind: 'idea',
    stage: 'inbox',
    source: 'Codex',
    title: 'Prepare a task diff before the meeting starts',
    content: 'Show what moved, what was blocked, and which review loops reopened since the previous meeting. This gives the room a concrete agenda without measuring people by activity volume.',
    createdAt: '2026-08-20T05:32:00.000Z',
  },
  {
    id: 'claude-note-clusters',
    kind: 'idea',
    stage: 'board',
    source: 'Claude',
    title: 'Cluster notes into decisions, unknowns, and next steps',
    content: 'Use three stable buckets in the summary. A note may remain an unknown; do not force every discussion into a task.',
    createdAt: '2026-08-20T05:18:00.000Z',
  },
  {
    id: 'linear-workflow-map',
    kind: 'material',
    stage: 'board',
    source: 'Team',
    title: 'Linear workflow mapping.md',
    content: '# Workflow mapping\n\n- Todo → doorway queue\n- In Progress → active work room\n- In Review → QA room\n- Done → release archive\n\nQueue arrival and work start remain separate events.',
    fileName: 'linear-workflow-mapping.md',
    createdAt: '2026-08-20T04:55:00.000Z',
  },
  {
    id: 'weekly-product-sync',
    kind: 'minutes',
    stage: 'board',
    source: 'Team',
    title: 'Weekly product sync · Aug 20',
    content: '## Decisions\n- Keep one identity bird per member.\n- Movement follows active task share.\n\n## Next steps\n- Add the meeting room.\n- Preserve Linear as the source of task truth.',
    createdAt: '2026-08-20T06:10:00.000Z',
  },
]

export function loadMeetingItems(): MeetingItem[] {
  if (typeof window === 'undefined') return INITIAL_MEETING_ITEMS.map((item) => ({ ...item }))
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MEETING_ROOM_STORAGE_KEY) ?? 'null') as unknown
    if (!Array.isArray(parsed)) return INITIAL_MEETING_ITEMS.map((item) => ({ ...item }))
    const items = parsed.filter(isMeetingItem)
    return items.length ? items : INITIAL_MEETING_ITEMS.map((item) => ({ ...item }))
  } catch {
    return INITIAL_MEETING_ITEMS.map((item) => ({ ...item }))
  }
}

export function saveMeetingItems(items: MeetingItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(MEETING_ROOM_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // The meeting room remains usable when browser storage is unavailable.
  }
}

export function isMeetingItemDraft(value: unknown): value is MeetingItemDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<MeetingItemDraft>
  return ['idea', 'memo', 'material', 'minutes'].includes(draft.kind ?? '')
    && typeof draft.source === 'string'
    && typeof draft.title === 'string'
    && typeof draft.content === 'string'
}

function isMeetingItem(value: unknown): value is MeetingItem {
  if (!isMeetingItemDraft(value)) return false
  const item = value as Partial<MeetingItem>
  return typeof item.id === 'string'
    && ['inbox', 'board'].includes(item.stage ?? '')
    && typeof item.createdAt === 'string'
}
