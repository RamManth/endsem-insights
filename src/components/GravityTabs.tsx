import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { MemphisAccent } from '../types/study';
import { prefersReducedMotion } from '../lib/scrollMotion';

export interface GravityTabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: ReactNode;
  accent?: MemphisAccent;
  testId?: string;
}

interface GravityTabsProps {
  tabs: GravityTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  ariaLabel: string;
  className?: string;
  idPrefix?: string;
  children: ReactNode;
}

type GravityDirection = 'initial' | 'right' | 'left';

interface IndicatorStyle {
  left: number;
  width: number;
  ready: boolean;
}

/**
 * Memphis-styled dashboard tabs featuring a physical gravity drop-and-settle
 * transition between panels plus a spring-gliding active pill indicator.
 */
export function GravityTabs({
  tabs,
  activeTab,
  onTabChange,
  ariaLabel,
  className = '',
  idPrefix = 'dash',
  children,
}: GravityTabsProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [motion, setMotion] = useState<{
    tabId: string;
    direction: GravityDirection;
    seq: number;
  }>({
    tabId: activeTab,
    direction: 'initial',
    seq: 0,
  });

  if (activeTab !== motion.tabId) {
    const prevIdx = tabs.findIndex((t) => t.id === motion.tabId);
    const nextIdx = tabs.findIndex((t) => t.id === activeTab);
    const direction: GravityDirection =
      prevIdx === -1 || nextIdx === -1
        ? 'initial'
        : nextIdx >= prevIdx
          ? 'right'
          : 'left';

    setMotion({
      tabId: activeTab,
      direction,
      seq: motion.seq + 1,
    });
  }

  const [indicator, setIndicator] = useState<IndicatorStyle>({
    left: 0,
    width: 0,
    ready: false,
  });

  const syncIndicator = () => {
    const track = trackRef.current;
    const btn = buttonRefs.current[activeTab];
    if (!track || !btn) return;
    if (btn.offsetWidth <= 0) return;
    setIndicator({
      left: btn.offsetLeft,
      width: btn.offsetWidth,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    syncIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabs.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => syncIndicator();
    window.addEventListener('resize', onResize, { passive: true });
    const resizeObs =
      typeof window.ResizeObserver === 'function' && trackRef.current
        ? new window.ResizeObserver(syncIndicator)
        : null;
    if (resizeObs && trackRef.current) {
      resizeObs.observe(trackRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      resizeObs?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabs.length]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
    if (tabs.length <= 1) return;
    let targetIdx: number | null = null;
    if (e.key === 'ArrowRight') {
      targetIdx = (currentIdx + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIdx = (currentIdx - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIdx = 0;
    } else if (e.key === 'End') {
      targetIdx = tabs.length - 1;
    }
    if (targetIdx === null) return;
    e.preventDefault();
    const nextTab = tabs[targetIdx];
    onTabChange(nextTab.id);
    buttonRefs.current[nextTab.id]?.focus();
  };

  const activeMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const activeAccent = activeMeta?.accent ?? 'yellow';
  const reduced = prefersReducedMotion();
  const panelAnimClass = reduced
    ? ''
    : motion.direction === 'right'
      ? 'gravity-panel--drop-right'
      : motion.direction === 'left'
        ? 'gravity-panel--drop-left'
        : 'gravity-panel--drop-initial';

  return (
    <div className={`gravity-tabs-shell ${className}`.trim()}>
      <div className="gravity-tabs-bar-wrap">
        <div
          ref={trackRef}
          className="gravity-tabs-bar"
          role="tablist"
          aria-label={ariaLabel}
        >
          {indicator.ready && (
            <span
              className={`gravity-tabs-glider gravity-tabs-glider--${activeAccent}`}
              aria-hidden="true"
              style={{
                width: `${indicator.width}px`,
                transform: `translate3d(${indicator.left}px, 0, 0)`,
              }}
            />
          )}

          {tabs.map((tab, idx) => {
            const isSelected = tab.id === activeTab;
            const accent = tab.accent ?? 'yellow';
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  buttonRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${tab.id}`}
                aria-selected={isSelected}
                aria-controls={`${idPrefix}-panel-${tab.id}`}
                tabIndex={isSelected ? 0 : -1}
                data-testid={tab.testId ?? `tab-${tab.id}`}
                className={`gravity-tab-btn gravity-tab-btn--${accent} ${
                  isSelected ? 'gravity-tab-btn--active' : ''
                }`}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              >
                {tab.icon && <span className="gravity-tab-btn__icon">{tab.icon}</span>}
                <span className="gravity-tab-btn__label">{tab.label}</span>
                {tab.badge !== undefined && tab.badge !== null && (
                  <span className="gravity-tab-btn__badge">{tab.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        key={`${activeTab}-${motion.seq}`}
        role="tabpanel"
        id={`${idPrefix}-panel-${activeTab}`}
        aria-labelledby={`${idPrefix}-tab-${activeTab}`}
        data-testid={`tabpanel-${activeTab}`}
        data-gravity-direction={motion.direction}
        className={`gravity-tabpanel ${panelAnimClass}`.trim()}
      >
        {children}
      </div>
    </div>
  );
}

