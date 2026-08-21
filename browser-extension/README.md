# Pixel Team Office browser extension

This unpacked Manifest V3 extension exposes the same compact office in two ways:

- Click the extension icon to toggle a draggable, resizable office over the current web page.
- Right-click the page and choose **Open Pixel Team Office in side panel** for a browser-native panel that is less likely to conflict with page layout.

## Install locally

1. Start the Team Studio app with `pnpm dev`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** and choose **Load unpacked**.
4. Select this `browser-extension` directory.
5. Pin the Pixel Team Studio extension, then click it on Claude, ChatGPT, Linear, GitHub, or another normal web page.

The default widget URL is `http://localhost:5174/?view=widget&source=linear`. Open the extension options to use a different local port or deployed HTTPS URL.

Browser-internal pages such as `chrome://settings` do not allow content-script overlays. Use a regular tab or the side-panel command instead. A website Content Security Policy may also reject a third-party iframe; the side panel or separate pop-up remains available in that case.
