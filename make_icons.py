"""Draws the app icon into the Android project's mipmap folders. Usage: python3 make_icons.py <res dir>"""
import sys, os
from PIL import Image, ImageDraw

res = sys.argv[1]
INDIGO = (51, 71, 194, 255)
WHITE = (255, 255, 255, 255)
SS = 4


def check(d, size, pts, width):
    p = [(x * size, y * size) for x, y in pts]
    w = width * size
    d.line(p, fill=WHITE, width=int(w), joint="curve")
    for x, y in (p[0], p[-1]):
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=WHITE)


def make(size, kind):
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if kind == "foreground":
        check(d, big, [(0.33, 0.52), (0.45, 0.64), (0.68, 0.37)], 0.075)
    else:
        if kind == "round":
            d.ellipse([0, 0, big - 1, big - 1], fill=INDIGO)
        else:
            d.rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * 0.22), fill=INDIGO)
        check(d, big, [(0.27, 0.52), (0.42, 0.67), (0.72, 0.33)], 0.09)
    return img.resize((size, size), Image.LANCZOS)


legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fore = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for dens in legacy:
    folder = os.path.join(res, "mipmap-" + dens)
    os.makedirs(folder, exist_ok=True)
    make(legacy[dens], "square").save(os.path.join(folder, "ic_launcher.png"))
    make(legacy[dens], "round").save(os.path.join(folder, "ic_launcher_round.png"))
    make(fore[dens], "foreground").save(os.path.join(folder, "ic_launcher_foreground.png"))

bg = os.path.join(res, "values", "ic_launcher_background.xml")
with open(bg, "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#3347C2</color>\n</resources>\n')
print("icons done")
