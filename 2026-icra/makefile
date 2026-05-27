QMD_FILES := $(shell find . -name "*.qmd")
SITE_DIR := _site

.PHONY: all preview clean build

all: $(SITE_DIR)

$(SITE_DIR): $(QMD_FILES) ./_lib/Player/dist/player.js ./_lib/WMR2D/dist/wmr2d.js
	quarto render

build:
	quarto render

./_lib/Player/dist/player.js: ./_lib/Player/lib/main.ts
	cd _lib/Player && npm install && npm run build

./_lib/WMR2D/dist/wmr2d.js: ./_lib/WMR2D/lib/main.ts
	cd _lib/WMR2D && npm install && npm run build

preview:
	quarto preview

serve: $(SITE_DIR)
	python3 -m http.server --directory $(SITE_DIR) 8000

clean:
	rm -rf $(SITE_DIR)
