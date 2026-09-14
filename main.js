import { state } from './src/modules/state.js';
import { audioEngine } from './src/modules/audio.js';
import { initUI } from './src/modules/ui.js';
import { initAI } from './src/modules/ai.js';
import { renderer3D } from './src/modules/renderer3d.js';
import { events } from './src/modules/events.js';

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
    let isDev = false;
    try { isDev = import.meta.env && import.meta.env.DEV; } catch(e) {}
    if (isDev) {
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
    let botCount = parseInt(document.getElementById('lobby-bots')?.value || '2');
    
    // Ensure total players matches the number of bots + 1 human
    totalPlayers = Math.max(2, Math.min(6, botCount + 1));
    
    // Initialize UI with game instance
    initUI();
    
    // Initialize AI
    initAI();
    
    // START THE GAME LOOP
    state.init(playerName, totalPlayers);
    
    // Initialize 3D Renderer
    renderer3D.init();
    
    // Sync 3D renderer with game state
    syncRendererWithState();
    
    console.log('BLACK ROOM: System Online - 3D Renderer Active');
  }
}

// Sync 3D renderer with game state updates
function syncRendererWithState() {
  events.on('GAME_STARTED', () => {
    renderer3D.updatePlayers(state.players.map((p, i) => ({
      ...p,
      isActive: i === state.currentTurnIndex
    })));
  });
  
  events.on('ROUND_START', () => {
    renderer3D.updatePlayers(state.players.map((p, i) => ({
      ...p,
      isActive: i === state.currentTurnIndex
    })));
  });
  
  events.on('TURN_START', ({ player }) => {
    const playerIndex = state.players.findIndex(p => p.id === player.id);
    renderer3D.updatePlayers(state.players.map((p, i) => ({
      ...p,
      isActive: i === playerIndex
    })));
  });
  
  events.on('CARD_DRAWN', ({ player }) => {
    const playerObj = renderer3D.players.find(p => p.data && p.data.id === player.id);
    if (playerObj) {
      renderer3D.updateCards(playerObj, player.cards);
    }
  });
  
  events.on('WEAPON_FIRED', ({ target, isLive, bloodIntensity, distance }) => {
    // Animate revolver
    renderer3D.animateRevolver(true);
    
    // Shake camera based on distance
    const shakeIntensity = isLive ? (distance !== undefined ? distance * 0.3 : 0.2) : 0.05;
    renderer3D.shakeCamera(shakeIntensity);
    
    // Create blood particles if live round
    if (isLive && target) {
      const targetIndex = state.players.findIndex(p => p.id === target.id);
      if (targetIndex >= 0 && renderer3D.players[targetIndex]) {
        const targetPos = renderer3D.players[targetIndex].orb.position.clone();
        renderer3D.createBloodParticles(targetPos, bloodIntensity || 1);
      }
    }
  });
  
  events.on('PLAYER_BUST', ({ player, bloodIntensity }) => {
    const playerIndex = state.players.findIndex(p => p.id === player.id);
    if (playerIndex >= 0 && renderer3D.players[playerIndex]) {
      const playerPos = renderer3D.players[playerIndex].orb.position.clone();
      renderer3D.createBloodParticles(playerPos, bloodIntensity || 0.5);
    }
  });
  
  events.on('GAME_OVER', () => {
    // Final dramatic camera move
    renderer3D.setCameraAngle(Math.PI / 4);
  });
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
