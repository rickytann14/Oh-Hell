let _statsCache = null;
let _statsCacheKey = null;

async function discoverHistoryJsonPaths(sourceUrl = getHistorySourceUrl()) {
    const fallbackPaths = ['history/metric.json'];
    const normalizedSourceUrl = normalizeHistorySourceUrl(sourceUrl || '');

    if (normalizedSourceUrl && isGitHubContentsApiUrl(normalizedSourceUrl)) {
        try {
            const response = await fetch(normalizedSourceUrl);
            if (response.ok) {
                const data = await response.json();
                const discovered = (Array.isArray(data) ? data : [])
                    .filter(item => item && item.type === 'file' && typeof item.name === 'string' && item.name.toLowerCase().endsWith('.json'))
                    .map(item => item.download_url)
                    .filter(Boolean);

                if (discovered.length > 0) {
                    return [...new Set(discovered)];
                }
            }
        } catch (error) {
            // Ignore remote discovery errors and fall back to local/project discovery.
        }
    }

    try {
        const response = await fetch('history/');
        if (!response.ok) {
            return fallbackPaths;
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const discovered = links
            .map(link => link.getAttribute('href') || '')
            .filter(href => href && href.toLowerCase().endsWith('.json'))
            .map(href => href.startsWith('http') || href.startsWith('history/') ? href : `history/${href}`);

        return discovered.length > 0 ? [...new Set(discovered)] : fallbackPaths;
    } catch (error) {
        return fallbackPaths;
    }
}

async function loadHistoryGamesFromFolder() {
    const paths = await discoverHistoryJsonPaths();
    const fetches = paths.map(async (path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) return null;
            const game = await response.json();
            if (!isValidHistoryGame(game)) return null;
            return game;
        } catch (error) {
            return null;
        }
    });

    const games = (await Promise.all(fetches)).filter(Boolean);
    return games;
}

async function openStatsModal() {
    const content = document.getElementById('statsContent');
    content.innerHTML = '<p style="color: #cbd5e1;">Loading history stats...</p>';
    document.getElementById('statsModal').classList.add('active');

    const folderGames = await loadHistoryGamesFromFolder();
    const allGames = [...folderGames, ...manualHistoryGames].filter(isValidHistoryGame);

    const cacheKey = allGames.map(g => g.gameId).join(',');
    if (_statsCache && _statsCacheKey === cacheKey) {
        renderStatsContent(_statsCache);
        return;
    }
    _statsCache = allGames;
    _statsCacheKey = cacheKey;
    renderStatsContent(_statsCache);
}

async function refreshStats() {
    const content = document.getElementById('statsContent');
    content.innerHTML = '<p style="color: #cbd5e1;">Refreshing stats...</p>';

    const folderGames = await loadHistoryGamesFromFolder();
    const mergedGames = [...folderGames, ...manualHistoryGames].filter(isValidHistoryGame);
    renderStatsContent(mergedGames);
}

function promptHistoryFolderImport() {
    document.getElementById('historyFolderInput').click();
}

function dedupeHistoryGames(games) {
    const map = new Map();

    games.forEach((game) => {
        const gameId = game.gameId || `no-id-${getGameTimestamp(game)}-${(game.players || []).length}`;
        const key = `${gameId}-${game.savedAt || game.createdAt || ''}`;
        const existing = map.get(key);

        if (!existing || getGameTimestamp(game) >= getGameTimestamp(existing)) {
            map.set(key, game);
        }
    });

    return Array.from(map.values());
}

