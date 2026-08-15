import { events } from './events.js';
import { state, calculateScore } from './state.js';
import { audioEngine } from './audio.js';

export function initUI() {
  const playersContainer = document.getElementById('players-container');
  const logContainer = document.getElementById('log');
  const shellInfo = document.getElementById('shell-info');
  const roundInfo = document.getElementById('round-info');
  const flash = document.getElementById('muzzle-flash');
  const roundOverlay = document.getElementById('round-overlay');
  const roundTitle = document.getElementById('round-title');
  const roundSubtitle = document.getElementById('round-subtitle');
  const bloodSplash = document.getElementById('blood-splash');
  const gameOverModal = document.getElementById('game-over-modal');
  const gameOverTitle = document.getElementById('game-over-title');
  const gameOverReason = document.getElementById('game-over-reason');
  const btnRestart = document.getElementById('btn-restart');
  const btnMute = document.getElementById('btn-mute');
  const muteCheckbox = document.getElementById('mute-audio');

  let isMuted = false;

  // Mute toggle handlers
  function toggleMute() {
    isMuted = !isMuted;
    audioEngine.setMute(isMuted);
    btnMute.textContent = isMuted ? '🔇' : '🔊';
    if (muteCheckbox) muteCheckbox.checked = isMuted;
  }

  if (btnMute) btnMute.addEventListener('click', toggleMute);
  if (muteCheckbox) muteCheckbox.addEventListener('change', () => {
    isMuted = muteCheckbox.checked;
    audioEngine.setMute(isMuted);
    btnMute.textContent = isMuted ? '🔇' : '🔊';
  });

  if (btnRestart) btnRestart.addEventListener('click', () => {
    localStorage.removeItem('rouletteRoyaleSave');
    gameOverModal.classList.add('hidden');
    state.init(4, 2);
    events.emit('GAME_STARTED');
  });

  // Event Listeners
  events.on('GAME_STARTED', () => {
    render();
  });

  events.on('GAME_RESTORED', render);
  
  events.on('ROUND_START', ({ round, debt }) => {
    render();
    // Update debt display if exists
    const debtDisplay = document.getElementById('debt-display');
    if (debtDisplay && debt !== undefined) {
      debtDisplay.textContent = `$${debt.toLocaleString()}`;
    }
  });
  
  events.on('SHELLS_UPDATED', ({ total }) => {
    shellInfo.textContent = `Shells: ${total}`;
  });
  
  events.on('SHOW_ROUND_OVERLAY', ({ round, debt }) => {
    if (roundTitle) roundTitle.textContent = `ROUND ${round}`;
    if (roundSubtitle) roundSubtitle.textContent = debt !== undefined 
      ? `DEBT: $${debt.toLocaleString()} | COLLECTION IN PROGRESS...`
      : 'DEBT COLLECTION...';
    if (roundOverlay) {
      roundOverlay.classList.remove('hidden');
      setTimeout(() => roundOverlay.classList.add('hidden'), 2000);
    }
  });

  events.on('TURN_START', ({ player, panic }) => {
    log(`${player.id}'s turn.${panic ? ' [PANIC]' : ''}`);
    render();
  });

  events.on('CARD_DRAWN', ({ player }) => {
    audioEngine.playHeartbeat(0.5);
    render();
  });

  events.on('PLAYER_BUST', ({ player }) => {
    log(`${player.id} BUSTED! -1HP + BLIND FIRE`);
    audioEngine.playHeartbeat(1.5);
    shakeScreen('heavy');
    render();
  });

  events.on('PLAYER_STAND', ({ player }) => {
    log(`${player.id} STANDS.`);
    render();
  });

  events.on('WEAPON_FIRED', ({ target, isLive, dmg, shooterId, bloodIntensity, distance }) => {
    const shooter = state.players.find(p => p.id === shooterId);
    const targetIndex = state.players.findIndex(p => p.id === target?.id);
    const playerIndex = state.players.findIndex(p => !p.isBot);
    
    if (isLive) {
      // Use distance from event if available, otherwise calculate
      const audioDistance = distance !== undefined ? distance : (playerIndex >= 0 ? Math.abs(playerIndex - targetIndex) : 1);
      const volume = audioDistance <= 0.5 ? 1.0 : audioDistance <= 1 ? 0.8 : audioDistance <= 2 ? 0.5 : 0.3;
      
      log(`BANG! ${target?.id || 'Unknown'} took ${dmg} DMG!`);
      audioEngine.playGunshot(true, volume, audioDistance);
      flashScreen();
      shakeScreen('heavy');
      
      showBloodSplash(targetIndex, playerIndex, bloodIntensity || 0.5);
    } else {
      log(`*click* Blank.`);
      audioEngine.playGunshot(false, 0.5, 1.0);
    }
    render();
  });

  events.on('BLIND_FIRE', ({ player, isLive }) => {
    const playerIndex = state.players.findIndex(p => p.id === player.id);
    if (isLive) {
      log(`${player.id} blind fires SELF!`);
      audioEngine.playGunshot(true, 1.0, 1.0);
      flashScreen();
      shakeScreen('heavy');
      showBloodSplash(playerIndex, playerIndex, 1.0);
    } else {
      log(`${player.id} blind fires... blank.`);
      audioEngine.playGunshot(false, 0.3, 1.0);
    }
    render();
  });

  events.on('DEALER_TAUNT', ({ type }) => {
    audioEngine.playTaunt(type);
  });

  events.on('PLAYER_BUST', ({ player, bloodIntensity }) => {
    log(`${player.id} BUSTED! -1HP + BLIND FIRE`);
    audioEngine.playHeartbeat(1.5);
    shakeScreen('heavy');
    // Show light blood for bust warning
    const playerIndex = state.players.findIndex(p => p.id === player.id);
    showBloodSplash(playerIndex, playerIndex, bloodIntensity || 0.3);
    render();
  });

  events.on('GAME_OVER', ({ winner, victory, finalDebt }) => {
    const playerWon = victory || (winner && !winner.isBot);
    if (gameOverTitle) gameOverTitle.textContent = playerWon ? 'DEBT CLEARED' : 'YOU DIED';
    if (gameOverReason) gameOverReason.textContent = playerWon 
      ? `You survived the circle. $${finalDebt === 0 ? '0' : finalDebt.toLocaleString()} remaining.`
      : `The Dealer always wins. Final Debt: $${(finalDebt || 100000).toLocaleString()}`;
    if (gameOverModal) gameOverModal.classList.remove('hidden');
    log(`GAME OVER - ${playerWon ? 'VICTORY' : 'DEFEAT'}`);
    render();
  });

  function render() {
    roundInfo.textContent = `Round ${state.round} | ${state.phase}`;
    playersContainer.innerHTML = '';
    
    state.players.forEach((p, index) => {
      const card = document.createElement('div');
      card.className = `player-card ${p.eliminated ? 'eliminated' : ''} ${index === state.currentTurnIndex && state.phase === 'TURN' ? 'active' : ''}`;
      
      const score = calculateScore(p.cards);
      
      card.innerHTML = `
        <h3>${p.id} ${p.isBot ? '(BOT)' : ''}</h3>
        <p>HP: ${'❤️'.repeat(Math.max(0, p.hp)) || '💀'}</p>
        <p>Score: ${score} ${p.busted ? '(BUST)' : ''} ${p.stood ? '(STAND)' : ''}</p>
        <div class="player-hand">
          ${p.cards.map(c => `<span class="card">${c}</span>`).join('')}
        </div>
        <div class="inventory">
          ${p.inventory.map(i => `<span class="inventory-item">${i}</span>`).join('')}
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
    
    // Trigger compression glitch effect
    triggerCompressionGlitch();
  }
  
  function triggerCompressionGlitch() {
    let glitchEl = document.getElementById('compression-glitch');
    if (!glitchEl) {
      glitchEl = document.createElement('div');
      glitchEl.id = 'compression-glitch';
      glitchEl.className = 'compression-glitch';
      document.body.appendChild(glitchEl);
    }
    
    glitchEl.classList.remove('active');
    void glitchEl.offsetWidth; // force reflow
    glitchEl.classList.add('active');
    
    // Add chromatic aberration to body
    document.body.classList.add('damage-effect');
    setTimeout(() => document.body.classList.remove('damage-effect'), 300);
  }

  function shakeScreen(intensity = 'light') {
    document.body.classList.remove('shake-heavy', 'shake-light');
    void document.body.offsetWidth; // force reflow
    document.body.classList.add(intensity === 'heavy' ? 'shake-heavy' : 'shake-light');
    setTimeout(() => document.body.classList.remove('shake-heavy', 'shake-light'), 500);
  }

  function showBloodSplash(targetIndex, playerIndex, intensity = 0.5) {
    // Intensity controls opacity of blood
    const alpha = Math.max(0.3, Math.min(1.0, intensity));
    
    // Position blood based on target location relative to player
    let xPos = '50%';
    let yPos = '50%';
    if (playerIndex >= 0) {
      const diff = targetIndex - playerIndex;
      if (diff < 0) {
        xPos = '20%';      // Left side
        yPos = '40%';
      } else if (diff === 0) {
        xPos = '50%'; // Center (self)
        yPos = '50%';
      } else if (diff === 1) {
        xPos = '80%'; // Right neighbor
        yPos = '45%';
      } else {
        xPos = '90%';   // Far right
        yPos = '40%';
      }
    }
    
    // Set gradient with intensity-based opacity
    bloodSplash.style.background = `radial-gradient(ellipse at ${xPos} ${yPos}, rgba(255, 0, 60, ${alpha}) 0%, rgba(255, 0, 60, ${alpha * 0.4}) 40%, transparent 70%)`;
    bloodSplash.classList.remove('hidden');
    bloodSplash.classList.add('active');
    
    // Create blood drip particles
    createBloodDrips(xPos, yPos, intensity);
    
    setTimeout(() => {
      bloodSplash.classList.remove('active');
      bloodSplash.classList.add('hidden');
    }, 800);
  }
  
  function createBloodDrips(xPos, yPos, intensity) {
    const dripCount = Math.floor(intensity * 8) + 2;
    for (let i = 0; i < dripCount; i++) {
      const drip = document.createElement('div');
      drip.className = 'blood-drip';
      drip.style.left = `${parseFloat(xPos) + (Math.random() * 40 - 20)}%`;
      drip.style.animationDelay = `${Math.random() * 0.5}s`;
      drip.style.height = `${15 + Math.random() * 25}px`;
      bloodSplash.appendChild(drip);
      
      // Clean up drip after animation
      setTimeout(() => drip.remove(), 2000);
    }
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
    // Mute toggle with M key
    if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
  });
}
