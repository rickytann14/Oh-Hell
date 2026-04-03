function startGame() {
    const num = parseInt(document.getElementById('numPlayers').value);
    const players = [];
    
    for (let i = 0; i < num; i++) {
        const name = document.getElementById(`player${i}`).value.trim();
        if (!name) {
            alert(`Please select a player for Player ${i + 1}`);
            return;
        }
        players.push({
            name: name,
            score: 0,
            rounds: []
        });
    }

    const startingHandSize = parseInt(document.getElementById('startingHandSize').value) || 10;

    gameState = {
        players: players.map((p, idx) => ({...p, previousPosition: idx + 1, active: true})),
        rounds: [],
        currentRound: 0,
        startingHandSize: startingHandSize,
        gameId: Date.now().toString(),
        createdAt: new Date().toISOString()
    };

    setActiveView('game');
    selectedPlayerIndex = null; // Reset selection for first round
    startNewRound();
    autoSave(); // Auto-save after starting game
}

function saveGame() {
    const gameToSave = {
        ...gameState,
        savedAt: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(gameToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate shorter filename with just date and round
    const date = new Date().toISOString().split('T')[0];
    const round = gameState.currentRound + 1;
    const fileName = `oh-hell-${date}-r${round}.json`;
    
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('✅ Game saved successfully!\n\nFile: ' + fileName);
}


function newGame() {
    if (gameState.rounds.length > 0 && !confirm('Start a new game? Current game will be lost if not saved.')) {
        return;
    }

    setActiveView('setup');

    const stickyInfo = document.getElementById('stickyRoundInfo');
    if (stickyInfo) {
        stickyInfo.innerHTML = '';
    }
    
    gameState = {
        players: [],
        rounds: [],
        currentRound: 0,
        startingHandSize: 10,
        gameId: null,
        createdAt: null
    };
    
    // Reset player inputs
    updatePlayerInputs();
    clearAutoSave(); // Clear auto-save when starting new game
}

// Close modals on background click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

function exportToExcel() {
    // Generate TSV data formatted for the Excel sheet
    let data = [];
    
    // Row 1: Player names (starting from column D)
    let row1 = ['', '', ''];  // A1, B1, C1 empty
    gameState.players.forEach(player => {
        row1.push(player.name);
    });
    data.push(row1);
    
    // Row 2: Score totals (with formulas reference - we'll put actual scores)
    let row2 = ['Rounds', '', 'Score'];
    gameState.players.forEach(player => {
        row2.push(player.score);
    });
    data.push(row2);
    
    // Now add each round (6 rows per round)
    gameState.rounds.forEach((round, roundIdx) => {
        if (!round.scored) return; // Skip unscored rounds
        
        // Row 1 of round: Hand Size
        let r1 = ['Hand Size', round.handSize, 'Tax'];
        round.playerData.forEach(pdata => {
            r1.push(pdata.tax);
        });
        data.push(r1);
        
        // Row 2 of round: Bid Count (we'll show total/handSize)
        const totalBids = round.playerData.reduce((sum, p) => sum + p.bid, 0);
        let bidStatus = totalBids < round.handSize ? '🦆' : (totalBids > round.handSize ? '🦢' : '❌');
        let r2 = ['Bid Count', `${totalBids}/${round.handSize} ${bidStatus}`, 'Bid'];
        round.playerData.forEach(pdata => {
            r2.push(pdata.bid);
        });
        data.push(r2);
        
        // Row 3 of round: Dealer
        const dealerName = gameState.players[round.dealerIndex].name;
        let r3 = ['Dealer', dealerName, 'Deferred'];
        round.playerData.forEach(pdata => {
            r3.push(pdata.deferred ? 'TRUE' : 'FALSE');
        });
        data.push(r3);
        
        // Row 4 of round: Low indicator
        let r4 = ['Low', '', 'Confidence'];
        round.playerData.forEach(pdata => {
            r4.push(pdata.confidence);
        });
        data.push(r4);
        
        // Row 5 of round: Scored / Got set
        let r5 = ['Scored', 'TRUE', 'Got set'];
        round.playerData.forEach(pdata => {
            r5.push(pdata.gotSet ? 'TRUE' : 'FALSE');
        });
        data.push(r5);
        
        // Row 6 of round: High indicator / Score
        let r6 = ['High', '', 'Score'];
        round.playerData.forEach(pdata => {
            r6.push(pdata.score);
        });
        data.push(r6);
    });
    
    // Convert to TSV
    const tsv = data.map(row => row.join('\t')).join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(tsv).then(() => {
        alert('✅ Game data copied to clipboard!\n\nTo paste into your Excel sheet:\n1. Open your Oh Hell Excel file\n2. Go to the ScoreV2 sheet\n3. Click on cell A1\n4. Press Ctrl+V (or Cmd+V on Mac)\n5. Your game data will populate the sheet!');
    }).catch(err => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = tsv;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            alert('✅ Game data copied to clipboard!\n\nTo paste into your Excel sheet:\n1. Open your Oh Hell Excel file\n2. Go to the ScoreV2 sheet\n3. Click on cell A1\n4. Press Ctrl+V (or Cmd+V on Mac)\n5. Your game data will populate the sheet!');
        } catch (e) {
            alert('❌ Failed to copy. Please try again.');
        }
        
        document.body.removeChild(textarea);
    });
}
