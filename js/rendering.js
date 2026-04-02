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
                        <div class="rank-name">${escapeHtml(player.name)}${player.active === false ? ' <span style="font-size: 0.78rem; color: #cbd5e1;">(inactive)</span>' : ''}</div>
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
                            <div class="history-round-header">
                                <span>Round ${roundNum} - Hand Size: ${round.handSize}${round.trump ? ` • 🃏 ${round.trump}` : ''}</span>
                                <button class="btn btn-secondary btn-small" onclick="editRound(${idx})">
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
                                            <div class="history-player-entry">
                                                <strong>${escapeHtml(player.name)}:</strong>
                                                ⏱️ Joined later
                                                <br>
                                                <span class="score-positive">+${pdata.score}</span>
                                            </div>
                                        `;
                                    }

                                    return `
                                        <div class="history-player-entry">
                                            <strong>${escapeHtml(player.name)}:</strong>
                                            ${pdata.gotSet ? '❌' : '✅'}
                                            Bid: ${pdata.bid}
                                            ${pdata.tax > 0 ? ` | Tax: ${pdata.tax}` : ''}
                                            ${pdata.deferred ? ' | Def: ✓' : ''}
                                            | Conf: ${pdata.confidence}
                                            <br>
                                            <span class="${pdata.score > 0 ? 'score-positive' : 'score-negative'}">
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
                        <div class="rank-name">${escapeHtml(player.name)}${player.active === false ? ' <span style="font-size: 0.78rem; color: rgba(15, 23, 42, 0.75);">(inactive)</span>' : ''}</div>
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

