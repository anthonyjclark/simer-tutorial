QMD_FILES := $(shell find . -name "*.qmd")
SITE_DIR := _site
UV_RUN := uv run
LWMR_DIR ?= ../../lwmr
export NEWTON_SPHINX_BUILD := 1
# Silence tqdm's "IProgress not found" notice in notebook output (inherited by kernels)
export PYTHONWARNINGS := ignore:IProgress not found:Warning

.PHONY: all preview serve clean clean-quarto clean-uv clean-all build
.DELETE_ON_ERROR:

all: _site/index.html

_site/index.html: $(QMD_FILES) ./_lib/Player/dist/player.js ./_lib/WMR2D/dist/wmr2d.js _quarto.yml
# 	rsync -zarv --exclude="*/" fami:~/research/lwmr/tutorial/ tutorial/
	rsync -zarv --exclude="*/" $(LWMR_DIR)/tutorial/ tutorial/
	rm -rf tutorial/docs/
	$(UV_RUN) python scripts/clean_outputs.py tutorial/*.ipynb
	$(UV_RUN) quarto render --execute
	cp tutorial/docs/_static/*.viser tutorial/viser/
	cp -rf tutorial/viser _site/tutorial/viser
	find _site/tutorial/ -type f -name "*.html" -exec sed -i '' 's|src="\.\./_static/viser/index\.html?playbackPath=\.\./|src="viser/index.html?playbackPath=|g' {} +
	$(UV_RUN) python scripts/clean_outputs.py _site/tutorial/*.html
	find _site -type f \( -name "*.html" -o -name "*.json" \) -exec sed -i '' -E 's|/Users/[^/"\\ ]+/Documents/repos/gh/[^/]+/[^/]+/|<repo>/|g; s|/Users/[^/"\\ ]+|~|g' {} +

build: clean _site/index.html

./_lib/Player/dist/player.js: ./_lib/Player/lib/main.ts
	cd _lib/Player && npm install && npm run build

./_lib/WMR2D/dist/wmr2d.js: ./_lib/WMR2D/lib/main.ts
	cd _lib/WMR2D && npm install && npm run build

preview:
	$(UV_RUN) quarto preview

serve: _site/index.html
	$(UV_RUN) python -m http.server --directory $(SITE_DIR) 8000

clean:
	rm -rf $(SITE_DIR)
	$(UV_RUN) make -C _tutorial clean

# Quarto render output, freeze/cache state, and intermediate notebooks
clean-quarto:
	rm -rf $(SITE_DIR) .quarto
	find . -name "*.quarto_ipynb" -not -path "./node_modules/*" -not -path "./.venv/*" -delete
	find . -type d -name "*_files" -not -path "*/node_modules/*" -not -path "./.venv/*" -prune -exec rm -rf {} +

# Project virtual environment (uv.lock is kept; recreate with `uv sync`)
clean-uv:
	rm -rf .venv

clean-all: clean clean-quarto clean-uv
