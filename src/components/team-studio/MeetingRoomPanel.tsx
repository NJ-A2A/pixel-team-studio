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
    const body = [
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
    ].join('\n')
    addItem({ kind: 'minutes', source: 'Team', title: `Meeting brief · ${new Date().toLocaleDateString()}`, content: body, stage: 'board' })
    setTab('minutes')
  }

  return <div className={styles.panel}>
    <section className={styles.hero}>
      <div><small>MEETING ROOM · SHARED MEMORY</small><h3>Ideas enter as drafts. Decisions leave with context.</h3><p>AI suggestions stay in the inbox until a person sends them to the board. Markdown, memos, references, and meeting summaries are kept together.</p></div>
      <div className={styles.roomStats}><span><b>{inbox.length}</b> AI inbox</span><span><b>{board.length}</b> on board</span><span><b>{materials.length}</b> materials</span><span><b>{minutes.length}</b> summaries</span></div>
    </section>

    <nav className={styles.tabs} aria-label="Meeting room sections">
      <button type="button" data-active={tab === 'brainstorm'} onClick={() => setTab('brainstorm')}>Brainstorm <b>{inbox.length + board.length}</b></button>
      <button type="button" data-active={tab === 'materials'} onClick={() => setTab('materials')}>Materials <b>{materials.length}</b></button>
      <button type="button" data-active={tab === 'minutes'} onClick={() => setTab('minutes')}>Minutes <b>{minutes.length}</b></button>
    </nav>

    {tab === 'brainstorm' && <>
      <MeetingHeading title="AI idea inbox" meta="Human review required before the board" />
      <div className={styles.cardGrid}>{inbox.length ? inbox.map((item) => <MeetingCard item={item} key={item.id} actionLabel="Send to board" onAction={() => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, stage: 'board' } : candidate))} />) : <EmptyState>All AI suggestions have been reviewed.</EmptyState>}</div>
      <MeetingHeading title="Brainstorm board" meta={`${board.length} accepted ideas and team memos`} />
      <div className={styles.cardGrid}>{board.length ? board.map((item) => <MeetingCard item={item} key={item.id} />) : <EmptyState>Send an idea here or write a team memo below.</EmptyState>}</div>
    </>}

    {tab === 'materials' && <>
      <div className={styles.materialActions}><div><b>Meeting materials</b><small>Markdown is imported as readable text and saved locally.</small></div><button type="button" onClick={() => fileInputRef.current?.click()}>Import .md / .txt</button><input ref={fileInputRef} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" onChange={(event) => void importMarkdown(event.target.files?.[0])} /></div>
      <div className={styles.documentList}>{materials.length ? materials.map((item) => <MeetingCard item={item} key={item.id} expanded />) : <EmptyState>No materials yet.</EmptyState>}</div>
    </>}

    {tab === 'minutes' && <>
      <div className={styles.materialActions}><div><b>Meeting summaries</b><small>Build a reviewable draft from the current board and materials.</small></div><button type="button" onClick={createSummary}>Create summary draft</button></div>
      <div className={styles.documentList}>{minutes.length ? minutes.map((item) => <MeetingCard item={item} key={item.id} expanded />) : <EmptyState>No meeting summaries yet.</EmptyState>}</div>
    </>}

    <MeetingHeading title="Post to the meeting room" meta="Idea · memo · material · minutes" />
    <form className={styles.composer} onSubmit={submit}>
      <label><span>Type</span><select value={kind} onChange={(event) => setKind(event.target.value as MeetingItemKind)}><option value="idea">Brainstorm idea</option><option value="memo">Memo</option><option value="material">Meeting material</option><option value="minutes">Meeting summary</option></select></label>
      <label><span>Source</span><select value={source} onChange={(event) => setSource(event.target.value)}>{SOURCE_OPTIONS.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>
      <label className={styles.titleField}><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A clear name for this note" required /></label>
      <label className={styles.contentField}><span>Markdown / memo</span><textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={'# Context\n\nWrite or paste an idea, memo, meeting document, or summary…'} required /></label>
      <label className={styles.urlField}><span>Reference URL · optional</span><input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" /></label>
      <button className={styles.postButton} type="submit">Post to meeting room</button>
    </form>
    <p className={styles.storageNote}>Local-first prototype · agent submissions can dispatch <code>{MEETING_ROOM_EVENT}</code> with a meeting-item draft. Connect the same schema to the authenticated Team Events API for shared real-time storage.</p>
  </div>
}

function MeetingHeading({ title, meta }: { title: string; meta: string }) {
  return <div className={styles.heading}><h4>{title}</h4><span>{meta}</span></div>
}

function MeetingCard({ item, actionLabel, onAction, expanded = false }: { item: MeetingItem; actionLabel?: string; onAction?: () => void; expanded?: boolean }) {
  return <article className={styles.card} data-kind={item.kind}>
    <header><span>{item.source}</span><time>{new Date(item.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></header>
    <h5>{item.title}</h5>
    <pre data-expanded={expanded}>{item.content}</pre>
    <footer>{item.fileName && <span>MD · {item.fileName}</span>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">Open reference ↗</a>}{actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel} →</button>}</footer>
  </article>
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className={styles.empty}>{children}</div>
}
