import { events } from './events.js';

export function calculateScore(cards) {
  let score = 0;
  let aces = 0;
  for (const card of cards) {
    if (card === 'A') {
      aces += 1;
      score += 11;
    } else if (['J', 'Q', 'K'].includes(card)) {
      score += 10;
    } else {
      score += parseInt(card, 10);
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

export class GameState {
  constructor() {
    this.players = [];
    this.shells = [];
    this.round = 1;
    this.currentTurnIndex = 0;
    this.phase = 'LOBBY';
    this.deck = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    this.itemDeck = ['Magnifier', 'Cylinder Spin', 'Inverter', 'Saw', 'Handcuffs', 'Beer', 'Kevlar'];
    this.debt = 100000;
    this.lastVictimIndex = -1;
  }

  init(playerName = 'Player 1', totalPlayers = 4, startingHP = 2) {
    this.debt = 100000;
    this.players = Array.from({ length: totalPlayers }, (_, i) => ({
      id: i === 0 ? playerName : `Bot ${i}`,
      isBot: i > 0,
      hp: startingHP,
      maxHp: startingHP,
      cards: [],
      inventory: [],
      stood: false,
      busted: false,
      eliminated: false,
      handcuffed: false,
      armor: false,
      sawed: false,
      panic: false,
      personality: i === 1 ? 'AGGRESSIVE' : i === 2 ? 'TACTICAL' : 'CAUTIOUS'
    }));
    this.round = 1;
    this.phase = 'DEAL';
    this.lastVictimIndex = -1;
    this.initialized = true;
    this.generateShells();
    this.startRound();
  }

  generateShells(liveCount = 2, blankCount = 2) {
    const pool = [];
    for (let i=0; i<liveCount; i++) pool.push('LIVE');
    for (let i=0; i<blankCount; i++) pool.push('BLANK');
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.shells = pool;
    events.emit('SHELLS_UPDATED', { total: this.shells.length });
  }

  startRound() {
    this.phase = 'DEAL';
    this.lastVictimIndex = -1;
    this.players.forEach(p => {
      if (p.eliminated) return;
      p.cards = [];
      p.stood = false;
      p.busted = false;
      p.handcuffed = false;
      p.armor = false;
      p.sawed = false;
      p.panic = p.hp <= 2;
      p.inventory = [this.getRandomItem(), this.getRandomItem()];
      p.cards.push(this.getRandomCard(), this.getRandomCard());
    });
    this.currentTurnIndex = 0;
    this.phase = 'TURN';
    events.emit('ROUND_START', { round: this.round, debt: this.debt });
    events.emit('SHOW_ROUND_OVERLAY', { round: this.round, debt: this.debt });
    events.emit('DEALER_TAUNT', { type: 'warning' });
    this.saveState();
    setTimeout(() => this.checkTurn(), 2000);
  }

  getRandomCard() {
    return this.deck[Math.floor(Math.random() * this.deck.length)];
  }

  getRandomItem() {
    return this.itemDeck[Math.floor(Math.random() * this.itemDeck.length)];
  }

  fireWeapon(targetId, shooterId = null) {
    if (this.shells.length === 0) {
      events.emit('RELOAD');
      this.generateShells();
    }
    const isLive = this.shells.shift() === 'LIVE';
    const target = this.players.find(p => p.id === targetId);
    const targetIndex = this.players.indexOf(target);
    const shooter = shooterId ? this.players.find(p => p.id === shooterId) : null;
    this.lastVictimIndex = targetIndex;
    
    let dmg = isLive ? 1 : 0;
    
    if (target) {
      if (isLive && target.armor) {
        dmg = 0;
        target.armor = false;
        events.emit('ARMOR_BLOCK', { target });
      } else if (isLive && shooter && shooter.sawed) {
        dmg *= 2;
        shooter.sawed = false;
      }
      
      target.hp -= dmg;
      if (target.hp <= 0) target.eliminated = true;
      
      // Dealer taunt on kill
      if (target.eliminated) {
        setTimeout(() => events.emit('DEALER_TAUNT', { type: 'death' }), 300);
        if (target.id !== 'Player 1') {
          setTimeout(() => events.emit('DEALER_TAUNT', { type: 'laugh' }), 800);
        }
      }
      
      // Calculate distance for audio
      const shooterIdx = shooterId ? this.players.findIndex(p => p.id === shooterId) : -1;
      const distance = shooterIdx !== -1 
        ? 1.0 - (Math.abs(shooterIdx - targetIndex) / this.players.length) * 0.7
        : 1.0;
      
      events.emit('WEAPON_FIRED', { 
        target, 
        isLive, 
        dmg, 
        shooterId, 
        bloodIntensity: this.getBloodIntensity(0),
        distance 
      });
      
      // Dealer taunt on kill (removed - now handled in fireWeapon)
    } else {
      events.emit('WEAPON_FIRED', { target: null, isLive, dmg: 0, shooterId, distance: 1.0 });
    }
    
    events.emit('SHELLS_UPDATED', { total: this.shells.length });
    return isLive;
  }

  getBloodIntensity(observerId) {
    if (this.lastVictimIndex === -1) return 0;
    if (observerId === this.lastVictimIndex) return 1.0;
    const totalPlayers = this.players.length;
    const dist = Math.abs(observerId - this.lastVictimIndex);
    const normalizedDist = Math.min(dist, totalPlayers - dist);
    if (normalizedDist === 0) return 1.0;
    if (normalizedDist === 1) return 0.7;
    return 0.3;
  }

  getActivePlayers() {
    return this.players.filter(p => !p.eliminated);
  }

  checkTurn() {
    if (this.phase !== 'TURN') return;
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.phase = 'END';
      const winner = active[0] || this.players.find(p => !p.eliminated);
      events.emit('GAME_OVER', { winner });
      return;
    }

    if (active.every(p => p.stood || p.busted)) {
      this.phase = 'SHOWDOWN';
      this.evaluateShowdown();
      return;
    }

    let p = this.players[this.currentTurnIndex];
    while (p.eliminated || p.stood || p.busted) {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      p = this.players[this.currentTurnIndex];
    }

    if (p.handcuffed) {
      p.handcuffed = false;
      events.emit('SKIPPED_TURN', { player: p });
      this.nextTurn();
      return;
    }

    events.emit('TURN_START', { player: p });
    
    if (p.isBot) {
      events.emit('BOT_TURN', { player: p });
    }
  }

  nextTurn() {
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
    this.saveState();
    this.checkTurn();
  }

  playerHit(playerId) {
    if (this.phase !== 'TURN') return;
    const p = this.players.find(p => p.id === playerId);
    if (!p || p.stood || p.busted) return;

    p.cards.push(this.getRandomCard());
    events.emit('CARD_DRAWN', { player: p });
    
    const score = calculateScore(p.cards);
    if (score > 21) {
      p.busted = true;
      p.hp -= 1;
      this.lastVictimIndex = this.players.indexOf(p); // Track for blood
      events.emit('PLAYER_BUST', { player: p, bloodIntensity: this.getBloodIntensity(0) });
      const isLive = this.fireWeapon(p.id);
      events.emit('BLIND_FIRE', { player: p, isLive });
    }
    this.nextTurn();
  }

  playerStand(playerId) {
    if (this.phase !== 'TURN') return;
    const p = this.players.find(p => p.id === playerId);
    if (p) {
      p.stood = true;
      events.emit('PLAYER_STAND', { player: p });
      this.nextTurn();
    }
  }

  evaluateShowdown() {
    events.emit('SHOWDOWN_START');
    
    let standers = this.getActivePlayers().filter(p => p.stood && !p.busted);
    
    if (standers.length === 0) {
      this.endRound();
      return;
    }
    
    standers.sort((a, b) => calculateScore(b.cards) - calculateScore(a.cards));

    const highest = standers[0];
    const lowest = standers[standers.length - 1];

    if (highest.id === lowest.id) {
       this.endRound();
       return;
    }

    if (calculateScore(highest.cards) === calculateScore(lowest.cards)) {
      events.emit('SUDDEN_DEATH', { p1: highest, p2: lowest });
      this.fireWeapon(highest.id);
      this.fireWeapon(lowest.id);
    } else {
      events.emit('CASCADE_SHOOT', { shooter: highest, target: lowest });
      this.fireWeapon(lowest.id, highest.id);
      
      events.emit('CASCADE_SELF', { shooter: lowest });
      const isLive = this.fireWeapon(lowest.id);
      if (!isLive && !lowest.eliminated) {
        lowest.inventory.push(this.getRandomItem());
        events.emit('BLANK_SURVIVAL_REWARD', { player: lowest });
      }
    }
    console.log('[SHOWDOWN] Scheduling endRound in 1.5s...');
    setTimeout(() => {
      console.log('[SHOWDOWN] endRound firing now');
      this.endRound();
    }, 1500);
  }

  endRound() {
    console.log('[endRound] phase:', this.phase, 'round:', this.round);
    if (this.phase === 'END') return;
    
    // Check for human death first
    const human = this.players[0];
    if (human.eliminated) {
      this.debt += 50000; // Penalty debt
      this.phase = 'END';
      events.emit('GAME_OVER', { victory: false, finalDebt: this.debt });
      return;
    }
    
    // Debt reduction
    this.debt = Math.max(0, this.debt - 10000);
    
    if (this.debt === 0) {
      this.phase = 'END';
      events.emit('GAME_OVER', { victory: true, finalDebt: 0 });
      return;
    }
    
    this.round += 1;
    const active = this.getActivePlayers();
    console.log('[endRound] active players:', active.length, 'advancing to round', this.round);
    if (active.length > 1) {
      this.startRound();
    } else if (active.length === 1) {
      this.phase = 'END';
      events.emit('GAME_OVER', { winner: active[0], victory: true, finalDebt: this.debt });
    } else {
      // Edge case: all eliminated
      this.phase = 'END';
      events.emit('GAME_OVER', { victory: false, finalDebt: this.debt });
    }
  }

  getSerializableState() {
    return {
      players: this.players.map(p => ({ ...p })),
      shells: [...this.shells],
      round: this.round,
      currentTurnIndex: this.currentTurnIndex,
      phase: this.phase
    };
  }

  saveState() {
    localStorage.setItem('rouletteRoyaleSave', JSON.stringify(this.getSerializableState()));
  }

  loadState() {
    const saved = localStorage.getItem('rouletteRoyaleSave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.players = data.players;
        this.shells = data.shells;
        this.round = data.round;
        this.currentTurnIndex = data.currentTurnIndex;
        this.phase = data.phase;
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}

export const state = new GameState();
