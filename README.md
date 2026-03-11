# Oh Hell Scorekeeper

A mobile-friendly, single-file web app for tracking Oh Hell games with custom scoring, editable history, and easy file-based save/load.

## Download

**[⬇️ Download index.html](https://raw.githubusercontent.com/rickytann14/Oh-Hell/main/index.html)**

Save the file and open it directly in your browser — no installation required.

## Highlights

- 📱 Mobile-optimized interface
- 👥 Saved player management (add/remove/import/export)
- 🔄 Optional player-list sync from URL
- 🃏 Trump tracking per round (rank + suit + Normal/Reverse)
- 🎯 Starting hand size with per-round hand-size adjustment
- ✏️ Edit any scored round from history
- 💾 Save and load games as JSON files
- 📤 Clipboard export formatted for Excel
- 📊 Historical stats across multiple saved games

## Getting Started

1. Download `index.html` and open it in your browser.
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
`https://raw.githubusercontent.com/rickytann14/Oh-Hell/main/oh-hell-players.json`

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
- **Hand Size** (starts from your game setup value, then adjustable each round)
- **Trump (Big Boss)** rank + suit
- **Reverse Value**: `N` (Normal) or `R` (Reverse)
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
  - 10 points when player count is 6 or fewer
  - 5 points when player count is 7 or more

## Editing History

Use **✏️ Edit** in **Score History** to modify any scored round:
- hand size
- bids/tax/confidence
- deferred / got set flags

Saving edits recalculates that round and updates overall standings.

## Settings

Open **⚙️ Settings** to configure:

### Player List Sync URL
Enter a URL pointing to a JSON file with your player list. The app fetches updates on load when auto-sync is enabled.
- **Test Player URL** — verifies the endpoint is reachable and returns valid player data.
- **Clear Player URL** — removes the configured sync endpoint.

### History Stats Source URL
Paste a GitHub folder URL (e.g. `https://github.com/owner/repo/tree/main/history`) and the app will auto-discover every JSON game file using the GitHub Contents API for the Stats view.
- **Test History Source** — verifies discovery works and reports how many JSON files were found.
- **Reset History Source** — resets to the default GitHub history folder.

### Auto-sync on app load
When checked, the player list is fetched from the sync URL every time the app loads.

---

## Save, Load, and Export

### Save / Load
- **💾 Save** downloads the current game as JSON.
- **📁 Load** restores a game from JSON.
- Older save shapes are handled for backward compatibility.

### Excel export
- **📤 Export** copies TSV data to clipboard for the `ScoreV2` sheet.
- In Excel: select cell `A1` and paste.

## History Stats

Open **📊 Stats** (setup screen) to view aggregated statistics across all saved game files.

### Data sources
- **Auto-extract** — fetches game JSON files from the configured History Stats Source URL (GitHub Contents API).
- **Manual Folder Pick** — fallback that lets you select a local folder of game JSON files directly in the browser.

Games are deduplicated by `gameId` before analysis.

### Summary tiles
- Total games, unique players, average rounds per game, average players per game, global set rate.

### Per-player stats table
| Column | Description |
|---|---|
| Games Played | Number of games the player appeared in |
| Wins | Games where the player finished with the highest score |
| Win Rate | Wins ÷ Games Played |
| Avg Final Score | Average end-of-game total score |
| Best / Worst Game Score | Highest / lowest total score across all games |
| Bid Accuracy | Percentage of rounds where the player made their bid |
| Set Rate | Percentage of rounds where the player was set |
| Deferred Rate | Percentage of rounds where deferred was checked |
| Zero Bid Success Rate | Percentage of zero-bid rounds that were made |
| Avg Points/Round | Average round score |
| Best / Worst Round Score | Highest / lowest individual round score |

## Header Actions

### Setup screen
- **👥 Manage Players**
- **⚙️ Settings**
- **📖 Rules & Math**
- **📊 Stats**
- **📁 Load Game**

### In-game screen
- **💾 Save**
- **📁 Load**
- **📤 Export**
- **🆕 New**

## Browser Support

Works on modern browsers:
- Chrome / Edge (desktop and mobile)
- Safari (desktop and mobile)
- Firefox

## Privacy

All game/player data is stored locally in your browser unless you use URL sync. URL sync only fetches from the endpoint you configure.
