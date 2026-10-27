/**
 * Browser-based Web Audio API Synthesizer for Forex Robot Sound Alerts
 *
 * Fully client-side, zero external audio assets required.
 * Generates distinct harmonic audio alerts for:
 * 1. Trade Opened: Crisp ascending harmonic chime (C5 -> G5)
 * 2. Take Profit Reached: Triumphant 4-note ascending major bell chord (C5 -> E5 -> G5 -> C6)
 * 3. Stop Loss Triggered: Subtle low caution descending tone (A4 -> F4 -> D4)
 */

class AudioAlertService {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    try {
      const saved = localStorage.getItem("ea_algopro_audio_enabled");
      if (saved !== null) {
        this.isEnabled = saved === "true";
      }
    } catch {
      this.isEnabled = true;
    }
  }

  /**
   * Lazy-initialize or resume AudioContext upon user gesture
   */
  private initContext() {
    if (typeof window === "undefined") return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public getSoundEnabled(): boolean {
    return this.isEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    try {
      localStorage.setItem("ea_algopro_audio_enabled", enabled ? "true" : "false");
    } catch {
      // Ignore storage errors in sandbox
    }
    if (enabled) {
      this.initContext();
    }
  }

  public toggleSound(): boolean {
    const next = !this.isEnabled;
    this.setSoundEnabled(next);
    return next;
  }

  /**
   * Sound 1: Trade Opened Alert
   * Ascending two-tone chime indicating order execution (C5: 523.25Hz -> G5: 783.99Hz)
   */
  public playTradeOpenSound(): void {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.22 }, // C5
        { freq: 783.99, time: 0.09, dur: 0.28 }, // G5
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn("[AudioAlertService] Could not play trade open sound:", e);
    }
  }

  /**
   * Sound 2: Take Profit Target Reached
   * Triumphant 4-note ascending bell chord (C5 -> E5 -> G5 -> C6) with rich resonance
   */
  public playTakeProfitSound(): void {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.25 },  // C5
        { freq: 659.25, time: 0.08, dur: 0.28 }, // E5
        { freq: 783.99, time: 0.16, dur: 0.32 }, // G5
        { freq: 1046.5, time: 0.24, dur: 0.55 }, // C6 high shimmer
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.32, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn("[AudioAlertService] Could not play take profit sound:", e);
    }
  }

  /**
   * Sound 3: Stop Loss Triggered
   * Descending caution alert tone (A4: 440Hz -> F4: 349.23Hz -> D4: 293.66Hz)
   */
  public playStopLossSound(): void {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 440.0, time: 0.0, dur: 0.18 },   // A4
        { freq: 349.23, time: 0.10, dur: 0.22 }, // F4
        { freq: 293.66, time: 0.20, dur: 0.38 }, // D4
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const filter = this.ctx!.createBiquadFilter();
        const gain = this.ctx!.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + time);

        // Low-pass filter to soften the caution tone
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, now + time);

        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(this.volume * 0.26, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn("[AudioAlertService] Could not play stop loss sound:", e);
    }
  }

  /**
   * Preview a sound alert on demand (for testing from UI)
   */
  public testSound(type: "OPEN" | "TP" | "SL"): void {
    if (type === "OPEN") this.playTradeOpenSound();
    else if (type === "TP") this.playTakeProfitSound();
    else if (type === "SL") this.playStopLossSound();
  }
}

export const audioService = new AudioAlertService();