function renderRoundSetup() {
    const round = gameState.rounds[gameState.currentRound];
    const container = document.getElementById('currentRoundSetup');
    const stickyInfo = document.getElementById('stickyRoundInfo');

    syncTrumpParts(round);

    const totalBids = round.playerData.reduce((sum, p) => sum + (p && p.participating ? p.bid : 0), 0);
    let bidStatus = '';
    let bidClass = '';

    if (totalBids < round.handSize) {
        bidStatus = '🦆 Under';
        bidClass = 'under';
    } else if (totalBids > round.handSize) {
        bidStatus = '🦢 Over';
        bidClass = 'over';
    } else {
        bidStatus = '❌ Exact';
        bidClass = 'exact';
    }

    const sortedPlayers = [...gameState.players]
        .map((p, idx) => ({...p, originalIndex: idx}))
        .sort((a, b) => b.score - a.score);
    const leader = sortedPlayers[0];
    const lowPlayer = sortedPlayers[sortedPlayers.length - 1];
    const dealer = gameState.players[round.dealerIndex] || leader;

    // Check if low player is unique (no ties)
    const lowScore = lowPlayer.score;
    const playersWithLowScore = gameState.players.filter(p => p.score === lowScore);
    const hasUniqueLow = playersWithLowScore.length === 1;

    stickyInfo.innerHTML = `
        <div class="round-summary">
            <div class="round-summary-top">
                <div class="leader-pill">👑 ${escapeHtml(leader.name)} ${leader.score}</div>
                <div class="bid-tracker ${bidClass}">${totalBids}/${round.handSize} ${bidStatus}</div>
            </div>
            <div class="round-summary-bottom">
                <span class="meta-chip">R${gameState.currentRound + 1}</span>
                <span class="meta-chip">🎴 ${escapeHtml(dealer.name)}</span>
                <span class="meta-chip">${round.reverseValue}</span>
                ${hasUniqueLow ? `<span class="meta-chip low">↓ ${escapeHtml(lowPlayer.name)}</span>` : ''}
                ${round.trump ? `<span class="meta-chip trump">🃏 ${round.trump}</span>` : ''}
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="round-setup">
            <div class="round-header">
                <div>
                    <h3>Round ${gameState.currentRound + 1}</h3>
                    <div class="field-row field-row--spaced">
                        <label class="field-label">Hand Size</label>
                        <div class="field-row">
                            <button onclick="adjustCurrentRoundHandSize(-1)"
                                    ${round.scored ? 'disabled' : ''}
                                    class="btn-adjust btn-adjust--dec btn-adjust--sm">
                                −
                            </button>
                            <div class="value-display value-display--hand">
                                ${round.handSize}
                            </div>
                            <button onclick="adjustCurrentRoundHandSize(1)"
                                    ${round.scored ? 'disabled' : ''}
                                    class="btn-adjust btn-adjust--inc btn-adjust--sm">
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <div class="bid-tracker ${bidClass}">
                    ${totalBids}/${round.handSize} ${bidStatus}
                </div>
            </div>

            <div class="trump-section">
                <div class="trump-section__row">
                    <label class="trump-section__label">🃏 Big Boss (Trump):</label>
                    <div class="trump-section__selects">
                        <div class="trump-custom-select" id="trump-rank-wrap">
                            <button type="button" class="trump-select-btn" onclick="toggleTrumpDropdown('trump-rank-wrap')">
                                <span>${round.trumpRank || '-- Rank --'}</span>
                                <span class="trump-select-arrow">▾</span>
                            </button>
                            <div class="trump-select-panel" id="trump-rank-panel">
                                <div class="trump-select-option${!round.trumpRank ? ' selected' : ''}" onclick="updateTrumpRank('')">-- Rank --</div>
                                ${TRUMP_RANKS.map(rank => `<div class="trump-select-option${round.trumpRank === rank ? ' selected' : ''}" onclick="updateTrumpRank('${rank}')">${rank}</div>`).join('')}
                            </div>
                        </div>
                        <div class="trump-custom-select" id="trump-suit-wrap">
                            <button type="button" class="trump-select-btn" onclick="toggleTrumpDropdown('trump-suit-wrap')">
                                <span>${round.trumpSuit || '-- Suit --'}</span>
                                <span class="trump-select-arrow">▾</span>
                            </button>
                            <div class="trump-select-panel" id="trump-suit-panel">
                                <div class="trump-select-option${!round.trumpSuit ? ' selected' : ''}" onclick="updateTrumpSuit('')">-- Suit --</div>
                                ${TRUMP_SUITS.map(suit => `<div class="trump-select-option${round.trumpSuit === suit ? ' selected' : ''}" onclick="updateTrumpSuit('${suit}')">${suit}</div>`).join('')}
                            </div>
                        </div>
                        <div class="trump-custom-select" id="trump-reverse-wrap">
                            <button type="button" class="trump-select-btn" onclick="toggleTrumpDropdown('trump-reverse-wrap')">
                                <span>${round.reverseValue === 'R' ? 'R - Reverse' : 'N - Normal'}</span>
                                <span class="trump-select-arrow">▾</span>
                            </button>
                            <div class="trump-select-panel" id="trump-reverse-panel">
                                ${REVERSE_VALUE.map(value => `<div class="trump-select-option${round.reverseValue === value ? ' selected' : ''}" onclick="updateReverseValue('${value}')">${value === 'R' ? 'R - Reverse' : 'N - Normal'}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                    ${round.trump ? `<div class="trump-badge">${round.trump}</div>` : ''}
                </div>
            </div>

            <div class="players-grid">
                ${gameState.players.map((player, idx) => {
                    const pdata = round.playerData[idx];
                    if (!pdata || !pdata.participating) {
                        return '';
                    }

                    const madePrediction = calculatePlayerRoundScore(round, round.playerData[idx], false);
                    const setPrediction = calculatePlayerRoundScore(round, round.playerData[idx], true);
                    const existingRoundScore = round.scored ? (round.playerData[idx].score || 0) : 0;
                    const madeTotal = calculateProjectedTotal(player.score, madePrediction, existingRoundScore);
                    const setTotal = calculateProjectedTotal(player.score, setPrediction, existingRoundScore);

                    // Calculate current position
                    const sorted = [...gameState.players]
                        .map((p, i) => ({...p, originalIndex: i}))
                        .sort((a, b) => b.score - a.score);
                    const currentPosition = sorted.findIndex(p => p.originalIndex === idx) + 1;
                    const previousPosition = player.previousPosition || currentPosition;

                    let positionIndicator = '';
                    if (round.scored && currentPosition < previousPosition) {
                        positionIndicator = '<span class="position-up">↗️</span>';
                    } else if (round.scored && currentPosition > previousPosition) {
                        positionIndicator = '<span class="position-down">↘️</span>';
                    }

                    const isLeader = currentPosition === 1;
                    const leaderCrown = isLeader ? '👑 ' : '';

                    return `
                    <div class="player-card ${idx === round.dealerIndex ? 'dealer' : ''}">
                        <div class="player-name">
                            ${leaderCrown}${escapeHtml(player.name)} ${positionIndicator}
                            ${idx === round.dealerIndex ? '<span>🎴 Dealer</span>' : ''}
                        </div>
                        <div class="player-score ${player.score < 0 ? 'negative' : ''}">
                            ${player.score}
                        </div>

                        <div class="player-inputs-grid">
                            <div>
                                <label class="field-label">Bid</label>
                                <div class="field-row">
                                    <button onclick="adjustBid(${idx}, -1)" class="btn-adjust btn-adjust--dec">−</button>
                                    <div class="value-display value-display--bid">
                                        ${round.playerData[idx].bid}
                                    </div>
                                    <button onclick="adjustBid(${idx}, 1)" class="btn-adjust btn-adjust--inc">+</button>
                                </div>
                                <div class="quick-value-row">
                                    ${[5, 10].map(value => `
                                        <button class="quick-value-btn" onclick="setBid(${idx}, ${value})">${value}</button>
                                    `).join('')}
                                </div>
                            </div>
                            <div>
                                <label class="field-label">Tax</label>
                                <div class="field-row">
                                    <button onclick="adjustTax(${idx}, -1)" class="btn-adjust btn-adjust--dec">−</button>
                                    <div class="value-display value-display--tax">
                                        ${round.playerData[idx].tax}
                                    </div>
                                    <button onclick="adjustTax(${idx}, 1)" class="btn-adjust btn-adjust--inc">+</button>
                                </div>
                                <div class="quick-value-row">
                                    ${[5, 10, 15, 25].map(value => `
                                        <button class="quick-value-btn" onclick="setTax(${idx}, ${value})">${value}</button>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="col-span-2">
                                <label class="field-label">Confidence</label>
                                <div class="conf-custom-select" id="conf-wrap-${idx}">
                                    <button type="button" class="conf-select-btn" onclick="toggleConfDropdown('conf-wrap-${idx}')">
                                        <span>${round.playerData[idx].confidence}</span>
                                        <span class="conf-select-arrow">▾</span>
                                    </button>
                                    <div class="conf-select-panel">
                                        <div class="conf-select-option${round.playerData[idx].confidence === 'MAX' ? ' selected' : ''}" onclick="updateConfidence(${idx}, 'MAX')">MAX</div>
                                        ${(round.playerData[idx].bid > 0 ? [0, 5, 10] : [0, 5]).map(n =>
                                            `<div class="conf-select-option${round.playerData[idx].confidence === n ? ' selected' : ''}" onclick="updateConfidence(${idx}, ${n})">${n}</div>`
                                        ).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" ${round.playerData[idx].deferred ? 'checked' : ''}
                                       onchange="updateDeferred(${idx}, this.checked)">
                                Deferred
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" ${round.playerData[idx].gotSet ? 'checked' : ''}
                                       onchange="updateGotSet(${idx}, this.checked)">
                                Got Set
                            </label>
                        </div>

                        <div class="score-prediction">
                            <span class="made">If made: ${madeTotal} (${formatSignedValue(madePrediction)})</span>
                            <span class="set">If set: ${setTotal} (${formatSignedValue(setPrediction)})</span>
                        </div>
                    </div>
                `}).join('')}
            </div>

            ${!round.scored ? `
                <button class="btn btn-success btn-full" onclick="scoreRound()">
                    ✅ Score Round
                </button>
            ` : `
                <div class="post-round-actions">
                    <div class="post-round-actions__row">
                        <button class="btn btn-danger btn--flex-1" onclick="undoLastRound()">
                            ↩️ Undo Round
                        </button>
                        <button class="btn btn-success btn--flex-2" onclick="nextRound()">
                            ➡️ Next Round
                        </button>
                    </div>
                    <button class="btn btn-secondary" onclick="endGame()">
                        🏁 End Game
                    </button>
                </div>
            `}
        </div>
    `;
}
