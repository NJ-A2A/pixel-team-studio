# Floating Office Widget

The compact office is a first-class route rather than a crop of the dashboard:

```text
/?view=widget&source=linear
```

It uses the same Linear adapter, saved bird casting, weighted identity rotation, and sprite assets as the full studio. The widget has a dedicated `320–520px` layout with four operational rooms, a live summary, off-desk roster, and event-driven cross-room movement.

## Recommended surfaces

### Codex

Open the widget URL in Codex's right-side browser panel. This keeps the office visible beside the active coding task without coupling the UI to Codex internals.

### Claude, ChatGPT, Linear, and other websites

Load the unpacked extension in `browser-extension/`. Its toolbar action toggles a draggable and resizable iframe over the current page. Its context-menu command opens the same URL in Chrome's native side panel.

### Standalone pop-up

Click **Open floating office** in the full studio. The browser opens a named `460×620` resizable window and reuses it on subsequent clicks.

## Production deployment

The local route only works while Vite is running. For a shared team deployment:

1. Deploy the app at an HTTPS origin.
2. Set the extension's Widget URL to `https://your-domain.example/?view=widget&source=linear`.
3. Replace the development snapshot fetch with the authenticated Team Events API plus SSE/WebSocket updates described in `REALTIME_INTEGRATION.md`.
4. Permit the deployed origin to be framed, or use the browser side panel / separate pop-up if your security policy intentionally denies framing.

The widget route should receive normalized state only. OAuth tokens and source-system credentials remain in the backend and are never exposed to the iframe or extension.