function analyzeHistoryGames(inputGames) {
    const games = dedupeHistoryGames(inputGames.filter(isValidHistoryGame));
    const playerMap = new Map();
    const rivalryMap = new Map();
    const suitKeys = ['♠', '♥', '♦', '♣'];

    function createEmptyStats(name) {
        return {
            name,
            games: 0,
            wins: 0,
            second: 0,
            third: 0,
            totalScore: 0,
            bestGame: Number.NEGATIVE_INFINITY,
            worstGame: Number.POSITIVE_INFINITY,
            rounds: 0,
            made: 0,
            set: 0,
            totalRoundScore: 0,
            deferredCount: 0,
            zeroBids: 0,
            zeroBidsMade: 0,
            highestRoundScore: Number.NEGATIVE_INFINITY,
            lowestRoundScore: Number.POSITIVE_INFINITY,
            clutchAttempts: 0,
            clutchMade: 0,
            positiveBidFractionSum: 0,
            positiveBidCount: 0,
            totalTax: 0,
            deferredAttempts: 0,
            deferredMade: 0,
            nonDeferredAttempts: 0,
            nonDeferredMade: 0,
            dealerRounds: 0,
            dealerScoreTotal: 0,
            nonDealerRounds: 0,
            nonDealerScoreTotal: 0,
            suitScore: { '♠': 0, '♥': 0, '♦': 0, '♣': 0 },
            suitCount: { '♠': 0, '♥': 0, '♦': 0, '♣': 0 },
            reverseScore: { R: 0, N: 0 },
            reverseCount: { R: 0, N: 0 },
            highBidRounds: 0,
            highBidOppSet: 0,
            highBidOppTotal: 0,
            comebackWins: 0,
            chokeCount: 0,
            chokeOpportunities: 0,
            bestMadeStreak: 0,
            worstSetStreak: 0,
            roundScoreSumSquares: 0,
            rounds20Plus: 0,
            roundsNeg10: 0,
            momentumDiffSum: 0,
            momentumGames: 0,
            maxSetsInGame: 0,
            finishByTableSize: {},
            chaosRounds: 0,
            chaosOpportunities: 0,
            exactBlockRounds: 0
        };
    }

    function getStats(name) {
        if (!playerMap.has(name)) {
            playerMap.set(name, createEmptyStats(name));
        }
        return playerMap.get(name);
    }

    function getRankByScores(scores, targetScore) {
        return new Set(scores.filter(score => score > targetScore)).size + 1;
    }

    function getAverage(values) {
        if (!values.length) return 0;
        return values.reduce((sum, value) => sum + value, 0) / values.length;
    }

    let totalPlayersAcrossGames = 0;
    let totalScoredRoundsAcrossGames = 0;
    let totalRoundOutcomes = 0;
    let totalSetOutcomes = 0;
    let totalRoundPoints = 0;
    let totalWinningMargin = 0;
    let gamesWithWinningMargin = 0;
    let totalSetPointsAcrossRounds = 0;
    let totalScoredRounds = 0;
    let totalExactBidBlocks = 0;
    let totalChaosRounds = 0;
    let highestSetsInGame = 0;
    let highestSetsInRound = 0;

    const globalSuitScore = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
    const globalSuitCount = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
    const globalReverseScore = { R: 0, N: 0 };
    const globalReverseCount = { R: 0, N: 0 };

    games.forEach((game) => {
        const scoredRounds = game.rounds
            .map((round) => ({ round }))
            .filter(entry => entry.round && entry.round.scored && Array.isArray(entry.round.playerData));
        const scoredRoundCount = scoredRounds.length;
        const gameSetCounts = new Map();
        let totalSetsThisGame = 0;

        totalPlayersAcrossGames += game.players.length;
        totalScoredRoundsAcrossGames += scoredRoundCount;

        const finalScores = game.players.map(player => Number(player.score) || 0);
        const sorted = [...game.players].sort((a, b) => (b.score || 0) - (a.score || 0));
        const topScore = sorted.length > 0 ? (sorted[0].score || 0) : null;
        const winners = topScore === null
            ? []
            : sorted.filter(player => (player.score || 0) === topScore).map(player => player.name);
        const winnerSet = new Set(winners);

        const positionByPlayer = finalScores.map(score => getRankByScores(finalScores, score));

        if (sorted.length > 1) {
            const winningMargin = (sorted[0].score || 0) - (sorted[1].score || 0);
            totalWinningMargin += winningMargin;
            gamesWithWinningMargin += 1;
        }

        if (scoredRoundCount > 0) {
            const halfwayRoundCount = Math.ceil(scoredRoundCount * 0.5);
            const lateRoundCount = Math.ceil(scoredRoundCount * 0.7);

            function getScoresAfter(roundCount) {
                const scores = game.players.map(() => 0);

                scoredRounds.slice(0, roundCount).forEach(({ round }) => {
                    round.playerData.forEach((pdata, idx) => {
                        if (!pdata || !game.players[idx]) return;
                        scores[idx] += Number(pdata.score) || 0;
                    });
                });

                return scores;
            }

            const halfwayScores = getScoresAfter(halfwayRoundCount);
            const lateScores = getScoresAfter(lateRoundCount);
            const halfwayRanks = halfwayScores.map(score => getRankByScores(halfwayScores, score));
            const lateRanks = lateScores.map(score => getRankByScores(lateScores, score));

            game.players.forEach((player, idx) => {
                const stats = getStats(player.name);

                if (winnerSet.has(player.name) && halfwayRanks[idx] > 2) {
                    stats.comebackWins += 1;
                }

                if (lateRanks[idx] === 1) {
                    stats.chokeOpportunities += 1;
                    if (!winnerSet.has(player.name)) {
                        stats.chokeCount += 1;
                    }
                }
            });
        }

        const streaks = new Map();
        const gameRoundScoresByPlayer = new Map();

        scoredRounds.forEach(({ round }) => {
            totalScoredRounds += 1;
            let setPointsThisRound = 0;
            let setCountThisRound = 0;

            const participants = round.playerData
                .map((pdata, idx) => (pdata && pdata.participating && game.players[idx] ? idx : null))
                .filter(idx => idx !== null);

            const roundScores = participants.map(idx => Number(round.playerData[idx].score) || 0);
            const maxRoundScore = roundScores.length ? Math.max(...roundScores) : 0;
            const minRoundScore = roundScores.length ? Math.min(...roundScores) : 0;
            const spread = maxRoundScore - minRoundScore;
            const isChaosRound = spread >= 25;

            if (isChaosRound) {
                totalChaosRounds += 1;
            }

            const exactBlocks = Number(round.exactBidBlocks) || 0;
            totalExactBidBlocks += exactBlocks;
            const dealerName = game.players[round.dealerIndex]?.name;
            if (dealerName) {
                getStats(dealerName).dealerRounds += 1;
                if (exactBlocks > 0) {
                    getStats(dealerName).exactBlockRounds += 1;
                }
            }

            const roundTrumpSuit = suitKeys.includes(round.trumpSuit) ? round.trumpSuit : '';
            const roundReverse = round.reverseValue === 'R' ? 'R' : 'N';

            round.playerData.forEach((pdata, idx) => {
                if (!pdata || pdata.participating === false) return;

                const playerName = game.players[idx]?.name;
                if (!playerName) return;

                const stats = getStats(playerName);
                const bid = Number(pdata.bid) || 0;
                const tax = Number(pdata.tax) || 0;
                const score = Number(pdata.score) || 0;
                const gotSet = !!pdata.gotSet;
                const deferred = !!pdata.deferred;
                const confidence = String(pdata.confidence || '');
                const confidenceIsMax = confidence.toUpperCase() === 'MAX';

                totalRoundOutcomes += 1;
                totalSetOutcomes += gotSet ? 1 : 0;
                totalRoundPoints += score;
                if (gotSet) {
                    setPointsThisRound += score;
                    setCountThisRound += 1;
                    totalSetsThisGame += 1;
                    gameSetCounts.set(idx, (gameSetCounts.get(idx) || 0) + 1);
                }

                stats.rounds += 1;
                stats.totalRoundScore += score;
                stats.roundScoreSumSquares += score * score;
                stats.made += gotSet ? 0 : 1;
                stats.set += gotSet ? 1 : 0;

                if (deferred) {
                    stats.deferredCount += 1;
                    stats.deferredAttempts += 1;
                    if (!gotSet) {
                        stats.deferredMade += 1;
                    }
                } else {
                    stats.nonDeferredAttempts += 1;
                    if (!gotSet) {
                        stats.nonDeferredMade += 1;
                    }
                }

                if (bid === 0) {
                    stats.zeroBids += 1;
                    if (!gotSet) {
                        stats.zeroBidsMade += 1;
                    }
                }

                if (confidenceIsMax) {
                    stats.clutchAttempts += 1;
                    if (!gotSet) {
                        stats.clutchMade += 1;
                    }
                }

                if (bid > 0 && round.handSize > 0) {
                    stats.positiveBidCount += 1;
                    stats.positiveBidFractionSum += bid / round.handSize;
                }

                stats.totalTax += tax;
                stats.highestRoundScore = Math.max(stats.highestRoundScore, score);
                stats.lowestRoundScore = Math.min(stats.lowestRoundScore, score);

                if (score >= 20) {
                    stats.rounds20Plus += 1;
                }
                if (score <= -10) {
                    stats.roundsNeg10 += 1;
                }

                if (idx === round.dealerIndex) {
                    stats.dealerRounds += 1;
                    stats.dealerScoreTotal += score;
                } else {
                    stats.nonDealerRounds += 1;
                    stats.nonDealerScoreTotal += score;
                }

                if (roundTrumpSuit) {
                    stats.suitScore[roundTrumpSuit] += score;
                    stats.suitCount[roundTrumpSuit] += 1;
                    globalSuitScore[roundTrumpSuit] += score;
                    globalSuitCount[roundTrumpSuit] += 1;
                }

                stats.reverseScore[roundReverse] += score;
                stats.reverseCount[roundReverse] += 1;
                globalReverseScore[roundReverse] += score;
                globalReverseCount[roundReverse] += 1;

                const highBidThreshold = Math.ceil((Number(round.handSize) || 0) / 2);
                if (highBidThreshold > 0 && bid >= highBidThreshold) {
                    const opponents = participants.filter(pidx => pidx !== idx);
                    const opponentsSet = opponents.reduce((count, pidx) => {
                        return count + (round.playerData[pidx]?.gotSet ? 1 : 0);
                    }, 0);

                    stats.highBidRounds += 1;
                    stats.highBidOppTotal += opponents.length;
                    stats.highBidOppSet += opponentsSet;
                }

                const streak = streaks.get(idx) || { made: 0, set: 0 };
                if (gotSet) {
                    streak.set += 1;
                    streak.made = 0;
                } else {
                    streak.made += 1;
                    streak.set = 0;
                }
                stats.bestMadeStreak = Math.max(stats.bestMadeStreak, streak.made);
                stats.worstSetStreak = Math.max(stats.worstSetStreak, streak.set);
                streaks.set(idx, streak);

                stats.chaosOpportunities += 1;
                if (isChaosRound) {
                    stats.chaosRounds += 1;
                }

                if (!gameRoundScoresByPlayer.has(idx)) {
                    gameRoundScoresByPlayer.set(idx, []);
                }
                gameRoundScoresByPlayer.get(idx).push(score);
            });

            highestSetsInRound = Math.max(highestSetsInRound, setCountThisRound);
            totalSetPointsAcrossRounds += setPointsThisRound;
        });

        highestSetsInGame = Math.max(highestSetsInGame, totalSetsThisGame);

        gameRoundScoresByPlayer.forEach((scores, idx) => {
            if (!scores.length || !game.players[idx]) {
                return;
            }

            const n = Math.min(3, scores.length);
            const first = getAverage(scores.slice(0, n));
            const last = getAverage(scores.slice(-n));

            const stats = getStats(game.players[idx].name);
            stats.momentumDiffSum += (last - first);
            stats.momentumGames += 1;
        });

        game.players.forEach((player, idx) => {
            const stats = getStats(player.name);
            const score = Number(player.score) || 0;
            const position = positionByPlayer[idx] || 1;
            const setsThisGame = gameSetCounts.get(idx) || 0;

            stats.games += 1;
            if (winnerSet.has(player.name)) {
                stats.wins += 1;
            }

            if (!winnerSet.has(player.name)) {
                if (position === 2) {
                    stats.second += 1;
                } else if (position === 3) {
                    stats.third += 1;
                }
            }

            const tableSize = String(game.players.length);
            if (!stats.finishByTableSize[tableSize]) {
                stats.finishByTableSize[tableSize] = { total: 0, count: 0 };
            }
            stats.finishByTableSize[tableSize].total += position;
            stats.finishByTableSize[tableSize].count += 1;

            stats.totalScore += score;
            stats.bestGame = Math.max(stats.bestGame, score);
            stats.worstGame = Math.min(stats.worstGame, score);
            stats.maxSetsInGame = Math.max(stats.maxSetsInGame, setsThisGame);
        });

        for (let i = 0; i < game.players.length; i++) {
            for (let j = i + 1; j < game.players.length; j++) {
                const playerA = game.players[i]?.name;
                const playerB = game.players[j]?.name;
                if (!playerA || !playerB) continue;

                const a = playerA < playerB ? playerA : playerB;
                const b = playerA < playerB ? playerB : playerA;
                const key = `${a}||${b}`;

                if (!rivalryMap.has(key)) {
                    rivalryMap.set(key, { a, b, games: 0, aWins: 0, bWins: 0, ties: 0 });
                }

                const rivalry = rivalryMap.get(key);
                rivalry.games += 1;

                const indexA = game.players.findIndex(player => player.name === a);
                const indexB = game.players.findIndex(player => player.name === b);
                const scoreA = Number(finalScores[indexA]) || 0;
                const scoreB = Number(finalScores[indexB]) || 0;

                if (scoreA > scoreB) {
                    rivalry.aWins += 1;
                } else if (scoreB > scoreA) {
                    rivalry.bWins += 1;
                } else {
                    rivalry.ties += 1;
                }
            }
        }
    });

    const players = Array.from(playerMap.values()).map((stats) => {
        const avgGame = stats.games ? (stats.totalScore / stats.games) : 0;
        const winRate = stats.games ? (stats.wins / stats.games) * 100 : 0;
        const top3Rate = stats.games ? ((stats.wins + stats.second + stats.third) / stats.games) * 100 : 0;
        const madeRate = (stats.made + stats.set) ? (stats.made / (stats.made + stats.set)) * 100 : 0;
        const setRate = (stats.made + stats.set) ? (stats.set / (stats.made + stats.set)) * 100 : 0;
        const deferredRate = stats.rounds ? (stats.deferredCount / stats.rounds) * 100 : 0;
        const zeroBidMakeRate = stats.zeroBids ? (stats.zeroBidsMade / stats.zeroBids) * 100 : 0;
        const clutchRate = stats.clutchAttempts ? (stats.clutchMade / stats.clutchAttempts) * 100 : 0;
        const greedIndex = stats.positiveBidCount ? (stats.positiveBidFractionSum / stats.positiveBidCount) : 0;
        const avgTaxPerGame = stats.games ? (stats.totalTax / stats.games) : 0;
        const avgTaxPerRound = stats.rounds ? (stats.totalTax / stats.rounds) : 0;
        const deferredMadeRate = stats.deferredAttempts ? (stats.deferredMade / stats.deferredAttempts) * 100 : 0;
        const nonDeferredMadeRate = stats.nonDeferredAttempts ? (stats.nonDeferredMade / stats.nonDeferredAttempts) * 100 : 0;
        const dealerAvg = stats.dealerRounds ? (stats.dealerScoreTotal / stats.dealerRounds) : 0;
        const nonDealerAvg = stats.nonDealerRounds ? (stats.nonDealerScoreTotal / stats.nonDealerRounds) : 0;
        const dealerEdge = dealerAvg - nonDealerAvg;
        const setHunterRate = stats.highBidOppTotal ? (stats.highBidOppSet / stats.highBidOppTotal) * 100 : 0;
        const boomBustStdDev = stats.rounds
            ? Math.sqrt(Math.max(0, (stats.roundScoreSumSquares / stats.rounds) - Math.pow(stats.totalRoundScore / stats.rounds, 2)))
            : 0;
        const zeroBidAttemptRate = stats.rounds ? (stats.zeroBids / stats.rounds) * 100 : 0;
        const momentumDelta = stats.momentumGames ? (stats.momentumDiffSum / stats.momentumGames) : 0;
        const chaosRate = stats.chaosOpportunities ? (stats.chaosRounds / stats.chaosOpportunities) * 100 : 0;
        const exactBlockRate = stats.dealerRounds ? (stats.exactBlockRounds / stats.dealerRounds) * 100 : 0;

        const suitAverages = suitKeys.map((suit) => {
            const count = stats.suitCount[suit] || 0;
            return {
                suit,
                count,
                avg: count ? (stats.suitScore[suit] / count) : Number.NEGATIVE_INFINITY
            };
        });
        const bestSuit = suitAverages
            .filter(entry => entry.count > 0)
            .sort((a, b) => b.avg - a.avg)[0] || null;

        const reverseAverages = ['R', 'N'].map((value) => {
            const count = stats.reverseCount[value] || 0;
            return {
                value,
                count,
                avg: count ? (stats.reverseScore[value] / count) : Number.NEGATIVE_INFINITY
            };
        });
        const bestReverse = reverseAverages
            .filter(entry => entry.count > 0)
            .sort((a, b) => b.avg - a.avg)[0] || null;

        const finishBySizeEntries = Object.entries(stats.finishByTableSize)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([size, detail]) => {
                const avg = detail.count ? (detail.total / detail.count) : 0;
                return `${size}p:${avg.toFixed(2)}`;
            });

        const finishTotals = Object.values(stats.finishByTableSize).reduce((acc, detail) => {
            acc.total += detail.total;
            acc.count += detail.count;
            return acc;
        }, { total: 0, count: 0 });
        const avgFinish = finishTotals.count ? (finishTotals.total / finishTotals.count) : 0;

        return {
            ...stats,
            avgGame,
            winRate,
            top3Rate,
            madeRate,
            setRate,
            deferredRate,
            zeroBidMakeRate,
            clutchRate,
            greedIndex,
            avgTaxPerGame,
            avgTaxPerRound,
            deferredMadeRate,
            nonDeferredMadeRate,
            dealerAvg,
            nonDealerAvg,
            dealerEdge,
            setHunterRate,
            boomBustStdDev,
            zeroBidAttemptRate,
            momentumDelta,
            chaosRate,
            exactBlockRate,
            avgFinish,
            finishBySizeLabel: finishBySizeEntries.join(' | ') || 'n/a',
            bestSuit,
            bestReverse,
            avgRound: stats.rounds ? (stats.totalRoundScore / stats.rounds) : 0,
            highestRoundScore: Number.isFinite(stats.highestRoundScore) ? stats.highestRoundScore : 0,
            lowestRoundScore: Number.isFinite(stats.lowestRoundScore) ? stats.lowestRoundScore : 0,
            bestGame: Number.isFinite(stats.bestGame) ? stats.bestGame : 0,
            worstGame: Number.isFinite(stats.worstGame) ? stats.worstGame : 0
        };
    }).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.avgGame !== a.avgGame) return b.avgGame - a.avgGame;
        return a.name.localeCompare(b.name);
    });

    const rivalries = Array.from(rivalryMap.values()).map((entry) => {
        const decisiveGames = entry.games - entry.ties;
        const aWinRate = decisiveGames ? (entry.aWins / decisiveGames) * 100 : 0;
        const bWinRate = decisiveGames ? (entry.bWins / decisiveGames) * 100 : 0;

        return {
            ...entry,
            decisiveGames,
            aWinRate,
            bWinRate,
            leader: entry.aWins === entry.bWins
                ? 'Tied'
                : (entry.aWins > entry.bWins ? entry.a : entry.b)
        };
    }).sort((a, b) => {
        if (b.games !== a.games) return b.games - a.games;
        const aGap = Math.abs(a.aWins - a.bWins);
        const bGap = Math.abs(b.aWins - b.bWins);
        return bGap - aGap;
    });

    const globalSuitAverages = suitKeys.map((suit) => {
        const count = globalSuitCount[suit] || 0;
        return {
            suit,
            count,
            avg: count ? (globalSuitScore[suit] / count) : 0
        };
    });

    const globalReverseAverages = ['R', 'N'].map((value) => {
        const count = globalReverseCount[value] || 0;
        return {
            value,
            count,
            avg: count ? (globalReverseScore[value] / count) : 0
        };
    });

    return {
        games,
        players,
        rivalries,
        summary: {
            totalGames: games.length,
            uniquePlayers: players.length,
            avgRoundsPerGame: games.length ? (totalScoredRoundsAcrossGames / games.length) : 0,
            avgPlayersPerGame: games.length ? (totalPlayersAcrossGames / games.length) : 0,
            avgWinningMargin: gamesWithWinningMargin ? (totalWinningMargin / gamesWithWinningMargin) : 0,
            avgSetPointsPerRound: totalScoredRounds ? (totalSetPointsAcrossRounds / totalScoredRounds) : 0,
            globalSetRate: totalRoundOutcomes ? (totalSetOutcomes / totalRoundOutcomes) * 100 : 0,
            globalAvgPointsPerRound: totalRoundOutcomes ? (totalRoundPoints / totalRoundOutcomes) : 0,
            avgExactBidBlocksPerGame: games.length ? (totalExactBidBlocks / games.length) : 0,
            chaosRoundRate: totalScoredRounds ? (totalChaosRounds / totalScoredRounds) * 100 : 0,
            highestSetsInGame,
            highestSetsInRound,
            totalExactBidBlocks,
            totalChaosRounds,
            globalSuitAverages,
            globalReverseAverages
        }
    };
}

