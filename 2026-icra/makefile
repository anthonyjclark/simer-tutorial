QMD_FILES := $(shell find . -name "*.qmd")
SITE_DIR := _site

.PHONY: all preview clean build

all: _site/index.html

_site/index.html: $(QMD_FILES) ./_lib/Player/dist/player.js ./_lib/WMR2D/dist/wmr2d.js _quarto.yml
	rsync -zarv --exclude="*/" fami:~/research/lwmr/tutorial/ tutorial/
	rm -rf tutorial/docs/
	quarto render --execute
	cp tutorial/docs/_static/*.viser tutorial/viser/
	cp -rf tutorial/viser _site/tutorial/viser
	find _site/tutorial/ -type f -name "*.html" -exec sed -i '' 's|src="\.\./_static/viser/index\.html?playbackPath=\.\./|src="viser/index.html?playbackPath=|g' {} +
# 	find _site/tutorial/ -type f -name "*.html" -exec sed -i '' 's|playbackPath=\.\./|playbackPath=../../docs/_static/|g' {} +
# 	's|playbackPath=\.\./|playbackPath=../../docs/_static/|g' {} +




# 	rsync -zarv --exclude="*/" fami:~/research/lwmr/tutorial/ _tutorial/notebooks/
# 	rm -rf _tutorial/notebooks/docs/
# 	make -C _tutorial html
# 	cp -r _tutorial/_build/html _site/tutorial
# 	mkdir -p _site/tutorial/_static/
# 	cp _tutorial/notebooks/docs/_static/*.viser _site/tutorial/_static/

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
