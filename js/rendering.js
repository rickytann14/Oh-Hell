function setActiveView(view) {
    currentView = view;
    document.getElementById('setupScreen').classList.toggle('hidden', view !== 'setup');
    document.getElementById('gameScreen').classList.toggle('hidden', view !== 'game');
    loadHeaderActions(view);
}

function openReadmeLink() {
    window.open(README_URL, '_blank', 'noopener,noreferrer');
}

function loadHeaderActions(mode) {
    const actions = document.getElementById('headerActions');
    
    actions.classList.toggle('game', mode === 'game');

    if (mode === 'setup') {
        actions.innerHTML = `
            <button class="btn btn-secondary btn-small" onclick="openManagePlayersModal()">👥 Manage Players</button>
            <button class="btn btn-secondary btn-small" onclick="openSettingsModal()">⚙️ Settings</button>
            <button class="btn btn-secondary btn-small" onclick="openReadmeLink()">📘 README</button>
            <button class="btn btn-secondary btn-small" onclick="openRulesModal()">📖 Rules & Math</button>
            <button class="btn btn-secondary btn-small" onclick="openStatsModal()">📊 Stats</button>
            <button class="btn btn-secondary btn-small" onclick="showSaveLoadModal()">📁 Load Game</button>
        `;
    } else if (mode === 'game') {
        actions.innerHTML = `
            <div class="header-action-buttons">
                <button class="btn btn-secondary btn-small" onclick="openGamePlayersModal()">👥 Table</button>
                <button class="btn btn-secondary btn-small" onclick="openReadmeLink()">📘 README</button>
                <button class="btn btn-secondary btn-small" onclick="saveGame()">💾 Save</button>
                <button class="btn btn-secondary btn-small" onclick="showSaveLoadModal()">📁 Load</button>
                <button class="btn btn-primary btn-small" onclick="exportToExcel()">📤 Export</button>
                <button class="btn btn-danger btn-small" onclick="newGame()">🆕 New</button>
            </div>
            <div class="sticky-round-info" id="stickyRoundInfo"></div>
        `;
    }
}

function renderGame() {
    renderRoundSetup();
    renderScoreboard();
    renderHistory();
}

function renderScoreboard() {
    const container = document.getElementById('scoreboard');
    const sortedPlayers = [...gameState.players]
        .map((p, idx) => ({...p, originalIndex: idx}))
        .sort((a, b) => b.score - a.score);

    container.innerHTML = `
        <div class="card">
            <h2>Current Standings</h2>
            <div class="final-ranking">
                ${sortedPlayers.map((player, idx) => `
                    <div class="rank-item ${idx === 0 ? 'first' : ''}">
                        <div class="rank-position">#${idx + 1}</div>
                        <div class="rank-name">${player.name}${player.active === false ? ' <span style="font-size: 0.78rem; color: #cbd5e1;">(inactive)</span>' : ''}</div>
                        <div class="rank-score ${player.score < 0 ? 'negative' : ''}">${player.score}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderHistory() {
    const container = document.getElementById('historySection');
    const completedRounds = gameState.rounds.filter((r, idx) => r.scored);

    if (completedRounds.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Create array with round indices for proper mapping
    const roundsWithIndices = gameState.rounds
        .map((round, idx) => ({round, idx}))
        .filter(r => r.round.scored)
        .reverse();

    container.innerHTML = `
        <div class="card">
            <h2>Score History</h2>
            <div class="score-history">
                ${roundsWithIndices.map(({round, idx}) => {
                    const roundNum = idx + 1;
                    return `
                        <div class="history-round">
                            <div class="history-round-header" style="display: flex; justify-content: space-between; align-items: center;">
                                <span>Round ${roundNum} - Hand Size: ${round.handSize}${round.trump ? ` • 🃏 ${round.trump}` : ''}</span>
                                <button class="btn btn-secondary btn-small" onclick="editRound(${idx})" style="padding: 0.4rem 0.8rem;">
                                    ✏️ Edit
                                </button>
                            </div>
                            <div class="history-players">
                                ${gameState.players.map((player, pIdx) => {
                                    const pdata = round.playerData[pIdx];
                                    if (!pdata || (!pdata.participating && pdata.absentReason !== 'joined-late')) {
                                        return '';
                                    }

                                    if (!pdata.participating && pdata.absentReason === 'joined-late') {
                                        return `
                                            <div style="line-height: 1.4;">
                                                <strong>${player.name}:</strong>
                                                ⏱️ Joined later
                                                <br>
                                                <span style="color: #10b981; font-weight: 600;">
                                                    +${pdata.score}
                                                </span>
                                            </div>
                                        `;
                                    }

                                    return `
                                        <div style="line-height: 1.4;">
                                            <strong>${player.name}:</strong> 
                                            ${pdata.gotSet ? '❌' : '✅'} 
                                            Bid: ${pdata.bid}
                                            ${pdata.tax > 0 ? ` | Tax: ${pdata.tax}` : ''}
                                            ${pdata.deferred ? ' | Def: ✓' : ''}
                                            | Conf: ${pdata.confidence}
                                            <br>
                                            <span style="color: ${pdata.score > 0 ? '#10b981' : '#ef4444'}; font-weight: 600;">
                                                ${pdata.score > 0 ? '+' : ''}${pdata.score}
                                            </span>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function endGame() {
    const container = document.getElementById('currentRoundSetup');
    const stickyInfo = document.getElementById('stickyRoundInfo');
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    stickyInfo.innerHTML = '';

    container.innerHTML = `
        <div class="final-scores">
            <h3>🏆 GAME OVER 🏆</h3>
            <div class="final-ranking">
                ${sortedPlayers.map((player, idx) => `
                    <div class="rank-item ${idx === 0 ? 'first' : ''}">
                        <div class="rank-position">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '#' + (idx + 1)}</div>
                        <div class="rank-name">${player.name}${player.active === false ? ' <span style="font-size: 0.78rem; color: rgba(15, 23, 42, 0.75);">(inactive)</span>' : ''}</div>
                        <div class="rank-score">${player.score}</div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary" onclick="newGame()" style="width: 100%; margin-top: 1.5rem; padding: 1rem;">
                🎮 New Game
            </button>
        </div>
    `;
}
