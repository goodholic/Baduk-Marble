using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Newtonsoft.Json.Linq;
using System.Runtime.InteropServices;

/// <summary>
/// SLG 용병 시스템 매니저 — v4.2
/// 용병 고용소, 친밀도, 콜로세움, 스토리, 도감, 로그라이크 던전 Unity 연동
/// </summary>
public class SLGManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SocketEmit(string eventName, string data);

    [Header("SLG UI Panels")]
    public GameObject slgPanel;          // SLG 전체 패널
    public GameObject hirePanel;         // 고용소 패널
    public GameObject bondPanel;         // 친밀도 패널
    public GameObject colosseumPanel;    // 콜로세움 패널
    public GameObject storyPanel;        // 스토리 패널
    public GameObject roguelikePanel;    // 로그라이크 패널

    [Header("UI Elements")]
    public Transform hireListContent;    // 고용소 라인업 스크롤
    public Transform mercListContent;    // 용병 목록 스크롤
    public Transform storyListContent;   // 스토리 목록
    public TextMeshProUGUI toastText;    // 토스트 메시지

    [Header("Prefabs")]
    public GameObject mercCardPrefab;    // 용병 카드 UI 프리팹
    public GameObject storyCardPrefab;   // 스토리 카드 프리팹

    // 내부 데이터
    private List<JObject> currentLineup = new List<JObject>();
    private JObject currentBondInfo;
    private JArray colosseumRanking;
    private bool isRoguelikeActive = false;
    private int roguelikeFloor = 0;

    void Start()
    {
        // 초기 상태: 모든 패널 숨김
        if (slgPanel) slgPanel.SetActive(false);
    }

    // ═══ 공통 유틸 ═══
    private void Emit(string eventName, string jsonData = "{}")
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit(eventName, jsonData);
#else
        Debug.Log($"[SLG] Emit: {eventName} → {jsonData}");
