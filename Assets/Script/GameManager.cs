using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using SocketIOClient;
using System;
using Newtonsoft.Json.Linq;
using TMPro;

public class GameManager : MonoBehaviour
{
    private SocketIOUnity socket;
    
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

    void Start()
    {
        // 백그라운드 스레드 에러 방지를 위해 메인 스레드에서 미리 디스패처를 초기화합니다.
        UnityMainThreadDispatcher.Instance();

        InitializeBoard();
        ConnectToServer();
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

    void ConnectToServer()
    {
        var uri = new Uri(serverUrl);
        socket = new SocketIOUnity(uri, new SocketIOOptions
        {
            // WebGL 빌드 시 System.Net.WebSockets 미지원 문제를 피하기 위해 Polling 사용
            Transport = SocketIOClient.Transport.TransportProtocol.Polling
        });

        socket.OnConnected += (sender, e) =>
        {
            Debug.Log("서버에 성공적으로 연결되었습니다!");
        };

        socket.On("update_state", response =>
        {
            try 
            {
                JObject data = ParseResponseData(response);
                if (data != null)
                {
                    UnityMainThreadDispatcher.Instance().Enqueue(() =>
                    {
                        UpdateGameState(data);
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("update_state 파싱 에러: " + ex.Message);
            }
        });

        socket.On("dice_result", response =>
        {
            try 
            {
                JObject data = ParseResponseData(response);
                if (data != null)
                {
                    UnityMainThreadDispatcher.Instance().Enqueue(() =>
                    {
                        if (data["value"] != null)
                        {
                            remainingMoves = (int)data["value"];
                            diceText.text = "남은 이동 칸: " + remainingMoves;
                            infoText.text = "십자 방향키로 캐릭터를 이동시키세요!";
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("dice_result 에러: " + ex.Message);
            }
        });

        socket.On("bankrupt_notify", response =>
        {
            UnityMainThreadDispatcher.Instance().Enqueue(() =>
            {
                isBankrupt = true;
                infoText.text = "앗! 파산했습니다... 관전 모드로 전환됩니다.";
            });
        });

        socket.On("game_over", response =>
        {
            try 
            {
                JObject data = ParseResponseData(response);
                if (data != null)
                {
                    UnityMainThreadDispatcher.Instance().Enqueue(() =>
                    {
                        if (data["winner"] != null)
                        {
                            int winner = (int)data["winner"];
                            string winnerTeam = winner == 1 ? "백(White)" : "흑(Black)";
                            infoText.text = $"게임 종료! {winnerTeam} 팀 승리!";
                        }
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.LogError("game_over 에러: " + ex.Message);
            }
        });

        socket.Connect();
    }

    private JObject ParseResponseData(SocketIOResponse response)
    {
        try
        {
            // SocketIOClient 내부 직렬화 모듈을 완전히 우회하기 위해 바로 문자열로 추출합니다.
            string rawResponse = response.ToString();
            
            if (!string.IsNullOrEmpty(rawResponse))
            {
                JArray jsonArray = JArray.Parse(rawResponse);
                
                if (jsonArray.Count > 0)
                {
                    if (jsonArray[0].Type == JTokenType.String)
                    {
                        return JObject.Parse(jsonArray[0].ToString());
                    }
                    else if (jsonArray[0].Type == JTokenType.Object)
                    {
                        return (JObject)jsonArray[0];
                    }
                }
            }
            return null;
        }
        catch (Exception ex)
        {
            Debug.LogError("JSON 파싱 중 상세 에러: " + ex.Message + " | 원본 텍스트: " + response.ToString());
            return null;
        }
    }

    void UpdateGameState(JObject data)
    {
        try 
        {
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
                            else sr.color = new Color(0.8f, 0.6f, 0.4f); // 기본 나무판자 색상
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
            Debug.LogError("UpdateGameState 실행 중 에러: " + e.Message);
        }
    }

    void Update()
    {
        if (isBankrupt) return;

        // Space 또는 Enter(중간 버튼 역할)로 주사위 굴리기
        if ((Input.GetKeyDown(KeyCode.Space) || Input.GetKeyDown(KeyCode.Return)) && remainingMoves == 0)
        {
            socket.Emit("roll_dice");
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
        // Dictionary를 지우고, 확실하게 IL2CPP 직렬화 에러를 피하기 위해 JSON 문자열을 조립해 전송합니다.
        string moveJson = $"{{\"dx\":{dx},\"dy\":{dy}}}";
        socket.Emit("move", moveJson);
    }

    void OnDestroy()
    {
        if (socket != null)
        {
            socket.Disconnect();
        }
    }
}