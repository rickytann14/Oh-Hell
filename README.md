# Oh Hell Scorekeeper

A mobile-friendly web app for tracking scores in the Oh Hell card game.

## Download

**[⬇️ Download oh-hell-scorekeeper.html](https://raw.githubusercontent.com/rickytann14/Oh-Hell/refs/heads/main/oh-hell-scorekeeper.html)**

Save the file and open it directly in your browser — no installation required.

## Features

- 📱 Mobile-optimized interface
- 👥 Player list management
- 💾 Save and load games (JSON file-based)
- 📊 Statistics and analytics
- 📤 Export game data to clipboard for Excel
- ✏️ Edit previously scored rounds
- 🔄 Player list sync from URL

## Getting Started

1. Download `oh-hell-scorekeeper.html` and open it in your browser
2. Add players to your list (Manage Players button)
3. Select number of players and start a game!

## Player List Management

### Option 1: Local Storage (Default)
- Add players via the "Manage Players" button
- Players are saved to your browser's local storage
- Export/import JSON files to share between devices

### Option 2: Sync from URL (Recommended for Groups)
Keep your player list in sync across multiple devices using any publicly accessible JSON file.

#### Using GitHub (Free)
1. Export your player list from the app
2. Upload the JSON file to this repo
3. Get the raw file URL: `https://raw.githubusercontent.com/rickytann14/Oh-Hell/refs/heads/main/oh-hell-players.json`
4. In Settings, paste the URL and enable auto-sync

#### Using Google Drive (Simple)
1. Export your player list from the app
2. Upload to Google Drive
3. Share → "Anyone with the link"
4. Get the file ID from the sharing link:
   ```
   https://drive.google.com/file/d/FILE_ID_HERE/view?usp=sharing
   ```
5. Convert to direct download URL:
   ```
   https://drive.google.com/uc?export=download&id=FILE_ID_HERE
   ```
6. In Settings, paste the URL and enable auto-sync

**To update the player list:**
- Edit the JSON file directly (GitHub or Google Drive)
- Everyone's app syncs automatically on next load!

### JSON Format
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

## How to Play

### Starting a New Game
1. Select number of players (3-11)
2. Choose players from your saved list
3. Set starting hand size (default: 10)
4. Click Start Game

The game starts at the chosen hand size and counts down each round. You decide when to "turn around" and start going back up.

### During a Game
- Enter each player's **bid** for the round
- Enter **tax** (points paid to choose trump suit)
- Set **confidence level** (MAX, 10, 5, or 0)
- Mark **deferred** if bid was delayed (-2 points)
- After the round, mark who **got set** (didn't make their bid)
- Scores calculate automatically
- Use **Turn Around** when you want to start going back up in hand size
- Use **Undo Round** if you need to correct a scored round
- Save games to continue later

### Bid Rules

Before scoring, the total bids are tracked:

- **🦆 Under** — Total bids < hand size (valid)
- **🦢 Over** — Total bids > hand size (valid)
- **❌ Exact** — Total bids = hand size (invalid, cannot score)

### Scoring Rules

#### Made Your Bid (Not Set)

**Positive Bid (1+):**
- Base score: **10 + (bid × bid) + confidence - deferred - tax**
- Example: Bid 3, confidence MAX (10): `10 + 9 + 10 = 29 points`

**Zero Bid:**
- Base score: **zero bonus + hand size + confidence - deferred - tax**
- Zero bonus: 10 points (≤9 players) or 5 points (10+ players)
- Example: 4 players, Hand size 7, confidence MAX (5): `10 + 7 + 5 = 22 points`

#### Got Set (Missed Your Bid)
- Score: **-confidence - deferred - tax**
- Example: Confidence MAX (10), deferred: `-10 - 2 = -12 points`

#### Modifiers
- **Confidence**: MAX (10 for positive bids, 5 for zero bids), 10, 5, or 0
- **Deferred**: -2 points if bid was delayed (win or lose)
- **Tax**: Custom penalty subtracted from score (win or lose)

## Game Management

### Header Buttons (Setup Screen)
- **👥 Manage Players** - Add/remove players, export/import, sync
- **⚙️ Settings** - Configure player list sync URL
- **📖 Rules & Math** - In-app scoring reference
- **📁 Load Game** - Resume a previously saved game

### Header Buttons (During Game)
- **💾 Save** - Download current game as a JSON file
- **📁 Load** - Load a previously saved game JSON file
- **📊 Stats** - View player statistics for the current game
- **📤 Export** - Copy game data to clipboard for pasting into Excel
- **🆕 New** - Start a fresh game

### Round Controls (After Scoring)
- **🔄 Turn Around** - Switch from counting down to counting back up
- **↩️ Undo Round** - Reverse the last scored round
- **➡️ Next Round** - Advance to the next round
- **🏁 End Game** - Show final standings

### Edit Round
Previous rounds can be edited from the Score History section using the **✏️ Edit** button. Changes recalculate scores automatically.

## Tips

- Enable URL sync to keep player lists updated across devices
- Export your JSON file periodically as backup
- Use saved games to track multiple ongoing matches
- The Export button formats data for pasting directly into the Oh Hell Excel sheet (cell A1 on the Scorev2 sheet)

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (desktop & mobile)
- Safari (desktop & mobile)
- Firefox

## Privacy

All data is stored locally in your browser. No data is sent to any server except when using the optional URL sync feature (which only fetches from your specified URL).
