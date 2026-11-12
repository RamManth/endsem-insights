import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import generatedData from '../data/study-data.generated.json';
import { App } from '../App';
import { buildMindMapTree, computeMindMapLayout, getInitialExpandedIds } from '../lib/mindMapBuilder';
import { parseAndValidateStudyDataset } from '../lib/studyParser';

describe('mindMapBuilder', () => {
  it('creates a collision-free center-outward layout and toggles branch expansion', () => {
    const { dataset } = parseAndValidateStudyDataset(generatedData);
    const nas = dataset.subjects.find((s) => s.id === 'nas')!;

    const tree = buildMindMapTree(nas, 'weightage');
    expect(tree.children).toHaveLength(5);

    const initialExpanded = getInitialExpandedIds(tree);
    const layout1 = computeMindMapLayout(tree, initialExpanded);

    const rootNode = layout1.nodes.find((n) => n.data.level === 0)!;
    const leftNodes = layout1.nodes.filter((n) => n.direction === 'left');
    const rightNodes = layout1.nodes.filter((n) => n.direction === 'right');

    expect(rootNode).toBeDefined();
    expect(leftNodes.length).toBeGreaterThan(0);
    expect(rightNodes.length).toBeGreaterThan(0);
    expect(leftNodes.every((n) => n.x + n.width < rootNode.x)).toBe(true);
    expect(rightNodes.every((n) => n.x > rootNode.x + rootNode.width)).toBe(true);

    // Collapse Module 5 and confirm visible node count decreases cleanly
    const collapsed = new Set(initialExpanded);
    collapsed.delete('nas-m5');
    const layout2 = computeMindMapLayout(tree, collapsed);
    expect(layout2.nodes.length).toBeLessThan(layout1.nodes.length);
  });
});

