# Oh Hell Scorekeeper

A mobile-friendly web app for tracking scores in the Oh Hell card game.

## Features

- 📱 Mobile-optimized interface
- 👥 Player list management
- 💾 Save and load games
- 📊 Statistics and analytics
- 🔄 Player list sync from URL

## Getting Started

1. Open `oh-hell-scorekeeper.html` in your browser
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
3. Get the raw file URL: `https://raw.githubusercontent.com/[username]/[repo]/main/Oh-Hell/players.json`
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
1. Select number of players (3-7)
2. Choose players from your saved list
3. Set starting hand size (default: 10)
4. Click Start Game

### During a Game
- Enter each player's **bid** for the round
- Enter **tax** (penalties applied to that player)
- Set **confidence level** (MAX, 10, 5, or 0)
- Mark **deferred** if bid was delayed (-2 points)
- After the round, mark who **got set** (didn't make their bid)
- Scores calculate automatically
- Use undo if you make a mistake
- Save games to continue later

### Scoring Rules

#### Made Your Bid (Not Set)

**Positive Bid (1+):**
- Base score: **10 + (bid × bid) + confidence - tax - (deferred penalty)**
- Example: Bid 3, confidence MAX (10): `10 + 9 + 10 = 29 points`

**Zero Bid:**
- Base score: **bonus + hand size + confidence - tax - (deferred penalty)**
- Bonus: 10 points (3-9 players) or 5 points (10+ players)
- Example: Hand size 7, confidence 5: `10 + 7 + 5 = 22 points`

#### Got Set (Missed Your Bid)
- Score: **-confidence - tax - (deferred penalty)**
- Example: Confidence MAX (10), deferred: `-10 - 2 = -12 points`

#### Modifiers
- **Confidence**: MAX (10 for positive bid, 5 for zero), 10, 5, or 0
- **Deferred**: -2 points if bid was delayed
- **Tax**: Custom penalty (subtracted from score)

## Game Management

- **💾 Save** - Store current game to continue later
- **📁 Load** - Resume a previously saved game
- **📊 Stats** - View player statistics and history
- **🆕 New** - Start fresh game

## Tips

- Enable URL sync to keep player lists updated across devices
- Export your JSON file periodically as backup
- Use saved games to track multiple ongoing matches

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge (desktop & mobile)
- Safari (desktop & mobile)
- Firefox

## Privacy

All data is stored locally in your browser. No data is sent to any server except when using the optional URL sync feature (which only fetches from your specified URL).

