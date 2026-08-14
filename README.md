# BLACK ROOM — Debt Collection

**An underground Casino Noir survival game** fusing Blackjack and Buckshot Roulette on the darkweb.

## The Lore

You owe **$100,000**. The Dealer doesn't forgive. You've been dragged into the **BLACK ROOM** — an encrypted darkweb arena where debt runners fight for freedom. Win the circle. Walk free. Lose... become an example.

## Game Rules

### 1. The Setup
- **4 Players**: You + 3 bots (Aggressive, Tactical, Cautious personalities)
- **2 HP**: Each player starts with 2 hearts
- **Item Cards**: Draw 2 tactical items per round (Magnifier, Saw, Kevlar, etc.)

### 2. Your Turn
- **Item Phase**: Play up to 2 items from inventory
- **Action Phase**: **HIT** (draw card) or **STAND** (lock in score)

### 3. Bust Penalty ("Math + RNG")
Exceeding 21 triggers:
- **-1 HP** immediate damage
- **BLIND FIRE**: Pull trigger on yourself blindfolded

### 4. Showdown Cascade
When all players stand/bust:
- **Highest score** shoots an opponent
- **Next highest** shoots an opponent
- **Lowest score** must shoot THEMSELF
- Survive a self-shot blank? Bonus item next round!

### 5. Sudden Death
Tied scores = simultaneous gunshots. Both live = double kill.

## Features

### Immersive Experience
- **Loading Screens**: "Connecting to Black Room..." cinematic intro
- **Round Overlays**: Dramatic transitions showing current DEBT amount
- **Debt Meter**: Visible $100k countdown — survive rounds to reduce debt
- **Blood Splatter**: Positional + intensity-based (neighbor = heavy, across = light)
- **Screen Shake**: Heavy on live rounds, light on blanks
- **Panic System**: Bots behave erratically when HP ≤ 2

### Audio System
- **Procedural Gunshots**: Web Audio API synthesized
- **Volume by Distance**: Adjacent shots = 100%, across table = 40%
- **Mute Toggle**: Press `M` or click 🔊 button
- **Heartbeat**: Intensifies on risky draws

### AI Personalities (With Panic States)
- **AGGRESSIVE (Runner 1)**: Stands 18-20 normally. When panicking: erratic 14 or 19 threshold
- **TACTICAL (Runner 2)**: Adapts to player count. When panicking: tries for exact 21
- **CAUTIOUS (Runner 3)**: Stands at 15 normally. When panicking: freezes, stands at 12

### Visual Polish
- **CRT Scanlines**: Retro monitor effect
- **Revolver Pulse**: Glowing center stage
- **Card Shine**: Active player highlight
- **Muzzle Flash**: Full-screen white flash
- **Debt Glow**: Pulsing red debt counter
- **Glassmorphism UI**: Modern transparent panels

### Game Loop
- **Start Debt**: $100,000
- **Per Round Survived**: -$10,000
- **Death Penalty**: +$50,000
- **Victory**: Reach $0 debt

## Controls

| Key | Action |
|-----|--------|
| `H` / `Space` | HIT (draw card) |
| `S` | STAND (lock score) |
| `M` | MUTE audio |

## Local Development

```bash
npm install
npm run dev
```

**Dev Mode**: Audio gate auto-bypassed for HMR workflow.

## Architecture

- `main.js` — Bootstrapper, AI event handler
- `src/modules/state.js` — Core engine, Blackjack math, shell queue
- `src/modules/ui.js` — Renderer, blood splash, screen shake, mute
- `src/modules/audio.js` — Web Audio synth, ambience, gunshots
- `src/modules/ai.js` — Personality-driven bot logic
- `src/modules/events.js` — Pub/Sub EventBus

## Build

```bash
npm run build
```

Output: `dist/` folder ready for static hosting.
