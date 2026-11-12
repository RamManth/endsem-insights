/**
 * Smooth scrolling & viewport scroll-reveal utilities tuned for 60/120fps compositing.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let activeScrollRaf: number | null = null;
let cancelListenersAttached = false;

function stopActiveScroll() {
  if (activeScrollRaf !== null && typeof window !== 'undefined') {
    window.cancelAnimationFrame(activeScrollRaf);
    activeScrollRaf = null;
  }
}

function attachUserInterruptListeners() {
  if (cancelListenersAttached || typeof window === 'undefined') return;
  cancelListenersAttached = true;
  const cancel = () => stopActiveScroll();
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (
      ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)
    ) {
      stopActiveScroll();
    }
  });
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/**
 * Smoothly scrolls window vertically to `targetY` with user-interrupt cancellation.
 */
export function smoothScrollToY(targetY: number, durationMs = 680): void {
  if (typeof window === 'undefined' || typeof window.scrollTo !== 'function') return;

  const maxScroll =
    typeof document !== 'undefined'
      ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      : targetY;
  const clampedTarget = Math.max(0, Math.min(targetY, maxScroll));

  if (
    prefersReducedMotion() ||
    typeof window.requestAnimationFrame !== 'function' ||
    durationMs <= 0
  ) {
    window.scrollTo(0, clampedTarget);
    return;
  }

  attachUserInterruptListeners();
  stopActiveScroll();

  const startY = window.scrollY;
  const distance = clampedTarget - startY;
  if (Math.abs(distance) < 2) {
    window.scrollTo(0, clampedTarget);
    return;
  }

  const startTime = performance.now();
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeOutQuart(progress);
    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      activeScrollRaf = window.requestAnimationFrame(step);
    } else {
      activeScrollRaf = null;
    }
  };

  activeScrollRaf = window.requestAnimationFrame(step);
}

/**
 * Smoothly scrolls so `element` lands just beneath the sticky top navbar.
 */
export function smoothScrollToElement(
  element: HTMLElement | null,
  stickyHeaderOffset = 88,
  durationMs = 700
): void {
  if (!element || typeof window === 'undefined') return;
  if (typeof element.getBoundingClientRect !== 'function') {
    element.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    return;
  }
  const rect = element.getBoundingClientRect();
  const targetY = rect.top + window.scrollY - stickyHeaderOffset;
  smoothScrollToY(targetY, durationMs);
}

