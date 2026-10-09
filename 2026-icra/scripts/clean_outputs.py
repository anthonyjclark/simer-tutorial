"""Tidy notebook outputs (in place) so they render nicely.

- .ipynb: remove known-noisy warning text from saved stderr outputs.
- .html:  collapse each progress bar (tqdm or rich) to its first and last update, and
          collapse runs of identical timestamped log messages to the first one.
"""

import json
import re
import sys
from pathlib import Path

NOISE = ("IProgress not found",)

# Opening tags that can precede the first line of an output block
OPEN_TAGS = r"(?:<pre[^>]*>(?:<code[^>]*>)?)?"
# A progress-bar update line inside rendered HTML: tqdm ("  6%|") or
# rich ('<span class="ansi-magenta-fg">  6%</span>')
BAR_LINE = re.compile(
    rf"^{OPEN_TAGS}"
    r'(?:\s*(\d+)%\||<span class="ansi-magenta-fg">\s*(\d+)%</span>)'
)
# A loguru line: timestamp (own span), then the level/location/message
LOG_LINE = re.compile(
    rf'^{OPEN_TAGS}<span class="ansi-green-fg">\d{{4}}-\d\d-\d\d \d\d:\d\d:\d\d\.\d+</span>(.*)$'
)
OPEN_RE = re.compile(f"^{OPEN_TAGS}")
CLOSE_RE = re.compile(r"</code>|</pre>")
# A cell container (not its "cell-output" children)
CELL_START = re.compile(r'<div class="cell[" ]')


def clean_notebook(path: Path) -> bool:
    raw = path.read_text()
    nb = json.loads(raw)
    changed = False
    for cell in nb.get("cells", []):
        outputs = cell.get("outputs")
        if not outputs:
            continue
        kept = [
            o
            for o in outputs
            if not (
                o.get("output_type") == "stream"
                and o.get("name") == "stderr"
                and any(s in "".join(o.get("text", [])) for s in NOISE)
            )
        ]
        if len(kept) != len(outputs):
            cell["outputs"] = kept
            changed = True
    if changed:
        indent = 1 if raw.startswith('{\n "') else 2
        path.write_text(json.dumps(nb, indent=indent, ensure_ascii=False) + "\n")
    return changed


def clean_html(path: Path) -> bool:
    lines = path.read_text().split("\n")

    # Each group is (lines to omit, note replacing the first omitted line)
    groups: list[tuple[list[int], str]] = []

    # Progress bars: group updates within each cell; a drop in percent starts a new bar
    bars: list[list[int]] = []
    prev = None
    for i, line in enumerate(lines):
        if CELL_START.match(line):
            prev = None
        match = BAR_LINE.match(line)
        if not match:
            continue
        pct = int(match.group(1) or match.group(2))
        if prev is None or pct < prev:
            bars.append([])
        bars[-1].append(i)
        prev = pct
    for bar in bars:
        if len(bar) > 2:
            groups.append((bar[1:-1], f"{len(bar) - 2} progress updates omitted"))

    # Log messages: runs of consecutive lines identical apart from the timestamp
    runs: list[list[int]] = []
    key = None
    for i, line in enumerate(lines):
        if CELL_START.match(line):
            key = None
        log = LOG_LINE.match(line)
        if log:
            message = CLOSE_RE.split(log.group(1))[0]
            if message == key:
                runs[-1].append(i)
            else:
                runs.append([i])
                key = message
        elif line.strip():
            key = None  # blank lines between messages don't break a run
    for run in runs:
        if len(run) > 1:
            groups.append((run[1:], f"{len(run) - 1} identical messages omitted"))

    replace: dict[int, str | None] = {}
    for omitted, note in groups:
        for i in omitted:
            replace[i] = None
        # rich/loguru separate entries with blank lines; keep only the one after the last omitted
        for i, nxt in zip(omitted, omitted[1:]):
            replace.update({j: None for j in range(i + 1, nxt) if not lines[j].strip()})
        replace[omitted[0]] = f"   ⋮ ({note})"

    if not replace:
        return False

    result = []
    for i, line in enumerate(lines):
        if i not in replace:
            result.append(line)
            continue
        prefix = OPEN_RE.match(line).group(0)  # type: ignore[union-attr]
        close = CLOSE_RE.search(line)
        suffix = line[close.start() :] if close else ""
        text = replace[i]
        if text is not None:
            result.append(prefix + text + suffix)
        elif prefix or suffix:
            result.append(prefix + suffix)  # keep the surrounding tags balanced
    path.write_text("\n".join(result))
    return True


for path in map(Path, sys.argv[1:]):
    if path.suffix == ".ipynb":
        changed = clean_notebook(path)
    elif path.suffix == ".html":
        changed = clean_html(path)
    else:
        continue
    if changed:
        print(f"cleaned outputs: {path}")
