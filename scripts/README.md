---
title: Скрипти
nav_order: 10
---

# scripts/

Допоміжні скрипти для роботи з репозиторієм.

## `lint_frontmatter.py`

Валідатор frontmatter у markdown-файлах і `meta/amendments.yaml`.

```bash
python3 scripts/lint_frontmatter.py
```

Перевіряє:

- формат `id` (за граматикою з [meta/schema.md](../meta/schema.md));
- унікальність `id` по всьому репо;
- обов'язкові поля (`id`, `type`, `title`, `status`);
- допустимі значення (`type`, `status`, `op` у `amended_by`);
- формат `order` (`zNNNN-YY`);
- посилання — `source` має вести на `zakon.rada.gov.ua`;
- перехресні посилання — `parent_id` та `affects[*].id` мають відповідати
  задекларованому `id` або бути «sub-id» задекларованого батька (наприклад,
  `polozhennia.r1.gl1.p1.1` валідне, якщо `polozhennia.r1.gl1` задеклароване).

Запускається автоматично в CI на кожен PR — див.
[.github/workflows/lint.yml](../.github/workflows/lint.yml).

## `fitness_calculator.py`

Демонстрація принципу «дані → інструменти». Читає YAML-файли статей
Розкладу хвороб і відповідає на типові запити.

```bash
# Перелічити статті, що є в репо
python3 scripts/fitness_calculator.py --list

# Деталі однієї статті
python3 scripts/fitness_calculator.py --stattia 42

# Прицільно: стаття + підпункт + графа
python3 scripts/fitness_calculator.py --stattia 1 --punkt б --graf III

# JSON-вивід для інтеграції
python3 scripts/fitness_calculator.py --stattia 42 --json
```

Це — приклад того, що дає винесення «конфігів» в YAML: реальний інструмент
на 200 рядках Python.

## `changelog_from_amendments.py`

Генерує `CHANGELOG.md` з `meta/amendments.yaml`. Демонстрація принципу
«дані → людський документ».

```bash
# показати, що згенерує (stdout)
python3 scripts/changelog_from_amendments.py

# переписати CHANGELOG.md
python3 scripts/changelog_from_amendments.py --write

# перевірити, що CHANGELOG не розсинхронізувався (для CI)
python3 scripts/changelog_from_amendments.py --check
```

CI запускає `--check` як попередження. Якщо ви редагуєте `amendments.yaml`,
маєте після цього запустити `--write` і закомітити оновлений CHANGELOG.

## Залежності

Лише `pyyaml`. Не вимагає venv.

```bash
pip install pyyaml
# або
pip3 install --user pyyaml
```
