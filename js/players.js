// Player Management Functions
function getSavedPlayers() {
    return JSON.parse(localStorage.getItem('ohHellPlayers') || '[]');
}

function savePlayers(players) {
    localStorage.setItem('ohHellPlayers', JSON.stringify(players));
}

function addPlayer() {
    const input = document.getElementById('newPlayerName');
    const name = input.value.trim();
    
    if (!name) {
        alert('Please enter a player name');
        return;
    }

    const players = getSavedPlayers();
    if (players.includes(name)) {
        alert('This player already exists!');
        return;
    }

    players.push(name);
    savePlayers(players);
    loadSavedPlayers();
    input.value = '';
    updatePlayerInputs();
}

function removePlayer(name) {
    let players = getSavedPlayers();
    players = players.filter(p => p !== name);
    savePlayers(players);
    loadSavedPlayers();
    updatePlayerInputs();
}

function loadSavedPlayers() {
    const container = document.getElementById('savedPlayersList');
    const players = getSavedPlayers();

    if (players.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; font-size: 0.9rem;">No saved players yet. Add some to get started!</p>';
    } else {
        container.innerHTML = players.map(player => `
            <div class="player-tag">
                ${escapeHtml(player)}
                <button class="remove-player-btn" data-player="${escapeHtml(player)}">✕</button>
            </div>
        `).join('');
    }
}

