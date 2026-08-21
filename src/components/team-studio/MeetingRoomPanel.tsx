import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import {
  MEETING_ROOM_EVENT,
  isMeetingItemDraft,
  loadMeetingItems,
  saveMeetingItems,
  type MeetingItem,
  type MeetingItemDraft,
  type MeetingItemKind,
} from '@/lib/team-studio/meeting-room'
import { useStudioLocale } from '@/lib/team-studio/i18n'

import styles from './MeetingRoomPanel.module.css'

type MeetingTab = 'brainstorm' | 'materials' | 'minutes'

const SOURCE_OPTIONS = ['Team', 'GPT-5', 'Codex', 'Claude', 'Other AI']

function newMeetingItem(draft: MeetingItemDraft): MeetingItem {
  return {
    ...draft,
    id: `meeting-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage: draft.stage ?? (draft.kind === 'idea' && draft.source !== 'Team' ? 'inbox' : 'board'),
    createdAt: new Date().toISOString(),
  }
}

export function MeetingRoomPanel() {
  const { t, locale } = useStudioLocale()
  const [items, setItems] = useState(loadMeetingItems)
  const [tab, setTab] = useState<MeetingTab>('brainstorm')
  const [kind, setKind] = useState<MeetingItemKind>('memo')
  const [source, setSource] = useState('Team')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [url, setUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveMeetingItems(items), [items])
  useEffect(() => {
    const receiveAgentIdea = (event: Event) => {
      const draft = (event as CustomEvent<unknown>).detail
      if (!isMeetingItemDraft(draft)) return
      setItems((current) => [newMeetingItem(draft), ...current])
    }
    window.addEventListener(MEETING_ROOM_EVENT, receiveAgentIdea)
    return () => window.removeEventListener(MEETING_ROOM_EVENT, receiveAgentIdea)
  }, [])

  const inbox = useMemo(() => items.filter((item) => item.kind === 'idea' && item.stage === 'inbox'), [items])
  const board = useMemo(() => items.filter((item) => ['idea', 'memo'].includes(item.kind) && item.stage === 'board'), [items])
  const materials = useMemo(() => items.filter((item) => item.kind === 'material'), [items])
  const minutes = useMemo(() => items.filter((item) => item.kind === 'minutes'), [items])

  function addItem(draft: MeetingItemDraft) {
    setItems((current) => [newMeetingItem(draft), ...current])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !content.trim()) return
    addItem({ kind, source, title: title.trim(), content: content.trim(), url: url.trim() || undefined })
    setTitle('')
    setContent('')
    setUrl('')
    setTab(kind === 'material' ? 'materials' : kind === 'minutes' ? 'minutes' : 'brainstorm')
  }

  async function importMarkdown(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    addItem({
      kind: 'material',
      source: 'Team',
      title: file.name,
      content: text,
      fileName: file.name,
      stage: 'board',
    })
    setTab('materials')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function createSummary() {
    const ideas = board.slice(0, 6)
    const references = materials.slice(0, 4)
    const body = (locale === 'zh' ? [
      '# 会议小结', '', '## 已讨论想法',
      ...(ideas.length ? ideas.map((item) => `- **${item.title}** — ${item.content.split('\n')[0]}`) : ['- 还没有想法被发到讨论墙。']),
      '', '## 会议资料', ...(references.length ? references.map((item) => `- ${item.title}`) : ['- 暂无会议资料。']),
      '', '## 决策与下一步', '- 为已采纳想法确认负责人。', '- 人工确认后将行动项发送到任务系统。',
    ] : locale === 'ko' ? [
      '# 회의 요약', '', '## 검토한 아이디어',
      ...(ideas.length ? ideas.map((item) => `- **${item.title}** — ${item.content.split('\n')[0]}`) : ['- 아직 보드로 이동한 아이디어가 없습니다.']),
      '', '## 회의 자료', ...(references.length ? references.map((item) => `- ${item.title}`) : ['- 첨부된 회의 자료가 없습니다.']),
      '', '## 결정 및 다음 단계', '- 채택한 아이디어의 담당자를 확인합니다.', '- 사람의 검토 후 승인된 작업을 작업 시스템으로 보냅니다.',
    ] : [
      '# Meeting summary',
      '',
      '## Ideas reviewed',
      ...(ideas.length ? ideas.map((item) => `- **${item.title}** — ${item.content.split('\n')[0]}`) : ['- No ideas have been moved to the board yet.']),
      '',
      '## Materials',
      ...(references.length ? references.map((item) => `- ${item.title}`) : ['- No meeting materials attached.']),
      '',
      '## Decisions and next steps',
      '- Confirm owners for accepted ideas.',
      '- Send approved actions to the task system after human review.',
    ]).join('\n')
    addItem({ kind: 'minutes', source: 'Team', title: `${t('meeting.summary')} · ${new Date().toLocaleDateString(locale)}`, content: body, stage: 'board' })
    setTab('minutes')
  }

  return <div className={styles.panel}>
    <section className={styles.hero}>
      <div><small>{t('meeting.memory')}</small><h3>{t('meeting.headline')}</h3><p>{t('meeting.description')}</p></div>
      <div className={styles.roomStats}><span><b>{inbox.length}</b> {t('meeting.aiInbox')}</span><span><b>{board.length}</b> {t('meeting.onBoard')}</span><span><b>{materials.length}</b> {t('meeting.materials')}</span><span><b>{minutes.length}</b> {t('meeting.summaries')}</span></div>
    </section>

    <nav className={styles.tabs} aria-label="Meeting room sections">
      <button type="button" data-active={tab === 'brainstorm'} onClick={() => setTab('brainstorm')}>{t('meeting.brainstorm')} <b>{inbox.length + board.length}</b></button>
      <button type="button" data-active={tab === 'materials'} onClick={() => setTab('materials')}>{t('meeting.materials')} <b>{materials.length}</b></button>
      <button type="button" data-active={tab === 'minutes'} onClick={() => setTab('minutes')}>{t('meeting.minutes')} <b>{minutes.length}</b></button>
    </nav>

    {tab === 'brainstorm' && <>
      <MeetingHeading title={t('meeting.ideaInbox')} meta={t('meeting.reviewRequired')} />
      <div className={styles.cardGrid}>{inbox.length ? inbox.map((item) => <MeetingCard item={item} key={item.id} actionLabel={t('meeting.sendBoard')} onAction={() => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, stage: 'board' } : candidate))} />) : <EmptyState>{t('meeting.reviewed')}</EmptyState>}</div>
      <MeetingHeading title={t('meeting.board')} meta={t('meeting.accepted', { count: board.length })} />
      <div className={styles.cardGrid}>{board.length ? board.map((item) => <MeetingCard item={item} key={item.id} />) : <EmptyState>{t('meeting.emptyBoard')}</EmptyState>}</div>
    </>}

    {tab === 'materials' && <>
      <div className={styles.materialActions}><div><b>{t('meeting.materialTitle')}</b><small>{t('meeting.materialHelp')}</small></div><button type="button" onClick={() => fileInputRef.current?.click()}>{t('meeting.import')}</button><input ref={fileInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => void importMarkdown(event.target.files?.[0])} /></div>
      <div className={styles.documentList}>{materials.length ? materials.map((item) => <MeetingCard item={item} key={item.id} expanded />) : <EmptyState>{t('meeting.noMaterials')}</EmptyState>}</div>
    </>}

    {tab === 'minutes' && <>
      <div className={styles.materialActions}><div><b>{t('meeting.summaryTitle')}</b><small>{t('meeting.summaryHelp')}</small></div><button type="button" onClick={createSummary}>{t('meeting.createSummary')}</button></div>
      <div className={styles.documentList}>{minutes.length ? minutes.map((item) => <MeetingCard item={item} key={item.id} expanded />) : <EmptyState>{t('meeting.noSummaries')}</EmptyState>}</div>
    </>}

    <MeetingHeading title={t('meeting.post')} meta={t('meeting.types')} />
    <form className={styles.composer} onSubmit={submit}>
      <label><span>{t('meeting.type')}</span><select value={kind} onChange={(event) => setKind(event.target.value as MeetingItemKind)}><option value="idea">{t('meeting.idea')}</option><option value="memo">{t('meeting.memo')}</option><option value="material">{t('meeting.material')}</option><option value="minutes">{t('meeting.summary')}</option></select></label>
      <label><span>{t('meeting.source')}</span><select value={source} onChange={(event) => setSource(event.target.value)}>{SOURCE_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
      <label className={styles.titleField}><span>{t('meeting.title')}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('meeting.titlePlaceholder')} required /></label>
      <label className={styles.contentField}><span>{t('meeting.content')}</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('meeting.contentPlaceholder')} required /></label>
      <label className={styles.urlField}><span>{t('meeting.url')}</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>
      <button className={styles.postButton} type="submit">{t('meeting.postAction')}</button>
    </form>
    <p className={styles.storageNote}>{t('meeting.localNote')}</p>
  </div>
}

function MeetingHeading({ title, meta }: { title: string; meta: string }) {
  return <div className={styles.heading}><h4>{title}</h4><span>{meta}</span></div>
}

function MeetingCard({ item, actionLabel, onAction, expanded = false }: { item: MeetingItem; actionLabel?: string; onAction?: () => void; expanded?: boolean }) {
  const { t, locale } = useStudioLocale()
  return <article className={styles.card} data-kind={item.kind}>
    <header><span>{item.source}</span><time>{new Date(item.createdAt).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></header>
    <h5>{item.title}</h5>
    <pre data-expanded={expanded}>{item.content}</pre>
    <footer>{item.fileName && <span>MD · {item.fileName}</span>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">{t('meeting.openReference')}</a>}{actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel} →</button>}</footer>
  </article>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>
}
