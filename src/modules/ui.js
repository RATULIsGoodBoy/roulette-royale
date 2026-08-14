import { events } from './events.js';
import { state, calculateScore } from './state.js';
import { audio } from './audio.js';

export function initUI() {
  const playersContainer = document.getElementById('players-container');
  const logContainer = document.getElementById('log');
  const shellInfo = document.getElementById('shell-info');
  const roundInfo = document.getElementById('round-info');
  const flash = document.getElementById('muzzle-flash');

  // Listeners
  events.on('GAME_STARTED', render);
  events.on('GAME_RESTORED', render);
  events.on('ROUND_START', render);
  events.on('SHELLS_UPDATED', ({ total }) => {
    shellInfo.textContent = `Shells loaded: ${total}`;
  });

  events.on('TURN_START', ({ player }) => {
    log(`It's ${player.id}'s turn.`);
    render();
  });

  events.on('CARD_DRAWN', ({ player }) => {
    audio.playHeartbeat(0.5);
    render();
  });

  events.on('PLAYER_BUST', ({ player }) => {
    log(`${player.id} BUSTED!`);
    audio.playHeartbeat(1.5);
    shakeScreen();
    render();
  });

  events.on('PLAYER_STAND', ({ player }) => {
    log(`${player.id} chose to STAND.`);
    render();
  });

  events.on('WEAPON_FIRED', ({ target, isLive, dmg }) => {
    if (isLive) {
      log(`BANG! ${target.id} took ${dmg} damage!`);
      flashScreen();
      audio.playGunshot(true);
      shakeScreen();
    } else {
      log(`*Click* Blank. ${target.id} is safe.`);
      audio.playGunshot(false);
    }
    render();
  });

  events.on('GAME_OVER', ({ winner }) => {
    log(`GAME OVER! ${winner.id} SURVIVES!`);
    render();
  });

  function render() {
    roundInfo.textContent = `Round: ${state.round} | Phase: ${state.phase}`;
    playersContainer.innerHTML = '';
    
    state.players.forEach((p, index) => {
      const card = document.createElement('div');
      card.className = `player-card ${p.eliminated ? 'eliminated' : ''} ${index === state.currentTurnIndex && state.phase === 'TURN' ? 'active' : ''}`;
      
      const score = calculateScore(p.cards);
      
      card.innerHTML = `
        <h3>${p.id} ${p.isBot ? '(BOT)' : ''}</h3>
        <p>HP: ${'❤️'.repeat(Math.max(0, p.hp))}</p>
        <p>Score: ${score} ${p.busted ? '(BUST)' : ''} ${p.stood ? '(STAND)' : ''}</p>
        <div class="player-hand">
          ${p.cards.map(c => `<span class="card">${c}</span>`).join('')}
        </div>
        <div class="inventory">
          ${p.inventory.map(i => `<span class="item" style="font-size:0.8em; border: 1px solid #45f3ff; padding:2px;">${i}</span>`).join('')}
        </div>
      `;
      playersContainer.appendChild(card);
    });
  }

  function log(msg) {
    logContainer.textContent = msg;
    console.log(msg);
  }

  function flashScreen() {
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 50);
  }

  function shakeScreen() {
    document.body.style.transform = 'translate(5px, 5px)';
    setTimeout(() => document.body.style.transform = 'translate(-5px, -5px)', 50);
    setTimeout(() => document.body.style.transform = 'translate(5px, -5px)', 100);
    setTimeout(() => document.body.style.transform = 'translate(0, 0)', 150);
  }

  // Bind main buttons
  document.getElementById('btn-hit').addEventListener('click', () => {
    const activePlayer = state.players[state.currentTurnIndex];
    if (activePlayer && !activePlayer.isBot && state.phase === 'TURN') {
      state.playerHit(activePlayer.id);
    }
  });

  document.getElementById('btn-stand').addEventListener('click', () => {
    const activePlayer = state.players[state.currentTurnIndex];
    if (activePlayer && !activePlayer.isBot && state.phase === 'TURN') {
      state.playerStand(activePlayer.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    const activePlayer = state.players[state.currentTurnIndex];
    if (activePlayer && !activePlayer.isBot && state.phase === 'TURN') {
      if (e.key === ' ' || e.key === 'h' || e.key === 'H') {
        document.getElementById('btn-hit').click();
      } else if (e.key === 's' || e.key === 'S') {
        document.getElementById('btn-stand').click();
      }
    }
  });
}
