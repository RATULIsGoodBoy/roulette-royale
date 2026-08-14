import { state, calculateScore } from './state.js';

export class AIController {
  
  static takeTurn(botId) {
    const bot = state.players.find(p => p.id === botId);
    if (!bot || bot.hp <= 0 || bot.eliminated) return;

    // Determine personality or default to 'Cautious'
    const personality = bot.personality || 'CAUTIOUS'; 
    const score = calculateScore(bot.cards);

    if (personality === 'AGGRESSIVE') {
      if (score < 18) {
        state.drawNumberCard(bot.id);
      } else {
        bot.stood = true;
      }
    } else if (personality === 'TACTICAL') {
      // Simulate card counting (basic implementation)
      if (score < 15) {
        state.drawNumberCard(bot.id);
      } else {
        bot.stood = true;
      }
    } else {
      // CAUTIOUS
      if (score < 15) {
        state.drawNumberCard(bot.id);
      } else {
        bot.stood = true;
      }
    }
  }

}
