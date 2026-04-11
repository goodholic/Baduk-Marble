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

    // 몬스터 이름 키워드 → 스프라이트 매핑 (v2.58: SD 스프라이트 우선)
    private static Dictionary<string, string> monsterNameMap = new Dictionary<string, string>
    {
        { "슬라임", "slime_sd" }, { "slime", "slime_sd" },
        { "늑대", "wolf_sd" }, { "wolf", "wolf_sd" },
        { "스켈레톤", "skeleton_sd" }, { "skeleton", "skeleton_sd" }, { "해골", "skeleton_sd" },
        { "오크", "orc_sd" }, { "orc", "orc_sd" },
        { "거미", "spider_sd" }, { "spider", "spider_sd" },
        { "드래곤", "dragon_sd" }, { "dragon", "dragon_sd" }, { "용", "dragon_sd" },
        { "골렘", "ice_golem_sd" }, { "golem", "ice_golem_sd" },
        { "뱀파이어", "vampire_sd" }, { "vampire", "vampire_sd" }, { "흡혈", "vampire_sd" },
        { "악마", "demon_lord_sd" }, { "demon", "demon_lord_sd" }, { "데몬", "demon_lord_sd" },
        { "유령", "ghost" }, { "ghost", "ghost" }, { "영혼", "ghost" },
        { "고블린", "goblin_sd" }, { "goblin", "goblin_sd" },
        { "리치", "lich_sd" }, { "lich", "lich_sd" },
        { "미노타우르스", "minotaur_sd" }, { "minotaur", "minotaur_sd" },
        { "하피", "harpy_sd" }, { "harpy", "harpy_sd" },
        { "네크로맨서", "necromancer_sd" }, { "necromancer", "necromancer_sd" },
        { "트렌트", "treant_sd" }, { "treant", "treant_sd" }, { "나무", "treant_sd" },
        { "불사조", "phoenix_sd" }, { "phoenix", "phoenix_sd" },
        // 보스 전용
        { "바하무트", "boss_bahamut_sd" }, { "bahamut", "boss_bahamut_sd" },
        { "심연의 군주", "boss_abyss_lord_sd" }, { "아비스", "boss_abyss_lord_sd" },
        { "천사장", "boss_archangel_sd" }, { "미카엘", "boss_archangel_sd" },
        { "이그드라실", "boss_treant_sd" }, { "세계수", "boss_treant_sd" },
    };

    // 배경 존 → SD 배경 매핑 (v2.58: 전체 존 매핑)
    private static Dictionary<string, string> zoneBgMap = new Dictionary<string, string>
    {
        // 기본 배경 타입
        { "map_village", "bg_village_sd" },
        { "map_forest", "bg_forest_sd" },
        { "map_dungeon", "bg_dungeon_sd" },
        { "map_dragon", "bg_volcano_sd" },
        { "map_chaos", "bg_abyss_sd" },
        { "map_plains", "bg_plains_sd" },
    };

    // 존 ID → 개별 SD 배경 매핑 (우선순위 높음)
    private static Dictionary<string, string> zoneSpecificBgMap = new Dictionary<string, string>
    {
        // 마을
        { "aden", "bg_village_sd" }, { "harbor", "bg_harbor_sd" },
        { "oasis", "bg_desert_sd" }, { "mountain", "bg_mountainlodge_sd" },
        { "frontier", "bg_frontier_sd" }, { "port_east", "bg_harbor_sd" },
        { "shrine", "bg_village_sd" }, { "bazaar", "bg_desert_sd" },
        { "fishing", "bg_riverbank_sd" },
        // 숲
        { "forest", "bg_forest_sd" }, { "meadow", "bg_meadow_sd" },
        { "darkforest", "bg_moonforest_sd" }, { "ancient", "bg_ancientforest_sd" },
        { "mushroom", "bg_mushroom_sd" }, { "world_tree", "bg_worldtree_sd" },
        { "toxic_marsh", "bg_toxicmarsh_sd" }, { "mist_vale", "bg_mistvalley_sd" },
        // 평원/사막
        { "plains", "bg_plains_sd" }, { "desert", "bg_desert_sd" },
        { "coral", "bg_coral_sd" }, { "riverbank", "bg_riverbank_sd" },
        { "sandstorm", "bg_sandstorm_sd" }, { "training", "bg_training_sd" },
        // 던전/동굴
        { "cave", "bg_crystal_cave_sd" }, { "ruins", "bg_elvenruins_sd" },
        { "graveyard", "bg_graveyard_sd" }, { "crystal_mine", "bg_mine_sd" },
        { "haunted", "bg_mansion_sd" }, { "sunken", "bg_sunken_sd" },
        { "sky_ruins", "bg_skyruins_sd" }, { "obsidian", "bg_obsidian_sd" },
        { "castle", "bg_fortress_sd" }, { "fortress", "bg_fortress_sd" },
        // 화산/용
        { "volcano", "bg_volcano_sd" }, { "dragon", "bg_dragongraveyard_sd" },
        { "magma_core", "bg_eruption_sd" }, { "celestial", "bg_celestial_sd" },
        // 빙하
        { "glacier", "bg_glacier_sd" }, { "tundra", "bg_snow_sd" },
        { "frozen_deep", "bg_frozenlake_sd" },
        // 혼돈/PK
        { "abyss", "bg_abyss_sd" }, { "hell", "bg_hellscape_sd" },
        { "chaos", "bg_corrupted_sd" }, { "warzone", "bg_warzone_sd" },
        { "shadow", "bg_shadow_sd" }, { "void_rift", "bg_spiritworld_sd" },
        { "demon", "bg_demoncastle_sd" }, { "lawless", "bg_lawless_sd" },
        { "blood_arena", "bg_bloodarena_sd" }, { "thunder", "bg_thunder_sd" },
        // 특수
        { "arena", "bg_colosseum_sd" }, { "colosseum", "bg_gladiator_sd" },
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

    /// <summary>
    /// 존 배경 스프라이트 로드 (SD 버전 우선)
    /// </summary>
    public static Sprite LoadZoneBackground(string bgType, string zoneId = null)
    {
        // 1. 존 ID 개별 매핑 (최우선)
        if (!string.IsNullOrEmpty(zoneId) && zoneSpecificBgMap.ContainsKey(zoneId))
        {
            Sprite specific = LoadCached($"Sprites/{zoneSpecificBgMap[zoneId]}");
            if (specific != null) return specific;
        }
        // 2. 배경 타입 매핑
        if (zoneBgMap.ContainsKey(bgType))
        {
            Sprite sd = LoadCached($"Sprites/{zoneBgMap[bgType]}");
            if (sd != null) return sd;
        }
        // 3. 폴백: 기존 배경
        Sprite orig = LoadCached($"Sprites/{bgType}");
        if (orig != null) return orig;
        return LoadCached("Sprites/bg_grass");
    }

    /// <summary>
    /// 이펙트 스프라이트 로드
    /// </summary>
    public static Sprite LoadEffect(string element)
    {
        string effectName = "fx_fire"; // default
        switch (element)
        {
            case "fire": effectName = "fx_fire"; break;
            case "ice": effectName = "fx_ice"; break;
            case "lightning": effectName = "fx_lightning"; break;
            case "dark": effectName = "fx_dark"; break;
            case "holy": effectName = "fx_holy"; break;
            case "poison": effectName = "fx_poison"; break;
        }
        return LoadCached($"Sprites/Effects/{effectName}");
    }

    /// <summary>
    /// 건물/오브젝트 스프라이트 로드
    /// </summary>
    public static Sprite LoadObject(string objectName)
    {
        // SD 버전 우선
        Sprite sd = LoadCached($"Sprites/Objects/{objectName}_sd");
        if (sd != null) return sd;
        // 폴백
        return LoadCached($"Sprites/Objects/{objectName}");
    }

    /// <summary>
    /// NPC 스프라이트 로드
    /// </summary>
    public static Sprite LoadNpc(string npcType)
    {
        string spriteName = "npc_elder_sd"; // default
        switch (npcType)
        {
            case "smith": case "대장장이": spriteName = "npc_smith_sd"; break;
            case "shop": case "상점": case "merchant": spriteName = "npc_merchant_sd"; break;
            case "healer": case "힐러": spriteName = "npc_healer_sd"; break;
            case "elder": case "촌장": spriteName = "npc_elder_sd"; break;
        }
        return LoadCached($"Sprites/Characters/{spriteName}");
    }

    private static Sprite LoadCached(string path)
    {
        if (spriteCache.ContainsKey(path)) return spriteCache[path];
        Sprite s = Resources.Load<Sprite>(path);
        if (s != null) spriteCache[path] = s;
        return s;
    }
}
