"""
Vendor the demo catalogue's photography into the repo.

The bundled demo listings, categories and blog posts referenced images.pexels.com
directly. That made every card in the storefront depend on a third party being
up, being fast, and not changing its URLs — and it put the images outside our
control for caching, sizing and format.

This downloads each referenced photo once, resizes it to the width it is
actually displayed at, converts it to WebP, writes it to public/images/catalog/,
and rewrites the data files to point at the local copy.

Run:  python scripts/fetch-catalog-images.py
Needs: Python 3 + Pillow. Development-time only — the build does not run this.
Idempotent: an image already on disk is not re-downloaded, and URLs already
rewritten are left alone.
"""

import io
import os
import re
import sys
import glob
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "public", "images", "catalog")
PUBLIC_PREFIX = "/images/catalog"
QUALITY = 82

# Pexels URLs carry their display width in the query string; keep that width so
# the local copy matches what the layout actually renders.
# Pexels serves two URL shapes: /photos/<id>/<slug>.jpeg and, for some photos,
# a nested /photos/<id>/<slug>/<descriptive-slug>.jpeg. Match both, and allow
# percent-escapes since some descriptive slugs are non-ASCII.
PEXELS = re.compile(
    r"https://images\.pexels\.com/photos/(\d+)/(?:[a-z0-9._%-]+/)*[a-z0-9._%-]+\.(?:jpeg|jpg|png)(\?[^\"']*)?"
)
WIDTH = re.compile(r"[?&]w=(\d+)")

# A URL with no ?w= is a full-resolution original (several are 3-5 MB). These
# turn up in hero and feature sections that render wide, so they get a larger
# cap than a card would.
DEFAULT_WIDTH = 1200


def target_width(query: str) -> int:
    m = WIDTH.search(query or "")
    return int(m.group(1)) if m else DEFAULT_WIDTH


def local_name(photo_id: str, width: int) -> str:
    """Stable, collision-free: the same photo at two widths gets two files."""
    return f"{photo_id}-{width}.webp"


def fetch(url: str) -> bytes:
    """
    Download via curl rather than urllib: this machine's Python CA bundle is
    expired, so urllib rejects images.pexels.com while curl (using the system
    trust store) succeeds.
    """
    proc = subprocess.run(
        ["curl", "-sSL", "--fail", "--max-time", "60", "-A", "wamwam-asset-pipeline", url],
        capture_output=True,
    )
    if proc.returncode != 0 or not proc.stdout:
        raise RuntimeError(proc.stderr.decode(errors="replace").strip() or f"curl exit {proc.returncode}")
    return proc.stdout


def main() -> int:
    try:
        from PIL import Image
    except ImportError:
        print("Pillow is required:  pip install Pillow", file=sys.stderr)
        return 1

    os.makedirs(OUT_DIR, exist_ok=True)
    # Photography is referenced from the data files AND hard-coded inside a
    # number of section and card components, so scan the whole source tree.
    files = sorted(
        p
        for pattern in ("src/**/*.ts", "src/**/*.tsx")
        for p in glob.glob(os.path.join(ROOT, pattern), recursive=True)
    )

    # Pass 1: collect every distinct (photo, width) pair.
    wanted = {}
    for path in files:
        for m in PEXELS.finditer(io.open(path, encoding="utf-8").read()):
            photo_id, query = m.group(1), m.group(2) or ""
            w = target_width(query)
            wanted[(photo_id, w)] = m.group(0)

    print(f"{len(wanted)} distinct images referenced by {len(files)} data files")

    # Pass 2: download, resize, convert. Skip what is already on disk.
    saved_bytes = 0
    source_bytes = 0
    failures = []
    for i, ((photo_id, w), url) in enumerate(sorted(wanted.items()), 1):
        name = local_name(photo_id, w)
        dest = os.path.join(OUT_DIR, name)
        if os.path.exists(dest):
            continue
        try:
            raw = fetch(url)
        except Exception as exc:  # noqa: BLE001 - report and continue
            failures.append((url, str(exc)))
            print(f"  [{i}/{len(wanted)}] FAILED {name}: {exc}")
            continue
        source_bytes += len(raw)
        img = Image.open(io.BytesIO(raw))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        if img.width > w:
            img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
        img.save(dest, "WEBP", quality=QUALITY, method=6)
        out = os.path.getsize(dest)
        saved_bytes += out
        print(f"  [{i}/{len(wanted)}] {name}  {len(raw):>9,} -> {out:>8,} bytes")

    # Pass 3: rewrite the data files to the local copies.
    rewritten = 0
    for path in files:
        text = io.open(path, encoding="utf-8").read()

        def replace(m):
            nonlocal rewritten
            photo_id, query = m.group(1), m.group(2) or ""
            name = local_name(photo_id, target_width(query))
            if not os.path.exists(os.path.join(OUT_DIR, name)):
                return m.group(0)  # download failed; leave the remote URL
            rewritten += 1
            return f"{PUBLIC_PREFIX}/{name}"

        new = PEXELS.sub(replace, text)
        if new != text:
            io.open(path, "w", encoding="utf-8", newline="\n").write(new)

    print(f"\nrewrote {rewritten} URLs across the data files")
    if source_bytes:
        print(f"downloaded {source_bytes / 1048576:.1f} MB -> stored {saved_bytes / 1048576:.1f} MB as WebP "
              f"({source_bytes / max(saved_bytes, 1):.1f}x smaller)")
    if failures:
        print(f"\n{len(failures)} downloads failed; their URLs were left pointing at Pexels:")
        for url, err in failures[:10]:
            print(f"  {err}  {url}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
