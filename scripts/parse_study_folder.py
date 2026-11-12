#!/usr/bin/env python3
"""
Study Material Folder Parser for Endsem Insights.

Scans subject folders under the study root directory, extracts slide/page counts,
topic headings, example emphasis, and Course Plan CO weightages from PDFs/text files,
reconciles them with optional blueprint overrides in config/study-blueprints.json,
estimates module weightages when not explicitly stated, and outputs a traceable
JSON dataset to src/data/study-data.generated.json.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import pypdf  # type: ignore
except ImportError:  # pragma: no cover - surfaced explicitly in runtime warning
    pypdf = None


DEFAULT_IGNORED_DIRS = {
    "node_modules",
    "src",
    "dist",
    "build",
    "scripts",
    "config",
    "docs",
    "public",
    "tests",
    "test",
    "coverage",
    ".git",
    ".vscode",
    "__pycache__",
}

SUPPORTED_EXTENSIONS = {".pdf", ".md", ".txt"}
ACCENT_CYCLE = ["pink", "teal", "yellow"]
NOISE_HEADING_PREFIXES = (
    "thank you",
    "time for questions",
    "solution",
    "answer",
    "example",
    "equations",
    "graph",
    "summary",
    "books",
    "contact hours",
)


def slugify(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "subject"


def parse_pdf_file(path: Path) -> dict[str, Any]:
    """Extract page count, slide headings, example density, and course-plan metadata from a PDF."""
    if pypdf is None:
        return {
            "filename": path.name,
            "relativePath": str(path.parent.name + "/" + path.name),
            "extension": path.suffix.lower(),
            "sizeBytes": path.stat().st_size,
            "pageCount": 0,
            "headings": [],
            "exampleCount": 0,
            "isCoursePlan": False,
            "coMarks": {},
            "parseError": "pypdf is not installed in Python environment.",
        }

    try:
        reader = pypdf.PdfReader(str(path))
        page_count = len(reader.pages)
        headings: list[str] = []
        example_count = 0
        full_text_parts: list[str] = []

        for page in reader.pages:
            raw = (page.extract_text() or "").strip()
            full_text_parts.append(raw)
            if not raw:
                continue
            lines = [line.strip() for line in raw.splitlines() if line.strip()]
            if not lines:
                continue
            first_line = re.sub(r"\s+", " ", lines[0])
            lowered = first_line.lower()
            if "example" in raw.lower():
                example_count += 1
            if (
                len(first_line) > 2
                and not any(lowered.startswith(prefix) for prefix in NOISE_HEADING_PREFIXES)
                and not lowered.startswith("page ")
                and first_line not in headings
            ):
                headings.append(first_line[:110])

        joined_text = "\n".join(full_text_parts)
        is_course_plan = (
            "course plan" in path.name.lower()
            or ("course plan" in joined_text.lower() and "co statements" in joined_text.lower())
        )
        co_marks = extract_course_plan_cos(joined_text) if is_course_plan else {}

        return {
            "filename": path.name,
            "relativePath": f"{path.parent.name}/{path.name}",
            "extension": path.suffix.lower(),
            "sizeBytes": path.stat().st_size,
            "pageCount": page_count,
            "headings": headings[:24],
            "exampleCount": example_count,
            "isCoursePlan": is_course_plan,
            "coMarks": co_marks,
            "parseError": None,
        }
    except Exception as exc:  # pragma: no cover - defensive file error handler
        return {
            "filename": path.name,
            "relativePath": f"{path.parent.name}/{path.name}",
            "extension": path.suffix.lower(),
            "sizeBytes": path.stat().st_size if path.exists() else 0,
            "pageCount": 0,
            "headings": [],
            "exampleCount": 0,
            "isCoursePlan": False,
            "coMarks": {},
            "parseError": f"Failed to parse PDF {path.name}: {exc}",
        }


def parse_text_file(path: Path) -> dict[str, Any]:
    """Extract headings and line count from .md or .txt study files."""
    try:
        content = path.read_text(encoding="utf-8", errors="replace")
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        headings = [
            re.sub(r"^#+\s*", "", line)[:110]
            for line in lines
            if line.startswith("#") or line.endswith(":")
        ]
        if not headings:
            headings = lines[:10]
        example_count = sum(1 for line in lines if "example" in line.lower())
        return {
            "filename": path.name,
            "relativePath": f"{path.parent.name}/{path.name}",
            "extension": path.suffix.lower(),
            "sizeBytes": path.stat().st_size,
            "pageCount": max(1, (len(lines) + 29) // 30),
            "headings": headings[:20],
            "exampleCount": example_count,
            "isCoursePlan": "course plan" in path.name.lower(),
            "coMarks": {},
            "parseError": None,
        }
    except Exception as exc:  # pragma: no cover
        return {
            "filename": path.name,
            "relativePath": f"{path.parent.name}/{path.name}",
            "extension": path.suffix.lower(),
            "sizeBytes": 0,
            "pageCount": 0,
            "headings": [],
            "exampleCount": 0,
            "isCoursePlan": False,
            "coMarks": {},
            "parseError": f"Failed to parse text file {path.name}: {exc}",
        }


def extract_course_plan_cos(text: str) -> dict[str, dict[str, int]]:
    """
    Parse CO rows such as:
    `1 Apply network theorems for solving electrical networks. 10 22 ...`
    from a standard course plan PDF.
    """
    results: dict[str, dict[str, int]] = {}
    pattern = re.compile(
        r"(?m)^\s*([1-6])\s+([A-Za-z][^\n]+?(?:\n[^\n]+?)?)\s+(\d{1,2})\s+(\d{1,2})\b"
    )
    for match in pattern.finditer(text):
        co_num = match.group(1)
        hours = int(match.group(3))
        marks = int(match.group(4))
        if 1 <= hours <= 40 and 1 <= marks <= 100:
            results[f"CO{co_num}"] = {"hours": hours, "marks": marks}
    return results


def infer_module_number(filename: str) -> int | None:
    match = re.search(r"module\s*[_\-\s]*(\d+)", filename, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def estimate_modules_from_files(
    subject_id: str,
    files: list[dict[str, Any]],
    co_marks_lookup: dict[str, dict[str, int]],
) -> tuple[list[dict[str, Any]], str, str]:
    """
    Build module entries dynamically when a subject has files but no blueprint config.
    Uses Course Plan marks if detected; otherwise estimates weightage from volume & emphasis.
    """
    grouped: dict[int, list[dict[str, Any]]] = {}
    unassigned: list[dict[str, Any]] = []

    for meta in files:
        if meta.get("isCoursePlan") or meta.get("parseError"):
            continue
        mod_num = infer_module_number(meta["filename"])
        if mod_num is not None:
            grouped.setdefault(mod_num, []).append(meta)
        else:
            unassigned.append(meta)

    if not grouped and unassigned:
        for idx, meta in enumerate(unassigned, start=1):
            grouped[idx] = [meta]

    if not grouped:
        return [], "missing", "No readable module files were parsed."

    raw_modules: list[dict[str, Any]] = []
    any_stated = False
    any_estimated = False

    for mod_num in sorted(grouped.keys()):
        mod_files = grouped[mod_num]
        co_code = f"CO{mod_num}"
        total_pages = sum(max(1, f.get("pageCount", 0)) for f in mod_files)
        total_examples = sum(f.get("exampleCount", 0) for f in mod_files)
        all_headings: list[str] = []
        for f in mod_files:
            for h in f.get("headings", []):
                if h not in all_headings:
                    all_headings.append(h)

        stated_info = co_marks_lookup.get(co_code)
        if stated_info:
            any_stated = True
            weightage = stated_info["marks"]
            w_source = "stated"
            hours = stated_info["hours"]
        else:
            any_estimated = True
            weightage = 0
            w_source = "estimated"
            hours = None

        raw_title = (
            all_headings[0]
            if all_headings
            else f"Module {mod_num} ({', '.join(f['filename'] for f in mod_files)})"
        )
        leaves = [
            {
                "id": f"{subject_id}-m{mod_num}-t{idx+1}",
                "title": heading,
                "sourceFile": mod_files[0]["filename"],
                "sourceRef": f"Extracted heading ({mod_files[0]['pageCount']} pages)",
                "highYield": idx < 4,
            }
            for idx, heading in enumerate(all_headings[:10])
        ]
        if not leaves:
            leaves = [
                {
                    "id": f"{subject_id}-m{mod_num}-t1",
                    "title": f"Study slides in {mod_files[0]['filename']}",
                    "sourceFile": mod_files[0]["filename"],
                    "sourceRef": f"{mod_files[0]['pageCount']} pages",
                    "highYield": True,
                }
            ]

        emphasis_score = total_pages + 1.5 * total_examples + 2.0 * len(leaves)
        raw_modules.append(
            {
                "id": f"{subject_id}-m{mod_num}",
                "moduleNumber": mod_num,
                "coCode": co_code,
                "title": raw_title,
                "weightage": weightage,
                "weightageUnit": "marks",
                "weightageSource": w_source,
                "coursePlanHours": hours,
                "coursePlanMarks100": stated_info["marks"] if stated_info else None,
                "sourceFiles": [f["filename"] for f in mod_files],
                "pageCount": total_pages,
                "exampleCount": total_examples,
                "emphasisScore": round(emphasis_score, 2),
                "sourceGapNote": (
                    "Weightage estimated from slide/page volume, worked examples, and topic count."
                    if w_source == "estimated"
                    else None
                ),
                "prerequisites": [],
                "topicGroups": [
                    {
                        "id": f"{subject_id}-m{mod_num}-core",
                        "title": "Extracted Module Topics",
                        "sourceFile": mod_files[0]["filename"],
                        "sourceRef": f"{total_pages} pages across {len(mod_files)} file(s)",
                        "priority": "high-yield",
                        "leaves": leaves,
                    }
                ],
            }
        )

    if any_estimated:
        total_emphasis = sum(m["emphasisScore"] for m in raw_modules) or 1.0
        for mod in raw_modules:
            if mod["weightageSource"] == "estimated":
                mod["weightage"] = max(1, round((mod["emphasisScore"] / total_emphasis) * 100))

    overall_source = "stated" if (any_stated and not any_estimated) else "estimated"
    basis = (
        "Extracted from Course Plan PDF CO marks."
        if overall_source == "stated"
        else "No explicit exam weightage found; estimated proportionally from module slide/page count and worked-example density."
    )
    return raw_modules, overall_source, basis


def _read_pyq_raw_text(path: Path) -> str:
    """Extract raw text from a PDF or text/markdown PYQ file for heuristic repeat scanning."""
    if path.suffix.lower() == ".pdf" and pypdf is not None:
        try:
            reader = pypdf.PdfReader(str(path))
            return "\n".join((page.extract_text() or "") for page in reader.pages)
        except Exception:
            return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def _tokenize_question(text: str) -> set[str]:
    stopwords = {
        "the", "and", "for", "with", "that", "this", "from", "find", "determine",
        "obtain", "using", "shown", "figure", "circuit", "following", "given",
        "network", "system", "signal", "calculate", "value", "below", "marks",
    }
    words = {w for w in re.findall(r"[a-z]{3,}", text.lower()) if w not in stopwords}
    return words


def scan_pyq_folder_generic(
    subject_id: str,
    folder_path: Path,
    pyq_files: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Automatically detect repeated questions and topics when pyq/ lacks explicit blueprint rules."""
    if not pyq_files:
        return None

    papers: list[dict[str, Any]] = []
    extracted_questions: list[dict[str, Any]] = []

    for idx, meta in enumerate(pyq_files):
        file_path = folder_path / meta["relativePath"]
        raw_text = _read_pyq_raw_text(file_path)
        lines = [re.sub(r"\s+", " ", ln.strip()) for ln in raw_text.splitlines() if len(ln.strip()) > 12]
        q_lines = [
            ln for ln in lines
            if re.match(r"^(?:Q?\d+[A-Za-z]?[\).:\s]|Derive|Find|Determine|Obtain|Evaluate|Calculate)", ln)
        ] or lines[:12]

        exam_id = slugify(Path(meta["filename"]).stem)
        papers.append(
            {
                "id": exam_id,
                "filename": meta["filename"],
                "relativePath": meta["relativePath"],
                "examLabel": Path(meta["filename"]).stem,
                "examDate": "Extracted from filename",
                "courseCode": subject_id.upper(),
                "maxMarks": 0,
                "pageCount": meta.get("pageCount", 1),
                "questionCount": len(q_lines),
                "examSessionKey": exam_id,
            }
        )
        for q_idx, q_text in enumerate(q_lines, start=1):
            tokens = _tokenize_question(q_text)
            if len(tokens) >= 3:
                extracted_questions.append(
                    {
                        "examId": exam_id,
                        "examLabel": Path(meta["filename"]).stem,
                        "questionRef": f"Q{q_idx}",
                        "sourceFile": meta["relativePath"],
                        "text": q_text[:180],
                        "tokens": tokens,
                    }
                )

    used: set[int] = set()
    repeated_questions: list[dict[str, Any]] = []
    for i, base in enumerate(extracted_questions):
        if i in used:
            continue
        group = [base]
        for j in range(i + 1, len(extracted_questions)):
            if j in used or extracted_questions[j]["examId"] == base["examId"]:
                continue
            cand = extracted_questions[j]
            union = len(base["tokens"] | cand["tokens"]) or 1
            jaccard = len(base["tokens"] & cand["tokens"]) / union
            if jaccard >= 0.45:
                used.add(j)
                group.append(cand)
        if len(group) >= 2:
            used.add(i)
            repeated_questions.append(
                {
                    "id": f"{subject_id}-pyq-rq-{len(repeated_questions) + 1}",
                    "title": group[0]["text"],
                    "moduleId": "",
                    "coCode": "PYQ",
                    "track": None,
                    "blueprintMarks": 0,
                    "appearanceCount": len(group),
                    "examPaperCount": len({g["examId"] for g in group}),
                    "cumulativeMarks": 0,
                    "matchType": "variant",
                    "summaryCue": f"Matched automatically across {len(group)} exam files.",
                    "appearances": [
                        {
                            "examId": g["examId"],
                            "examLabel": g["examLabel"],
                            "questionRef": g["questionRef"],
                            "marks": None,
                            "sourceFile": g["sourceFile"],
                            "page": 1,
                            "detail": g["text"],
                            "similarity": "variant",
                        }
                        for g in group
                    ],
                }
            )

    return {
        "totalPdfCount": len(papers),
        "totalExamSessions": len(papers),
        "totalQuestionsScanned": sum(p["questionCount"] for p in papers),
        "repeatedQuestionCount": len(repeated_questions),
        "repeatedTopicCount": 0,
        "papers": papers,
        "repeatedQuestions": sorted(
            repeated_questions,
            key=lambda q: (-q["examPaperCount"], -q["appearanceCount"]),
        ),
        "repeatedTopics": [],
        "reverseStrategy": [],
    }