describe('App navigation & subject views', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
    // Flush any queued jsdom hashchange tasks from previous tests before mounting
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('renders the home prompt with 3 subject cards and navigates to NAS and back', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    expect(
      screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
    ).toBeInTheDocument();

    expect(screen.getByTestId('subject-card-nas')).toBeInTheDocument();
    expect(screen.getByTestId('subject-card-math-iii')).toBeInTheDocument();
    expect(screen.getByTestId('subject-card-snt')).toBeInTheDocument();

    // Navigate to NAS in 1 click
    fireEvent.click(screen.getByTestId('subject-card-nas'));

    expect(screen.getByTestId('subject-view-nas')).toBeInTheDocument();
    expect(screen.getByTestId('mindmap-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('module-rankings')).not.toBeInTheDocument();

    // Verify mind map branch expand/collapse toggle & Branch Outline switch
    const toggleM3 = screen.getByTestId('mindmap-toggle-nas-m3');
    expect(toggleM3).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggleM3);
    expect(toggleM3).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Branch Outline/i }));
    expect(screen.getByTestId('mindmap-outline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Mind Map$/i }));

    // Switch to Rankings tab -> verifies forward gravity transition + descending order
    fireEvent.click(screen.getByTestId('dash-tab-rankings'));
    expect(screen.getByTestId('tabpanel-rankings')).toHaveAttribute('data-gravity-direction', 'right');
    const rankingsSection = screen.getByTestId('module-rankings');
    const rankedCards = within(rankingsSection).getAllByTestId(/^ranked-module-nas-m/);
    expect(rankedCards.map((el) => el.getAttribute('data-testid'))).toEqual([
      'ranked-module-nas-m5',
      'ranked-module-nas-m4',
      'ranked-module-nas-m1',
      'ranked-module-nas-m3',
      'ranked-module-nas-m2',
    ]);

    // Switch to Study Plan tab -> verifies strategy presets
    fireEvent.click(screen.getByTestId('dash-tab-strategy'));
    expect(screen.getByTestId('tabpanel-strategy')).toHaveAttribute('data-gravity-direction', 'right');
    const strategySection = screen.getByTestId('study-strategy');
    expect(within(strategySection).getByText(/64% of marks first/i)).toBeInTheDocument();
    fireEvent.click(within(strategySection).getByRole('button', { name: /6h \(Sprint\)/i }));
    expect(within(strategySection).getByText(/Custom: 6h/i)).toBeInTheDocument();

    // Switching back to Mind Map triggers backward gravity direction
    fireEvent.click(screen.getByTestId('dash-tab-mindmap'));
    expect(screen.getByTestId('tabpanel-mindmap')).toHaveAttribute('data-gravity-direction', 'left');

    // Navigate back home in 1 click
    fireEvent.click(screen.getByRole('button', { name: /Back to Subjects/i }));
    expect(
      screen.getByRole('heading', { name: /Which subject do you want to study today\?/i })
    ).toBeInTheDocument();
  });

  it('supports live readiness tracking, track filters, Cmd+K topic search, PDF page links, and Formula Sheet drawer', () => {
    render(<App rawData={generatedData} initialHash="#/subject/nas" />);

    expect(screen.getByTestId('subject-readiness-pill')).toHaveTextContent(
      '0 / 50 marks ready (0%)'
    );

    // Select M5 node and mark it done -> live readiness jumps by 17 marks
    fireEvent.click(screen.getByTestId('mindmap-node-nas-m5'));
    const inspector = screen.getByTestId('mindmap-inspector');
    fireEvent.click(within(inspector).getByRole('button', { name: /Mark Done/i }));

    expect(screen.getByTestId('subject-readiness-pill')).toHaveTextContent(
      '17 / 50 marks ready (34%)'
    );
    expect(screen.getByText(/CO4–5 Signals: 17\/32 marks/i)).toBeInTheDocument();

    // Filter to Networks (CO1–3) -> M5 node wrapper becomes dimmed, M1 stays active
    fireEvent.click(screen.getByTestId('filter-networks'));
    const m5Wrap = screen.getByTestId('mindmap-node-nas-m5').closest('.mm-node-wrap');
    const m1Wrap = screen.getByTestId('mindmap-node-nas-m1').closest('.mm-node-wrap');
    expect(m5Wrap?.className).toContain('mm-node-wrap--dimmed');
    expect(m1Wrap?.className).not.toContain('mm-node-wrap--dimmed');

    // Quick search for Supernode -> opens dropdown, expands ancestors & provides exact #page= PDF link
    const searchInput = screen.getByTestId('mindmap-search-input');
    fireEvent.change(searchInput, { target: { value: 'Supernode' } });
    const dropdown = screen.getByTestId('mindmap-search-results');
    const firstResult = within(dropdown).getAllByRole('option')[0];
    fireEvent.click(firstResult);

    expect(screen.getByTestId('mindmap-toggle-nas-m1')).toHaveAttribute('aria-expanded', 'true');
    const openPdfLink = screen.getByTestId('mindmap-open-pdf');
    expect(openPdfLink).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/study-files\/NAS\/NAS_Module1_partA\.pdf#page=\d+$/)
    );

    // Formula Sheet drawer opens, filters cleanly, and exposes verified #page= links
    fireEvent.click(screen.getByTestId('open-formula-sheet-btn'));
    const drawer = screen.getByTestId('formula-drawer');
    expect(within(drawer).getByText('CTFT Properties Table')).toBeInTheDocument();
    expect(
      within(drawer).getByRole('link', { name: /Open CTFT Properties Table at page 78/i })
    ).toHaveAttribute('href', '/study-files/NAS/NS_Module5_Rev1.pdf#page=78');

    fireEvent.click(within(drawer).getByRole('button', { name: 'CO1–3 Networks' }));
    expect(within(drawer).queryByText('CTFT Properties Table')).not.toBeInTheDocument();
    expect(within(drawer).getByText('Two-Port Summary & Conversions')).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: /Close formula sheet/i }));
    expect(screen.queryByTestId('formula-drawer')).not.toBeInTheDocument();

    // Verify readiness score carries onto the Home card
    fireEvent.click(screen.getByRole('button', { name: /Back to Subjects/i }));
    expect(screen.getByTestId('home-readiness-nas')).toHaveTextContent('17 / 50 marks ready');
  });

  it('renders separate Repeated Questions and Repeated Topics lists in PYQ Strategy tab with PDF links', () => {
    render(<App rawData={generatedData} initialHash="#/subject/nas" />);

    fireEvent.click(screen.getByTestId('dash-tab-pyq'));
    expect(screen.getByTestId('tabpanel-pyq')).toHaveAttribute('data-gravity-direction', 'right');
    const pyqSection = screen.getByTestId('pyq-reverse-strategy');
    expect(within(pyqSection).getByTestId('pyq-stats-grid')).toHaveTextContent('93');
    expect(within(pyqSection).getByTestId('pyq-stats-grid')).toHaveTextContent('5');

    const questionsList = within(pyqSection).getByTestId('pyq-repeated-questions-list');
    const topicsList = within(pyqSection).getByTestId('pyq-repeated-topics-list');

    expect(questionsList).toBeInTheDocument();
    expect(topicsList).toBeInTheDocument();

    // Check Two-Port exact-circuit repeat count & PDF page jump
    const twoPortCard = within(questionsList).getByTestId('pyq-question-pyq-q-twoport-3i1');
    expect(twoPortCard).toHaveTextContent('7×');
    expect(twoPortCard).toHaveTextContent('in 5/5 exams');
    expect(
      within(twoPortCard).getByRole('link', { name: /Mar 2021 Q3A \(5m\) • p\.3/i })
    ).toHaveAttribute(
      'href',
      '/study-files/NAS/pyq/Network%20Analysis%20and%20Signals%20(ICE%202154).pdf#page=3'
    );

    // Filter to Signals (CO4-5) only -> CO3 Two-Port question disappears, CO5 LCCDE remains
    fireEvent.click(within(pyqSection).getByTestId('pyq-filter-Signals'));
    expect(within(questionsList).queryByTestId('pyq-question-pyq-q-twoport-3i1')).not.toBeInTheDocument();
    expect(within(questionsList).getByTestId('pyq-question-pyq-q-lccde-system')).toBeInTheDocument();
    expect(within(topicsList).getByTestId('pyq-topic-pyq-t-fourier-ctft')).toBeInTheDocument();
  });

  it('navigates to MATH III and SNT via Home without subject switchers in TopNav', () => {
    render(<App rawData={generatedData} initialHash="#/" />);

    const nav = screen.getByRole('navigation', { name: /Workspace navigation/i });
    expect(within(nav).queryByRole('button', { name: /NAS/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /MATH III/i })).not.toBeInTheDocument();
    expect(within(nav).queryByRole('button', { name: /SNT/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('subject-card-math-iii'));
    const errorCard = screen.getByTestId('subject-error-state');
    expect(errorCard).toBeInTheDocument();
    expect(within(errorCard).getByText(/MATH III has no study material yet/i)).toBeInTheDocument();

    // Still no subject switching pills in TopNav when viewing a subject
    expect(within(nav).queryByRole('button', { name: /SNT/i })).not.toBeInTheDocument();

    // Return to Home via TopNav All Subjects button, then open SNT
    fireEvent.click(within(nav).getByTestId('topnav-home-btn'));
    fireEvent.click(screen.getByTestId('subject-card-snt'));
    expect(screen.getByText(/SNT has no study material yet/i)).toBeInTheDocument();
  });

  it('handles unknown subject routes and malformed datasets gracefully', () => {
    const { unmount } = render(<App rawData={generatedData} initialHash="#/subject/unknown-xyz" />);
    expect(screen.getByTestId('subject-error-state')).toBeInTheDocument();
    expect(screen.getByText(/Subject "unknown-xyz" was not found/i)).toBeInTheDocument();
    unmount();

    render(<App rawData={{ invalid: true }} initialHash="#/" />);
    expect(screen.getByTestId('fatal-data-error')).toBeInTheDocument();
  });

  it('activates scroll progress indicator and back-to-top floating dock cleanly on scroll', async () => {
    render(<App rawData={generatedData} initialHash="#/subject/nas" />);

    expect(screen.getByTestId('scroll-progress-fill')).toBeInTheDocument();
    const dock = screen.getByTestId('floating-scroll-nav');
    expect(dock).toHaveAttribute('aria-hidden', 'true');

    // Simulate scrolling down past subject header
    Object.defineProperty(window, 'scrollY', { value: 420, configurable: true, writable: true });
    fireEvent.scroll(window);

    await waitFor(() => {
      expect(dock).toHaveAttribute('aria-hidden', 'false');
    });
    expect(dock.className).toContain('floating-scroll-dock--visible');

    fireEvent.click(within(dock).getByRole('button', { name: /Scroll smoothly back to top/i }));
  });

  it('renders tabbed Files Library on Home and Files tab on NAS with gravity transitions and PDF links', () => {
    const { unmount } = render(<App rawData={generatedData} initialHash="#/" />);

    // Home starts compactly on Subjects tab
    expect(screen.getByTestId('subject-card-nas')).toBeInTheDocument();
    expect(screen.queryByTestId('files-section')).not.toBeInTheDocument();

    // Switch Home to Files Library tab with gravity transition
    fireEvent.click(screen.getByTestId('home-tab-files'));
    expect(screen.getByTestId('tabpanel-files')).toHaveAttribute('data-gravity-direction', 'right');

    const homeFiles = screen.getByTestId('files-section');
    expect(within(homeFiles).getByText('NAS Repeated Questions PYQ List')).toBeInTheDocument();
    expect(within(homeFiles).getByText('NAS Repeated PYQs — Solved With Circuits')).toBeInTheDocument();
    expect(
      within(homeFiles).getByRole('link', { name: /Open NAS_Repeated_Questions_PYQ_List\.pdf/i })
    ).toHaveAttribute('href', '/study-files/NAS/resources/NAS_Repeated_Questions_PYQ_List.pdf#page=1');
    expect(
      within(homeFiles).getByRole('link', { name: /Download NAS_Repeated_Questions_PYQ_List\.pdf/i })
    ).toHaveAttribute('href', '/study-files/NAS/resources/NAS_Repeated_Questions_PYQ_List.pdf');
    expect(
      within(homeFiles).getByRole('link', {
        name: /Open NAS_Repeated_Questions_Solved_With_Circuits\.pdf/i,
      })
    ).toHaveAttribute(
      'href',
      '/study-files/NAS/resources/NAS_Repeated_Questions_Solved_With_Circuits.pdf#page=1'
    );
    expect(
      within(homeFiles).getByRole('link', {
        name: /Download NAS_Repeated_Questions_Solved_With_Circuits\.pdf/i,
      })
    ).toHaveAttribute(
      'href',
      '/study-files/NAS/resources/NAS_Repeated_Questions_Solved_With_Circuits.pdf'
    );

    // Filter to Repeat List & Guides only
    fireEvent.click(within(homeFiles).getByTestId('files-filter-summary'));
    expect(within(homeFiles).getByText('NAS Repeated Questions PYQ List')).toBeInTheDocument();
    expect(within(homeFiles).getByText('NAS Repeated PYQs — Solved With Circuits')).toBeInTheDocument();
    expect(within(homeFiles).queryByText('Mar 2021 Endsem (ICE 2154)')).not.toBeInTheDocument();

    unmount();

    render(<App rawData={generatedData} initialHash="#/subject/nas" />);
    fireEvent.click(screen.getByTestId('jump-files-btn'));
    expect(screen.getByTestId('tabpanel-files')).toHaveAttribute('data-gravity-direction', 'right');
    const subjFiles = screen.getByTestId('files-section');
    expect(within(subjFiles).getByText('NAS Repeated Questions PYQ List')).toBeInTheDocument();
    expect(within(subjFiles).getByText('NAS Repeated PYQs — Solved With Circuits')).toBeInTheDocument();
  });
});
