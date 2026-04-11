"""
맵 타일 & 배경 자동 생성 — v2.58
Pillow로 판타지 맵 타일 텍스처 생성
"""
from PIL import Image, ImageDraw, ImageFilter
import random, os, math

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'Assets', 'Resources', 'Sprites', 'Tiles')
os.makedirs(OUTPUT_DIR, exist_ok=True)

BG_DIR = os.path.join(os.path.dirname(__file__), 'Assets', 'Resources', 'Sprites')

SIZE = 256

def noise_fill(draw, w, h, base_color, variation=30):
    """노이즈 텍스처 채우기"""
    for x in range(w):
        for y in range(h):
            r = max(0, min(255, base_color[0] + random.randint(-variation, variation)))
            g = max(0, min(255, base_color[1] + random.randint(-variation, variation)))
            b = max(0, min(255, base_color[2] + random.randint(-variation, variation)))
            draw.point((x, y), fill=(r, g, b))

def draw_grass_details(draw, w, h):
    """풀잎 디테일"""
    for _ in range(60):
        x = random.randint(0, w-1)
        y = random.randint(0, h-1)
        length = random.randint(3, 8)
        color = (random.randint(40, 80), random.randint(100, 160), random.randint(20, 50))
        draw.line([(x, y), (x + random.randint(-2, 2), y - length)], fill=color, width=1)

def draw_stone_details(draw, w, h, color_base):
    """돌/바위 디테일"""
    for _ in range(15):
        cx, cy = random.randint(10, w-10), random.randint(10, h-10)
        rx, ry = random.randint(3, 12), random.randint(2, 8)
        c = tuple(max(0, min(255, c + random.randint(-20, 20))) for c in color_base)
        draw.ellipse([cx-rx, cy-ry, cx+rx, cy+ry], fill=c)

def generate_tile(name, base_color, detail_fn=None, variation=20):
    """타일 생성"""
    img = Image.new('RGB', (SIZE, SIZE))
    draw = ImageDraw.Draw(img)
    noise_fill(draw, SIZE, SIZE, base_color, variation)
    if detail_fn:
        detail_fn(draw, SIZE, SIZE)
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    path = os.path.join(OUTPUT_DIR, f'{name}.png')
    img.save(path)
    print(f'  ✅ {name}.png')
    return img

def generate_background(name, base_color, atmosphere='normal'):
    """큰 배경 이미지 생성"""
    w, h = 512, 512
    img = Image.new('RGB', (w, h))
    draw = ImageDraw.Draw(img)
    noise_fill(draw, w, h, base_color, 15)

    if atmosphere == 'forest':
        # 나무 그림자
        for _ in range(20):
            x, y = random.randint(0, w), random.randint(0, h)
            r = random.randint(15, 40)
            draw.ellipse([x-r, y-r, x+r, y+r], fill=(20+random.randint(0,20), 50+random.randint(0,30), 15+random.randint(0,15)))
        draw_grass_details(draw, w, h)
    elif atmosphere == 'dungeon':
        # 돌바닥 + 균열
        draw_stone_details(draw, w, h, base_color)
        for _ in range(8):
            pts = [(random.randint(0,w), random.randint(0,h)) for _ in range(4)]
            draw.line(pts, fill=(30, 25, 20), width=1)
    elif atmosphere == 'lava':
        # 용암 흐름
        for _ in range(10):
            pts = [(random.randint(0,w), random.randint(0,h)) for _ in range(5)]
            draw.line(pts, fill=(200+random.randint(0,55), random.randint(40,80), 0), width=random.randint(2,5))
    elif atmosphere == 'snow':
        # 눈 결정
        for _ in range(100):
            x, y = random.randint(0, w), random.randint(0, h)
            r = random.randint(1, 3)
            draw.ellipse([x-r, y-r, x+r, y+r], fill=(230+random.randint(0,25), 235+random.randint(0,20), 240+random.randint(0,15)))
    elif atmosphere == 'desert':
        # 모래 물결
        for y_off in range(0, h, 8):
            wave = [int(math.sin((x + y_off) * 0.05) * 3) + y_off for x in range(w)]
            for x in range(w-1):
                draw.line([(x, wave[x]), (x+1, wave[x+1])], fill=(180+random.randint(0,20), 155+random.randint(0,20), 100+random.randint(0,15)), width=1)
    elif atmosphere == 'dark':
        # 어두운 안개
        for _ in range(15):
            cx, cy = random.randint(0, w), random.randint(0, h)
            r = random.randint(30, 80)
            for dr in range(r, 0, -3):
                alpha = int(20 * (dr / r))
                draw.ellipse([cx-dr, cy-dr, cx+dr, cy+dr], fill=(20+alpha, 10+alpha, 30+alpha))

    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    path = os.path.join(BG_DIR, f'{name}.png')
    img.save(path)
    print(f'  ✅ {name}.png (배경)')

print('🎨 맵 타일 생성 시작...\n')

# 타일 생성
print('── 기본 타일 ──')
generate_tile('tile_grass', (60, 120, 40), draw_grass_details)
generate_tile('tile_dirt', (120, 90, 60), lambda d,w,h: draw_stone_details(d,w,h,(100,75,50)))
generate_tile('tile_stone', (100, 95, 90), lambda d,w,h: draw_stone_details(d,w,h,(80,75,70)))
generate_tile('tile_sand', (180, 160, 110), variation=15)
generate_tile('tile_snow', (220, 230, 240), variation=10)
generate_tile('tile_water', (40, 80, 140), variation=25)
generate_tile('tile_lava', (180, 50, 10), variation=30)
generate_tile('tile_darkstone', (50, 40, 55), lambda d,w,h: draw_stone_details(d,w,h,(40,35,45)))
generate_tile('tile_crystal', (100, 140, 180), variation=25)
generate_tile('tile_marble', (200, 195, 190), lambda d,w,h: draw_stone_details(d,w,h,(180,175,170)), 10)

# 배경 생성
print('\n── 존 배경 ──')
generate_background('bg_forest', (35, 65, 25), 'forest')
generate_background('bg_dungeon', (55, 45, 40), 'dungeon')
generate_background('bg_volcano', (80, 35, 15), 'lava')
generate_background('bg_snow', (200, 210, 225), 'snow')
generate_background('bg_desert', (170, 145, 95), 'desert')
generate_background('bg_dark', (25, 15, 35), 'dark')
generate_background('bg_village', (70, 100, 50), 'forest')
generate_background('bg_plains', (80, 120, 55), 'forest')

print(f'\n✅ 완료! 타일 {len(os.listdir(OUTPUT_DIR))}개, 배경 생성 완료')
