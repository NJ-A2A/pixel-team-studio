import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'

type TeamEvent = {
  id: string
  projectId: string
  memberId: string
  type: 'task.started' | 'task.progressed' | 'task.completed' | 'agent.blocked'
  taskId: string
  zoneId?: string
  progress?: number
  summary?: string
  occurredAt: string
  source: 'mcp'
}

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const eventFile = resolve(process.env.TEAM_EVENTS_FILE ?? resolve(packageRoot, 'data/team-events.jsonl'))
const eventUrl = process.env.TEAM_EVENTS_URL
const eventToken = process.env.TEAM_EVENTS_TOKEN

async function saveEvent(event: TeamEvent) {
  if (eventUrl) {
    const response = await fetch(eventUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(eventToken ? { authorization: `Bearer ${eventToken}` } : {}),
      },
      body: JSON.stringify(event),
    })
    if (!response.ok) throw new Error(`Team Events API returned HTTP ${response.status}`)
    return { destination: 'api', event }
  }

  await mkdir(dirname(eventFile), { recursive: true })
  await appendFile(eventFile, `${JSON.stringify(event)}\n`, 'utf8')
  return { destination: eventFile, event }
}

async function readEvents() {
  try {
    const raw = await readFile(eventFile, 'utf8')
    return raw.split('\n').filter(Boolean).slice(-1000).map((line) => JSON.parse(line) as TeamEvent)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

function eventContent(result: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
}

const identity = {
  projectId: z.string().min(1).describe('Stable workspace or project ID'),
  memberId: z.string().min(1).describe('Stable team member or agent ID'),
  taskId: z.string().min(1).describe('Stable task ID; do not send source code or prompts'),
}

function makeEvent(
  input: { projectId: string; memberId: string; taskId: string; zoneId?: string; progress?: number; summary?: string },
  type: TeamEvent['type'],
): TeamEvent {
  return {
    id: `evt_${randomUUID()}`,
    projectId: input.projectId,
    memberId: input.memberId,
    type,
    taskId: input.taskId,
    zoneId: input.zoneId,
    progress: input.progress,
    summary: input.summary?.slice(0, 240),
    occurredAt: new Date().toISOString(),
    source: 'mcp',
  }
}

const server = new McpServer({ name: 'pixel-team-studio', version: '0.1.0' })

server.registerTool('team_get_state', {
  description: 'Read the latest bounded task state recorded by this example server.',
  inputSchema: z.object({
    memberId: z.string().optional(),
    taskId: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
}, async ({ memberId, taskId, limit }) => {
  const events = (await readEvents())
    .filter((event) => !memberId || event.memberId === memberId)
    .filter((event) => !taskId || event.taskId === taskId)
    .slice(-limit)
  return eventContent({ count: events.length, events })
})

server.registerTool('team_start_task', {
  description: 'Record that a member or agent intentionally started a task.',
  inputSchema: z.object({ ...identity, zoneId: z.string().min(1), summary: z.string().max(240).optional() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => eventContent(await saveEvent(makeEvent({ ...input, progress: 0 }, 'task.started'))))

server.registerTool('team_update_progress', {
  description: 'Append a progress update. This never overwrites earlier events.',
  inputSchema: z.object({ ...identity, zoneId: z.string().min(1).optional(), progress: z.number().min(0).max(100), summary: z.string().max(240).optional() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => eventContent(await saveEvent(makeEvent(input, 'task.progressed'))))

server.registerTool('team_report_blocker', {
  description: 'Record a blocker without treating waiting time as low performance.',
  inputSchema: z.object({ ...identity, zoneId: z.string().min(1).optional(), summary: z.string().min(1).max(240) }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => eventContent(await saveEvent(makeEvent(input, 'agent.blocked'))))

server.registerTool('team_complete_task', {
  description: 'Record task completion and set progress to 100.',
  inputSchema: z.object({ ...identity, zoneId: z.string().min(1).optional(), summary: z.string().max(240).optional() }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => eventContent(await saveEvent(makeEvent({ ...input, progress: 100 }, 'task.completed'))))

await serveStdio(() => server)
