// Auto-save functionality
function autoSave() {
    if (gameState.players.length === 0) return; // Don't save empty state
    
    try {
        localStorage.setItem('ohHellAutoSave', JSON.stringify({
            ...gameState,
            autoSavedAt: new Date().toISOString()
        }));
    } catch (error) {
        console.error('Auto-save failed:', error);
    }
}

function loadAutoSave() {
    try {
        const autoSaved = localStorage.getItem('ohHellAutoSave');
        if (!autoSaved) return;

        const game = JSON.parse(autoSaved);
        
        // Validate it's a valid game
        if (!game.players || !game.rounds || game.players.length === 0) return;

        // Handle backward compatibility
        if (game.handProgression && !game.currentHandSize) {
            game.currentHandSize = game.handProgression[game.currentRound];
            game.startingHandSize = game.handProgression[0];
            game.goingDown = true;
        }
        
        // Initialize previousPosition if not present
        gameState = normalizeGameState(game);
        setActiveView('game');
        renderGame();
    } catch (error) {
        console.error('Error loading auto-save:', error);
    }
}

function clearAutoSave() {
    localStorage.removeItem('ohHellAutoSave');
}

function loadManualHistoryGames() {
    try {
        const raw = localStorage.getItem(MANUAL_HISTORY_STORAGE_KEY);
        if (!raw) {
            manualHistoryGames = [];
            return;
        }

        const parsed = JSON.parse(raw);
        manualHistoryGames = Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to load cached history games:', error);
        manualHistoryGames = [];
    }
}

function saveManualHistoryGames() {
    try {
        localStorage.setItem(MANUAL_HISTORY_STORAGE_KEY, JSON.stringify(manualHistoryGames));
    } catch (error) {
        console.error('Failed to cache history games:', error);
    }
}

function getGameTimestamp(game) {
    const source = game.savedAt || game.createdAt;
    if (!source) return 0;
    const ts = Date.parse(source);
    return Number.isNaN(ts) ? 0 : ts;
}

function isValidHistoryGame(game) {
    return !!(game && Array.isArray(game.players) && Array.isArray(game.rounds));
}
