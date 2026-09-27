// Web Audio API sound effects for Pokemon interactions
// 100% self-contained, no external audio files required

class SoundEffects {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    // Lazy initialize on first user gesture
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pokefinance_sound');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pokefinance_sound', String(val));
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  // Quick button click/select
  public playClick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  // EXP gain sparkle chimes
  public playExpGain() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  }

  // Classic level up fanfare!
  public playLevelUp() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Classic 8-bit victorious arpeggio
    const sequence = [
      { f: 440.00, d: 0.1 },  // A4
      { f: 554.37, d: 0.1 },  // C#5
      { f: 659.25, d: 0.1 },  // E5
      { f: 880.00, d: 0.2 },  // A5
      { f: 783.99, d: 0.1 },  // G5
      { f: 880.00, d: 0.4 },  // A5 hold
    ];

    let t = ctx.currentTime + 0.05;
    sequence.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + note.d);
      t += note.d * 0.9;
    });
  }

  // Dramatic evolution sequence
  public playEvolution() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Pulsing ascending tones followed by triumphant fanfare
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.25;
      const freq = 300 + i * 90;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.linearRampToValueAtTime(freq + 150, startTime + 0.2);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.22);
    }

    // Finale fanfare at +2.2s
    setTimeout(() => {
      this.playLevelUp();
    }, 2200);
  }

  // Pokemon cry sweep
  public playCry(type: string = 'normal') {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    let startFreq = 400;
    let endFreq = 200;
    let waveType: OscillatorType = 'sine';

    switch (type) {
      case 'fire':
        startFreq = 300;
        endFreq = 800;
        waveType = 'sawtooth';
        break;
      case 'water':
        startFreq = 600;
        endFreq = 250;
        waveType = 'sine';
        break;
      case 'electric':
        startFreq = 800;
        endFreq = 1600;
        waveType = 'square';
        break;
      case 'grass':
        startFreq = 500;
        endFreq = 350;
        waveType = 'triangle';
        break;
      default:
        startFreq = 450;
        endFreq = 300;
    }

    osc.type = waveType;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.3);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  // Coin collect clink (for transaction logging & currency gain)
  public playCoin() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t); // B5
    gain1.gain.setValueAtTime(0.12, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.1);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, t + 0.08); // E6
    gain2.gain.setValueAtTime(0.15, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.3);
  }

  // Triumphant Gym Badge & Achievement Fanfare!
  public playBadgeUnlocked() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    // Victory arpeggio (C5 - G5 - C6 - E6 - G6)
    const notes = [523.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const t = ctx.currentTime + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (idx === notes.length - 1 ? 0.6 : 0.2));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + (idx === notes.length - 1 ? 0.6 : 0.2));
    });
  }

  // Stream authentic official Pokemon cry from PokeAPI repository!
  public playPokemonCry(pokedexId: number, fallbackType: string = 'normal'): Promise<void> {
    if (!this.enabled) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        const audio = new Audio();
        audio.volume = 0.45;
        // Official PokeAPI cries repository (OGG audio format)
        audio.src = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokedexId}.ogg`;

        const cleanup = () => {
          audio.removeEventListener('ended', handleEnd);
          audio.removeEventListener('error', handleError);
        };

        const handleEnd = () => {
          cleanup();
          resolve();
        };

        const handleError = () => {
          cleanup();
          // Fallback to Web Audio synthesizer cry if network fails
          this.playCry(fallbackType);
          resolve();
        };

        audio.addEventListener('ended', handleEnd);
        audio.addEventListener('error', handleError);

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay policy or load failed, fallback
            this.playCry(fallbackType);
            resolve();
          });
        }
      } catch {
        this.playCry(fallbackType);
        resolve();
      }
    });
  }
}

export const sounds = new SoundEffects();

