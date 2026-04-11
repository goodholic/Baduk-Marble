"""
rembg AI 기반 스프라이트 배경 제거
"""
from rembg import remove
from PIL import Image
import os, glob, io

SPRITE_DIR = r"C:\Users\super\My project\Baduk Marble\Assets\Sprites"

files = glob.glob(os.path.join(SPRITE_DIR, "**", "*.png"), recursive=True)
files = [f for f in files if "Backgrounds" not in f]

print(f"AI background removal: {len(files)} sprites")
for i, f in enumerate(files):
    try:
        with open(f, "rb") as inp:
            result = remove(inp.read())
        img = Image.open(io.BytesIO(result)).convert("RGBA")
        img.save(f)
        print(f"  [{i+1}/{len(files)}] OK: {os.path.basename(f)}")
    except Exception as e:
        print(f"  [{i+1}/{len(files)}] FAIL: {os.path.basename(f)} - {e}")

print("Done!")
