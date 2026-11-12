import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import parse_study_folder  # noqa: E402


class ParseStudyFolderTests(unittest.TestCase):
    def test_parses_workspace_with_nas_ready_and_empty_subjects(self):
        root = Path(__file__).resolve().parent.parent
        dataset = parse_study_folder.build_dataset(
            root, root / "config" / "study-blueprints.json"
        )
        subjects = {s["id"]: s for s in dataset["subjects"]}

        self.assertIn("nas", subjects)
        self.assertEqual(subjects["nas"]["status"], "ready")
        self.assertEqual(subjects["nas"]["totalWeightage"], 50.0)
        self.assertEqual(len(subjects["nas"]["modules"]), 5)
        self.assertEqual(subjects["nas"]["parseWarnings"], [])
        pyq = subjects["nas"]["pyqAnalysis"]
        self.assertIsNotNone(pyq)
        self.assertEqual(pyq["totalPdfCount"], 6)
        self.assertEqual(pyq["totalExamSessions"], 5)
        self.assertEqual(pyq["totalQuestionsScanned"], 93)
        self.assertEqual(pyq["repeatedQuestionCount"], 14)
        self.assertEqual(pyq["repeatedTopicCount"], 9)
        res_files = subjects["nas"]["resourceFiles"]
        self.assertEqual(len(res_files), 2)
        self.assertEqual(res_files[0]["filename"], "NAS_Repeated_Questions_PYQ_List.pdf")
        self.assertEqual(res_files[0]["relativePath"], "resources/NAS_Repeated_Questions_PYQ_List.pdf")
        self.assertEqual(res_files[0]["pageCount"], 6)
        self.assertEqual(res_files[1]["filename"], "NAS_Repeated_Questions_Solved_With_Circuits.pdf")
        self.assertEqual(res_files[1]["relativePath"], "resources/NAS_Repeated_Questions_Solved_With_Circuits.pdf")
        self.assertEqual(res_files[1]["pageCount"], 27)
        self.assertEqual(subjects["math-iii"]["status"], "missing_material")
        self.assertEqual(subjects["snt"]["status"], "missing_material")

    def test_generic_pyq_folder_detects_repeated_questions_automatically(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subj_dir = root / "SNT"
            pyq_dir = subj_dir / "pyq"
            pyq_dir.mkdir(parents=True)
            (subj_dir / "Module1_Basics.md").write_text("# Sensors\nWheatstone bridge\n", encoding="utf-8")
            (pyq_dir / "Exam_2022.txt").write_text(
                "1A Derive sensitivity equation for quarter Wheatstone bridge strain gauge.\n"
                "1B Explain LVDT residual voltage compensation.\n",
                encoding="utf-8",
            )
            (pyq_dir / "Exam_2023.txt").write_text(
                "2A Derive sensitivity equation for quarter Wheatstone bridge strain gauge circuit.\n"
                "2B Compute thermocouple cold junction output.\n",
                encoding="utf-8",
            )
            blueprints = root / "blueprints.json"
            blueprints.write_text(json.dumps({"subjects": {}}), encoding="utf-8")

            dataset = parse_study_folder.build_dataset(root, blueprints)
            snt = dataset["subjects"][0]
            self.assertIsNotNone(snt["pyqAnalysis"])
            self.assertEqual(snt["pyqAnalysis"]["totalPdfCount"], 2)
            self.assertGreaterEqual(snt["pyqAnalysis"]["repeatedQuestionCount"], 1)
            self.assertGreaterEqual(snt["pyqAnalysis"]["repeatedQuestions"][0]["appearanceCount"], 2)

    def test_estimates_weightage_for_unconfigured_subject_with_markdown_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subj_dir = root / "PHY"
            subj_dir.mkdir()
            (subj_dir / "Module1_Optics.md").write_text(
                "# Optics\nWave interference\nExample 1\nExample 2\n", encoding="utf-8"
            )
            (subj_dir / "Module2_Quantum.md").write_text(
                "# Quantum Mechanics\n" + "\n".join(f"Topic {i}\nExample {i}" for i in range(40)),
                encoding="utf-8",
            )
            blueprints = root / "blueprints.json"
            blueprints.write_text(json.dumps({"subjects": {}}), encoding="utf-8")

            dataset = parse_study_folder.build_dataset(root, blueprints)
            phy = dataset["subjects"][0]
            self.assertEqual(phy["status"], "ready")
            self.assertEqual(phy["weightageSource"], "estimated")
            self.assertGreater(phy["modules"][1]["weightage"], phy["modules"][0]["weightage"])

    def test_handles_corrupt_pdf_without_crashing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            subj_dir = root / "CHEM"
            subj_dir.mkdir()
            (subj_dir / "Module1_Bad.pdf").write_bytes(b"NOT_A_VALID_PDF")
            blueprints = root / "blueprints.json"
            blueprints.write_text(json.dumps({"subjects": {}}), encoding="utf-8")

            dataset = parse_study_folder.build_dataset(root, blueprints)
            chem = dataset["subjects"][0]
            self.assertEqual(chem["status"], "malformed")
            self.assertTrue(len(chem["parseWarnings"]) > 0)


if __name__ == "__main__":
    unittest.main()

