function createRoundPlayerData(participating = true, overrides = {}) {
    return {
        bid: 0,
        tax: 0,
        deferred: false,
        confidence: 'MAX',
        gotSet: false,
        score: 0,
        participating,
        absentReason: participating ? '' : 'inactive',
        ...overrides
    };
}

function getActivePlayerIndexes() {
    return gameState.players
        .map((player, idx) => (player.active === false ? null : idx))
        .filter(idx => idx !== null);
}

function getRoundParticipatingCount(round) {
    return (round.playerData || []).filter(pdata => pdata && pdata.participating).length;
}

function calculateMissedRoundCredit(playerCount) {
    if (!playerCount) return 0;
    return Math.round(((playerCount - 2) * 20) / playerCount);
}

function getNextDealerIndex(previousRound = null) {
    const activeIndexes = getActivePlayerIndexes();
    if (activeIndexes.length === 0) return 0;
    if (!previousRound) return activeIndexes[0];

    const nextDealer = activeIndexes.find(idx => idx > previousRound.dealerIndex);
    return nextDealer !== undefined ? nextDealer : activeIndexes[0];
}

function normalizeGameState(game) {
    const normalizedPlayers = (game.players || []).map((player, idx) => ({
        ...player,
        rounds: Array.isArray(player.rounds) ? player.rounds : [],
        active: player.active !== false,
        previousPosition: player.previousPosition === undefined ? idx + 1 : player.previousPosition
    }));

    const normalizedRounds = (game.rounds || []).map((round) => {
        const existingPlayerData = Array.isArray(round.playerData) ? round.playerData : [];
        const normalizedPlayerData = normalizedPlayers.map((player, idx) => {
            const existing = existingPlayerData[idx];
            if (!existing) {
                return createRoundPlayerData(false, { absentReason: 'not-in-game' });
            }

            return {
                ...createRoundPlayerData(existing.participating !== false),
                ...existing,
                participating: existing.participating !== false,
                absentReason: existing.participating === false
                    ? (existing.absentReason || 'inactive')
                    : ''
            };
        });

        return {
            ...round,
            reverseValue: REVERSE_VALUE.includes(round.reverseValue) ? round.reverseValue : 'N',
            exactBidBlocks: Number(round.exactBidBlocks) || 0,
            playerData: normalizedPlayerData
        };
    });

    return {
        ...game,
        players: normalizedPlayers,
        rounds: normalizedRounds,
        currentRound: game.currentRound || 0,
        startingHandSize: game.startingHandSize || 10,
        gameId: game.gameId || null,
        createdAt: game.createdAt || null
    };
}

function normalizeSyncUrl(url) {
    if (!url) return '';

    try {
        const parsed = new URL(url);

        if (parsed.hostname === 'github.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 5 && parts[2] === 'blob') {
                const owner = parts[0];
                const repo = parts[1];
                const branch = parts[3];
                const filePath = parts.slice(4).join('/');
                return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
            }
        }
    } catch (error) {
        return url;
    }

    return url;
}

function normalizeHistorySourceUrl(url) {
    if (!url) return '';

    const trimmedUrl = url.trim();

    try {
        const parsed = new URL(trimmedUrl);

        if (parsed.hostname === 'github.com') {
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length >= 5 && parts[2] === 'tree') {
                const owner = parts[0];
                const repo = parts[1];
                const branch = parts[3];
                const folderPath = parts.slice(4).join('/');
                return `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`;
            }
        }
    } catch (error) {
        return trimmedUrl;
    }

    return trimmedUrl;
}

function getHistorySourceUrl() {
    return localStorage.getItem(HISTORY_SOURCE_URL_STORAGE_KEY) || DEFAULT_HISTORY_SOURCE_URL;
}

function isGitHubContentsApiUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.hostname === 'api.github.com' && /\/repos\/[^/]+\/[^/]+\/contents\//.test(parsed.pathname);
    } catch (error) {
        return false;
    }
}

function formatSignedValue(value) {
    return value >= 0 ? `+${value}` : `${value}`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function parseTrumpCard(trumpValue) {
    if (!trumpValue || typeof trumpValue !== 'string') {
        return { rank: '', suit: '' };
    }

    const suit = TRUMP_SUITS.find(s => trumpValue.includes(s)) || '';
    if (!suit) {
        return { rank: '', suit: '' };
    }

    const rank = trumpValue.replace(suit, '').trim();
    if (!TRUMP_RANKS.includes(rank)) {
        return { rank: '', suit: '' };
    }

    return { rank, suit };
}
