import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink, X } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { buildStudyPdfUrl, getFormulaCheatSheet } from '../lib/studyHelpers';

interface FormulaCheatDrawerProps {
  subject: SubjectRecord;
  isOpen: boolean;
  onClose: () => void;
}

export function FormulaCheatDrawer({ subject, isOpen, onClose }: FormulaCheatDrawerProps) {
  const [trackFilter, setTrackFilter] = useState<'all' | 'Signals' | 'Networks'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setTrackFilter('all');
  }, [subject.id]);

  if (!isOpen) return null;

  const allItems = getFormulaCheatSheet(subject);
  const hasTracks = allItems.some((item) => item.track === 'Signals' || item.track === 'Networks');
  const filtered =
    trackFilter === 'all'
      ? allItems
      : allItems.filter((item) => item.track === trackFilter);

  return (
    <div
      className="cheat-drawer-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="formula-drawer-backdrop"
    >
      <aside
        className="memphis-card cheat-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formula-drawer-title"
        onClick={(e) => e.stopPropagation()}
        data-testid="formula-drawer"
      >
        <div className="cheat-drawer__head">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <BookOpen size={20} aria-hidden="true" />
            <h2 id="formula-drawer-title" style={{ fontSize: '1.35rem' }}>
              Formula &amp; Slide Sheet
            </h2>
          </div>

          <button
            type="button"
            className="memphis-btn mindmap-btn"
            onClick={onClose}
            aria-label="Close formula sheet"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {hasTracks && (
          <div className="cheat-drawer__filters" role="group" aria-label="Filter formula shortcuts by track">
            {(['all', 'Signals', 'Networks'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={`memphis-btn mindmap-btn ${
                  trackFilter === key
                    ? key === 'Signals'
                      ? 'memphis-btn--pink'
                      : key === 'Networks'
                        ? 'memphis-btn--teal'
                        : 'memphis-btn--yellow'
                    : ''
                }`}
                onClick={() => setTrackFilter(key)}
              >
                {key === 'all'
                  ? `All (${allItems.length})`
                  : key === 'Signals'
                    ? 'CO4–5 Signals'
                    : 'CO1–3 Networks'}
              </button>
            ))}
          </div>
        )}

        <div className="cheat-drawer__list">
          {filtered.map((item) => {
            const pdfUrl = buildStudyPdfUrl(subject.folderName, item.sourceFile, `p. ${item.page}`);
            return (
              <article key={item.id} className="cheat-card" data-testid={`cheat-item-${item.id}`}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.3rem' }}>
                    <span
                      className={`memphis-pill ${
                        item.track === 'Signals'
                          ? 'memphis-pill--pink'
                          : item.track === 'Networks'
                            ? 'memphis-pill--teal'
                            : 'memphis-pill--yellow'
                      }`}
                    >
                      M{item.moduleNumber} • {item.coCode}
                      {item.track ? ` • ${item.track}` : ''}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1rem' }}>{item.title}</h3>
                  <p className="cheat-card__cue">{item.formulaCue}</p>
                  <p className="cheat-card__file">{item.sourceFile}</p>
                </div>

                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="memphis-btn mindmap-btn memphis-btn--yellow cheat-card__link"
                    aria-label={`Open ${item.title} at page ${item.page}`}
                  >
                    <span>p. {item.page}</span>
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </article>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

