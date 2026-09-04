/**
 * Synthesizes a subtle, high-end seismic radar ping using the Web Audio API.
 * No external sound files required; operates synchronously with 0ms latency.
 */
export const playSeismicAlertPing = () => {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Sub-bass fundamental tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(260, now);
    osc1.frequency.exponentialRampToValueAtTime(140, now + 0.35);

    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Harmonic crystalline ping
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(520, now);
    osc2.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.4);
    osc2.start(now);
    osc2.stop(now + 0.28);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // AudioContext blocked by browser autoplay policy if user hasn't interacted yet
  }
};
