import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { prefersReducedMotion } from '../lib/scrollMotion';

export type ScrollRevealVariant = 'up' | 'scale' | 'left' | 'right' | 'fade';

interface ScrollRevealProps {
  children: ReactNode;
  variant?: ScrollRevealVariant;
  delayIndex?: number;
  maxStagger?: number;
  className?: string;
  style?: CSSProperties;
  immediate?: boolean;
}

function canObserveViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.IntersectionObserver === 'function' &&
    !prefersReducedMotion()
  );
}

/**
 * Reveals content smoothly on viewport entry using IntersectionObserver.
 * Falls back immediately to visible state in reduced-motion or non-IO test environments.
 */
export function ScrollReveal({
  children,
  variant = 'up',
  delayIndex = 0,
  maxStagger = 7,
  className = '',
  style,
  immediate = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState<boolean>(() => !canObserveViewport());

  useEffect(() => {
    if (revealed) return;
    const node = ref.current;
    if (!node || !canObserveViewport()) {
      setRevealed(true);
      return;
    }

    if (immediate) {
      const immediateRaf = window.requestAnimationFrame(() => setRevealed(true));
      return () => window.cancelAnimationFrame(immediateRaf);
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 0.98) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        threshold: 0.02,
        rootMargin: '200px 0px -20px 0px',
      }
    );

    observer.observe(node);

    // Safety net: ensure elements already above or inside the fold reveal quickly
    const rafId = window.requestAnimationFrame(() => {
      const rect = node.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.98) {
        setRevealed(true);
        observer.disconnect();
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [revealed, immediate]);

  const delayMs = Math.min(Math.max(0, delayIndex), maxStagger) * 55;
  const mergedStyle: CSSProperties = {
    ...style,
    ['--reveal-delay' as string]: `${delayMs}ms`,
  };

  return (
    <div
      ref={ref}
      className={`scroll-reveal scroll-reveal--${variant} ${
        revealed ? 'scroll-reveal--visible' : ''
      } ${className}`.trim()}
      style={mergedStyle}
    >
      {children}
    </div>
  );
}

interface CountUpNumberProps {
  value: number;
  suffix?: string;
  durationMs?: number;
}

/**
 * Counts smoothly from 0 to `value` once scrolled into view.
 */
export function CountUpNumber({ value, suffix = '', durationMs = 620 }: CountUpNumberProps) {
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const [displayValue, setDisplayValue] = useState<number>(() =>
    canObserveViewport() && value > 0 ? 0 : value
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (!canObserveViewport() || value <= 0) {
      setDisplayValue(value);
      return;
    }
    const el = spanRef.current;
    if (!el) return;

    let rafId: number | null = null;
    const startCount = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const start = performance.now();

      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) {
          rafId = window.requestAnimationFrame(tick);
        } else {
          setDisplayValue(value);
        }
      };

      rafId = window.requestAnimationFrame(tick);
    };

    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          startCount();
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [value, durationMs]);

  return (
    <span ref={spanRef}>
      {displayValue}
      {suffix}
    </span>
  );
}
