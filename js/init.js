document.addEventListener('DOMContentLoaded', () => {
    loadSavedPlayers();
    updatePlayerInputs();
    setActiveView('setup');
    autoSyncPlayers(); // Auto-sync on load
    loadAutoSave(); // Try to load auto-saved game on startup
    loadManualHistoryGames();
    
    document.getElementById('numPlayers').addEventListener('change', updatePlayerInputs);
    document.getElementById('newPlayerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

(function () {
    function positionTooltip(tip) {
        const modal = document.getElementById('statsModal');
        const modalContent = modal && modal.querySelector('.modal-content');
        if (!modalContent) return;
        const tipRect = tip.getBoundingClientRect();
        const modalRect = modalContent.getBoundingClientRect();
        const tooltipMaxWidth = 260;
        tip.classList.toggle('flip-right', tipRect.left + tooltipMaxWidth > modalRect.right);
    }

    document.getElementById('statsModal').addEventListener('mouseenter', function (e) {
        const tip = e.target.closest('.stat-tooltip');
        if (tip) positionTooltip(tip);
    }, true);

    document.getElementById('statsModal').addEventListener('touchstart', function (e) {
        const tip = e.target.closest('.stat-tooltip');
        if (tip) positionTooltip(tip);
    }, { capture: true, passive: true });
})();