function exportPlayers() {
    const players = getSavedPlayers();
    const data = {
        exportDate: new Date().toISOString(),
        players: players
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oh-hell-players-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Player list exported successfully!');
}

function importPlayers(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const importedPlayers = data.players || data;
            
            if (!Array.isArray(importedPlayers)) {
                throw new Error('Invalid file format');
            }

            const currentPlayers = getSavedPlayers();
            const newPlayers = importedPlayers.filter(p => !currentPlayers.includes(p));
            
            if (newPlayers.length === 0) {
                alert('All players from the file already exist!');
                return;
            }

            const allPlayers = [...new Set([...currentPlayers, ...importedPlayers])];
            savePlayers(allPlayers);
            loadSavedPlayers();
            updatePlayerInputs();
            
            alert(`Imported ${newPlayers.length} new player(s)!`);
        } catch (error) {
            alert('Error importing file: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

// Settings and Sync Functions
function saveSettings() {
    const syncUrl = normalizeSyncUrl(document.getElementById('syncUrl').value.trim());
    const historySourceUrl = normalizeHistorySourceUrl(document.getElementById('historySourceUrl').value.trim());
    const autoSync = document.getElementById('autoSyncCheck').checked;
    
    if (syncUrl && !syncUrl.startsWith('http')) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
    }

    if (historySourceUrl && !historySourceUrl.startsWith('http')) {
        alert('Please enter a valid history source URL starting with http:// or https://');
        return;
    }

    localStorage.setItem('ohHellPlayerSyncUrl', syncUrl);
    localStorage.setItem(HISTORY_SOURCE_URL_STORAGE_KEY, historySourceUrl || DEFAULT_HISTORY_SOURCE_URL);
    localStorage.setItem('ohHellAutoSync', autoSync);
    alert('Settings saved!');
    closeModal('settingsModal');
}

function clearSyncUrl() {
    if (confirm('Clear the sync URL?')) {
        localStorage.removeItem('ohHellPlayerSyncUrl');
        localStorage.removeItem('ohHellAutoSync');
        document.getElementById('syncUrl').value = DEFAULT_SYNC_URL;
        alert('Sync URL reset to default!');
    }
}

function clearHistorySourceUrl() {
    if (confirm('Reset the history source URL to the default GitHub history folder?')) {
        localStorage.removeItem(HISTORY_SOURCE_URL_STORAGE_KEY);
        document.getElementById('historySourceUrl').value = DEFAULT_HISTORY_SOURCE_URL;
        alert('History source URL reset to default!');
    }
}

function testSyncUrl() {
    const syncUrl = normalizeSyncUrl(document.getElementById('syncUrl').value.trim());
    
    if (!syncUrl) {
        alert('Please enter a URL first');
        return;
    }

    document.getElementById('syncUrl').value = syncUrl;
    syncPlayersFromUrl(syncUrl, true);
}

async function testHistorySourceUrl() {
    const historySourceUrl = normalizeHistorySourceUrl(document.getElementById('historySourceUrl').value.trim());

    if (!historySourceUrl) {
        alert('Please enter a history source URL first');
        return;
    }

    document.getElementById('historySourceUrl').value = historySourceUrl;

    try {
        const paths = await discoverHistoryJsonPaths(historySourceUrl);
        if (paths.length === 0) {
            alert('No JSON files were discovered from that history source.');
            return;
        }

        alert(`Discovered ${paths.length} JSON file(s) from the history source.`);
    } catch (error) {
        alert('Error testing history source: ' + error.message);
    }
}

function syncPlayersFromUrl(url, showAlert = false) {
    const normalizedUrl = normalizeSyncUrl(url);

    fetch(normalizedUrl)
        .then(response => response.json())
        .then(data => {
            const importedPlayers = data.players || data;
            
            if (!Array.isArray(importedPlayers)) {
                throw new Error('Invalid file format - must be a JSON array or object with "players" array');
            }

            const currentPlayers = getSavedPlayers();
            const newPlayers = importedPlayers.filter(p => !currentPlayers.includes(p));
            
            if (newPlayers.length === 0) {
                if (showAlert) alert('All players already synced!');
                return;
            }

            const allPlayers = [...new Set([...currentPlayers, ...importedPlayers])];
            savePlayers(allPlayers);
            loadSavedPlayers();
            updatePlayerInputs();
            
            if (showAlert) alert(`Synced ${newPlayers.length} new player(s)!`);
        })
        .catch(error => {
            if (showAlert) {
                alert('Error syncing players: ' + error.message);
            }
            console.error('Sync error:', error);
        });
}

function autoSyncPlayers() {
    const autoSync = localStorage.getItem('ohHellAutoSync') !== 'false';
    const syncUrl = normalizeSyncUrl(localStorage.getItem('ohHellPlayerSyncUrl') || DEFAULT_SYNC_URL);
    
    if (autoSync && syncUrl) {
        syncPlayersFromUrl(syncUrl, false);
    }
}

function manualSync() {
    const syncUrl = normalizeSyncUrl(localStorage.getItem('ohHellPlayerSyncUrl') || DEFAULT_SYNC_URL);
    if (!syncUrl) {
        alert('No sync URL configured. Go to Settings to add one.');
        return;
    }
    syncPlayersFromUrl(syncUrl, true);
}

function updatePlayerInputs() {
    const num = parseInt(document.getElementById('numPlayers').value);
    const container = document.getElementById('playerInputs');
    const savedPlayers = getSavedPlayers();
    container.innerHTML = '';

    if (savedPlayers.length === 0) {
        container.innerHTML = '<p style="color: #ef4444; font-size: 0.9rem;">No saved players. Click "Manage Players" to add some!</p>';
        return;
    }

    for (let i = 0; i < num; i++) {
        const row = document.createElement('div');
        row.className = 'input-group';
        const options = savedPlayers.map(p =>
            `<div class="player-select-option" onclick="selectPlayerOption(${i}, ${JSON.stringify(p).replace(/"/g, '&quot;')})">${escapeHtml(p)}</div>`
        ).join('');
        row.innerHTML = `
            <label>Player ${i + 1}</label>
            <input type="hidden" id="player${i}" value="">
            <div class="player-custom-select" id="player-select-wrap-${i}">
                <button type="button" class="player-select-btn" onclick="togglePlayerDropdown(${i})">
                    <span id="player-select-label-${i}">-- Select a player --</span>
                    <span class="player-select-arrow">▾</span>
                </button>
                <div class="player-select-panel" id="player-select-panel-${i}">
                    ${options}
                </div>
            </div>
        `;
        container.appendChild(row);
    }
}

function togglePlayerDropdown(index) {
    const panel = document.getElementById(`player-select-panel-${index}`);
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('.player-select-panel.open').forEach(p => p.classList.remove('open'));
    if (!isOpen) panel.classList.add('open');
}

function selectPlayerOption(index, name) {
    document.querySelectorAll('.player-select-panel.open').forEach(p => p.classList.remove('open'));
    document.getElementById(`player${index}`).value = name;
    document.getElementById(`player-select-label-${index}`).textContent = name;
    // Mark selected state in panel
    const panel = document.getElementById(`player-select-panel-${index}`);
    panel.querySelectorAll('.player-select-option').forEach(opt => {
        opt.classList.toggle('selected', opt.textContent === name);
    });
}

