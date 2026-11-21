import type { WeaponId } from './types';

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private driftGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;
  private unlocked = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.45, this.ctx.currentTime, 0.04);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public unlock(): void {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);

      // Shared white noise buffer for gunshots, explosions, and tire screech
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      // Continuous vehicle engine synth (silenced when on foot)
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const engineFilter = this.ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 240;

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.value = 28;

      this.engineOsc.connect(engineFilter);
      this.engineSubOsc.connect(engineFilter);
      engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);
      this.engineOsc.start();
      this.engineSubOsc.start();

      // Continuous police siren synth
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 640;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.masterGain);
      this.sirenOsc.start();

      // Continuous tire screech loop
      if (this.noiseBuffer) {
        const driftSrc = this.ctx.createBufferSource();
        driftSrc.buffer = this.noiseBuffer;
        driftSrc.loop = true;
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 1450;
        bp.Q.value = 5.5;
        this.driftGain = this.ctx.createGain();
        this.driftGain.gain.value = 0;
        driftSrc.connect(bp);
        bp.connect(this.driftGain);
        this.driftGain.connect(this.masterGain);
        driftSrc.start();

        // Subtle continuous rain ambience loop
        const rainSrc = this.ctx.createBufferSource();
        rainSrc.buffer = this.noiseBuffer;
        rainSrc.loop = true;
        const rainLp = this.ctx.createBiquadFilter();
        rainLp.type = 'lowpass';
        rainLp.frequency.value = 1150;
        const rainHp = this.ctx.createBiquadFilter();
        rainHp.type = 'highpass';
        rainHp.frequency.value = 280;
        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0;
        rainSrc.connect(rainHp);
        rainHp.connect(rainLp);
        rainLp.connect(this.rainGain);
        this.rainGain.connect(this.masterGain);
        rainSrc.start();
      }

      this.unlocked = true;
    } catch {
      // AudioContext blocked or unavailable
    }
  }

  public updateContinuous(
    inVehicle: boolean,
    speedNorm: number,
    drifting: boolean,
    sirenIntensity: number,
    time: number,
    paused: boolean,
    rainIntensity = 0,
  ): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineSubOsc || !this.sirenGain || !this.sirenOsc) {
      return;
    }
    const now = this.ctx.currentTime;
    if (paused) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.05);
      this.sirenGain.gain.setTargetAtTime(0, now, 0.05);
      if (this.driftGain) this.driftGain.gain.setTargetAtTime(0, now, 0.05);
      if (this.rainGain) this.rainGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    if (inVehicle) {
      const freq = 48 + speedNorm * 115;
      this.engineOsc.frequency.setTargetAtTime(freq, now, 0.06);
      this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.06);
      this.engineGain.gain.setTargetAtTime(0.08 + speedNorm * 0.09, now, 0.08);
    } else {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
    }

    if (this.driftGain) {
      this.driftGain.gain.setTargetAtTime(inVehicle && drifting && speedNorm > 0.25 ? 0.09 : 0, now, 0.04);
    }

    if (this.rainGain) {
      const targetRain = rainIntensity > 0.02 ? (inVehicle ? 0.032 : 0.058) * Math.min(1, rainIntensity) : 0;
      this.rainGain.gain.setTargetAtTime(targetRain, now, 0.25);
    }

    if (sirenIntensity > 0.02) {
      const wail = 620 + Math.sin(time * 6.5) * 230;
      this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
      this.sirenGain.gain.setTargetAtTime(0.045 * Math.min(1, sirenIntensity), now, 0.08);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
    }
  }

  public playGunshot(weapon: WeaponId): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    if (weapon === 'unarmed') {
      this.playPunch();
      return;
    }
    if (weapon === 'knife') {
      this.playKnifeSlash();
      return;
    }
    const now = this.ctx.currentTime;

    // Noise burst
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value =
      weapon === 'shotgun' ? 660 : weapon === 'rifle' ? 920 : weapon === 'smg' ? 1400 : 1120;
    filter.Q.value = weapon === 'shotgun' ? 0.65 : 1.05;

    const gain = this.ctx.createGain();
    const peak = weapon === 'shotgun' ? 0.54 : weapon === 'rifle' ? 0.42 : weapon === 'smg' ? 0.22 : 0.34;
    const dur = weapon === 'shotgun' ? 0.23 : weapon === 'rifle' ? 0.16 : weapon === 'smg' ? 0.08 : 0.13;
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
    src.stop(now + dur);

    // Low-end punch
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(weapon === 'shotgun' ? 140 : weapon === 'rifle' ? 165 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.085);
    const punchGain = this.ctx.createGain();
    punchGain.gain.setValueAtTime(weapon === 'shotgun' ? 0.45 : weapon === 'rifle' ? 0.34 : 0.25, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(punchGain);
    punchGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.095);
  }

  public playPunch(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playKnifeSlash(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    // Crisp air/steel swipe
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.exponentialRampToValueAtTime(4200, now + 0.08);
    filter.Q.value = 2.4;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.11);

    // Subtle steel ring
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.09, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(og);
    og.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playReload(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [520, 780].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.11, now + idx * 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.055);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.06);
    });
  }

  public playEmptyClick(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playPurchase(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [587.33, 880, 1174.66].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, now + idx * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.14);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.15);
    });
  }

  public playExplosion(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(850, now);
    lp.frequency.exponentialRampToValueAtTime(90, now + 0.9);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.75, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.95);

    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.55);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.65, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    sub.connect(sg);
    sg.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 0.56);
  }

  public playImpact(strength = 0.5): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120 + strength * 40, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.4, 0.12 + strength * 0.25), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playHorn(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [349.23, 440].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.11, now + 0.02);
      g.gain.setValueAtTime(0.11, now + 0.18);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    });
  }

  public playPickup(isCash = false): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = isCash ? [660, 880, 1175] : [523.25, 783.99];
    notes.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, now + idx * 0.055);
      g.gain.linearRampToValueAtTime(0.16, now + idx * 0.055 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.18);
      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.2);
    });
  }

  public playDoorSlam(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playGameOverStinger(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    [220, 196, 164.81, 130.81].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + i * 0.16);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.14, now + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.4);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.masterGain);
      osc.start(now + i * 0.16);
      osc.stop(now + i * 0.16 + 0.42);
    });
  }

  public dispose(): void {
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.sirenOsc?.stop();
      if (this.ctx && this.ctx.state !== 'closed') {
        void this.ctx.close();
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
