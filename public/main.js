import { state } from './src/modules/state.js';
import { audioEngine } from './src/modules/audio.js';
import { initUI } from './src/modules/ui.js';
import { initAI } from './src/modules/ai.js';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const lobbyModal = document.getElementById('lobby-modal');
const btnEnter = document.getElementById('enter-casino-btn');
const app = document.getElementById('app');

let gameStarted = false;

// Boot Sequence
async function boot() {
  // Force reflow to ensure CSS transitions work
  if (loadingScreen) loadingScreen.offsetHeight;
  
  // Show loading screen for 1.5s
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Fade out loading screen
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 800));
    loadingScreen.classList.add('hidden');
    loadingScreen.style.display = 'none';
  }
  
  // Show lobby (audio gate) - ALWAYS show in production for user interaction
  if (lobbyModal) {
    lobbyModal.classList.remove('hidden');
    
    // Dev mode: auto-bypass after short delay for HMR workflow
    if (import.meta.env.DEV) {
      setTimeout(() => {
        if (lobbyModal && !lobbyModal.classList.contains('hidden')) {
          enterGame();
        }
      }, 500);
    }
  }
}

function enterGame() {
  if (gameStarted) return; // Prevent double initialization
  
  // Initialize Audio Context on user gesture (or dev auto)
  audioEngine.init();
  audioEngine.resume();
  
  // Hide lobby, show app
  if (lobbyModal) lobbyModal.classList.add('hidden');
  if (app) app.classList.remove('hidden');
  
  // Initialize game state if not restored
  if (!gameStarted) {
    gameStarted = true;
    
    // Read Lobby Settings
    const playerName = document.getElementById('lobby-name')?.value || 'Player 1';
    let totalPlayers = parseInt(document.getElementById('lobby-players')?.value || '4');
    let botCount = parseInt(document.getElementById('lobby-bots')?.value || '3');
    
    // Ensure total players matches the number of bots + 1 human
    totalPlayers = Math.max(2, Math.min(6, botCount + 1));
    
    // Initialize UI with game instance
    initUI();
    
    // Initialize AI
    initAI();
    
    // START THE GAME LOOP
    state.init(playerName, totalPlayers);
    
    console.log('BLACK ROOM: System Online');
  }
}

// Event Listeners
if (btnEnter) {
  btnEnter.addEventListener('click', enterGame, { once: true });
  btnEnter.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enterGame();
    }
  }, { once: true });
}

// Handle visibility changes (tab switching)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && gameStarted && audioEngine) {
    audioEngine.resume();
  }
});

// Start boot sequence when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
