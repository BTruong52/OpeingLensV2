# Opening Lens

A Windows desktop prototype that draws click-through arrows and highlights directly over a chess board in another app or website. Screen processing and the opening catalog are local. The optional online explorer sends the current chess position to Lichess on request.

## Windows tester download

[Download OpeingLensV4](https://github.com/BTruong52/OpeingLensV2/releases/tag/v4.0.0). Extract the entire ZIP. Run **OpeingLensV4.exe** for the learning version or **Opening Lens (Admin).cmd** for continuous coaching. Neither requires Node.js or an administrator account. Read **READ FIRST.txt** before testing.

This build includes on-board explanation bubbles, deeper Coach explanations, a final learning handoff, faster tracking/recovery, and expanded diagnostics. The proposed interactive opening slideshow, hints-before-arrows, understanding questions, and post-game variation review are not implemented in this build.

## Learning and Admin editions

- **Opening Lens**: launch `Launch.cmd` (or `npm start`). Teach the selected opening setup, offer one engine-checked transition move on the learner’s turn, then retain a plan summary with no further move arrows. Reset for a new game or explicitly choose another lesson to start again.
- **Opening Lens (Admin)**: launch `Launch Admin.cmd` (or `npm run start:admin`). Keep continuous move-by-move coaching, catalog extensions, and position-plan alternatives.

Both editions use the same board/move-panel tracking. They are separate launch modes, not duplicated projects. Admin is an edition label and does not request Windows administrator access.

The first learning release uses bounded lesson endpoints: guided setups cover at least four full moves, up to the selected line’s endpoint (capped at eight full moves); arbitrary catalog lessons have a six-to-ten-full-move window. This marks the **lesson** endpoint, not the end of all opening theory. A deviation does not stop the lesson immediately. The next recommendation after that window is the final transition; after the learner makes a move, recommendation arrows and bubbles stop. If calibration starts beyond the window, the transition is offered from the confirmed current position.

A click-through bubble near the arrow explains the current move briefly. **Show quick explanations on the board** toggles it and remembers the preference. Placement avoids occupied piece areas, the move’s origin/destination, and screen edges in either orientation. When no clear space can fit the bubble, it stays hidden and the Coach retains the explanation. The deeper Coach includes the opening’s purpose, the current reason, relevant reviewed threat, and development/king-safety goals. Bubbles are excluded from OLens’s underlying-window recognition captures.

## Run

Requires Node.js 22.12 or later with npm.

```powershell
npm install
npm start
```

Dependencies are installed in this workspace. Double-click **Launch.cmd** to open the prototype.

In this workspace, npm was bootstrapped locally, so you can also use:

```powershell
node .tools/package/bin/npm-cli.js start
```

## First study

1. Open an analysis board or recorded game on your preferred website. Put the coach beside the board or on another monitor.
2. Click **Auto-find board & calibrate** with one full board visible. Opening Lens scans the connected monitors for a flat 8×8 grid and calibrates when exactly one likely board is found. If there is no unique result, choose **Monitor with the chessboard**, then click **Select board on screen** and drag across the 64 squares. Exclude labels and borders. Escape cancels selection. Confirm or adjust both crop boxes before calibrating. RoChess move panels can be found from numbered rows even without a Moves heading.
3. Check the detected bottom color and **Playing as** setting; adjust **Black pieces at the bottom** if necessary.
4. Choose an opening and variation. Mint arrows show its next move. The website remains clickable through the overlay. Use **Next move** and **Back** while separately stepping the website replay to the same position.
5. If you selected manually, click **Calibrate & start tracking**. The main control panel hides for calibration, then returns. The floating Coach opens automatically. Inspect **Check captured board** if the crop looks wrong.
6. Select the optional **Move panel on screen** in section 01 if it was not found automatically. Include numbered rows and blank space for new moves, keeping the newest rows visible. Use **Advanced → Correct position · FEN** when a position cannot be confirmed.
7. Press **Reset for new game** for every new game, then calibrate again. The app keeps your chosen opening and skill level; reselect the optional move panel after reset.

**Ctrl+Shift+Space** hides/shows the drawings. Closing the control panel closes the overlay.

The Coach checks the selected opening plan automatically. When a tracked move still fits the study line, the book arrow advances. If it leaves that line, the Coach checks whether the plan still works and offers known variations separately. Choosing a variation keeps the current board position. **The line is complete!** appears when the current line ends and there is no next move to show.

For a new game, click **Reset for new game** in **03 / Follow the Position**. This restores the last guided opening or catalog line you chose, even if calibration later identified a different opening. Your skill level and the selected screen region are kept. Reset the analysis board separately, then calibrate again to follow it.

Off-book coaching considers legal moves that reflect the selected line’s opening principles. It tries moves with more recorded master games first when online results are available, then moves that appear in more named catalog lines, then falls back to opening fundamentals. [The local engine](engine/SOURCE.md) runs a bounded search of up to depth 13 so local guidance does not have to wait for an online lookup. If the king is in check, it looks for safe legal defenses, even outside the book. A green arrow marks the recommendation; a dashed red arrow marks a usual opening move that leaves the king in check or failed the tactical check. Red review arrows are examples to avoid.

Try **Italian Game** with `1. e4 c6 2. d4 Qa5+`: the Coach recommends `3. c3` to block the check and support `d4`, and flags `Nf3` as illegal in that position.

The floating Coach opens automatically after successful calibration. It shows one explanation for the current move and replaces it as the position changes. Green arrows show the move to play; dashed amber arrows illustrate the idea; dashed red arrows show a move to avoid. Read-aloud is optional. The Coach and arrows stay visible during tracking. On Windows, OLens reads a continuous video of the underlying game/browser window, so its own arrows and Coach do not contaminate recognition.

To include coaching in Discord, share the **desktop screen / monitor** containing the board and Coach. The overlay windows are capture-visible; the separate Stream View has been removed. Sharing only the game window does not include separate desktop overlays. Automated tests verify that visible arrows and an overlapping Coach are absent from OLens's own capture; an actual Discord viewer session still needs checking on the tester's setup.

In **02 / Skill Level & Openings**, set **Playing as → Black** to get up to three distinct replies after White's first move. The Coach ranks guided defenses by your skill level and uses catalog replies to fill gaps. Choose a defense in the floating Coach or the main panel. Only your turns get recommendation arrows; board orientation is a separate setting. **Study both sides** keeps the original replay behavior.

To try the Coach, select **Italian Game** and play or manually record `1. e4 a6` from the starting position. The Coach should recommend `2. d4` automatically and explain its control of c5 and e5.

Choose **Beginner**, **Intermediate**, **Hard** or **Expert** under **Opening options by skill level**. The coach offers up to three distinct book moves from the current position, ranked by the lines’ suggested study difficulty. Click one to switch the arrow without resetting the position. Difficulty labels are editorial, and the coach shows fewer options when fewer are loaded.

## Opening library

- **Offline catalog** bundles all 3,815 named lines in a pinned [CC0 Lichess catalog](data/openings/SOURCE.md). Search by name or ECO code, or pick a continuation for the current position. The local index checks position state, so equivalent move orders share continuations. When a catalog line ends, the coach draws the next move from a matching catalog line when available and lists alternatives. Auto-calibration can also check this catalog if the guided lessons do not match. Skill rankings apply to the curated lessons only.
- **Online continuations** queries [Lichess Masters Explorer](https://lichess.org/api#tag/opening-explorer). Use **Create a token on Lichess** and leave additional permissions unchecked. Enter the token in the app; it is held only for the session. Enable **Automatically draw an online arrow when the offline line ends** to send the current position when the study runs out of moves or goes off-book. The Coach prefers the most played returned move that fits the plan and passes its tactical check. You can also run a lookup manually. Counts are game results, not engine evaluations.
- **Opening traps** includes Légal’s Mate, the Blackburne Shilling Trap, the Elephant Trap, and Scholar’s Mate. Each lesson has a line showing what happens if the opponent falls for the trap and a line showing how to avoid it.

## Optional screen move list

**Auto-find board & calibrate** scans the connected screens, then opens a preview on the monitor with the detected board. The green box is the board. If the app finds numbered move rows or a **Moves** heading beside it, the amber box is the proposed move-panel crop. Drag a box to move it or use its lower-right handle to resize it. If no panel was detected, use **Draw move panel** or skip it. **Confirm & calibrate** applies the boxes; **Cancel** keeps the previous selection.

1. In **01 / Select Board**, select the chessboard, then use the visible **Move panel** controls.
2. Click **Select move panel on screen** once and drag around the panel, including blank space for future rows. You can include the **Moves** heading. Keep move 1 visible for initial calibration and exclude clocks and navigation buttons.
3. Opening Lens checks the crop automatically. **Move list readable** means one legal position from the list matched the captured board. **Waiting for the first move** means it recognized an empty move panel; **Needs attention** means the crop or the position could not be confirmed. If watching is enabled, it follows changes automatically. **Reset for new game** clears the move-panel selection and keeps the chessboard region.

When **Use the board and move panel together** is checked, the app polls the list crop and reads it only after a change has settled. The chessboard is captured again to confirm any new position, so a slow drag alone does not trigger move analysis. Uncheck it for board tracking with OCR as a fallback. The reader accepts regular algebraic notation and coordinate notation such as `e2.e4`. Small piece icons and low-contrast text can still be misread; use letter or coordinate notation if the site offers it. OCR runs locally.

## What board reading means in this prototype

Automatic calibration looks for piece-like texture on the same squares as one position in the built-in repertoire, or the selected guided line. It does not identify individual pieces or independently read whose turn it is, so visually similar positions may be ambiguous or misidentified. Check the reported position before using the arrows. After calibration, the reader compares square fingerprints against the previous image. After stable observations, a legal move must also match piece-shape evidence. A move-panel change plus a uniquely confirmed board move bypasses OCR for speed. A unique two-half-move path can catch up when both players move between samples. Longer sequences use the changed move-panel rows and legal replay; stale OCR is discarded if new moves arrive. Recognition retries automatically rather than permanently pausing on a mismatch. Processing is local; selected crop previews are retained in the in-memory diagnostic report.

This is not general piece recognition. It cannot discover an arbitrary position from a screenshot, verify the initial FEN, determine the side to move visually, or distinguish promotion pieces. Incorrect calibration can lead to incorrect tracking. Website move highlights, cursor effects, animation, small pieces and themes can interfere. Disable website move highlights if possible. Backward replay, promotions that cannot be identified, resizing, theme changes, or flipping may require correcting the FEN and recalibrating. Fast forward play is recovered when the legal path is uniquely supported; unlimited skipped moves without readable history cannot be guaranteed. It does not follow a board that moves on screen. Keep the board inside a single monitor.

The drawing and Coach windows do not hide during ordinary capture. Windows 10/11 capture uses a small window-bounds helper, compiled locally with the Windows .NET Framework compiler on first use. No separate Python or OCR service is needed. Screen capture and scaling require validation on the target machine and monitor configuration. Compatibility with every website is a goal, not a verified feature.

Use in analysis, study, replay and other contexts where assistance is permitted.

## Validate

### Developer Mode

Open **Developer Mode** near the bottom of the app. Recording starts enabled and can be turned off. It shows selected capture areas, the actual OCR input with word-confidence boxes, raw text, reconstructed rows, parser errors, legal candidate moves, piece-match evidence, position state, monitor scaling, and timings. Recording keeps the latest 300 events and retains the latest failure plus up to three recent failure snapshots with capture images.

Use **Last failure** to inspect an intermittent error. Pause tracking before using **Inspect capture now**. **Export diagnostics** saves a JSON report containing the cropped images and recognition details. Review captured regions before sharing the report. The export also includes selected regions, monitor scaling, clean-window capture source, runtime/GPU details, arrows, Coach state, current and confirmed positions, and timings. Tokens are excluded. Only selected crops are retained; the entire desktop is not exported.

```powershell
npm test
npm run check
```

Automated checks cover chess move inference, coordinate mapping and PGN parsing. The native smoke test verifies selection, overlay placement and successful desktop-capture responses on two monitors, visible Coach/arrow exclusion from the underlying game capture, inference of e4 from separately rendered test-board images, and the opening switch and stop prompts. Live website screen-to-move tracking still requires manual testing.

Run the native smoke test (briefly opens test windows):

```powershell
node node_modules/electron/cli.js . --admin --smoke-test --user-data-dir=.tools/smoke-profile
```

## Next steps


- Theme-independent piece recognition with confidence scores and a visual position editor.
- Automatic board detection and relocation when the page moves.
- Curated, attributed real-game collections and move-specific coaching annotations.
- Replay-backward recognition, promotion confirmation and richer variation trees.
- Packaging into a Windows installer after native smoke testing.

Architecture: Electron main process handles screen capture and native windows; an isolated renderer handles study controls and square fingerprints; chess.js supplies legal moves and PGN parsing. Electron context isolation and sandboxing are enabled; renderers have no Node.js access.

## Screenshot regression cases

Run `node node_modules/electron/cli.js test/multi-layout.cjs --user-data-dir=.tools/layout-test`. The supplied RoChess and Chess.com crops cover both orientations, times/badges, captures, check/checkmate, and scrolled late-game rows. The Chess.com QGD full-history cold OCR case remains unclear: its regression uses the board catch-up path with a synthetic prior fingerprint built from actual current sprites. Other cold-calibration ambiguity still requires manual confirmation/FEN.

The opening catalog ships a hash-checked prepared index. Regenerate it after changing TSV data with `node -e "require('./src/catalog.cjs').buildCatalog('data/openings',{useCache:false,writeCache:true})"`. A stale index is ignored automatically.

Learning end-to-end check: `node node_modules/electron/cli.js . --learning-test --user-data-dir=.tools/learning-check`. It covers bubbles, clean capture, White/Black orientation, one transition recommendation, persistent handoff, and reset.
