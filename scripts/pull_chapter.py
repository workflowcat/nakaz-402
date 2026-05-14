#!/usr/bin/env python3
"""Парсер офіційного PDF наказу 402 → структуровані Markdown файли репо.

Підтримує:
- PDF з rada.gov.ua «Текст для друку» (через pdfplumber)
- Локальний txt-кеш (для швидкого re-run)
- Авто-розпізнавання структури: Розділ → Глава → Пункт
- Амендмент-маркери у {...} → блок-цитати + auto-populate amended_by
- Стабільні id за нашою граматикою polozhennia.rN.glM, пункти як якорі

Використання:
    # Витягти все одним пасом (24 файли)
    python3 scripts/pull_chapter.py --pdf "/path/to/order-402.pdf"

    # З локального txt-кешу (швидше)
    python3 scripts/pull_chapter.py --txt /tmp/nakaz-402-full.txt

    # Тільки одну главу
    python3 scripts/pull_chapter.py --txt /tmp/nakaz-402-full.txt --only 2.3

    # Препроцесинг: тільки extract text → файл (для швидких ітерацій)
    python3 scripts/pull_chapter.py --pdf "/path/to/order-402.pdf" --extract-only /tmp/full.txt
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


REPO = Path(__file__).resolve().parent.parent
ROZDIL_DIRS = {
    1: "01-osnovy-organizatsii",
    2: "02-medychnyi-oglyad",
}
GLAVA_FILENAMES = {
    # Розділ I — людино-читабельні слаги для відомих глав
    (1, 1): "01-zagalni-polozhennia",
    (1, 2): "02-organy-vle",
    (1, 3): "03-rozhliad-zvernen",
    # Розділ II Глава 1 — те саме
    (2, 1): "01-zagalni-polozhennia",
}
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}
ROMAN_REV = {v: k for k, v in ROMAN.items()}


# ──────────────────────────────────────────────────────────────────
# Витягнення тексту з PDF
# ──────────────────────────────────────────────────────────────────

def extract_text_from_pdf(path: str) -> str:
    try:
        import pdfplumber
    except ImportError:
        sys.stderr.write("ERROR: pdfplumber не встановлено. pip install pdfplumber\n")
        sys.exit(2)
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            lines = text.split("\n")
            # Прибираємо стандартну сторінкову header-стрічку
            if lines and "затвердження Положення про" in lines[0]:
                lines = lines[1:]
            pages.append("\n".join(lines))
    full = "\n".join(pages)
    # Cleanup: прибираємо page-footer лінії типу "https://zakon.../print 14/169"
    full = re.sub(r'(?m)^https?://zakon\.rada\.gov\.ua/[^\s]+\s+\d+/\d+\s*$', '', full)
    # Date-time headers типу "5/14/26, 3:14 PM ..."
    full = re.sub(r'(?m)^\d+/\d+/\d+,\s+\d+:\d+\s+(AM|PM)\s+.*$', '', full)
    return full


# ──────────────────────────────────────────────────────────────────
# Парсинг структури
# ──────────────────────────────────────────────────────────────────

ROZDIL_RE   = re.compile(r"^([IVX]+)\.\s+(.+?)\s*$")
GLAVA_RE    = re.compile(r"^(\d+)\.\s+([А-ЯІЇЄҐ].{2,250})\s*$")  # short line starting with N. + Capital
PUNKT_RE    = re.compile(r"^(\d+\.\d+(?:\.\d+)?)\.\s+(.+)$")
SUBPUNKT_RE = re.compile(r"^([а-яіїєґ])\)\s+(.+)$")
MARKER_OPEN = re.compile(r"^\{")
MARKER_CLOSE = re.compile(r"\}\s*$")
DODATOK_RE  = re.compile(r"^Додаток(?:\s+\d+)?\s*$|^ДОДАТКИ?\s*$")  # тільки standalone "Додаток N" як stop
MAX_GLAVA_PER_ROZDIL = 23  # cap — не приймаємо main-text numbered items типу «1. Затвердити...» як главу


@dataclass
class Punkt:
    num: str               # "1.1" or "2.3.1"
    text_lines: list = field(default_factory=list)
    markers: list = field(default_factory=list)  # list of {raw, year, order_ref, scope}


@dataclass
class Glava:
    rozdil_num: int
    num: int
    title: str
    punkty: list = field(default_factory=list)
    intro_lines: list = field(default_factory=list)  # before first punkt
    raw_markers: list = field(default_factory=list)


def is_glava_header(line: str, last_glava_num: int) -> tuple[int, str] | None:
    """«N. Назва глави» — монотонне зростання N від попередньої глави.

    Сильний signal: N > last_glava_num, sequential (gap ≤ 5), capitalized title.
    Не вимагаємо blank-line перед — глави часто впритул після пункт-контенту.
    """
    m = GLAVA_RE.match(line)
    if not m:
        return None
    num = int(m.group(1))
    if num <= last_glava_num:
        return None
    if num > MAX_GLAVA_PER_ROZDIL:
        return None
    if last_glava_num > 0 and num > last_glava_num + 5:
        return None
    title = m.group(2).strip().rstrip(',')
    if len(title) > 250:
        return None
    if not title or not (title[0].isupper() or title[0] in 'ІЇЄҐ'):
        return None
    return num, title


def parse_document(text: str) -> dict:
    """Повертає dict з ключами 'glava_(rozdil,num)' → Glava."""
    lines = text.split("\n")
    glavas: dict[tuple[int, int], Glava] = {}
    current_rozdil = 0
    last_glava_per_rozdil: dict[int, int] = {}  # rozdil_num → last detected glava_num
    current_glava: Glava | None = None
    current_punkt: Punkt | None = None
    in_marker = False
    marker_buffer: list[str] = []
    prev_was_rozdil_or_blank = True

    def flush_marker(target):
        if not marker_buffer:
            return
        raw = " ".join(l.strip() for l in marker_buffer).strip()
        if raw.startswith("{"): raw = raw[1:]
        if raw.endswith("}"): raw = raw[:-1]
        target.append(raw.strip())

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        # Continuation of marker
        if in_marker:
            marker_buffer.append(stripped)
            if MARKER_CLOSE.search(stripped):
                in_marker = False
                target = current_punkt.markers if current_punkt else (
                    current_glava.raw_markers if current_glava else []
                )
                flush_marker(target)
                marker_buffer = []
                # після закриття маркера — наступний рядок може бути новою главою
                prev_was_rozdil_or_blank = True
            continue

        # Marker start
        if MARKER_OPEN.match(stripped):
            if MARKER_CLOSE.search(stripped):
                # single-line marker
                raw = stripped[1:].rstrip()
                if raw.endswith("}"): raw = raw[:-1]
                target = current_punkt.markers if current_punkt else (
                    current_glava.raw_markers if current_glava else []
                )
                target.append(raw.strip())
                prev_was_rozdil_or_blank = True  # після маркера може йти глава
            else:
                in_marker = True
                marker_buffer = [stripped]
            continue

        # Empty line — boundary signal
        if not stripped:
            prev_was_rozdil_or_blank = True
            continue

        # Stop-marker для глав: «Додаток N» / «ДОДАТКИ» / «Розклад хвороб»
        # — після цих рядків починаються додатки, не глави Положення
        if DODATOK_RE.match(stripped) and current_rozdil > 0:
            current_glava = None
            current_punkt = None
            current_rozdil = -1  # disable further glava/rozdil detection
            continue

        # Розділ header — приймаємо лише I і II (III виключено наказом № 602/2017,
        # подальші згадки "III." у тексті — це класи Розкладу хвороб у Дотатках)
        m = ROZDIL_RE.match(stripped)
        if m and m.group(1) in ("I", "II") and len(stripped) < 100:
            title = m.group(2).strip()
            if not any(p in title for p in ['.', ',', ':']) and len(title) < 80:
                new_rozdil = ROMAN[m.group(1)]
                # Тільки якщо new > current — щоб не reset'ити на повторні згадки
                if new_rozdil > current_rozdil:
                    current_rozdil = new_rozdil
                    last_glava_per_rozdil.setdefault(current_rozdil, 0)
                    current_glava = None
                    current_punkt = None
                    prev_was_rozdil_or_blank = True
                    continue

        # Глава header (потрібно current_rozdil > 0 щоб відкинути numbered items з преамбули)
        if current_rozdil > 0:
            last_n = last_glava_per_rozdil.get(current_rozdil, 0)
            gh = is_glava_header(stripped, last_n)
            if gh:
                num, title = gh
                current_glava = Glava(rozdil_num=current_rozdil, num=num, title=title)
                glavas[(current_rozdil, num)] = current_glava
                last_glava_per_rozdil[current_rozdil] = num
                current_punkt = None
                prev_was_rozdil_or_blank = True
                continue

        # Punkt header
        pm = PUNKT_RE.match(stripped)
        if pm and current_glava:
            num = pm.group(1)
            rest = pm.group(2).strip()
            current_punkt = Punkt(num=num)
            current_punkt.text_lines.append(rest)
            current_glava.punkty.append(current_punkt)
            prev_was_rozdil_or_blank = False
            continue

        # Plain content
        if current_punkt is not None:
            current_punkt.text_lines.append(stripped)
        elif current_glava is not None:
            current_glava.intro_lines.append(stripped)
        prev_was_rozdil_or_blank = False

    return glavas


# ──────────────────────────────────────────────────────────────────
# Рендеринг Markdown
# ──────────────────────────────────────────────────────────────────

ORDER_RE = re.compile(r"Наказ[ом|у]*\s+Міністерства\s+оборони\s+№\s*(\d+)\s+від\s+(\d{2}\.\d{2}\.\d{4})")
REG_RE = re.compile(r"(z\d{3,5}-\d{2})")


def parse_marker(raw: str) -> dict:
    """Витягає з marker'у дату, наказ, op, scope."""
    out = {"raw": raw, "op": "edit", "date": None, "order": None, "scope": None}
    # Op detection
    text = raw.lower()
    if "доповнено новою главою" in text or "доповнено новим" in text:
        out["op"] = "insert"
    elif "в редакції наказу" in text or "у редакції наказу" in text:
        out["op"] = "redaction"
    elif "виключено" in text or "втратив чинність" in text:
        out["op"] = "repeal"
    elif "із змінами" in text or "із змінам" in text:
        out["op"] = "edit"
    # Date + order
    m = ORDER_RE.search(raw)
    if m:
        order_num = m.group(1)
        date = m.group(2)
        # Convert DD.MM.YYYY → YYYY-MM-DD
        try:
            dd, mm, yyyy = date.split(".")
            out["date"] = f"{yyyy}-{mm}-{dd}"
        except Exception:
            out["date"] = date
        out["order_num"] = order_num
    # Registration reference (для лінків zXXXX-XX)
    rm = REG_RE.search(raw)
    if rm:
        out["order"] = rm.group(1)
    return out


