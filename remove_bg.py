"""
스프라이트 배경 제거 스크립트
회색/어두운 배경을 투명(alpha=0)으로 변환
"""
from PIL import Image
import os, glob

SPRITE_DIR = r"C:\Users\super\My project\Baduk Marble\Assets\Sprites"

def remove_bg(filepath, threshold=60):
    """
    이미지 가장자리 색상을 기준으로 배경 제거.
    - 4 모서리의 평균 색상을 배경색으로 판정
    - 배경색과 유사한 픽셀(threshold 이내)을 투명으로
    - 가장자리→안쪽으로 flood fill 방식
    """
    img = Image.open(filepath).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    # 4 모서리에서 배경색 추정
    corners = [pixels[0,0], pixels[w-1,0], pixels[0,h-1], pixels[w-1,h-1]]
    bg_r = sum(c[0] for c in corners) // 4
    bg_g = sum(c[1] for c in corners) // 4
    bg_b = sum(c[2] for c in corners) // 4

    def is_bg(r, g, b, a):
        if a < 10: return True
        return abs(r - bg_r) + abs(g - bg_g) + abs(b - bg_b) < threshold

    # Flood fill from edges
    visited = set()
    queue = []

    # 가장자리 픽셀들을 시작점으로
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h-1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w-1, y))

    while queue:
        x, y = queue.pop()
        if (x, y) in visited: continue
        if x < 0 or x >= w or y < 0 or y >= h: continue
        visited.add((x, y))

        r, g, b, a = pixels[x, y]
        if is_bg(r, g, b, a):
            pixels[x, y] = (0, 0, 0, 0)  # 투명
            # 인접 4방향
            for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                nx, ny = x+dx, y+dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    queue.append((nx, ny))

    # 반투명 가장자리 부드럽게 (안티앨리어싱)
    # 투명 픽셀 인접의 불투명 픽셀 알파를 약간 줄임
    result = img.copy()
    rpx = result.load()
    for x in range(w):
        for y in range(h):
            if rpx[x, y][3] > 0:  # 불투명 픽셀
                # 인접에 투명 픽셀이 있으면 알파 줄임
                neighbors_transparent = 0
                for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and rpx[nx, ny][3] == 0:
                        neighbors_transparent += 1
                if neighbors_transparent >= 2:
                    r, g, b, a = rpx[x, y]
                    rpx[x, y] = (r, g, b, max(0, a - 80))

    result.save(filepath)
    return True

# 모든 스프라이트 처리
files = glob.glob(os.path.join(SPRITE_DIR, "**", "*.png"), recursive=True)
# 배경 타일은 제외
files = [f for f in files if "Backgrounds" not in f]

print(f"Processing {len(files)} sprites...")
for i, f in enumerate(files):
    name = os.path.basename(f)
    try:
        remove_bg(f)
        print(f"  [{i+1}/{len(files)}] OK: {name}")
    except Exception as e:
        print(f"  [{i+1}/{len(files)}] FAIL: {name} - {e}")

print("Done!")
