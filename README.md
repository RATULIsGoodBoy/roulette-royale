# Dealer's Roulette Circle (v4)

An underground Casino Noir survival web game fusing Blackjack and Buckshot Roulette. 

## The Rules
1. **The Armory:** At the start of a round, every player draws Item Cards face-up.
2. **The Deal:** On your turn, play items, then HIT or STAND to build your Blackjack hand.
3. **Bust Penalty:** Exceeding 21 triggers **Blind Fire**. You lose 1 HP and must immediately pull the trigger on yourself blindfolded.
4. **Showdown Cascade:** Once everyone stands, the showdown cascades:
   - Highest score shoots an opponent.
   - Next highest shoots an opponent.
   - Lowest score must shoot themselves.
5. **Sudden Death:** Ties trigger simultaneous gunshots.

## Local Development
This project uses **Vite** with ES6 native modules for hot-reloading and avoiding CORS traps.

### Prerequisites
- Node.js

### Running Locally
```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

During development (`npm run dev`), the iOS Audio Gate is automatically bypassed so you don't have to click "Enter Casino" after every code save.

## Architecture & Modules
- `main.js`: Bootstrapper and `localStorage` state restoration.
- `src/modules/state.js`: Core math engine, `GameState`, and DTO serialization.
- `src/modules/events.js`: Pub/Sub EventBus with leak-proof `unsubscribe()`.
- `src/modules/audio.js`: Web Audio API procedural synthesis.
- `src/modules/ai.js`: Deterministic AI behaviors.