function formatStatNumber(value, digits = 1) {
    return Number(value).toFixed(digits);
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderTooltipLabel(label, description) {
    return `<span class="stat-tooltip" tabindex="0" data-tooltip="${escapeHtml(description)}">${escapeHtml(label)}</span>`;
}

function renderStatsContent(allGames) {
    const content = document.getElementById('statsContent');
    const deduped = dedupeHistoryGames(allGames);
    const { players, summary, rivalries } = analyzeHistoryGames(deduped);
    const historySourceUrl = getHistorySourceUrl();
    const statDescriptions = {
        games: 'Number of deduped history game files included in analysis.',
        uniquePlayers: 'Number of distinct player names across all analyzed games.',
        avgRoundsPerGame: 'Total scored rounds divided by total games.',
        avgPlayersPerGame: 'Total player entries divided by total games.',
        avgWinningMargin: 'Winner score minus runner-up score, averaged across games with at least two players.',
        avgSetPointsPerRound: 'Sum of all got-set scores in each round, averaged across scored rounds.',
        globalSetRate: 'Got-set outcomes divided by all scored player outcomes.',
        globalAvgPointsPerRound: 'Total player round points divided by all scored player outcomes.',
        exactBlocksPerGame: 'Average number of rounds per game where the dealer was blocked from bidding zero.',
        chaosRoundRate: 'Share of scored rounds where the round score spread is at least 25 points.',
        highestSetsInGame: 'Largest total number of got-set outcomes recorded across all rounds of a single game.',
        highestSetsInRound: 'Largest number of players who got set in the same scored round.',
        bestGlobalSuit: 'Trump suit with the highest average round score across all analyzed player outcomes.',
        bestGlobalReverse: 'Reverse mode with the highest average round score across all analyzed player outcomes.',
        clutchRate: 'MAX-confidence made divided by MAX-confidence attempts.',
        greedIndex: 'Average of bid divided by hand size, using positive bids only.',
        taxBurden: 'Total tax paid. The player shown paid the most total tax.',
        deferredSpecialist: 'Made-rate on deferred rounds. This highlights who performs best after deferring.',
        dealerEdge: 'Average score as dealer minus average score as non-dealer.',
        suitMastery: 'Best average score for a player under any trump suit, requiring at least 3 rounds in that suit.',
        setHunter: 'Opponent got-set rate in rounds where the player bid at least half the hand size.',
        setMagnet: 'Set rate: got-set rounds divided by all resolved rounds.',
        comebackWins: 'Wins where the player was outside the top 2 at the halfway checkpoint.',
        chokeRate: 'Share of games where the player led at the 70% checkpoint but did not win.',
        hotHand: 'Longest consecutive streak of rounds without getting set.',
        disasterStreak: 'Longest consecutive streak of got-set rounds.',
        boomBust: 'Standard deviation of round scores. Higher means more volatility.',
        peakRound: 'Highest single-round score recorded for a player.',
        floorRound: 'Lowest single-round score recorded for a player.',
        zeroBidPersonality: 'Zero-bid attempts divided by total rounds.',
        momentumFinish: 'Average of last up to 3 round scores minus average of first up to 3 round scores, then averaged per game.',
        rivalrySplit: 'Head-to-head record for a pair of players across games they both played.',
        tableImpact: 'Average final finishing position overall. Lower is better.',
        bidDiscipline: 'Share of rounds where the dealer was blocked from bidding zero.',
        chaosFactor: 'Share of rounds the player participated in that were chaos rounds.',
        rivalryPair: 'Two players who appeared in the same games.',
        rivalryGames: 'Number of games this pair played together.',
        rivalryRecord: 'Head-to-head record in the form A wins - B wins - ties.',
        rivalryLeader: 'Player currently ahead in the rivalry record, or Tied.',
        player: 'Player name.',
        wins: 'Games where the player finished with the top final score.',
        maxSetsInGame: 'Highest number of times this player got set in any single game.',
        second: 'Games where the player finished in 2nd place.',
        third: 'Games where the player finished in 3rd place.',
        winRate: 'Wins divided by games played.',
        top3Rate: 'Wins plus 2nd plus 3rd, divided by games played.',
        avgFinal: 'Average final score across games.',
        bestWorstGame: 'Highest and lowest final game score.',
        bidAccuracy: 'Rounds made divided by made plus set rounds.',
        setRate: 'Got-set rounds divided by made plus set rounds.',
        taxTotal: 'Total tax paid across all rounds.',
        taxPerRound: 'Average tax paid per round.',
        deferredMadeRate: 'Made-rate on deferred rounds.',
        nonDeferredMadeRate: 'Made-rate on non-deferred rounds.',
        setHunterRate: 'Opponent got-set rate in the player\'s high-bid rounds.',
        setMagnetRate: 'Same as Set Rate. Included in the table as a direct per-player percentage.',
        twentyPlusNegTen: 'Count of 20+ rounds and count of rounds at -10 or worse.',
        zeroBidTryRate: 'Zero-bid attempts divided by total rounds.',
        zeroBidSuccessRate: 'Successful zero bids divided by all zero-bid attempts.',
        bestSuit: 'Trump suit with the highest average score for this player.',
        bestReverse: 'Reverse mode with the highest average score for this player.',
        avgRound: 'Average score per round.',
        avgFinish: 'Average finishing position across games. Lower is better.',
        finishByTableSize: 'Average finishing position broken out by table size, such as 3p or 4p.',
        chaosRate: 'Share of rounds this player participated in that had a 25+ point spread.',
        exactBlockRate: 'Share of rounds where the dealer was blocked from bidding zero.'
    };

    function tip(label, key) {
        return renderTooltipLabel(label, statDescriptions[key] || label);
    }

    function pickLeader(metricSelector, predicate = null) {
        const candidates = predicate ? players.filter(predicate) : players;
        if (!candidates.length) return null;

        return [...candidates].sort((a, b) => {
            const av = metricSelector(a);
            const bv = metricSelector(b);
            if (bv !== av) return bv - av;
            return a.name.localeCompare(b.name);
        })[0];
    }

    function pickLowLeader(metricSelector, predicate = null) {
        const candidates = predicate ? players.filter(predicate) : players;
        if (!candidates.length) return null;

        return [...candidates].sort((a, b) => {
            const av = metricSelector(a);
            const bv = metricSelector(b);
            if (av !== bv) return av - bv;
            return a.name.localeCompare(b.name);
        })[0];
    }

    function formatLeader(leader, valueText) {
        if (!leader) return 'n/a';
        return `${escapeHtml(leader.name)} - ${valueText}`;
    }

    const bestClutch = pickLeader(p => p.clutchRate, p => p.clutchAttempts >= 3);
    const greediest = pickLeader(p => p.greedIndex, p => p.positiveBidCount >= 3);
    const taxKing = pickLeader(p => p.totalTax, p => p.totalTax > 0);
    const deferredSpecialist = pickLeader(p => p.deferredMadeRate, p => p.deferredAttempts >= 3);
    const dealerEdge = pickLeader(p => p.dealerEdge, p => p.dealerRounds >= 2 && p.nonDealerRounds >= 2);
    const suitMaster = pickLeader(
        p => (p.bestSuit && p.bestSuit.count >= 3 ? p.bestSuit.avg : Number.NEGATIVE_INFINITY),
        p => p.bestSuit && p.bestSuit.count >= 3
    );
    const setHunter = pickLeader(p => p.setHunterRate, p => p.highBidOppTotal >= 6);
    const setMagnet = pickLeader(p => p.setRate, p => p.rounds >= 5);
    const comebackHero = pickLeader(p => p.comebackWins, p => p.comebackWins > 0);
    const chokeLeader = pickLeader(
        p => (p.chokeOpportunities ? (p.chokeCount / p.chokeOpportunities) * 100 : 0),
        p => p.chokeOpportunities > 0
    );
    const hotHand = pickLeader(p => p.bestMadeStreak, p => p.bestMadeStreak > 0);
    const disasterStreak = pickLeader(p => p.worstSetStreak, p => p.worstSetStreak > 0);
    const boomBust = pickLeader(p => p.boomBustStdDev, p => p.rounds >= 5);
    const peakRound = pickLeader(p => p.highestRoundScore, p => p.rounds > 0);
    const floorRound = pickLowLeader(p => p.lowestRoundScore, p => p.rounds > 0);
    const zeroBidPersonality = pickLeader(p => p.zeroBidAttemptRate, p => p.rounds >= 5);
    const momentum = pickLeader(p => p.momentumDelta, p => p.momentumGames > 0);
    const tableImpact = pickLowLeader(p => p.avgFinish, p => p.games >= 3);
    const chaosFactor = pickLeader(p => p.chaosRate, p => p.chaosOpportunities >= 5);
    const mostSetsInGame = pickLeader(p => p.maxSetsInGame, p => p.maxSetsInGame > 0);
    const mostBlockedDealer = pickLeader(p => p.exactBlockRate, p => p.dealerRounds >= 3);

    const topRivalry = rivalries.length ? rivalries[0] : null;
    const topRivalryText = topRivalry
        ? `${escapeHtml(topRivalry.a)} ${topRivalry.aWins}-${topRivalry.bWins}-${topRivalry.ties} ${escapeHtml(topRivalry.b)}`
        : 'n/a';

    const bestGlobalSuit = [...summary.globalSuitAverages]
        .filter(item => item.count > 0)
        .sort((a, b) => b.avg - a.avg)[0] || null;
    const bestGlobalReverse = [...summary.globalReverseAverages]
        .filter(item => item.count > 0)
        .sort((a, b) => b.avg - a.avg)[0] || null;

    if (summary.totalGames === 0) {
        content.innerHTML = `
            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="refreshStats()">🔄 Retry Auto Extract</button>
                <button class="btn btn-primary" onclick="promptHistoryFolderImport()">📂 Manual Folder Pick (Fallback)</button>
            </div>
            <p style="color: #cbd5e1; line-height: 1.5;">
                No history game JSON files found yet.<br>
                Target local folder: <code>${LOCAL_HISTORY_FOLDER_PATH}</code>.<br>
                Automatic extract checks your configured GitHub history folder first, then tries scanning <code>history/</code> locally.<br>
                If your environment blocks folder scanning, use <strong>Manual Folder Pick (Fallback)</strong>.
            </p>
        `;
        return;
    }

    const statsTiles = [
        { label: 'Games',                  key: 'games',                   value: summary.totalGames },
        { label: 'Unique Players',          key: 'uniquePlayers',           value: summary.uniquePlayers },
        { label: 'Avg Rounds/Game',         key: 'avgRoundsPerGame',        value: formatStatNumber(summary.avgRoundsPerGame) },
        { label: 'Avg Players/Game',        key: 'avgPlayersPerGame',       value: formatStatNumber(summary.avgPlayersPerGame) },
        { label: 'Avg Winning Margin',      key: 'avgWinningMargin',        value: formatStatNumber(summary.avgWinningMargin) },
        { label: 'Avg Set Pts/Round',       key: 'avgSetPointsPerRound',    value: formatStatNumber(summary.avgSetPointsPerRound) },
        { label: 'Global Set %',            key: 'globalSetRate',           value: `${formatStatNumber(summary.globalSetRate)}%` },
        { label: 'Global Avg Pts/Round',    key: 'globalAvgPointsPerRound', value: formatStatNumber(summary.globalAvgPointsPerRound) },
        { label: 'Dealer Zero Blocks/Game', key: 'exactBlocksPerGame',      value: formatStatNumber(summary.avgExactBidBlocksPerGame) },
        { label: 'Chaos Round %',           key: 'chaosRoundRate',          value: `${formatStatNumber(summary.chaosRoundRate)}%` },
        { label: 'Most Sets In One Game',   key: 'highestSetsInGame',       value: summary.highestSetsInGame },
        { label: 'Most Sets In Round',      key: 'highestSetsInRound',      value: summary.highestSetsInRound },
        { label: 'Best Global Suit',        key: 'bestGlobalSuit',          value: bestGlobalSuit ? `${bestGlobalSuit.suit} (${formatStatNumber(bestGlobalSuit.avg)})` : 'n/a' },
        { label: 'Best Reverse Mode',       key: 'bestGlobalReverse',       value: bestGlobalReverse ? `${bestGlobalReverse.value} (${formatStatNumber(bestGlobalReverse.avg)})` : 'n/a' },
    ];

    content.innerHTML = `
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="refreshStats()">🔄 Refresh</button>
            <button class="btn btn-primary" onclick="promptHistoryFolderImport()">📂 Manual Folder Pick (Fallback)</button>
        </div>

        <div class="stats-summary-grid">
            ${statsTiles.map(({ label, key, value }) => `
                <div class="stats-tile">
                    <div class="stats-tile-label">${tip(label, key)}</div>
                    <div class="stats-tile-value">${value}</div>
                </div>`).join('')}
        </div>

        <h3 class="stats-section-title">Fun Leaders</h3>
        <div class="stats-mini-grid">
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Clutch Rate', 'clutchRate')}</div><div class="stats-mini-value">${formatLeader(bestClutch, bestClutch ? `${formatStatNumber(bestClutch.clutchRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Greed Index', 'greedIndex')}</div><div class="stats-mini-value">${formatLeader(greediest, greediest ? formatStatNumber(greediest.greedIndex, 2) : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Tax Burden (Total)', 'taxBurden')}</div><div class="stats-mini-value">${formatLeader(taxKing, taxKing ? `${taxKing.totalTax}` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Deferred Specialist', 'deferredSpecialist')}</div><div class="stats-mini-value">${formatLeader(deferredSpecialist, deferredSpecialist ? `${formatStatNumber(deferredSpecialist.deferredMadeRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Dealer Edge', 'dealerEdge')}</div><div class="stats-mini-value">${formatLeader(dealerEdge, dealerEdge ? formatStatNumber(dealerEdge.dealerEdge) : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Suit Mastery', 'suitMastery')}</div><div class="stats-mini-value">${suitMaster && suitMaster.bestSuit ? `${escapeHtml(suitMaster.name)} - ${suitMaster.bestSuit.suit} ${formatStatNumber(suitMaster.bestSuit.avg)}` : 'n/a'}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Set Hunter', 'setHunter')}</div><div class="stats-mini-value">${formatLeader(setHunter, setHunter ? `${formatStatNumber(setHunter.setHunterRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Set Magnet', 'setMagnet')}</div><div class="stats-mini-value">${formatLeader(setMagnet, setMagnet ? `${formatStatNumber(setMagnet.setRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Comeback Wins', 'comebackWins')}</div><div class="stats-mini-value">${formatLeader(comebackHero, comebackHero ? `${comebackHero.comebackWins}` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Choke Rate', 'chokeRate')}</div><div class="stats-mini-value">${chokeLeader ? `${escapeHtml(chokeLeader.name)} - ${formatStatNumber((chokeLeader.chokeCount / chokeLeader.chokeOpportunities) * 100)}%` : 'n/a'}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Hot Hand Streak', 'hotHand')}</div><div class="stats-mini-value">${formatLeader(hotHand, hotHand ? `${hotHand.bestMadeStreak}` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Disaster Streak', 'disasterStreak')}</div><div class="stats-mini-value">${formatLeader(disasterStreak, disasterStreak ? `${disasterStreak.worstSetStreak}` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Boom/Bust (StdDev)', 'boomBust')}</div><div class="stats-mini-value">${formatLeader(boomBust, boomBust ? formatStatNumber(boomBust.boomBustStdDev) : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Peak Round', 'peakRound')}</div><div class="stats-mini-value">${peakRound ? `${escapeHtml(peakRound.name)} - ${peakRound.highestRoundScore} (${peakRound.rounds20Plus}x 20+)` : 'n/a'}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Floor Round', 'floorRound')}</div><div class="stats-mini-value">${floorRound ? `${escapeHtml(floorRound.name)} - ${floorRound.lowestRoundScore} (${floorRound.roundsNeg10}x <=-10)` : 'n/a'}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Zero-Bid Personality', 'zeroBidPersonality')}</div><div class="stats-mini-value">${formatLeader(zeroBidPersonality, zeroBidPersonality ? `${formatStatNumber(zeroBidPersonality.zeroBidAttemptRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Momentum Finish', 'momentumFinish')}</div><div class="stats-mini-value">${formatLeader(momentum, momentum ? formatStatNumber(momentum.momentumDelta) : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Rivalry Split', 'rivalrySplit')}</div><div class="stats-mini-value">${topRivalryText}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Table Impact (Avg Finish)', 'tableImpact')}</div><div class="stats-mini-value">${tableImpact ? `${escapeHtml(tableImpact.name)} - ${formatStatNumber(tableImpact.avgFinish, 2)}` : 'n/a'}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Chaos Factor', 'chaosFactor')}</div><div class="stats-mini-value">${formatLeader(chaosFactor, chaosFactor ? `${formatStatNumber(chaosFactor.chaosRate)}%` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Player Max Sets/Game', 'maxSetsInGame')}</div><div class="stats-mini-value">${formatLeader(mostSetsInGame, mostSetsInGame ? `${mostSetsInGame.maxSetsInGame}` : 'n/a')}</div></div>
            <div class="stats-mini-card"><div class="stats-mini-label">${tip('Most Blocked Dealer', 'bidDiscipline')}</div><div class="stats-mini-value">${mostBlockedDealer ? `${escapeHtml(mostBlockedDealer.name)} - ${formatStatNumber(mostBlockedDealer.exactBlockRate)}% rounds` : 'n/a'}</div></div>
        </div>

        <h3 class="stats-section-title">Rivalries</h3>
        <div class="stats-table-wrap" style="margin-bottom: 1rem;">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>${tip('Pair', 'rivalryPair')}</th>
                        <th>${tip('Games', 'rivalryGames')}</th>
                        <th>${tip('Record', 'rivalryRecord')}</th>
                        <th>${tip('Leader', 'rivalryLeader')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${rivalries.slice(0, 12).map((rivalry) => `
                        <tr>
                            <td>${escapeHtml(rivalry.a)} vs ${escapeHtml(rivalry.b)}</td>
                            <td>${rivalry.games}</td>
                            <td>${rivalry.aWins}-${rivalry.bWins}-${rivalry.ties}</td>
                            <td>${escapeHtml(rivalry.leader)}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4">No rivalry data yet.</td></tr>'}
                </tbody>
            </table>
        </div>

        <div class="stats-table-wrap">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>${tip('Player', 'player')}</th>
                        <th>${tip('Games', 'games')}</th>
                        <th>${tip('Wins', 'wins')}</th>
                        <th>${tip('Max Sets/Game', 'maxSetsInGame')}</th>
                        <th>${tip('2nd', 'second')}</th>
                        <th>${tip('3rd', 'third')}</th>
                        <th>${tip('Win %', 'winRate')}</th>
                        <th>${tip('Top 3 %', 'top3Rate')}</th>
                        <th>${tip('Avg Final', 'avgFinal')}</th>
                        <th>${tip('Best/Worst Game', 'bestWorstGame')}</th>
                        <th>${tip('Bid Accuracy %', 'bidAccuracy')}</th>
                        <th>${tip('Set Rate', 'setRate')}</th>
                        <th>${tip('Clutch %', 'clutchRate')}</th>
                        <th>${tip('Greed', 'greedIndex')}</th>
                        <th>${tip('Tax Total', 'taxTotal')}</th>
                        <th>${tip('Tax/Round', 'taxPerRound')}</th>
                        <th>${tip('Def Made %', 'deferredMadeRate')}</th>
                        <th>${tip('Non-Def Made %', 'nonDeferredMadeRate')}</th>
                        <th>${tip('Dealer Edge', 'dealerEdge')}</th>
                        <th>${tip('Set Hunter %', 'setHunterRate')}</th>
                        <th>${tip('Set Magnet %', 'setMagnetRate')}</th>
                        <th>${tip('Comeback Wins', 'comebackWins')}</th>
                        <th>${tip('Choke %', 'chokeRate')}</th>
                        <th>${tip('Hot Hand', 'hotHand')}</th>
                        <th>${tip('Disaster', 'disasterStreak')}</th>
                        <th>${tip('Boom/Bust', 'boomBust')}</th>
                        <th>${tip('Peak/Floor Round', 'peakRound')}</th>
                        <th>${tip('20+ / <=-10', 'twentyPlusNegTen')}</th>
                        <th>${tip('Zero Bid Try %', 'zeroBidTryRate')}</th>
                        <th>${tip('Zero Bid Success %', 'zeroBidSuccessRate')}</th>
                        <th>${tip('Momentum', 'momentumFinish')}</th>
                        <th>${tip('Best Suit', 'bestSuit')}</th>
                        <th>${tip('Best Reverse', 'bestReverse')}</th>
                        <th>${tip('Avg Round', 'avgRound')}</th>
                        <th>${tip('Avg Finish', 'avgFinish')}</th>
                        <th>${tip('Finish by Table Size', 'finishByTableSize')}</th>
                        <th>${tip('Chaos %', 'chaosRate')}</th>
                        <th>${tip('Dealer Block %', 'exactBlockRate')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map((player) => `
                        <tr>
                            <td>${escapeHtml(player.name)}</td>
                            <td>${player.games}</td>
                            <td>${player.wins}</td>
                            <td>${player.maxSetsInGame}</td>
                            <td>${player.second}</td>
                            <td>${player.third}</td>
                            <td>${formatStatNumber(player.winRate)}%</td>
                            <td>${formatStatNumber(player.top3Rate)}%</td>
                            <td>${formatStatNumber(player.avgGame)}</td>
                            <td>${player.bestGame}/${player.worstGame}</td>
                            <td>${formatStatNumber(player.madeRate)}%</td>
                            <td>${formatStatNumber(player.setRate)}%</td>
                            <td>${player.clutchAttempts > 0 ? `${formatStatNumber(player.clutchRate)}%` : 'n/a'}</td>
                            <td>${player.positiveBidCount > 0 ? formatStatNumber(player.greedIndex, 2) : 'n/a'}</td>
                            <td>${player.totalTax}</td>
                            <td>${formatStatNumber(player.avgTaxPerRound, 2)}</td>
                            <td>${player.deferredAttempts > 0 ? `${formatStatNumber(player.deferredMadeRate)}%` : 'n/a'}</td>
                            <td>${player.nonDeferredAttempts > 0 ? `${formatStatNumber(player.nonDeferredMadeRate)}%` : 'n/a'}</td>
                            <td>${formatStatNumber(player.dealerEdge)}</td>
                            <td>${player.highBidOppTotal > 0 ? `${formatStatNumber(player.setHunterRate)}%` : 'n/a'}</td>
                            <td>${formatStatNumber(player.setRate)}%</td>
                            <td>${player.comebackWins}</td>
                            <td>${player.chokeOpportunities > 0 ? `${formatStatNumber((player.chokeCount / player.chokeOpportunities) * 100)}%` : 'n/a'}</td>
                            <td>${player.bestMadeStreak}</td>
                            <td>${player.worstSetStreak}</td>
                            <td>${formatStatNumber(player.boomBustStdDev)}</td>
                            <td>${player.highestRoundScore}/${player.lowestRoundScore}</td>
                            <td>${player.rounds20Plus}/${player.roundsNeg10}</td>
                            <td>${formatStatNumber(player.zeroBidAttemptRate)}%</td>
                            <td>${player.zeroBids > 0 ? `${formatStatNumber(player.zeroBidMakeRate)}%` : 'n/a'}</td>
                            <td>${player.momentumGames > 0 ? formatStatNumber(player.momentumDelta) : 'n/a'}</td>
                            <td>${player.bestSuit ? `${player.bestSuit.suit} ${formatStatNumber(player.bestSuit.avg)}` : 'n/a'}</td>
                            <td>${player.bestReverse ? `${player.bestReverse.value} ${formatStatNumber(player.bestReverse.avg)}` : 'n/a'}</td>
                            <td>${formatStatNumber(player.avgRound)}</td>
                            <td>${player.games > 0 ? formatStatNumber(player.avgFinish, 2) : 'n/a'}</td>
                            <td>${escapeHtml(player.finishBySizeLabel)}</td>
                            <td>${formatStatNumber(player.chaosRate)}%</td>
                            <td>${formatStatNumber(player.exactBlockRate)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <p class="stats-source-note">
            Source: <code>${escapeHtml(historySourceUrl)}</code>.
            Selected folder: <strong>${escapeHtml(selectedHistoryFolderLabel)}</strong>.
            Manual cache: ${manualHistoryGames.length} file(s).
        </p>
    `;
}

function handleHistoryFolderSelect(event) {
    const files = Array.from(event.target.files || []).filter(file => file.name.toLowerCase().endsWith('.json'));

    if (files.length === 0) {
        alert('No JSON files found in that selection.');
        return;
    }

    const readers = files.map(file => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const game = JSON.parse(e.target.result);
                resolve(isValidHistoryGame(game) ? game : null);
            } catch (error) {
                resolve(null);
            }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
    }));

    Promise.all(readers).then((loadedGames) => {
        const validGames = loadedGames.filter(Boolean);

        if (validGames.length === 0) {
            alert('No valid game JSON files were found in that folder.');
            return;
        }

        manualHistoryGames = dedupeHistoryGames([...manualHistoryGames, ...validGames]);

        const firstRelPath = files[0]?.webkitRelativePath || files[0]?.name || '';
        const folderName = firstRelPath.includes('/') ? firstRelPath.split('/')[0] : 'history';
        selectedHistoryFolderLabel = folderName;

        saveManualHistoryGames();
        refreshStats();
    });

    event.target.value = '';
}