#endif
    }

    private void ShowToast(string msg, float duration = 3f)
    {
        if (toastText == null) return;
        toastText.text = msg;
        toastText.gameObject.SetActive(true);
        CancelInvoke(nameof(HideToast));
        Invoke(nameof(HideToast), duration);
    }

    private void HideToast()
    {
        if (toastText) toastText.gameObject.SetActive(false);
    }

    // ═══ SLG 모드 전환 ═══
    public void OpenSLGMode()
    {
        if (slgPanel) slgPanel.SetActive(true);
        Emit("merc_status");
    }

    public void CloseSLGMode()
    {
        if (slgPanel) slgPanel.SetActive(false);
    }

    // ═══ 용병 고용소 ═══
    public void OpenHireMarket(string marketId)
    {
        if (hirePanel) hirePanel.SetActive(true);
        Emit("hire_market_browse", $"{{\"marketId\":\"{marketId}\"}}");
    }

    public void OnHireMarketLineup(string jsonStr)
    {
        var data = JObject.Parse(jsonStr);
        var lineup = (JArray)data["lineup"];
        currentLineup.Clear();

        if (hireListContent == null) return;
        // 기존 카드 제거
        foreach (Transform child in hireListContent) Destroy(child.gameObject);

        if (lineup == null || lineup.Count == 0)
        {
            ShowToast("현재 고용 가능한 용병이 없습니다");
            return;
        }

        foreach (var merc in lineup)
        {
            currentLineup.Add((JObject)merc);
            if (mercCardPrefab != null)
            {
                var card = Instantiate(mercCardPrefab, hireListContent);
                var nameText = card.GetComponentInChildren<TextMeshProUGUI>();
                if (nameText != null)
                {
                    int star = merc["star"]?.Value<int>() ?? 1;
                    string stars = new string('★', star);
                    nameText.text = $"{stars} 용병\n{merc["cost"]}G";
                    nameText.color = GetStarColor(star);
                }
                // 고용 버튼
                var btn = card.GetComponentInChildren<Button>();
                if (btn != null)
                {
                    string mercId = merc["id"]?.ToString();
                    string marketId = data["marketId"]?.ToString();
                    btn.onClick.AddListener(() => HireMercenary(marketId, mercId));
                }
            }
        }
    }

    public void HireMercenary(string marketId, string mercId)
    {
        Emit("hire_mercenary", $"{{\"marketId\":\"{marketId}\",\"mercId\":\"{mercId}\"}}");
    }

    public void OnHireResult(string jsonStr)
    {
        var data = JObject.Parse(jsonStr);
        bool success = data["success"]?.Value<bool>() ?? false;
        ShowToast(success ? "새 용병 합류!" : "고용 실패: " + (data["reason"]?.ToString() ?? ""));
    }

    // ═══ 용병 친밀도 ═══
    public void OpenBondPanel(string mercId)
    {
        if (bondPanel) bondPanel.SetActive(true);
        Emit("bond_info", $"{{\"mercId\":\"{mercId}\"}}");
    }

    public void OnBondInfo(string jsonStr)
    {
        currentBondInfo = JObject.Parse(jsonStr);
        // UI 업데이트는 프리팹에 따라 구현
        Debug.Log($"[SLG] Bond: {currentBondInfo["stage"]} ({currentBondInfo["bond"]}/1000)");
    }

    public void BondTalk(string mercId)
    {
        Emit("bond_talk", $"{{\"mercId\":\"{mercId}\"}}");
    }

    public void OnBondTalkResult(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        bool ok = d["success"]?.Value<bool>() ?? false;
        ShowToast(ok ? $"대화 성공! 친밀도 +{d["gain"]} ({d["stage"]})" : "쿨타임 중...");
    }

    // ═══ 콜로세움 ═══
    public void OpenColosseum()
    {
        if (colosseumPanel) colosseumPanel.SetActive(true);
        Emit("colosseum_modes");
    }

    public void ColosseumQueue(string mode, string mercIdsJson)
    {
        Emit("colosseum_queue", $"{{\"mode\":\"{mode}\",\"mercIds\":{mercIdsJson}}}");
    }

    public void OnColosseumModes(string jsonStr)
    {
        Debug.Log("[SLG] Colosseum modes loaded");
    }

    public void OnColosseumResult(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        string perspective = d["perspective"]?.ToString();
        string winner = d["winnerId"]?.ToString();
        bool won = winner == perspective;
        ShowToast(won ? $"승리! {d["score"]}" : $"패배... {d["score"]}", 5f);
    }

    public void OnColosseumRanking(string jsonStr)
    {
        colosseumRanking = JArray.Parse(jsonStr);
        Debug.Log($"[SLG] Colosseum ranking: {colosseumRanking.Count} entries");
    }

    // ═══ 용병 스토리 ═══
    public void OpenStoryPanel()
    {
        if (storyPanel) storyPanel.SetActive(true);
        Emit("merc_story_list");
    }

    public void OnMercStoryList(string jsonStr)
    {
        var stories = JArray.Parse(jsonStr);
        if (storyListContent == null) return;
        foreach (Transform child in storyListContent) Destroy(child.gameObject);

        foreach (var s in stories)
        {
            if (storyCardPrefab != null)
            {
                var card = Instantiate(storyCardPrefab, storyListContent);
                var text = card.GetComponentInChildren<TextMeshProUGUI>();
                if (text != null)
                {
                    bool completed = s["completed"]?.Value<bool>() ?? false;
                    text.text = $"{s["mercName"]} [{s["currentEpisode"]}/{s["totalEpisodes"]}] {(completed ? "완료" : "")}";
                    text.color = completed ? Color.green : Color.white;
                }
            }
        }
    }

    public void OnMercStoryEpisode(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        var ep = d["episode"];
        string title = ep?["title"]?.ToString() ?? "에피소드";
        ShowToast($"EP{d["episodeNum"]}: {title}", 5f);
        // TODO: 풀 스토리 UI (대화창, 선택지 버튼)
    }

    public void PlayStoryEpisode(string mercId)
    {
        Emit("merc_story_play", $"{{\"mercId\":\"{mercId}\"}}");
    }

    public void StoryChoice(string mercId, int choiceIndex)
    {
        Emit("merc_story_choice", $"{{\"mercId\":\"{mercId}\",\"choiceIndex\":{choiceIndex}}}");
    }

    public void OnMercActiveBonds(string jsonStr) { Debug.Log("[SLG] Active bonds loaded"); }
    public void OnMercCodexStatus(string jsonStr) { Debug.Log("[SLG] Codex status loaded"); }

    // ═══ 로그라이크 던전 ═══
    public void StartRoguelike(string mercIdsJson)
    {
        Emit("roguelike_start", $"{{\"mercIds\":{mercIdsJson}}}");
        isRoguelikeActive = true;
        if (roguelikePanel) roguelikePanel.SetActive(true);
    }

    public void RoguelikeAdvance()
    {
        Emit("roguelike_advance");
    }

    public void RoguelikeRetreat()
    {
        Emit("roguelike_retreat");
    }

    public void OnRoguelikeFloor(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        roguelikeFloor = d["floor"]?.Value<int>() ?? 0;
        string type = d["type"]?.ToString() ?? "?";
        string label = d["label"]?.ToString() ?? "?";
        string result = d["result"]?.ToString() ?? "";

        ShowToast($"{roguelikeFloor}층 — {label} {(result == "victory" ? "승리!" : result == "defeat" ? "전멸..." : "")}", 4f);

        if (result == "defeat")
        {
            isRoguelikeActive = false;
        }
    }

    public void OnRoguelikeEnd(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        isRoguelikeActive = false;
        ShowToast($"던전 종료! {d["floor"]}층 도달, +{d["goldEarned"]}G", 5f);
        if (roguelikePanel) roguelikePanel.SetActive(false);
    }

    // ═══ 유틸리티 ═══
    private Color GetStarColor(int star)
    {
        switch (star)
        {
            case 1: return new Color(0.67f, 0.67f, 0.67f);
            case 2: return new Color(0.27f, 1f, 0.27f);
            case 3: return new Color(0.27f, 0.53f, 1f);
            case 4: return new Color(0.8f, 0.27f, 1f);
            case 5: return new Color(1f, 0.84f, 0f);
            default: return Color.white;
        }
    }
}
