#!/usr/bin/env python3
"""Демо-калькулятор придатності до військової служби.

Демонструє ключову ідею «конфіг у додатках»: оскільки Розклад хвороб (Додаток 1)
тримається як YAML-таблиця, з нього можна **програмно** отримати категорію
придатності за статтею, підпунктом і графою.

Що це НЕ робить:
- це **не** медичний інструмент і не замінює рішення ВЛК;
- не аналізує діагнози, а просто шукає за вже відомою статтею-підпунктом;
- категорії в демо-статтях ілюстративні.

Приклади запуску:

    # Перелічити всі статті, що є в репо
    python3 scripts/fitness_calculator.py --list

    # Дізнатись категорії за статтею 42 («Артеріальна гіпертензія»)
    python3 scripts/fitness_calculator.py --stattia 42

    # Прицільно: стаття 1, підпункт «б», графа III
    python3 scripts/fitness_calculator.py --stattia 1 --punkt б --graf III

    # Видати JSON для інтеграції
    python3 scripts/fitness_calculator.py --stattia 42 --json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: PyYAML не встановлено. `pip install pyyaml`.\n")
    sys.exit(2)


REPO = Path(__file__).resolve().parent.parent
STATTI_DIR = REPO / "dodatky" / "01-rozklad-khvorob"
META_YAML = STATTI_DIR / "meta.yaml"


def load_meta() -> dict:
    return yaml.safe_load(META_YAML.read_text(encoding="utf-8"))


def load_stattia(num: int) -> dict | None:
    path = STATTI_DIR / f"stattia-{num:03d}.yaml"
    if not path.exists():
        return None
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def list_statti() -> list[dict]:
    items: list[dict] = []
    for path in sorted(STATTI_DIR.glob("stattia-*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        items.append(data)
    return items


def lookup(stattia: dict, punkt: str | None, graf: str | None) -> dict:
    """Повертає словник із результатом пошуку."""
    out: dict = {
        "stattia": stattia["stattia"],
        "nazva": stattia["nazva"],
        "status": stattia.get("status", "?"),
    }
    if punkt is None:
        out["punkty"] = stattia["punkty"]
        return out
    found = next((p for p in stattia["punkty"] if p["id"] == punkt), None)
    if found is None:
        out["error"] = f"Підпункт '{punkt}' не знайдено у статті {stattia['stattia']}"
        return out
    out["punkt"] = found
    if graf is None:
        return out
    grafy = found.get("grafy", {})
    if graf not in grafy:
        out["error"] = f"Графа '{graf}' відсутня у підпункті '{punkt}'"
        return out
    out["graf"] = graf
    out["category"] = grafy[graf]
    meta = load_meta()
    out["category_label"] = meta.get("katehorii", {}).get(grafy[graf], "?")
    out["graf_audience"] = meta.get("grafy", {}).get(graf, {}).get("audience", "?")
    return out


def print_human(result: dict) -> None:
    print(f"Стаття {result['stattia']}: {result['nazva']}  [{result['status']}]")
    if "error" in result:
        print(f"  ⚠ {result['error']}", file=sys.stderr)
        sys.exit(1)
    if "punkty" in result:
        print()
        print("  Підпункти:")
        for p in result["punkty"]:
            print(f"    {p['id']}) {p['opys']}")
            grafy = p.get("grafy", {})
            print(
                "       графи: "
                + ", ".join(f"{k}:{v}" for k, v in grafy.items())
            )
        return
    if "punkt" in result:
        p = result["punkt"]
        print(f"  Підпункт «{p['id']}»: {p['opys']}")
        grafy = p.get("grafy", {})
        if "category" in result:
            print(
                f"  Графа {result['graf']} ({result['graf_audience']}): "
                f"\033[1;36m{result['category']}\033[0m "
                f"— {result['category_label']}"
            )
        else:
            print("  Категорії по графах:")
            for k, v in grafy.items():
                print(f"    {k}: {v}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Калькулятор придатності за Розкладом хвороб (демо)"
    )
    parser.add_argument("--list", action="store_true", help="перелічити всі статті")
    parser.add_argument("--stattia", type=int, help="номер статті")
    parser.add_argument("--punkt", type=str, help="підпункт: а, б, в, ...")
    parser.add_argument("--graf", type=str, help="графа: I, II, III, IV")
    parser.add_argument("--json", action="store_true", help="вивести JSON")
    args = parser.parse_args()

    if args.list:
        items = list_statti()
        if args.json:
            print(json.dumps(
                [{"stattia": i["stattia"], "nazva": i["nazva"]} for i in items],
                ensure_ascii=False, indent=2,
            ))
        else:
            print(f"Знайдено {len(items)} статей у dodatky/01-rozklad-khvorob/:\n")
            for i in items:
                print(f"  {i['stattia']:3d}  {i['nazva']}")
        return 0

    if not args.stattia:
        parser.print_help()
        return 0

    stattia = load_stattia(args.stattia)
    if stattia is None:
        sys.stderr.write(f"Стаття {args.stattia} не знайдена.\n")
        return 1

    result = lookup(stattia, args.punkt, args.graf)
    if args.json:
        # YAML повертає dict, який json не серіалізує (всередині — рядки),
        # тож достатньо ensure_ascii=False.
        # Якщо в подальшому з'являться datetime — додамо default=str.
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    else:
        print_human(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
