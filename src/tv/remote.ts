const SWIPE_MIN_DISTANCE = 60;
const SWIPE_MAX_MS = 600;

interface RemoteOptions {
  channelCount: number;
  isLocked: () => boolean;
  onNext: () => void;
  onPrevious: () => void;
  onChannel: (index: number) => void;
  onMute: () => void;
}

export const createRemote = ({
  channelCount,
  isLocked,
  onNext,
  onPrevious,
  onChannel,
  onMute,
}: RemoteOptions): void => {
  // ── KEYBOARD ────────────────────────────────────────────────
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isLocked() || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.code === 'Space' || e.key === 'ArrowUp') {
      e.preventDefault(); // stop a focused button from also being clicked
      onNext();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onPrevious();
    } else if (/^[0-9]$/.test(e.key) && Number(e.key) < channelCount) {
      onChannel(Number(e.key));
    } else if (e.key === 'm') {
      onMute();
    }
  });

  // ── SWIPE — sideways flick changes channel ──────────────────
  let startX = 0;
  let startY = 0;
  let startTime = 0;

  window.addEventListener(
    'touchstart',
    (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = performance.now();
    },
    { passive: true }
  );

  window.addEventListener(
    'touchend',
    (e: TouchEvent) => {
      if (isLocked() || e.touches.length > 0) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const isSwipe =
        Math.abs(dx) >= SWIPE_MIN_DISTANCE &&
        Math.abs(dx) > Math.abs(dy) * 2 &&
        performance.now() - startTime <= SWIPE_MAX_MS;

      if (isSwipe) (dx < 0 ? onNext : onPrevious)();
    },
    { passive: true }
  );
};