def render_marker_md(raw: str) -> str:
    """Конвертує текст маркера у Markdown-блокцитату, лінкує z****-**."""
    text = raw
    # Замінюємо zNNNN-YY на markdown link
    def linkify(m):
        ref = m.group(1)
        return f"[{ref}](https://zakon.rada.gov.ua/laws/show/{ref})"
    text = REG_RE.sub(linkify, text)
    return "> *{" + text + "}*"


def render_glava(g: Glava) -> str:
    """Будує повний .md контент глави з frontmatter."""
    page_id = f"polozhennia.r{g.rozdil_num}.gl{g.num}"
    parent_id = f"polozhennia.r{g.rozdil_num}"
    roman = ROMAN_REV.get(g.rozdil_num, str(g.rozdil_num))
    rozdil_name = "Основи організації ВЛЕ" if g.rozdil_num == 1 else "Медичний огляд"

    # Зведений amended_by — об'єднання маркерів зі всіх пунктів + глави
    seen = set()
    amended_by_entries = []
    all_markers = list(g.raw_markers)
    for p in g.punkty:
        all_markers.extend(p.markers)
    for raw in all_markers:
        info = parse_marker(raw)
        if not info.get("date") or not info.get("order"):
            continue
        key = (info["date"], info["order"], info["op"])
        if key in seen:
            continue
        seen.add(key)
        amended_by_entries.append(info)

    amended_by_entries.sort(key=lambda x: (x["date"] or "9999", x["order"] or ""))

    # Frontmatter
    fm_lines = ["---"]
    fm_lines.append(f"id: {page_id}")
    fm_lines.append("type: glava")
    fm_lines.append(f"parent_id: {parent_id}")
    title_escaped = g.title.replace('"', '\\"')
    fm_lines.append(f'title: "Глава {g.num}. {title_escaped}"')
    fm_lines.append("flavor: content")
    fm_lines.append("source: https://zakon.rada.gov.ua/laws/show/z1109-08")
    fm_lines.append("status: active")
    fm_lines.append(f'parent: "Розділ {roman}. {rozdil_name}"')
    fm_lines.append("grand_parent: Положення")
    fm_lines.append(f"nav_order: {g.num}")
    if amended_by_entries:
        fm_lines.append("amended_by:")
        for a in amended_by_entries:
            scope = ""
            line = f'  - {{ date: {a["date"]}, order: {a["order"]}, op: {a["op"]} }}'
            fm_lines.append(line)
    fm_lines.append("---")
    fm_lines.append("")

    body = []
    body.append(f"# Глава {g.num}. {g.title}")
    body.append("")
    body.append("{% include chapter-context.html %}")
    body.append("{% include amendment-history.html %}")
    body.append("")

    # Intro (між глава header і першим пунктом — рідкісно, але буває)
    for line in g.intro_lines:
        body.append(line)
    if g.intro_lines:
        body.append("")

    # Punkty
    for p in g.punkty:
        anchor = "p" + p.num
        body.append(f'<a id="{anchor}"></a>')
        body.append(f"## {p.num}.")
        body.append("")
        # Об'єднуємо рядки в абзаци — лінії, розділені порожніми, стають окремими параграфами
        text_block = "\n".join(p.text_lines)
        # Прибираємо leading whitespace, нормалізуємо пробіли
        text_block = re.sub(r"[ \t]+", " ", text_block)
        # Розбиваємо на параграфи (порожні рядки)
        paragraphs = re.split(r"\n{2,}", text_block.strip())
        for para in paragraphs:
            para = para.strip()
            if para:
                body.append(para)
                body.append("")
        # Маркери
        for raw in p.markers:
            body.append(render_marker_md(raw))
            body.append("")

    return "\n".join(fm_lines + body).rstrip() + "\n"


