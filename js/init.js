document.addEventListener('DOMContentLoaded', () => {
    loadSavedPlayers();
    updatePlayerInputs();
    setActiveView('setup');
    autoSyncPlayers(); // Auto-sync on load
    loadAutoSave(); // Try to load auto-saved game on startup
    loadManualHistoryGames();
    
document.getElementById('newPlayerName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    document.getElementById('savedPlayersList').addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-player-btn');
        if (!btn) return;
        removePlayer(btn.dataset.player);
    });
});

// Shrink header when scrolled down, expand when scrolled back up.
// Hysteresis (different add/remove thresholds) prevents jitter at the boundary.
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    const y = window.scrollY;
    if (!header.classList.contains('scrolled') && y > 80) {
        header.classList.add('scrolled');
    } else if (header.classList.contains('scrolled') && y < 40) {
        header.classList.remove('scrolled');
    }
}, { passive: true });

document.addEventListener('click', (e) => {
    if (!e.target.closest('.player-custom-select')) {
        document.querySelectorAll('.player-select-panel.open').forEach(p => p.classList.remove('open'));
    }
    if (!e.target.closest('.trump-custom-select')) {
        document.querySelectorAll('.trump-select-panel.open').forEach(p => p.classList.remove('open'));
    }
    if (!e.target.closest('.conf-custom-select')) {
        document.querySelectorAll('.conf-select-panel.open').forEach(p => p.classList.remove('open'));
    }
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
