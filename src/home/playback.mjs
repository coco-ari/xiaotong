export const PLAYBACK = { draw: 4200, settle: 920, reveal: 500 };
export function playbackAt(elapsed, count = 30) {
  const progress = Math.max(0, Math.min(1, elapsed / PLAYBACK.draw));
  return {
    progress,
    step: Math.min(count - 1, Math.floor(progress * (count - 1))),
    phase: elapsed < PLAYBACK.draw ? 'drawing' : elapsed < PLAYBACK.draw + PLAYBACK.settle ? 'settling' : 'done',
  };
}