def slug_for_glava(rozdil_num: int, glava_num: int) -> str:
    if (rozdil_num, glava_num) in GLAVA_FILENAMES:
        return GLAVA_FILENAMES[(rozdil_num, glava_num)]
    return f"{glava_num:02d}-glava"


# ──────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--pdf", help="Path to PDF")
    ap.add_argument("--txt", help="Path to pre-extracted text (faster для re-run)")
    ap.add_argument("--extract-only", help="Тільки витягти text у файл і вийти")
    ap.add_argument("--only", help="Конкретна глава, формат 'rozdil.glava' (напр. '2.3')")
    ap.add_argument("--dry-run", action="store_true", help="Не записувати файли, тільки звіт")
    args = ap.parse_args()

    if args.pdf:
        text = extract_text_from_pdf(args.pdf)
        if args.extract_only:
            Path(args.extract_only).write_text(text, encoding="utf-8")
            print(f"Extracted {len(text)} chars → {args.extract_only}")
            return 0
    elif args.txt:
        text = Path(args.txt).read_text(encoding="utf-8")
    else:
        ap.error("Вкажи --pdf або --txt")

    print(f"Текст: {len(text)} chars", file=sys.stderr)
    glavas = parse_document(text)
    print(f"Знайдено глав: {len(glavas)}", file=sys.stderr)

    if not glavas:
        print("ERROR: парсер не знайшов жодної глави. Текст-структура не відповідає очікуванням.", file=sys.stderr)
        return 1

    # Фільтр
    if args.only:
        try:
            r, g = args.only.split(".")
            r, g = int(r), int(g)
            glavas = {(r, g): glavas[(r, g)]} if (r, g) in glavas else {}
        except Exception:
            ap.error("--only формат rozdil.glava напр. 2.3")
    if not glavas:
        print(f"Глава {args.only} не знайдена", file=sys.stderr)
        return 1

    # Render + write
    written = []
    for (rn, gn), glava in sorted(glavas.items()):
        slug = slug_for_glava(rn, gn)
        outdir = REPO / "polozhennia" / ROZDIL_DIRS.get(rn, f"{rn:02d}-")
        outdir.mkdir(parents=True, exist_ok=True)
        # У старій файловій схемі для глав без явного slug ми використовуємо «{num:02d}-glava.md»
        outpath = outdir / f"{slug}.md"
        md = render_glava(glava)
        if args.dry_run:
            print(f"  [DRY] would write {outpath.relative_to(REPO)}  ({len(md)} chars, {len(glava.punkty)} пунктів)")
            continue
        outpath.write_text(md, encoding="utf-8")
        written.append((outpath, len(glava.punkty), len(md)))

    if not args.dry_run:
        print(f"\nЗаписано {len(written)} файлів:")
        for path, n_punkt, size in written:
            print(f"  {path.relative_to(REPO)}  ({size} chars, {n_punkt} пунктів)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
