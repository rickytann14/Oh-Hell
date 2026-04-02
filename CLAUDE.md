# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **zero-dependency web app** for tracking Oh Hell card games. It runs entirely in the browser — no build step, no server, no npm. Open `index.html` directly to use it.

The app is also deployed on GitHub Pages: `https://rickytann14.github.io/Oh-Hell/`

## Development

There is no build, lint, or test toolchain. To develop:

1. Edit the relevant file: JS logic lives in `js/*.js` modules, CSS in `styles.css`, and HTML structure in `index.html`.
2. Open `index.html` in a browser to test.
3. Reload the page after each change.

For quick iteration on stats or scoring logic, use browser DevTools console — all functions are in global scope.

**Offline bundle**: `offline/index.html` is a manually bundled single-file version. It must be updated separately after making changes to the main app.

## Architecture

The app uses two top-level screens (`#setupScreen`, `#gameScreen`) plus six modals (`settingsModal`, `managePlayersModal`, `gamePlayersModal`, `editRoundModal`, `rulesModal`, `statsModal`) defined in `index.html`. JS modules are loaded via `<script>` tags at the bottom of `index.html` in dependency order.

### Module Responsibilities

| File | Purpose |
|---|---|
| `js/state.js` | Global `gameState`, constants (ranks, suits, reverse modes), module-level variables |
| `js/utils.js` | Pure helpers: `normalizeGameState`, `escapeHtml`, `parseTrumpCard`, URL normalizers |
| `js/storage.js` | `autoSave`, `loadAutoSave`, history game caching to localStorage |
| `js/players.js` | Saved-player CRUD, sync from URL (`syncPlayersFromUrl`), `updatePlayerInputs` |
| `js/scoring.js` | `calculatePlayerRoundScore`, `calculateProjectedTotal` |
| `js/rounds.js` | Round lifecycle (`startNewRound`, `nextRound`, `undoLastRound`), all `gameState` mutation functions for bids/tax/confidence/gotSet/trump |
| `js/history.js` | History file discovery/loading, `analyzeHistoryGames`, `renderStatsContent` |
| `js/rendering.js` | All DOM rendering: `renderGame`, `renderScoreboard`, `renderHistory`, `renderRoundSetup`, `endGame`, `setActiveView` |
| `js/modals.js` | Modal open/close, `editRound` and its mutation helpers, settings, save/load forms |
| `js/lifecycle.js` | `startGame`, `saveGame`, `newGame`, `exportToExcel` |
| `js/init.js` | `DOMContentLoaded` bootstrap, event delegation setup, tooltip positioning |

### State Model

The single mutable global is `gameState`:
```js
{
  players: [{ name, score, active, previousPosition, rounds }],
  rounds:  [{ handSize, trumpSuit, reverseValue, dealerIndex, scored,
               exactBidBlocks, playerData: [{ bid, tax, deferred, confidence,
               gotSet, score, participating, absentReason }] }],
  currentRound: Number,
  startingHandSize: Number,
  gameId: String,
  createdAt: String
}
```

Auto-save to `localStorage` happens after every mutation via `autoSave()`. Games are saved/loaded as JSON files.

### Key Functions

| Function | Purpose |
|---|---|
| `calculatePlayerRoundScore(round, pdata, gotSet)` | Core scoring formula — single source of truth |
| `scoreRound()` | Validates bids (no exact bids allowed), applies scores, updates `gameState` |
| `normalizeGameState(game)` | Backward-compat normalization when loading saved JSON |
| `analyzeHistoryGames(inputGames)` | Aggregates 20+ per-player stats from an array of saved game objects |
| `renderStatsContent(allGames)` | Renders the stats modal HTML from analyzed data |
| `renderRoundSetup()` | Re-renders the active round UI |
| `renderGame()` | Re-renders the in-game screen |
| `setActiveView(view)` | Switches between `'setup'` and `'game'` views |
| `getNextDealerIndex(previousRound)` | Dealer rotation logic across active players |

### Scoring Formula

```
Got Set:           -confidence - deferred(2) - tax
Made positive bid:  10 + bid² + confidence - deferred(2) - tax
Made zero bid:      zeroBonus + handSize + confidence - deferred(2) - tax
  zeroBonus = 10 if ≤6 players, else 5
  MAX confidence = 10 (positive bid) or 5 (zero bid)
```

### Stats Pipeline

`analyzeHistoryGames()` → `renderStatsContent()` → modal HTML

History games are fetched from GitHub via the Contents API (URL stored in `localStorage` under `ohHellHistorySourceUrl`), or from a manually selected local folder. Games are deduplicated by `gameId` before analysis. The `history/` folder in the repo is the canonical set of real game saves.

### View/Modal Pattern

Two permanent screens (`#setupScreen` / `#gameScreen`) are toggled with `.hidden`. Modals use `.modal` / `.modal.active` classes. All modal open/close functions follow the `openXxxModal()` / `closeModal('xxxModal')` pattern.

### Player List Sync

`oh-hell-players.json` in the repo root is the canonical player list, synced on app load when auto-sync is enabled. The URL is configurable in Settings.

## Game Data Format

Saved game files live in `history/`. Each is a JSON snapshot of `gameState` with a top-level `gameId` and `createdAt`. The `normalizeGameState()` function handles schema differences between old and new saves.
