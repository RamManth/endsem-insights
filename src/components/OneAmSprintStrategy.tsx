import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Clock,
  ExternalLink,
  FileText,
  Flame,
  HelpCircle,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import type { SubjectRecord } from '../types/study';
import { ScrollReveal } from './ScrollReveal';

interface OneAmSprintStrategyProps {
  subject: SubjectRecord;
  onOpenChecklist?: () => void;
  onOpenFormulaDrawer?: () => void;
  onFocusModule?: (moduleId: string) => void;
}

interface SprintSlot {
  slotNumber: number;
  timeRange: string;
  durationMinutes: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  moduleNumber: number;
  moduleId: string;
  coCode: string;
  track: 'Networks' | 'Signals' | 'Review';
  title: string;
  slotMarks: number;
  cumulativeMarks: number;
  cumulativePercent: number;
  accent: 'pink' | 'teal' | 'yellow';
  headline: string;
  keyRepeats: {
    title: string;
    freq: string;
    solvedRef: string;
    slideRef: string;
  }[];
  fallbackIfLate: string;
}

const NAS_SPRINT_SLOTS: SprintSlot[] = [
  {
    slotNumber: 1,
    timeRange: '07:30 PM – 08:45 PM',
    durationMinutes: 75,
    startHour: 19,
    startMinute: 30,
    endHour: 20,
    endMinute: 45,
    moduleNumber: 5,
    moduleId: 'nas-m5',
    coCode: 'CO5',
    track: 'Signals',
    title: 'Module 5: Signals, CTFT & 2nd-Order LCCDE',
    slotMarks: 17,
    cumulativeMarks: 17,
    cumulativePercent: 34,
    accent: 'pink',
    headline: 'Highest Blueprint Return (17/50 marks) — Lock in 34% in your first 75 minutes',
    keyRepeats: [
      {
        title: '2nd-Order LCCDE Response: y\'\' + 3y\' + 2y = x\' + 2x for x(t)=e⁻²ᵗu(t)',
        freq: '3× in 3 exams',
        solvedRef: 'Solved PDF: Cluster #9 (pp. 18-20)',
        slideRef: 'NS_Module5_Rev1.pdf#page=50',
      },
      {
        title: 'Inverse CTFT X(jω) = 2 sin(ω) / [ω(jω + 1)] via Convolution Property',
        freq: '2× verbatim repeat',
        solvedRef: 'Solved PDF: Cluster #14 (p. 27)',
        slideRef: 'NS_Module5_Rev1.pdf#page=78',
      },
      {
        title: 'Downward Sawtooth CTFS x(t)=1-t on (0,1) & x(t)=t-1 on (0,2)',
        freq: '4× in 2 exams',
        solvedRef: 'Solved PDF: Cluster #12 (pp. 23-24)',
        slideRef: 'NS_Module5_Rev1.pdf#page=28',
      },
      {
        title: 'Line Spectra: |cₖ| and ∠cₖ for 1 + cos(2πt) + sin(3πt)',
        freq: '3× in 3 exams',
        solvedRef: 'Solved PDF: Cluster #11 (pp. 21-22)',
        slideRef: 'NS_Module5_Rev1.pdf#page=34',
      },
    ],
    fallbackIfLate:
      'If behind: Master the LCCDE partial fractions and memorize the piecewise inverse CTFT formula (t<-1, -1≤t≤1, t>1).',
  },
  {
    slotNumber: 2,
    timeRange: '08:45 PM – 10:00 PM',
    durationMinutes: 75,
    startHour: 20,
    startMinute: 45,
    endHour: 22,
    endMinute: 0,
    moduleNumber: 4,
    moduleId: 'nas-m4',
    coCode: 'CO4',
    track: 'Signals',
    title: 'Module 4: Laplace Transforms, Convolution & Signal Operations',
    slotMarks: 15,
    cumulativeMarks: 32,
    cumulativePercent: 64,
    accent: 'teal',
    headline: 'Crosses 64% Passing Threshold! Passing is guaranteed by 10:00 PM.',
    keyRepeats: [
      {
        title: 'Switched Laplace: Switch a → b at t=0, I(s) = -10/(s² + 3s + 2)',
        freq: '5/5 exams (9 sub-Qs)',
        solvedRef: 'Solved PDF: Cluster #4 (pp. 8-10)',
        slideRef: 'NS_Module4_Rev1.pdf#page=60',
      },
      {
        title: 'Continuous Convolution: [u(t+2)-u(t-2)] * [u(t-2)-u(t-4)] Overlap',
        freq: '4× in 4 exams',
        solvedRef: 'Solved PDF: Cluster #6 (pp. 11-13)',
        slideRef: 'NS_Module4_Rev1.pdf#page=42',
      },
      {
        title: 'Discrete-Time Convolution x₁[n] * x₂[n] with Arrow Index at n=0',
        freq: '3× in 3 exams',
        solvedRef: 'Solved PDF: Cluster #6 (p. 13)',
        slideRef: 'NS_Module4_Rev1.pdf#page=55',
      },
      {
        title: 'Signal Scaling/Shifting x(-0.5t + 3) & Derivative Sketches',
        freq: '4× in 2 exams',
        solvedRef: 'Solved PDF: Cluster #13 (pp. 25-26)',
        slideRef: 'NS_Module4_Rev1.pdf#page=20',
      },
    ],
    fallbackIfLate:
      'If behind: Drill the series RLC s-domain loop and the 5-point discrete convolution formula.',
  },
  {
    slotNumber: 3,
    timeRange: '10:00 PM – 10:45 PM',
    durationMinutes: 45,
    startHour: 22,
    startMinute: 0,
    endHour: 22,
    endMinute: 45,
    moduleNumber: 1,
    moduleId: 'nas-m1',
    coCode: 'CO1',
    track: 'Networks',
    title: 'Module 1: Circuit Theorems & Controlled Sources',
    slotMarks: 7,
    cumulativeMarks: 39,
    cumulativePercent: 78,
    accent: 'yellow',
    headline: 'Secure 78% First-Class Boundary — Dependent source theorems drilled fast',
    keyRepeats: [
      {
        title: 'Superposition Theorem with Controlled Sources (Vo = -0.125 V)',
        freq: '4× in 3 exams',
        solvedRef: 'Solved PDF: Cluster #8 (pp. 15-17)',
        slideRef: 'NAS_Module1_partA.pdf#page=38',
      },
      {
        title: 'Maximum Power Transfer with Controlled Sources (Find R_L & P_max)',
        freq: '3× in 3 exams',
        solvedRef: 'Solved PDF: Cluster #10 (pp. 19-20)',
        slideRef: 'NAS_Module1_partA.pdf#page=45',
      },
      {
        title: 'Supermesh Analysis: 36V / 2A Shared Current Source Branch',
        freq: 'Reused in Part A & Endsems',
        solvedRef: 'Solved PDF: Cluster #8 (p. 17)',
        slideRef: 'NAS_Module1_partA.pdf#page=28',
      },
    ],
    fallbackIfLate:
      'Golden Rule: Deactivate independent sources ONLY; controlled dependent sources must stay alive in all sub-circuits!',
  },
  {
    slotNumber: 4,
    timeRange: '10:45 PM – 11:30 PM',
    durationMinutes: 45,
    startHour: 22,
    startMinute: 45,
    endHour: 23,
    endMinute: 30,
    moduleNumber: 3,
    moduleId: 'nas-m3',
    coCode: 'CO2',
    track: 'Networks',
    title: 'Module 3: Transients & Initial Continuity Conditions',
    slotMarks: 6,
    cumulativeMarks: 45,
    cumulativePercent: 90,
    accent: 'pink',
    headline: 'Secure 90% Distinction — Master initial derivatives i(0⁺), di/dt(0⁺)',
    keyRepeats: [
      {
        title: 'Initial Derivatives: i(0⁺), v(0⁺), di/dt(0⁺), d²i/dt²(0⁺), i(∞)',
        freq: '9× in 5/5 exams (17m PYQ)',
        solvedRef: 'Solved PDF: Cluster #1 (pp. 2-4)',
        slideRef: 'NS_Module3A_Rev3.pdf#page=15',
      },
      {
        title: 'Switched RLC Transients: Complementary + Particular Solutions',
        freq: '6× in 5/5 exams (22m PYQ)',
        solvedRef: 'Solved PDF: Cluster #3 (pp. 7-8)',
        slideRef: 'NS_Module3B_Rev3.pdf#page=18',
      },
      {
        title: '1A Pulse Discharge: v(t) = 100e⁻¹⁰⁰ᵗ u(t) & Derivative Continuity',
        freq: '2× verbatim repeat',
        solvedRef: 'Solved PDF: Cluster #1 (p. 3)',
        slideRef: 'NS_Module3A_Rev3.pdf#page=32',
      },
    ],
    fallbackIfLate:
      'If behind: Write i_L(0⁺)=i_L(0⁻) and v_C(0⁺)=v_C(0⁻); use KVL at t=0⁺ with L di/dt = v_L to get the first derivative directly.',
  },
  {
    slotNumber: 5,
    timeRange: '11:30 PM – 12:15 AM',
    durationMinutes: 45,
    startHour: 23,
    startMinute: 30,
    endHour: 24,
    endMinute: 15,
    moduleNumber: 2,
    moduleId: 'nas-m2',
    coCode: 'CO3',
    track: 'Networks',
    title: 'Module 2: Two-Port Parameters & s-Domain Transfer Ratios',
    slotMarks: 5,
    cumulativeMarks: 50,
    cumulativePercent: 100,
    accent: 'teal',
    headline: '100% Full Syllabus Complete! Master the 7× repeated 1Ω-2Ω-2Ω-3I₁ circuit',
    keyRepeats: [
      {
        title: 'Two-Port Z & Y Parameters for 1Ω-2Ω-2Ω-3I₁ Controlled Network',
        freq: '7× in 5/5 exams (22m PYQ)',
        solvedRef: 'Solved PDF: Cluster #2 (pp. 5-6)',
        slideRef: 'NS_Module2_Rev2.pdf#page=14',
      },
      {
        title: 'T-to-Π Parameter Conversion Formulas (Z ↔ Y Equivalents)',
        freq: '3× in 3 exams (8m PYQ)',
        solvedRef: 'Solved PDF: Cluster #2 (p. 6)',
        slideRef: 'NS_Module2_Rev2.pdf#page=24',
      },
      {
        title: 'Ladder Transfer Ratios: V₂/V₁, I₂/I₁, V₁/I₁ via Recursive Ohm\'s Law',
        freq: '2× in 2 exams',
        solvedRef: 'Solved PDF: Cluster #4 (pp. 9-10)',
        slideRef: 'NS_Module2_Rev2.pdf#page=38',
      },
    ],
    fallbackIfLate:
      'If behind: Write KVL for loop 1 and loop 2 with dependent source to get Z matrix in 4 lines.',
  },
  {
    slotNumber: 6,
    timeRange: '12:15 AM – 01:00 AM',
    durationMinutes: 45,
    startHour: 24,
    startMinute: 15,
    endHour: 25,
    endMinute: 0,
    moduleNumber: 0,
    moduleId: 'audit',
    coCode: 'FINAL',
    track: 'Review',
    title: 'Final Sprint Audit: Solved PYQ Circuits & Formula Sheet Rapid-Fire',
    slotMarks: 50,
    cumulativeMarks: 50,
    cumulativePercent: 100,
    accent: 'yellow',
    headline: 'Consolidate & Verify: Review the 27-Page Solved Circuits PDF & Sleep Confident',
    keyRepeats: [
      {
        title: 'Audit All 14 Solved Question Clusters in the 27-Page Solved PDF',
        freq: '100% Verified',
        solvedRef: 'NAS_Repeated_Questions_Solved_With_Circuits.pdf',
        slideRef: '',
      },
      {
        title: 'Formula Sheet Flashcard Review (CTFT table, Two-Port conversions, Laplace pairs)',
        freq: 'Essential Reference',
        solvedRef: 'Formula Sheet Drawer',
        slideRef: '',
      },
      {
        title: 'Check off all remaining items in the Syllabus Completion Checklist',
        freq: 'Exam Readiness',
        solvedRef: 'Checklist Tab',
        slideRef: '',
      },
    ],
    fallbackIfLate:
      'Do NOT stay up past 1:00 AM cramming new topics. Rest your brain so circuit equations remain sharp in the exam hall.',
  },
];

