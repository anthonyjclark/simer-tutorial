# Notes

```bash
# Clone the repository
git clone ...

# Install dependencies
uv sync
source .venv/bin/activate.fish

# Build local dependencies
cd _lib/Player
npm install
npm run build

quarto render
```
