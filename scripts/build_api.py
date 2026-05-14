#!/usr/bin/env python3
"""Генерує статичні JSON-endpoint'и у `api/` з усіх YAML-джерел.

Це і є наш «API» — без бекенду, без OpenAPI-сервера. GitHub Pages віддає
`api/*.json` як звичайні файли, з кешуванням і CDN. Зовнішній сервіс
робить GET — отримує дані. Версія API == git commit.

Згенеровані файли:
    api/index.json                       — манифест: список усіх endpoint'ів
    api/amendments.json                  — повний журнал амендментів
    api/dodatok-1/index.json             — список статей Розкладу хвороб
    api/dodatok-1/stattia-N.json         — конкретна стаття

Запуск:
    python3 scripts/build_api.py
"""

from __future__ import annotations

import json
import sys
from datetime import date, datetime
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.stderr.write("ERROR: PyYAML не встановлено. `pip install pyyaml`.\n")
    sys.exit(2)


REPO = Path(__file__).resolve().parent.parent
AMENDMENTS_YAML = REPO / "meta" / "amendments.yaml"
ROZKLAD_DIR = REPO / "dodatky" / "01-rozklad-khvorob"
ROZKLAD_META = ROZKLAD_DIR / "meta.yaml"
API_DIR = REPO / "api"


def to_jsonable(value):
    """YAML-дати треба перетворити на ISO рядки для JSON."""
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    return value


def write_json(path: Path, data: dict, *, pretty: bool = True) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    indent = 2 if pretty else None
    path.write_text(
        json.dumps(to_jsonable(data), ensure_ascii=False, indent=indent, sort_keys=False) + "\n",
        encoding="utf-8",
    )
    rel = path.relative_to(REPO)
    print(f"  → {rel}")


def build_amendments() -> dict:
    data = yaml.safe_load(AMENDMENTS_YAML.read_text(encoding="utf-8"))
    return {
        "schema_version": "1",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source": "meta/amendments.yaml",
        **data,
    }


def build_rozklad() -> tuple[dict, list[dict]]:
    """Повертає (index.json, [stattia-X.json, ...])."""
    meta = yaml.safe_load(ROZKLAD_META.read_text(encoding="utf-8"))
    statti = []
    for path in sorted(ROZKLAD_DIR.glob("stattia-*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        statti.append(data)

    index = {
        "schema_version": "1",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "dodatok": 1,
        "name": "Розклад хвороб",
        "katehorii": meta.get("katehorii", {}),
        "grafy": meta.get("grafy", {}),
        "klasy": meta.get("klasy", []),
        "count": len(statti),
        "statti": [
            {
                "stattia": s["stattia"],
                "id": s.get("id"),
                "nazva": s["nazva"],
                "short_nazva": s.get("short_nazva"),
                "klas": s.get("klas"),
                "status": s.get("status", "active"),
                "punkty_count": len(s.get("punkty", [])),
                "url": f"/api/dodatok-1/stattia-{s['stattia']:03d}.json",
            }
            for s in statti
        ],
    }
    full_files = [
        {
            "path": REPO / "api" / "dodatok-1" / f"stattia-{s['stattia']:03d}.json",
            "data": {
                "schema_version": "1",
                "source": f"dodatky/01-rozklad-khvorob/stattia-{s['stattia']:03d}.yaml",
                **s,
            },
        }
        for s in statti
    ]
    return index, full_files


def build_manifest(endpoints: list[dict]) -> dict:
    return {
        "schema_version": "1",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "name": "Наказ МОУ № 402 — JSON API",
        "description": (
            "Статичний JSON-API над репозиторієм. "
            "Кожен endpoint — звичайний .json файл, що віддається GitHub Pages."
        ),
        "endpoints": endpoints,
    }


def main() -> int:
    print("Генерую JSON API…")
    amendments = build_amendments()
    write_json(API_DIR / "amendments.json", amendments)

    rozklad_index, rozklad_files = build_rozklad()
    write_json(API_DIR / "dodatok-1" / "index.json", rozklad_index)
    for item in rozklad_files:
        write_json(item["path"], item["data"])

    endpoints = [
        {
            "path": "/api/amendments.json",
            "description": "Повний журнал амендментів до наказу 402.",
        },
        {
            "path": "/api/dodatok-1/index.json",
            "description": "Список статей Розкладу хвороб + словник категорій і граф.",
        },
        {
            "path": "/api/dodatok-1/stattia-{NNN}.json",
            "description": "Окрема стаття Розкладу хвороб (NNN — номер з нулями: 001, 014, 042).",
            "examples": [
                f"/api/dodatok-1/stattia-{s['stattia']:03d}.json"
                for s in [yaml.safe_load(p.read_text(encoding='utf-8'))
                          for p in sorted(ROZKLAD_DIR.glob("stattia-*.yaml"))]
            ],
        },
    ]
    write_json(API_DIR / "index.json", build_manifest(endpoints))

    print(f"\nГотово. API лежить у {API_DIR.relative_to(REPO)}/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
