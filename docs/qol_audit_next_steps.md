# Quality Of Life Audit And Next Steps

Date: 2026-04-30

## Audit Findings

- Title menu Continue was binary: it appeared for any localStorage value, even invalid JSON, and gave no clue which region would resume.
- Settings modal contained a non-ASCII arrow hint that can render as mojibake in some terminals/build paths.
- Region choice puzzles used repeated ad hoc option rectangles. The visuals were consistent enough, but pointer hit areas and hover feedback were too thin for a production-feeling puzzle UI.

## Changes Applied

- `SaveLoadManager` now has `getSavedState()` for non-mutating save preview and validates save data before `hasSave()` returns true.
- `MenuScene` now shows a compact Continue summary with the saved region and solved puzzle count.
- `MenuScene` now reports a failed Continue load instead of failing silently.
- `REGION_DISPLAY_NAMES` centralizes player-facing region names for save summaries and future UI.
- Choice puzzle rows now use `src/ui/ChoiceButton.ts`, giving Twin Rivers through The Core a shared full-hitbox option button with hover/press feedback.
- Settings copy now uses ASCII text: `Tab switch | arrows adjust`.

## Recommended Next Steps

- [x] Add a pause/menu overlay in playable regions with Resume, Settings, Return To Title, and Clear Save. *(Implemented via PauseOverlayScene)*
- [ ] Add a small progress ledger per region so players can see which encounters are complete before facing the boss.
- [ ] Add region-specific music or ambience instead of reusing the prologue BGM everywhere.
- [ ] Split asset loading by region after deployment smoke testing; the current global preload is reliable but will keep growing.
- [x] Add a final end-state after Protocol Omega so The Core has a clear completion moment and credits/continue behavior. *(Implemented via EndGameScene)*
