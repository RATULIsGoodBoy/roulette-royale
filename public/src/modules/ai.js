import { state, calculateScore } from './state.js';

export class AIController {
  
  static takeTurn(botId) {
    const bot = state.players.find(p => p.id === botId);
    if (!bot || bot.hp <= 0 || bot.eliminated) return;

    const personality = bot.personality || 'CAUTIOUS';
    const score = calculateScore(bot.cards);
    const hpRatio = bot.hp / 2;
    bot.panic = bot.hp <= 2; // Update panic state
    
    // TILT STATE: After losing a round, bots become erratic
    const tilt = bot.tilt || false;
    
    let threshold = 17;
    let actionDelay = 1500;

    // PANIC STATE: Changes behavior dramatically when HP <= 2
    if (bot.panic) {
      actionDelay = 800; // Panicked bots act faster
      if (personality === 'AGGRESSIVE') {
        // Desperate Aggressive: Either go hard or fold early
        threshold = Math.random() > 0.5 ? 14 : 19;
      } else if (personality === 'CAUTIOUS') {
        // Frozen Cautious: Stands very early
        threshold = 12;
      } else {
        // Tactical Panic: Tries to hit exactly 21
        threshold = 19;
      }
    } else if (tilt) {
      // TILT: Random aggressive behavior
      threshold = 15 + Math.random() * 6;
      actionDelay = 600;
    } else {
      // Normal Personalities
      if (personality === 'AGGRESSIVE') {
        threshold = 18 + Math.random() * 2;
        if (hpRatio < 0.5) threshold -= 2;
      } else if (personality === 'TACTICAL') {
        const activePlayers = state.getActivePlayers().length;
        threshold = 16;
        if (activePlayers <= 2) threshold = 19;
        if (bot.inventory.length > 2) threshold = 15;
      } else {
        threshold = 15;
        if (hpRatio < 0.5) threshold = 13;
      }
    }

    // Randomness factor (10%)
    if (Math.random() < 0.1) {
      threshold = score < 12 ? 20 : 10;
    }

    setTimeout(() => {
      if (score < threshold && !bot.busted) {
        state.playerHit(bot.id);
      } else {
        state.playerStand(bot.id);
      }
    }, actionDelay);
  }

}

// Singleton instance for event binding
const aiController = new AIController();

import { events } from './events.js';

export function initAI() {
  events.on('BOT_TURN', ({ player }) => {
    AIController.takeTurn(player.id);
  });
}

export { aiController };
