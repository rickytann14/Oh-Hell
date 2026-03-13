# Oh Hell Scorekeeper

A mobile-friendly, single-file web app for tracking Oh Hell games with custom scoring, editable history, mid-game player management, and easy file-based save/load.

## Live Site

**[🌐 Open on GitHub Pages](https://rickytann14.github.io/Oh-Hell/)**

## Download

**[⬇️ Download index.html](https://raw.githubusercontent.com/rickytann14/Oh-Hell/main/index.html)**

Save the file and open it directly in your browser — no installation required.

## Highlights

- 📱 Mobile-optimized interface
- 👥 Saved player management (add/remove/import/export)
- 🔄 Optional player-list sync from URL
- 💾 Auto-save to browser (never lose progress)
- 🃏 Trump tracking per round (rank + suit + Normal/Reverse)
- 🎯 Starting hand size with per-round hand-size adjustment
- ✏️ Edit any scored round from history with score prediction
- ↩️ Undo/reverse any scored round
- ➕ Add players mid-game with automatic missed-round credit
- 🪑 Manage active/inactive players during gameplay
- 💾 Save and load games as JSON files
- 📤 Clipboard export formatted for Excel
- 📊 Historical stats and analytics across multiple saved games
- 📖 Built-in comprehensive rules guide with scoring examples
- 📘 In-app README screen for quick reference
- 🎴 Bid status tracking (Under/Over/Exact)

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

### Setup
1. Open **Manage Players** and add your player list
2. Set **Number of Players** (3-11) and choose players
3. Set **Starting Hand Size** (typically 1-15)
4. Click **Start Game** to begin

The game's starting hand size is used for round 1, then you can manually adjust per-round as needed.

### Round Setup
For each round, enter:
- **Hand Size** (starts from your game setup value, then adjustable each round)
- **Trump (Big Boss)**: rank + suit
- **Reverse Value**: `N` (Normal) or `R` (Reverse)
- Player **Bid**, **Tax**, **Confidence**, **Deferred**, and **Got Set**

**Score Prediction** shows what score each player will receive if they make their bid or get set, before you score the round.

**Dealer** is marked with 🎴 — rotates through active players each round.

### Bid Validation
- **Under (🦆)**: total bids < hand size - Valid ✅
- **Over (🦢)**: total bids > hand size - Valid ✅  
- **Exact (❌)**: total bids = hand size - INVALID, cannot score

### After Scoring a Round
Four options appear:
- **↩️ Undo Round** — reverses that round's score impact and resets the round to unscored
- **➡️ Next Round** — starts the next round with incremented/decremented hand size
- **🏁 End Game** — shows final rankings and game over screen
- **✏️ Edit** (in history) — modify any scored round

### Table Management
During play, click **👥 Table** to:
- See active players with current round contribution
- View disabled players (won't participate in new rounds)
- **Disable players mid-game** (minimum 3 must remain active)
- **Add new players mid-game** with automatic catch-up points based on scored rounds

Players added after rounds have been scored receive **missed-round credit** equal to:
- `Math.round(((activePlayerCount - 2) * 20) / activePlayerCount)` points per scored round missed

## Scoring Rules

The app uses a classic Oh Hell scoring system:

- **Got Set**: `–confidence – deferredPenalty – tax`
- **Made Positive Bid**: `10 + (bid²) + confidence – deferredPenalty – tax`
- **Made Zero Bid**: `zeroBonus + handSize + confidence – deferredPenalty – tax`

### Key Modifiers
- **Confidence**: MAX (10), 10, 5, or 0 points
- **Deferred**: –2 penalty when deferred is checked
- **Tax**: Custom penalty subtracted from score  
- **Zero Bonus**: 10 points (≤6 players) or 5 points (>6 players)

For complete examples and detailed breakdowns, open **📖 Rules & Math** from the setup screen.

## Editing History

Use **✏️ Edit** in **Score History** to modify any scored round. Edit mode includes:

- **Hand Size**
- **Trump** (rank + suit)
- **Reverse Value**
- Individual player **bid**, **tax**, **confidence**, **deferred**, and **got set** flags
- **Score Prediction** showing projected totals for each scenario

**Bid Status** (Under/Over/Exact) updates live as you change bids.

After saving edits, scores recalculate automatically and overall standings update.

## Settings

Open **⚙️ Settings** to configure:

### Player List Sync URL
Enter a URL pointing to a JSON file with your player list. The app fetches updates on load when auto-sync is enabled.
- **Test Player URL** — verifies the endpoint is reachable and returns valid player data, shows count of synced players
- **Clear Player URL** — removes the configured sync endpoint and resets to default

### History Stats Source URL
Paste a GitHub folder URL (e.g. `https://github.com/owner/repo/tree/main/history`) and the app will auto-discover every JSON game file using the GitHub Contents API for the Stats view.
- **Test History Source** — verifies discovery works and reports how many JSON files were found
- **Reset History Source** — resets to the default GitHub history folder

### Auto-sync on app load
When checked, the player list is fetched from the sync URL every time the app loads.

---

## Save, Load, and Export

### Auto-save
- Games are automatically saved to your browser's local storage after every action (bid change, score, etc.)
- If the app crashes or you close the browser unexpectedly, your game is recovered on reload
- Auto-save is cleared when you start a new game explicitly

### Save / Load
- **💾 Save** downloads the current game state as a JSON file with name format: `oh-hell-YYYY-MM-DD-rN.json`
- **📁 Load** restores a previously saved game from JSON
- Supports backward compatibility with older game save formats

### Excel export
- **📤 Export** copies TSV data to clipboard formatted for the `ScoreV2` sheet
- In Excel: select cell `A1` and paste
- Includes full game state, scores, and player details

---

## New Features

### Mid-Game Player Management

During active gameplay, click **👥 Table** to:

#### Add Players
- Choose from saved players or add a new player by name
- New players receive **missed-round credit** for each round already scored
- Credit formula: `Math.round(((activePlayerCount - 2) * 20) / activePlayerCount)` per scored round
- Players can be added until you have 11 active players maximum

#### Disable Players
- Remove a player from active participation (minimum 3 must remain active)
- Disabled players won't participate in new rounds
- They remain visible in standings with their final score
- Can only disable inactive players if they're already set to inactive

### Advanced Round Editing

Click **✏️ Edit** on any scored round to:
- Adjust **hand size**, **trump rank/suit**, **reverse value**
- Modify bids, tax, confidence, deferred, or got set for any player
- View **projected totals** for both made-bid and got-set scenarios in real-time
- See **bid status** (Under/Over/Exact) update as you change values

### Undo/Reverse Rounds

After scoring a round, click **↩️ Undo Round** to:
- Reverse all score changes from that round
- Reset the round to unscored state
- Allows re-entry of bids or correction of mistakes
- Useful for fixing input errors without editing

---

## History Stats

Open **📊 Stats** (setup screen) to view aggregated statistics across all saved game files.

### Data sources
- **Auto-extract** — fetches game JSON files from the configured History Stats Source URL (GitHub Contents API)
- **Manual Folder Pick** — fallback that lets you select a local folder of game JSON files directly in the browser

Games are deduplicated by `gameId` before analysis to prevent duplicate counting.

### Summary tiles
- Total games, unique players, average rounds per game, average players per game
- Average winning margin, average set points per round, global set rate, global average points per round
- Exact-bid blocks per game, chaos round rate, best global trump suit average, best global reverse-mode average

### Per-player stats table
| Column | Description |
|---|---|
| Games | Number of games the player appeared in |
| Wins | Games where the player finished with the highest score |
| Win Rate % | Wins ÷ Games |
| 2nd/3rd Place | Times finished 2nd or 3rd overall |
| Top 3 Rate % | (Wins + 2nd + 3rd) ÷ Games |
| Avg Final Score | Average end-of-game total score |
| Best / Worst | Highest / lowest total score across all games |
| Bid Accuracy % | Rounds made ÷ (rounds made + set) |
| Set Rate % | Rounds set ÷ (rounds made + set) |
| Deferred Rate % | Times deferred ÷ total rounds played |
| Clutch % | MAX-confidence made ÷ MAX-confidence attempts |
| Greed Index | Average of `(bid / handSize)` for positive bids |
| Tax Total / Tax per Round | Total tax paid and average tax paid per round |
| Deferred Made % / Non-Deferred Made % | Made-rate when deferred vs when not deferred |
| Dealer Edge | `(avg score as dealer) - (avg score as non-dealer)` |
| Set Hunter % | Opponent set-rate in rounds where player bid at least half the hand size |
| Comeback Wins | Wins where player was outside top 2 at the halfway checkpoint |
| Choke % | Share of games where player led at 70% checkpoint but did not win |
| Hot Hand / Disaster | Longest consecutive made-bid streak / got-set streak |
| Boom/Bust | Standard deviation of round scores |
| Peak/Floor Round | Best and worst single-round score |
| 20+ / <=-10 | Count of very high rounds and deep negative rounds |
| Zero Bid Try % | Zero-bid attempts ÷ total rounds |
| Zero Bid Success % | Zero bids made ÷ total zero bids |
| Momentum | `(avg last 3 round scores) - (avg first 3 round scores)` per game, then averaged |
| Best Suit / Best Reverse | Highest average score by trump suit and by reverse mode |
| Avg Round Score | Average points per individual round |
| Avg Finish / Finish by Table Size | Average finishing place overall and per table size (`3p`, `4p`, etc.) |
| Chaos % | Share of rounds with score spread >= 25 |
| Exact Block % | Share of rounds where player was present when exact bids blocked scoring |

### Rivalry split
- Rivalries are tracked for every player pair appearing in the same game.
- Record format is `A-wins / B-wins / ties`.
- The rivalry table is sorted by games played, then by decisiveness of the record.

### How the new fun stats are calculated
1. `Clutch Rate`: `MAX-confidence made / MAX-confidence attempts`.
2. `Greed Index`: average `bid / handSize` across positive bids only.
3. `Tax Burden`: `total tax`, with per-game and per-round averages.
4. `Deferred Specialist`: compare `deferred made-rate` vs `non-deferred made-rate`.
5. `Dealer Edge`: `(dealer round avg) - (non-dealer round avg)`.
6. `Suit Mastery`: average round score grouped by trump suit (`♠ ♥ ♦ ♣`); best suit shown.
7. `Set Hunter`: opponent set-rate in high-bid rounds (`bid >= ceil(handSize / 2)`).
8. `Set Magnet`: standard set rate, `set / (made + set)`.
9. `Comeback Wins`: winner was rank 3+ at halfway checkpoint.
10. `Choke Rate`: player led at 70% checkpoint but did not finish first.
11. `Hot Hand`: longest consecutive rounds not set.
12. `Disaster Streak`: longest consecutive got-set rounds.
13. `Boom/Bust`: standard deviation of round scores.
14. `Peak Round`: highest single-round score.
15. `Floor Round`: lowest single-round score.
16. `Zero-Bid Personality`: `zero-bid attempts / total rounds`.
17. `Momentum Finish`: `avg(last up to 3 rounds) - avg(first up to 3 rounds)` per game.
18. `Rivalry Split`: head-to-head record for each pair of players across shared games.
19. `Table Impact`: average final position overall and by table size.
20. `Bid Discipline`: exact-bid block frequency.
21. `Chaos Factor`: round considered chaos when `maxScore - minScore >= 25`; report player participation rate.

### Exact-bid block tracking
- When scoring is attempted while bids are exactly equal to hand size, the round increments `exactBidBlocks`.
- Edit mode enforces the same rule and also increments `exactBidBlocks` on invalid exact-save attempts.
- This value feeds both summary and per-player bid-discipline metrics.

### Fallback import
If automatic history discovery fails (network issues, wrong URL format), use **📂 Manual Folder Pick (Fallback)** to:
- Browse and select a local folder on your computer
- Import all JSON game files from that folder
- Manually cache them for stat analysis

## Header Actions

### Setup screen
- **👥 Manage Players** — add, remove, import, export player list
- **⚙️ Settings** — configure sync URLs and auto-sync
- **📘 README** — open the full project guide inside the app
- **📖 Rules & Math** — comprehensive guide with scoring examples and formulas
- **📊 Stats** — view aggregated stats from history
- **📁 Load Game** — restore a previously saved game

### In-game screen
- **👥 Table** — manage active/inactive players, add mid-game players
- **📘 README** — open the project guide without leaving the current game
- **💾 Save** — download current game as JSON
- **📁 Load** — restore a saved game (pauses current)
- **📤 Export** — copy game data to clipboard (Excel format)
- **🆕 New** — start a new game (prompts to confirm if game in progress)

---

## Rules & Math Guide

Click **📖 Rules & Math** from the setup screen to access a comprehensive built-in guide covering:

### Game Overview
- Explanation of Oh Hell mechanics
- Bid rules (Under/Over/Exact)

### Detailed Scoring Formulas and Examples
- **Made Bid (positive bid)**: `10 + (bid × bid) + confidence - deferred - tax`
- **Made Zero Bid**: `zeroBonus + handSize + confidence - deferred - tax`
- **Got Set**: `-confidence - deferred - tax`
- Includes 3+ worked examples with calculations

### Modifiers Explained
- **Confidence**: MAX (10 for positive bids, 5 for zero), or 0/5/10
- **Deferred**: 2-point penalty when checked
- **Tax**: Custom points deducted from score
- **Zero Bonus**: 10 points (≤6 players) or 5 points (>6 players)

---

## Browser Support

Works on modern browsers:
- Chrome / Edge (desktop and mobile)
- Safari (desktop and mobile)
- Firefox

## Privacy

All game/player data is stored locally in your browser unless you use URL sync. URL sync only fetches from the endpoint you configure.
