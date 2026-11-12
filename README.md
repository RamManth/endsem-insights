# Endsem Insights — Study Planner & Interactive Mind Map

A responsive, single-page Memphis-styled end-semester study planner built with **React**, **TypeScript**, and **Vite**, backed by a Python PDF/folder ingestion pipeline.

---

## Quick Start

### Prerequisites
- **Node.js** (`>= 20`) and **npm**
- **Python 3** (`>= 3.10`) with [`pypdf`](https://pypi.org/project/pypdf/) (used by `scripts/parse_study_folder.py` to scan the subject folders)

### Setup & Run

```bash
# 1. Install JavaScript dependencies
npm install

# 2. Scan study folders (NAS/, MATH III/, SNT/, etc.) and generate src/data/study-data.generated.json
npm run parse

# 3. Start the local dev server
npm run dev

# 4. Run production typecheck + bundle build
npm run build

# 5. Run frontend + Python parser tests
npm test
python3 -m unittest discover -s tests -v
```

---

## How Study Data Is Parsed from the Folder

The ingestion pipeline in [`scripts/parse_study_folder.py`](scripts/parse_study_folder.py) scans every subject subfolder at the workspace root (ignoring code directories listed in `ignoredDirectories` inside [`config/study-blueprints.json`](config/study-blueprints.json)) and writes [`src/data/study-data.generated.json`](src/data/study-data.generated.json).

1. **Folder & File Discovery**:
   - Inspects `.pdf`, `.md`, and `.txt` files inside each subject directory.
   - Empty folders (currently `MATH III/` and `SNT/`) are recorded cleanly with `status: "missing_material"` so the UI displays all three subject cards while surfacing clear missing-material instructions when selected.
   - Corrupt or unreadable PDFs are caught per file and recorded in `parseWarnings` without aborting the rest of the build.
2. **PDF Metadata & Course Plan Extraction**:
   - Uses `pypdf` to extract page/slide counts, slide headings, worked-example density (`exampleCount`), and Course Plan CO tables (`CO Statements`, `No. of Contact Hours`, `Marks`).
3. **Runtime Validation & Normalization**:
   - At runtime, [`src/lib/studyParser.ts`](src/lib/studyParser.ts) (`parseAndValidateStudyDataset`) validates every subject, module, topic group, and weightage field, returning structured `ValidationIssue` entries and safe fallbacks if data is missing or malformed.

---

## Original Source Traceability (`NAS/`)

Every module, topic group, and weightage in **NAS (Networks and Signals — `ICE 2123`)** traces directly back to the files in `NAS/`:

| Module | CO | Endsem Blueprint Weightage (out of 50) | Course Plan Metadata (out of 100) | Primary Source Files |
| :--- | :--- | :--- | :--- | :--- |
| **Module 5**: Fourier Analysis & System Frequency Response | CO5 | **17** (34%) | 10 hrs • 22 marks | `NS_Module5_Rev1.pdf` (87 pages), `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf` |
| **Module 4**: Signals and LTI Systems | CO4 | **15** (30%) | 10 hrs • 20 marks | `NS_Module4_Rev1.pdf` (90 pages), `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf` |
| **Module 1**: Circuit Analysis & Network Theorems | CO1 | **7** (14%) | 10 hrs • 22 marks | `NAS_Module1_partA.pdf` (58 pages), `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf` *(L6–L9, L24–L25 theorems traced here because `Module1_partB` PDF is absent)* |
| **Module 3**: Laplace Domain & Two-Port Networks | CO3 | **6** (12%) | 8 hrs • 16 marks | `NS_Module3A_Rev3.pdf` (49 pages), `NS_Module3B_Rev3.pdf` (37 pages), `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf` |
| **Module 2**: Transient Performance of RLC Circuits | CO2 | **5** (10%) | 10 hrs • 20 marks | `NS_Module2_Rev2.pdf` (61 pages), `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf` |

> **Traceability Notes Observed in Source PDFs**:
> - In `Course Plan - BTech Theory - 3 Credits_ICE2123_NAS_Rev2_Signed-2.pdf`, Page 1 CO Statements explicitly map **CO3** to Laplace & Two-Port Networks (8 hrs, 16/100 marks) and **CO4** to LTI Systems (10 hrs, 20/100 marks); Page 3's Lesson Plan table accidentally swaps `3` and `4` in the CO column for Lectures 17–31.
> - Slide 6 inside `NAS_Module1_partA.pdf` shows an earlier unrevised table (`CO2: 8 hrs / 16 marks`, `CO3: 10 hrs / 20 marks`), whereas the signed `Rev2` Course Plan supersedes it (`CO2: 10 hrs / 20 marks`, `CO3: 8 hrs / 16 marks`).

---

## How Weightage Is Estimated When Not Stated

When a subject folder contains study files without explicit blueprint weights in `config/study-blueprints.json` and without stated CO marks in a Course Plan PDF:

1. Both `scripts/parse_study_folder.py` and `estimateMissingModuleWeightages()` in [`src/lib/studyParser.ts`](src/lib/studyParser.ts) compute an emphasis score for each module:
   $$\text{emphasisScore} = \text{pageCount} + 1.5 \times \text{exampleCount} + 2 \times \text{topicCount}$$
2. Scores are normalized proportionally to a 100% scale across the subject's modules.
3. Every estimated module is tagged `weightageSource: "estimated"`, and the UI displays an explicit **Estimated Weightage Notice** banner and `ESTIMATED` badge so estimated values are never confused with official exam marks.

---

## How to Add or Update a Subject

### Option A: Auto-Discovery (Drop Files & Parse)
1. Create or populate a subject folder at the workspace root (for example, drop module PDFs named `Module1_*.pdf`, `Module2_*.pdf`, etc. into `MATH III/` or `SNT/`).
2. Run:
   ```bash
   npm run parse
   ```
3. Restart or refresh `npm run dev` (or run `npm run build`). Any Course Plan PDF CO marks are extracted automatically; otherwise weightages are estimated from slide volume and example density.

### Option B: Custom Endsem Blueprint Override
1. Open [`config/study-blueprints.json`](config/study-blueprints.json).
2. Add or edit the subject entry under `"subjects"` (using the folder name as key, e.g. `"MATH III"`), defining `"fullName"`, `"courseCode"`, `"accentColor"` (`"pink"` | `"teal"` | `"yellow"`), and optional `"modules"` with stated `"weightage"`, `"sourceFiles"`, and `"topicGroups"`.
3. Re-run `npm run parse` and `npm test` to regenerate and verify the updated dataset.

---

## Project Architecture

- [`scripts/parse_study_folder.py`](scripts/parse_study_folder.py) — Scans folders, parses PDFs, extracts Course Plan CO data, and estimates missing weights.
- [`config/study-blueprints.json`](config/study-blueprints.json) — Subject metadata and NAS Endsem Blueprint weights.
- [`src/lib/studyParser.ts`](src/lib/studyParser.ts) — Runtime dataset validation, weightage estimation fallback, and ranking engine.
- [`src/lib/mindMapBuilder.ts`](src/lib/mindMapBuilder.ts) — Center-outward bi-directional mind map tree & collision-free layout generator.
- [`src/lib/strategyEngine.ts`](src/lib/strategyEngine.ts) — High-weightage-first exam strategy & time-budget allocator.
- [`src/components/`](src/components/) — Memphis-styled Home cards, Interactive Mind Map (Canvas + Branch Outline + Node Inspector), Module Rankings, Strategy Roadmap, and Error States.

