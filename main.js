import { state } from './src/modules/state.js';
import { audio } from './src/modules/audio.js';
import { events } from './src/modules/events.js';
import { initUI } from './src/modules/ui.js';
import { initAI } from './src/modules/ai.js';

// DOM Elements
const loadingScreen = document.getElementById('loading-screen');
const lobbyModal = document.getElementById('lobby-modal');
const btnEnter = document.getElementById('btn-enter');
const app = document.getElementById('app');

// Boot Sequence
async function boot() {
  // Show loading screen for 1.5s
  await new Promise(resolve => setTimeout(resolve, 1500));
  loadingScreen.classList.add('hidden');
  
  // Check for saved game
  const hasSave = state.loadState();
  
  if (hasSave && state.phase !== 'LOBBY') {
    // Restore game directly
    app.classList.remove('hidden');
    audio.resume();
    events.emit('GAME_RESTORED');
  } else {
    // Show lobby (audio gate)
    lobbyModal.classList.remove('hidden');
    
    // Dev mode: auto-bypass after short delay
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
  audio.resume();
  lobbyModal.classList.add('hidden');
  app.classList.remove('hidden');
  
  if (!state.players.length) {
    state.init(4, 2);
  }
  
  events.emit('GAME_STARTED');
}

// Event Listeners
if (btnEnter) {
  btnEnter.addEventListener('click', enterGame);
  btnEnter.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      enterGame();
    }
  });
}

// Initialize systems
initUI();
initAI();

// Start boot sequence
boot();
