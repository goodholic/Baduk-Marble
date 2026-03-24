using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;
using Newtonsoft.Json.Linq;
using TMPro;
using System.Runtime.InteropServices;

public class GameManager : MonoBehaviour
{
    // Railway에서 발급받은 Public URL
    public string serverUrl = "https://baduk-marble-production.up.railway.app"; 

    [Header("UI 연결 (장비창)")]
    public TextMeshProUGUI timeText;
    public TextMeshProUGUI goldText;
    public TextMeshProUGUI diceText;
    public TextMeshProUGUI infoText;

    private string mySocketId;
    private int myTeam = 0;
    private bool isBankrupt = false;
    private int remainingMoves = 0;

    [Header("프리팹 연결 (가방)")]
    public GameObject tilePrefab;   
    public GameObject playerPrefab; 

    private GameObject[,] tiles = new GameObject[19, 19];
    private Dictionary<string, GameObject> playerObjects = new Dictionary<string, GameObject>();

    // JavaScript 플러그인(SocketIO.jslib)과 연결하기 위한 DllImport 설정
    [DllImport("__Internal")]
    private static extern void InitSocketIO(string url);

    [DllImport("__Internal")]
    private static extern void EmitRollDice();

    [DllImport("__Internal")]
    private static extern void EmitMove(int dx, int dy);

    void Start()
    {
        // JSLIB의 SendMessage가 이 게임 오브젝트를 정확히 찾을 수 있도록 이름을 강제로 고정
        this.gameObject.name = "GameManager";

        InitializeBoard();

        // WebGL 빌드 환경에서만 JS 플러그인이 동작합니다.
        #if UNITY_WEBGL && !UNITY_EDITOR
            InitSocketIO(serverUrl);
        #else
            Debug.LogWarning("에디터 모드에서는 Socket 통신이 지원되지 않습니다. WebGL로 빌드해주세요.");
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

    // =========================================================================
    // JS 플러그인에서 호출되는 수신 함수들 (SendMessage를 통해 호출됨)
    // =========================================================================

    public void OnUpdateState(string jsonString)
    {
        try 
        {
            // 이제 에러를 일으키는 C# Socket 패키지가 없으므로, Newtonsoft로 순수하게 파싱합니다.
            JObject data = JObject.Parse(jsonString);

            if (data["myId"] != null)
            {
                mySocketId = (string)data["myId"];
            }

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
                        if (boardData.Count > y && boardData[y].Type == JTokenType.Array && ((JArray)boardData[y]).Count > x)
                        {
                            int tileTeam = (int)boardData[y][x];
                            SpriteRenderer sr = tiles[x, y].GetComponent<SpriteRenderer>();
                            
                            // 1: 백, 2: 흑, 0: 중립
                            if (tileTeam == 1) sr.color = Color.white;
                            else if (tileTeam == 2) sr.color = Color.black;
                            else sr.color = new Color(0.8f, 0.6f, 0.4f);
                        }
                    }
                }
            }

            if (data["players"] != null)
            {
                JObject playersData = (JObject)data["players"];
                List<string> activePlayers = new List<string>();

                foreach (var p in playersData)
                {
                    string id = p.Key;
                    JObject pData = (JObject)p.Value;
                    
                    if (pData["x"] == null || pData["y"] == null) continue;

                    int pX = (int)pData["x"];
                    int pY = (int)pData["y"];
                    int team = pData["team"] != null ? (int)pData["team"] : 0;
                    
                    if (id == mySocketId)
                    {
                        myTeam = team;
                        if (pData["gold"] != null)
                        {
                            int gold = (int)pData["gold"];
                            goldText.text = $"보유 골드: {gold}원";
                        }
                        if (pData["remainingMoves"] != null)
                        {
                            remainingMoves = (int)pData["remainingMoves"];
                            diceText.text = $"남은 이동: {remainingMoves}";
                        }
                    }

                    activePlayers.Add(id);
                    Vector3 targetPos = new Vector3(pX - 9f, pY - 9f, -1);

                    if (!playerObjects.ContainsKey(id))
                    {
                        if (playerPrefab != null)
                        {
                            GameObject newPlayer = Instantiate(playerPrefab, targetPos, Quaternion.identity);
                            SpriteRenderer playerSr = newPlayer.GetComponent<SpriteRenderer>();
                            if (playerSr != null)
                            {
                                playerSr.color = (team == 1) ? Color.white : Color.black;
                            }
                            playerObjects.Add(id, newPlayer);
                        }
                    }
                    else
                    {
                        playerObjects[id].transform.position = targetPos;
                    }
                }

                // 접속 종료된 플레이어 삭제
                List<string> toRemove = new List<string>();
                foreach (var key in playerObjects.Keys)
                {
                    if (!activePlayers.Contains(key))
                    {
                        Destroy(playerObjects[key]);
                        toRemove.Add(key);
                    }
                }
                foreach (var key in toRemove)
                {
                    playerObjects.Remove(key);
                }
            }
        }
        catch (Exception e)
        {
            Debug.LogError("OnUpdateState 파싱 에러: " + e.Message);
        }
    }

    public void OnDiceResult(string jsonString)
    {
        try 
        {
            JObject data = JObject.Parse(jsonString);
            if (data["value"] != null)
            {
                remainingMoves = (int)data["value"];
                diceText.text = "남은 이동 칸: " + remainingMoves;
                infoText.text = "십자 방향키로 캐릭터를 이동시키세요!";
            }
        }
        catch (Exception e)
        {
            Debug.LogError("OnDiceResult 파싱 에러: " + e.Message);
        }
    }

    public void OnBankruptNotify(string message)
    {
        isBankrupt = true;
        infoText.text = "앗! 파산했습니다... 관전 모드로 전환됩니다.";
    }

    public void OnGameOver(string jsonString)
    {
        try 
        {
            JObject data = JObject.Parse(jsonString);
            if (data["winner"] != null)
            {
                int winner = (int)data["winner"];
                string winnerTeam = winner == 1 ? "백(White)" : "흑(Black)";
                infoText.text = $"게임 종료! {winnerTeam} 팀 승리!";
            }
        }
        catch (Exception e)
        {
            Debug.LogError("OnGameOver 파싱 에러: " + e.Message);
        }
    }

    // =========================================================================

    void Update()
    {
        if (isBankrupt) return;

        // Space 또는 Enter(중간 버튼 역할)로 주사위 굴리기
        if ((Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)) && remainingMoves == 0)
        {
            #if UNITY_WEBGL && !UNITY_EDITOR
                EmitRollDice();
            #endif
        }

        // 주사위 굴린 후 이동 (십자 방향키)
        if (remainingMoves > 0)
        {
            if (Input.GetKeyDown(KeyCode.UpArrow)) TryMove(0, 1);
            else if (Input.GetKeyDown(KeyCode.DownArrow)) TryMove(0, -1);
            else if (Input.GetKeyDown(KeyCode.LeftArrow)) TryMove(-1, 0);
            else if (Input.GetKeyDown(KeyCode.RightArrow)) TryMove(1, 0);
        }
    }

    void TryMove(int dx, int dy)
    {
        #if UNITY_WEBGL && !UNITY_EDITOR
            EmitMove(dx, dy);
        #endif
    }
}