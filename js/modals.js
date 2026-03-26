function openManagePlayersModal() {
    loadSavedPlayers();
    document.getElementById('managePlayersModal').classList.add('active');
}

function renderGamePlayersModal() {
    const container = document.getElementById('gamePlayersContent');
    const activePlayers = gameState.players.filter(player => player.active !== false);
    const inactivePlayers = gameState.players.filter(player => player.active === false);
    const availableSavedPlayers = getSavedPlayers().filter(name => !gameState.players.some(player => player.name === name));

    container.innerHTML = `
        <div class="input-group">
            <label>Active Players</label>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${activePlayers.map(player => `
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; background: rgba(51, 65, 85, 0.7); padding: 0.75rem 0.9rem; border-radius: 10px;">
                        <div>
                            <div style="font-weight: 700; color: #f8fafc;">${escapeHtml(player.name)}</div>
                            <div style="font-size: 0.82rem; color: #94a3b8;">Score: ${player.score}</div>
                        </div>
                        <button class="btn btn-danger btn-small" onclick="disablePlayerMidGame(${JSON.stringify(player.name)})">Disable</button>
                    </div>
                `).join('')}
            </div>
        </div>

        ${inactivePlayers.length > 0 ? `
            <div class="input-group">
                <label>Disabled Players</label>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${inactivePlayers.map(player => `
                        <div style="padding: 0.5rem 0.85rem; border-radius: 999px; background: rgba(71, 85, 105, 0.65); color: #cbd5e1; font-size: 0.9rem;">
                            ${escapeHtml(player.name)} • ${player.score}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="input-group">
            <label>Add Player Mid-Game</label>
            <p style="color: #94a3b8; font-size: 0.82rem; margin-bottom: 0.75rem; line-height: 1.5;">
                Missed-round credit uses Math.round(((players - 2) * 20) / players) for each scored round they missed.
            </p>
            <select id="midGamePlayerSelect" style="margin-bottom: 0.5rem;">
                <option value="">-- Choose saved player --</option>
                ${availableSavedPlayers.map(player => `<option value="${escapeHtml(player)}">${escapeHtml(player)}</option>`).join('')}
            </select>
            <input type="text" id="midGamePlayerName" placeholder="Or type a new player name" style="margin-bottom: 0.75rem;">
            <button class="btn btn-success" onclick="addPlayerMidGame()" style="width: 100%;">➕ Add To Current Game</button>
        </div>
    `;
}

function openGamePlayersModal() {
    renderGamePlayersModal();
    document.getElementById('gamePlayersModal').classList.add('active');
}

function addPlayerMidGame() {
    const select = document.getElementById('midGamePlayerSelect');
    const input = document.getElementById('midGamePlayerName');
    const name = (input.value.trim() || select.value.trim());

    if (!name) {
        alert('Choose a saved player or type a new player name.');
        return;
    }

    if (gameState.players.some(player => player.name.toLowerCase() === name.toLowerCase())) {
        alert('That player is already part of this game.');
        return;
    }

    if (getActivePlayerIndexes().length >= 11) {
        alert('You already have 11 active players. Disable someone first.');
        return;
    }

    const player = {
        name,
        score: 0,
        rounds: [],
        active: true,
        previousPosition: gameState.players.length + 1
    };
    const playerIndex = gameState.players.push(player) - 1;

    gameState.rounds.forEach((round, roundIndex) => {
        if (round.scored) {
            const credit = calculateMissedRoundCredit(getRoundParticipatingCount(round));
            round.playerData[playerIndex] = createRoundPlayerData(false, {
                score: credit,
                absentReason: 'joined-late'
            });
            player.score += credit;
            player.rounds.push({
                round: roundIndex + 1,
                bid: null,
                gotSet: false,
                score: credit,
                joinedLate: true
            });
        } else {
            round.playerData[playerIndex] = createRoundPlayerData(true);
        }
    });

    const savedPlayers = getSavedPlayers();
    if (!savedPlayers.includes(name)) {
        savePlayers([...savedPlayers, name]);
        loadSavedPlayers();
    }

    renderGame();
    updatePlayerPositions();
    autoSave();
    renderGamePlayersModal();

    alert(`${name} added with ${player.score} catch-up points.`);
}

function disablePlayerMidGame(playerName) {
    const playerIndex = gameState.players.findIndex(player => player.name === playerName);
    if (playerIndex < 0) return;

    const activeIndexes = getActivePlayerIndexes();
    if (activeIndexes.length <= 3) {
        alert('You need at least 3 active players.');
        return;
    }

    if (!confirm(`Disable ${playerName} for the rest of the game?`)) {
        return;
    }

    const currentRound = gameState.rounds[gameState.currentRound];
    const currentRoundData = currentRound?.playerData?.[playerIndex];

    gameState.players[playerIndex].active = false;

    if (currentRound && !currentRound.scored && currentRoundData?.participating) {
        currentRound.playerData[playerIndex] = createRoundPlayerData(false, { absentReason: 'disabled' });

        if (currentRound.dealerIndex === playerIndex) {
            const remainingActive = gameState.players
                .map((player, idx) => (currentRound.playerData[idx]?.participating ? idx : null))
                .filter(idx => idx !== null);
            currentRound.dealerIndex = remainingActive[0] ?? currentRound.dealerIndex;
        }
    }

    renderGame();
    updatePlayerPositions();
    autoSave();
    renderGamePlayersModal();
}

function openRulesModal() {
    const content = document.getElementById('rulesContent');
    
    content.innerHTML = `
        <div style="color: #cbd5e1; line-height: 1.6;">
            <h3 style="color: #fbbf24; margin-top: 1rem; margin-bottom: 0.75rem;">🎯 Game Overview</h3>
            <p>Oh Hell is a trick-taking card game where players must bid exactly how many tricks they'll win. The total bids cannot equal the hand size (marked as ❌ EXACT).</p>
            
            <h3 style="color: #fbbf24; margin-top: 1.5rem; margin-bottom: 0.75rem;">📊 Scoring Formula</h3>
            <p style="margin-bottom: 1rem;">Your score for a round depends on whether you made your bid:</p>
            
            <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                <h4 style="color: #10b981; margin-bottom: 0.5rem;">✅ Made Your Bid (Positive Bid > 0)</h4>
                <code style="display: block; background: #0f172a; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0; color: #10b981; font-size: 0.9rem;">
                    Score = 10 + (Bid²) + Confidence - Deferred - Tax
                </code>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;"><strong>Example:</strong> Bid 3, Confidence MAX (10), No deferred, No tax</p>
                <p style="font-size: 0.9rem; color: #94a3b8;">= 10 + (3²) + 10 - 0 - 0 = <strong style="color: #10b981;">29 points</strong></p>
            </div>
            
            <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                <h4 style="color: #10b981; margin-bottom: 0.5rem;">✅ Made Zero Bid</h4>
                <code style="display: block; background: #0f172a; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0; color: #10b981; font-size: 0.9rem;">
                    Score = ZeroBonus + HandSize + Confidence - Deferred - Tax
                </code>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;"><strong>Zero Bonus:</strong> 10 points (≤6 players) or 5 points (>6 players)</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;"><strong>Example:</strong> 4 players, Hand size 8, Confidence MAX (5)</p>
                <p style="font-size: 0.9rem; color: #94a3b8;">= 10 + 8 + 5 - 0 - 0 = <strong style="color: #10b981;">23 points</strong></p>
            </div>
            
            <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;">
                <h4 style="color: #ef4444; margin-bottom: 0.5rem;">❌ Got Set (Failed Bid)</h4>
                <code style="display: block; background: #0f172a; padding: 0.75rem; border-radius: 4px; margin: 0.5rem 0; color: #ef4444; font-size: 0.9rem;">
                    Score = -Confidence - Deferred - Tax
                </code>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;"><strong>Example:</strong> Confidence MAX (10), Deferred, Tax 2</p>
                <p style="font-size: 0.9rem; color: #94a3b8;">= -10 - 2 - 2 = <strong style="color: #ef4444;">-14 points</strong></p>
            </div>
            
            <h3 style="color: #fbbf24; margin-top: 1.5rem; margin-bottom: 0.75rem;">⚙️ Modifiers</h3>
            
            <div style="background: rgba(51, 65, 85, 0.5); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <h4 style="color: #fbbf24; margin-bottom: 0.5rem;">Confidence</h4>
                <p style="font-size: 0.9rem;">How confident are you in making your bid?</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.9rem;">
                    <li><strong>MAX:</strong> 10 points (for bid > 0) or 5 points (for bid = 0)</li>
                    <li><strong>0, 5, 10:</strong> Manual confidence values</li>
                    <li>Higher confidence = bigger reward if you make it, bigger penalty if you don't</li>
                </ul>
            </div>
            
            <div style="background: rgba(51, 65, 85, 0.5); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <h4 style="color: #fbbf24; margin-bottom: 0.5rem;">Tax</h4>
                <p style="font-size: 0.9rem;">Points paid by the auction winner to buy trump suit choice</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.9rem;">
                    <li>Subtracted from your score (win or lose)</li>
                    <li>Typical range: 0-5 points</li>
                </ul>
            </div>
            
            <div style="background: rgba(51, 65, 85, 0.5); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <h4 style="color: #fbbf24; margin-bottom: 0.5rem;">Deferred</h4>
                <p style="font-size: 0.9rem;">If you bid last and deferred your decision:</p>
                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.9rem;">
                    <li><strong>-2 points</strong> penalty (win or lose)</li>
                    <li>Encourages decisive bidding</li>
                </ul>
            </div>
            
            <h3 style="color: #fbbf24; margin-top: 1.5rem; margin-bottom: 0.75rem;">📐 Complete Examples</h3>
            
            <div style="background: rgba(15, 23, 42, 0.9); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <p style="font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem;">Example 1: Successful High Bid</p>
                <p style="font-size: 0.9rem; color: #cbd5e1;">
                    • Bid: 5<br>
                    • Confidence: MAX (10)<br>
                    • Tax: 3<br>
                    • Deferred: No<br>
                    • Result: Made bid ✅
                </p>
                <code style="display: block; background: #0a0f1a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; color: #10b981; font-size: 0.85rem;">
                    10 + (5²) + 10 - 0 - 3 = 10 + 25 + 10 - 3 = 42 points
                </code>
            </div>
            
            <div style="background: rgba(15, 23, 42, 0.9); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <p style="font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem;">Example 2: Failed Bid with Penalties</p>
                <p style="font-size: 0.9rem; color: #cbd5e1;">
                    • Bid: 4<br>
                    • Confidence: 5<br>
                    • Tax: 2<br>
                    • Deferred: Yes<br>
                    • Result: Got set ❌
                </p>
                <code style="display: block; background: #0a0f1a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; color: #ef4444; font-size: 0.85rem;">
                    -5 - 2 - 2 = -9 points
                </code>
            </div>
            
            <div style="background: rgba(15, 23, 42, 0.9); padding: 1rem; border-radius: 8px; margin-bottom: 0.75rem;">
                <p style="font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem;">Example 3: Successful Zero Bid</p>
                <p style="font-size: 0.9rem; color: #cbd5e1;">
                    • Bid: 0<br>
                    • Hand Size: 10<br>
                    • Players: 6<br>
                    • Confidence: MAX (5 for zero bids)<br>
                    • Tax: 0<br>
                    • Result: Made bid ✅
                </p>
                <code style="display: block; background: #0a0f1a; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; color: #10b981; font-size: 0.85rem;">
                    10 + 10 + 5 - 0 - 0 = 25 points
                </code>
            </div>
            
            <h3 style="color: #fbbf24; margin-top: 1.5rem; margin-bottom: 0.75rem;">🎲 Bid Rules</h3>
            <ul style="margin: 0; padding-left: 1.5rem; font-size: 0.9rem;">
                <li style="margin-bottom: 0.5rem;"><strong>Under (🦆):</strong> Total bids < hand size - Valid</li>
                <li style="margin-bottom: 0.5rem;"><strong>Over (🦢):</strong> Total bids > hand size - Valid</li>
                <li style="margin-bottom: 0.5rem;"><strong>Exact (❌):</strong> Total bids = hand size - INVALID (cannot score)</li>
            </ul>
        </div>
    `;
    
    document.getElementById('rulesModal').classList.add('active');
}

function openSettingsModal() {
    const syncUrl = normalizeSyncUrl(localStorage.getItem('ohHellPlayerSyncUrl') || DEFAULT_SYNC_URL);
    const historySourceUrl = localStorage.getItem(HISTORY_SOURCE_URL_STORAGE_KEY) || DEFAULT_HISTORY_SOURCE_URL;
    const autoSync = localStorage.getItem('ohHellAutoSync') !== 'false';
    
    const modal = document.getElementById('settingsModal');
    const content = modal.querySelector('.modal-content');
    
    content.innerHTML = `
        <div class="modal-header">
            <h2>⚙️ Settings</h2>
            <button class="close-modal" onclick="closeModal('settingsModal')">&times;</button>
        </div>

        <div class="input-group">
            <label>Player List Sync URL</label>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem;">
                Enter a URL to a JSON file with your player list. The app will automatically fetch updates when loaded.
            </p>
            <input type="text" id="syncUrl" placeholder="https://raw.githubusercontent.com/..." value="${syncUrl}" style="margin-bottom: 0.5rem;">
            <p style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 1rem;">
                <strong>Example:</strong> GitHub raw file URL or any CORS-enabled endpoint with a JSON players array
            </p>
        </div>

        <div class="input-group">
            <label>History Stats Source URL</label>
            <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem;">
                Paste a GitHub history folder URL and the app will auto-discover every JSON file using the GitHub Contents API.
            </p>
            <input type="text" id="historySourceUrl" placeholder="https://github.com/owner/repo/tree/main/history" value="${historySourceUrl}" style="margin-bottom: 0.5rem;">
            <p style="color: #94a3b8; font-size: 0.8rem; margin-bottom: 1rem;">
                <strong>Example:</strong> https://github.com/rickytann14/Oh-Hell/tree/main/history
            </p>
        </div>

        <div class="checkbox-group" style="margin-bottom: 1.5rem;">
            <label class="checkbox-label">
                <input type="checkbox" id="autoSyncCheck" ${autoSync ? 'checked' : ''}>
                Auto-sync on app load
            </label>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="saveSettings()" style="flex: 1;">💾 Save Settings</button>
            <button class="btn btn-secondary" onclick="testSyncUrl()" style="flex: 1;">🔄 Test Player URL</button>
            <button class="btn btn-danger" onclick="clearSyncUrl()" style="flex: 1;">🗑️ Clear Player URL</button>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="testHistorySourceUrl()" style="flex: 1;">📊 Test History Source</button>
            <button class="btn btn-danger" onclick="clearHistorySourceUrl()" style="flex: 1;">🗑️ Reset History Source</button>
        </div>
    `;
    
    modal.classList.add('active');
}

function showSaveLoadModal() {
    const gameList = document.getElementById('gameList');

    gameList.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <p style="color: #cbd5e1; margin-bottom: 1.5rem;">Select a saved game file (.json) to load</p>
            <button class="btn btn-primary" onclick="document.getElementById('loadGameFile').click()" style="padding: 1rem 2rem; font-size: 1.1rem;">
                📁 Choose Game File
            </button>
            <input type="file" id="loadGameFile" accept=".json" onchange="loadGameFromFile(event)" style="display: none;">
        </div>
    `;

    document.getElementById('saveLoadModal').classList.add('active');
}

function loadGameFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const game = JSON.parse(e.target.result);
            
            // Validate it's a valid game file
            if (!game.players || !game.rounds || !Array.isArray(game.players)) {
                throw new Error('Invalid game file format');
            }

            // Handle backward compatibility
            if (!game.startingHandSize) {
                game.startingHandSize = game.handProgression?.[0]
                    || game.rounds?.[0]?.handSize
                    || game.currentHandSize
                    || 10;
            }
            
            // Initialize previousPosition if not present
            gameState = normalizeGameState(game);
            setActiveView('game');
            renderGame();
            closeModal('saveLoadModal');
            
            alert('✅ Game loaded successfully!');
        } catch (error) {
            alert('❌ Error loading game file: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Reset file input
    event.target.value = '';
}

function deleteGame(gameId) {
    // This function is no longer needed but kept for backward compatibility
    alert('Delete function is no longer available. Simply delete the JSON file from your computer.');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}


function editRound(roundIndex) {
    editingRoundIndex = roundIndex;
    const round = gameState.rounds[roundIndex];
    
    document.getElementById('editRoundNumber').textContent = roundIndex + 1;
    
    const totalBids = round.playerData.reduce((sum, p) => sum + p.bid, 0);
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

    const content = document.getElementById('editRoundContent');
    content.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.9); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
            <div class="round-header">
                <h3>Edit Round Settings</h3>
                <div class="bid-tracker ${bidClass}">
                    ${totalBids}/${round.handSize} ${bidStatus}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.75rem;">
                <div>
                    <label class="field-label">Hand Size</label>
                    <div class="field-row">
                        <button onclick="adjustEditHandSize(-1)" class="btn-adjust btn-adjust--dec">−</button>
                        <div class="value-display value-display--hand">
                            ${round.handSize}
                        </div>
                        <button onclick="adjustEditHandSize(1)" class="btn-adjust btn-adjust--inc">+</button>
                    </div>
                </div>
                <div>
                    <label class="field-label">Round Number</label>
                    <input type="text" value="${roundIndex + 1}" disabled>
                </div>
            </div>
        </div>

        <div class="players-grid" id="editPlayersGrid">
            ${gameState.players.map((player, idx) => {
                const pdata = round.playerData[idx];
                if (!pdata || !pdata.participating) {
                    const label = pdata?.absentReason === 'joined-late'
                        ? `Missed round credit: +${pdata.score}`
                        : 'Did not play this round';

                    return `
                        <div class="player-card" style="border-style: dashed; opacity: 0.78;">
                            <div class="player-name">${escapeHtml(player.name)}</div>
                            <div style="color: #cbd5e1; font-size: 0.92rem; line-height: 1.5;">${label}</div>
                        </div>
                    `;
                }

                const madePrediction = calculatePlayerRoundScore(round, round.playerData[idx], false);
                const setPrediction = calculatePlayerRoundScore(round, round.playerData[idx], true);
                const existingRoundScore = round.playerData[idx].score || 0;
                const madeTotal = calculateProjectedTotal(player.score, madePrediction, existingRoundScore);
                const setTotal = calculateProjectedTotal(player.score, setPrediction, existingRoundScore);

                return `
                <div class="player-card ${idx === round.dealerIndex ? 'dealer' : ''}">
                    <div class="player-name">
                        ${escapeHtml(player.name)}
                        ${idx === round.dealerIndex ? '<span>🎴 Dealer</span>' : ''}
                    </div>
                    
                    <div class="player-inputs-grid">
                        <div>
                            <label class="field-label">Bid</label>
                            <input type="number" min="0" max="${round.handSize}" value="${round.playerData[idx].bid}"
                                   onchange="updateEditBid(${idx}, this.value)">
                            <div class="quick-value-row">
                                ${[5, 10].map(value => `
                                    <button class="quick-value-btn" onclick="setEditBid(${idx}, ${value})">${value}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <label class="field-label">Tax</label>
                            <div class="field-row">
                                <button onclick="adjustEditTax(${idx}, -1)" class="btn-adjust btn-adjust--dec">−</button>
                                <div class="value-display value-display--tax">
                                    ${round.playerData[idx].tax}
                                </div>
                                <button onclick="adjustEditTax(${idx}, 1)" class="btn-adjust btn-adjust--inc">+</button>
                            </div>
                            <div class="quick-value-row">
                                ${[5, 10, 15, 25].map(value => `
                                    <button class="quick-value-btn" onclick="setEditTax(${idx}, ${value})">${value}</button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="col-span-2">
                            <label class="field-label">Confidence</label>
                            <select onchange="updateEditConfidence(${idx}, this.value)">
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
                                   onchange="updateEditDeferred(${idx}, this.checked)">
                            Deferred
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" ${round.playerData[idx].gotSet ? 'checked' : ''} 
                                   onchange="updateEditGotSet(${idx}, this.checked)">
                            Got Set
                        </label>
                    </div>

                    <div class="score-prediction">
                        <span class="made">If made: ${madeTotal} (${formatSignedValue(madePrediction)})</span>
                        <span class="set">If set: ${setTotal} (${formatSignedValue(setPrediction)})</span>
                    </div>
                </div>
            `;
            }).join('')}
        </div>

        <button class="btn btn-success" onclick="saveEditedRound()" 
                style="width: 100%; margin-top: 1rem; padding: 1rem; font-size: 1.1rem;">
            💾 Save Changes
        </button>
    `;

    document.getElementById('editRoundModal').classList.add('active');
}

// Edit-round mutation functions (mirror current-round but target editingRoundIndex)
function updateEditBid(playerIdx, value) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].bid = parseInt(value) || 0;
    editRound(editingRoundIndex);
}

function setEditBid(playerIdx, value) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].bid = _clampedBid(editingRoundIndex, playerIdx, value);
    editRound(editingRoundIndex);
}

