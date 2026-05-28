QMD_FILES := $(shell find . -name "*.qmd")
SITE_DIR := _site

.PHONY: all preview clean build

all: _site/index.html

_site/index.html: $(QMD_FILES) ./_lib/Player/dist/player.js ./_lib/WMR2D/dist/wmr2d.js _quarto.yml
	quarto render
	rsync -zarv --exclude="*/" fami:~/research/lwmr/tutorial/ _tutorial/notebooks/
	rm -rf _tutorial/notebooks/docs/
	make -C _tutorial html
	cp -r _tutorial/_build/html _site/tutorial
	mkdir -p _site/tutorial/_static/
	cp _tutorial/notebooks/docs/_static/*.viser _site/tutorial/_static/

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
