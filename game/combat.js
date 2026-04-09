// ==========================================
// Combat helpers (extracted from server.js, Phase 3a/3b refactor)
// ==========================================
// 사용법:
//   const combat = require('./game/combat');
//   combat.init({ ELEMENT_BONUS, getCurrentWeather }); // 3b 이후 필요
//   const { MAX_GOLD, getEnchantBonus, capResources, calcDamage,
//           getTodaysChallenge, getThisWeekChallenge } = combat;

// 자원 상한
const MAX_GOLD = 999999999;
const MAX_DIAMONDS = 9999999;
const MAX_LEVEL = 99;

// 아레나 티어
const ARENA_TIERS = [
    { name:'브론즈', min:0,    color:'#cd7f32' },
    { name:'실버',  min:1100, color:'#c0c0c0' },
    { name:'골드',  min:1300, color:'#ffd700' },
    { name:'플래티넘', min:1500, color:'#44ddff' },
    { name:'다이아몬드', min:1800, color:'#44aaff' },
    { name:'마스터',  min:2200, color:'#ff4444' },
];

// 강화 단계별 누적 보너스
// 밸런스: +1~3: +3%, +4~7: +5%, +8~10: +7%, +11~15: +10%
function getEnchantBonus(enchantLevel) {
    let bonus = 0;
    for (let i = 1; i <= enchantLevel; i++) {
        if (i <= 3)       bonus += 0.03;
        else if (i <= 7)  bonus += 0.05;
        else if (i <= 10) bonus += 0.07;
        else              bonus += 0.10;
    }
    return bonus;
}

// 자원 상한 적용
function capResources(p) {
    if (p.gold > MAX_GOLD) p.gold = MAX_GOLD;
    if (p.diamonds > MAX_DIAMONDS) p.diamonds = MAX_DIAMONDS;
    if (p.level > MAX_LEVEL) p.level = MAX_LEVEL;
}

// 점수로 아레나 티어 조회
function getArenaTier(points) {
    let tier = ARENA_TIERS[0];
    for (const t of ARENA_TIERS) { if (points >= t.min) tier = t; }
    return tier;
}

// ────────────────────────────────────────
// Phase 3b: 데미지 계산 + 챌린지 (lazy deps)
// ────────────────────────────────────────

let _ELEMENT_BONUS = null;
let _getCurrentWeather = null;

function init(deps) {
    _ELEMENT_BONUS = deps.ELEMENT_BONUS;
    _getCurrentWeather = deps.getCurrentWeather;
}

function calcDamage(atk, def, dmgMulti, critRate, attackerElement, defenderElement, attacker) {
    // 날씨 ATK/DEF 보정
    const currentWeather = _getCurrentWeather();
    const we = currentWeather.effect || {};
    if (we.atkUp) atk = Math.floor(atk * (1 + we.atkUp));
    if (we.defDown) def = Math.floor(def * (1 - we.defDown));
    // 액티브 부스트
    if (attacker?._activeBonus && Date.now() < attacker._activeBonus) dmgMulti *= 1.3;

    let isCrit = Math.random() < critRate;
    let baseDmg = Math.max(1, atk * dmgMulti - def * 0.3);
    if (isCrit) baseDmg *= 2.0;
    // 속성 상성
    if (attackerElement && defenderElement && _ELEMENT_BONUS[attackerElement] === defenderElement) baseDmg *= 1.25;
    else if (defenderElement && attackerElement && _ELEMENT_BONUS[defenderElement] === attackerElement) baseDmg *= 0.8;
    // 날씨 속성 보너스
    if (we.element && attackerElement === we.element) baseDmg *= 1.15;
    return { damage: Math.floor(baseDmg), isCrit };
}

