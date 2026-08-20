import { STUDIO_LAYOUT_PRESETS, STUDIO_WORKFLOW_PRESETS, type StudioLayoutState } from '@/lib/team-studio/studio-layout'
import type { TeamZone } from '@/lib/team-studio/types'

import styles from './TeamStudio.module.css'

type ZoneStats = Record<string, { members: number; tasks: number }>

type StudioLayoutControlsProps = {
  layout: StudioLayoutState
  zones: TeamZone[]
  unplacedZones: TeamZone[]
  zoneStats: ZoneStats
  selectedZoneId: string | null
  activeWorkflowId: string
  onToggleEditing: () => void
  onGridChange: (rows: number, columns: number) => void
  onWorkflowChange: (workflowId: string) => void
  onSlotChange: (slotIndex: number, zoneId: string | null) => void
  onSelectUnplacedZone: (zoneId: string) => void
  onArrangeWorkflow: () => void
  onReset: () => void
  onRemoveSelected: () => void
}

const ROW_OPTIONS = [1, 2, 3, 4]
const COLUMN_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

export function StudioLayoutControls({
  layout,
  zones,
  unplacedZones,
  zoneStats,
  selectedZoneId,
  activeWorkflowId,
  onToggleEditing,
  onGridChange,
  onWorkflowChange,
  onSlotChange,
  onSelectUnplacedZone,
  onArrangeWorkflow,
  onReset,
  onRemoveSelected,
}: StudioLayoutControlsProps) {
  const activePreset = STUDIO_LAYOUT_PRESETS.find((preset) => (
    preset.rows === layout.rows && preset.columns === layout.columns
  ))
  const visibleZoneCount = layout.slots.filter(Boolean).length

  return (
    <section className={styles.layoutPanel} aria-label="Office layout settings">
      <div className={styles.layoutEditorTopbar}>
        <div className={styles.layoutSummary}>
          <span>ROOM LAYOUT EDITOR</span>
          <b>{layout.rows} rows × {layout.columns} columns</b>
          <small>{activePreset?.note ?? 'Custom layout'} · {visibleZoneCount} rooms placed · office backgrounds move with their rooms</small>
        </div>
        <button type="button" onClick={onToggleEditing}>Close editor</button>
      </div>

      <div className={styles.layoutPresets} aria-label="Layout presets">
        {STUDIO_LAYOUT_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            data-active={preset.rows === layout.rows && preset.columns === layout.columns}
            onClick={() => onGridChange(preset.rows, preset.columns)}
          >
            <b>{preset.label}</b><small>{preset.note}</small>
          </button>
        ))}
      </div>

      <div className={styles.customGridControls}>
        <label>
          <span>Rows</span>
          <select value={layout.rows} onChange={(event) => onGridChange(Number(event.target.value), layout.columns)}>
            {ROW_OPTIONS.map((row) => <option key={row} value={row}>{row}</option>)}
          </select>
        </label>
        <span>×</span>
        <label>
          <span>Columns</span>
          <select value={layout.columns} onChange={(event) => onGridChange(layout.rows, Number(event.target.value))}>
            {COLUMN_OPTIONS.map((column) => <option key={column} value={column}>{column}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.workflowControls}>
        <label>
          <span>Workflow template</span>
          <select value={activeWorkflowId} onChange={(event) => onWorkflowChange(event.target.value)}>
            {STUDIO_WORKFLOW_PRESETS.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>{workflow.label} · {workflow.note}</option>
            ))}
          </select>
        </label>
        <small>Selecting a workflow immediately reorders the rooms. Tasks and Linear data stay attached to their logical stage.</small>
      </div>

      <div className={styles.slotMatrix} aria-label="Room assignment by row and column">
        <span className={styles.slotMatrixTitle}>ROOMS BY ROW / COLUMN</span>
        <div style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(140px, 1fr))` }}>
          {layout.slots.map((zoneId, index) => {
            const row = Math.floor(index / layout.columns) + 1
            const column = index % layout.columns + 1
            return (
              <label key={index}>
                <span>R{row} · C{column}</span>
                <select value={zoneId ?? ''} onChange={(event) => onSlotChange(index, event.target.value || null)}>
                  <option value="">Empty room</option>
                  {zones.map((zone) => {
                    const stats = zoneStats[zone.id] ?? { members: 0, tasks: 0 }
                    return <option key={zone.id} value={zone.id}>{zone.name} · {stats.tasks} tasks</option>
                  })}
                </select>
              </label>
            )
          })}
        </div>
      </div>

      <div className={styles.layoutEditor}>
          <div className={styles.layoutEditorHelp}>
            <b>{selectedZoneId ? 'Room selected. Click a destination slot to place or swap it.' : 'Select a room, then choose its destination.'}</b>
            <span>The layout is saved in this browser. Moving rooms never changes tasks or KPIs.</span>
          </div>
          <div className={styles.layoutEditorActions}>
            <button type="button" onClick={onArrangeWorkflow}>Reapply selected workflow</button>
            <button type="button" onClick={onRemoveSelected} disabled={!selectedZoneId || unplacedZones.some((zone) => zone.id === selectedZoneId)}>Move off map</button>
            <button type="button" onClick={onReset}>Restore 3 × 3</button>
          </div>
          <div className={styles.unplacedZones}>
            <span className={styles.unplacedLabel}>Unplaced rooms · {unplacedZones.length}</span>
            {unplacedZones.length ? unplacedZones.map((zone) => {
              const stats = zoneStats[zone.id] ?? { members: 0, tasks: 0 }
              return (
                <button
                  type="button"
                  key={zone.id}
                  data-selected={selectedZoneId === zone.id}
                  onClick={() => onSelectUnplacedZone(zone.id)}
                >
                  <b>{zone.name}</b><small>{stats.members} {stats.members === 1 ? 'owner' : 'owners'} · {stats.tasks} {stats.tasks === 1 ? 'task' : 'tasks'}</small>
                </button>
              )
            }) : <small className={styles.allPlaced}>All rooms are placed. Empty slots remain available for swaps.</small>}
          </div>
      </div>
    </section>
  )
}
