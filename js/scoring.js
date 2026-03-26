function getConfidenceValue(bid, confidence) {
    if (confidence === 'MAX') {
        return bid > 0 ? 10 : 5;
    }

    return parseInt(confidence) || 0;
}

function calculatePlayerRoundScore(round, pdata, gotSetOverride = pdata.gotSet) {
    const bid = pdata.bid;
    const tax = pdata.tax;
    const deferredPenalty = pdata.deferred ? 2 : 0;
    const confidenceValue = getConfidenceValue(bid, pdata.confidence);

    if (gotSetOverride) {
        return -confidenceValue - deferredPenalty - tax;
    }

    if (bid > 0) {
        return 10 + (bid * bid) + confidenceValue - deferredPenalty - tax;
    }

    const zeroBonus = getRoundParticipatingCount(round) <= 6 ? 10 : 5;
    return zeroBonus + round.handSize + confidenceValue - deferredPenalty - tax;
}

function calculateProjectedTotal(playerScore, predictedRoundScore, existingRoundScore = 0) {
    return playerScore - existingRoundScore + predictedRoundScore;
}
