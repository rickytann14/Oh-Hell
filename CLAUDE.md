# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **single-file, zero-dependency web app** (`index.html`) for tracking Oh Hell card games. It runs entirely in the browser — no build step, no server, no npm. Open `index.html` directly to use it.

The app is also deployed on GitHub Pages: `https://rickytann14.github.io/Oh-Hell/`

## Development

There is no build, lint, or test toolchain. To develop:

1. Edit `index.html` directly.
2. Open `index.html` in a browser to test.
3. Reload the page after each change.

For quick iteration on stats or scoring logic, use browser DevTools console — all functions are in global scope.

## Architecture

`index.html` is structured as:
- **Lines 1–9**: `<head>` / meta
- **Lines 10–823**: `<style>` — all CSS (mobile-first, responsive)
- **Lines 824–956**: `<body>` HTML — two top-level screens (`#setupScreen`, `#gameScreen`) plus six modals (`settingsModal`, `managePlayersModal`, `gamePlayersModal`, `editRoundModal`, `rulesModal`, `statsModal`)
- **Lines 957–4166**: `<script>` — all JavaScript

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
| `scoreRound()` | Validates bids, applies scores, updates `gameState` |
| `normalizeGameState(game)` | Backward-compat normalization when loading saved JSON |
| `analyzeHistoryGames(inputGames)` | Aggregates all per-player stats from an array of saved game objects |
| `renderStatsContent(allGames)` | Renders the stats modal HTML from analyzed data |
| `renderRoundSetup()` | Re-renders the active round UI |
| `renderGame()` | Re-renders the in-game screen |
| `renderHistory()` | Re-renders the scored-round history panel |
| `setActiveView(view)` | Switches between `'setup'` and `'game'` views |
| `getNextDealerIndex(previousRound)` | Dealer rotation logic across active players |

### Scoring Formula

```
Got Set:          -confidence - deferred(2) - tax
Made positive bid: 10 + bid² + confidence - deferred(2) - tax
Made zero bid:    zeroBonus + handSize + confidence - deferred(2) - tax
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
