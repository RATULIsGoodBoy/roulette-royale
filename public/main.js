import { audio } from './src/modules/audio.js';
import { state } from './src/modules/state.js';
import { events } from './src/modules/events.js';
import { initUI } from './src/modules/ui.js';

// Bootstrapping the application
document.addEventListener('DOMContentLoaded', () => {
  const btnEnter = document.getElementById('btn-enter');
  const modal = document.getElementById('lobby-modal');
  const app = document.getElementById('app');

  initUI();

  // Dev bypass
  if (import.meta.env && import.meta.env.DEV) {
    console.log('[DEV] Bypassing Audio Gate');
    audio.resume();
    modal.classList.add('hidden');
    app.classList.remove('hidden');
    startGame();
  } else {
    // Prod gate
    btnEnter.addEventListener('click', async () => {
      await audio.resume();
      modal.classList.add('hidden');
      app.classList.remove('hidden');
      startGame();
    });
  }
});

function startGame() {
  // Check for saved state
  if (state.loadState()) {
    console.log('Restored state from localStorage');
    events.emit('GAME_RESTORED');
    state.checkTurn();
  } else {
    state.init(4, 2);
    events.emit('GAME_STARTED');
  }
}

