#!/usr/bin/env python3
"""Audit Appendix A quantity/unit tokens against the user's own PDF.

This DOES NOT validate recipe correctness, personal suitability, nutrition
calculations, ingredient translations or editorial completeness. No PDF or
copyrighted text is copied into the repository or audit report.

Usage:
  python scripts/verify_book_appendix_pdf.py --pdf "path/to/owned-book.pdf"
Optional requirement: pip install pymupdf
"""
from __future__ import annotations
import argparse
from collections import defaultdict
import hashlib
import json
from pathlib import Path
import re
import sys

EXPECTED_PAGES = range(215, 243)
UNIT_PATTERN = re.compile(
    r"(?<![\dA-Za-z])(?P<amount>\d+/\d+|\d+(?:[.,]\d+)?)\s*"
    r"(?P<unit>mL|ml|g|tbsp|tsp|cloves|clove|leaves|"
    r"pieces|piece|sprigs|sprig|handful|medium|large)(?!\w)",
    re.IGNORECASE,
)
SECTION_PATTERN = re.compile(r"(Breakfast|Lunch|Snack|Dinner)", re.IGNORECASE)
WEEK_PATTERN = re.compile(r"WEEK\s+([12])\*?", re.IGNORECASE)
DAY_PATTERN = re.compile(r"DAY\s+([1-7])", re.IGNORECASE)


def tokens_from_pdf(pdf_path: Path) -> dict[tuple[int, int, str], list[tuple[int, str, str]]]:
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("PyMuPDF is required: python -m pip install pymupdf") from exc

    results = defaultdict(list)
    with fitz.open(pdf_path) as pdf:
        if len(pdf) != 306:
            raise ValueError(f"Expected source edition with 306 PDF pages, found {len(pdf)}")
        week, day, slot = 0, 0, ""
        for page_number in EXPECTED_PAGES:
            for raw_line in pdf[page_number - 1].get_text(sort=True).splitlines():
                line = raw_line.strip()
                if found := WEEK_PATTERN.fullmatch(line):
                    week = int(found.group(1))
                if found := DAY_PATTERN.fullmatch(line):
                    day = int(found.group(1))
                if found := SECTION_PATTERN.fullmatch(line):
                    slot = found.group(1).lower()
                for match in UNIT_PATTERN.finditer(line):
                    if not (week and day and slot):
                        raise ValueError(f"Unassigned quantity at PDF page {page_number}")
                    results[(week, day, slot)].append(
                        (page_number, match.group("amount"), match.group("unit"))
                    )
    return results


def audit(pdf_path: Path, inventory_path: Path) -> dict[str, object]:
    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    actual_sha = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
    original_sha = inventory["metadata"]["sourceTokenAudit"]["sourcePdfSha256"]
    if actual_sha != original_sha:
        raise ValueError("PDF SHA-256 differs from the original user-supplied source edition")

    from_pdf = tokens_from_pdf(pdf_path)
    from_inventory = {}
    for meal in inventory["meals"]:
        key = (meal["week"], meal["day"], meal["slot"])
        if key in from_inventory:
            raise ValueError(f"Duplicate Appendix A meal {key}")
        from_inventory[key] = [
            (fact["pdfPage"], fact["amount"], fact["unit"]) for fact in meal["facts"]
        ]

    mismatches = []
    for key in sorted(set(from_pdf) | set(from_inventory)):
        source_tokens, stored_tokens = from_pdf.get(key, []), from_inventory.get(key, [])
        if source_tokens != stored_tokens:
            mismatches.append({
                "meal": "%d-%d-%s" % key,
                "sourceTokenCount": len(source_tokens),
                "storedTokenCount": len(stored_tokens),
                "firstDifference": next(
                    (i for i, pair in enumerate(zip(source_tokens, stored_tokens))
                     if pair[0] != pair[1]),
                    min(len(source_tokens), len(stored_tokens)),
                ),
            })
    reviewed = sum(meal["verificationStatus"] == "source-page-checked"
                   for meal in inventory["meals"])
    facts = [fact for meal in inventory["meals"] for fact in meal["facts"]]
    limits = [fact for fact in facts if fact.get("factType") == "composition-limit"]
    missing_labels = sum(not fact.get("labelVi") for fact in facts)
    results = {
        "sourcePdfSha256": actual_sha,
        "sourcePageRange": "215-242",
        "extractedMeals": len(from_pdf),
        "extractedQuantityTokens": sum(map(len, from_pdf.values())),
        "matchedMeals": len(from_pdf) - len(mismatches),
        "matchedQuantityTokens": len(facts) if not mismatches else None,
        "missingContextLabels": missing_labels,
        "sugarCompositionLimits": len(limits),
        "editoriallyCheckedMeals": reviewed,
        "editoriallyUnverifiedMeals": len(inventory["meals"]) - reviewed,
        "mismatches": mismatches,
        "conclusion": "Machine source-token agreement only, not recipe/clinical verification",
    }
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, type=Path, help="Local user-owned PDF")
    default_inventory = (
        Path(__file__).resolve().parents[1] /
        "src/LongevityDiet.Web/src/features/book/bookAppendixQuantities.json"
    )
    parser.add_argument("--inventory", type=Path, default=default_inventory)
    parser.add_argument("--report", type=Path, help="Optional JSON audit report path")
    options = parser.parse_args()

    try:
        output = audit(options.pdf, options.inventory)
    except (OSError, ValueError, RuntimeError, KeyError, json.JSONDecodeError) as exc:
        print(f"BOOK_SOURCE_AUDIT=FAIL: {exc}", file=sys.stderr)
        return 2
    report_text = json.dumps(output, ensure_ascii=False, indent=2)
    print(report_text)
    if options.report:
        options.report.parent.mkdir(parents=True, exist_ok=True)
        options.report.write_text(report_text + "\n", encoding="utf-8")
    if output["mismatches"] or output["extractedMeals"] != 56 or (
        output["extractedQuantityTokens"] != 350
    ) or output["missingContextLabels"] or output["sugarCompositionLimits"] != 13:
        print("BOOK_SOURCE_AUDIT=FAIL: inspect report", file=sys.stderr)
        return 1
    print("BOOK_SOURCE_AUDIT=PASS (machine tokens only, editorial review still pending)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