def resolve_pyq_analysis(
    subject_id: str,
    folder_path: Path,
    cfg_pyq: dict[str, Any] | None,
    pyq_files: list[dict[str, Any]],
    warnings: list[str],
) -> dict[str, Any] | None:
    """Reconcile PYQ exam metadata and repeat counts with live files inside `<subject>/pyq/`."""
    if not cfg_pyq:
        return scan_pyq_folder_generic(subject_id, folder_path, pyq_files)

    pyq_by_name = {p["filename"]: p for p in pyq_files}
    papers: list[dict[str, Any]] = []
    session_by_exam_id: dict[str, str] = {}

    for paper_cfg in cfg_pyq.get("papers", []):
        fname = paper_cfg["filename"]
        disk_meta = pyq_by_name.get(fname)
        rel_path = paper_cfg.get("relativePath", f"pyq/{fname}")
        if disk_meta is None and not (folder_path / rel_path).exists():
            warnings.append(f"{subject_id}: PYQ file missing on disk: {rel_path}")
        page_count = disk_meta["pageCount"] if disk_meta else paper_cfg.get("pageCount", 1)
        paper_entry = {**paper_cfg, "pageCount": page_count}
        papers.append(paper_entry)
        session_by_exam_id[paper_entry["id"]] = paper_entry.get("examSessionKey", paper_entry["id"])

    repeated_questions: list[dict[str, Any]] = []
    for item in cfg_pyq.get("repeatedQuestions", []):
        appearances = item.get("appearances", [])
        for app in appearances:
            src_rel = app.get("sourceFile", "")
            if src_rel and not (folder_path / src_rel).exists():
                warnings.append(f"{subject_id}: PYQ citation file missing on disk: {src_rel}")
        session_hits = {session_by_exam_id.get(a.get("examId", ""), a.get("examId", "")) for a in appearances}
        repeated_questions.append(
            {
                **item,
                "appearanceCount": len(appearances),
                "examPaperCount": len(session_hits),
            }
        )

    repeated_questions.sort(
        key=lambda q: (-q["examPaperCount"], -q["appearanceCount"], -q.get("cumulativeMarks", 0))
    )

    repeated_topics = sorted(
        cfg_pyq.get("repeatedTopics", []),
        key=lambda t: (-t.get("paperHits", 0), -t.get("blueprintMarks", 0), -t.get("questionCount", 0)),
    )

    total_sessions = len({session_by_exam_id.get(p["id"], p["id"]) for p in papers}) or len(papers)
    return {
        "totalPdfCount": len(papers),
        "totalExamSessions": total_sessions,
        "totalQuestionsScanned": sum(int(p.get("questionCount", 0)) for p in papers),
        "repeatedQuestionCount": len(repeated_questions),
        "repeatedTopicCount": len(repeated_topics),
        "papers": papers,
        "repeatedQuestions": repeated_questions,
        "repeatedTopics": repeated_topics,
        "reverseStrategy": cfg_pyq.get("reverseStrategy", []),
    }


