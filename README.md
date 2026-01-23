# Riichi Tile Efficiency Visualizer
Tiny riichi tile efficiency visualizer I built while trying to improve my tile efficiency.

My initial prototyping for this app was done in [AI Studio](https://ai.studio/apps/drive/1Qx0faOvjmEykIEN7F0wdDpKI-03yUYeh).

## TODOs
Things that I want to improve/implement, priority ordered based important (higher), implementation complexity (lower), complexity burden (lower):
- Move to WASM compiled libriichi. I think long term this is worth it both for performance and so that I don't have to (have Claude) implement all of the Riichi game logic
- Complex shape decomposition is completely non-functional
   - Expanding a complex shape should show all the combinations of simpler shapes that it can be interpreted as
      - e.g. 779p can be 77p 9p or 7p 79p
      - e.g. 23456 can be 234 56 or 23 456
   - Hovering the separate simple shapes should show the acceptance provided by that shape alone
   - The UI for the expand button doesn't look great
   - When two simple shapes are next to each other but don't actually improve ukeire at all, they should be treated as separate shapes in the UI. We only want to treat shapes as complex shapes if when combined the shapes have better/different acceptance than separately.
- Add history / ability to revert to previous states / undo
  - tree based history, e.g. to explore multiple branches, i.e. discarding different tiles from the same Hand
  - chronological history; i.e. showing your discards
- Add dora indicators, dealer/round winds
- Calculate value of hands + yakus
   - show tiles that increase value of hands (maybe an additional color like "blue"); I assume by default we'd want to only include these if they preserve shanten, but include them even if they decrease acceptance somewhat
   - Show score / earned han when showing "Agari" for a winning hand
- Yaku + target hand UI:
   - There's a few different things we want to be able to show: possible yakus with minimal shanten, shanten to all of the different yakus
   - I'm imagining that just above the hand there could be an additional section of the UI that shows a list of all of the possible yakus sorted
   - Perhaps by default we hide yakus having a worse shanten than the best shanten, with a button to expand / show all of them
   - It should be possible to select yaku(s) in the list and make them the target hand, treating that as though that's the best shanten for calculating acceptances even if it is not
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
