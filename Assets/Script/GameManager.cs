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
        // 기본 스타일 설정
        GUI.skin.button.fontSize = 16;
        GUI.skin.box.fontSize = 18;
        GUI.skin.label.fontSize = 14;

        if (!hasSelectedClass)
        {
            DrawClassSelection("AutoBattle.io - 클래스 선택", false);
        }
        else if (myId != null && !isMyPlayerAlive)
        {
            DrawClassSelection("사망 - 새로운 클래스로 부활", true);
        }

        if (hasSelectedClass && isMyPlayerAlive && players.ContainsKey(myId))
        {
            float btnW = 170, btnH = 42;
            float topY = 20;

            if (players[myId].team == "peace")
            {
                if (GUI.Button(new Rect(Screen.width / 2 - btnW / 2, topY, btnW, btnH), "⚔ PvP 선언"))
                    TogglePvP();
            }
            else
            {
                if (GUI.Button(new Rect(Screen.width / 2 - btnW - 5, topY, btnW, btnH), "🕊 평화 복귀"))
                    TogglePvP();

                if (GUI.Button(new Rect(Screen.width / 2 + 5, topY, btnW, btnH), "🏰 타워 건설 (-80G)"))
                    BuildTower();
            }

            if (GUI.Button(new Rect(Screen.width - 210, topY, 190, btnH), "🗡 용병 고용 (-150G)"))
                AddBot();

            // 카르마 표시
            if (players[myId].karma > 0)
            {
                string karmaStatus = players[myId].karma >= 200 ? "<color=red>⚠ 카오틱</color>" : "<color=yellow>카르마: " + players[myId].karma + "</color>";
                GUI.Label(new Rect(Screen.width / 2 - 80, topY + btnH + 5, 160, 25), karmaStatus);
            }
        }
    }

    private void DrawClassSelection(string title, bool isRespawn)
    {
        float boxW = 400, boxH = 380;
        float boxX = Screen.width / 2 - boxW / 2;
        float boxY = Screen.height / 2 - boxH / 2;

        GUI.Box(new Rect(boxX, boxY, boxW, boxH), title);

        float btnX = boxX + 50;
        float btnW = 300, btnH = 50;
        float startY = boxY + 50;

        if (GUI.Button(new Rect(btnX, startY, btnW, btnH), "⚡ 어쌔신 — 빠른 암살자"))
            SelectClass("Assassin", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 60, btnW, btnH), "⚔ 워리어 — 균형 전사"))
            SelectClass("Warrior", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 120, btnW, btnH), "🛡 나이트 — 철벽 탱커"))
            SelectClass("Knight", isRespawn);
        if (GUI.Button(new Rect(btnX, startY + 180, btnW, btnH), "🔥 메이지 — 광역 마법사"))
            SelectClass("Mage", isRespawn);
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

        bool isPvP = players[myId].team != "peace";

        if (joystick != null) joystick.gameObject.SetActive(isPvP);

        float h = 0f, v = 0f;

        if (isPvP)
        {
            h = joystick != null ? joystick.InputVector.x : 0f;
            v = joystick != null ? joystick.InputVector.y : 0f;
            if (h == 0 && v == 0) { h = Input.GetAxisRaw("Horizontal"); v = Input.GetAxisRaw("Vertical"); }
        }
        else
        {
            // 자동 사냥: 가장 가까운 몬스터로 이동
            Vector3 closestPos = Vector3.zero;
            float closestDist = float.MaxValue;

            foreach (var m in monsters.Values) {
                float dist = Vector3.Distance(players[myId].go.transform.position, m.targetPos);
                if (dist < closestDist) { closestDist = dist; closestPos = m.targetPos; }
            }

            if (closestDist != float.MaxValue && closestDist > 0.5f) {
                Vector3 dir = (closestPos - players[myId].go.transform.position).normalized;
                h = dir.x; v = dir.y;
            }
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

            // 클래스별 이동 스킬
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

            float angle = Mathf.Atan2(currentDir.y, currentDir.x) * Mathf.Rad2Deg - 90f;
            players[myId].go.transform.rotation = Quaternion.Euler(0, 0, angle);

            JObject moveData = new JObject();
            moveData["x"] = players[myId].go.transform.position.x;
            moveData["y"] = players[myId].go.transform.position.y;
            moveData["dirX"] = currentDir.x;
            moveData["dirY"] = currentDir.y;

            #if UNITY_WEBGL && !UNITY_EDITOR
            SocketEmit("move", moveData.ToString(Newtonsoft.Json.Formatting.None));
            #endif
        }
    }

    private void HandleAutoAttack()
    {
        if (!isMyPlayerAlive) return;

        if (myClassName == "Assassin") attackCooldown = 0.25f;
        else if (myClassName == "Warrior") attackCooldown = 0.35f;
        else if (myClassName == "Knight") attackCooldown = 0.7f;
        else if (myClassName == "Mage") attackCooldown = 1.2f;

        if (Time.time - lastAttackTime >= attackCooldown) {
            ThrowAxe();
            lastAttackTime = Time.time;
        }
    }

    private void InterpolateNetworkEntities()
    {
        foreach (var kvp in players) {
            if (kvp.Key == myId || !kvp.Value.isAlive) continue;
            if (kvp.Value.go != null)
                kvp.Value.go.transform.position = Vector3.Lerp(kvp.Value.go.transform.position, kvp.Value.targetPos, Time.deltaTime * 10f);
        }

        foreach (var kvp in monsters) {
            if (kvp.Value.go != null)
                kvp.Value.go.transform.position = Vector3.Lerp(kvp.Value.go.transform.position, kvp.Value.targetPos, Time.deltaTime * 5f);
        }

        foreach (var kvp in axes) {
            if (kvp.Value.go != null) {
                kvp.Value.go.transform.Rotate(0, 0, -1080f * Time.deltaTime);
                kvp.Value.go.transform.position += kvp.Value.dir * kvp.Value.speed * Time.deltaTime;
            }
        }
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

    // ==========================================
    // 서버 이벤트 핸들러
    // ==========================================

    public void OnInit(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        myId = (string)data["id"];
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

            // 데미지 텍스트 표시
            if (hitData["damage"] != null && players[pId].go != null) {
                int dmg = (int)hitData["damage"];
                bool isCrit = hitData["isCrit"] != null && (bool)hitData["isCrit"];
                ShowDamageText(players[pId].go.transform.position, dmg, isCrit);
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

            // 몬스터 데미지 텍스트
            if (mData["damage"] != null && monsters[mId].go != null) {
                ShowDamageText(monsters[mId].go.transform.position, (int)mData["damage"], false);
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
        var p = players[myId];

        string displayName = classDisplayNames.ContainsKey(p.className) ? classDisplayNames[p.className] : p.className;

        if (goldText != null) goldText.text = $"💰 {p.gold} Gold";
        if (hpText != null) hpText.text = $"HP: {Mathf.CeilToInt(p.hp)}/{Mathf.CeilToInt(p.maxHp)}";
        if (levelText != null) levelText.text = $"Lv.{p.level} {displayName}";

        if (teamText != null) {
            if (p.team == "peace")
                teamText.text = "<color=#88ff88>⚔ 자동 사냥 중</color>";
            else if (p.team.StartsWith("king_"))
                teamText.text = "<color=#ff4444>👑 왕 — PvP 활성</color>";
            else
                teamText.text = "<color=#ffaa44>⚔ PvP 전투 중</color>";
        }

        if (karmaText != null) {
            if (p.karma >= 200)
                karmaText.text = $"<color=#ff2222>☠ 카오틱 (카르마: {p.karma})</color>";
            else if (p.karma > 0)
                karmaText.text = $"<color=#ffaa00>⚠ 카르마: {p.karma}</color>";
            else
                karmaText.text = "<color=#88ff88>✦ 질서</color>";
        }
    }
}
