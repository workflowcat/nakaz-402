source "https://rubygems.org"

# Для локальної перевірки сайту перед пушем:
#   bundle install
#   bundle exec jekyll serve

# Версія github-pages, що сумісна з тим, що GitHub білдить у продакшені.
# Точну версію див.: https://pages.github.com/versions/
gem "github-pages", group: :jekyll_plugins

# Тема — тягнеться через remote_theme в _config.yml, але інсталюємо
# її локально щоб серви працювало.
gem "just-the-docs"

group :jekyll_plugins do
  gem "jekyll-remote-theme"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-redirect-from"
end

# Windows / JRuby стаб
gem "tzinfo-data", platforms: [:mingw, :mswin, :x64_mingw, :jruby]
gem "wdm", "~> 0.1.1", platforms: [:mingw, :x64_mingw, :mswin]
gem "http_parser.rb", "~> 0.6.0", platforms: [:jruby]
