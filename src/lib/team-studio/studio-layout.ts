import type { TeamZone } from './types'

export const STUDIO_LAYOUT_STORAGE_KEY = 'nestlinker-team-studio:layout:v1'

export type StudioLayoutState = {
  version: 1
  rows: number
  columns: number
  slots: Array<string | null>
  unplacedZoneIds: string[]
}

export type StudioLayoutPreset = {
  id: string
  label: string
  rows: number
  columns: number
  note: string
}

export type StudioWorkflowPreset = {
  id: string
  label: string
  note: string
  zoneOrder: string[]
}

export type StudioLayoutSlot = {
  index: number
  row: number
  column: number
  zoneId: string | null
  x: number
  y: number
  width: number
  height: number
}

export type StudioLayoutScene = {
  width: number
  height: number
  slots: StudioLayoutSlot[]
  zones: TeamZone[]
}

export const STUDIO_LAYOUT_PRESETS: StudioLayoutPreset[] = [
  { id: '3x3', label: '3 × 3', rows: 3, columns: 3, note: 'Full studio' },
  { id: '2x4', label: '2 × 4', rows: 2, columns: 4, note: 'Dual-row collaboration' },
  { id: '3x2', label: '3 × 2', rows: 3, columns: 2, note: 'Compact squad' },
  { id: '1x8', label: '1 × 8', rows: 1, columns: 8, note: 'Pipeline flow' },
]

export const STUDIO_WORKFLOW_PRESETS: StudioWorkflowPreset[] = [
  {
    id: 'product-delivery',
    label: 'Product delivery',
    note: 'Idea → design → build → test → release',
    zoneOrder: ['story', 'visual', 'frontend', 'backend', 'qa', 'release', 'ops', 'lounge', 'nap'],
  },
  {
    id: 'software-sprint',
    label: 'Software sprint',
    note: 'Plan → frontend → backend → QA → release',
    zoneOrder: ['story', 'frontend', 'backend', 'qa', 'release', 'ops', 'visual', 'lounge', 'nap'],
  },
  {
    id: 'operations-first',
    label: 'Operations first',
    note: 'Plan → operations → delivery → review',
    zoneOrder: ['ops', 'story', 'visual', 'frontend', 'backend', 'qa', 'release', 'lounge', 'nap'],
  },
  {
    id: 'creative-studio',
    label: 'Creative studio',
    note: 'Story → visual → production → review',
    zoneOrder: ['story', 'visual', 'frontend', 'qa', 'backend', 'release', 'ops', 'lounge', 'nap'],
  },
]

const MIN_ROWS = 1
const MAX_ROWS = 4
const MIN_COLUMNS = 1
const MAX_COLUMNS = 8

const clampInteger = (value: number, min: number, max: number) => (
  Math.min(max, Math.max(min, Math.round(value)))
)

const capacityFor = (rows: number, columns: number) => rows * columns

export function createStudioLayout(
  zoneIds: string[],
  rows = 3,
  columns = 3,
): StudioLayoutState {
  const safeRows = clampInteger(rows, MIN_ROWS, MAX_ROWS)
  const safeColumns = clampInteger(columns, MIN_COLUMNS, MAX_COLUMNS)
  const capacity = capacityFor(safeRows, safeColumns)
  return {
    version: 1,
    rows: safeRows,
    columns: safeColumns,
    slots: [...zoneIds.slice(0, capacity), ...Array<string | null>(Math.max(0, capacity - zoneIds.length)).fill(null)],
    unplacedZoneIds: zoneIds.slice(capacity),
  }
}

export function normalizeStudioLayout(value: unknown, zoneIds: string[]): StudioLayoutState {
  if (!value || typeof value !== 'object') return createStudioLayout(zoneIds)

  const candidate = value as Partial<StudioLayoutState>
  const rows = typeof candidate.rows === 'number' ? candidate.rows : 3
  const columns = typeof candidate.columns === 'number' ? candidate.columns : 3
  const safeRows = clampInteger(rows, MIN_ROWS, MAX_ROWS)
  const safeColumns = clampInteger(columns, MIN_COLUMNS, MAX_COLUMNS)
  const capacity = capacityFor(safeRows, safeColumns)
  const validIds = new Set(zoneIds)
  const usedIds = new Set<string>()
  const slots = Array<string | null>(capacity).fill(null)

  if (Array.isArray(candidate.slots)) {
    candidate.slots.slice(0, capacity).forEach((zoneId, index) => {
      if (typeof zoneId === 'string' && validIds.has(zoneId) && !usedIds.has(zoneId)) {
        slots[index] = zoneId
        usedIds.add(zoneId)
      }
    })
  }

  const unplacedZoneIds: string[] = []
  if (Array.isArray(candidate.unplacedZoneIds)) {
    candidate.unplacedZoneIds.forEach((zoneId) => {
      if (validIds.has(zoneId) && !usedIds.has(zoneId)) {
        unplacedZoneIds.push(zoneId)
        usedIds.add(zoneId)
      }
    })
  }

  zoneIds.forEach((zoneId) => {
    if (!usedIds.has(zoneId)) unplacedZoneIds.push(zoneId)
  })

  return { version: 1, rows: safeRows, columns: safeColumns, slots, unplacedZoneIds }
}

