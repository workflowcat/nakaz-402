#!/usr/bin/env python3
"""Парсер rada.gov.ua → структурований Markdown для нашого репо.

Тягне сторінку наказу 402 з rada.gov.ua (або з локального файла), знаходить
зазначену главу, екстрагує текст пункт за пунктом, розпізнає маркери
амендментів у фігурних дужках і складає файл у форматі нашого frontmatter.

Чому це окремий tool, який ти запускаєш сам:
- Працює з public-domain офіційним текстом, що публікується rada.gov.ua
- Авторитетним джерелом залишається rada.gov.ua; цей tool — інженерна допомога
- Ти контролюєш коли і що тягнути (rate limit, cache, ручний review)

Використання:

    # Витягти Розділ I Главу 3 з locally-cached HTML:
    python3 scripts/pull_chapter.py --html /tmp/nakaz-402.html \
        --chapter "Розділ I Глава 3" --out polozhennia/01-osnovy-organizatsii/03-rozhliad-zvernen.md

    # Витягти Розділ II Главу 2 з прямого fetch'у:
    python3 scripts/pull_chapter.py --url https://zakon.rada.gov.ua/laws/show/z1109-08/print \
        --chapter "Розділ II Глава 2" --out polozhennia/02-medychnyi-oglyad/02-glava.md

    # Витягти редакцію станом на конкретну дату (історична версія):
    python3 scripts/pull_chapter.py --url https://zakon.rada.gov.ua/laws/show/z1109-08/ed20240427/print \
        --chapter "Розділ I Глава 2" --out /tmp/glava2-as-of-2024-04-27.md

    # Перелічити всі знайдені секції:
    python3 scripts/pull_chapter.py --html /tmp/nakaz-402.html --list

Output: Markdown-файл з frontmatter (id, type, parent_id, title, source, status,
amended_by) і дослівним текстом з блок-цитатами маркерів {Із змінами...}.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from urllib.request import Request, urlopen

try:
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    sys.stderr.write("ERROR: BeautifulSoup не встановлено. pip install beautifulsoup4 lxml\n")
    sys.exit(2)


REPO = Path(__file__).resolve().parent.parent
RADA_BASE = "https://zakon.rada.gov.ua/laws/show/z1109-08"

ROMAN = {1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X"}
ROMAN_REV = {v: k for k, v in ROMAN.items()}


@dataclass
class Section:
    rozdil_num: int = 0   # 1, 2, 3...
    rozdil_name: str = ""
    glava_num: int = 0
    glava_name: str = ""
    elements: list = field(default_factory=list)  # list of HTML-tags within the section


def fetch_html(url: str) -> str:
    """Завантажує HTML з rada.gov.ua з нормальним User-Agent."""
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (nakaz-402 puller; contact via github.com/workflowcat/nakaz-402)",
        "Accept-Language": "uk,en;q=0.5",
    })
    with urlopen(req) as r:
        return r.read().decode("utf-8")


def parse_sections(soup: BeautifulSoup) -> list[Section]:
    """Витягує список усіх розділ/глава секцій документа.

    Стратегія: проходимо через всі прямі нащадки body (або основного контейнера),
    знаходимо текст-маркери «Розділ X» і «Глава N. ...», групуємо все між ними.
    """
    sections: list[Section] = []
    current: Section | None = None
    current_rozdil_num = 0
    current_rozdil_name = ""

    # Збираємо всі parsable елементи у послідовність
    # Зосереджуємось на <p>, <div>, які мають текст
    container = soup.find("body") or soup
    elements = container.find_all(["p", "div", "h1", "h2", "h3", "h4", "table"], recursive=True)

    rozdil_re = re.compile(r"^Розділ\s+(I{1,3}|IV|V{1,3}|IX|X)\s*\.?\s*(.*)?$", re.UNICODE)
    glava_re = re.compile(r"^Глава\s+(\d+)\s*\.?\s*(.*)?$", re.UNICODE)

    for el in elements:
        # Шукаємо тільки прямий текст вузла (не вкладені)
        # Беремо .get_text(strip=True) — повний текст
        text = el.get_text(separator=" ", strip=True)
        if not text or len(text) > 400:
            # Скоріш за все блок-контент, не заголовок
            # Все одно додаємо в current section якщо є
            if current and len(text) > 0:
                current.elements.append(el)
            continue

        # Roz dil header?
        m = rozdil_re.match(text)
        if m:
            current_rozdil_num = ROMAN_REV.get(m.group(1), 0)
            current_rozdil_name = (m.group(2) or "").strip().rstrip(".")
            continue

        # Glava header?
        m = glava_re.match(text)
        if m and len(text) < 250:
            # Зберегти попередню секцію
            if current:
                sections.append(current)
            current = Section(
                rozdil_num=current_rozdil_num,
                rozdil_name=current_rozdil_name,
                glava_num=int(m.group(1)),
                glava_name=(m.group(2) or "").strip().rstrip("."),
            )
            continue

        # Звичайний контент — додати до current
        if current:
            current.elements.append(el)

    if current:
        sections.append(current)
    return sections


def element_to_markdown(el) -> str:
    """Конвертує один HTML-елемент у Markdown-фрагмент."""
    text = el.get_text(separator=" ", strip=True)
    if not text:
        return ""

    # Маркер амендменту: текст у фігурних дужках
    if text.startswith("{") and text.endswith("}"):
        # Перетворити <a href="...">текст</a> на [текст](URL)
        md = ""
        for child in el.descendants:
            if isinstance(child, NavigableString):
                md += str(child)
            elif child.name == "a" and child.get("href"):
                href = child["href"]
                # Скорочуємо до zXXXX-XX якщо це rada.gov.ua анкер
                m = re.search(r"(z\d{3,5}-\d{2})", href)
                label = m.group(1) if m else child.get_text(strip=True)
                md = md.rstrip()
                md += f" [{label}]({href})"
        md = re.sub(r"\s+", " ", md).strip()
        return f"> *{md}*"

    # Пункт-header: «1.1.», «2.3.», «10.1.» — окремий <p> з коротким текстом
    m = re.match(r"^(\d+(?:\.\d+){0,2})\.\s*(.+)$", text)
    if m and len(text) < 120:
        # Це може бути заголовок пункту з його початковим текстом
        # Або просто короткий пункт повністю
        return f"## {m.group(1)}.\n\n{m.group(2)}"

    # Звичайний абзац — повертаємо текст з прибраним whitespace
    return text


def section_to_markdown(s: Section, original_text_id: str | None = None) -> str:
    """Генерує повний .md файл для глави."""
    if not s.glava_num:
        return ""

    page_id = f"polozhennia.r{s.rozdil_num}.gl{s.glava_num}"
    parent_id = f"polozhennia.r{s.rozdil_num}"
    rozdil_roman = ROMAN.get(s.rozdil_num, str(s.rozdil_num))

    fm = (
        "---\n"
        f"id: {page_id}\n"
        "type: glava\n"
        f"parent_id: {parent_id}\n"
        f"title: \"Глава {s.glava_num}. {s.glava_name}\"\n"
        "flavor: content\n"
        "source: https://zakon.rada.gov.ua/laws/show/z1109-08\n"
        "status: active\n"
        f"parent: \"Розділ {rozdil_roman}. {s.rozdil_name}\"\n"
        "grand_parent: Положення\n"
        f"nav_order: {s.glava_num}\n"
        "---\n\n"
    )

    body_parts = [f"# Глава {s.glava_num}. {s.glava_name}\n"]
    body_parts.append("{% include chapter-context.html %}")
    body_parts.append("{% include amendment-history.html %}\n")

    current_punkt = None
    paragraphs = []

    for el in s.elements:
        md = element_to_markdown(el)
        if not md:
            continue

        # Якщо це новий пункт-header
        if md.startswith("## "):
            # Зберегти попередній якщо був
            paragraphs.append(md)
            # Запам'ятати номер для anchor
            m = re.match(r"## (\d+(?:\.\d+){0,2})\.", md)
            if m:
                anchor = "p" + m.group(1)
                paragraphs.append(f'<a id="{anchor}"></a>')
                # Перевернути порядок: anchor має бути ПЕРЕД h2
                paragraphs[-2], paragraphs[-1] = paragraphs[-1], paragraphs[-2]
        else:
            paragraphs.append(md)

    body_parts.extend(paragraphs)

    return fm + "\n\n".join(body_parts) + "\n"


def list_sections(soup: BeautifulSoup) -> None:
    """Печатає перелік знайдених розділ/глава секцій."""
    sections = parse_sections(soup)
    print(f"Знайдено {len(sections)} глав:\n")
    for s in sections:
        rozdil_roman = ROMAN.get(s.rozdil_num, "?")
        title = s.glava_name or "(без назви)"
        el_count = len(s.elements)
        print(f"  Розділ {rozdil_roman:>3} · Глава {s.glava_num:>2}. {title:<60}  [{el_count} blocks]")


def find_section(soup: BeautifulSoup, query: str) -> Section | None:
    """Знаходить секцію за запитом виду 'Розділ I Глава 3'."""
    m = re.match(r"\s*Розділ\s+(I{1,3}|IV|V{1,3}|IX|X)\s+Глава\s+(\d+)\s*", query, re.UNICODE)
    if not m:
        return None
    target_rozdil = ROMAN_REV.get(m.group(1), 0)
    target_glava = int(m.group(2))
    for s in parse_sections(soup):
        if s.rozdil_num == target_rozdil and s.glava_num == target_glava:
            return s
    return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--html", help="Локальний HTML-файл")
    ap.add_argument("--url", help="URL для fetch")
    ap.add_argument("--chapter", help="«Розділ I Глава 3»")
    ap.add_argument("--out", help="Output Markdown file")
    ap.add_argument("--list", action="store_true", help="Перелічити всі знайдені секції")
    ap.add_argument("--at", help="Дата для історичної редакції (YYYY-MM-DD)")
    args = ap.parse_args()

    # Завантажуємо HTML
    if args.html:
        with open(args.html, "r", encoding="utf-8") as f:
            html = f.read()
    elif args.url:
        url = args.url
        if args.at:
            # Конвертуємо YYYY-MM-DD у YYYYMMDD для rada.gov.ua/ed{date}/
            date = args.at.replace("-", "")
            url = f"{RADA_BASE}/ed{date}/print"
        print(f"Fetching {url}...", file=sys.stderr)
        html = fetch_html(url)
    else:
        # Дефолт — спробувати локальний кеш або тягнути print
        cache = Path("/tmp/nakaz-402.html")
        if cache.exists():
            html = cache.read_text(encoding="utf-8")
        else:
            url = f"{RADA_BASE}/print"
            print(f"Fetching {url}...", file=sys.stderr)
            html = fetch_html(url)
            cache.write_text(html, encoding="utf-8")

    soup = BeautifulSoup(html, "html.parser")

    if args.list:
        list_sections(soup)
        return 0

    if not args.chapter:
        ap.error("Вкажи --chapter «Розділ X Глава N» або --list")

    section = find_section(soup, args.chapter)
    if not section:
        sys.stderr.write(f"Секція «{args.chapter}» не знайдена. Запусти з --list щоб побачити всі.\n")
        return 1

    md = section_to_markdown(section)
    if args.out:
        Path(args.out).write_text(md, encoding="utf-8")
        print(f"Записано {args.out} ({len(md)} bytes)")
    else:
        sys.stdout.write(md)
    return 0


if __name__ == "__main__":
    sys.exit(main())
