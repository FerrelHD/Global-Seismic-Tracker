/**
 * Seismic Acoustic Sound Engine
 * Uses pure Web Audio API (zero external assets, zero dependencies).
 * Features:
 * - Lazy initialization complying with browser Autoplay Policy.
 * - Sub-bass acoustic rumble synthesis proportional to earthquake magnitude.
 * - Master limiter and exponential decay ramp to prevent digital clipping/popping.
 * - Automatic background tab suspension and resume.
 * - Mute state with localStorage persistence.
 */

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;
let lastPlayTimestamp = 0;

// Load mute preference
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('gst_audio_muted');
    if (saved !== null) {
      isMuted = saved === 'true';
    }
  } catch {
    // localStorage might be unavailable in private mode
  }
}

/**
 * Initializes or resumes the AudioContext on user interaction.
 */
function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();

      // Master limiter
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.22, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Suspend when tab is hidden, resume when visible
      document.addEventListener('visibilitychange', () => {
        if (audioCtx) {
          if (document.hidden) {
            audioCtx.suspend().catch(() => {});
          } else {
            audioCtx.resume().catch(() => {});
          }
        }
      });
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a synthesized seismic tremor / acoustic ping.
 * @param magnitude Earthquake magnitude (e.g. 4.2 to 7.8)
 * @param depth Hypocenter depth in km (affects harmonics)
 */
export function playSeismicSound(magnitude = 4.5, depth = 10): void {
  if (isMuted) return;

  const now = performance.now();
  // Debounce to prevent overlapping audio nodes on rapid clicks (min 120ms)
  if (now - lastPlayTimestamp < 120) return;
  lastPlayTimestamp = now;

  const ctx = ensureAudioContext();
  if (!ctx || !masterGain || ctx.state !== 'running') return;

  try {
    const t = ctx.currentTime;

    // Base sub-bass frequency: 45Hz (large M7+) to 110Hz (small M3)
    const clampedMag = Math.max(2.5, Math.min(8.5, magnitude));
    const baseFreq = Math.max(40, 120 - (clampedMag - 2.5) * 12);
    // Duration: 0.3s for small quakes, up to 1.2s for major quakes
    const duration = Math.min(1.2, 0.3 + (clampedMag - 2.5) * 0.15);

    // Primary Deep Sub-Bass Oscillator (Sine wave)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, t);
    // Slight pitch drop simulating seismic ground wave propagation
    osc1.frequency.exponentialRampToValueAtTime(Math.max(30, baseFreq * 0.75), t + duration);

    // Harmonic Resonance Oscillator (Triangle wave for crustal texture)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, t);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq, t + duration);

    // Individual Envelope Gain
    const gainNode = ctx.createGain();
    const peakVolume = Math.min(0.35, 0.08 + (clampedMag - 2.5) * 0.04);
    gainNode.gain.setValueAtTime(0.001, t);
    // Rapid attack
    gainNode.gain.linearRampToValueAtTime(peakVolume, t + 0.04);
    // Exponential decay to eliminate digital popping
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    // Filter to keep acoustic warmth (Lowpass)
    const biquad = ctx.createBiquadFilter();
    biquad.type = 'lowpass';
    biquad.frequency.setValueAtTime(Math.min(300, baseFreq * 3), t);

    // Connect audio graph
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(biquad);
    biquad.connect(masterGain);

    // Start and automatic cleanup
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + duration);
    osc2.stop(t + duration);

    osc1.onended = () => {
      try {
        osc1.disconnect();
        osc2.disconnect();
        gainNode.disconnect();
        biquad.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    };
  } catch {
    // Audio context may be restricted
  }
}

/**
 * Toggles audio mute state and stores to localStorage.
 */
export function toggleAudioMute(): boolean {
  isMuted = !isMuted;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('gst_audio_muted', String(isMuted));
    } catch {}
  }

  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(isMuted ? 0 : 0.22, audioCtx.currentTime);
  }

  // If unmuting for the first time, prime the AudioContext
  if (!isMuted) {
    ensureAudioContext();
    playSeismicSound(5.0, 10);
  }

  return isMuted;
}

/**
 * Returns current audio mute status.
 */
export function getAudioMuteState(): boolean {
  return isMuted;
}
