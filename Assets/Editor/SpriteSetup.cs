using UnityEditor;
using UnityEngine;

/// <summary>
/// Unity 열릴 때 자동으로 프리팹에 SpriteAnimator 설정
/// [메뉴] Tools > AutoBattle > Setup Sprite Prefabs 로도 수동 실행 가능
/// </summary>
[InitializeOnLoad]
public class SpriteSetup
{
    static SpriteSetup()
    {
        // Unity 에디터 시작 시 1회 실행
        EditorApplication.delayCall += SetupPrefabs;
    }

    [MenuItem("Tools/AutoBattle/Setup Sprite Prefabs")]
    public static void SetupPrefabs()
    {
        SetupPlayerPrefab();
        SetupMonsterPrefab();
        Debug.Log("[SpriteSetup] 프리팹 설정 완료!");
    }

    static void SetupPlayerPrefab()
    {
        string path = "Assets/Prefab/PlayerPrefab.prefab";
        GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (prefab == null) { Debug.LogWarning("[SpriteSetup] PlayerPrefab not found: " + path); return; }

        // 프리팹 편집 모드
        string assetPath = AssetDatabase.GetAssetPath(prefab);
        GameObject instance = PrefabUtility.LoadPrefabContents(assetPath);

        // SpriteAnimator 추가 (없으면)
        SpriteAnimator anim = instance.GetComponent<SpriteAnimator>();
        if (anim == null) anim = instance.AddComponent<SpriteAnimator>();

        anim.use4Direction = true;
        anim.walkFps = 6f;
        anim.idleBreathScale = 0.015f;

        // 기본 스프라이트 (warrior front) 할당 — 런타임에 클래스별로 교체됨
        Sprite defaultSprite = LoadSprite("Sprites/Characters/warrior_front");
        if (defaultSprite != null)
        {
            anim.downSprites = new Sprite[] { defaultSprite };
            SpriteRenderer sr = instance.GetComponentInChildren<SpriteRenderer>();
            if (sr != null) sr.sprite = defaultSprite;
        }

        PrefabUtility.SaveAsPrefabAsset(instance, assetPath);
        PrefabUtility.UnloadPrefabContents(instance);
        Debug.Log("[SpriteSetup] PlayerPrefab: SpriteAnimator 설정 완료 (use4Direction=true)");
    }

    static void SetupMonsterPrefab()
    {
        string path = "Assets/Prefab/busut.prefab";
        GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (prefab == null) { Debug.LogWarning("[SpriteSetup] MonsterPrefab not found: " + path); return; }

        string assetPath = AssetDatabase.GetAssetPath(prefab);
        GameObject instance = PrefabUtility.LoadPrefabContents(assetPath);

        // SpriteAnimator 확인
        SpriteAnimator anim = instance.GetComponent<SpriteAnimator>();
        if (anim == null) anim = instance.AddComponent<SpriteAnimator>();

        anim.use4Direction = false; // 몬스터는 단방향 (좌우 flip만)
        anim.walkFps = 4f;
        anim.idleBreathScale = 0.02f;

        PrefabUtility.SaveAsPrefabAsset(instance, assetPath);
        PrefabUtility.UnloadPrefabContents(instance);
        Debug.Log("[SpriteSetup] MonsterPrefab: SpriteAnimator 설정 완료");
    }

    static Sprite LoadSprite(string resourcePath)
    {
        return Resources.Load<Sprite>(resourcePath);
    }
}
