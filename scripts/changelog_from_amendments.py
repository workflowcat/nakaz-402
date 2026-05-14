#!/usr/bin/env python3
"""Генерує CHANGELOG.md з meta/amendments.yaml.

Це демонстрація принципу «дані → людський документ». Якщо `amendments.yaml`
оновлено, цей скрипт перегенерує `CHANGELOG.md` так, щоб вони не розсихалися.

Режими:
    python3 scripts/changelog_from_amendments.py            # друкує в stdout
    python3 scripts/changelog_from_amendments.py --write    # переписує CHANGELOG.md
    python3 scripts/changelog_from_amendments.py --check    # exit 1, якщо CHANGELOG не збігається з генератом
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: PyYAML не встановлено. `pip install pyyaml`.\n")
    sys.exit(2)


REPO = Path(__file__).resolve().parent.parent
AMENDMENTS_YAML = REPO / "meta" / "amendments.yaml"
CHANGELOG_MD = REPO / "CHANGELOG.md"
JEKYLL_DATA = REPO / "_data" / "amendments.yml"


def generate(data: dict) -> str:
    base = data.get("base", {})
    amendments = data.get("amendments", [])

    by_year: dict[int, list[dict]] = defaultdict(list)
    for a in amendments:
        d = a.get("signed_at")
        year = d.year if hasattr(d, "year") else int(str(d)[:4])
        by_year[year].append(a)

    lines: list[str] = []
    lines.append("---")
    lines.append("title: CHANGELOG")
    lines.append("nav_order: 9")
    lines.append("---")
    lines.append("")
    lines.append("# CHANGELOG")
    lines.append("")
    lines.append(
        "> ⚙️ **Цей файл згенеровано автоматично** з "
        "[meta/amendments.yaml](meta/amendments.yaml) скриптом "
        "[scripts/changelog_from_amendments.py](scripts/changelog_from_amendments.py). "
        "Правте YAML, не цей файл."
    )
    lines.append("")
    lines.append("Журнал амендментів у форматі для людей.")
    lines.append("")
    lines.append("---")
    lines.append("")

    for year in sorted(by_year.keys(), reverse=True):
        lines.append(f"## {year}")
        lines.append("")
        items = sorted(by_year[year], key=lambda a: str(a.get("signed_at")), reverse=True)
        for a in items:
            order = a.get("order", "?")
            date = a.get("signed_at", "?")
            reg = a.get("registration", "")
            summary = (a.get("summary") or "").strip()
            url = f"https://zakon.rada.gov.ua/laws/show/{reg}" if reg else ""
            header = f"### Наказ № {order} від {date}"
            if url:
                header += f" — [{reg}]({url})"
            lines.append(header)
            if summary:
                lines.append(summary)
            affects = a.get("affects") or []
            if affects:
                lines.append("")
                lines.append("Зачеплені пункти:")
                for aff in affects:
                    lines.append(f"- `{aff.get('id', '?')}` ({aff.get('op', '?')})")
            lines.append("")
        lines.append("---")
        lines.append("")

    # Базова редакція
    if base:
        lines.append(f"## {str(base.get('signed_at'))[:4]} (базова редакція)")
        lines.append("")
        reg = base.get("registration", "")
        url = f"https://zakon.rada.gov.ua/laws/show/{reg}" if reg else ""
        date = base.get("signed_at", "?")
        lines.append(
            f"### Наказ № {base.get('order')} від {date}"
            + (f" — [{reg}]({url})" if url else "")
        )
        lines.append(f"**{base.get('title', '').strip()}**")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="overwrite CHANGELOG.md")
    parser.add_argument("--check", action="store_true", help="fail if out of sync")
    args = parser.parse_args()

    if not AMENDMENTS_YAML.exists():
        sys.stderr.write(f"ERROR: {AMENDMENTS_YAML} не знайдено\n")
        return 2

    data = yaml.safe_load(AMENDMENTS_YAML.read_text(encoding="utf-8"))
    generated = generate(data)

    if args.write:
        CHANGELOG_MD.write_text(generated, encoding="utf-8")
        # Sync Jekyll's _data copy
        JEKYLL_DATA.parent.mkdir(parents=True, exist_ok=True)
        JEKYLL_DATA.write_text(AMENDMENTS_YAML.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"Записано {CHANGELOG_MD}")
        print(f"Sync'd {JEKYLL_DATA}")
        return 0

    if args.check:
        if not CHANGELOG_MD.exists():
            sys.stderr.write("ERROR: CHANGELOG.md не існує\n")
            return 1
        current = CHANGELOG_MD.read_text(encoding="utf-8")
        if current != generated:
            sys.stderr.write(
                "ERROR: CHANGELOG.md не збігається з генератом з amendments.yaml.\n"
                "Запустіть: python3 scripts/changelog_from_amendments.py --write\n"
            )
            return 1
        print("CHANGELOG.md синхронізовано з amendments.yaml ✓")
        return 0

    sys.stdout.write(generated)
    return 0


if __name__ == "__main__":
    sys.exit(main())
