type SoundType = 'upload-done' | 'delete' | 'enable' | 'notify';

function scheduleTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.22,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playSound(type: SoundType) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new AudioContext();
    const t = ctx.currentTime;
    switch (type) {
      case 'upload-done':
        // Rising major arpeggio — C5, E5, G5
        scheduleTone(ctx, 523.25, t, 0.35, 0.22);
        scheduleTone(ctx, 659.25, t + 0.16, 0.35, 0.22);
        scheduleTone(ctx, 783.99, t + 0.32, 0.55, 0.22);
        break;
      case 'delete':
        // Gentle downward step — A4, E4
        scheduleTone(ctx, 440, t, 0.25, 0.18);
        scheduleTone(ctx, 329.63, t + 0.13, 0.35, 0.14);
        break;
      case 'enable':
        // Soft two-tone confirm — G5, B5
        scheduleTone(ctx, 783.99, t, 0.15, 0.18);
        scheduleTone(ctx, 987.77, t + 0.12, 0.38, 0.18);
        break;
      case 'notify':
        // Gentle chime — E5, G5
        scheduleTone(ctx, 659.25, t, 0.28, 0.18);
        scheduleTone(ctx, 783.99, t + 0.16, 0.45, 0.18);
        break;
    }
    setTimeout(() => ctx.close().catch(() => {}), 1600);
  } catch {
    // Auto-play policy blocked — silently skip
  }
}
