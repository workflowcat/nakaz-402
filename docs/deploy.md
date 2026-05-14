---
title: Деплой і налаштування
nav_order: 12
description: "Як викласти цей репозиторій на GitHub з працюючим Pages-сайтом"
---

# Деплой і налаштування
{: .no_toc }

<details markdown="1">
<summary>На цій сторінці</summary>

- TOC
{:toc}

</details>

---

## TL;DR

```bash
# у директорії з репо
gh repo create nakaz-402 --public --source=. --remote=origin --push
gh repo edit --enable-discussions
gh repo edit --enable-issues
# увімкнути Pages з GitHub Actions як джерелом:
gh api -X PUT "repos/{owner}/nakaz-402/pages" \
  -F build_type=workflow \
  -H "Accept: application/vnd.github+json"
```

Через 1—2 хвилини на `https://<user>.github.io/nakaz-402/` буде сайт.

---

## Покроково (більш контрольовано)

### 1. Створіть GitHub repo

Якщо ви ще не пушили цей репозиторій:

```bash
cd /Users/kit/Codius/402git
gh repo create nakaz-402 --public --source=. --remote=origin --push
```

Альтернатива (без `gh`): створіть репо в GitHub UI, потім

```bash
git remote add origin git@github.com:<owner>/nakaz-402.git
git branch -M main
git push -u origin main
```

### 2. Налаштуйте `baseurl` у `_config.yml`

Якщо репозиторій **не** на user/org-сайті (тобто URL буде
`https://<user>.github.io/nakaz-402/`, а не `https://<user>.github.io/`):

```yaml
# _config.yml
baseurl: "/nakaz-402"
url: "https://<user>.github.io"
```

Якщо репо саме `<user>.github.io` — `baseurl: ""`, `url: "https://<user>.github.io"`.

Закомітьте і запуште.

### 3. Увімкніть GitHub Pages з джерелом «GitHub Actions»

**Це критичний крок** — без нього workflow не зможе деплоїтись.

**Через UI:**

1. Settings → Pages
2. Source: **GitHub Actions** (не «Deploy from a branch»)
3. Save

**Через CLI:**

```bash
gh api -X PUT "repos/<owner>/nakaz-402/pages" \
  -F build_type=workflow \
  -H "Accept: application/vnd.github+json"
```

### 4. Перевірте, що workflow стартонув

```bash
gh run list --workflow=pages.yml
gh run watch
```

Після успішного `Build & deploy GitHub Pages` (1—2 хв) — відкрийте
`https://<user>.github.io/nakaz-402/`.

### 5. Увімкніть Discussions (опціонально)

Якщо хочете, щоб посилання з Issue-конфігу працювало:

```bash
gh repo edit --enable-discussions
```

Або: Settings → Features → Discussions ✓.

---

## Що ще варто зробити

### Branch protection

Захистіть `main`:

```bash
gh api -X PUT "repos/<owner>/nakaz-402/branches/main/protection" \
  -H "Accept: application/vnd.github+json" \
  -F required_status_checks[strict]=true \
  -F required_status_checks[contexts][]="lint" \
  -F required_pull_request_reviews[required_approving_review_count]=1 \
  -F enforce_admins=false
```

(Або в UI: Settings → Branches → Add rule)

### Repository description і topics

```bash
gh repo edit --description "Машино-читабельна git-редакція Наказу МОУ № 402 (ВЛЕ)"
gh repo edit --add-topic legal-tech --add-topic ukraine --add-topic civic-tech \
              --add-topic military-medical --add-topic open-government
```

### Custom domain (опціонально)

Якщо є власний домен:

```
echo "402.example.ua" > CNAME
git add CNAME && git commit -m "Add CNAME" && git push
```

Потім в GitHub Settings → Pages → Custom domain.

---

## Поширені проблеми

### Сайт показує README, але не index.md

Перевірте `_config.yml`: має бути `exclude: [..., README.md]`. Або
`README.md` має містити `permalink: /readme/` у frontmatter.

У нашому _config.yml це вже є.

### 404 на сторінках з кириличними URL

Кирилічних URL у нас немає — всі шляхи ASCII. Якщо додаєте — пам'ятайте, що
треба URL-encoding (`%D1%80...`). Краще тримати шляхи латиницею.

### Mermaid діаграми не рендеряться

Перевірте `mermaid:` секцію в `_config.yml` (вона є). Версія теми
just-the-docs має бути ≥ 0.6.

### Workflow має `permission denied`

Settings → Actions → General → Workflow permissions → **Read and write permissions**.

### CI лінт каже «PyYAML не встановлено»

У `.github/workflows/lint.yml` має бути `pip install pyyaml` (є).

---

## Швидкий smoke test після деплою

1. **Сайт відкривається** — `https://<user>.github.io/nakaz-402/` → бачимо landing з трьома кнопками.
2. **Навігація працює** — у лівій панелі видно «Наказ № 402», «Положення», «Додатки» тощо.
3. **Пошук** — `/` → ввести «Трембіта» → знаходить п. 1.4.
4. **Mermaid рендериться** — відкрити «Архітектура», бачимо діаграми.
5. **GitHub Action зелений** — у Actions tab дві workflow: «Lint frontmatter» і «Build & deploy GitHub Pages».

Якщо все ✅ — можна показувати Marko.
