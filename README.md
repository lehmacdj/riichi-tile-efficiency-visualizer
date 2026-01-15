# Riichi Tile Efficiency Visualizer
Tiny riichi tile efficiency visualizer I built while trying to improve my tile efficiency.

My initial prototyping for this app can be found in [AI Studio](https://ai.studio/apps/drive/1Qx0faOvjmEykIEN7F0wdDpKI-03yUYeh).

## TODOs
Things that I want to improve, priority ordered based on how important I think they are (higher in list) and how complex I think they will be to implement (lower in list).
- Lag when pre-computing shanten/ukeire with 14 tiles, move processing to web workers so that UI doesn't stall + have useful loading states
- Add tests for shanten calculations/use Rust's libriichi via WASM for calculations; I'm not aware of any problems, but it's not the most robust, and we need to add tests before tackling difficult game logic problems to be certain that our logic is robust.
- Complex shape decomposition is completely non-functional
   - Expanding a complex shape should show all the combinations of simpler shapes that it can be interpreted as
      - e.g. 779p can be 77p 9p or 7p 79p
      - e.g. 23456 can be 234 56 or 23 456
   - Hovering the separate simple shapes should show the acceptance provided by that shape alone
   - The UI for the expand button doesn't look great
   - When two simple shapes are next to each other but don't actually improve ukeire at all, they should be treated as separate shapes in the UI. We only want to treat shapes as complex shapes if combined the shapes have better acceptance than separately.
- Add history / ability to revert to previous states / undo
  - tree based history, e.g. to explore multiple branches, i.e. discarding different tiles from the same Hand
  - chronological history; i.e. showing your discards
- Add dora indicators, dealer/round winds

## Run Locally
**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
