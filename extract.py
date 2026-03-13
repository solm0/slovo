from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import json, os

FONT_PATH = "slovo-vf.ttf"
OUT_PATH  = "public/glyphs.json"

font = TTFont(FONT_PATH)

f0 = instantiateVariableFont(font, {"ROMN": 0})
f1 = instantiateVariableFont(font, {"ROMN": 100})

def get_points(f, glyph_name):
    glyf = f["glyf"][glyph_name]
    if glyf.isComposite():
        return []
    coords, _, _ = glyf.getCoordinates(f["glyf"])
    return [[float(x), float(y)] for x, y in coords]

cmap  = font.getBestCmap()
data  = {}

for code, name in cmap.items():
    char = chr(code)
    data[char] = {
        "a": get_points(f0, name),
        "b": get_points(f1, name),
        "w": font["hmtx"][name][0],
    }

os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

print(f"Done — {len(data)} glyphs → {OUT_PATH}")