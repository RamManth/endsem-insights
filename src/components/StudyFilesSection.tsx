import { useState } from 'react';
import { Download, ExternalLink, FileText, FolderOpen } from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import {
  buildStudyFileLibrary,
  formatFileSize,
  type StudyFileKind,
} from '../lib/studyHelpers';
import { ScrollReveal } from './ScrollReveal';

interface StudyFilesSectionProps {
  subjects: SubjectRecord[];
  mode: 'home' | 'subject';
}

type FileFilter = 'all' | StudyFileKind;

const FILTER_OPTIONS: { key: FileFilter; label: string }[] = [
  { key: 'all', label: 'All Files' },
  { key: 'summary', label: 'Repeat List & Guides' },
  { key: 'slides', label: 'Module Slides' },
  { key: 'pyq', label: 'PYQ Papers' },
  { key: 'plan', label: 'Course Plan' },
];

export function StudyFilesSection({ subjects, mode }: StudyFilesSectionProps) {
  const [filter, setFilter] = useState<FileFilter>('all');
  const allItems = buildStudyFileLibrary(subjects);

  if (allItems.length === 0) return null;

  const countByKind: Record<FileFilter, number> = {
    all: allItems.length,
    summary: allItems.filter((i) => i.kind === 'summary').length,
    slides: allItems.filter((i) => i.kind === 'slides').length,
    pyq: allItems.filter((i) => i.kind === 'pyq').length,
    plan: allItems.filter((i) => i.kind === 'plan').length,
  };

  const visibleItems =
    filter === 'all' ? allItems : allItems.filter((item) => item.kind === filter);

  return (
    <section
      className="files-section"
      aria-labelledby="files-heading"
      data-testid="files-section"
    >
      <ScrollReveal variant="up">
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <FolderOpen size={22} aria-hidden="true" />
            <h2 id="files-heading">Files</h2>
          </div>
          <span className="memphis-pill memphis-pill--teal">
            {allItems.length} PDF{allItems.length === 1 ? '' : 's'}
          </span>
        </div>
      </ScrollReveal>

      <div className="files-filter-bar" role="group" aria-label="Filter study files">
        {FILTER_OPTIONS.filter((opt) => opt.key === 'all' || countByKind[opt.key] > 0).map(
          (opt) => (
            <button
              key={opt.key}
              type="button"
              className={`memphis-btn mindmap-btn ${
                filter === opt.key
                  ? opt.key === 'summary'
                    ? 'memphis-btn--pink'
                    : opt.key === 'pyq'
                      ? 'memphis-btn--teal'
                      : 'memphis-btn--yellow'
                  : ''
              }`}
              onClick={() => setFilter(opt.key)}
              data-testid={`files-filter-${opt.key}`}
            >
              <span>
                {opt.label} ({countByKind[opt.key]})
              </span>
            </button>
          )
        )}
      </div>

      <div className="files-grid" data-testid="files-grid">
        {visibleItems.map((item, idx) => {
          const sizeLabel = formatFileSize(item.sizeBytes);
          const badgeClass =
            item.kind === 'summary'
              ? 'memphis-pill--solid-pink'
              : item.kind === 'pyq'
                ? 'memphis-pill--teal'
                : item.kind === 'plan'
                  ? 'memphis-pill--yellow'
                  : 'memphis-pill--pink';

          return (
            <ScrollReveal
              key={`${filter}-${item.id}`}
              variant="scale"
              delayIndex={idx}
              maxStagger={5}
              className={`files-card-reveal ${item.featured ? 'files-card-reveal--featured' : ''}`}
              immediate={filter !== 'all'}
            >
              <article
                className={`memphis-card file-card ${item.featured ? 'file-card--featured' : ''}`}
                data-testid={`file-card-${item.id}`}
              >
                <div className="file-card__main">
                  <div className="file-card__badges">
                    <span className={`memphis-pill ${badgeClass}`}>{item.badge}</span>
                    {mode === 'home' && (
                      <span className="memphis-pill">{item.subjectShortName}</span>
                    )}
                    {item.pageCount > 0 && (
                      <span className="memphis-pill">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                        {sizeLabel ? ` • ${sizeLabel}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="file-card__title-row">
                    <FileText size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <h3 className="file-card__title">{item.title}</h3>
                  </div>

                  {item.description && <p className="file-card__desc">{item.description}</p>}
                  <p className="file-card__filename">{item.filename}</p>
                </div>

                <div className="file-card__actions">
                  {item.openUrl && (
                    <a
                      href={item.openUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`memphis-btn mindmap-btn ${
                        item.featured ? 'memphis-btn--pink' : 'memphis-btn--yellow'
                      }`}
                      aria-label={`Open ${item.filename}`}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>Open</span>
                    </a>
                  )}
                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      download={item.filename}
                      className="memphis-btn mindmap-btn"
                      aria-label={`Download ${item.filename}`}
                    >
                      <Download size={14} aria-hidden="true" />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
}

