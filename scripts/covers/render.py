#!/usr/bin/env python3
"""Render the profile README covers into ../../assets/<name>.jpg.

    python3 scripts/covers/render.py              # all covers
    python3 scripts/covers/render.py geo-judge    # just one (or several)

Needs Playwright with Chromium (pip3 install playwright && python3 -m playwright install chromium),
macOS `sips` for the JPEG step, and 思源黑体 (SourceHanSansCN-Regular/Bold/Heavy.otf) in ~/Library/Fonts.
"""
import asyncio
import pathlib
import subprocess
import sys

from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
ASSETS = HERE.parent.parent / "assets"
OUT = HERE / "out"            # full-size PNGs, git-ignored
FONT_DIR = pathlib.Path.home() / "Library" / "Fonts"


def link_fonts():
    (HERE / "fonts").mkdir(exist_ok=True)
    for weight in ("Regular", "Bold", "Heavy"):
        src = FONT_DIR / f"SourceHanSansCN-{weight}.otf"
        if not src.exists():
            sys.exit(f"missing {src}; install 思源黑体 (Source Han Sans CN) first")
        dst = HERE / "fonts" / f"SourceHanSans-{weight}.otf"
        if not dst.exists():
            dst.symlink_to(src)


async def render(names):
    OUT.mkdir(exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1800, "height": 600}, device_scale_factor=4 / 3)
        errors = []
        # widgets.js starts the video renderer on load and stops at the missing TOTAL; covers don't use it
        page.on("pageerror", lambda e: "TOTAL is not defined" not in str(e) and errors.append(str(e)))
        await page.goto((HERE / "index.html").as_uri())
        await page.evaluate("Promise.all(['40px VideoSans', '700 40px VideoSans', '40px VideoSansHeavy']"
                            ".map(f => document.fonts.load(f, '字'))).then(() => document.fonts.ready)")
        loaded = await page.evaluate("[...document.fonts].filter(f => f.status === 'loaded').length")
        if loaded < 3:
            sys.exit("fonts did not load; check scripts/covers/fonts/")
        all_names = await page.evaluate("window.coverNames")
        unknown = [n for n in names if n not in all_names]
        if unknown:
            sys.exit(f"unknown cover(s): {unknown}; defined: {all_names}")
        for name in names or all_names:
            await page.evaluate(f"renderCover({name!r})")
            await page.wait_for_timeout(150)
            await page.screenshot(path=str(OUT / f"{name}.png"))
        await browser.close()
        if errors:
            sys.exit(f"page errors: {errors}")
        return names or all_names


def to_jpeg(names):
    # the paper grain makes PNGs ~1.8 MB; 1800px JPEG at q80 is ~260 KB and still sharp on retina
    for name in names:
        subprocess.run(["sips", "-Z", "1800", "-s", "format", "jpeg", "-s", "formatOptions", "80",
                        str(OUT / f"{name}.png"), "--out", str(ASSETS / f"{name}.jpg")],
                       check=True, stdout=subprocess.DEVNULL)
        print(f"assets/{name}.jpg  {(ASSETS / f'{name}.jpg').stat().st_size // 1024} KB")


if __name__ == "__main__":
    link_fonts()
    to_jpeg(asyncio.run(render(sys.argv[1:])))
