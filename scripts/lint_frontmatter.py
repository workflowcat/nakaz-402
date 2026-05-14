#!/usr/bin/env python3
"""Лінтер frontmatter для НПА-репозиторію.

Перевіряє кожен .md-файл, що має поле `id` у frontmatter, на відповідність
конвенціям з meta/schema.md:

- `id` має граматично коректний формат;
- `id` унікальний по всьому репо;
- обов'язкові поля заповнені;
- `source` — валідний URL на rada.gov.ua;
- `status` — з фіксованого переліку;
- `amended_by[*]` — структура коректна;
- `parent_id` (за наявності) — посилається на існуючий `id`;
- `meta/amendments.yaml`: `affects[*].id` посилається на існуючий `id`.

Запуск:
    python3 scripts/lint_frontmatter.py

Exit code 0 — все ок; 1 — є помилки.
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "ERROR: PyYAML не встановлено. `pip install pyyaml` або вкажіть у CI.\n"
    )
    sys.exit(2)


REPO_ROOT = Path(__file__).resolve().parent.parent

ID_PATTERN = re.compile(
    r"^("
    r"nakaz(\.p\d+)?"
    r"|polozhennia(\.r\d+(\.gl\d+(\.p\d+(\.\d+)*(\.[а-яіїєґ])?)?)?)?"
    r"|dodatok\.\d+(\.stattia\.\d+(\.pp\.[а-яіїєґ])?)?"
    r")$"
)

ALLOWED_STATUS = {"active", "repealed", "suspended", "draft"}
ALLOWED_TYPE = {
    "nakaz", "polozhennia", "rozdil", "glava", "punkt", "dodatok", "stattia"
}
ALLOWED_OP = {"insert", "edit", "redaction", "repeal", "restore"}

REQUIRED_FIELDS = ["id", "type", "title", "status"]
SOURCE_HOST_OK = re.compile(r"^https://zakon\.rada\.gov\.ua/")


@dataclass
class FileReport:
    path: Path
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    frontmatter: dict[str, Any] | None = None

    @property
    def has_problems(self) -> bool:
        return bool(self.errors)


def extract_frontmatter(text: str) -> tuple[dict[str, Any] | None, str | None]:
    """Повертає (frontmatter_dict, помилка_парсингу_або_None)."""
    if not text.startswith("---"):
        return None, None  # немає frontmatter — не помилка, просто пропускаємо
    end = text.find("\n---", 3)
    if end == -1:
        return None, "frontmatter не закрито рядком '---'"
    fm_text = text[3:end]
    try:
        data = yaml.safe_load(fm_text)
    except yaml.YAMLError as e:
        return None, f"невалідний YAML у frontmatter: {e}"
    if not isinstance(data, dict):
        return None, "frontmatter не є об'єктом"
    return data, None


def validate_id(value: Any) -> str | None:
    if not isinstance(value, str):
        return f"id має бути рядком, отримано {type(value).__name__}"
    if not ID_PATTERN.match(value):
        return f"id '{value}' не відповідає граматиці (див. meta/schema.md)"
    return None


def validate_amended_by(entries: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(entries, list):
        errors.append("amended_by має бути списком")
        return errors
    for i, entry in enumerate(entries):
        prefix = f"amended_by[{i}]"
        if not isinstance(entry, dict):
            errors.append(f"{prefix}: запис має бути об'єктом")
            continue
        for key in ("date", "order", "op"):
            if key not in entry:
                errors.append(f"{prefix}: відсутнє поле '{key}'")
        op = entry.get("op")
        if op is not None and op not in ALLOWED_OP:
            errors.append(
                f"{prefix}: op='{op}' — допустимі: {sorted(ALLOWED_OP)}"
            )
        order = entry.get("order")
        if order is not None and not re.match(r"^z\d{3,5}-\d{2}$", str(order)):
            errors.append(
                f"{prefix}: order='{order}' — очікувано формат zNNNN-YY"
            )
    return errors


def lint_file(path: Path) -> FileReport:
    report = FileReport(path=path)
    text = path.read_text(encoding="utf-8")
    fm, err = extract_frontmatter(text)
    if err:
        report.errors.append(err)
        return report
    if fm is None or "id" not in fm:
        return report  # не є структурною одиницею НПА — пропускаємо
    report.frontmatter = fm

    for field_name in REQUIRED_FIELDS:
        if field_name not in fm:
            report.errors.append(f"відсутнє обов'язкове поле '{field_name}'")

    if "id" in fm:
        e = validate_id(fm["id"])
        if e:
            report.errors.append(e)

    if (t := fm.get("type")) is not None and t not in ALLOWED_TYPE:
        report.errors.append(
            f"type='{t}' — допустимі: {sorted(ALLOWED_TYPE)}"
        )

    if (s := fm.get("status")) is not None and s not in ALLOWED_STATUS:
        report.errors.append(
            f"status='{s}' — допустимі: {sorted(ALLOWED_STATUS)}"
        )

    if "source" in fm:
        src = str(fm["source"])
        if not SOURCE_HOST_OK.match(src):
            report.warnings.append(
                f"source='{src}' не з https://zakon.rada.gov.ua/ "
                "(можливо, спеціальне джерело — перевір вручну)"
            )

    if "amended_by" in fm:
        report.errors.extend(validate_amended_by(fm["amended_by"]))

    return report


def is_known_or_subpoint(ref_id: str, known_ids: set[str]) -> bool:
    """Чи відповідає ref_id або задекларованому id, або точці всередині
    задекларованої глави/наказу.

    Приклад: задекларовано `polozhennia.r1.gl1` (глава). Точка
    `polozhennia.r1.gl1.p1.1` валідна як «sub-id» цієї глави — у файлі глави
    є якір `<a id="p1.1">`.
    """
    if ref_id in known_ids:
        return True
    for declared in known_ids:
        if ref_id.startswith(declared + "."):
            return True
    return False


def lint_amendments_yaml(known_ids: set[str]) -> list[str]:
    errors: list[str] = []
    path = REPO_ROOT / "meta" / "amendments.yaml"
    if not path.exists():
        return ["meta/amendments.yaml не знайдено"]
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        return [f"meta/amendments.yaml: невалідний YAML: {e}"]
    if not isinstance(data, dict):
        return ["meta/amendments.yaml: не є об'єктом"]
    for i, amendment in enumerate(data.get("amendments", [])):
        prefix = f"meta/amendments.yaml: amendments[{i}]"
        if not isinstance(amendment, dict):
            errors.append(f"{prefix}: не є об'єктом")
            continue
        for required in ("order", "signed_at", "registration", "summary"):
            if required not in amendment:
                errors.append(f"{prefix}: відсутнє поле '{required}'")
        for j, aff in enumerate(amendment.get("affects", [])):
            if not isinstance(aff, dict):
                errors.append(f"{prefix}: affects[{j}]: не є об'єктом")
                continue
            ref_id = aff.get("id")
            if ref_id and not is_known_or_subpoint(ref_id, known_ids):
                errors.append(
                    f"{prefix}: affects[{j}].id='{ref_id}' — не знайдено "
                    "ні самого id, ні задекларованої «батьківської» глави/наказу"
                )
            op = aff.get("op")
            if op and op not in ALLOWED_OP:
                errors.append(
                    f"{prefix}: affects[{j}].op='{op}' — допустимі: {sorted(ALLOWED_OP)}"
                )
    return errors


def main() -> int:
    md_files = sorted(REPO_ROOT.rglob("*.md"))
    reports: list[FileReport] = []
    known_ids: set[str] = set()
    id_to_path: dict[str, Path] = {}

    for path in md_files:
        rel = path.relative_to(REPO_ROOT)
        if rel.parts and rel.parts[0] == "vendor":
            continue
        report = lint_file(path)
        reports.append(report)
        if report.frontmatter and (fid := report.frontmatter.get("id")):
            if fid in known_ids:
                report.errors.append(
                    f"id '{fid}' уже використано в "
                    f"{id_to_path[fid].relative_to(REPO_ROOT)}"
                )
            else:
                known_ids.add(fid)
                id_to_path[fid] = path

    # Перехресні посилання
    for report in reports:
        if not report.frontmatter:
            continue
        parent = report.frontmatter.get("parent_id")
        if parent and not is_known_or_subpoint(parent, known_ids):
            report.errors.append(
                f"parent_id='{parent}' — не знайдено "
                "ні самого id, ні задекларованої «батьківської» одиниці"
            )

    amendments_errors = lint_amendments_yaml(known_ids)

    total_errors = sum(len(r.errors) for r in reports) + len(amendments_errors)
    total_warnings = sum(len(r.warnings) for r in reports)

    for report in reports:
        if not (report.errors or report.warnings):
            continue
        rel = report.path.relative_to(REPO_ROOT)
        for err in report.errors:
            print(f"ERROR {rel}: {err}", file=sys.stderr)
        for w in report.warnings:
            print(f"WARN  {rel}: {w}")

    for err in amendments_errors:
        print(f"ERROR {err}", file=sys.stderr)

    files_with_id = sum(1 for r in reports if r.frontmatter and "id" in r.frontmatter)
    print(
        f"\nЛінт: {files_with_id} файлів з id перевірено · "
        f"{total_errors} помилок · {total_warnings} попереджень"
    )

    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
