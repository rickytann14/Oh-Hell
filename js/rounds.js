function startNewRound() {
    const previousRound = gameState.rounds[gameState.currentRound - 1];
    const handSize = gameState.currentRound === 0
        ? gameState.startingHandSize
        : (previousRound?.handSize || gameState.startingHandSize);
    const dealerIndex = getNextDealerIndex(previousRound);

    const round = {
        handSize: handSize,
        dealerIndex: dealerIndex,
        trump: '',  // Add trump card tracking
        trumpRank: '',
        trumpSuit: '',
        reverseValue: 'N',
        exactBidBlocks: 0,
        playerData: gameState.players.map(player => createRoundPlayerData(player.active !== false)),
        scored: false
    };

    gameState.rounds.push(round);
    renderRoundSetup();
    renderScoreboard();
    autoSave(); // Auto-save after starting new round
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
                <div class="leader-pill">👑 ${leader.name} ${leader.score}</div>
                <div class="bid-tracker ${bidClass}">${totalBids}/${round.handSize} ${bidStatus}</div>
            </div>
            <div class="round-summary-bottom">
                <span class="meta-chip">R${gameState.currentRound + 1}</span>
                <span class="meta-chip">🎴 ${dealer.name}</span>
                <span class="meta-chip">${round.reverseValue}</span>
                ${hasUniqueLow ? `<span class="meta-chip low">↓ ${lowPlayer.name}</span>` : ''}
                ${round.trump ? `<span class="meta-chip trump">🃏 ${round.trump}</span>` : ''}
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="round-setup">
            <div class="round-header">
                <div>
                    <h3>Round ${gameState.currentRound + 1}</h3>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <label style="font-size: 0.85rem; color: #cbd5e1;">Hand Size</label>
                        <div style="display: flex; gap: 0.25rem; align-items: center;">
                            <button onclick="adjustCurrentRoundHandSize(-1)"
                                    ${round.scored ? 'disabled' : ''}
                                    class="bid-adjust-btn"
                                    style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 6px; font-weight: 700; font-size: 1.1rem; cursor: pointer; touch-action: manipulation; ${round.scored ? 'opacity: 0.45; cursor: not-allowed;' : ''}">
                                −
                            </button>
                            <div style="min-width: 34px; text-align: center; font-weight: 700; font-size: 1rem; color: #fbbf24;">
                                ${round.handSize}
                            </div>
                            <button onclick="adjustCurrentRoundHandSize(1)"
                                    ${round.scored ? 'disabled' : ''}
                                    class="bid-adjust-btn"
                                    style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #86efac; border-radius: 6px; font-weight: 700; font-size: 1.1rem; cursor: pointer; touch-action: manipulation; ${round.scored ? 'opacity: 0.45; cursor: not-allowed;' : ''}">
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <div class="bid-tracker ${bidClass}">
                    ${totalBids}/${round.handSize} ${bidStatus}
                </div>
            </div>
            
            <div style="background: rgba(251, 191, 36, 0.15); border: 2px solid rgba(251, 191, 36, 0.35); border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <label style="color: #fbbf24; font-weight: 600; font-size: 1rem;">🃏 Big Boss (Trump):</label>
                    <div style="display: flex; gap: 0.5rem; flex: 1; min-width: 220px; flex-wrap: wrap;">
                        <select onchange="updateTrumpRank(this.value)"
                                style="flex: 1; min-width: 110px; padding: 0.5rem 0.75rem; font-size: 1rem; background: rgba(15, 23, 42, 0.8); border: 2px solid #fbbf24; color: #f1f5f9; border-radius: 8px;">
                            <option value="">-- Rank --</option>
                            ${TRUMP_RANKS.map(rank => `<option value="${rank}" ${round.trumpRank === rank ? 'selected' : ''}>${rank}</option>`).join('')}
                        </select>
                        <select onchange="updateTrumpSuit(this.value)"
                                style="flex: 1; min-width: 110px; padding: 0.5rem 0.75rem; font-size: 1rem; background: rgba(15, 23, 42, 0.8); border: 2px solid #fbbf24; color: #f1f5f9; border-radius: 8px;">
                            <option value="">-- Suit --</option>
                            ${TRUMP_SUITS.map(suit => `<option value="${suit}" ${round.trumpSuit === suit ? 'selected' : ''}>${suit}</option>`).join('')}
                        </select>
                        <select onchange="updateReverseValue(this.value)"
                                style="flex: 1; min-width: 110px; padding: 0.5rem 0.75rem; font-size: 1rem; background: rgba(15, 23, 42, 0.8); border: 2px solid #fbbf24; color: #f1f5f9; border-radius: 8px;">
                            ${REVERSE_VALUE.map(value => `<option value="${value}" ${round.reverseValue === value ? 'selected' : ''}>${value === 'R' ? 'R - Reverse' : 'N - Normal'}</option>`).join('')}
                        </select>
                    </div>
                    ${round.trump ? `<div style="font-size: 1.5rem; padding: 0.25rem 0.75rem; background: rgba(251, 191, 36, 0.2); border-radius: 8px;">${round.trump}</div>` : ''}
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
                        positionIndicator = '<span style="color: #10b981;">↗️</span>';
                    } else if (round.scored && currentPosition > previousPosition) {
                        positionIndicator = '<span style="color: #ef4444;">↘️</span>';
                    }
                    
                    const isLeader = currentPosition === 1;
                    const leaderCrown = isLeader ? '👑 ' : '';
                    
                    return `
                    <div class="player-card ${idx === round.dealerIndex ? 'dealer' : ''}">
                        <div class="player-name">
                            ${leaderCrown}${player.name} ${positionIndicator}
                            ${idx === round.dealerIndex ? '<span>🎴 Dealer</span>' : ''}
                        </div>
                        <div class="player-score ${player.score < 0 ? 'negative' : ''}">
                            ${player.score}
                        </div>
                        
                        <div class="player-inputs-grid">
                            <div>
                                <label style="font-size: 0.8rem; color: #cbd5e1;">Bid</label>
                                <div style="display: flex; gap: 0.25rem; align-items: center;">
                                    <button onclick="adjustBid(${idx}, -1)" 
                                            class="bid-adjust-btn"
                                            style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 6px; font-weight: 700; font-size: 1.2rem; cursor: pointer; touch-action: manipulation;">
                                        −
                                    </button>
                                    <div style="flex: 1; text-align: center; font-weight: 700; font-size: 1.3rem; color: #3b82f6; min-width: 40px;">
                                        ${round.playerData[idx].bid}
                                    </div>
                                    <button onclick="adjustBid(${idx}, 1)" 
                                            class="bid-adjust-btn"
                                            style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #86efac; border-radius: 6px; font-weight: 700; font-size: 1.2rem; cursor: pointer; touch-action: manipulation;">
                                        +
                                    </button>
                                </div>
                                <div class="quick-value-row">
                                    ${[5, 10].map(value => `
                                        <button class="quick-value-btn" onclick="setBid(${idx}, ${value})">${value}</button>
                                    `).join('')}
                                </div>
                            </div>
                            <div>
                                <label style="font-size: 0.8rem; color: #cbd5e1;">Tax</label>
                                <div style="display: flex; gap: 0.25rem; align-items: center;">
                                    <button onclick="adjustTax(${idx}, -1)"
                                            class="bid-adjust-btn"
                                            style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; border-radius: 6px; font-weight: 700; font-size: 1.2rem; cursor: pointer; touch-action: manipulation;">
                                        −
                                    </button>
                                    <div style="flex: 1; text-align: center; font-weight: 700; font-size: 1.3rem; color: #f59e0b; min-width: 40px;">
                                        ${round.playerData[idx].tax}
                                    </div>
                                    <button onclick="adjustTax(${idx}, 1)"
                                            class="bid-adjust-btn"
                                            style="width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.4); color: #86efac; border-radius: 6px; font-weight: 700; font-size: 1.2rem; cursor: pointer; touch-action: manipulation;">
                                        +
                                    </button>
                                </div>
                                <div class="quick-value-row">
                                    ${[5, 10, 15, 25].map(value => `
                                        <button class="quick-value-btn" onclick="setTax(${idx}, ${value})">${value}</button>
                                    `).join('')}
                                </div>
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="font-size: 0.8rem; color: #cbd5e1;">Confidence</label>
                                <select onchange="updateConfidence(${idx}, this.value)">
                                    <option value="MAX" ${round.playerData[idx].confidence === 'MAX' ? 'selected' : ''}>MAX</option>
                                    ${(round.playerData[idx].bid > 0 ? [0, 5, 10] : [0, 5]).map(n => 
                                        `<option value="${n}" ${round.playerData[idx].confidence == n ? 'selected' : ''}>${n}</option>`
                                    ).join('')}
                                </select>
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
                <button class="btn btn-success" onclick="scoreRound()" 
                        style="width: 100%; margin-top: 1rem; padding: 1rem; font-size: 1.1rem;">
                    ✅ Score Round
                </button>
            ` : `
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-direction: column;">
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-danger" onclick="undoLastRound()" style="flex: 1;">
                            ↩️ Undo Round
                        </button>
                        <button class="btn btn-success" onclick="nextRound()" style="flex: 2;">
                            ➡️ Next Round
                        </button>
                    </div>
                    <button class="btn btn-secondary" onclick="endGame()" style="padding: 0.75rem;">
                        🏁 End Game
                    </button>
                </div>
            `}
        </div>
    `;
}

// Shared helpers used by both current-round and edit-round functions
function _applyHandSize(roundIdx, value) {
    const round = gameState.rounds[roundIdx];
    round.handSize = Math.max(1, parseInt(value) || 1);
    round.playerData.forEach(pdata => { if (pdata.bid > round.handSize) pdata.bid = round.handSize; });
}

function _clampedBid(roundIdx, playerIdx, value) {
    const round = gameState.rounds[roundIdx];
    return Math.max(0, Math.min(round.handSize, parseInt(value) || 0));
}

function _clampedTax(value) { return Math.max(0, Math.min(25, parseInt(value) || 0)); }

// Current-round mutation functions
function updateBid(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].bid = parseInt(value) || 0;
    renderRoundSetup();
    autoSave();
}

function adjustBid(playerIdx, delta) {
    const round = gameState.rounds[gameState.currentRound];
    round.playerData[playerIdx].bid = Math.max(0, Math.min(round.handSize, round.playerData[playerIdx].bid + delta));
    renderRoundSetup();
    autoSave();
}

function setBid(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].bid = _clampedBid(gameState.currentRound, playerIdx, value);
    renderRoundSetup();
}

function adjustTax(playerIdx, delta) {
    const round = gameState.rounds[gameState.currentRound];
    round.playerData[playerIdx].tax = _clampedTax(round.playerData[playerIdx].tax + delta);
    renderRoundSetup();
}

function setTax(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].tax = _clampedTax(value);
    renderRoundSetup();
}

function updateCurrentRoundHandSize(value) {
    _applyHandSize(gameState.currentRound, value);
    renderRoundSetup();
}

function adjustCurrentRoundHandSize(delta) {
    const round = gameState.rounds[gameState.currentRound];
    if (round.scored) return;
    updateCurrentRoundHandSize(Math.max(1, Math.min(20, round.handSize + delta)));
}

function updateTax(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].tax = parseInt(value) || 0;
    autoSave();
}

function updateConfidence(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].confidence = value;
    autoSave();
}

function updateDeferred(playerIdx, checked) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].deferred = checked;
    autoSave();
}

function updateGotSet(playerIdx, checked) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].gotSet = checked;
    autoSave();
}

function syncTrumpParts(round) {
    if (!round) return;

    if (round.reverseValue === undefined || !REVERSE_VALUE.includes(round.reverseValue)) {
        round.reverseValue = 'N';
    }

    if (round.trumpRank === undefined || round.trumpSuit === undefined) {
        const parsed = parseTrumpCard(round.trump || '');
        round.trumpRank = parsed.rank;
        round.trumpSuit = parsed.suit;
    }

    if (round.trumpRank && round.trumpSuit) {
        round.trump = `${round.trumpRank}${round.trumpSuit}`;
    } else {
        round.trump = '';
    }
}

function updateTrumpRank(value) {
    const round = gameState.rounds[gameState.currentRound];
    round.trumpRank = value;
    syncTrumpParts(round);
    renderRoundSetup();
}

function updateTrumpSuit(value) {
    const round = gameState.rounds[gameState.currentRound];
    round.trumpSuit = value;
    syncTrumpParts(round);
    renderRoundSetup();
}

function updateReverseValue(value) {
    const round = gameState.rounds[gameState.currentRound];
    round.reverseValue = REVERSE_VALUE.includes(value) ? value : 'N';
    renderRoundSetup();
}

function scoreRound() {
    const round = gameState.rounds[gameState.currentRound];
    
    // Check if bids are exact (cannot score an exact round)
    const totalBids = round.playerData.reduce((sum, p) => sum + (p && p.participating ? p.bid : 0), 0);
    if (totalBids === round.handSize) {
        round.exactBidBlocks = (Number(round.exactBidBlocks) || 0) + 1;
        autoSave();
        alert('❌ Cannot score round when bids are EXACT!\n\nThe total bids equal the hand size. Someone must change their bid.');
        return;
    }
    
    // Check if at least one player got set
    const anyoneSet = round.playerData.some(p => p && p.participating && p.gotSet);
    if (!anyoneSet) {
        alert('Please mark at least one player as "Got Set" to score the round!');
        return;
    }

    round.scored = true;

    // Calculate scores
    round.playerData.forEach((pdata, idx) => {
        if (!pdata || !pdata.participating) {
            return;
        }

        const bid = pdata.bid;
        const roundScore = calculatePlayerRoundScore(round, pdata, pdata.gotSet);

        pdata.score = roundScore;
        gameState.players[idx].score += roundScore;
        gameState.players[idx].rounds.push({
            round: gameState.currentRound + 1,
            bid: bid,
            gotSet: pdata.gotSet,
            score: roundScore
        });
    });

    renderGame();
    updatePlayerPositions();
    autoSave();
}

function updatePlayerPositions() {
    // Create sorted array by score to determine current positions
    const sorted = [...gameState.players]
        .map((p, idx) => ({...p, originalIndex: idx}))
        .sort((a, b) => b.score - a.score);
    
    // Update each player's previous position for next comparison
    sorted.forEach((player, position) => {
        gameState.players[player.originalIndex].previousPosition = position + 1;
    });
}

function nextRound() {
    gameState.currentRound++;
    startNewRound();
}

function undoLastRound() {
    if (!confirm('Are you sure you want to undo this round?')) return;

    const round = gameState.rounds[gameState.currentRound];
    
    // Reverse the scores
    round.playerData.forEach((pdata, idx) => {
        if (!pdata || !pdata.participating) {
            return;
        }

        gameState.players[idx].score -= pdata.score;
        gameState.players[idx].rounds.pop();
    });

    round.scored = false;
    renderGame();
    updatePlayerPositions();
}

