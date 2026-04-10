using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// 런타임 스프라이트 로더
/// Resources/Sprites/ 에서 클래스별/몬스터별 스프라이트를 로드하여 SpriteAnimator에 할당
/// </summary>
public static class SpriteLoader
{
    // 캐시 (같은 스프라이트 중복 로드 방지)
    private static Dictionary<string, Sprite> spriteCache = new Dictionary<string, Sprite>();

    // 클래스명 → 스프라이트 폴더명 매핑
    private static Dictionary<string, string> classMap = new Dictionary<string, string>
    {
        { "Warrior", "warrior" },
        { "Assassin", "assassin" },
        { "Knight", "knight" },
        { "Mage", "mage" },
        { "Cleric", "cleric" },
    };

    // 몬스터 티어 → 스프라이트 매핑
    private static Dictionary<string, string> monsterMap = new Dictionary<string, string>
    {
        { "normal", "slime" },
        { "elite", "wolf" },
        { "rare", "orc" },
        { "boss", "dragon" },
        { "legendary", "demon" },
        { "mythic", "vampire" },
        { "worldboss", "dragon" },
    };

    // 몬스터 이름 키워드 → 스프라이트 매핑
    private static Dictionary<string, string> monsterNameMap = new Dictionary<string, string>
    {
        { "슬라임", "slime" }, { "slime", "slime" },
        { "늑대", "wolf" }, { "wolf", "wolf" },
        { "스켈레톤", "skeleton" }, { "skeleton", "skeleton" }, { "해골", "skeleton" },
        { "오크", "orc" }, { "orc", "orc" },
        { "거미", "spider" }, { "spider", "spider" },
        { "드래곤", "dragon" }, { "dragon", "dragon" }, { "용", "dragon" },
        { "골렘", "golem" }, { "golem", "golem" },
        { "뱀파이어", "vampire" }, { "vampire", "vampire" }, { "흡혈", "vampire" },
        { "악마", "demon" }, { "demon", "demon" }, { "데몬", "demon" },
        { "유령", "ghost" }, { "ghost", "ghost" }, { "영혼", "ghost" },
    };

    /// <summary>
    /// 플레이어 GameObject에 클래스별 4방향 스프라이트 적용
    /// </summary>
    public static void ApplyClassSprites(GameObject playerGo, string className)
    {
        if (playerGo == null || string.IsNullOrEmpty(className)) return;

        string folder = "warrior"; // default
        if (classMap.ContainsKey(className)) folder = classMap[className];

        SpriteAnimator anim = playerGo.GetComponent<SpriteAnimator>();
        if (anim == null) anim = playerGo.AddComponent<SpriteAnimator>();

        anim.use4Direction = true;
        anim.walkFps = 6f;

        // 4방향 스프라이트 로드
        Sprite front = LoadCached($"Sprites/Characters/{folder}_front");
        Sprite back  = LoadCached($"Sprites/Characters/{folder}_back");
        Sprite left  = LoadCached($"Sprites/Characters/{folder}_left");
        Sprite right = LoadCached($"Sprites/Characters/{folder}_right");

        // 각 방향에 1장씩 (idle) — 걷기 프레임이 있으면 배열로 확장 가능
        if (front != null) anim.downSprites  = new Sprite[] { front };
        if (back != null)  anim.upSprites    = new Sprite[] { back };
        if (left != null)  anim.leftSprites  = new Sprite[] { left };
        if (right != null) anim.rightSprites = new Sprite[] { right };

        // 기본 스프라이트 (정면)
        SpriteRenderer sr = playerGo.GetComponentInChildren<SpriteRenderer>();
        if (sr != null && front != null) sr.sprite = front;
    }

    /// <summary>
    /// 몬스터 GameObject에 티어/이름 기반 스프라이트 적용
    /// </summary>
    public static void ApplyMonsterSprite(GameObject monsterGo, string tier, string monsterName)
    {
        if (monsterGo == null) return;

        string spriteId = "slime"; // default

        // 이름으로 먼저 매칭
        if (!string.IsNullOrEmpty(monsterName))
        {
            string nameLower = monsterName.ToLower();
            foreach (var kv in monsterNameMap)
            {
                if (nameLower.Contains(kv.Key.ToLower()))
                {
                    spriteId = kv.Value;
                    break;
                }
            }
        }
        // 이름 매칭 실패 시 티어로
        else if (!string.IsNullOrEmpty(tier) && monsterMap.ContainsKey(tier))
        {
            spriteId = monsterMap[tier];
        }

        Sprite sprite = LoadCached($"Sprites/Monsters/{spriteId}");
        if (sprite == null) return;

        SpriteRenderer sr = monsterGo.GetComponentInChildren<SpriteRenderer>();
        if (sr != null) sr.sprite = sprite;

        // SpriteAnimator 프레임도 업데이트
        SpriteAnimator anim = monsterGo.GetComponent<SpriteAnimator>();
        if (anim != null)
        {
            anim.frames = new Sprite[] { sprite };
        }
    }

    private static Sprite LoadCached(string path)
    {
        if (spriteCache.ContainsKey(path)) return spriteCache[path];
        Sprite s = Resources.Load<Sprite>(path);
        if (s != null) spriteCache[path] = s;
        return s;
    }
}
