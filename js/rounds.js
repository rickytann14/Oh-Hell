// Debounce rapid render calls to avoid visual flashing
let _renderDebounceTimer = null;
function _debounceRender() {
    clearTimeout(_renderDebounceTimer);
    _renderDebounceTimer = setTimeout(() => {
        renderRoundSetup();
    }, 80);
}

function _mutate(fn) {
    fn();
    _debounceRender();
    autoSave();
}

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

// Shared per-field mutation helpers (roundIdx-parameterized, called by both current and edit round)
function _applyBid(roundIdx, playerIdx, value) {
    const pdata = gameState.rounds[roundIdx].playerData[playerIdx];
    pdata.bid = _clampedBid(roundIdx, playerIdx, value);
    if (pdata.bid === 0 && pdata.confidence > 5) pdata.confidence = 5;
}
function _applyBidDelta(roundIdx, playerIdx, delta) {
    const round = gameState.rounds[roundIdx];
    round.playerData[playerIdx].bid = Math.max(0, Math.min(round.handSize, round.playerData[playerIdx].bid + delta));
}
function _applyTaxDelta(roundIdx, playerIdx, delta) {
    const round = gameState.rounds[roundIdx];
    round.playerData[playerIdx].tax = _clampedTax(round.playerData[playerIdx].tax + delta);
}
function _applyTax(roundIdx, playerIdx, value)        { gameState.rounds[roundIdx].playerData[playerIdx].tax        = _clampedTax(value); }
function _applyConfidence(roundIdx, playerIdx, value) { gameState.rounds[roundIdx].playerData[playerIdx].confidence = value; }
function _applyDeferred(roundIdx, playerIdx, checked) { gameState.rounds[roundIdx].playerData[playerIdx].deferred   = checked; }
function _applyGotSet(roundIdx, playerIdx, checked)   { gameState.rounds[roundIdx].playerData[playerIdx].gotSet     = checked; }

// Current-round mutation functions
function updateBid(playerIdx, value)        { _mutate(() => _applyBid(gameState.currentRound, playerIdx, value)); }
function adjustBid(playerIdx, delta)        { _mutate(() => _applyBidDelta(gameState.currentRound, playerIdx, delta)); }
function setBid(playerIdx, value)           { _mutate(() => _applyBid(gameState.currentRound, playerIdx, value)); }
function adjustTax(playerIdx, delta)        { _mutate(() => _applyTaxDelta(gameState.currentRound, playerIdx, delta)); }
function setTax(playerIdx, value)           { _mutate(() => _applyTax(gameState.currentRound, playerIdx, value)); }
function updateConfidence(playerIdx, value) { _mutate(() => _applyConfidence(gameState.currentRound, playerIdx, value)); }
function updateDeferred(playerIdx, checked) { _mutate(() => _applyDeferred(gameState.currentRound, playerIdx, checked)); }
function updateGotSet(playerIdx, checked)   { _mutate(() => _applyGotSet(gameState.currentRound, playerIdx, checked)); }

function updateCurrentRoundHandSize(value) { _mutate(() => _applyHandSize(gameState.currentRound, value)); }
function adjustCurrentRoundHandSize(delta) {
    const round = gameState.rounds[gameState.currentRound];
    if (round.scored) return;
    updateCurrentRoundHandSize(Math.max(1, Math.min(20, round.handSize + delta)));
}

function updateTax(playerIdx, value) {
    gameState.rounds[gameState.currentRound].playerData[playerIdx].tax = parseInt(value) || 0;
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

// Shared helper: close all open panels of the given CSS class, then toggle the target panel.
function toggleDropdownPanel(panelClass, targetPanel) {
    const isOpen = targetPanel.classList.contains('open');
    document.querySelectorAll(`.${panelClass}.open`).forEach(p => p.classList.remove('open'));
    if (!isOpen) targetPanel.classList.add('open');
}

function toggleConfDropdown(wrapId) {
    toggleDropdownPanel('conf-select-panel', document.querySelector(`#${wrapId} .conf-select-panel`));
}

function toggleTrumpDropdown(wrapId) {
    toggleDropdownPanel('trump-select-panel', document.querySelector(`#${wrapId} .trump-select-panel`));
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
    const totalBids = getTotalBids(round);
    if (totalBids === round.handSize) {
        round.exactBidBlocks = (Number(round.exactBidBlocks) || 0) + 1;
        autoSave();
        alert('❌ Cannot score round when bids are EXACT!\n\nThe total bids equal the hand size. Someone must change their bid.');
        return;
    }
    
    // Check if at least one player got set
    const anyoneSet = round.playerData.some(p => p && p.participating && p.gotSet);
    if (!anyoneSet) {
        alert('Please mark at least one player as "Got Set" to score the round!\n\nGot Set means a player failed to make their bid.');
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
    selectedPlayerIndex = null;
    viewAllActive = false;
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

