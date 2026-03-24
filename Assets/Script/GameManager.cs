using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using Newtonsoft.Json.Linq;
using TMPro;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    // Railway 프로덕션 URL 연결
    public string serverUrl = "https://baduk-marble-production.up.railway.app"; 

    [Header("UI 연결")]
    public TextMeshProUGUI timeText;
    public TextMeshProUGUI infoText;
    public VirtualJoystick virtualJoystick; // 조이스틱 연결 변수 추가

    private string mySocketId;
    private int myTeam = 0;

    [Header("프리팹 연결")]
    public GameObject tilePrefab;   
    public GameObject playerPrefab; 

    private GameObject[,] tiles = new GameObject[19, 19];
    private Dictionary<string, GameObject> playerObjects = new Dictionary<string, GameObject>();

    // 조이스틱 이동 쿨타임 (너무 빠른 연속 이동 방지)
    private float moveCooldown = 0.2f; 
    private float lastMoveTime = 0f;

    // SocketIOPlugin.jslib와 연결되는 외부 JS 함수들
    [DllImport("__Internal")]
    private static extern void InitSocketIO(string url);

    [DllImport("__Internal")]
    private static extern void EmitMove(int dx, int dy);

    void Start()
    {
        this.gameObject.name = "GameManager";
        InitializeBoard();

        #if UNITY_WEBGL && !UNITY_EDITOR
            InitSocketIO(serverUrl);
        #else
            Debug.LogWarning("WebGL 환경에서 빌드 후 테스트해주세요.");
            infoText.text = "WebGL 환경에서 접속해주세요!";
        #endif
    }

    void InitializeBoard()
    {
        for (int y = 0; y < 19; y++)
        {
            for (int x = 0; x < 19; x++)
            {
                Vector3 pos = new Vector3(x - 9f, y - 9f, 0);
                GameObject tile = Instantiate(tilePrefab, pos, Quaternion.identity);
                tiles[x, y] = tile;
            }
        }
    }

    public void OnUpdateState(string jsonString)
    {
        try 
        {
            JObject data = JObject.Parse(jsonString);

            if (data["myId"] != null) mySocketId = (string)data["myId"];

            if (data["time"] != null)
            {
                int timeRemaining = (int)data["time"];
                timeText.text = $"남은 시간: {timeRemaining / 60}:{timeRemaining % 60:D2}";
            }

            if (data["board"] != null)
            {
                JArray boardData = (JArray)data["board"];
                for (int y = 0; y < 19; y++)
                {
                    for (int x = 0; x < 19; x++)
                    {
                        int tileTeam = (int)boardData[y][x];
                        SpriteRenderer sr = tiles[x, y].GetComponent<SpriteRenderer>();
                        
                        if (tileTeam == 1) sr.color = Color.white;
                        else if (tileTeam == 2) sr.color = Color.black;
                        else sr.color = new Color(0.8f, 0.6f, 0.4f); // 중립 배경색
                    }
                }
            }

            if (data["team1Score"] != null && data["team2Score"] != null)
            {
                int t1Score = (int)data["team1Score"];
                int t2Score = (int)data["team2Score"];
                string teamName = (myTeam == 1) ? "백팀" : "흑팀";
                
                if (myTeam != 0)
                {
                    infoText.text = $"당신은 {teamName}입니다.\n현재 집 크기 - 백: {t1Score} vs 흑: {t2Score}";
                }
            }

            if (data["players"] != null)
            {
                JObject playersData = (JObject)data["players"];
                HashSet<string> activePlayers = new HashSet<string>();

                foreach (var p in playersData)
                {
                    string id = p.Key;
                    JObject pData = (JObject)p.Value;
                    
                    int pX = (int)pData["x"];
                    int pY = (int)pData["y"];
                    int team = (int)pData["team"];
                    
                    if (id == mySocketId)
                    {
                        myTeam = team;
                    }

                    activePlayers.Add(id);
                    Vector3 targetPos = new Vector3(pX - 9f, pY - 9f, -1);

                    if (!playerObjects.ContainsKey(id))
                    {
                        GameObject newPlayer = Instantiate(playerPrefab, targetPos, Quaternion.identity);
                        SpriteRenderer playerSr = newPlayer.GetComponent<SpriteRenderer>();
                        if (playerSr != null)
                        {
                            playerSr.color = (team == 1) ? Color.white : Color.black;
                        }
                        playerObjects.Add(id, newPlayer);
                    }
                    else
                    {
                        playerObjects[id].transform.position = targetPos;
                    }
                }

                List<string> toRemove = new List<string>();
                foreach (var key in playerObjects.Keys)
                {
                    if (!activePlayers.Contains(key))
                    {
                        Destroy(playerObjects[key]);
                        toRemove.Add(key);
                    }
                }
                foreach (var key in toRemove) playerObjects.Remove(key);
            }
        }
        catch (Exception e) { Debug.LogError("Update State Error: " + e.Message); }
    }

    public void OnGameOver(string jsonString)
    {
        try 
        {
            JObject data = JObject.Parse(jsonString);
            int winner = (int)data["winner"];
            int t1 = (int)data["team1Score"];
            int t2 = (int)data["team2Score"];
            string winnerName = (winner == 1) ? "백팀" : (winner == 2) ? "흑팀" : "무승부";
            infoText.text = $"게임 종료! {winnerName} 승리! (최종 백:{t1} 흑:{t2})";
        }
        catch (Exception e) { Debug.LogError("GameOver Error: " + e.Message); }
    }

    void Update()
    {
        // PC 키보드 입력
        if (Input.GetKeyDown(KeyCode.UpArrow)) TryMove(0, 1);
        else if (Input.GetKeyDown(KeyCode.DownArrow)) TryMove(0, -1);
        else if (Input.GetKeyDown(KeyCode.LeftArrow)) TryMove(-1, 0);
        else if (Input.GetKeyDown(KeyCode.RightArrow)) TryMove(1, 0);

        // 조이스틱 입력 처리
        if (virtualJoystick != null && virtualJoystick.InputVector.magnitude > 0.3f)
        {
            if (Time.time - lastMoveTime >= moveCooldown)
            {
                float absX = Mathf.Abs(virtualJoystick.InputVector.x);
                float absY = Mathf.Abs(virtualJoystick.InputVector.y);

                // 대각선 입력을 방지하고 상하좌우 중 더 많이 꺾은 방향으로 이동
                if (absX > absY)
                {
                    TryMove((virtualJoystick.InputVector.x > 0) ? 1 : -1, 0);
                }
                else
                {
                    TryMove(0, (virtualJoystick.InputVector.y > 0) ? 1 : -1);
                }
            }
        }
    }

    void TryMove(int dx, int dy)
    {
        lastMoveTime = Time.time;
        #if UNITY_WEBGL && !UNITY_EDITOR
            EmitMove(dx, dy);
        #endif
    }
}