function isSlotActive(slot: SprintSlot, now: Date): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const slotStart = slot.startHour * 60 + slot.startMinute;
  const slotEnd = slot.endHour * 60 + slot.endMinute;
  return currentMinutes >= slotStart && currentMinutes < slotEnd;
}

export function OneAmSprintStrategy({
  subject,
  onOpenChecklist,
  onOpenFormulaDrawer,
  onFocusModule,
}: OneAmSprintStrategyProps) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const solvedPdfUrl = `/study-files/${subject.folderName}/resources/NAS_Repeated_Questions_Solved_With_Circuits.pdf#page=1`;

  return (
    <section className="sprint-section" data-testid="one-am-sprint-strategy">
      <ScrollReveal variant="up">
        <div className="section-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <Flame size={22} aria-hidden="true" style={{ color: 'var(--pink)' }} />
            <h2 id="sprint-heading">1:00 AM Syllabus Completion Strategy</h2>
          </div>
          <span className="memphis-pill memphis-pill--solid-pink">
            6-SLOT CRASH ROADMAP
          </span>
        </div>

        {/* Hero Strategy Banner */}
        <div className="memphis-card sprint-hero-banner">
          <div className="sprint-hero-banner__left">
            <span className="memphis-pill memphis-pill--solid-yellow" style={{ marginBottom: '0.45rem' }}>
              PARETO SPRINT: 17m + 15m + 7m + 6m + 5m = 50 MARKS
            </span>
            <h3 style={{ fontSize: '1.25rem', lineHeight: 1.3 }}>
              Complete the entire NAS syllabus by 1:00 AM tonight in strict marks-per-hour priority order.
            </h3>
            <p style={{ marginTop: '0.45rem', fontSize: '0.9rem', color: 'var(--ink-muted)' }}>
              By putting <strong>Module 5 (17m)</strong> and <strong>Module 4 (15m)</strong> first,
              you lock in <strong>64% of all exam marks before 10:00 PM</strong>.
              Passing is guaranteed before you even touch circuit theorems!
            </p>
          </div>

          <div className="sprint-hero-banner__actions">
            {onOpenChecklist && (
              <button
                type="button"
                className="memphis-btn memphis-btn--teal"
                onClick={onOpenChecklist}
                data-testid="sprint-to-checklist-btn"
              >
                <CheckSquare size={15} aria-hidden="true" />
                <span>Open Syllabus Checklist</span>
              </button>
            )}

            {onOpenFormulaDrawer && (
              <button
                type="button"
                className="memphis-btn memphis-btn--yellow"
                onClick={onOpenFormulaDrawer}
              >
                <BookOpen size={15} aria-hidden="true" />
                <span>Formula Sheet</span>
              </button>
            )}

            <a
              href={solvedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="memphis-btn memphis-btn--pink"
              style={{ textDecoration: 'none' }}
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>Solved Circuits PDF (27p)</span>
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </ScrollReveal>

      {/* Progress Milestones Strip */}
      <div className="sprint-milestones-card memphis-card" data-testid="sprint-milestones">
        <h4 style={{ fontSize: '0.88rem', fontFamily: 'var(--font-mono)', marginBottom: '0.75rem' }}>
          HOURLY MARKS ACCUMULATION MILESTONES:
        </h4>
        <div className="sprint-milestones-track">
          {NAS_SPRINT_SLOTS.map((slot) => (
            <div key={slot.slotNumber} className="sprint-milestone-step">
              <div className={`milestone-badge milestone-badge--${slot.accent}`}>
                #{slot.slotNumber}
              </div>
              <div className="milestone-info">
                <strong className="milestone-time">{slot.timeRange.split('–')[1].trim()}</strong>
                <span className="milestone-marks">{slot.cumulativeMarks} / 50 marks</span>
                <span className="milestone-pct">{slot.cumulativePercent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6 Timeline Slots */}
      <div className="sprint-timeline-slots">
        {NAS_SPRINT_SLOTS.map((slot) => {
          const active = isSlotActive(slot, now);

          return (
            <article
              key={slot.slotNumber}
              className={`memphis-card sprint-slot-card ${
                active ? 'sprint-slot-card--active' : ''
              }`}
              data-testid={`sprint-slot-${slot.slotNumber}`}
            >
              <div className="sprint-slot-card__top">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className={`memphis-pill memphis-pill--solid-${slot.accent}`}>
                    SLOT #{slot.slotNumber}
                  </span>
                  <span className="memphis-pill memphis-pill--black">
                    <Clock size={11} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
                    {slot.timeRange} ({slot.durationMinutes}m)
                  </span>
                  {active && (
                    <span className="memphis-pill memphis-pill--solid-pink sprint-pulse">
                      <Zap size={11} aria-hidden="true" style={{ marginRight: '0.2rem' }} />
                      ACTIVE NOW
                    </span>
                  )}
                  <h3 style={{ fontSize: '1.08rem', margin: 0 }}>{slot.title}</h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span className="memphis-pill memphis-pill--yellow">
                    +{slot.slotMarks} Marks Unlocked
                  </span>
                  <span className="memphis-pill">
                    Cumulative: {slot.cumulativeMarks}/50 ({slot.cumulativePercent}%)
                  </span>
                </div>
              </div>

              <p className="sprint-slot-headline">{slot.headline}</p>

              <div className="sprint-slot-body">
                <div className="sprint-repeats-col">
                  <h4 className="sprint-col-title">MUST-MASTER PYQ REPEAT DRILLS:</h4>
                  <ul className="sprint-repeats-list">
                    {slot.keyRepeats.map((repeat, idx) => (
                      <li key={idx} className="sprint-repeat-item">
                        <div className="sprint-repeat-item__main">
                          <strong>{repeat.title}</strong>
                          <span className="memphis-pill" style={{ marginLeft: '0.4rem', fontSize: '0.68rem' }}>
                            {repeat.freq}
                          </span>
                        </div>
                        <div className="sprint-repeat-item__links">
                          {repeat.solvedRef && (
                            <span className="sprint-ref-pill">
                              <Sparkles size={11} aria-hidden="true" />
                              {repeat.solvedRef}
                            </span>
                          )}
                          {repeat.slideRef && (
                            <span className="sprint-ref-pill">
                              <FileText size={11} aria-hidden="true" />
                              {repeat.slideRef}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="sprint-fallback-col">
                  <div className="sprint-fallback-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                      <HelpCircle size={15} aria-hidden="true" style={{ color: 'var(--pink)' }} />
                      <strong style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                        RUNNING BEHIND SCHEDULE?
                      </strong>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>{slot.fallbackIfLate}</p>
                  </div>

                  {onFocusModule && slot.moduleNumber > 0 && (
                    <button
                      type="button"
                      className="memphis-btn mindmap-btn"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '0.65rem' }}
                      onClick={() => onFocusModule(slot.moduleId)}
                    >
                      <span>Inspect Module in Mind Map</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Emergency Golden Rules Card */}
      <div className="memphis-card sprint-emergency-card" data-testid="sprint-emergency-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.55rem' }}>
          <Trophy size={20} aria-hidden="true" style={{ color: 'var(--yellow)' }} />
          <h3 style={{ fontSize: '1.05rem', margin: 0 }}>The 3 Golden Rules to Finish by 1:00 AM</h3>
        </div>
        <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', display: 'grid', gap: '0.45rem' }}>
          <li>
            <strong>Skip long theoretical derivations:</strong> Focus 100% on template circuit numericals.
            Every exam question has repeated the same 14 templates verbatim or with changed resistor values.
          </li>
          <li>
            <strong>Use the Solved Circuits PDF as your answer key:</strong> Check your steps against
            <code>NAS_Repeated_Questions_Solved_With_Circuits.pdf</code> where all KCL, KVL, ODEs, and integrals
            have been Python-verified.
          </li>
          <li>
            <strong>Hard cutoff at 1:00 AM:</strong> Sleep is a cognitive multiplier for circuit analysis.
            Do not stay up till 4 AM making silly sign errors on KCL or Laplace partial fractions!
          </li>
        </ol>
      </div>
    </section>
  );
}
