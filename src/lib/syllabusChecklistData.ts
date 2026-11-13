import type { SubjectRecord } from '../types/study';

export interface SyllabusChecklistItem {
  id: string;
  moduleId: string;
  moduleNumber: number;
  coCode: string;
  track: 'Networks' | 'Signals';
  title: string;
  marks: number;
  pyqFrequency?: string;
  priority: '1am-core' | 'quick-win' | 'revision';
  estMinutes: number;
  keyConcept: string;
  sourceFile: string;
  page?: number;
  solvedPdfRef?: string;
}

export const NAS_CHECKLIST_ITEMS: SyllabusChecklistItem[] = [
  // ==========================================
  // MODULE 5: SIGNALS & CTFT (17 Marks - #1 Priority)
  // ==========================================
  {
    id: 'chk-m5-lccde',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: '2nd-Order LCCDE System Response: H(jω), h(t), y(t) for e⁻²ᵗu(t)',
    marks: 17,
    pyqFrequency: '3× in 3 exams (13m PYQ)',
    priority: '1am-core',
    estMinutes: 30,
    keyConcept: 'Take CTFT of ODE, factor denominator, check pole-zero cancellation (s+2), inverse CTFT partial fractions',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 50,
    solvedPdfRef: 'Cluster #9 (pp. 18-20)',
  },
  {
    id: 'chk-m5-inv-ctft',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'Inverse CTFT of X(jω) = 2 sin(ω) / [ω(jω + 1)] via Convolution',
    marks: 8,
    pyqFrequency: '2× verbatim repeat (8m PYQ)',
    priority: '1am-core',
    estMinutes: 25,
    keyConcept: 'Split into rect g(t) = u(t+1)-u(t-1) and h(t) = e⁻ᵗu(t); convolve piecewise for t < -1, -1 ≤ t ≤ 1, t > 1',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 78,
    solvedPdfRef: 'Cluster #14 (p. 27)',
  },
  {
    id: 'chk-m5-sawtooth-ctfs',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'Periodic Waveform CTFS: Downward Sawtooth x(t)=1-t & x(t)=t-1',
    marks: 16,
    pyqFrequency: '4× in 2 exams (16m PYQ)',
    priority: '1am-core',
    estMinutes: 25,
    keyConcept: 'x(t)=1-t on (0,1): c₀=0.5, cₖ=-j/(2πk); x(t)=t-1 on (0,2): T₀=2s, odd symmetry gives a₀=aₙ=0, bₙ=-2/(nπ)',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 28,
    solvedPdfRef: 'Cluster #12 (pp. 23-24)',
  },
  {
    id: 'chk-m5-spectrum',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'Line Spectra Sketching: Magnitude |cₖ| & Phase ∠cₖ for Sum-of-Sinusoids',
    marks: 10,
    pyqFrequency: '3× in 3 exams (10m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: 'Rewrite sin/cos in Euler form; find fundamental ω₀; identify double-sided cₖ pairs and plot stems',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 34,
    solvedPdfRef: 'Cluster #11 (pp. 21-22)',
  },
  {
    id: 'chk-m5-properties',
    moduleId: 'nas-m5',
    moduleNumber: 5,
    coCode: 'CO5',
    track: 'Signals',
    title: 'CTFT Properties: Time Shifting, Differentiation dx/dt, and Duality',
    marks: 10,
    pyqFrequency: '5/5 exams reference',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'dx/dt ↔ jωX(jω); x(t-t₀) ↔ X(jω)e⁻ʲʷᵗ⁰; Parseval energy integral ∫|x(t)|²dt = (1/2π)∫|X(jω)|²dω',
    sourceFile: 'NS_Module5_Rev1.pdf',
    page: 78,
    solvedPdfRef: 'Formula Sheet: CTFT Table',
  },

  // ==========================================
  // MODULE 4: LAPLACE & CONVOLUTIONS (15 Marks - #2 Priority)
  // ==========================================
  {
    id: 'chk-m4-ct-conv',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Continuous-Time Convolution: Pulse Overlaps & Impulse Differences',
    marks: 17,
    pyqFrequency: '4× in 4 exams (17m PYQ)',
    priority: '1am-core',
    estMinutes: 25,
    keyConcept: 'x(t)*h(t) = ∫x(τ)h(t-τ)dτ; identify flip-and-shift intervals, triangular/trapezoidal output limits',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 42,
    solvedPdfRef: 'Cluster #6 (pp. 11-13)',
  },
  {
    id: 'chk-m4-dt-conv',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Discrete-Time Convolution: x₁[n] * x₂[n] with Arrow Origin Indexing',
    marks: 8,
    pyqFrequency: '3× in 3 exams (10m PYQ)',
    priority: '1am-core',
    estMinutes: 15,
    keyConcept: 'Track arrow at n=0; range n_min = n₁_min + n₂_min; use sliding strip / tabular multiplication',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 55,
    solvedPdfRef: 'Cluster #6 (p. 13)',
  },
  {
    id: 'chk-m4-signal-ops',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Signal Transformations: x(at + b) & Derivative/Integral Signal Sketches',
    marks: 12,
    pyqFrequency: '4× in 2 exams (12m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: 'Map breakpoints u = at + b ⇒ t = (u - b)/a; sign inversion reverses order; box integrates to ramp',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 20,
    solvedPdfRef: 'Cluster #13 (pp. 25-26)',
  },
  {
    id: 'chk-m4-periodicity-power',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'Periodicity & Power vs Energy for 2cos(πt)sin(3πt) & cos²(2πt)',
    marks: 11,
    pyqFrequency: '4× in 4 exams (11m PYQ)',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'Sum of periodic CT signals is periodic iff ratio of periods is rational; average power P = ∑|cₖ|²',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 12,
    solvedPdfRef: 'Cluster #7 (p. 14)',
  },
  {
    id: 'chk-m4-system-properties',
    moduleId: 'nas-m4',
    moduleNumber: 4,
    coCode: 'CO4',
    track: 'Signals',
    title: 'LTI System Properties: Memory, Invertibility, Causality & BIBO Stability',
    marks: 11,
    pyqFrequency: '5× in 4 exams (11m PYQ)',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'y(t)=t²x(t) is memoryless, non-invertible at t=0, causal, unstable; y(t)=x(t)-x(t-2) has memory',
    sourceFile: 'NS_Module4_Rev1.pdf',
    page: 26,
    solvedPdfRef: 'Cluster #5 (p. 10)',
  },

  // ==========================================
  // MODULE 1: NETWORK THEOREMS & DEPENDENT SOURCES (7 Marks - #3 Priority)
  // ==========================================
  {
    id: 'chk-m1-superposition',
    moduleId: 'nas-m1',
    moduleNumber: 1,
    coCode: 'CO1',
    track: 'Networks',
    title: 'Superposition Theorem with Controlled / Dependent Sources',
    marks: 10,
    pyqFrequency: '4× in 3 exams (10m PYQ)',
    priority: '1am-core',
    estMinutes: 25,
    keyConcept: 'Deactivate independent sources one by one; DEPENDENT SOURCES MUST NEVER BE DEACTIVATED!',
    sourceFile: 'NAS_Module1_partA.pdf',
    page: 38,
    solvedPdfRef: 'Cluster #8 (pp. 15-17)',
  },
  {
    id: 'chk-m1-mpt',
    moduleId: 'nas-m1',
    moduleNumber: 1,
    coCode: 'CO1',
    track: 'Networks',
    title: 'Maximum Power Transfer Theorem with Controlled Sources (Find R_L & P_max)',
    marks: 13,
    pyqFrequency: '3× in 3 exams (13m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: 'R_L = R_th; find R_th = V_oc / I_sc or apply 1V test source; P_max = V_th² / (4 R_L)',
    sourceFile: 'NAS_Module1_partA.pdf',
    page: 45,
    solvedPdfRef: 'Cluster #10 (pp. 19-20)',
  },
  {
    id: 'chk-m1-supermesh',
    moduleId: 'nas-m1',
    moduleNumber: 1,
    coCode: 'CO1',
    track: 'Networks',
    title: 'Supermesh & Supernode Matrix Formulations (36V / 2A Branch Circuit)',
    marks: 8,
    pyqFrequency: 'Reused in Part A & Endsems',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'Form supermesh around shared current source; write auxiliary constraint i₂ - i₁ = 2A',
    sourceFile: 'NAS_Module1_partA.pdf',
    page: 28,
    solvedPdfRef: 'Cluster #8 (p. 17)',
  },

  // ==========================================
  // MODULE 3: INITIAL CONDITIONS & TRANSIENTS (6 Marks - #4 Priority)
  // ==========================================
  {
    id: 'chk-m3-init-cond',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO2',
    track: 'Networks',
    title: 'Initial & Final Values: i(0⁺), v(0⁺), di/dt(0⁺), d²i/dt²(0⁺), i(∞)',
    marks: 17,
    pyqFrequency: '9× in 5/5 exams (17m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: 'Inductor current i_L and capacitor voltage v_C are continuous across t=0; use KVL at t=0⁺ to get derivatives',
    sourceFile: 'NS_Module3A_Rev3.pdf',
    page: 15,
    solvedPdfRef: 'Cluster #1 (pp. 2-4)',
  },
  {
    id: 'chk-m3-transients-ode',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO2',
    track: 'Networks',
    title: 'Switched RLC Transients: Total Response = Complementary + Particular',
    marks: 22,
    pyqFrequency: '6× in 5/5 exams (22m PYQ)',
    priority: '1am-core',
    estMinutes: 25,
    keyConcept: 'Write 2nd-order ODE; characteristic equation s² + 2αs + ω₀² = 0; check overdamped, critically damped, or underdamped',
    sourceFile: 'NS_Module3B_Rev3.pdf',
    page: 18,
    solvedPdfRef: 'Cluster #3 (pp. 7-8)',
  },
  {
    id: 'chk-m3-discharge-pulse',
    moduleId: 'nas-m3',
    moduleNumber: 3,
    coCode: 'CO2',
    track: 'Networks',
    title: '1A Pulse Discharge: v(t) = 100e⁻¹⁰⁰ᵗ u(t) & Derivative Continuity',
    marks: 10,
    pyqFrequency: '2× verbatim repeat',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'Parallel 100Ω and 1H; v(0⁺)=100V, dv/dt(0⁺) = -10⁴ V/s, d²v/dt²(0⁺) = +10⁶ V/s²',
    sourceFile: 'NS_Module3A_Rev3.pdf',
    page: 32,
    solvedPdfRef: 'Cluster #1 (p. 3)',
  },

  // ==========================================
  // MODULE 2: TWO-PORT NETWORKS & S-DOMAIN (5 Marks - #5 Priority)
  // ==========================================
  {
    id: 'chk-m2-twoport-params',
    moduleId: 'nas-m2',
    moduleNumber: 2,
    coCode: 'CO3',
    track: 'Networks',
    title: 'Two-Port Z and Y Parameters for 1Ω-2Ω-2Ω-3I₁ Controlled Network',
    marks: 22,
    pyqFrequency: '7× in 5/5 exams (22m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: '7× repeat! Set I₂=0 to find Z₁₁, Z₂₁; set I₁=0 to find Z₁₂, Z₂₂; invert Z to get Y = Z⁻¹',
    sourceFile: 'NS_Module2_Rev2.pdf',
    page: 14,
    solvedPdfRef: 'Cluster #2 (pp. 5-6)',
  },
  {
    id: 'chk-m2-t-to-pi',
    moduleId: 'nas-m2',
    moduleNumber: 2,
    coCode: 'CO3',
    track: 'Networks',
    title: 'T-to-Π Equivalent Parameter Conversions (Z ↔ Y Equivalence)',
    marks: 8,
    pyqFrequency: '3× in 3 exams (8m PYQ)',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'R_a = Δz / z₂₂, R_b = Δz / z₁₂, R_c = Δz / z₁₁; or direct Y-Δ resistor formulas',
    sourceFile: 'NS_Module2_Rev2.pdf',
    page: 24,
    solvedPdfRef: 'Cluster #2 (p. 6)',
  },
  {
    id: 'chk-m2-laplace-switch',
    moduleId: 'nas-m2',
    moduleNumber: 2,
    coCode: 'CO3',
    track: 'Networks',
    title: 's-Domain Switched Analysis: Switch a → b, Laplace Norton & I(s)',
    marks: 32,
    pyqFrequency: '5/5 exams (9 sub-Qs, 32m PYQ)',
    priority: '1am-core',
    estMinutes: 20,
    keyConcept: 'Replace components with sL and 1/sC + initial conditions; find I(s) = -10/((s+1)(s+2)); inverse Laplace gives -10(e⁻ᵗ - e⁻²ᵗ)u(t)',
    sourceFile: 'NS_Module2_Rev2.pdf',
    page: 32,
    solvedPdfRef: 'Cluster #4 (pp. 8-10)',
  },
  {
    id: 'chk-m2-ladder-ratios',
    moduleId: 'nas-m2',
    moduleNumber: 2,
    coCode: 'CO3',
    track: 'Networks',
    title: 'Ladder Transfer Ratios: V₂/V₁, I₂/I₁, V₁/I₁ via Recursive Impedances',
    marks: 16,
    pyqFrequency: '2× in 2 exams (16m PYQ)',
    priority: 'quick-win',
    estMinutes: 15,
    keyConcept: 'Assume output V₂ or I₂ = 1; work backwards to input V₁; take direct ratios without matrix inversion',
    sourceFile: 'NS_Module2_Rev2.pdf',
    page: 38,
    solvedPdfRef: 'Cluster #4 (pp. 9-10)',
  },
];

export function getChecklistForSubject(subject: SubjectRecord): SyllabusChecklistItem[] {
  if (subject.id.toLowerCase() === 'nas') {
    return NAS_CHECKLIST_ITEMS;
  }

  // Fallback for generic subject
  const items: SyllabusChecklistItem[] = [];
  for (const mod of subject.modules) {
    for (const group of mod.topicGroups) {
      items.push({
        id: `chk-${mod.id}-${group.id}`,
        moduleId: mod.id,
        moduleNumber: mod.moduleNumber,
        coCode: mod.coCode,
        track: (mod.track as 'Networks' | 'Signals') || 'Networks',
        title: group.title,
        marks: Math.round(mod.weightage / Math.max(1, mod.topicGroups.length)),
        priority: group.priority === 'high-yield' ? '1am-core' : 'quick-win',
        estMinutes: 20,
        keyConcept: `Review ${group.title} in ${group.sourceFile} (${group.sourceRef})`,
        sourceFile: group.sourceFile,
      });
    }
  }
  return items;
}

