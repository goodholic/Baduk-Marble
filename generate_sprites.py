"""
AutoBattle.io 스프라이트 생성 스크립트 v2
SD WebUI API - 512x512 고품질, 임진록/거상 다크 판타지 스타일
"""
import requests, base64, os

SD_URL = "http://127.0.0.1:7860"
OUT_DIR = r"C:\Users\super\My project\Baduk Marble\Assets\Sprites"

NEGATIVE = "cute, chibi, cartoon, childish, multiple people, grid, spritesheet, 3D render, photograph, blurry, watermark, text, anime eyes, deformed, cropped, partial body, scenery, landscape, bright cheerful"

BASE = "masterpiece, best quality, game character sprite, single character, isometric top-down 3/4 perspective, dark fantasy RPG style, clean sharp edges, full body head to toe, plain solid black background, centered, game asset"

def gen(prompt, filename, w=512, h=512, steps=30, seed=-1):
    payload = {
        "prompt": prompt,
        "negative_prompt": NEGATIVE,
        "width": w, "height": h, "steps": steps, "seed": seed,
        "sampler_name": "Euler a", "cfg_scale": 7,
    }
    try:
        r = requests.post(f"{SD_URL}/sdapi/v1/txt2img", json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        if data.get("images"):
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            with open(filename, "wb") as f:
                f.write(base64.b64decode(data["images"][0]))
            print(f"  OK: {filename.split('Sprites')[-1]}")
            return True
    except Exception as e:
        print(f"  FAIL: {e}")
    return False

# ============================================================
# 1. 캐릭터: 5 클래스 × 4 방향 (idle만 — walk은 idle 변형으로 Unity에서 처리)
# ============================================================
CLASSES = {
    "warrior": ("Korean medieval warrior, heavy iron plate armor with red accent, holding long sword, muscular imposing build, battle hardened veteran", 777),
    "assassin": ("dark hooded assassin, black leather armor with purple trim, dual wielding daggers, slim agile build, shadow ninja", 888),
    "knight": ("massive armored knight, full steel plate armor with gold trim and royal crest, huge tower shield and lance, bulky tank build", 555),
    "mage": ("dark sorcerer in flowing black robes with arcane blue runes, holding ornate magical staff with glowing crystal orb, wise aged figure", 333),
    "cleric": ("holy priest in white and gold ceremonial vestments, sacred healing staff with divine golden glow, serene noble figure", 444),
}

DIRS = {
    "front": "front view facing camera, standing idle",
    "back":  "rear back view facing away, showing back of armor and cape",
    "right": "right side profile view, facing right",
    "left":  "left side profile view, facing left",
}

print("=" * 50)
print("[1/3] Characters (5 classes x 4 dirs = 20)")
print("=" * 50)
count = 0
for cls_id, (cls_desc, base_seed) in CLASSES.items():
    for di, (dir_id, dir_desc) in enumerate(DIRS.items()):
        prompt = f"{BASE}, {cls_desc}, {dir_desc}"
        fname = os.path.join(OUT_DIR, "Characters", f"{cls_id}_{dir_id}.png")
        gen(prompt, fname, seed=base_seed + di)
        count += 1
        print(f"    [{count}/20]")

# ============================================================
# 2. 몬스터: 10종 (정면)
# ============================================================
MONSTERS = {
    "slime":      ("dark toxic slime monster, oozing green acid, menacing glowing eyes, gelatinous body", 101),
    "wolf":       ("dire wolf, jet black fur, glowing red eyes, snarling fangs, muscular predator", 102),
    "skeleton":   ("undead skeleton warrior, rusted ancient armor, glowing blue eye sockets, wielding broken sword", 103),
    "orc":        ("armored orc berserker, dark green skin, large tusks, massive war axe, tribal war paint", 104),
    "spider":     ("giant cave spider, dark chitinous armor, eight red eyes, dripping venom, web tendrils", 105),
    "dragon":     ("young fire dragon, dark crimson scales, small leathery wings spread, breathing embers", 106),
    "golem":      ("ancient stone golem, carved glowing runes, moss and cracks, massive rock fists", 107),
    "vampire":    ("vampire lord, pale skin, dark Victorian noble coat, crimson eyes, gothic bat cape", 108),
    "demon":      ("lesser demon, dark red skin, curved horns, sharp claws, hellfire aura around body", 109),
    "ghost":      ("spectral ghost warrior, translucent blue glow, ancient Korean armor visible through form", 110),
}

print("\n" + "=" * 50)
print("[2/3] Monsters (10)")
print("=" * 50)
for mi, (mon_id, (mon_desc, seed)) in enumerate(MONSTERS.items()):
    prompt = f"masterpiece, best quality, game monster sprite, single monster, {mon_desc}, dark fantasy RPG, full body, solid black background, centered, game asset"
    fname = os.path.join(OUT_DIR, "Monsters", f"{mon_id}.png")
    gen(prompt, fname, seed=seed)
    print(f"    [{mi+1}/10]")

# ============================================================
# 3. 배경: 6종 (타일)
# ============================================================
BGS = {
    "grass":   "dark fantasy grassland, muted olive green, dead brown leaves, gloomy fog",
    "forest":  "dark enchanted forest floor, twisted black roots, glowing mushrooms, thick fog",
    "desert":  "arid dark desert, cracked dry earth, scattered bones, harsh dusty atmosphere",
    "snow":    "frozen desolate tundra, dark ice, grey snow drifts, blizzard wind marks",
    "dungeon": "stone dungeon floor, cracked mossy tiles, dried blood stains, dim torchlight glow",
    "lava":    "volcanic hellscape ground, cooled black lava rock, glowing magma cracks, ash particles",
}

print("\n" + "=" * 50)
print("[3/3] Backgrounds (6)")
print("=" * 50)
for bi, (bg_id, bg_desc) in enumerate(BGS.items()):
    prompt = f"seamless tileable texture, top-down view, {bg_desc}, dark mature color palette, game background tile, no characters no objects"
    fname = os.path.join(OUT_DIR, "Backgrounds", f"{bg_id}.png")
    gen(prompt, fname, w=512, h=512, seed=200+bi)
    print(f"    [{bi+1}/6]")

print("\n" + "=" * 50)
total = sum(1 for r, d, f in os.walk(OUT_DIR) for _ in f if _.endswith('.png'))
print(f"Total generated: {total}/36")
print("Done!")
