let gameState = {
    players: [],
    rounds: [],
    currentRound: 0,
    startingHandSize: 10,
    gameId: null,
    createdAt: null
};

const DEFAULT_SYNC_URL = 'https://raw.githubusercontent.com/rickytann14/Oh-Hell/main/oh-hell-players.json';
const DEFAULT_HISTORY_SOURCE_URL = 'https://github.com/rickytann14/Oh-Hell/tree/main/history';
const TRUMP_RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];
const TRUMP_SUITS = ['♠', '♥', '♦', '♣'];
const REVERSE_VALUE = ['R', 'N']; // R for Reverse, N for Normal
const MANUAL_HISTORY_STORAGE_KEY = 'ohHellManualHistoryGames';
const HISTORY_SOURCE_URL_STORAGE_KEY = 'ohHellHistorySourceUrl';
const README_URL = 'https://github.com/rickytann14/Oh-Hell?tab=readme-ov-file#oh-hell-scorekeeper';

let manualHistoryGames = [];
let selectedHistoryFolderLabel = 'Not selected';
let currentView = 'setup';

let editingRoundIndex = null;
let selectedPlayerIndex = null;
