using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Newtonsoft.Json.Linq;
using System.Runtime.InteropServices;

/// <summary>
/// 공성전 + 카라반 + 서버 대전쟁 매니저 — v4.2
/// </summary>
public class SiegeManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void SocketEmit(string eventName, string data);

    [Header("Siege UI")]
    public GameObject siegePanel;
    public Slider throneHPBar;
    public Slider moraleBar;
    public TextMeshProUGUI siegePhaseText;
    public TextMeshProUGUI siegeLogText;

    [Header("Caravan UI")]
    public GameObject caravanPanel;
    public Slider caravanProgressBar;
    public TextMeshProUGUI caravanStatusText;

    [Header("War UI")]
    public GameObject warPanel;
    public TextMeshProUGUI warStatusText;

    [Header("Toast")]
    public TextMeshProUGUI toastText;

    // 공성전 상태
    private bool isSiegeActive = false;
    private float throneHP = 10000f;
    private float throneMaxHP = 10000f;
    private float morale = 50f;
    private string currentPhase = "";

    // 카라반 상태
    private Dictionary<string, float> caravanPositions = new Dictionary<string, float>();

    void Start()
    {
        if (siegePanel) siegePanel.SetActive(false);
        if (caravanPanel) caravanPanel.SetActive(false);
        if (warPanel) warPanel.SetActive(false);
    }

    private void Emit(string evt, string json = "{}")
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        SocketEmit(evt, json);
#else
        Debug.Log($"[Siege] Emit: {evt} → {json}");
