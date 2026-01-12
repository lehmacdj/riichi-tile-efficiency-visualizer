# Riichi Tile Efficiency Visualizer
Tiny riichi tile efficiency visualizer I built while trying to improve my tile efficiency.

## TODOs
Things that I kind of want to implement / improve:
- Complex shape decomposition is completely non-functional
- Lag when pre-computing shanten/ukeire with 14 tiles, move processing to web workers
- Add tests for shanten calculations/use Rust's libriichi via WASM for calculations; I'm not aware of any problems, but it's not the most robust
- Add history / ability to revert to previous states / undo
  - chronological history
  - tree based history, e.g. to explore multiple branches, i.e. discarding different tiles from the same Hand
- Separate discarded tiles from the wall
- Dora indicators, dealer/round winds

## Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Qx0faOvjmEykIEN7F0wdDpKI-03yUYeh

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