export function resizeStudioLayout(
  layout: StudioLayoutState,
  rows: number,
  columns: number,
): StudioLayoutState {
  const safeRows = clampInteger(rows, MIN_ROWS, MAX_ROWS)
  const safeColumns = clampInteger(columns, MIN_COLUMNS, MAX_COLUMNS)
  const capacity = capacityFor(safeRows, safeColumns)
  const orderedZoneIds = [...layout.slots.filter((zoneId): zoneId is string => Boolean(zoneId)), ...layout.unplacedZoneIds]
  const slots = orderedZoneIds.slice(0, capacity) as Array<string | null>
  while (slots.length < capacity) slots.push(null)

  return {
    version: 1,
    rows: safeRows,
    columns: safeColumns,
    slots,
    unplacedZoneIds: orderedZoneIds.slice(capacity),
  }
}

export function placeStudioZone(
  layout: StudioLayoutState,
  zoneId: string,
  targetSlotIndex: number,
): StudioLayoutState {
  if (targetSlotIndex < 0 || targetSlotIndex >= layout.slots.length) return layout

  const slots = [...layout.slots]
  const unplacedZoneIds = [...layout.unplacedZoneIds]
  const sourceSlotIndex = slots.indexOf(zoneId)
  const sourceUnplacedIndex = unplacedZoneIds.indexOf(zoneId)
  if (sourceSlotIndex < 0 && sourceUnplacedIndex < 0) return layout

  const targetZoneId = slots[targetSlotIndex]
  if (sourceSlotIndex >= 0) {
    slots[sourceSlotIndex] = targetZoneId
  } else {
    unplacedZoneIds.splice(sourceUnplacedIndex, 1)
    if (targetZoneId) unplacedZoneIds.push(targetZoneId)
  }
  slots[targetSlotIndex] = zoneId

  return { ...layout, slots, unplacedZoneIds }
}

export function removeStudioZone(layout: StudioLayoutState, zoneId: string): StudioLayoutState {
  const slotIndex = layout.slots.indexOf(zoneId)
  if (slotIndex < 0) return layout
  const slots = [...layout.slots]
  slots[slotIndex] = null
  return { ...layout, slots, unplacedZoneIds: [...layout.unplacedZoneIds, zoneId] }
}

export function arrangeStudioLayout(
  layout: StudioLayoutState,
  orderedZoneIds: string[],
): StudioLayoutState {
  const currentIds = new Set([...layout.slots.filter((zoneId): zoneId is string => Boolean(zoneId)), ...layout.unplacedZoneIds])
  const safeOrder = orderedZoneIds.filter((zoneId, index) => currentIds.has(zoneId) && orderedZoneIds.indexOf(zoneId) === index)
  currentIds.forEach((zoneId) => {
    if (!safeOrder.includes(zoneId)) safeOrder.push(zoneId)
  })
  const slots = safeOrder.slice(0, layout.slots.length) as Array<string | null>
  while (slots.length < layout.slots.length) slots.push(null)
  return { ...layout, slots, unplacedZoneIds: safeOrder.slice(layout.slots.length) }
}

export function buildStudioLayoutScene(layout: StudioLayoutState, zones: TeamZone[]): StudioLayoutScene {
  const gap = 28
  const sidePadding = 16
  const topPadding = 76
  const bottomPadding = 16
  const roomWidth = layout.columns >= 7 ? 248 : layout.columns >= 5 ? 270 : layout.columns === 4 ? 300 : 400
  const roomHeight = layout.rows >= 4 ? 218 : layout.rows === 3 ? 246 : 270
  const width = sidePadding * 2 + layout.columns * roomWidth + (layout.columns - 1) * gap
  const height = topPadding + bottomPadding + layout.rows * roomHeight + (layout.rows - 1) * gap
  const zoneById = new Map(zones.map((zone) => [zone.id, zone]))

  const slots = layout.slots.map((zoneId, index): StudioLayoutSlot => {
    const row = Math.floor(index / layout.columns)
    const column = index % layout.columns
    return {
      index,
      row,
      column,
      zoneId,
      x: sidePadding + column * (roomWidth + gap),
      y: topPadding + row * (roomHeight + gap),
      width: roomWidth,
      height: roomHeight,
    }
  })

  const positionedZones = slots.flatMap((slot) => {
    const zone = slot.zoneId ? zoneById.get(slot.zoneId) : undefined
    return zone ? [{ ...zone, x: slot.x, y: slot.y, width: slot.width, height: slot.height }] : []
  })

  return { width, height, slots, zones: positionedZones }
}
