/**
 * Web Audio API Synthesizer with Dealer Taunts & Dynamic Ambience
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.muted = false;
    this.masterGain = null;
    this.ambience = null;
    this.heartbeatInterval = null;
    this.hpLevel = 1.0;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  async resume() {
    this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
    this.startAmbience();
  }

  setMute(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : 1;
    }
  }

  setHP(level) {
    this.hpLevel = level;
    this.updateAmbience();
  }

  startAmbience() {
    if (this.ambience || this.muted || !this.ctx) return;
    
    // Layer 1: Muffled drone (locked room feeling)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(50, this.ctx.currentTime);
    
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 120;
    filter1.Q.value = 0.5;
    
    const gain1 = this.ctx.createGain();
    gain1.gain.value = 0.08;
    
    osc1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    
    // Layer 2: High-frequency hum (electrical tension)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, this.ctx.currentTime);
    
    const filter2 = this.ctx.createBiquadFilter();
    filter2.type = 'highpass';
    filter2.frequency.value = 80;
    
    const gain2 = this.ctx.createGain();
    gain2.gain.value = 0.03;
    
    osc2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start();
    
    this.ambience = { 
      osc1, filter1, gain1,
      osc2, filter2, gain2
    };
    this.startHeartbeatLoop();
  }

  updateAmbience() {
    if (!this.ambience || !this.ctx) return;
    
    // Ambience gets more intense as HP drops
    const intensity = 1.0 - this.hpLevel;
    
    // Low drone intensifies
    this.ambience.filter1.frequency.rampToValueAtTime(120 + intensity * 200, this.ctx.currentTime + 0.5);
    this.ambience.gain1.gain.rampToValueAtTime(0.08 + intensity * 0.1, this.ctx.currentTime + 0.5);
    
    // High hum becomes more prominent
    this.ambience.osc2.frequency.rampToValueAtTime(120 + intensity * 80, this.ctx.currentTime + 0.5);
    this.ambience.gain2.gain.rampToValueAtTime(0.03 + intensity * 0.05, this.ctx.currentTime + 0.5);
  }

  stopAmbience() {
    if (this.ambience) {
      this.ambience.osc1.stop();
      this.ambience.osc2.stop();
      this.ambience = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  startHeartbeatLoop() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    const beat = () => {
      const intensity = (1.0 - this.hpLevel) + 0.3;
      const bpm = 60 + (1.0 - this.hpLevel) * 60; // 60-120 BPM based on HP
      this.playHeartbeat(intensity);
      
      this.heartbeatInterval = setTimeout(beat, (60 / bpm) * 1000);
    };
    
    beat();
  }

  playGunshot(isLive, volume = 1, distance = 1.0) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    
    // Distance attenuation (0.3 = across table, 1.0 = adjacent/self)
    const distVol = volume * (0.3 + 0.7 * distance);
    
    if (isLive) {
      // Reverb effect for claustrophobic room
      const convolver = this.ctx.createConvolver();
      const impulse = this.createReverbImpulse(0.4);
      convolver.buffer = impulse;
      
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.2);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(distVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
      
      // Split signal: dry + wet (reverb)
      const dryGain = this.ctx.createGain();
      dryGain.gain.value = 0.7;
      const wetGain = this.ctx.createGain();
      wetGain.gain.value = 0.5;
      
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(dryGain);
      gain.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(this.masterGain);
      wetGain.connect(this.masterGain);
      
      noiseSource.start();
    } else {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3 * distVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }
  }

  createReverbImpulse(duration) {
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    return impulse;
  }

  playHeartbeat(intensity = 1) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40, this.ctx.currentTime);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.8 * intensity, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Procedural taunt synthesis with speech-like patterns
  playTaunt(type) {
    if (!this.unlocked || !this.ctx || this.muted) return;
    
    const now = this.ctx.currentTime;
    
    switch(type) {
      case 'laugh':
        // Manic laugh pattern
        this.playLaugh(now);
        break;
      case 'warning':
        // Ominous warning drone
        this.playWarning(now);
        break;
      case 'taunt':
        // Mocking speech pattern
        this.playMockingTaunt(now);
        break;
      case 'death':
        // Death scream effect
        this.playDeathSound(now);
        break;
    }
  }
  
  playLaugh(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.15);
    osc.frequency.linearRampToValueAtTime(450, now + 0.3);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 2;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
    
    // Second laugh burst
    setTimeout(() => {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(350, this.ctx.currentTime);
      gain2.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.3);
    }, 200);
  }
  
  playWarning(now) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.6);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    
    osc.start(now);
    osc.stop(now + 0.6);
  }
  
  playMockingTaunt(now) {
    // Speech-like formant synthesis
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.2);
    osc.frequency.linearRampToValueAtTime(150, now + 0.4);
    
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.value = 3;
    filter.gain.setValueAtTime(10, now);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }
  
  playDeathSound(now) {
    // Horror death scream
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.8);
    
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(100, now + 0.8);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

export const audioEngine = new AudioEngine();
