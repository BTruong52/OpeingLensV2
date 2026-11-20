# OpeingLensV3

Opening Lens v3.0.0: a Windows chess opening coach with on-board arrows, automatic screen calibration, move-panel recognition, skill-based opening suggestions, and a floating Coach.

## Download for Windows

**[Download the latest tester build](../../releases/latest)**. In Assets, choose `OpeingLensV3-Windows-x64.zip`.

Extract the **entire ZIP** and run **OpeingLensV3.exe**. No Node.js or installation is required for the portable build. Read `READ FIRST.txt` inside the download. Windows 10 (2004+) / Windows 11 x64; unsigned test build.

For Discord, open **Streaming > Discord > Open Stream View** and share the **Opening Lens Stream View** window. Place it outside the captured board and move panel, preferably on a second monitor.

## Report problems

Enable **Developer Mode**, reproduce the issue, then export diagnostics. Review the captured images before attaching a report to an issue. Include Windows version, monitor scaling, playing color, moves played, and expected versus actual behavior. Never include access tokens or account details.

Recognition can vary by board theme, move notation, scrolling and animation. Use the Coach on analysis boards or where assistance is allowed.

## Development and feature documentation

A Windows desktop prototype that draws click-through arrows and highlights directly over a chess board in another app or website. Screen processing and the opening catalog are local. The optional online explorer sends the current chess position to Lichess on request.

## Run

Requires Node.js 22.12 or later with npm.

```powershell
npm install
npm start
```

After installing dependencies, double-click **Launch.cmd** to launch from source.

In this workspace, npm was bootstrapped locally, so you can also use:

```powershell
node .tools/package/bin/npm-cli.js start
```

## First study

1. Open an analysis board or recorded game on your preferred website. Put the coach beside the board or on another monitor.
2. Click **Auto-find board & calibrate** with one full board visible. Opening Lens scans the connected monitors for a flat 8×8 grid and calibrates when exactly one likely board is found. If there is no unique result, choose **Monitor with the chessboard**, then click **Select board on screen** and drag across the 64 squares. Exclude labels and borders. Escape cancels selection. Set the correct orientation before calibrating.
3. Set **Black pieces at the bottom** if needed.
4. Choose an opening and variation. Mint arrows show its next move. The website remains clickable through the overlay. Use **Next move** and **Back** while separately stepping the website replay to the same position.
5. If you selected manually or need to retry, click **Calibrate & start tracking**. The coach and arrows briefly hide, then return. When one position clearly matches, the coach shows the detected opening and last move, and draws the next arrow. If calibration fails, inspect **Check captured board**; for unsupported or ambiguous positions, paste the position’s FEN under **Correct position**, click **Apply position & pause**, and calibrate again. Keep the coach off the board for continuous tracking and wait for each move to register.
6. **Import real game · PGN** loads a game’s main line and displays its player/event metadata. Use a PGN containing one game. Supply your own downloaded game; built-in opening lines are teaching examples, not claimed historical matches.

**Ctrl+Shift+Space** hides/shows the drawings. Closing the control panel closes the overlay.

The Coach checks the selected opening plan automatically. When a tracked move still fits the study line, the book arrow advances. If it leaves that line, the Coach checks whether the plan still works and offers known variations separately. Choosing a variation keeps the current board position. **The line is complete!** appears when the current line ends and there is no next move to show.

For a new game, click **Reset for new game** in **03 / Follow the Position**. This restores the last guided opening or catalog line you chose, even if calibration later identified a different opening. Your skill level and the selected screen region are kept. Reset the analysis board separately, then calibrate again to follow it.

Off-book coaching considers legal moves that reflect the selected line’s opening principles. It tries moves with more recorded master games first when online results are available, then moves that appear in more named catalog lines, then falls back to opening fundamentals. [The local engine](engine/SOURCE.md) runs a bounded search of up to depth 13 so local guidance does not have to wait for an online lookup. If the king is in check, it looks for safe legal defenses, even outside the book. A green arrow marks the recommendation; a dashed red arrow marks a usual opening move that leaves the king in check or failed the tactical check. Red review arrows are examples to avoid.

Try **Italian Game** with `1. e4 c6 2. d4 Qa5+`: the Coach recommends `3. c3` to block the check and support `d4`, and flags `Nf3` as illegal in that position.

The floating Coach opens automatically after successful calibration. It shows one explanation for the current move and replaces it as the position changes. Green arrows show the move to play; dashed amber arrows illustrate the idea; dashed red arrows show a move to avoid. Read-aloud is optional. The Coach and arrows stay on screen during tracking and are excluded from screen capture on supported Windows versions.

To include coaching in a Discord stream, open **Streaming · Discord → Open Stream View**, then choose **Opening Lens Stream View** as the window to share in Discord. This shareable window combines the captured chessboard, correctly oriented arrows, and current Coach explanation. It shows the board and coaching rather than the entire game interface. Keep tracking running and place Stream View on another monitor or outside both capture areas. OLens refuses to capture through an overlapping Stream View to prevent feedback. The view reuses existing tracking captures; it does not run a second capture or analysis loop. Sharing the game window alone will not include the separate OLens windows.

In **02 / Skill Level & Openings**, set **Playing as → Black** to get up to three distinct replies after White's first move. The Coach ranks guided defenses by your skill level and uses catalog replies to fill gaps. Choose a defense in the floating Coach or the main panel. Only your turns get recommendation arrows; board orientation is a separate setting. **Study both sides** keeps the original replay behavior.

To try the Coach, select **Italian Game** and play or manually record `1. e4 a6` from the starting position. The Coach should recommend `2. d4` automatically and explain its control of c5 and e5.