#endif
    }

    private void ShowToast(string msg, float dur = 3f)
    {
        if (!toastText) return;
        toastText.text = msg;
        toastText.gameObject.SetActive(true);
        CancelInvoke(nameof(HideToast));
        Invoke(nameof(HideToast), dur);
    }
    private void HideToast() { if (toastText) toastText.gameObject.SetActive(false); }

    // ═══ 공성전 ═══
    public void OpenSiegePanel()
    {
        if (siegePanel) siegePanel.SetActive(true);
        Emit("siege_castle_info");
    }

    public void DeclareWar(string targetClanId)
    {
        Emit("siege_declare_war", $"{{\"targetClanId\":\"{targetClanId}\"}}");
    }

    public void UpgradeTrap(string trapType)
    {
        Emit("siege_upgrade_trap", $"{{\"trapType\":\"{trapType}\"}}");
    }

    public void ExecuteCommand(string skillId, string siegeRoomId = "")
    {
        Emit("siege_commander_skill", $"{{\"skillId\":\"{skillId}\",\"siegeRoomId\":\"{siegeRoomId}\"}}");
    }

    public void OnSiegeCastleInfo(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        morale = d["morale"]?.Value<float>() ?? 50f;
        if (moraleBar) { moraleBar.value = morale / 100f; }
        Debug.Log($"[Siege] Castle info: morale={morale}");
    }

    public void OnSiegeTrapUpgraded(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"{d["trapType"]} 함정 Lv.{d["level"]} 업그레이드!");
    }

    public void OnSiegeBattleStart(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        isSiegeActive = true;
        throneHP = throneMaxHP = 10000f;
        currentPhase = "출정";
        if (siegePhaseText) siegePhaseText.text = $"공성전 시작! {d["attacker"]} vs {d["defender"]}";
        ShowToast("공성전 시작!", 5f);
        // TODO: 카메라 전환, BGM 변경
    }

    public void OnSiegePhaseChange(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        currentPhase = d["name"]?.ToString() ?? "";
        if (siegePhaseText) siegePhaseText.text = $"Phase: {currentPhase}";
        ShowToast($"단계 전환: {currentPhase}");
        // TODO: 페이즈별 카메라 연출, BGM 전환
    }

    public void OnSiegeThroneUpdate(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        throneHP = d["throneHP"]?.Value<float>() ?? 0f;
        if (throneHPBar) throneHPBar.value = throneHP / throneMaxHP;

        // 왕좌 위기 연출
        if (throneHP < throneMaxHP * 0.3f)
        {
            if (siegePhaseText) siegePhaseText.color = Color.red;
            // TODO: 화면 빨간 테두리, 심장박동 SFX
        }
    }

    public void OnSiegeSkillExecuted(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"지휘 명령: {d["skillId"]}");
        morale = d["morale"]?.Value<float>() ?? morale;
        if (moraleBar) moraleBar.value = morale / 100f;
        // TODO: 스킬별 시각 이펙트 (화살비 파티클, 마법 폭격 등)
    }

    public void OnSiegeMoraleUpdate(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        morale = d["morale"]?.Value<float>() ?? morale;
        if (moraleBar) moraleBar.value = morale / 100f;
    }

    public void OnSiegeBattleEnd(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        isSiegeActive = false;
        string winner = d["winnerClan"]?.ToString() ?? "?";
        ShowToast($"공성전 종료! {winner} 승리!", 8f);
        if (siegePhaseText) siegePhaseText.text = $"{winner} 승리!";
        // TODO: 승리/패배 연출, 팡파레
    }

    // ═══ 카라반 ═══
    public void OpenCaravanPanel()
    {
        if (caravanPanel) caravanPanel.SetActive(true);
        Emit("caravan_list");
    }

    public void StartCaravan(string routeId, int investment, string mercIdsJson)
    {
        Emit("caravan_start", $"{{\"routeId\":\"{routeId}\",\"investment\":{investment},\"mercIds\":{mercIdsJson}}}");
    }

    public void RaidCaravan(string caravanId, string mercIdsJson)
    {
        Emit("caravan_raid", $"{{\"caravanId\":\"{caravanId}\",\"mercIds\":{mercIdsJson}}}");
    }

    public void OnCaravanStarted(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"카라반 출발! 루트: {d["route"]}");
    }

    public void OnCaravanPosition(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        string id = d["caravanId"]?.ToString() ?? "";
        float progress = d["progress"]?.Value<float>() ?? 0f;
        caravanPositions[id] = progress;

        // 내 카라반이면 UI 업데이트
        if (caravanProgressBar) caravanProgressBar.value = progress / 100f;
        if (caravanStatusText) caravanStatusText.text = $"{d["ownerName"]}의 카라반 — {d["route"]} ({progress}%)";
        // TODO: 월드맵에 카라반 아이콘 이동 표시
    }

    public void OnCaravanEvent(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        var evt = d["event"];
        ShowToast($"카라반 이벤트: {evt?["name"]}", 4f);
    }

    public void OnCaravanArrived(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        int profit = d["profit"]?.Value<int>() ?? 0;
        int netProfit = d["netProfit"]?.Value<int>() ?? 0;
        ShowToast($"카라반 도착! 수입: {profit}G (순이익: +{netProfit}G)", 6f);
        // TODO: 골드 카운팅 연출
    }

    public void OnCaravanRaidResult(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        bool success = d["success"]?.Value<bool>() ?? false;
        ShowToast(success ? $"약탈 성공! +{d["loot"]}G" : "약탈 실패!", 5f);
    }

    public void OnCaravanRaided(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"카라반 약탈당함! {d["raiderName"]}에게 {d["lootLost"]}G 손실!", 5f);
        // TODO: 경보 이펙트
    }

    // ═══ 서버 대전쟁 ═══
    public void OpenWarPanel()
    {
        if (warPanel) warPanel.SetActive(true);
        Emit("war_status");
    }

    public void JoinFaction(string faction)
    {
        Emit("war_join_faction", $"{{\"faction\":\"{faction}\"}}");
    }

    public void ContributeResources(int amount)
    {
        Emit("war_contribute_resources", $"{{\"amount\":{amount}}}");
    }

    public void OnWarStatus(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        bool active = d["active"]?.Value<bool>() ?? false;
        if (warStatusText) warStatusText.text = active ? "전쟁 진행 중!" : "평화 기간";
    }

    public void OnWarFactionJoined(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"{d["name"]} 진영 합류!");
    }

    public void OnWarStarted(string jsonStr) { ShowToast("서버 대전쟁 시작!", 8f); }
    public void OnWarEnded(string jsonStr)
    {
        var d = JObject.Parse(jsonStr);
        ShowToast($"전쟁 종료! {d["winnerName"]} 승리!", 8f);
    }
}
