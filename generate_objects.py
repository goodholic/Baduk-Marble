# -*- coding: utf-8 -*-
"""
맵 오브젝트 스프라이트 생성 - v2.58
나무, 바위, 건물, 장식물 등
"""
from PIL import Image, ImageDraw, ImageFilter
import random, os, math

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'Assets', 'Resources', 'Sprites', 'Objects')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_transparent(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def draw_tree(size=64, tree_type='oak'):
    img = create_transparent(size, size)
    draw = ImageDraw.Draw(img)
    cx = size // 2

    if tree_type == 'oak':
        # 줄기
        tw = size // 8
        draw.rectangle([cx-tw, size*55//100, cx+tw, size-2], fill=(90, 60, 30))
        # 나뭇잎 (원형)
        for _ in range(5):
            rx = cx + random.randint(-size//5, size//5)
            ry = size*35//100 + random.randint(-size//8, size//8)
            r = size//5 + random.randint(-3, 5)
            g1 = random.randint(50, 80)
            g2 = random.randint(100, 150)
            draw.ellipse([rx-r, ry-r, rx+r, ry+r], fill=(g1, g2, random.randint(20, 40), 220))
    elif tree_type == 'pine':
        # 줄기
        tw = size // 10
        draw.rectangle([cx-tw, size*60//100, cx+tw, size-2], fill=(80, 50, 25))
        # 삼각형 잎 (3단)
        for i, (w_ratio, y_top) in enumerate([(0.45, 15), (0.35, 30), (0.25, 45)]):
            w = int(size * w_ratio)
            y = size * y_top // 100
            h = size * 25 // 100
            g = random.randint(30, 50)
            draw.polygon([(cx, y), (cx-w, y+h), (cx+w, y+h)], fill=(g, random.randint(80, 120), random.randint(15, 30), 230))
    elif tree_type == 'dead':
        # 고사목
        tw = size // 10
        draw.rectangle([cx-tw, size*30//100, cx+tw, size-2], fill=(70, 55, 40))
        # 가지
        for angle in [-40, -20, 15, 35]:
            bx = cx + int(math.cos(math.radians(angle)) * size * 0.25)
            by = size*40//100 + int(math.sin(math.radians(angle)) * size * 0.15)
            draw.line([(cx, size*40//100), (bx, by)], fill=(65, 50, 35), width=2)
    elif tree_type == 'cherry':
        # 벚꽃나무
        tw = size // 8
        draw.rectangle([cx-tw, size*55//100, cx+tw, size-2], fill=(100, 60, 40))
        for _ in range(6):
            rx = cx + random.randint(-size//4, size//4)
            ry = size*35//100 + random.randint(-size//6, size//6)
            r = size//6 + random.randint(-2, 4)
            draw.ellipse([rx-r, ry-r, rx+r, ry+r], fill=(220, random.randint(130, 180), random.randint(160, 200), 200))

    return img

def draw_rock(size=48, rock_type='normal'):
    img = create_transparent(size, size)
    draw = ImageDraw.Draw(img)
    cx, cy = size//2, size*60//100

    if rock_type == 'normal':
        pts = [(cx-size//3, cy+size//5), (cx-size//4, cy-size//4),
               (cx+size//5, cy-size//3), (cx+size//3, cy),
               (cx+size//4, cy+size//5)]
        draw.polygon(pts, fill=(120, 115, 110, 240))
        draw.polygon(pts, outline=(90, 85, 80, 200))
    elif rock_type == 'crystal':
        for i in range(3):
            x = cx + random.randint(-8, 8)
            w = random.randint(4, 8)
            h = random.randint(12, 22)
            color = (100+random.randint(0,60), 140+random.randint(0,60), 200+random.randint(0,55), 200)
            draw.polygon([(x, cy-h), (x-w, cy), (x+w, cy)], fill=color)
    elif rock_type == 'lava':
        pts = [(cx-12, cy+8), (cx-8, cy-12), (cx+10, cy-8), (cx+12, cy+8)]
        draw.polygon(pts, fill=(60, 30, 20, 240))
        # 용암 빛
        draw.ellipse([cx-4, cy-2, cx+4, cy+4], fill=(255, 100, 20, 150))

    return img

def draw_building(size=80, building_type='house'):
    img = create_transparent(size, size)
    draw = ImageDraw.Draw(img)
    cx = size // 2

    if building_type == 'house':
        # 벽
        draw.rectangle([cx-20, size*40//100, cx+20, size-4], fill=(160, 130, 90, 240))
        # 지붕
        draw.polygon([(cx-25, size*40//100), (cx, size*15//100), (cx+25, size*40//100)], fill=(140, 50, 30, 240))
        # 문
        draw.rectangle([cx-5, size*65//100, cx+5, size-4], fill=(80, 50, 30, 240))
        # 창문
        draw.rectangle([cx-16, size*50//100, cx-8, size*58//100], fill=(150, 200, 230, 200))
        draw.rectangle([cx+8, size*50//100, cx+16, size*58//100], fill=(150, 200, 230, 200))
    elif building_type == 'tower':
        # 탑
        draw.rectangle([cx-12, size*15//100, cx+12, size-4], fill=(140, 135, 130, 240))
        draw.polygon([(cx-15, size*15//100), (cx, 2), (cx+15, size*15//100)], fill=(100, 30, 30, 240))
        # 창문들
        for y_pct in [30, 50, 70]:
            draw.rectangle([cx-4, size*y_pct//100, cx+4, size*(y_pct+6)//100], fill=(200, 180, 80, 180))
    elif building_type == 'shrine':
        # 신전
        draw.rectangle([cx-22, size*35//100, cx+22, size-4], fill=(180, 175, 170, 240))
        # 기둥
        for x_off in [-18, -8, 8, 18]:
            draw.rectangle([cx+x_off-2, size*20//100, cx+x_off+2, size*35//100], fill=(170, 165, 160, 240))
        # 삼각형 지붕
        draw.polygon([(cx-25, size*20//100), (cx, size*5//100), (cx+25, size*20//100)], fill=(200, 190, 170, 240))
    elif building_type == 'well':
        # 우물
        draw.ellipse([cx-12, size*50//100, cx+12, size*70//100], fill=(100, 95, 90, 240))
        draw.ellipse([cx-8, size*53//100, cx+8, size*67//100], fill=(40, 60, 100, 200))
        # 지붕 기둥
        draw.line([(cx-10, size*40//100), (cx-10, size*50//100)], fill=(80, 50, 30), width=2)
        draw.line([(cx+10, size*40//100), (cx+10, size*50//100)], fill=(80, 50, 30), width=2)
        draw.rectangle([cx-12, size*38//100, cx+12, size*42//100], fill=(100, 60, 30, 240))

    return img

def draw_decoration(size=32, deco_type='flower'):
    img = create_transparent(size, size)
    draw = ImageDraw.Draw(img)
    cx, cy = size//2, size//2

    if deco_type == 'flower':
        colors = [(255, 100, 100), (255, 200, 50), (200, 100, 255), (255, 150, 200)]
        c = random.choice(colors)
        for angle in range(0, 360, 72):
            px = cx + int(math.cos(math.radians(angle)) * 5)
            py = cy + int(math.sin(math.radians(angle)) * 5)
            draw.ellipse([px-3, py-3, px+3, py+3], fill=(*c, 220))
        draw.ellipse([cx-2, cy-2, cx+2, cy+2], fill=(255, 220, 50, 240))
    elif deco_type == 'mushroom':
        draw.rectangle([cx-1, cy+2, cx+1, cy+8], fill=(200, 190, 170, 240))
        draw.ellipse([cx-6, cy-3, cx+6, cy+4], fill=(200, 50, 40, 230))
        draw.ellipse([cx-2, cy-1, cx, cy+1], fill=(255, 255, 255, 200))
    elif deco_type == 'campfire':
        # 돌 원
        for a in range(0, 360, 45):
            sx = cx + int(math.cos(math.radians(a)) * 6)
            sy = cy + int(math.sin(math.radians(a)) * 4) + 2
            draw.ellipse([sx-2, sy-2, sx+2, sy+2], fill=(100, 90, 85, 220))
        # 불꽃
        draw.polygon([(cx, cy-6), (cx-4, cy+2), (cx+4, cy+2)], fill=(255, 150, 30, 200))
        draw.polygon([(cx, cy-3), (cx-2, cy+1), (cx+2, cy+1)], fill=(255, 230, 80, 230))
    elif deco_type == 'chest':
        draw.rectangle([cx-6, cy-2, cx+6, cy+5], fill=(140, 90, 30, 240))
        draw.rectangle([cx-6, cy-2, cx+6, cy], fill=(160, 110, 40, 240))
        draw.ellipse([cx-1, cy, cx+1, cy+2], fill=(220, 180, 50, 240))
    elif deco_type == 'gravestone':
        draw.rectangle([cx-4, cy-6, cx+4, cy+4], fill=(120, 115, 110, 230))
        draw.arc([cx-4, cy-10, cx+4, cy-2], 0, 180, fill=(110, 105, 100, 220))

    return img

print('Generating map objects...')

# 나무 4종
for t in ['oak', 'pine', 'dead', 'cherry']:
    img = draw_tree(64, t)
    img.save(os.path.join(OUTPUT_DIR, f'tree_{t}.png'))
    print(f'  tree_{t}.png')

# 바위 3종
for t in ['normal', 'crystal', 'lava']:
    img = draw_rock(48, t)
    img.save(os.path.join(OUTPUT_DIR, f'rock_{t}.png'))
    print(f'  rock_{t}.png')

# 건물 4종
for t in ['house', 'tower', 'shrine', 'well']:
    img = draw_building(80, t)
    img.save(os.path.join(OUTPUT_DIR, f'building_{t}.png'))
    print(f'  building_{t}.png')

# 장식 5종
for t in ['flower', 'mushroom', 'campfire', 'chest', 'gravestone']:
    img = draw_decoration(32, t)
    img.save(os.path.join(OUTPUT_DIR, f'deco_{t}.png'))
    print(f'  deco_{t}.png')

total = len(os.listdir(OUTPUT_DIR))
print(f'\nDone! {total} objects generated')