// ── 일일 챌린지 (24시간 회전) ──
const DAILY_CHALLENGES = [
    { name:'화산 사냥꾼', desc:'불꽃산에서 몬스터 15마리 처치', zone:'volcano', target:'kill_monster', goal:15, reward:{gold:2000,diamonds:20} },
    { name:'얼음 생존자', desc:'얼음 협곡에서 5분 생존', zone:'glacier', target:'survive_time', goal:300, reward:{gold:1500,diamonds:15} },
    { name:'용의 도전', desc:'보스 등급 몬스터 3마리 처치', zone:null, target:'kill_boss', goal:3, reward:{gold:3000,diamonds:30} },
    { name:'PK 존 탐험', desc:'PK 존에서 골드 500 획득', zone:null, target:'earn_gold_pk', goal:500, reward:{gold:2500,diamonds:25} },
    { name:'엘리트 사냥', desc:'엘리트 몬스터 20마리 처치', zone:null, target:'kill_elite', goal:20, reward:{gold:2000,diamonds:20} },
    { name:'동굴 탐험가', desc:'수정 동굴에서 몬스터 10마리', zone:'cave', target:'kill_monster', goal:10, reward:{gold:1500,diamonds:15} },
    { name:'밤의 사냥꾼', desc:'밤에 몬스터 25마리 처치', zone:null, target:'kill_night', goal:25, reward:{gold:2500,diamonds:25} },
    { name:'스트릭 마스터', desc:'10킬 스트릭 달성', zone:null, target:'kill_streak', goal:10, reward:{gold:3000,diamonds:30} },
    { name:'교역왕', desc:'교역 5회 완료', zone:null, target:'trade_count', goal:5, reward:{gold:2000,diamonds:15} },
    { name:'낚시의 달인', desc:'물고기 10마리 낚기', zone:'fishing', target:'fish_catch', goal:10, reward:{gold:1500,diamonds:15} },
    // ── 신규 5종 ──
    { name:'드래곤 사냥꾼', desc:'드래곤 둥지에서 5마리 처치', zone:'dragon', target:'kill_monster', goal:5, reward:{gold:4000,diamonds:35} },
    { name:'그림자 추적', desc:'어둠의 숲에서 엘리트 8마리', zone:'darkforest', target:'kill_elite', goal:8, reward:{gold:2200,diamonds:22} },
    { name:'심연의 부름', desc:'심연 존에서 몬스터 12마리', zone:'abyss', target:'kill_monster', goal:12, reward:{gold:3500,diamonds:30} },
    { name:'완벽한 일격', desc:'크리티컬 50회 발생', zone:null, target:'crit_count', goal:50, reward:{gold:2500,diamonds:25} },
    { name:'백전백승', desc:'PvP 5승', zone:null, target:'pvp_win_daily', goal:5, reward:{gold:3500,diamonds:30} },
];
function getTodaysChallenge() {
    const dayNum = Math.floor(Date.now() / 86400000);
    return DAILY_CHALLENGES[dayNum % DAILY_CHALLENGES.length];
}

// ── 주간 챌린지 (7일마다 회전, 더 큰 보상) ──
const WEEKLY_CHALLENGES = [
    { name:'주간 학살자', desc:'몬스터 200마리 처치', target:'kill_monster', goal:200, reward:{gold:30000,diamonds:200} },
    { name:'전설 사냥꾼', desc:'전설 몬스터 5마리 처치', target:'kill_legendary', goal:5, reward:{gold:50000,diamonds:300, item:'mat_dragon', itemQty:5} },
    { name:'골드 거상', desc:'주간 누적 골드 100,000G 획득', target:'earn_gold', goal:100000, reward:{gold:25000,diamonds:150} },
    { name:'PvP 전사', desc:'PvP 처치 30회', target:'pvp_win', goal:30, reward:{gold:40000,diamonds:250} },
    { name:'무한탑 등반가', desc:'무한의 탑 20층 도달', target:'tower_floor', goal:20, reward:{gold:35000,diamonds:200} },
];
function getThisWeekChallenge() {
    const weekNum = Math.floor(Date.now() / (86400000 * 7));
    return WEEKLY_CHALLENGES[weekNum % WEEKLY_CHALLENGES.length];
}

module.exports = {
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
    getEnchantBonus, capResources, getArenaTier,
    init, calcDamage, getTodaysChallenge, getThisWeekChallenge,
    DAILY_CHALLENGES, WEEKLY_CHALLENGES,
};