def build_dataset(root_dir: Path, blueprints_path: Path) -> dict[str, Any]:
    blueprints: dict[str, Any] = {}
    if blueprints_path.exists():
        blueprints = json.loads(blueprints_path.read_text(encoding="utf-8"))

    ignored_dirs = set(blueprints.get("ignoredDirectories", DEFAULT_IGNORED_DIRS))
    subject_configs: dict[str, Any] = blueprints.get("subjects", {})

    discovered_folders = sorted(
        entry.name
        for entry in root_dir.iterdir()
        if entry.is_dir() and not entry.name.startswith(".") and entry.name not in ignored_dirs
    )

    ordered_folders: list[str] = []
    for cfg_name in subject_configs.keys():
        if cfg_name not in ordered_folders:
            ordered_folders.append(cfg_name)
    for folder_name in discovered_folders:
        if folder_name not in ordered_folders:
            ordered_folders.append(folder_name)

    subjects: list[dict[str, Any]] = []

    for idx, folder_name in enumerate(ordered_folders):
        cfg = subject_configs.get(folder_name, {})
        subject_id = cfg.get("id") or slugify(folder_name)
        folder_path = root_dir / folder_name
        accent = cfg.get("accentColor") or ACCENT_CYCLE[idx % len(ACCENT_CYCLE)]

        if not folder_path.exists() or not folder_path.is_dir():
            subjects.append(
                {
                    "id": subject_id,
                    "folderName": folder_name,
                    "shortName": cfg.get("shortName", folder_name),
                    "fullName": cfg.get("fullName", folder_name),
                    "courseCode": cfg.get("courseCode", "Folder Missing"),
                    "accentColor": accent,
                    "tagline": f"Directory {folder_name}/ was not found on disk.",
                    "status": "missing_folder",
                    "statusMessage": f"Expected folder '{folder_name}/' was not found in the study workspace.",
                    "weightageScaleLabel": cfg.get("weightageScaleLabel", "Unavailable"),
                    "weightageSource": "missing",
                    "weightageBasis": "Subject directory missing.",
                    "totalWeightage": 0,
                    "sourceFiles": [],
                    "parseWarnings": [f"Missing subject directory: {folder_name}/"],
                    "modules": [],
                }
            )
            continue

        study_files = sorted(
            f
            for f in folder_path.iterdir()
            if f.is_file() and not f.name.startswith(".") and f.suffix.lower() in SUPPORTED_EXTENSIONS
        )

        if not study_files:
            subjects.append(
                {
                    "id": subject_id,
                    "folderName": folder_name,
                    "shortName": cfg.get("shortName", folder_name),
                    "fullName": cfg.get("fullName", folder_name),
                    "courseCode": cfg.get("courseCode", "Pending Syllabus"),
                    "accentColor": accent,
                    "tagline": cfg.get("tagline", f"Awaiting study material upload in {folder_name}/"),
                    "status": "missing_material",
                    "statusMessage": (
                        f"No study PDFs or notes found in '{folder_name}/'. "
                        f"Add module PDFs or a course plan to '{folder_name}/' and run 'npm run parse'."
                    ),
                    "weightageScaleLabel": cfg.get("weightageScaleLabel", "Not Yet Available"),
                    "weightageSource": "missing",
                    "weightageBasis": cfg.get(
                        "weightageBasis", f"No files currently exist in {folder_name}/."
                    ),
                    "totalWeightage": 0,
                    "sourceFiles": [],
                    "parseWarnings": [],
                    "modules": [],
                }
            )
            continue

        parsed_files: list[dict[str, Any]] = []
        warnings: list[str] = []
        co_marks_lookup: dict[str, dict[str, int]] = {}

        for file_path in study_files:
            meta = (
                parse_pdf_file(file_path)
                if file_path.suffix.lower() == ".pdf"
                else parse_text_file(file_path)
            )
            if meta.get("parseError"):
                warnings.append(str(meta["parseError"]))
            if meta.get("coMarks"):
                co_marks_lookup.update(meta["coMarks"])
            parsed_files.append(meta)

        pyq_dir = next(
            (
                entry
                for entry in folder_path.iterdir()
                if entry.is_dir() and entry.name.lower() == "pyq"
            ),
            None,
        )
        pyq_files: list[dict[str, Any]] = []
        if pyq_dir is not None:
            for pyq_path in sorted(
                p
                for p in pyq_dir.iterdir()
                if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in SUPPORTED_EXTENSIONS
            ):
                pmeta = (
                    parse_pdf_file(pyq_path)
                    if pyq_path.suffix.lower() == ".pdf"
                    else parse_text_file(pyq_path)
                )
                pmeta["relativePath"] = f"{pyq_dir.name}/{pyq_path.name}"
                pyq_files.append(pmeta)

        pyq_analysis = resolve_pyq_analysis(
            subject_id=subject_id,
            folder_path=folder_path,
            cfg_pyq=cfg.get("pyqAnalysis"),
            pyq_files=pyq_files,
            warnings=warnings,
        )

        resources_dir = next(
            (
                entry
                for entry in folder_path.iterdir()
                if entry.is_dir() and entry.name.lower() == "resources"
            ),
            None,
        )
        disk_resources_by_rel: dict[str, dict[str, Any]] = {}
        if resources_dir is not None:
            for res_path in sorted(
                p
                for p in resources_dir.iterdir()
                if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in SUPPORTED_EXTENSIONS
            ):
                rmeta = (
                    parse_pdf_file(res_path)
                    if res_path.suffix.lower() == ".pdf"
                    else parse_text_file(res_path)
                )
                rel = f"{resources_dir.name}/{res_path.name}"
                rmeta["relativePath"] = rel
                disk_resources_by_rel[rel] = rmeta

        resource_files: list[dict[str, Any]] = []
        seen_resource_rels: set[str] = set()
        for res_cfg in cfg.get("resourceFiles", []):
            rel = str(res_cfg.get("relativePath") or f"resources/{res_cfg.get('filename', '')}").strip()
            disk_meta = disk_resources_by_rel.get(rel)
            if disk_meta is None:
                candidate = folder_path / rel
                if candidate.is_file():
                    disk_meta = (
                        parse_pdf_file(candidate)
                        if candidate.suffix.lower() == ".pdf"
                        else parse_text_file(candidate)
                    )
                    disk_meta["relativePath"] = rel
                else:
                    warnings.append(f"{subject_id}: Resource file missing on disk: {rel}")
                    continue
            seen_resource_rels.add(rel)
            resource_files.append(
                {
                    "id": res_cfg.get("id") or f"{subject_id}-res-{slugify(disk_meta['filename'])}",
                    "title": res_cfg.get("title") or disk_meta["filename"],
                    "description": res_cfg.get("description", ""),
                    "filename": disk_meta["filename"],
                    "relativePath": rel,
                    "category": res_cfg.get("category", "other"),
                    "badge": res_cfg.get("badge"),
                    "pageCount": disk_meta["pageCount"],
                    "sizeBytes": disk_meta["sizeBytes"],
                }
            )

        for rel, disk_meta in disk_resources_by_rel.items():
            if rel in seen_resource_rels:
                continue
            resource_files.append(
                {
                    "id": f"{subject_id}-res-{slugify(disk_meta['filename'])}",
                    "title": disk_meta["filename"].rsplit(".", 1)[0].replace("_", " "),
                    "description": "",
                    "filename": disk_meta["filename"],
                    "relativePath": rel,
                    "category": "notes",
                    "badge": "STUDY FILE",
                    "pageCount": disk_meta["pageCount"],
                    "sizeBytes": disk_meta["sizeBytes"],
                }
            )

        file_by_name = {meta["filename"]: meta for meta in parsed_files}
        configured_modules = cfg.get("modules")

        if configured_modules:
            enriched_modules: list[dict[str, Any]] = []
            for mod in configured_modules:
                mod_sources = mod.get("sourceFiles", [])
                mod_pages = sum(
                    file_by_name[name]["pageCount"]
                    for name in mod_sources
                    if name in file_by_name and not file_by_name[name]["isCoursePlan"]
                )
                mod_examples = sum(
                    file_by_name[name]["exampleCount"]
                    for name in mod_sources
                    if name in file_by_name and not file_by_name[name]["isCoursePlan"]
                )
                missing_refs = [name for name in mod_sources if name not in file_by_name]
                if missing_refs:
                    warnings.append(
                        f"{mod.get('id')}: referenced source file(s) missing on disk: {', '.join(missing_refs)}"
                    )
                enriched_modules.append(
                    {
                        **mod,
                        "pageCount": mod_pages,
                        "exampleCount": mod_examples,
                    }
                )
            modules = enriched_modules
            weightage_source = cfg.get("weightageSource", "stated")
            weightage_basis = cfg.get("weightageBasis", "Blueprint configuration.")
        else:
            modules, weightage_source, weightage_basis = estimate_modules_from_files(
                subject_id, parsed_files, co_marks_lookup
            )

        total_weightage = sum(float(m.get("weightage", 0)) for m in modules)

        status = "ready" if modules else "malformed"
        status_message = (
            "All modules parsed cleanly."
            if status == "ready"
            else f"Files were found in {folder_name}/, but no valid modules could be extracted."
        )

        subjects.append(
            {
                "id": subject_id,
                "folderName": folder_name,
                "shortName": cfg.get("shortName", folder_name),
                "fullName": cfg.get("fullName", folder_name),
                "courseCode": cfg.get("courseCode", "Course Plan"),
                "accentColor": accent,
                "tagline": cfg.get("tagline", f"Parsed from {len(parsed_files)} files in {folder_name}/"),
                "status": status,
                "statusMessage": status_message,
                "weightageScaleLabel": cfg.get(
                    "weightageScaleLabel",
                    "Course Plan Marks" if weightage_source == "stated" else "Estimated Share (%)",
                ),
                "weightageSource": weightage_source,
                "weightageBasis": weightage_basis,
                "totalWeightage": total_weightage,
                "sourceFiles": [
                    {
                        "filename": f["filename"],
                        "relativePath": f["relativePath"],
                        "pageCount": f["pageCount"],
                        "sizeBytes": f["sizeBytes"],
                        "exampleCount": f["exampleCount"],
                        "isCoursePlan": f["isCoursePlan"],
                        "parseError": f["parseError"],
                    }
                    for f in parsed_files
                ],
                "resourceFiles": resource_files,
                "parseWarnings": warnings,
                "modules": modules,
                "pyqAnalysis": pyq_analysis,
            }
        )

    return {
        "schemaVersion": "1.0.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "studyRootName": root_dir.name,
        "subjects": subjects,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Parse study material folders into JSON.")
    parser.add_argument("--root", default=".", help="Path to study root folder.")
    parser.add_argument(
        "--blueprints",
        default="config/study-blueprints.json",
        help="Path to optional subject blueprint config.",
    )
    parser.add_argument(
        "--out",
        default="src/data/study-data.generated.json",
        help="Output JSON file path.",
    )
    args = parser.parse_args()

    root_dir = Path(args.root).resolve()
    blueprints_path = (root_dir / args.blueprints).resolve() if not Path(args.blueprints).is_absolute() else Path(args.blueprints)
    out_path = (root_dir / args.out).resolve() if not Path(args.out).is_absolute() else Path(args.out)

    dataset = build_dataset(root_dir, blueprints_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(dataset, indent=2) + "\n", encoding="utf-8")

    print(f"Generated {out_path} with {len(dataset['subjects'])} subject(s):")
    for subj in dataset["subjects"]:
        print(
            f"  - {subj['shortName']} ({subj['status']}): "
            f"{len(subj['modules'])} modules, {len(subj['sourceFiles'])} files, "
            f"weightage={subj['totalWeightage']} ({subj['weightageSource']})"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
