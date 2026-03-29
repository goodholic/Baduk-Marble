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
    
    [Header("UI 연결")]
    public TextMeshProUGUI scoreText;     
    public TextMeshProUGUI hpText;        
    public TextMeshProUGUI levelText;     
    public TextMeshProUGUI teamText;      
    public GameObject respawnPanel;       
    
    [Header("게임 오브젝트 & 프리팹")]
    public GameObject playerPrefab;       
    public GameObject axePrefab;          
    public GameObject monsterPrefab;      
    public GameObject aoePrefab;          
    public VirtualJoystick joystick;      

    [DllImport("__Internal")]
    private static extern void SocketConnect(string url);

    [DllImport("__Internal")]
    private static extern void SocketEmit(string eventName, string data);

    private class NetworkPlayer {
        public GameObject go;
        public Vector3 targetPos;
        public float hp;
        public float maxHp;
        public int score;
        public int level;
        public string className;
        public string team;
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
        public float hp;
    }

    private Dictionary<string, NetworkPlayer> players = new Dictionary<string, NetworkPlayer>();
    private Dictionary<int, NetworkAxe> axes = new Dictionary<int, NetworkAxe>();
    private Dictionary<int, GameObject> aoes = new Dictionary<int, GameObject>();
    private Dictionary<string, NetworkMonster> monsters = new Dictionary<string, NetworkMonster>();

    private string myId;
    public float baseMoveSpeed = 8f; 
    private float currentMoveSpeed = 8f;
    private bool isMyPlayerAlive = false;

    private Vector2 currentDir = new Vector2(0, 1);
    
    public float attackCooldown = 0.5f; 
    private float lastAttackTime = 0f;
    private string myClassName = "광전사"; 

    private string deviceId;
    private bool hasSelectedClass = false;
    private float moveSkillCooldown = 0f;
    private float boostSpeed = 0f;
    private float boostEndTime = 0f;

    // 미니 스크린용 배열
    private Camera[] miniCameras = new Camera[3];
    private RawImage[] miniScreens = new RawImage[3];
    private string[] miniTargets = new string[3];

    void Start()
    {
        deviceId = PlayerPrefs.GetString("DeviceId", "");
        if (string.IsNullOrEmpty(deviceId)) {
            deviceId = Guid.NewGuid().ToString();
            PlayerPrefs.SetString("DeviceId", deviceId);
            PlayerPrefs.Save();
        }

        if (respawnPanel != null)
            respawnPanel.SetActive(false);
        
        SetupMiniScreens(); // 작은 관전 스크린들 동적 생성

        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketConnect(serverUrl);
        #endif
    }

    private void SetupMiniScreens()
    {
        GameObject canvasObj = GameObject.Find("Canvas");
        if(canvasObj == null) return;

        for(int i = 0; i < 3; i++)
        {
            RenderTexture rt = new RenderTexture(256, 256, 16);
            
            // 미니 카메라 생성
            GameObject camObj = new GameObject("MiniCam_" + i);
            Camera cam = camObj.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.orthographic = true;
            cam.orthographicSize = 4f;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.1f, 0.1f, 0.1f);
            miniCameras[i] = cam;

            // 미니 스크린 (RawImage) 생성 및 우측 배치
            GameObject imgObj = new GameObject("MiniScreen_" + i);
            imgObj.transform.SetParent(canvasObj.transform, false);
            RawImage rawImage = imgObj.AddComponent<RawImage>();
            rawImage.texture = rt;
            
            RectTransform rect = imgObj.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(1, 1);
            rect.anchorMax = new Vector2(1, 1);
            rect.pivot = new Vector2(1, 1);
            rect.anchoredPosition = new Vector2(-20, -100 - (i * 180));
            rect.sizeDelta = new Vector2(150, 150);
            
            miniScreens[i] = rawImage;
        }
        
        InvokeRepeating("UpdateMiniCameraTargets", 2f, 5f); // 5초마다 관전 대상 변경
    }

    private void UpdateMiniCameraTargets()
    {
        List<string> validTargets = new List<string>();
        foreach(var kvp in players) {
            if(kvp.Key != myId && kvp.Value.isAlive) validTargets.Add(kvp.Key);
        }

        for(int i = 0; i < 3; i++) {
            if (validTargets.Count > 0) {
                int rnd = UnityEngine.Random.Range(0, validTargets.Count);
                miniTargets[i] = validTargets[rnd];
            } else {
                miniTargets[i] = null;
            }
        }
    }

    void OnGUI()
    {
        if (!hasSelectedClass)
        {
            DrawClassSelection("게임 시작 - 캐릭터 선택", false);
        }
        else if (myId != null && !isMyPlayerAlive)
        {
            DrawClassSelection("사망 - 새로운 캐릭터로 부활", true);
        }

        if (hasSelectedClass && isMyPlayerAlive && players.ContainsKey(myId))
        {
            if (players[myId].team == "peace")
            {
                if (GUI.Button(new Rect(Screen.width / 2 - 75, 20, 150, 40), "PvP 모드 켜기 (왕 되기)"))
                {
                    TogglePvP();
                }
            }
        }
    }

    private void DrawClassSelection(string title, bool isRespawn)
    {
        GUI.Box(new Rect(Screen.width / 2 - 150, Screen.height / 2 - 150, 300, 300), title);

        if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 100, 200, 40), "번개 (근접 암살자)")) SelectClass("번개", isRespawn);
        if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 - 40, 200, 40), "광전사 (원거리 전사)")) SelectClass("광전사", isRespawn);
        if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 + 20, 200, 40), "스톤 (방패병)")) SelectClass("스톤", isRespawn);
        if (GUI.Button(new Rect(Screen.width / 2 - 100, Screen.height / 2 + 80, 200, 40), "페인터 (광역 마법사)")) SelectClass("페인터", isRespawn);
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
        // 미니 카메라들이 할당된 타겟을 부드럽게 추적
        for(int i = 0; i < 3; i++) {
            if (miniTargets[i] != null && players.ContainsKey(miniTargets[i])) {
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

        // PvP 모드일때만 조이스틱 표시
        if (joystick != null)
        {
            joystick.gameObject.SetActive(isPvP);
        }

        float h = 0f;
        float v = 0f;

        if (isPvP)
        {
            // 수동 조작
            h = joystick != null ? joystick.InputVector.x : 0f;
            v = joystick != null ? joystick.InputVector.y : 0f;
            if (h == 0 && v == 0)
            {
                h = Input.GetAxisRaw("Horizontal");
                v = Input.GetAxisRaw("Vertical");
            }
        }
        else
        {
            // AutoBattle 로직: 가장 가까운 몬스터를 찾아 자동으로 이동
            Vector3 closestPos = Vector3.zero;
            float closestDist = float.MaxValue;

            foreach (var m in monsters.Values)
            {
                float dist = Vector3.Distance(players[myId].go.transform.position, m.targetPos);
                if (dist < closestDist)
                {
                    closestDist = dist;
                    closestPos = m.targetPos;
                }
            }

            if (closestDist != float.MaxValue && closestDist > 0.5f)
            {
                Vector3 dir = (closestPos - players[myId].go.transform.position).normalized;
                h = dir.x;
                v = dir.y;
            }
        }

        bool isMoving = (h != 0 || v != 0);

        if (isMoving)
        {
            currentDir = new Vector2(h, v).normalized;
            
            if (myClassName == "번개") currentMoveSpeed = 8f;
            else if (myClassName == "스톤") currentMoveSpeed = 7f;
            else if (myClassName == "광전사") currentMoveSpeed = 8f;
            else if (myClassName == "페인터") currentMoveSpeed = 6f;

            if (Time.time >= moveSkillCooldown)
            {
                if (myClassName == "번개")
                {
                    boostSpeed = 20f; 
                    boostEndTime = Time.time + 0.15f; 
                    moveSkillCooldown = Time.time + 0.4f; 
                }
                else if (myClassName == "스톤")
                {
                    boostSpeed = 12f; 
                    boostEndTime = Time.time + 0.3f; 
                    moveSkillCooldown = Time.time; 
                }
            }

            float finalSpeed = currentMoveSpeed;
            if (Time.time < boostEndTime) finalSpeed += boostSpeed;

            Vector3 movement = new Vector3(h, v, 0).normalized * finalSpeed * Time.deltaTime;
            players[myId].go.transform.position += movement;
            
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

        if(myClassName == "번개") attackCooldown = 0.3f; 
        else if(myClassName == "광전사") attackCooldown = 0.35f; 
        else if(myClassName == "스톤") attackCooldown = 0.7f; 
        else if(myClassName == "페인터") attackCooldown = 1.5f; 

        if (Time.time - lastAttackTime >= attackCooldown)
        {
            ThrowAxe();
            lastAttackTime = Time.time;
        }
    }

    private void InterpolateNetworkEntities()
    {
        foreach (var kvp in players)
        {
            if (kvp.Key == myId) continue; 
            if (!kvp.Value.isAlive) continue;

            GameObject pGo = kvp.Value.go;
            if (pGo != null)
                pGo.transform.position = Vector3.Lerp(pGo.transform.position, kvp.Value.targetPos, Time.deltaTime * 10f);
        }

        foreach (var kvp in monsters)
        {
            GameObject mGo = kvp.Value.go;
            if (mGo != null)
                mGo.transform.position = Vector3.Lerp(mGo.transform.position, kvp.Value.targetPos, Time.deltaTime * 5f);
        }

        foreach (var kvp in axes)
        {
            GameObject axeGo = kvp.Value.go;
            if (axeGo != null)
            {
                axeGo.transform.Rotate(0, 0, -1080f * Time.deltaTime); 
                axeGo.transform.position += kvp.Value.dir * kvp.Value.speed * Time.deltaTime;
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

    // ==========================================
    // JS 플러그인 이벤트 리스너들
    // ==========================================

    public void OnInit(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        myId = (string)data["id"];
        JObject playersData = (JObject)data["players"];
        JObject monstersData = (JObject)data["monsters"];

        foreach (var playerProp in playersData) SpawnPlayer(playerProp.Key, (JObject)playerProp.Value);
        foreach (var mProp in monstersData) SpawnMonster(mProp.Key, (JObject)mProp.Value);
    }

    public void OnPlayerJoin(string jsonStr)
    {
        JObject pData = JObject.Parse(jsonStr);
        SpawnPlayer((string)pData["id"], pData);
    }

    public void OnPlayerLeave(string pId)
    {
        if (players.ContainsKey(pId))
        {
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
            players[id].level = (int)data["level"];
            players[id].className = (string)data["className"];
            players[id].maxHp = (float)data["maxHp"];
            players[id].hp = (float)data["hp"];
            players[id].team = (string)data["team"];

            if(id == myId)
            {
                myClassName = players[id].className;
                UpdateMyUI();
            }
        }
    }

    public void OnSync(string jsonStr)
    {
        JObject syncData = JObject.Parse(jsonStr);
        JObject pData = (JObject)syncData["players"];
        JObject mData = (JObject)syncData["monsters"];

        foreach (var pProp in pData)
        {
            string pId = pProp.Key;
            JObject pObj = (JObject)pProp.Value;
            if (players.ContainsKey(pId))
            {
                players[pId].targetPos = new Vector3((float)pObj["x"], (float)pObj["y"], 0);
                players[pId].score = (int)pObj["score"];
                if (pId == myId && scoreText != null) scoreText.text = "점수: " + players[pId].score;
            }
        }

        foreach (var mProp in mData)
        {
            string mId = mProp.Key;
            JObject mObj = (JObject)mProp.Value;
            if (monsters.ContainsKey(mId))
            {
                monsters[mId].targetPos = new Vector3((float)mObj["x"], (float)mObj["y"], 0);
            }
        }
    }

    public void OnAxeSpawn(string jsonStr)
    {
        JObject aData = JObject.Parse(jsonStr);
        int axeId = (int)aData["id"];
        GameObject newAxe = Instantiate(axePrefab, new Vector3((float)aData["x"], (float)aData["y"], 0f), Quaternion.identity);
        
        NetworkAxe nAxe = new NetworkAxe();
        nAxe.go = newAxe;
        nAxe.dir = new Vector3((float)aData["dirX"], (float)aData["dirY"], 0).normalized;
        nAxe.speed = (float)aData["speed"];

        axes[axeId] = nAxe;
    }

    public void OnAxeDestroy(string axeIdStr)
    {
        int axeId = int.Parse(axeIdStr);
        if (axes.ContainsKey(axeId))
        {
            Destroy(axes[axeId].go);
            axes.Remove(axeId);
        }
    }

    public void OnAoeSpawn(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        int id = (int)data["id"];
        if(aoePrefab != null) {
            GameObject aoe = Instantiate(aoePrefab, new Vector3((float)data["x"], (float)data["y"], 0), Quaternion.identity);
            aoe.transform.localScale = new Vector3((float)data["radius"] * 2, (float)data["radius"] * 2, 1);
            aoes[id] = aoe;
        }
    }

    public void OnAoeDestroy(string idStr)
    {
        int id = int.Parse(idStr);
        if(aoes.ContainsKey(id)) {
            Destroy(aoes[id]);
            aoes.Remove(id);
        }
    }

    public void OnPlayerHit(string jsonStr)
    {
        JObject hitData = JObject.Parse(jsonStr);
        string pId = (string)hitData["id"];
        if (players.ContainsKey(pId))
        {
            players[pId].hp = (float)hitData["hp"];
            if (pId == myId) UpdateMyUI();
        }
    }

    public void OnPlayerDie(string jsonStr)
    {
        JObject dieData = JObject.Parse(jsonStr);
        string victimId = (string)dieData["victimId"];
        bool stolen = dieData["stolen"] != null ? (bool)dieData["stolen"] : false;

        if (players.ContainsKey(victimId))
        {
            players[victimId].isAlive = false;
            players[victimId].go.SetActive(false); 

            if (victimId == myId)
            {
                isMyPlayerAlive = false;
                if (hpText != null) 
                {
                    hpText.text = stolen ? "캐릭터를 왕에게 빼앗겼습니다!" : "HP: 0 (사망)";
                }
                
                if (respawnPanel != null) respawnPanel.SetActive(false); 
            }
        }
    }

    public void OnPlayerRespawn(string jsonStr)
    {
        JObject respawnData = JObject.Parse(jsonStr);
        string pId = (string)respawnData["id"];

        if (players.ContainsKey(pId))
        {
            players[pId].isAlive = true;
            players[pId].hp = (float)respawnData["hp"];
            Vector3 pos = new Vector3((float)respawnData["x"], (float)respawnData["y"], 0);
            players[pId].go.transform.position = pos;
            players[pId].targetPos = pos;
            players[pId].go.SetActive(true);

            if (pId == myId)
            {
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
        if(monsters.ContainsKey(mId)) {
            monsters[mId].hp = (float)mData["hp"];
        }
    }

    public void OnMonsterDie(string mId)
    {
        if(monsters.ContainsKey(mId)) {
            Destroy(monsters[mId].go);
            monsters.Remove(mId);
        }
    }

    private void SpawnPlayer(string id, JObject data)
    {
        if (players.ContainsKey(id)) return;

        bool alive = (bool)data["isAlive"];
        GameObject newPlayer = Instantiate(playerPrefab, new Vector3((float)data["x"], (float)data["y"], 0), Quaternion.identity);
        newPlayer.SetActive(alive);

        NetworkPlayer np = new NetworkPlayer();
        np.go = newPlayer;
        np.targetPos = newPlayer.transform.position;
        np.hp = (float)data["hp"];
        np.maxHp = (float)data["maxHp"];
        np.score = (int)data["score"];
        np.level = (int)data["level"];
        np.className = (string)data["className"];
        np.team = (string)data["team"];
        np.isAlive = alive;

        players[id] = np;

        if (id == myId)
        {
            isMyPlayerAlive = alive;
            myClassName = np.className;
            UpdateMyUI();
            
            if (!alive && respawnPanel != null) respawnPanel.SetActive(false);

            if (Camera.main != null)
            {
                CameraFollow camFollow = Camera.main.GetComponent<CameraFollow>();
                if (camFollow != null) camFollow.SetTarget(newPlayer.transform);
            }
        }
    }

    private void SpawnMonster(string id, JObject data)
    {
        if(monsters.ContainsKey(id) || monsterPrefab == null) return;

        GameObject mGo = Instantiate(monsterPrefab, new Vector3((float)data["x"], (float)data["y"], 0), Quaternion.identity);
        NetworkMonster nm = new NetworkMonster();
        nm.go = mGo;
        nm.targetPos = mGo.transform.position;
        nm.hp = (float)data["hp"];
        monsters[id] = nm;
    }

    private void UpdateMyUI()
    {
        if(!players.ContainsKey(myId)) return;
        var p = players[myId];

        if(hpText != null) hpText.text = $"HP: {p.hp}/{p.maxHp}";
        if(levelText != null) levelText.text = $"Lv.{p.level} {p.className}";
        
        if(teamText != null) {
            if(p.team == "peace") teamText.text = "<color=green>평화 모드 (자동 사냥 중)</color>";
            else if(p.team.StartsWith("king_")) teamText.text = "<color=red>왕 (PvP 활성화 됨)</color>";
            else teamText.text = "<color=orange>PvP 유저</color>";
        }
    }
}