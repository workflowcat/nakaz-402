.PHONY: help lint changelog check serve install clean

help:  ## Показати цю довідку
	@awk 'BEGIN{FS=":.*##"} /^[a-zA-Z_-]+:.*##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

lint:  ## Прогнати лінтер frontmatter
	@python3 scripts/lint_frontmatter.py

changelog:  ## Перегенерувати CHANGELOG.md з meta/amendments.yaml
	@python3 scripts/changelog_from_amendments.py --write

check:  ## Перевірити, що CHANGELOG синхронізовано з amendments.yaml (для CI)
	@python3 scripts/changelog_from_amendments.py --check

install:  ## Поставити залежності (pip + bundle)
	@pip install --user pyyaml
	@bundle install || echo "Skipping bundle install (no Ruby/bundler). Сайт можна не серверити локально."

serve:  ## Локально посерверити сайт (потрібен bundle install)
	@bundle exec jekyll serve --livereload --port 4002

clean:  ## Прибрати кеш Jekyll
	@rm -rf _site .jekyll-cache
