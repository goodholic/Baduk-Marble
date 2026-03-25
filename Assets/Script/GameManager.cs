using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using Newtonsoft.Json.Linq;
using TMPro;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    // Railway 서버 URL
    public string serverUrl = "https://baduk-marble-production.up.railway.app";
    
    [Header("UI 연결")]
    public TextMeshProUGUI scoreText;     // 자신의 점수 UI
    public TextMeshProUGUI hpText;        // 자신의 체력 UI
    public GameObject respawnPanel;       // 사망 시 나타날 부활 패널
    
    [Header("게임 오브젝트 & 프리팹")]
    public GameObject playerPrefab;       // 플레이어 프리팹
    public GameObject axePrefab;          // 날아가는 도끼 프리팹
    public VirtualJoystick joystick;      // 조이스틱 컴포넌트

    // JSLib(WebGL) 통신용
    [DllImport("__Internal")]
    private static extern void SocketConnect(string url);

    [DllImport("__Internal")]
    private static extern void SocketEmit(string eventName, string data);

    // 내부 네트워크 데이터 구조체
    private class NetworkPlayer {
        public GameObject go;
        public Vector3 targetPos;
        public float hp;
        public int score;
        public bool isAlive;
    }

    private class NetworkAxe {
        public GameObject go;
        public Vector3 targetPos;
    }

    private Dictionary<string, NetworkPlayer> players = new Dictionary<string, NetworkPlayer>();
    private Dictionary<int, NetworkAxe> axes = new Dictionary<int, NetworkAxe>();

    private string myId;
    public float moveSpeed = 8f;
    private bool isMyPlayerAlive = false;

    // 플레이어의 현재 이동/바라보는 방향
    private Vector2 currentDir = new Vector2(0, 1);

    // 자동 공격 쿨다운 관련
    public float attackCooldown = 0.5f; // 0.5초마다 자동 공격 (원하는 시간으로 조절 가능)
    private float lastAttackTime = 0f;

    void Start()
    {
        if (respawnPanel != null)
            respawnPanel.SetActive(false);
            
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketConnect(serverUrl);
        #endif
    }

    void Update()
    {
        HandleLocalInput();
        InterpolateNetworkEntities();
        HandleAutoAttack(); // 매 프레임 자동 공격 판정
    }

    private void HandleLocalInput()
    {
        if (string.IsNullOrEmpty(myId) || !players.ContainsKey(myId) || !isMyPlayerAlive)
            return;

        // 조이스틱 입력 (VirtualJoystick의 InputVector 사용)
        float h = joystick != null ? joystick.InputVector.x : 0f;
        float v = joystick != null ? joystick.InputVector.y : 0f;

        // 조이스틱 입력이 없으면 키보드 입력 체크
        if (h == 0 && v == 0)
        {
            h = Input.GetAxisRaw("Horizontal");
            v = Input.GetAxisRaw("Vertical");
        }

        if (h != 0 || v != 0)
        {
            currentDir = new Vector2(h, v).normalized;
            
            // 로컬 이동 즉시 적용 (반응성을 위해 클라이언트 선이동 처리)
            Vector3 movement = new Vector3(h, 0, v).normalized * moveSpeed * Time.deltaTime;
            players[myId].go.transform.position += movement;
            
            // 캐릭터 회전 (진행 방향 응시)
            players[myId].go.transform.rotation = Quaternion.LookRotation(new Vector3(currentDir.x, 0, currentDir.y));

            // 서버로 지속적인 좌표 및 방향 전송
            JObject moveData = new JObject();
            moveData["x"] = players[myId].go.transform.position.x;
            moveData["y"] = players[myId].go.transform.position.z; // Unity Z축 = 2D의 Y축
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

        // 마지막 공격 이후 쿨다운 시간이 지났는지 확인
        if (Time.time - lastAttackTime >= attackCooldown)
        {
            ThrowAxe();
            lastAttackTime = Time.time;
        }
    }

    private void InterpolateNetworkEntities()
    {
        // 1. 타 플레이어의 위치를 부드럽게 보간(Lerp)하여 이동
        foreach (var kvp in players)
        {
            if (kvp.Key == myId) continue; // 나 자신은 위에서 직접 제어
            if (!kvp.Value.isAlive) continue;

            GameObject pGo = kvp.Value.go;
            if (pGo != null)
            {
                pGo.transform.position = Vector3.Lerp(pGo.transform.position, kvp.Value.targetPos, Time.deltaTime * 10f);
            }
        }

        // 2. 맵에 생성된 도끼들의 비행 궤적 및 회전 보간
        foreach (var kvp in axes)
        {
            GameObject axeGo = kvp.Value.go;
            if (axeGo != null)
            {
                axeGo.transform.Rotate(0, 1080f * Time.deltaTime, 0); // 날아갈 때 회전 효과
                axeGo.transform.position = Vector3.Lerp(axeGo.transform.position, kvp.Value.targetPos, Time.deltaTime * 15f);
            }
        }
    }

    // 도끼 던지기 (서버에 투척 이벤트 전송)
    public void ThrowAxe()
    {
        if (!isMyPlayerAlive) return;

        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("throw", "{}");
        #endif
    }

    // 부활 요청 (부활 패널의 버튼 OnClick에 연결하세요)
    public void Respawn()
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit("respawn", "{}");
        #endif
        if (respawnPanel != null)
            respawnPanel.SetActive(false);
    }

    // ==========================================
    // JS 플러그인에서 호출받는 서버 이벤트 리스너들
    // ==========================================

    public void OnInit(string jsonStr)
    {
        JObject data = JObject.Parse(jsonStr);
        myId = (string)data["id"];
        JObject playersData = (JObject)data["players"];

        foreach (var playerProp in playersData)
        {
            string pId = playerProp.Key;
            JObject pData = (JObject)playerProp.Value;
            SpawnPlayer(pId, pData);
        }
    }

    public void OnPlayerJoin(string jsonStr)
    {
        JObject pData = JObject.Parse(jsonStr);
        string pId = (string)pData["id"];
        SpawnPlayer(pId, pData);
    }

    public void OnPlayerLeave(string pId)
    {
        if (players.ContainsKey(pId))
        {
            Destroy(players[pId].go);
            players.Remove(pId);
        }
    }

    public void OnSync(string jsonStr)
    {
        JObject playersData = JObject.Parse(jsonStr);
        foreach (var playerProp in playersData)
        {
            string pId = playerProp.Key;
            JObject pData = (JObject)playerProp.Value;

            if (players.ContainsKey(pId))
            {
                float sx = (float)pData["x"];
                float sy = (float)pData["y"];
                int sScore = (int)pData["score"];
                
                players[pId].targetPos = new Vector3(sx, 0, sy);
                players[pId].score = sScore;

                if (pId == myId && scoreText != null)
                {
                    scoreText.text = "점수: " + sScore.ToString();
                }
            }
        }
    }

    public void OnAxeSpawn(string jsonStr)
    {
        JObject aData = JObject.Parse(jsonStr);
        int axeId = (int)aData["id"];
        float ax = (float)aData["x"];
        float ay = (float)aData["y"];

        // 도끼를 생성하고 y축은 1f(캐릭터 가슴 높이 정도)로 고정
        GameObject newAxe = Instantiate(axePrefab, new Vector3(ax, 1f, ay), Quaternion.identity);
        
        NetworkAxe nAxe = new NetworkAxe();
        nAxe.go = newAxe;
        nAxe.targetPos = newAxe.transform.position;

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

    public void OnPlayerHit(string jsonStr)
    {
        JObject hitData = JObject.Parse(jsonStr);
        string pId = (string)hitData["id"];
        float currentHp = (float)hitData["hp"];

        if (players.ContainsKey(pId))
        {
            players[pId].hp = currentHp;
            
            if (pId == myId && hpText != null)
            {
                hpText.text = "HP: " + currentHp;
            }
        }
    }

    public void OnPlayerDie(string jsonStr)
    {
        JObject dieData = JObject.Parse(jsonStr);
        string victimId = (string)dieData["victimId"];

        if (players.ContainsKey(victimId))
        {
            players[victimId].isAlive = false;
            players[victimId].go.SetActive(false); 

            // 내가 죽었을 때 처리
            if (victimId == myId)
            {
                isMyPlayerAlive = false;
                if (hpText != null) hpText.text = "HP: 0";
                if (respawnPanel != null) respawnPanel.SetActive(true); 
            }
        }
    }

    public void OnPlayerRespawn(string jsonStr)
    {
        JObject respawnData = JObject.Parse(jsonStr);
        string pId = (string)respawnData["id"];

        if (players.ContainsKey(pId))
        {
            float rx = (float)respawnData["x"];
            float ry = (float)respawnData["y"];

            players[pId].isAlive = true;
            players[pId].hp = 100;
            players[pId].go.transform.position = new Vector3(rx, 0, ry);
            players[pId].targetPos = new Vector3(rx, 0, ry);
            players[pId].go.SetActive(true);

            if (pId == myId)
            {
                isMyPlayerAlive = true;
                if (hpText != null) hpText.text = "HP: 100";
            }
        }
    }

    private void SpawnPlayer(string id, JObject data)
    {
        if (players.ContainsKey(id)) return;

        float startX = (float)data["x"];
        float startY = (float)data["y"];
        bool alive = (bool)data["isAlive"];

        GameObject newPlayer = Instantiate(playerPrefab, new Vector3(startX, 0, startY), Quaternion.identity);
        newPlayer.SetActive(alive);

        NetworkPlayer np = new NetworkPlayer();
        np.go = newPlayer;
        np.targetPos = newPlayer.transform.position;
        np.hp = (float)data["hp"];
        np.score = (int)data["score"];
        np.isAlive = alive;

        players[id] = np;

        // 자신일 경우 초기 UI 세팅 및 카메라 타겟 설정
        if (id == myId)
        {
            isMyPlayerAlive = alive;
            if (hpText != null) hpText.text = "HP: " + np.hp;
            if (scoreText != null) scoreText.text = "점수: " + np.score;
            
            if (!alive && respawnPanel != null) {
                respawnPanel.SetActive(true);
            }

            // [추가된 부분] 메인 카메라에 부착된 CameraFollow 스크립트를 찾아 내 캐릭터를 따라가도록 타겟 설정
            if (Camera.main != null)
            {
                CameraFollow camFollow = Camera.main.GetComponent<CameraFollow>();
                if (camFollow != null)
                {
                    camFollow.SetTarget(newPlayer.transform);
                }
            }
        }
    }
}