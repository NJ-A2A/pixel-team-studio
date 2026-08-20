# Meeting Room

The meeting room is a local-first collaboration surface in the upper-left corner of both the full studio and compact widget.

## Information flow

```text
GPT / Codex / Claude idea → AI inbox → human review → brainstorm board
Team memo / Markdown file / reference URL ─────────→ meeting materials
Brainstorm board + materials ──────────────────────→ meeting summary draft
```

AI suggestions never become decisions automatically. **Send to board** is the explicit human-review boundary. Generated summary drafts also remain editable meeting records; sending tasks to Linear should require a second confirmation in a production integration.

## Local prototype

Meeting items are saved under `nestlinker-team-studio:meeting-room:v1` in browser local storage. The composer accepts ideas, memos, materials, summaries, and optional reference URLs. The materials view can import `.md`, `.markdown`, and `.txt` files as text.

This is device-local prototype storage. Do not use it for confidential documents or as a shared system of record.

## Agent submission event

A same-page Codex/MCP bridge can submit an item without touching the UI:

```js
window.dispatchEvent(new CustomEvent('nestlinker:meeting-item', {
  detail: {
    kind: 'idea',
    source: 'GPT-5',
    title: 'Proposed agenda item',
    content: 'Markdown or memo text',
    stage: 'inbox'
  }
}))
```

Accepted kinds are `idea`, `memo`, `material`, and `minutes`. Agent ideas should enter with `stage: "inbox"`; a person moves them to the board.

## Shared real-time version

For a real team deployment, send the same draft schema to the authenticated Team Events API. The backend should:

1. Authenticate the human or agent identity.
2. Store an append-only `meeting.item.created` event.
3. Store `meeting.item.accepted` when a person sends an AI idea to the board.
4. Broadcast normalized meeting state through SSE or WebSocket.
5. Keep model credentials, source documents, and OAuth tokens outside the browser.

The frontend should receive only normalized meeting items and short-lived attachment URLs.