Choose **Beginner**, **Intermediate**, **Hard** or **Expert** under **Opening options by skill level**. The coach offers up to three distinct book moves from the current position, ranked by the lines’ suggested study difficulty. Click one to switch the arrow without resetting the position. Difficulty labels are editorial, and the coach shows fewer options when fewer are loaded.

## Opening library

- **Offline catalog** bundles all 3,815 named lines in a pinned [CC0 Lichess catalog](data/openings/SOURCE.md). Search by name or ECO code, or pick a continuation for the current position. The local index checks position state, so equivalent move orders share continuations. When a catalog line ends, the coach draws the next move from a matching catalog line when available and lists alternatives. Auto-calibration can also check this catalog if the guided lessons do not match. Skill rankings apply to the curated lessons only.
- **Online continuations** queries [Lichess Masters Explorer](https://lichess.org/api#tag/opening-explorer). Use **Create a token on Lichess** and leave additional permissions unchecked. Enter the token in the app; it is held only for the session. Enable **Automatically draw an online arrow when the offline line ends** to send the current position when the study runs out of moves or goes off-book. The Coach prefers the most played returned move that fits the plan and passes its tactical check. You can also run a lookup manually. Counts are game results, not engine evaluations.
- **Opening traps** includes Légal’s Mate, the Blackburne Shilling Trap, the Elephant Trap, and Scholar’s Mate. Each lesson has a line showing what happens if the opponent falls for the trap and a line showing how to avoid it.

## Optional screen move list

**Auto-find board & calibrate** scans the connected screens, then opens a preview on the monitor with the detected board. The green box is the board. If the app finds a **Moves** heading beside it, the amber box is the proposed move-panel crop. Drag a box to move it or use its lower-right handle to resize it. If no panel was detected, use **Draw move panel** or skip it. **Confirm & calibrate** applies the boxes; **Cancel** keeps the previous selection.
     
1. In **01 / Select Board**, select the chessboard, then expand **Move panel · optional**.
2. Click **Select move panel on screen** once and drag around the panel, including blank space for future rows. You can include the **Moves** heading. Keep move 1 visible for initial calibration and exclude clocks and navigation buttons.
3. Opening Lens checks the crop automatically. **Move list readable** means one legal position from the list matched the captured board. **Waiting for the first move** means it recognized an empty move panel; **Needs attention** means the crop or the position could not be confirmed. If watching is enabled, it follows changes automatically. **Reset for new game** clears the move-panel selection and keeps the chessboard region.
     
When **Watch the move list instead of the board** is checked, the app polls the list crop and reads it only after a change has settled. The chessboard is captured again to confirm any new position, so a slow drag alone does not trigger move analysis. Uncheck it for board tracking with OCR as a fallback. The reader accepts regular algebraic notation and coordinate notation such as `e2.e4`. Small piece icons and low-contrast text can still be misread; use letter or coordinate notation if the site offers it. OCR runs locally.

## What board reading means in this prototype

Automatic calibration looks for piece-like texture on the same squares as one position in the built-in repertoire, or the imported game if selected. It does not identify individual pieces or independently read whose turn it is, so visually similar positions may be ambiguous or misidentified. Check the reported position before using the arrows. After calibration, the reader compares square fingerprints against the previous image. After two observations with the same changed-square set, it accepts a move only if exactly one legal move from the known FEN explains those squares. Processing is local; the preview is not saved.

This is not general piece recognition. It cannot discover an arbitrary position from a screenshot, verify the initial FEN, determine the side to move visually, or distinguish promotion pieces. Incorrect calibration can lead to incorrect tracking. Website move highlights, cursor effects, animation, small pieces and themes can interfere. Disable website move highlights if possible. Backward replay, skipped moves, promotions, resizing, scrolling, theme changes and flipping require pausing, correcting the FEN and recalibrating. It does not follow a board that moves on screen. Keep the board inside a single monitor.

During capture the drawing window briefly hides to avoid reading its own arrows; this can cause visible flicker. Screen capture and scaling require validation on the target machine and monitor configuration. Compatibility with every website is a goal, not a verified feature.

Use in analysis, study, replay and other contexts where assistance is permitted.

## Validate

### Developer Mode

Open **Developer Mode** near the bottom of the app and enable recording. It shows selected capture areas, the actual OCR input with word-confidence boxes, raw text, reconstructed rows, parser errors, legal candidate moves, piece-match evidence, position state, monitor scaling, and timings. Recording keeps the latest 100 events and retains the last failure with its capture images.

Use **Last failure** to inspect an intermittent error. Pause tracking before using **Inspect capture now**. **Export diagnostics** saves a JSON report containing the cropped images and recognition details. Review captured regions before sharing the report. Developer Mode starts off each session.

```powershell
npm test
npm run check
```

Automated checks cover chess move inference, coordinate mapping and PGN parsing. The native smoke test verifies selection, overlay placement and successful desktop-capture responses on two monitors, the coach hiding and returning, inference of e4 from separately rendered test-board images, and the opening switch and stop prompts. Live website screen-to-move tracking still requires manual testing.

Run the native smoke test (briefly opens test windows):

```powershell
node node_modules/electron/cli.js . --smoke-test --user-data-dir=.tools/smoke-profile
```

## Next steps


- Theme-independent piece recognition with confidence scores and a visual position editor.
- Automatic board detection and relocation when the page moves.
- Curated, attributed real-game collections and move-specific coaching annotations.
- Replay-backward recognition, promotion confirmation and richer variation trees.
- Packaging into a Windows installer after native smoke testing.

Architecture: Electron main process handles screen capture and native windows; an isolated renderer handles study controls and square fingerprints; chess.js supplies legal moves and PGN parsing. Electron context isolation and sandboxing are enabled; renderers have no Node.js access.
