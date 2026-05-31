QMD_FILES := $(shell find . -name "*.qmd")
SITE_DIR := _site
export NEWTON_SPHINX_BUILD := 1

.PHONY: all preview clean build

all: _site/index.html

_site/index.html: $(QMD_FILES) ./_lib/Player/dist/player.js ./_lib/WMR2D/dist/wmr2d.js _quarto.yml
# 	rsync -zarv --exclude="*/" fami:~/research/lwmr/tutorial/ tutorial/
	rsync -zarv --exclude="*/" ../lwmr/tutorial/ tutorial/
	rm -rf tutorial/docs/
	quarto render --execute
	cp tutorial/docs/_static/*.viser tutorial/viser/
	cp -rf tutorial/viser _site/tutorial/viser
	find _site/tutorial/ -type f -name "*.html" -exec sed -i '' 's|src="\.\./_static/viser/index\.html?playbackPath=\.\./|src="viser/index.html?playbackPath=|g' {} +

build: clean _site/index.html

./_lib/Player/dist/player.js: ./_lib/Player/lib/main.ts
	cd _lib/Player && npm install && npm run build

./_lib/WMR2D/dist/wmr2d.js: ./_lib/WMR2D/lib/main.ts
	cd _lib/WMR2D && npm install && npm run build

preview:
	quarto preview

serve: _site/index.html
	python3 -m http.server --directory $(SITE_DIR) 8000

clean:
	rm -rf $(SITE_DIR)
	make -C _tutorial clean
