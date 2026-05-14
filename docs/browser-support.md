# Browser Support Matrix

First public launch target: desktop browsers. Mobile and tablet should show a desktop-recommended path in a separate P0 item.

| Browser target | Verification project | Coverage |
| --- | --- | --- |
| Chrome | `chromium-chrome-edge` | Chromium engine via Playwright Desktop Chrome |
| Edge | `chromium-chrome-edge` | Same engine family as Chrome; run a headed Edge channel pass if Edge-specific UI breaks |
| Firefox | `firefox` | Playwright Desktop Firefox |
| Safari | `webkit-safari` | Playwright Desktop Safari/WebKit engine |

Run the production matrix:

```bash
npm run test:browsers:prod
```

The matrix builds the app, serves `dist/` through Vite preview, and verifies that each browser can boot the title screen, render the canvas, and enter `PrologueScene` without runtime errors. It runs browsers sequentially so production asset loading and Phaser startup are measured per engine instead of competing across three simultaneous game boots.

Record final launch evidence here after each release-candidate run:

| Date | Command | Result |
| --- | --- | --- |
| 2026-05-14 | `npm run test:browsers:prod` | Passed: Chromium/Chrome-Edge 17.2s, Firefox 19.4s, WebKit/Safari 25.7s |
