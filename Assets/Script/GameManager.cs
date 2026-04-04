using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using Newtonsoft.Json.Linq;
using TMPro;
using UnityEngine.UI;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    public string serverUrl = "https://baduk-marble-production.up.railway.app";

    [Header("UI")]
    public TextMeshProUGUI goldText;
    public TextMeshProUGUI hpText;
    public TextMeshProUGUI levelText;
    public TextMeshProUGUI teamText;
    public TextMeshProUGUI karmaText;
    public GameObject respawnPanel;

    [Header("Prefabs")]
    public GameObject playerPrefab;
    public GameObject axePrefab;
    public GameObject monsterPrefab;
    public GameObject aoePrefab;
    public GameObject dropPrefab;
    public VirtualJoystick joystick;

    [DllImport("__Internal")]
    private static extern void SocketConnect(string url);

    [DllImport("__Internal")]
    private static extern void SocketEmit(string eventName, string data);

    // ── 네트워크 데이터 클래스 ──
    private class NetworkPlayer {
        public GameObject go;
        public Vector3 targetPos;
        public float hp, maxHp;
        public int gold, level, karma;
        public string className, displayName, team, ownerId;
        public bool isAlive;
    }

    private class NetworkAxe {
        public GameObject go;
        public Vector3 dir;
        public float speed;
    }

    private class NetworkMonster {
        public GameObject go;
        public Vector3 targetPos;
        public float hp, maxHp;
        public string tier, monsterName;
    }

    private Dictionary<string, NetworkPlayer> players = new Dictionary<string, NetworkPlayer>();
    private Dictionary<int, NetworkAxe> axes = new Dictionary<int, NetworkAxe>();
    private Dictionary<int, GameObject> aoes = new Dictionary<int, GameObject>();
    private Dictionary<string, NetworkMonster> monsters = new Dictionary<string, NetworkMonster>();
    private Dictionary<string, GameObject> drops = new Dictionary<string, GameObject>();

    private string myId;
    public float baseMoveSpeed = 8f;
    private float currentMoveSpeed = 8f;
    private bool isMyPlayerAlive = false;
    private string currentZone = "";
    private SpriteRenderer bgRenderer;
    private int myDiamonds = 100;
    private bool showShop = false;
    private bool showMarket = false;
    private bool showInventory = false;
    private string shopMsg = "";
    private float shopMsgTimer = 0;
    private Vector2 shopScroll = Vector2.zero;
    private Vector2 marketScroll = Vector2.zero;
    private string sellPriceStr = "100";

    // 거래소 & 인벤토리 데이터
    private List<JObject> marketListings = new List<JObject>();
    private Dictionary<string, int> myInventory = new Dictionary<string, int>();
    private Dictionary<string, string> itemNames = new Dictionary<string, string>();
    private bool showMenu = false;
    private bool showQuest = false;
    private bool showUnits = false;
    private bool showRanking = false;

    // 퀘스트 데이터
    private JObject questData;
    // 유닛 데이터
    private JArray unitList;
    private int maxArmy = 30;
    // 랭킹 데이터
    private JObject rankingData;

    // UI 텍스처 캐시
    private Dictionary<string, Texture2D> uiTextures = new Dictionary<string, Texture2D>();
    private bool uiLoaded = false;
    private Font koreanFont;
    private GUIStyle btnStyle;
    private GUIStyle labelStyle;
    private GUIStyle boxStyle;
    private bool stylesReady = false;

    private Vector2 currentDir = new Vector2(0, 1);

    public float attackCooldown = 0.5f;
    private float lastAttackTime = 0f;
    private string myClassName = "Warrior";

    private string deviceId;
    private bool hasSelectedClass = false;
    private float moveSkillCooldown = 0f;
    private float boostSpeed = 0f;
    private float boostEndTime = 0f;

    private RectTransform contentRect;
    private List<Camera> miniCameras = new List<Camera>();
    private List<RawImage> miniScreens = new List<RawImage>();
    private List<string> miniTargets = new List<string>();

    // ── 클래스 표시 정보 ──
    private Dictionary<string, string> classDisplayNames = new Dictionary<string, string>() {
        {"Assassin", "어쌔신"}, {"Warrior", "워리어"}, {"Knight", "나이트"},
        {"Mage", "메이지"}, {"GuardianTower", "가디언 타워"}
    };

    private Dictionary<string, Color> tierColors = new Dictionary<string, Color>() {
        {"normal", new Color(0.53f, 0.80f, 0.53f)},
        {"elite", new Color(0.80f, 0.67f, 0.27f)},
        {"rare", new Color(0.67f, 0.27f, 0.80f)},
        {"boss", new Color(1f, 0.27f, 0.27f)}
    };

    // ── 스프라이트 매핑 ──
    private Dictionary<string, string> classSpriteNames = new Dictionary<string, string>() {
        {"Assassin", "char_assassin"}, {"Warrior", "char_warrior"},
        {"Knight", "char_knight"}, {"Mage", "char_mage"},
        {"GuardianTower", "char_tower"}
    };

    private Dictionary<string, string> monsterSpriteNames = new Dictionary<string, string>() {
        {"normal", "mon_slime"}, {"elite", "mon_orc"},
        {"rare", "mon_darkknight"}, {"boss", "mon_dragon"}
    };

    // 스프라이트 캐시
    private Dictionary<string, Sprite[]> spriteCache = new Dictionary<string, Sprite[]>();

    private Sprite[] LoadSpriteSheet(string name)
    {
        if (spriteCache.ContainsKey(name)) return spriteCache[name];

        Texture2D tex = Resources.Load<Texture2D>("Sprites/" + name);
        if (tex == null) return null;

        // 스프라이트시트인지 단일인지 판단 (가로가 세로의 2배 이상이면 시트)
        if (tex.width >= tex.height * 2)
        {
            int frameCount = Mathf.RoundToInt((float)tex.width / tex.height);
            int frameW = tex.width / frameCount;
            int frameH = tex.height;
            Sprite[] frames = new Sprite[frameCount];
            for (int i = 0; i < frameCount; i++)
            {
                frames[i] = Sprite.Create(tex,
                    new Rect(i * frameW, 0, frameW, frameH),
                    new Vector2(0.5f, 0.5f), 100f);
            }
            spriteCache[name] = frames;
            return frames;
        }
        else
        {
            Sprite single = Sprite.Create(tex,
                new Rect(0, 0, tex.width, tex.height),
                new Vector2(0.5f, 0.5f), 100f);
            spriteCache[name] = new Sprite[] { single };
            return new Sprite[] { single };
        }
    }

    // 스프라이트별 게임 내 스케일
    private Dictionary<string, float> spriteScales = new Dictionary<string, float>() {
        {"char_assassin", 2f}, {"char_warrior", 2f},
        {"char_knight", 2f}, {"char_mage", 2f},
        {"char_tower", 2.2f},
        {"mon_slime", 1.8f}, {"mon_orc", 2f},
        {"mon_darkknight", 2.2f}, {"mon_dragon", 2.8f},
        {"item_gold", 1.5f}, {"proj_axe", 1.2f}, {"proj_magic", 1.2f},
        {"effect_aoe", 2.5f},
    };

    private void ApplySprite(GameObject go, string spriteName)
    {
        Sprite[] frames = LoadSpriteSheet(spriteName);
        if (frames == null || frames.Length == 0) return;

        SpriteRenderer sr = go.GetComponentInChildren<SpriteRenderer>();
        if (sr == null) return;

        sr.sprite = frames[0];
        sr.color = Color.white;

        // 스케일 적용
        if (spriteScales.ContainsKey(spriteName))
        {
            float s = spriteScales[spriteName];
            go.transform.localScale = new Vector3(s, s, 1f);
        }

        // 애니메이션 (2프레임 이상이면)
        if (frames.Length > 1)
        {
            SpriteAnimator anim = go.GetComponent<SpriteAnimator>();
            if (anim == null) anim = go.AddComponent<SpriteAnimator>();
            anim.frames = frames;
            anim.fps = 4f;
        }
    }

    void Start()
    {
        deviceId = PlayerPrefs.GetString("DeviceId", "");
        if (string.IsNullOrEmpty(deviceId)) {
            deviceId = Guid.NewGuid().ToString();
            PlayerPrefs.SetString("DeviceId", deviceId);
            PlayerPrefs.Save();
        }

        if (respawnPanel != null) respawnPanel.SetActive(false);

        // Unity Canvas UI 숨기기 (HTML로 전부 이전됨)
        if (goldText != null) goldText.gameObject.SetActive(false);
        if (hpText != null) hpText.gameObject.SetActive(false);
        if (levelText != null) levelText.gameObject.SetActive(false);
        if (teamText != null) teamText.gameObject.SetActive(false);
        if (karmaText != null) karmaText.gameObject.SetActive(false);

        // 한글 폰트 로드
        koreanFont = Resources.Load<Font>("MapleFont");

        // UI 텍스처 로드
        string[] uiNames = {"icon_shop","icon_market","icon_inventory","icon_daily","icon_unit","icon_pvp","icon_quest","icon_settings","icon_gold","icon_diamond","panel_bg","btn_normal","btn_gold"};
        foreach(var n in uiNames) {
            Texture2D t = Resources.Load<Texture2D>("UI/" + n);
            if (t != null) uiTextures[n] = t;
        }
        uiLoaded = uiTextures.Count > 0;

        // 배경 설정
        GameObject bgObj = GameObject.Find("background");
        if (bgObj != null) bgRenderer = bgObj.GetComponent<SpriteRenderer>();
        ChangeBackground("map_village"); // 기본 배경

        SetupScrollableMiniScreens();
        InvokeRepeating("UpdateMiniCameraTargets", 2f, 5f);

        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketConnect(serverUrl);
        #endif
    }

    private void SetupScrollableMiniScreens()
    {
        GameObject canvasObj = GameObject.Find("Canvas");
        if (canvasObj == null) return;

        GameObject scrollViewObj = new GameObject("MiniCamScrollView");
        scrollViewObj.transform.SetParent(canvasObj.transform, false);
        RectTransform scrollRectTransform = scrollViewObj.AddComponent<RectTransform>();
        scrollRectTransform.anchorMin = new Vector2(1, 0);
        scrollRectTransform.anchorMax = new Vector2(1, 1);
        scrollRectTransform.pivot = new Vector2(1, 0.5f);
        scrollRectTransform.anchoredPosition = new Vector2(-10, 0);
        scrollRectTransform.sizeDelta = new Vector2(180, -40);

        Image bgImage = scrollViewObj.AddComponent<Image>();
        bgImage.color = new Color(0, 0, 0, 0.3f);

        ScrollRect scrollRect = scrollViewObj.AddComponent<ScrollRect>();
        scrollRect.horizontal = false;
        scrollRect.vertical = true;
        scrollRect.scrollSensitivity = 20f;

        GameObject viewportObj = new GameObject("Viewport");
        viewportObj.transform.SetParent(scrollViewObj.transform, false);
        RectTransform viewportRect = viewportObj.AddComponent<RectTransform>();
        viewportRect.anchorMin = Vector2.zero;
        viewportRect.anchorMax = Vector2.one;
        viewportRect.sizeDelta = Vector2.zero;
        viewportRect.pivot = new Vector2(0, 1);

        Image viewportImage = viewportObj.AddComponent<Image>();
        viewportImage.color = Color.white;
        Mask mask = viewportObj.AddComponent<Mask>();
        mask.showMaskGraphic = false;

        GameObject contentObj = new GameObject("Content");
        contentObj.transform.SetParent(viewportObj.transform, false);
        contentRect = contentObj.AddComponent<RectTransform>();
        contentRect.anchorMin = new Vector2(0, 1);
        contentRect.anchorMax = new Vector2(1, 1);
        contentRect.pivot = new Vector2(0.5f, 1);
        contentRect.sizeDelta = new Vector2(0, 0);

        VerticalLayoutGroup vlg = contentObj.AddComponent<VerticalLayoutGroup>();
        vlg.childAlignment = TextAnchor.UpperCenter;
        vlg.spacing = 10;
        vlg.padding = new RectOffset(10, 10, 10, 10);
        vlg.childControlHeight = false;
        vlg.childControlWidth = false;

        ContentSizeFitter csf = contentObj.AddComponent<ContentSizeFitter>();
        csf.verticalFit = ContentSizeFitter.FitMode.MinSize;

        scrollRect.viewport = viewportRect;
        scrollRect.content = contentRect;
    }

    private void AdjustMiniScreensToArmySize(int armyCount)
    {
        while (miniCameras.Count < armyCount && miniCameras.Count < 30)
            AddMiniScreenToScroll();

        for (int i = 0; i < miniScreens.Count; i++)
            miniScreens[i].gameObject.SetActive(i < armyCount);
    }

    private void AddMiniScreenToScroll()
    {
        int index = miniCameras.Count;
        RenderTexture rt = new RenderTexture(256, 256, 16);

        GameObject camObj = new GameObject("MiniCam_" + index);
        Camera cam = camObj.AddComponent<Camera>();
        cam.targetTexture = rt;
        cam.orthographic = true;
        cam.orthographicSize = 4f;
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.05f, 0.05f, 0.12f);
        miniCameras.Add(cam);

        GameObject imgObj = new GameObject("MiniScreen_" + index);
        imgObj.transform.SetParent(contentRect, false);
        RawImage rawImage = imgObj.AddComponent<RawImage>();
        rawImage.texture = rt;

        LayoutElement le = imgObj.AddComponent<LayoutElement>();
        le.minWidth = 150;
        le.minHeight = 150;

        miniScreens.Add(rawImage);
        miniTargets.Add(null);
    }

    private void UpdateMiniCameraTargets()
    {
        List<string> myArmy = new List<string>();
        foreach(var kvp in players) {
            if(kvp.Key != myId && kvp.Value.isAlive && kvp.Value.ownerId == myId && kvp.Value.className != "GuardianTower") {
                myArmy.Add(kvp.Key);
            }
        }

        AdjustMiniScreensToArmySize(myArmy.Count);
        for(int i = 0; i < myArmy.Count; i++)
            miniTargets[i] = myArmy[i];
    }

    // ── GUI: 클래스 선택 & 버튼 ──
    void OnGUI()
    {
        // 한글 폰트 스타일 설정
        if (!stylesReady && koreanFont != null)
        {
            GUI.skin.font = koreanFont;
            GUI.skin.button.font = koreanFont;
            GUI.skin.label.font = koreanFont;
            GUI.skin.box.font = koreanFont;
            GUI.skin.textField.font = koreanFont;
            stylesReady = true;
        }
        GUI.skin.button.fontSize = 14;
        GUI.skin.box.fontSize = 16;
        GUI.skin.label.fontSize = 13;

        // 클래스 선택 + 부활 → 전부 HTML에서 처리 (OnGUI 완전 제거)

        if (isMyPlayerAlive && players.ContainsKey(myId))
        {
            float btnW = 170, btnH = 42;
            float topY = 20;

            if (players[myId].team == "peace")
            {
                if (GUI.Button(new Rect(Screen.width / 2 - btnW / 2, topY, btnW, btnH), "[PvP 선언]"))
                    TogglePvP();
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width / 2 - btnW - 5, topY, btnW, btnH), "[평화 복귀]"))
                    TogglePvP();

                if (GUI.Button(new Rect(Screen.width / 2 + 5, topY, btnW, btnH), "타워 건설 (-80G)"))
                    BuildTower();
            }

            if (GUI.Button(new Rect(Screen.width - 210, topY, 190, btnH), "용병 고용 (-150G)"))
                AddBot();

            // 하단 메뉴바 → HTML로 이동됨

            // 카르마 표시
            if (players[myId].karma > 0)
            {
                string karmaStatus = players[myId].karma >= 200 ? "<color=red>카오틱</color>" : "<color=yellow>카르마: " + players[myId].karma + "</color>";
                GUI.Label(new Rect(Screen.width / 2 - 80, topY + btnH + 5, 160, 25), karmaStatus);
            }

            // 상점 메시지
            if (shopMsgTimer > 0)
            {
                GUI.Box(new Rect(Screen.width / 2 - 150, Screen.height / 2 - 20, 300, 40), shopMsg);
                shopMsgTimer -= Time.deltaTime;
            }

            // 각종 창
            if (showShop) DrawShop();
            if (showMarket) DrawMarket();
            if (showInventory) DrawInventory();
            if (showQuest) DrawQuests();
            if (showUnits) DrawUnits();
            if (showRanking) DrawRanking();
        }
    }

    private void DrawQuests()
    {
        float w = 450, h = 400;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), "📜 퀘스트");
        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showQuest = false; return; }

        float iy = y + 35;
        if (questData == null || questData["quests"] == null) {
            GUI.Label(new Rect(x + 10, iy, w - 20, 30), "로딩 중...");
            return;
        }

        foreach (var prop in (JObject)questData["quests"]) {
            if (iy + 35 > y + h - 10) break;
            var q = (JObject)prop.Value;
            string qId = prop.Key;
            string name = q["name"]?.ToString() ?? "";
            string desc = q["desc"]?.ToString() ?? "";
            int goal = q["goal"] != null ? (int)q["goal"] : 0;
            int progress = 0;
            if (questData["progress"] != null && questData["progress"][qId] != null)
                progress = (int)questData["progress"][qId];
            bool completed = questData["completed"] != null && questData["completed"][qId] != null;

            string status = completed ? "[완료]" : $"({progress}/{goal})";
            GUI.Label(new Rect(x + 10, iy, 250, 28), $"{name} - {desc}");
            GUI.Label(new Rect(x + 270, iy, 80, 28), status);

            if (!completed && progress >= goal) {
                if (GUI.Button(new Rect(x + 360, iy, 70, 26), "수령")) {
                    #if UNITY_WEBGL && !UNITY_EDITOR
                    SocketEmit("quest_claim", qId);
                    #endif
                }
            }
            iy += 30;
        }
    }

    private void DrawUnits()
    {
        float w = 400, h = 400;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), $"유닛 관리 (최대 {maxArmy})");
        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showUnits = false; return; }

        float iy = y + 35;
        if (unitList == null || unitList.Count == 0) {
            GUI.Label(new Rect(x + 10, iy, w - 20, 30), "보유 용병이 없습니다");
            return;
        }

        for (int i = 0; i < unitList.Count; i++) {
            if (iy + 32 > y + h - 10) break;
            var u = (JObject)unitList[i];
            string name = u["displayName"]?.ToString() ?? "???";
            int lv = u["level"] != null ? (int)u["level"] : 1;
            float hp = u["hp"] != null ? (float)u["hp"] : 0;
            float maxHp = u["maxHp"] != null ? (float)u["maxHp"] : 1;

            GUI.Label(new Rect(x + 10, iy, 180, 28), $"Lv.{lv} {name}");
            GUI.Label(new Rect(x + 200, iy, 100, 28), $"HP: {Mathf.CeilToInt(hp)}/{Mathf.CeilToInt(maxHp)}");
            if (GUI.Button(new Rect(x + 310, iy, 60, 26), "해고")) {
                string unitId = u["id"]?.ToString();
                #if UNITY_WEBGL && !UNITY_EDITOR
                SocketEmit("dismiss_unit", unitId);
                #endif
            }
            iy += 30;
        }
    }

    private void DrawRanking()
    {
        float w = 400, h = 350;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), "🏆 랭킹");
        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showRanking = false; return; }

        float iy = y + 35;
        if (rankingData == null) {
            GUI.Label(new Rect(x + 10, iy, w - 20, 30), "로딩 중...");
            return;
        }

        GUI.Label(new Rect(x + 10, iy, 200, 20), "── 레벨 랭킹 ──");
        iy += 22;
        if (rankingData["level"] != null) {
            int rank = 1;
            foreach (var r in (JArray)rankingData["level"]) {
                if (iy + 20 > y + h - 10) break;
                GUI.Label(new Rect(x + 10, iy, w - 20, 20), $"{rank}. Lv.{r["level"]} {r["name"]} ({r["className"]})");
                iy += 20; rank++;
            }
        }

        iy += 10;
        GUI.Label(new Rect(x + 10, iy, 200, 20), "── PvP 랭킹 ──");
        iy += 22;
        if (rankingData["pvp"] != null) {
            int rank = 1;
            foreach (var r in (JArray)rankingData["pvp"]) {
                if (iy + 20 > y + h - 10) break;
                GUI.Label(new Rect(x + 10, iy, w - 20, 20), $"{rank}. {r["kills"]}킬 {r["name"]}");
                iy += 20; rank++;
            }
        }
    }

    private void DrawMarket()
    {
        float w = 500, h = 450;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), "💹 거래소 (수수료 5%)");
        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showMarket = false; return; }

        float iy = y + 35;
        GUI.Label(new Rect(x + 10, iy, w - 20, 20), "아이템 | 판매자 | 가격 | 구매");
        iy += 25;

        if (marketListings.Count == 0)
        {
            GUI.Label(new Rect(x + 10, iy, w - 20, 30), "등록된 물건이 없습니다");
        }

        for (int i = 0; i < marketListings.Count && i < 10; i++)
        {
            var item = marketListings[i];
            string name = item["itemName"]?.ToString() ?? "???";
            string seller = item["sellerName"]?.ToString() ?? "???";
            int price = item["price"] != null ? (int)item["price"] : 0;
            int id = item["id"] != null ? (int)item["id"] : 0;

            GUI.Label(new Rect(x + 10, iy, 160, 28), name);
            GUI.Label(new Rect(x + 175, iy, 100, 28), seller);
            GUI.Label(new Rect(x + 280, iy, 80, 28), price + "G");
            if (GUI.Button(new Rect(x + 370, iy, 70, 26), "구매"))
            {
                #if UNITY_WEBGL && !UNITY_EDITOR
                SocketEmit("market_buy", id.ToString());
                #endif
            }
            iy += 30;
        }
    }

    private void DrawInventory()
    {
        float w = 400, h = 400;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), "🎒 인벤토리");
        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showInventory = false; return; }

        float iy = y + 35;
        if (myInventory.Count == 0)
        {
            GUI.Label(new Rect(x + 10, iy, w - 20, 30), "인벤토리가 비어있습니다");
            return;
        }

        foreach (var kvp in myInventory)
        {
            if (iy + 30 > y + h - 50) break;
            string displayName = itemNames.ContainsKey(kvp.Key) ? itemNames[kvp.Key] : kvp.Key;
            GUI.Label(new Rect(x + 10, iy, 180, 28), displayName + " x" + kvp.Value);

            // 판매 버튼
            sellPriceStr = GUI.TextField(new Rect(x + 200, iy, 60, 26), sellPriceStr);
            if (GUI.Button(new Rect(x + 270, iy, 80, 26), "판매 등록"))
            {
                int price = 100;
                int.TryParse(sellPriceStr, out price);
                #if UNITY_WEBGL && !UNITY_EDITOR
                JObject sellData = new JObject();
                sellData["itemId"] = kvp.Key;
                sellData["price"] = price;
                SocketEmit("market_sell", sellData.ToString(Newtonsoft.Json.Formatting.None));
                #endif
            }
            iy += 32;
        }
    }

    private void DrawShop()
    {
        float w = 400, h = 500;
        float x = Screen.width / 2 - w / 2, y = Screen.height / 2 - h / 2;
        GUI.Box(new Rect(x, y, w, h), "🏪 상점 — 💎" + myDiamonds);

        if (GUI.Button(new Rect(x + w - 30, y + 5, 25, 25), "X")) { showShop = false; return; }

        float itemY = y + 35;
        string[][] shopItems = new string[][] {
            new string[]{"exp_boost", "EXP 2배 (5분)", "💎50"},
            new string[]{"gold_boost", "골드 2배 (5분)", "💎50"},
            new string[]{"hp_potion_big", "상급 HP물약 x10", "💎30"},
            new string[]{"skin_golden", "황금 오라 스킨", "💎300"},
            new string[]{"skin_shadow", "그림자 스킨", "💎300"},
            new string[]{"skin_flame", "화염 스킨", "💎500"},
            new string[]{"inventory_expand", "용병 슬롯 +5", "💎200"},
            new string[]{"hp_potion_s", "하급 HP물약 x10", "💰100G"},
            new string[]{"hp_potion_m", "중급 HP물약 x10", "💰300G"},
            new string[]{"atk_boost", "공격 부스터 (1분)", "💰500G"},
            new string[]{"town_scroll", "귀환 주문서", "💰200G"},
        };

        for (int i = 0; i < shopItems.Length; i++)
        {
            float iy = itemY + i * 38;
            if (iy + 35 > y + h - 10) break;
            GUI.Label(new Rect(x + 15, iy + 5, 200, 30), shopItems[i][1]);
            if (GUI.Button(new Rect(x + w - 110, iy, 95, 32), shopItems[i][2]))
            {
                BuyItem(shopItems[i][0]);
            }
        }
    }

    private void DrawClassSelection(string title, bool isRespawn)
    {
        float boxW = 420, boxH = 450;
        float boxX = Screen.width / 2 - boxW / 2;
        float boxY = Screen.height / 2 - boxH / 2;

        GUI.Box(new Rect(boxX, boxY, boxW, boxH), title);

        float btnX = boxX + 30;
        float btnW = 360, btnH = 70;
        float startY = boxY + 50;
        int origSize = GUI.skin.button.fontSize;
        GUI.skin.button.fontSize = 16;

        if (GUI.Button(new Rect(btnX, startY, btnW, btnH), "Assassin [어쌔신]\nHP:120 ATK:45 SPD:22 CRIT:25%"))
            SelectClass("Assassin", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 80, btnW, btnH), "Warrior [워리어]\nHP:180 ATK:30 DEF:15 균형형"))
            SelectClass("Warrior", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 160, btnW, btnH), "Knight [나이트]\nHP:300 DEF:30 탱커 방어 특화"))
            SelectClass("Knight", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 240, btnW, btnH), "Mage [메이지]\nHP:90 ATK:10 광역 마법 공격"))
            SelectClass("Mage", isRespawn);

        GUI.skin.button.fontSize = origSize;
    }

    private void SelectClass(string className, bool isRespawn)
    {
        myClassName = className;
        if (!isRespawn)
        {
            hasSelectedClass = true;
            JObject initReq = new JObject();
            initReq["className"] = myClassName;
            initReq["deviceId"] = deviceId;
            #if UNITY_WEBGL && !UNITY_EDITOR
            SocketEmit("init_request", initReq.ToString(Newtonsoft.Json.Formatting.None));
            #endif
        }
        else
        {
            JObject respawnReq = new JObject();
            respawnReq["className"] = myClassName;
            #if UNITY_WEBGL && !UNITY_EDITOR
            SocketEmit("respawn", respawnReq.ToString(Newtonsoft.Json.Formatting.None));
            #endif
            if (respawnPanel != null) respawnPanel.SetActive(false);
        }
    }

    void Update()
    {
        HandleLocalInput();
        InterpolateNetworkEntities();
        HandleAutoAttack();
        UpdateHPBars();
    }

    void LateUpdate()
    {
        for(int i = 0; i < miniCameras.Count; i++) {
            if (i < miniTargets.Count && miniTargets[i] != null && players.ContainsKey(miniTargets[i])) {
                GameObject targetGo = players[miniTargets[i]].go;
                if (targetGo != null && targetGo.activeSelf) {
                    Vector3 desiredPos = targetGo.transform.position + new Vector3(0, 0, -10f);
                    miniCameras[i].transform.position = Vector3.Lerp(miniCameras[i].transform.position, desiredPos, Time.deltaTime * 5f);
                }
            }
        }
    }

    private void HandleLocalInput()
    {
        if (string.IsNullOrEmpty(myId) || !players.ContainsKey(myId) || !isMyPlayerAlive)
            return;

        // ── 이동: 조이스틱 + WASD/방향키 (항상 수동) ──
        if (joystick != null) joystick.gameObject.SetActive(true); // 항상 활성

        float h = 0f, v = 0f;

        // 조이스틱 입력
        if (joystick != null) {
            h = joystick.InputVector.x;
            v = joystick.InputVector.y;
        }
        // 키보드 입력 (WASD + 방향키)
        if (h == 0 && v == 0) {
            h = Input.GetAxisRaw("Horizontal");
            v = Input.GetAxisRaw("Vertical");
        }

        bool isMoving = (h != 0 || v != 0);

        if (isMoving)
        {
            currentDir = new Vector2(h, v).normalized;

            // 클래스별 이동속도
            if (myClassName == "Assassin") currentMoveSpeed = 9f;
            else if (myClassName == "Knight") currentMoveSpeed = 6f;
            else if (myClassName == "Warrior") currentMoveSpeed = 8f;
            else if (myClassName == "Mage") currentMoveSpeed = 6.5f;

            // 클래스별 이동 스킬 (대시)
            if (Time.time >= moveSkillCooldown)
            {
                if (myClassName == "Assassin") {
                    boostSpeed = 22f; boostEndTime = Time.time + 0.15f; moveSkillCooldown = Time.time + 0.4f;
                } else if (myClassName == "Knight") {
                    boostSpeed = 14f; boostEndTime = Time.time + 0.3f; moveSkillCooldown = Time.time + 2.0f;
                }
            }

            float finalSpeed = currentMoveSpeed;
            if (Time.time < boostEndTime) finalSpeed += boostSpeed;

            Vector3 movement = new Vector3(h, v, 0).normalized * finalSpeed * Time.deltaTime;
            players[myId].go.transform.position += movement;

            Vector3 correctedPos = players[myId].go.transform.position;
            correctedPos.z = -1f;
            players[myId].go.transform.position = correctedPos;

            players[myId].go.transform.rotation = Quaternion.identity;
            FlipByDirection(players[myId].go, currentDir.x);

            JObject moveData = new JObject();
            moveData["x"] = players[myId].go.transform.position.x;
            moveData["y"] = players[myId].go.transform.position.y;
            moveData["dirX"] = currentDir.x;
            moveData["dirY"] = currentDir.y;

            #if UNITY_WEBGL && !UNITY_EDITOR
            SocketEmit("move", moveData.ToString(Newtonsoft.Json.Formatting.None));
            #endif
        }

        // ── 공격: Space 키 또는 마우스 클릭 ──
        // 마우스 방향으로 공격 방향 설정
        if (Camera.main != null)
        {
            Vector3 mouseWorld = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            Vector3 myPos = players[myId].go.transform.position;
            Vector2 aimDir = new Vector2(mouseWorld.x - myPos.x, mouseWorld.y - myPos.y).normalized;
            if (aimDir.magnitude > 0.1f) currentDir = aimDir;
        }

        // Space 키 또는 마우스 좌클릭으로 수동 공격
        bool attackPressed = Input.GetKeyDown(KeyCode.Space) || Input.GetMouseButtonDown(0);
        if (attackPressed && Time.time - lastAttackTime >= attackCooldown)
        {
            // 마우스 방향으로 방향 업데이트 후 공격
            JObject atkDir = new JObject();
            atkDir["dirX"] = currentDir.x;
            atkDir["dirY"] = currentDir.y;
            #if UNITY_WEBGL && !UNITY_EDITOR
            SocketEmit("move", atkDir.ToString(Newtonsoft.Json.Formatting.None)); // 방향 업데이트
            #endif
            ThrowAxe();
            lastAttackTime = Time.time;
        }

        // 공격 쿨타임 설정
        if (myClassName == "Assassin") attackCooldown = 0.25f;
        else if (myClassName == "Warrior") attackCooldown = 0.35f;
        else if (myClassName == "Knight") attackCooldown = 0.7f;
        else if (myClassName == "Mage") attackCooldown = 1.2f;
    }

    // 본 캐릭터는 자동 공격 안 함 (용병만 자동)
    private void HandleAutoAttack()
    {
        // 본 캐릭터 자동공격 제거 — 수동으로만 공격
    }

    private void InterpolateNetworkEntities()
    {
        foreach (var kvp in players) {
            if (kvp.Key == myId || !kvp.Value.isAlive) continue;
            if (kvp.Value.go != null) {
                Vector3 oldPos = kvp.Value.go.transform.position;
                Vector3 newPos = Vector3.Lerp(oldPos, kvp.Value.targetPos, Time.deltaTime * 10f);
                kvp.Value.go.transform.position = newPos;
                // 이동 방향에 따라 좌우 반전
                FlipByDirection(kvp.Value.go, newPos.x - oldPos.x);
            }
        }

        foreach (var kvp in monsters) {
            if (kvp.Value.go != null) {
                Vector3 oldPos = kvp.Value.go.transform.position;
                Vector3 newPos = Vector3.Lerp(oldPos, kvp.Value.targetPos, Time.deltaTime * 5f);
                kvp.Value.go.transform.position = newPos;
                FlipByDirection(kvp.Value.go, newPos.x - oldPos.x);
            }
        }

        foreach (var kvp in axes) {
            if (kvp.Value.go != null) {
                kvp.Value.go.transform.Rotate(0, 0, -1080f * Time.deltaTime);
                kvp.Value.go.transform.position += kvp.Value.dir * kvp.Value.speed * Time.deltaTime;
            }
        }
    }

    private void FlipByDirection(GameObject go, float deltaX)
    {
        if (Mathf.Abs(deltaX) < 0.001f) return;
        SpriteRenderer sr = go.GetComponentInChildren<SpriteRenderer>();
        if (sr != null) sr.flipX = (deltaX < 0);
    }

    public void ThrowAxe()
    {
        if (!isMyPlayerAlive) return;
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("throw", "{}");
        #endif
    }

    public void TogglePvP()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("toggle_pvp", "{}");
        #endif
    }

    public void BuildTower()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("build_tower", "{}");
        #endif
    }

    public void AddBot()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("add_bot", "{}");
        #endif
    }

    public void BuyItem(string itemId)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("shop_buy", itemId);
        #endif
    }

    public void ClaimDaily()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("daily_reward", "{}");
        #endif
    }

    public void OpenMarket()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("market_list", "{}");
        #endif
    }

    public void OpenInventory()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("get_inventory", "{}");
        #endif
    }

    public void OpenQuests()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("get_quests", "{}");
        #endif
    }

    public void OpenUnits()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("get_units", "{}");
        #endif
    }

    public void OpenRanking()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("get_ranking", "{}");
        #endif
    }

    // ==========================================
    // 서버 이벤트 핸들러
    // ==========================================

    public void OnInit(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        myId = (string)data["id"];
        hasSelectedClass = true; // HTML에서 클래스 선택 완료
        JObject playersData = (JObject)data["players"];
        JObject monstersData = (JObject)data["monsters"];

        foreach (var playerProp in playersData) SpawnPlayer(playerProp.Key, (JObject)playerProp.Value);
        foreach (var mProp in monstersData) SpawnMonster(mProp.Key, (JObject)mProp.Value);

        // 기존 드롭 아이템
        if (data["drops"] != null) {
            foreach (var dProp in (JObject)data["drops"]) SpawnDrop(dProp.Key, (JObject)dProp.Value);
        }
    }

    public void OnPlayerJoin(string jsonStr)
    {
        JObject pData = JObject.Parse(jsonStr);
        SpawnPlayer((string)pData["id"], pData);
    }

    public void OnPlayerLeave(string pId)
    {
        if (players.ContainsKey(pId)) {
            Destroy(players[pId].go);
            players.Remove(pId);
        }
    }

    public void OnPlayerUpdate(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        string id = (string)data["id"];
        if (players.ContainsKey(id))
        {
            var p = players[id];
            p.level = (int)data["level"];
            p.className = (string)data["className"];
            p.displayName = data["displayName"]?.ToString() ?? p.className;
            p.maxHp = (float)data["maxHp"];
            p.hp = (float)data["hp"];
            p.team = (string)data["team"];
            p.ownerId = data["ownerId"]?.ToString();
            if (data["karma"] != null) p.karma = (int)data["karma"];

            if (id == myId) {
                myClassName = p.className;
                UpdateMyUI();
            }
        }
    }

    public void OnSync(string jsonStr)
    {
        JObject syncData = JObject.Parse(jsonStr);
        JObject pData = (JObject)syncData["players"];
        JObject mData = (JObject)syncData["monsters"];

        foreach (var pProp in pData) {
            string pId = pProp.Key;
            JObject pObj = (JObject)pProp.Value;
            if (players.ContainsKey(pId)) {
                players[pId].targetPos = new Vector3((float)pObj["x"], (float)pObj["y"], -1f);
                if (pObj["gold"] != null) players[pId].gold = (int)pObj["gold"];
                if (pObj["hp"] != null) players[pId].hp = (float)pObj["hp"];
                if (pObj["karma"] != null) players[pId].karma = (int)pObj["karma"];
                if (pObj["diamonds"] != null && pId == myId) myDiamonds = (int)pObj["diamonds"];
                if (pId == myId) {
                    UpdateMyUI();
                    // 존 변경 시 배경 업데이트
                    string zone = pObj["zone"]?.ToString();
                    if (!string.IsNullOrEmpty(zone)) {
                        string mapName = "map_" + zone;
                        ChangeBackground(mapName);
                    }
                }
            }
        }

        foreach (var mProp in mData) {
            string mId = mProp.Key;
            JObject mObj = (JObject)mProp.Value;
            if (monsters.ContainsKey(mId))
                monsters[mId].targetPos = new Vector3((float)mObj["x"], (float)mObj["y"], 0f);
        }
    }

    public void OnAxeSpawn(string jsonStr)
    {
        JObject aData = JObject.Parse(jsonStr);
        int axeId = (int)aData["id"];
        GameObject newAxe = Instantiate(axePrefab, new Vector3((float)aData["x"], (float)aData["y"], -1f), Quaternion.identity);

        NetworkAxe nAxe = new NetworkAxe();
        nAxe.go = newAxe;
        nAxe.dir = new Vector3((float)aData["dirX"], (float)aData["dirY"], 0).normalized;
        nAxe.speed = (float)aData["speed"];

        // 크리티컬 이펙트
        if (aData["isCrit"] != null && (bool)aData["isCrit"]) {
            SpriteRenderer sr = newAxe.GetComponentInChildren<SpriteRenderer>();
            if (sr != null) sr.color = Color.red;
            newAxe.transform.localScale *= 1.3f;
        }

        axes[axeId] = nAxe;
    }

    public void OnAxeDestroy(string axeIdStr)
    {
        int axeId = int.Parse(axeIdStr);
        if (axes.ContainsKey(axeId)) {
            Destroy(axes[axeId].go);
            axes.Remove(axeId);
        }
    }

    public void OnAoeSpawn(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        int id = (int)data["id"];
        if (aoePrefab != null) {
            GameObject aoe = Instantiate(aoePrefab, new Vector3((float)data["x"], (float)data["y"], -1f), Quaternion.identity);
            aoe.transform.localScale = new Vector3((float)data["radius"] * 2, (float)data["radius"] * 2, 1);
            aoes[id] = aoe;
        }
    }

    public void OnAoeDestroy(string idStr)
    {
        int id = int.Parse(idStr);
        if (aoes.ContainsKey(id)) { Destroy(aoes[id]); aoes.Remove(id); }
    }

    public void OnPlayerHit(string jsonStr)
    {
        JObject hitData = JObject.Parse(jsonStr);
        string pId = (string)hitData["id"];
        if (players.ContainsKey(pId)) {
            players[pId].hp = (float)hitData["hp"];

            // 타격 이펙트
            if (hitData["damage"] != null && players[pId].go != null) {
                int dmg = (int)hitData["damage"];
                bool isCrit = hitData["isCrit"] != null && (bool)hitData["isCrit"];
                PlayHitEffect(players[pId].go, dmg, isCrit);
            }

            if (pId == myId) UpdateMyUI();
        }
    }

    public void OnPlayerDie(string jsonStr)
    {
        JObject dieData = JObject.Parse(jsonStr);
        string victimId = (string)dieData["victimId"];
        bool stolen = dieData["stolen"] != null && (bool)dieData["stolen"];
        bool isPK = dieData["isPK"] != null && (bool)dieData["isPK"];

        if (players.ContainsKey(victimId)) {
            players[victimId].isAlive = false;
            players[victimId].go.SetActive(false);

            if (victimId == myId) {
                isMyPlayerAlive = false;
                if (hpText != null) {
                    if (stolen) hpText.text = "왕에게 영혼을 빼앗겼습니다!";
                    else if (isPK) hpText.text = "PK 당했습니다...";
                    else hpText.text = "전사했습니다...";
                }
                if (respawnPanel != null) respawnPanel.SetActive(false);
            }
        }
    }

    public void OnPlayerRespawn(string jsonStr)
    {
        JObject respawnData = JObject.Parse(jsonStr);
        string pId = (string)respawnData["id"];

        if (players.ContainsKey(pId)) {
            players[pId].isAlive = true;
            players[pId].hp = (float)respawnData["hp"];
            Vector3 pos = new Vector3((float)respawnData["x"], (float)respawnData["y"], -1f);
            players[pId].go.transform.position = pos;
            players[pId].targetPos = pos;
            players[pId].go.SetActive(true);

            if (pId == myId) {
                isMyPlayerAlive = true;
                UpdateMyUI();
            }
        }
    }

    public void OnMonsterSpawn(string jsonStr)
    {
        JObject mData = JObject.Parse(jsonStr);
        SpawnMonster((string)mData["id"], mData);
    }

    public void OnMonsterHit(string jsonStr)
    {
        JObject mData = JObject.Parse(jsonStr);
        string mId = (string)mData["id"];
        if (monsters.ContainsKey(mId)) {
            monsters[mId].hp = (float)mData["hp"];

            // 타격 이펙트
            if (mData["damage"] != null && monsters[mId].go != null) {
                PlayHitEffect(monsters[mId].go, (int)mData["damage"], false);
            }
        }
    }

    public void OnMonsterDie(string jsonStr)
    {
        try {
            JObject data = JObject.Parse(jsonStr);
            string mId = (string)data["id"];
            if (monsters.ContainsKey(mId)) {
                Destroy(monsters[mId].go);
                monsters.Remove(mId);
            }
        } catch {
            // 이전 형식 호환 (단순 문자열)
            if (monsters.ContainsKey(jsonStr)) {
                Destroy(monsters[jsonStr].go);
                monsters.Remove(jsonStr);
            }
        }
    }

    // ── 드롭 아이템 ──
    public void OnDropSpawn(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        SpawnDrop((string)data["id"], data);
    }

    public void OnDropDestroy(string dropId)
    {
        if (drops.ContainsKey(dropId)) {
            Destroy(drops[dropId]);
            drops.Remove(dropId);
        }
    }

    // ── 레벨업 알림 ──
    public void OnLevelUp(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        string id = (string)data["id"];
        int level = (int)data["level"];

        if (id == myId) {
            Debug.Log($"레벨 업! Lv.{level}");
        }
    }

    // ── PK 알림 ──
    public void OnPkAlert(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        Debug.Log($"[PK] {data["killerName"]}이(가) PK를 저질렀습니다! 카르마: {data["karma"]}");
    }

    // ── 상점 결과 ──
    public void OnShopResult(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        shopMsg = (string)data["msg"];
        shopMsgTimer = 3f;
        if (data["diamonds"] != null) myDiamonds = (int)data["diamonds"];
    }

    public void OnShopListResult(string jsonStr) { }

    public void OnDailyResult(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        shopMsg = (string)data["msg"];
        shopMsgTimer = 3f;
        if (data["diamonds"] != null) myDiamonds = (int)data["diamonds"];
    }

    public void OnMarketData(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        marketListings.Clear();
        if (data["listings"] != null)
        {
            foreach (var item in (JArray)data["listings"])
                marketListings.Add((JObject)item);
        }
    }

    public void OnMarketResult(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        shopMsg = data["msg"]?.ToString() ?? "";
        shopMsgTimer = 3f;
        // 거래 후 목록/인벤토리 갱신
        OpenMarket();
        OpenInventory();
    }

    public void OnQuestData(string jsonStr) { questData = JObject.Parse(jsonStr); }
    public void OnQuestResult(string jsonStr) { shopMsg = JObject.Parse(jsonStr)["msg"]?.ToString() ?? ""; shopMsgTimer = 3f; OpenQuests(); }
    public void OnUnitData(string jsonStr) { var d = JObject.Parse(jsonStr); unitList = (JArray)d["units"]; maxArmy = d["maxArmy"] != null ? (int)d["maxArmy"] : 30; }
    public void OnUnitResult(string jsonStr) { shopMsg = JObject.Parse(jsonStr)["msg"]?.ToString() ?? ""; shopMsgTimer = 3f; OpenUnits(); }
    public void OnEquipResult(string jsonStr) { shopMsg = JObject.Parse(jsonStr)["msg"]?.ToString() ?? ""; shopMsgTimer = 3f; OpenInventory(); }
    public void OnRankingData(string jsonStr) { rankingData = JObject.Parse(jsonStr); }

    public void OnInventoryData(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        myInventory.Clear();
        if (data["inventory"] != null)
        {
            foreach (var prop in (JObject)data["inventory"])
                myInventory[prop.Key] = (int)prop.Value;
        }
        if (data["items"] != null)
        {
            foreach (var prop in (JObject)data["items"])
            {
                var item = (JObject)prop.Value;
                itemNames[prop.Key] = item["name"]?.ToString() ?? prop.Key;
            }
        }
    }

    // ── 카오틱 사망 페널티 알림 ──
    public void OnChaoticDeathPenalty(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        string pId = (string)data["playerId"];
        if (pId == myId) {
            Debug.Log($"[카오틱 페널티] 골드 -{data["goldLoss"]}, 경험치 -{data["expLoss"]}");
        }
    }

    // ==========================================
    // 유틸리티
    // ==========================================

    private void SpawnPlayer(string id, JObject data)
    {
        if (players.ContainsKey(id)) return;

        bool alive = (bool)data["isAlive"];
        GameObject newPlayer = Instantiate(playerPrefab, new Vector3((float)data["x"], (float)data["y"], -1f), Quaternion.identity);
        newPlayer.SetActive(alive);

        NetworkPlayer np = new NetworkPlayer();
        np.go = newPlayer;
        np.targetPos = newPlayer.transform.position;
        np.hp = (float)data["hp"];
        np.maxHp = (float)data["maxHp"];
        np.gold = data["gold"] != null ? (int)data["gold"] : 0;
        np.level = (int)data["level"];
        np.className = (string)data["className"];
        np.displayName = data["displayName"]?.ToString() ?? np.className;
        np.team = (string)data["team"];
        np.ownerId = data["ownerId"]?.ToString();
        np.karma = data["karma"] != null ? (int)data["karma"] : 0;
        np.isAlive = alive;

        // 클래스별 스프라이트 적용
        if (classSpriteNames.ContainsKey(np.className)) {
            ApplySprite(newPlayer, classSpriteNames[np.className]);
        }

        // 가디언 타워 크기 조정
        if (np.className == "GuardianTower") {
            newPlayer.transform.localScale = new Vector3(1.8f, 1.8f, 1f);
        }

        // 카오틱 표시 (빨간 틴트)
        if (np.karma >= 200) {
            SpriteRenderer sr = newPlayer.GetComponentInChildren<SpriteRenderer>();
            if (sr != null) sr.color = new Color(1f, 0.5f, 0.5f);
        }

        // HP바 + 이름표 추가
        CreateHPBar(newPlayer, np.displayName, id == myId, np.className == "GuardianTower");

        players[id] = np;

        if (id == myId) {
            isMyPlayerAlive = alive;
            myClassName = np.className;
            UpdateMyUI();

            if (!alive && respawnPanel != null) respawnPanel.SetActive(false);

            if (Camera.main != null) {
                CameraFollow camFollow = Camera.main.GetComponent<CameraFollow>();
                if (camFollow != null) camFollow.SetTarget(newPlayer.transform);
            }
        }
    }

    private void SpawnMonster(string id, JObject data)
    {
        if (monsters.ContainsKey(id) || monsterPrefab == null) return;

        GameObject mGo = Instantiate(monsterPrefab, new Vector3((float)data["x"], (float)data["y"], 0f), Quaternion.identity);
        NetworkMonster nm = new NetworkMonster();
        nm.go = mGo;
        nm.targetPos = mGo.transform.position;
        nm.hp = (float)data["hp"];
        nm.maxHp = (float)data["maxHp"];
        nm.tier = data["tier"]?.ToString() ?? "normal";
        nm.monsterName = data["name"]?.ToString() ?? "슬라임";

        // 등급별 스프라이트 적용
        if (monsterSpriteNames.ContainsKey(nm.tier)) {
            ApplySprite(mGo, monsterSpriteNames[nm.tier]);
        } else {
            SpriteRenderer sr = mGo.GetComponentInChildren<SpriteRenderer>();
            if (sr != null && tierColors.ContainsKey(nm.tier))
                sr.color = tierColors[nm.tier];
        }

        if (nm.tier == "elite") mGo.transform.localScale *= 1.3f;
        else if (nm.tier == "rare") mGo.transform.localScale *= 1.6f;
        else if (nm.tier == "boss") mGo.transform.localScale *= 2.5f;

        // 몬스터 HP바 + 이름
        CreateHPBar(mGo, nm.monsterName, false, false);

        monsters[id] = nm;
    }

    private void SpawnDrop(string id, JObject data)
    {
        if (drops.ContainsKey(id)) return;

        Vector3 pos = new Vector3((float)data["x"], (float)data["y"], -0.5f);
        GameObject dropGo;

        if (dropPrefab != null) {
            dropGo = Instantiate(dropPrefab, pos, Quaternion.identity);
        } else {
            // 프리팹 없으면 골드 스프라이트로 표시
            dropGo = new GameObject("Drop_" + id);
            dropGo.transform.position = pos;
            SpriteRenderer dsr = dropGo.AddComponent<SpriteRenderer>();
            dsr.sortingOrder = 5;
            Sprite[] goldFrames = LoadSpriteSheet("item_gold");
            if (goldFrames != null && goldFrames.Length > 0) {
                dsr.sprite = goldFrames[0];
                dropGo.transform.localScale = Vector3.one * 0.5f;
            } else {
                // 스프라이트 없으면 기본
                dsr.color = Color.yellow;
            }
        }

        drops[id] = dropGo;
    }

    // ── 타격 이펙트 ──
    private void PlayHitEffect(GameObject target, int damage, bool isCrit)
    {
        if (target == null) return;

        // 1. 스프라이트 번쩍임 (빨간색 → 원래색)
        StartCoroutine(FlashSprite(target));

        // 2. 흔들림 (넉백 느낌)
        StartCoroutine(ShakeObject(target, isCrit ? 0.3f : 0.15f));

        // 3. 데미지 숫자
        ShowDamageText(target.transform.position, damage, isCrit);
    }

    private IEnumerator FlashSprite(GameObject obj)
    {
        SpriteRenderer sr = obj.GetComponentInChildren<SpriteRenderer>();
        if (sr == null) yield break;

        Color original = sr.color;
        sr.color = Color.red;
        yield return new WaitForSeconds(0.08f);
        sr.color = Color.white;
        yield return new WaitForSeconds(0.05f);
        sr.color = original;
    }

    private IEnumerator ShakeObject(GameObject obj, float intensity)
    {
        if (obj == null) yield break;
        Vector3 originalPos = obj.transform.position;
        float elapsed = 0f;
        float duration = 0.2f;

        while (elapsed < duration)
        {
            float x = UnityEngine.Random.Range(-intensity, intensity);
            float y = UnityEngine.Random.Range(-intensity, intensity);
            obj.transform.position = originalPos + new Vector3(x, y, 0);
            elapsed += Time.deltaTime;
            yield return null;
        }
        obj.transform.position = originalPos;
    }

    private void ShowDamageText(Vector3 worldPos, int damage, bool isCrit)
    {
        // 간이 데미지 텍스트 (월드 좌표에 TextMesh 생성)
        GameObject dmgObj = new GameObject("DmgText");
        dmgObj.transform.position = worldPos + new Vector3(UnityEngine.Random.Range(-0.3f, 0.3f), 0.5f, -2f);

        TextMesh tm = dmgObj.AddComponent<TextMesh>();
        tm.text = isCrit ? $"CRIT! {damage}" : damage.ToString();
        tm.color = isCrit ? Color.red : Color.white;
        tm.fontSize = isCrit ? 48 : 36;
        tm.characterSize = 0.08f;
        tm.alignment = TextAlignment.Center;
        tm.anchor = TextAnchor.MiddleCenter;

        StartCoroutine(FloatAndDestroy(dmgObj));
    }

    private IEnumerator FloatAndDestroy(GameObject obj)
    {
        float elapsed = 0f;
        Vector3 startPos = obj.transform.position;
        while (elapsed < 0.8f) {
            elapsed += Time.deltaTime;
            obj.transform.position = startPos + Vector3.up * elapsed * 1.5f;

            TextMesh tm = obj.GetComponent<TextMesh>();
            if (tm != null) {
                Color c = tm.color;
                c.a = 1f - (elapsed / 0.8f);
                tm.color = c;
            }
            yield return null;
        }
        Destroy(obj);
    }

    private void CreateHPBar(GameObject parent, string name, bool isMe, bool isTower)
    {
        float yOffset = isTower ? 1.5f : 1.0f;

        // 이름표
        GameObject nameObj = new GameObject("NameLabel");
        nameObj.transform.SetParent(parent.transform, false);
        nameObj.transform.localPosition = new Vector3(0, yOffset + 0.25f, -1);
        TextMesh nameTM = nameObj.AddComponent<TextMesh>();
        nameTM.text = name;
        nameTM.fontSize = 28;
        nameTM.characterSize = 0.06f;
        nameTM.alignment = TextAlignment.Center;
        nameTM.anchor = TextAnchor.MiddleCenter;
        nameTM.color = isMe ? Color.green : Color.white;
        if (koreanFont != null) nameTM.font = koreanFont;
        // 폰트 머티리얼 설정
        MeshRenderer nameRenderer = nameObj.GetComponent<MeshRenderer>();
        if (koreanFont != null && koreanFont.material != null) nameRenderer.material = koreanFont.material;
        nameRenderer.sortingOrder = 100;

        // HP바 배경 (빨간)
        GameObject hpBg = new GameObject("HPBarBG");
        hpBg.transform.SetParent(parent.transform, false);
        hpBg.transform.localPosition = new Vector3(0, yOffset, -1);
        SpriteRenderer bgSR = hpBg.AddComponent<SpriteRenderer>();
        bgSR.sprite = CreatePixelSprite(Color.red);
        bgSR.sortingOrder = 98;
        hpBg.transform.localScale = new Vector3(1.2f, 0.12f, 1);

        // HP바 전경 (초록) — 좌측 피벗으로 우측에서 줄어듦
        GameObject hpFg = new GameObject("HPBarFG");
        hpFg.transform.SetParent(parent.transform, false);
        hpFg.transform.localPosition = new Vector3(-0.6f, yOffset, -1);
        SpriteRenderer fgSR = hpFg.AddComponent<SpriteRenderer>();
        Texture2D fgTex = new Texture2D(1, 1);
        fgTex.SetPixel(0, 0, Color.white);
        fgTex.Apply();
        fgSR.sprite = Sprite.Create(fgTex, new Rect(0, 0, 1, 1), new Vector2(0f, 0.5f), 1f); // 좌측 피벗
        fgSR.color = isMe ? new Color(0.2f, 1f, 0.2f) : new Color(0.2f, 0.8f, 0.2f);
        fgSR.sortingOrder = 99;
        hpFg.transform.localScale = new Vector3(1.2f, 0.12f, 1);
    }

    private Sprite _pixelSpriteCache;
    private Sprite CreatePixelSprite(Color color)
    {
        Texture2D tex = new Texture2D(1, 1);
        tex.SetPixel(0, 0, Color.white);
        tex.Apply();
        return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
    }

    private void UpdateHPBars()
    {
        // 플레이어 HP바 업데이트
        foreach (var kvp in players)
        {
            if (!kvp.Value.isAlive || kvp.Value.go == null) continue;
            UpdateSingleHPBar(kvp.Value.go, kvp.Value.hp, kvp.Value.maxHp);
        }

        // 몬스터 HP바 업데이트
        foreach (var kvp in monsters)
        {
            if (kvp.Value.go == null) continue;
            UpdateSingleHPBar(kvp.Value.go, kvp.Value.hp, kvp.Value.maxHp);
        }
    }

    private void UpdateSingleHPBar(GameObject go, float hp, float maxHp)
    {
        Transform hpFg = go.transform.Find("HPBarFG");
        Transform hpBg = go.transform.Find("HPBarBG");
        if (hpFg == null || maxHp <= 0) return;

        float ratio = Mathf.Clamp01(hp / maxHp);

        // 스케일로만 바 크기 조절 (위치 고정)
        hpFg.localScale = new Vector3(1.2f * ratio, 0.12f, 1);

        // 색상 변화 (HP에 따라 초록→노랑→빨강)
        SpriteRenderer sr = hpFg.GetComponent<SpriteRenderer>();
        if (sr != null)
        {
            if (ratio > 0.5f) sr.color = Color.Lerp(Color.yellow, Color.green, (ratio - 0.5f) * 2);
            else sr.color = Color.Lerp(Color.red, Color.yellow, ratio * 2);
        }
    }

    private void CloseAllPanels()
    {
        showShop = false; showMarket = false; showInventory = false;
        showUnits = false; showQuest = false; showRanking = false;
    }

    private bool DrawIconButton(float x, float y, float size, string texName, string label)
    {
        bool clicked = false;
        float totalW = size + 70;

        // 배경 버튼
        if (GUI.Button(new Rect(x, y, totalW, size), ""))
            clicked = true;

        // 아이콘
        if (uiTextures.ContainsKey(texName))
            GUI.DrawTexture(new Rect(x + 4, y + 4, size - 8, size - 8), uiTextures[texName], ScaleMode.ScaleToFit);

        // 라벨 (아이콘 우측)
        int origSize = GUI.skin.label.fontSize;
        GUI.skin.label.fontSize = 14;
        GUI.Label(new Rect(x + size + 2, y + size / 2 - 10, 65, 22), label);
        GUI.skin.label.fontSize = origSize;

        return clicked;
    }

    private void ChangeBackground(string mapName)
    {
        if (bgRenderer == null || mapName == currentZone) return;
        currentZone = mapName;

        Texture2D tex = Resources.Load<Texture2D>("Sprites/" + mapName);
        if (tex != null)
        {
            Sprite bgSprite = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f), 32f);
            bgRenderer.sprite = bgSprite;
            bgRenderer.color = Color.white;
        }
    }

    private void UpdateMyUI()
    {
        if (!players.ContainsKey(myId)) return;
        // 모든 UI → HTML로 이동됨. Unity TextMesh 비우기
        if (goldText != null) goldText.text = "";
        if (hpText != null) hpText.text = "";
        if (levelText != null) levelText.text = "";
        if (teamText != null) teamText.text = "";

        if (karmaText != null) karmaText.text = "";
    }
}
