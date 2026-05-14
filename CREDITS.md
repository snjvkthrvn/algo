# Credits

## Algorithmia: The Path of Logic

A first-principles CS education game in the shape of a Game Boy-era adventure.

---

## Made by

- **Design, narrative, and development:** the Algorithmia contributors

---

## Open-source software

This project would not exist without the following open-source projects, each used under their respective licenses.

| Project | License | Purpose |
|---|---|---|
| [Phaser 3](https://phaser.io/) | MIT | 2D game engine |
| [Vite](https://vitejs.dev/) | MIT | Build tool and dev server |
| [TypeScript](https://www.typescriptlang.org/) | Apache-2.0 | Language and type-checking |
| [Vitest](https://vitest.dev/) | MIT | Unit test runner |
| [Playwright](https://playwright.dev/) | Apache-2.0 | End-to-end visual regression + browser-matrix testing |

A full dependency tree is in `package-lock.json`. Every transitive dependency retains its original license.

---

## AI tooling

Parts of the development workflow used AI agents and code-generation tools. They wrote code that humans reviewed, edited, and shipped. No AI tool is shipped inside the game itself.

- **[Claude Code](https://claude.com/claude-code)** (Anthropic) — agentic coding assistant used for implementation passes, refactors, and audit work.
- **OpenAI Codex CLI** — used for parallel implementation and the built-in **`/imagegen`** skill that generated several in-game character sprites (including the Village Elder portrait).
- **Gemini CLI** (Google) — used for wide-context repository audits during pre-ship review.

---

## Visual inspiration

- The **Game Boy 4-color palette** (Nintendo, 1989). Specific hex values used: `#081820`, `#346856`, `#88c070`, `#e0f8d0`. Algorithmia is an homage; Nintendo retains all trademarks and Game Boy IP.
- Top-down adventure pacing and dialogue-box affordances inspired by the Pokémon and Zelda Game Boy / Game Boy Color generations.

---

## In-game generated assets

Several character sprites and region backdrops were generated using AI image tools (`gpt-image-2` via the Codex CLI `image_gen` tool, plus xAI Grok image generation) following strict GB-palette prompts. Specifically:

- `village_elder.png` — Codex CLI `/imagegen` skill, chroma-key workflow, validated to 4-color palette + transparent alpha.
- The region overworld backdrops (`array_plains_grounded_v1`, `twin_rivers_grounded_v1`, etc.) — generated during the visual-revamp pass.

The generated bitmap outputs are released under the same MIT license as the rest of the project.

---

## Educational sources

The game's puzzle design, complexity discussions, and Concept Bridge content draw from public computer-science material that's the common heritage of the field. No proprietary curriculum was used.

---

## Thanks

To everyone who playtested the demo, to the open-source maintainers whose code is doing the heavy lifting, and to the AI tools that made shipping a single-developer game in this scope possible.
