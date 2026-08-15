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
    this.phase = 'LOBBY'; // LOBBY, DEAL, TURN, SHOWDOWN, END
    this.deck = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
    this.itemDeck = ['Magnifier', 'Cylinder Spin', 'Inverter', 'Saw', 'Handcuffs', 'Beer', 'Kevlar'];
  }

  init(playerCount = 4, startingHP = 2) {
    this.players = Array.from({ length: playerCount }, (_, i) => ({
      id: i === 0 ? 'Player 1' : `Bot ${i}`,
      isBot: i > 0,
      hp: startingHP,
      cards: [],
      inventory: [],
      stood: false,
      busted: false,
      eliminated: false,
      handcuffed: false,
      armor: false,
      sawed: false
    }));
    this.round = 1;
    this.phase = 'DEAL';
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
    this.players.forEach(p => {
      if (p.eliminated) return;
      p.cards = [];
      p.stood = false;
      p.busted = false;
      p.handcuffed = false;
      p.armor = false;
      p.sawed = false;
      // Deal 2 items per round
      p.inventory.push(this.getRandomItem(), this.getRandomItem());
      // Deal 2 starting cards
      p.cards.push(this.getRandomCard(), this.getRandomCard());
    });
    this.currentTurnIndex = 0;
    this.phase = 'TURN';
    events.emit('ROUND_START', { round: this.round });
    this.saveState();
    this.checkTurn();
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
    let dmg = isLive ? 1 : 0;
    
    if (target) {
      if (isLive && target.armor) {
        dmg = 0;
        target.armor = false; // consume armor
        events.emit('ARMOR_BLOCK', { target });
      } else if (isLive && shooterId) {
        const shooter = this.players.find(p => p.id === shooterId);
        if (shooter && shooter.sawed) {
          dmg *= 2;
          shooter.sawed = false;
        }
      }
      
      target.hp -= dmg;
      if (target.hp <= 0) target.eliminated = true;
    }
    events.emit('WEAPON_FIRED', { target, isLive, dmg });
    events.emit('SHELLS_UPDATED', { total: this.shells.length });
    return isLive;
  }

  getActivePlayers() {
    return this.players.filter(p => !p.eliminated);
  }

  checkTurn() {
    if (this.phase !== 'TURN') return;
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this.phase = 'END';
      events.emit('GAME_OVER', { winner: active[0] });
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
      // Bot logic is handled elsewhere, we wait for it
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
      p.hp -= 1; // Bust penalty
      events.emit('PLAYER_BUST', { player: p });
      const isLive = this.fireWeapon(p.id); // Blind fire
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
    
    // Get standing players
    let standers = this.getActivePlayers().filter(p => p.stood && !p.busted);
    
    if (standers.length === 0) {
      this.endRound();
      return;
    }
    
    standers.sort((a, b) => calculateScore(b.cards) - calculateScore(a.cards));

    // Determine cascade sequence (Highest to lowest)
    // For now, simplicity: Highest gets to shoot a target of choice. Lowest must shoot self.
    const highest = standers[0];
    const lowest = standers[standers.length - 1];

    if (highest.id === lowest.id) {
       // Only 1 person stood, others busted
       this.endRound();
       return;
    }

    if (calculateScore(highest.cards) === calculateScore(lowest.cards)) {
      // Tie / Sudden Death
      events.emit('SUDDEN_DEATH', { p1: highest, p2: lowest });
      this.fireWeapon(highest.id);
      this.fireWeapon(lowest.id);
    } else {
      // Cascade
      events.emit('CASCADE_SHOOT', { shooter: highest, target: lowest }); // Simplified: highest shoots lowest
      this.fireWeapon(lowest.id, highest.id);
      
      events.emit('CASCADE_SELF', { shooter: lowest });
      const isLive = this.fireWeapon(lowest.id);
      if (!isLive && !lowest.eliminated) {
        lowest.inventory.push(this.getRandomItem());
        events.emit('BLANK_SURVIVAL_REWARD', { player: lowest });
      }
    }

    setTimeout(() => this.endRound(), 3000);
  }

  endRound() {
    this.round += 1;
    const active = this.getActivePlayers();
    if (active.length > 1) {
      this.startRound();
    } else if (active.length === 1) {
      this.phase = 'END';
      events.emit('GAME_OVER', { winner: active[0] });
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
