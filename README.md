# Oh Hell Scorekeeper

A mobile-friendly, single-file web app for tracking Oh Hell games with custom scoring, editable history, and easy file-based save/load.

## Download

**[⬇️ Download oh-hell-scorekeeper.html](https://raw.githubusercontent.com/rickytann14/Oh-Hell/refs/heads/main/oh-hell-scorekeeper.html)**

Save the file and open it directly in your browser — no installation required.

## Highlights

- 📱 Mobile-optimized interface
- 👥 Saved player management (add/remove/import/export)
- 🔄 Optional player-list sync from URL
- 🃏 Trump tracking per round (rank + suit)
- 🎯 Manual hand size entry each round
- ✏️ Edit any scored round from history
- 💾 Save and load games as JSON files
- 📊 Per-game player stats
- 📤 Clipboard export formatted for Excel

## Getting Started

1. Download `oh-hell-scorekeeper.html` and open it in your browser.
2. Open **Manage Players** and add your player list.
3. Set **Number of Players** and choose players.
4. Set **Starting Hand Size**.
5. Click **Start Game**.

## Player List Management

### Local Storage (default)
- Add players from **Manage Players**.
- Player names are stored in browser local storage.
- Export/import JSON to back up or move between devices.

### Sync from URL (optional)
Use **Settings** to configure a URL that returns either:
- an array of names, or
- an object with a `players` array.

When auto-sync is enabled, player updates are fetched on app load.

#### Example GitHub raw URL
`https://raw.githubusercontent.com/rickytann14/Oh-Hell/refs/heads/main/oh-hell-players.json`

### Player JSON format
```json
{
  "exportDate": "2026-02-12T00:00:00.000Z",
  "players": [
    "Sharon",
    "Josh",
    "Ricardo",
    "Peter"
  ]
}
```

## Game Flow

### Round setup
For each round, enter:
- **Hand Size** (manual each round)
- **Trump (Big Boss)** rank + suit
- Player **Bid**, **Tax**, **Confidence**, **Deferred**, and **Got Set**

### Validation before scoring
- **Exact bids are invalid**: total bids cannot equal hand size.
- At least one player must be marked **Got Set**.

### After scoring a round
- **↩️ Undo Round** reverses that round’s score impact.
- **➡️ Next Round** starts the next round.
- **🏁 End Game** shows final rankings.

## Scoring Rules

### If player got set
`score = -confidence - deferredPenalty - tax`

### If player made bid and bid > 0
`score = 10 + (bid × bid) + confidence - deferredPenalty - tax`

### If player made zero bid
`score = zeroBonus + handSize + confidence - deferredPenalty - tax`

### Modifiers
- **Confidence**: `MAX`, `10`, `5`, `0`
  - `MAX` = 10 for positive bids, 5 for zero bids
- **Deferred penalty**: 2 points when deferred is checked
- **Tax**: custom penalty subtracted from score
- **Zero bonus**:
  - 10 points when player count is 9 or fewer
  - 5 points when player count is 10 or more

## Editing History

Use **✏️ Edit** in **Score History** to modify any scored round:
- hand size
- bids/tax/confidence
- deferred / got set flags

Saving edits recalculates that round and updates overall standings.

## Save, Load, and Export

### Save / Load
- **💾 Save** downloads the current game as JSON.
- **📁 Load** restores a game from JSON.
- Older save shapes are handled for backward compatibility.

### Stats
- **📊 Stats** shows per-player totals, rounds won/set, average score, and total bids.

### Excel export
- **📤 Export** copies TSV data to clipboard for the `Scorev2` sheet.
- In Excel: select cell `A1` and paste.

## Header Actions

### Setup screen
- **👥 Manage Players**
- **⚙️ Settings**
- **📖 Rules & Math**
- **📁 Load Game**

### In-game screen
- **💾 Save**
- **📁 Load**
- **📊 Stats**
- **📤 Export**
- **🆕 New**

## Browser Support

Works on modern browsers:
- Chrome / Edge (desktop and mobile)
- Safari (desktop and mobile)
- Firefox

## Privacy

All game/player data is stored locally in your browser unless you use URL sync. URL sync only fetches from the endpoint you configure.
