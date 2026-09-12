#!/usr/bin/env python3
"""Build the source tree into the single-file distributable game."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
TEMPLATE = SRC / "template.html"
STYLES = SRC / "styles.css"
JS_DIR = SRC / "js"
OUTPUT = DIST / "index.html"


def build():
    template = TEMPLATE.read_text(encoding="utf-8")
    styles = STYLES.read_text(encoding="utf-8").rstrip()
    scripts = []

    for path in sorted(JS_DIR.glob("*.js")):
        scripts.append(path.read_text(encoding="utf-8").rstrip())

    script = "\n\n".join(scripts)
    output = template.replace("<!-- BUILD:STYLES -->", styles)
    output = output.replace("<!-- BUILD:SCRIPT -->", script)

    if "BUILD:STYLES" in output or "BUILD:SCRIPT" in output:
        raise RuntimeError("Build placeholders were not fully replaced")

    DIST.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(output, encoding="utf-8")
    print(f"Built {OUTPUT} ({len(output.splitlines())} lines)")


if __name__ == "__main__":
    build()
