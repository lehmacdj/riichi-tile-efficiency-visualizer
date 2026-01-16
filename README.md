# Riichi Tile Efficiency Visualizer
Tiny riichi tile efficiency visualizer I built while trying to improve my tile efficiency.

My initial prototyping for this app can be found in [AI Studio](https://ai.studio/apps/drive/1Qx0faOvjmEykIEN7F0wdDpKI-03yUYeh).

## TODOs
Things that I want to improve/implement, priority ordered based important (higher), implementation complexity (lower), complexity burden (lower):
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
- Calculate value of hands + yakus; show tiles that increase value of hands
   - Show score / earned han when showing "Agari" for a winning hand
- Visualize graph of draws/discards that can lead to completing a hand (or just a particular shape)
   - We can sort/quotient draw order where it is deterministic; e.g. if the 7m must be drawn to complete an 89m shape, we can split on that decision first to make the tree of possibilities less branchy
   - Significant amounts of pruning would probably be necessary for 3-shanten and lower hands (2-shanten is probably computationally feasible to just brute force?)
- Setting for English vs Japanese terminology
   - e.g. instead of 1-Shanten => 1-Away, Tenpai => Ready, Agari => Winning Shape, English vs Japanese Yaku names etc.
   - We may want separate settings/toggles for different categories of term too, e.g. someone might want English Yaku names, but 1-Away, Ready, etc.

## Run Locally
**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`