function updateEditHandSize(value) {
    _applyHandSize(editingRoundIndex, value);
    editRound(editingRoundIndex);
}

function adjustEditHandSize(delta) {
    updateEditHandSize(Math.max(1, Math.min(20, gameState.rounds[editingRoundIndex].handSize + delta)));
}

function updateEditTax(playerIdx, value) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].tax = parseInt(value) || 0;
}

function adjustEditTax(playerIdx, delta) {
    const round = gameState.rounds[editingRoundIndex];
    round.playerData[playerIdx].tax = _clampedTax(round.playerData[playerIdx].tax + delta);
    editRound(editingRoundIndex);
}

function setEditTax(playerIdx, value) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].tax = _clampedTax(value);
    editRound(editingRoundIndex);
}

function updateEditConfidence(playerIdx, value) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].confidence = value;
    editRound(editingRoundIndex);
}

function updateEditDeferred(playerIdx, checked) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].deferred = checked;
    editRound(editingRoundIndex);
}

function updateEditGotSet(playerIdx, checked) {
    gameState.rounds[editingRoundIndex].playerData[playerIdx].gotSet = checked;
    editRound(editingRoundIndex);
}

function saveEditedRound() {
    const round = gameState.rounds[editingRoundIndex];

    // Keep exact bids invalid in edit mode too.
    const totalBids = round.playerData.reduce((sum, pdata) => {
        if (!pdata || pdata.participating === false) return sum;
        return sum + (Number(pdata.bid) || 0);
    }, 0);
    if (totalBids === round.handSize) {
        round.exactBidBlocks = (Number(round.exactBidBlocks) || 0) + 1;
        autoSave();
        alert('❌ Cannot save an EXACT-bid round. Change at least one bid first.');
        return;
    }
    
    // Check if at least one player got set
    const anyoneSet = round.playerData.some(p => p && p.participating && p.gotSet);
    if (!anyoneSet) {
        alert('Please mark at least one player as "Got Set"!');
        return;
    }

    // First, reverse the old scores for this round
    round.playerData.forEach((pdata, idx) => {
        if (!pdata) {
            return;
        }

        gameState.players[idx].score -= pdata.score;
        
        // Find and remove the old round data from player history
        const roundHistoryIdx = gameState.players[idx].rounds.findIndex(
            r => r.round === editingRoundIndex + 1
        );
        if (roundHistoryIdx >= 0) {
            gameState.players[idx].rounds.splice(roundHistoryIdx, 1);
        }
    });

    // Now recalculate scores with new data
    round.playerData.forEach((pdata, idx) => {
        if (!pdata) {
            return;
        }

        if (!pdata.participating) {
            gameState.players[idx].score += pdata.score;

            if (pdata.absentReason === 'joined-late' && pdata.score) {
                gameState.players[idx].rounds.push({
                    round: editingRoundIndex + 1,
                    bid: null,
                    gotSet: false,
                    score: pdata.score,
                    joinedLate: true
                });
                gameState.players[idx].rounds.sort((a, b) => a.round - b.round);
            }
            return;
        }

        const bid = pdata.bid;
        const roundScore = calculatePlayerRoundScore(round, pdata, pdata.gotSet);

        pdata.score = roundScore;
        gameState.players[idx].score += roundScore;
        
        // Re-add to player history
        gameState.players[idx].rounds.push({
            round: editingRoundIndex + 1,
            bid: bid,
            gotSet: pdata.gotSet,
            score: roundScore
        });
        
        // Sort rounds by round number
        gameState.players[idx].rounds.sort((a, b) => a.round - b.round);
    });

    closeModal('editRoundModal');
    
    // Re-render everything
    if (editingRoundIndex === gameState.currentRound) {
        renderRoundSetup();
    }
    renderScoreboard();
    renderHistory();
    updatePlayerPositions();
    
    alert('Round updated successfully!');
}
