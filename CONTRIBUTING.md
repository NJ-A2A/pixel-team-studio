# Contributing

Contributions to NestLinker Team Studio are welcome. Keep each change focused, easy to review, and explicit about the problem it solves.

## Local development

```bash
pnpm install
pnpm dev
```

Run the full validation suite before submitting:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Pull requests

- Keep one pull request focused on one topic.
- Include a screenshot or short recording for visual changes.
- Add or update tests when changing state or scoring logic.
- Data adapters must never upload source code, complete terminal output, secrets, prompts, or private calendar content.

## Design principles

- Map positions must come from task or activity events; never fabricate work states with random movement.
- Waiting for a user, review, CI, or an external dependency is not “slacking.”
- KPIs should come from verifiable tasks, tests, and delivery conditions, never from online time alone.
- Transmit the minimum state required by default and avoid collecting sensitive content or logs.
