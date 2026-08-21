import { STUDIO_LAYOUT_PRESETS, STUDIO_WORKFLOW_PRESETS, type StudioLayoutState } from '@/lib/team-studio/studio-layout'
import type { TeamZone } from '@/lib/team-studio/types'
import { useStudioLocale, type StudioLocale } from '@/lib/team-studio/i18n'

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

const PRESET_NOTES: Record<StudioLocale, Record<string, string>> = {
  en: { '3x3': 'Full studio', '2x4': 'Dual-row collaboration', '3x2': 'Compact squad', '1x8': 'Pipeline flow' },
  zh: { '3x3': '完整工作室', '2x4': '双排协作', '3x2': '紧凑小队', '1x8': '流水线流程' },
  ko: { '3x3': '전체 스튜디오', '2x4': '2열 협업', '3x2': '소형 스쿼드', '1x8': '파이프라인 흐름' },
}
const WORKFLOW_COPY: Record<StudioLocale, Record<string, [string, string]>> = {
  en: { 'product-delivery': ['Product delivery', 'Idea → design → build → test → release'], 'software-sprint': ['Software sprint', 'Plan → frontend → backend → QA → release'], 'operations-first': ['Operations first', 'Plan → operations → delivery → review'], 'creative-studio': ['Creative studio', 'Story → visual → production → review'] },
  zh: { 'product-delivery': ['产品交付', '想法 → 设计 → 开发 → 测试 → 发布'], 'software-sprint': ['软件冲刺', '计划 → 前端 → 后端 → QA → 发布'], 'operations-first': ['运营优先', '计划 → 运营 → 交付 → 评审'], 'creative-studio': ['创意工作室', '策划 → 视觉 → 制作 → 评审'] },
  ko: { 'product-delivery': ['제품 전달', '아이디어 → 디자인 → 개발 → 테스트 → 출시'], 'software-sprint': ['소프트웨어 스프린트', '계획 → 프론트엔드 → 백엔드 → QA → 출시'], 'operations-first': ['운영 우선', '계획 → 운영 → 전달 → 리뷰'], 'creative-studio': ['크리에이티브 스튜디오', '기획 → 비주얼 → 제작 → 리뷰'] },
}

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
  const { t, locale, zoneName } = useStudioLocale()
  const activePreset = STUDIO_LAYOUT_PRESETS.find((preset) => (
    preset.rows === layout.rows && preset.columns === layout.columns
  ))
  const visibleZoneCount = layout.slots.filter(Boolean).length

  return (
    <section className={styles.layoutPanel} aria-label={t('layout.editor')}>
      <div className={styles.layoutEditorTopbar}>
        <div className={styles.layoutSummary}>
          <span>{t('layout.editor')}</span>
          <b>{t('layout.size', { rows: layout.rows, columns: layout.columns })}</b>
          <small>{t('layout.summary', { note: activePreset ? PRESET_NOTES[locale][activePreset.id] : t('layout.custom'), count: visibleZoneCount })}</small>
        </div>
        <button type="button" onClick={onToggleEditing}>{t('layout.close')}</button>
      </div>

      <div className={styles.layoutPresets} aria-label="Layout presets">
        {STUDIO_LAYOUT_PRESETS.map((preset) => (
          <button
            type="button"
            key={preset.id}
            data-active={preset.rows === layout.rows && preset.columns === layout.columns}
            onClick={() => onGridChange(preset.rows, preset.columns)}
          >
            <b>{preset.label}</b><small>{PRESET_NOTES[locale][preset.id]}</small>
          </button>
        ))}
      </div>

      <div className={styles.customGridControls}>
        <label>
          <span>{t('layout.rows')}</span>
          <select value={layout.rows} onChange={(event) => onGridChange(Number(event.target.value), layout.columns)}>
            {ROW_OPTIONS.map((row) => <option key={row} value={row}>{row}</option>)}
          </select>
        </label>
        <span>×</span>
        <label>
          <span>{t('layout.columns')}</span>
          <select value={layout.columns} onChange={(event) => onGridChange(layout.rows, Number(event.target.value))}>
            {COLUMN_OPTIONS.map((column) => <option key={column} value={column}>{column}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.workflowControls}>
        <label>
          <span>{t('layout.workflow')}</span>
          <select value={activeWorkflowId} onChange={(event) => onWorkflowChange(event.target.value)}>
            {STUDIO_WORKFLOW_PRESETS.map((workflow) => (
              <option key={workflow.id} value={workflow.id}>{WORKFLOW_COPY[locale][workflow.id]?.join(' · ') ?? `${workflow.label} · ${workflow.note}`}</option>
            ))}
          </select>
        </label>
        <small>{t('layout.workflowHelp')}</small>
      </div>

      <div className={styles.slotMatrix} aria-label="Room assignment by row and column">
        <span className={styles.slotMatrixTitle}>{t('layout.matrix')}</span>
        <div style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(140px, 1fr))` }}>
          {layout.slots.map((zoneId, index) => {
            const row = Math.floor(index / layout.columns) + 1
            const column = index % layout.columns + 1
            return (
              <label key={index}>
                <span>R{row} · C{column}</span>
                <select value={zoneId ?? ''} onChange={(event) => onSlotChange(index, event.target.value || null)}>
                  <option value="">{t('layout.empty')}</option>
                  {zones.map((zone) => {
                    const stats = zoneStats[zone.id] ?? { members: 0, tasks: 0 }
                    return <option key={zone.id} value={zone.id}>{zoneName(zone.id, zone.name)} · {t('layout.tasks', { count: stats.tasks })}</option>
                  })}
                </select>
              </label>
            )
          })}
        </div>
      </div>

      <div className={styles.layoutEditor}>
          <div className={styles.layoutEditorHelp}>
            <b>{selectedZoneId ? t('layout.selected') : t('layout.select')}</b>
            <span>{t('layout.saved')}</span>
          </div>
          <div className={styles.layoutEditorActions}>
            <button type="button" onClick={onArrangeWorkflow}>{t('layout.reapply')}</button>
            <button type="button" onClick={onRemoveSelected} disabled={!selectedZoneId || unplacedZones.some((zone) => zone.id === selectedZoneId)}>{t('layout.remove')}</button>
            <button type="button" onClick={onReset}>{t('layout.restore')}</button>
          </div>
          <div className={styles.unplacedZones}>
            <span className={styles.unplacedLabel}>{t('layout.unplaced', { count: unplacedZones.length })}</span>
            {unplacedZones.length ? unplacedZones.map((zone) => {
              const stats = zoneStats[zone.id] ?? { members: 0, tasks: 0 }
              return (
                <button
                  type="button"
                  key={zone.id}
                  data-selected={selectedZoneId === zone.id}
                  onClick={() => onSelectUnplacedZone(zone.id)}
                >
                  <b>{zoneName(zone.id, zone.name)}</b><small>{stats.members} · {t('layout.tasks', { count: stats.tasks })}</small>
                </button>
              )
            }) : <small className={styles.allPlaced}>{t('layout.allPlaced')}</small>}
          </div>
      </div>
    </section>
  )
}
