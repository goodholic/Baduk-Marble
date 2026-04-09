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
// Phase 3c lazy deps
let _EQUIPMENT_SLOTS = null, _EQUIP_STATS = null, _GRADE_INFO = null, _EQUIPMENT_SETS = null;
let _QUESTS = null, _seasonPass = null, _getPetEffect = null, _getTitleBonus = null, _codexDiscover = null;
let _getCLASSES = null, _getRUNES = null, _getRUNE_WORDS = null, _getFACTIONS = null;
let _getSEASON_XP_MAP = null, _getPlayers = null, _getIo = null;

function init(deps) {
    _ELEMENT_BONUS = deps.ELEMENT_BONUS;
    _getCurrentWeather = deps.getCurrentWeather;
    // Phase 3c
    if (deps.EQUIPMENT_SLOTS) _EQUIPMENT_SLOTS = deps.EQUIPMENT_SLOTS;
    if (deps.EQUIP_STATS)     _EQUIP_STATS = deps.EQUIP_STATS;
    if (deps.GRADE_INFO)      _GRADE_INFO = deps.GRADE_INFO;
    if (deps.EQUIPMENT_SETS)  _EQUIPMENT_SETS = deps.EQUIPMENT_SETS;
    if (deps.QUESTS)          _QUESTS = deps.QUESTS;
    if (deps.seasonPass)      _seasonPass = deps.seasonPass;
    if (deps.getPetEffect)    _getPetEffect = deps.getPetEffect;
    if (deps.getTitleBonus)   _getTitleBonus = deps.getTitleBonus;
    if (deps.codexDiscover)   _codexDiscover = deps.codexDiscover;
    if (deps.getCLASSES)        _getCLASSES = deps.getCLASSES;
    if (deps.getRUNES)          _getRUNES = deps.getRUNES;
    if (deps.getRUNE_WORDS)     _getRUNE_WORDS = deps.getRUNE_WORDS;
    if (deps.getFACTIONS)       _getFACTIONS = deps.getFACTIONS;
    if (deps.getSEASON_XP_MAP)  _getSEASON_XP_MAP = deps.getSEASON_XP_MAP;
    if (deps.getPlayers)        _getPlayers = deps.getPlayers;
    if (deps.getIo)             _getIo = deps.getIo;
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

// ────────────────────────────────────────
// Phase 3c: 스탯 재계산 + 퀘스트 트래킹
// ────────────────────────────────────────

function recalcStats(p) {
    if (!p || p.isBot) return;
    const CLASSES = _getCLASSES();
    const RUNES = _getRUNES();
    const RUNE_WORDS = _getRUNE_WORDS();
    const FACTIONS = _getFACTIONS();
    const cls = CLASSES[p.className];
    if (!cls) return;
    let bonusAtk = 0, bonusDef = 0, bonusHp = 0, bonusSpd = 0;
    let bonusCrit = 0, bonusDodge = 0, bonusExp = 0, bonusGold = 0;

    if (p.equipped) {
        for (const slot of _EQUIPMENT_SLOTS) {
            const eqId = p.equipped[slot];
            if (!eqId || !_EQUIP_STATS[eqId]) continue;
            const eq = _EQUIP_STATS[eqId];
            const grade = _GRADE_INFO[eq.grade] || _GRADE_INFO.normal;
            const enchant = (p.enchantLevels && p.enchantLevels[eqId]) || 0;
            const enchantMult = 1 + getEnchantBonus(enchant);

            bonusAtk += Math.floor(eq.atk * grade.atkMulti * enchantMult);
            bonusDef += Math.floor(eq.def * grade.defMulti * enchantMult);
            if (eq.bonusSpd) bonusSpd += eq.bonusSpd;
            if (eq.expBonus) bonusExp += eq.expBonus;
            if (eq.goldBonus) bonusGold += eq.goldBonus;

            // 랜덤 옵션 적용
            const opts = p.equipOptions && p.equipOptions[eqId];
            if (opts) {
                for (const opt of opts) {
                    if (opt.stat === 'bonusHp') bonusHp += opt.value;
                    if (opt.stat === 'critRate') bonusCrit += opt.value;
                    if (opt.stat === 'dodgeRate') bonusDodge += opt.value;
                    if (opt.stat === 'bonusSpd') bonusSpd += opt.value;
                    if (opt.stat === 'expBonus') bonusExp += opt.value;
                    if (opt.stat === 'goldBonus') bonusGold += opt.value;
                }
            }
        }
    }

    // 스탯 포인트 보너스 (bonusStr/Dex/Int/Con 사용)
    const str = p.bonusStr || 0, dex = p.bonusDex || 0, int_ = p.bonusInt || 0, con = p.bonusCon || 0;

    // 세트 보너스 계산
    let setAtkBonus = 0, setDefBonus = 0, setHpBonus = 0, setAtkMulti = 1, setDefMulti = 1, setExpBonus = 0;
    if (p.equipped) {
        const equippedIds = Object.values(p.equipped).filter(Boolean);
        for (const [setId, setInfo] of Object.entries(_EQUIPMENT_SETS)) {
            const count = setInfo.pieces.filter(pid => equippedIds.includes(pid)).length;
            for (const [req, bonus] of Object.entries(setInfo.bonuses)) {
                if (count >= parseInt(req)) {
                    if (bonus.atk) setAtkBonus += bonus.atk;
                    if (bonus.def) setDefBonus += bonus.def;
                    if (bonus.hp) setHpBonus += bonus.hp;
                    if (bonus.atkMulti) setAtkMulti = Math.max(setAtkMulti, bonus.atkMulti);
                    if (bonus.defMulti) setDefMulti = Math.max(setDefMulti, bonus.defMulti);
                    if (bonus.expBonus) setExpBonus += bonus.expBonus;
                }
            }
        }
    }

    // 펫 보너스
    let petAtkMulti = 1.0;
    const pet = _getPetEffect(p);
    if (pet && pet.effect === 'atkBonus') petAtkMulti += pet.value;

    // ── 룬 개별 스탯 + 룬 워드 보너스 ──
    let runeAtk = 0, runeDef = 0, runeHp = 0, runeSpd = 0, runeCrit = 0, runeDodge = 0, runeExp = 0, runeGold = 0;
    let runeDropRate = 0;
    if (p.itemRunes && p.equipped) {
        for (const eqId of Object.values(p.equipped)) {
            const runes = p.itemRunes[eqId];
            if (!runes) continue;
            // 개별 룬 스탯
            for (const rId of runes) {
                const r = RUNES[rId];
                if (!r) continue;
                if (r.stat === 'atk') runeAtk += r.value;
                if (r.stat === 'def') runeDef += r.value;
                if (r.stat === 'hp') runeHp += r.value;
                if (r.stat === 'spd') runeSpd += r.value;
                if (r.stat === 'crit') runeCrit += r.value;
                if (r.stat === 'dodge') runeDodge += r.value;
                if (r.stat === 'exp') runeExp += r.value;
                if (r.stat === 'gold') runeGold += r.value;
                if (r.stat === 'mp') { /* MP는 별도 처리 */ }
                if (r.stat === 'all') { runeAtk += r.value; runeDef += r.value; }
            }
            // 룬 워드 보너스
            const runeKey = [...runes].sort().join('');
            const rw = RUNE_WORDS[runeKey];
            if (rw && rw.bonus) {
                if (rw.bonus.atk) runeAtk += rw.bonus.atk;
                if (rw.bonus.def) runeDef += rw.bonus.def;
                if (rw.bonus.spd) runeSpd += rw.bonus.spd;
                if (rw.bonus.exp) runeExp += rw.bonus.exp;
                if (rw.bonus.hpRegen) { /* 별도 처리 */ }
                if (rw.bonus.dropRate) runeDropRate += rw.bonus.dropRate;
            }
        }
    }

    // ── 프레스티지 (환생) 영구 보너스 ──
    let legacyAtk = 0, legacyDef = 0, legacyHp = 0, legacySpd = 0, legacyCrit = 0;
    let legacyExpBonus = 0, legacyGoldBonus = 0, legacyDropRate = 0, legacyAllMulti = 1;
    if (p.legacyPerks && p.legacyPerks.length > 0) {
        for (const perk of p.legacyPerks) {
            if (perk.stat === 'atk') legacyAtk += perk.value;
            if (perk.stat === 'def') legacyDef += perk.value;
            if (perk.stat === 'hp') legacyHp += perk.value;
            if (perk.stat === 'spd') legacySpd += perk.value;
            if (perk.stat === 'crit') legacyCrit += perk.value;
            if (perk.stat === 'goldBonus') legacyGoldBonus += perk.value;
            if (perk.stat === 'expBonus') legacyExpBonus += perk.value;
            if (perk.stat === 'dropRate') legacyDropRate += perk.value;
            if (perk.stat === 'allMulti') legacyAllMulti += perk.value;
        }
    }

    // ── 전직 보너스 ──
    const ab = p.advanceBonus || {};
    const advAtk = ab.atk || 0, advDef = ab.def || 0, advHp = ab.hp || 0;
    const advCrit = ab.crit || 0, advDodge = ab.dodge || 0;

    // ── 진영 보너스 ──
    let factionAtkMulti = 1, factionDefMulti = 1;
    if (p.faction && FACTIONS[p.faction]) {
        const fb = FACTIONS[p.faction];
        if (fb.bonus === 'atk') factionAtkMulti += fb.bonusValue;
        if (fb.bonus === 'def') factionDefMulti += fb.bonusValue;
    }

    // ── 칭호 보너스 ──
    let titleAtk = 0, titleExp = 0;
    const tb = _getTitleBonus(p, 'atk'); if (tb) titleAtk = tb;
    const te = _getTitleBonus(p, 'expBonus'); if (te) titleExp = te;

    // ── 최종 스탯 계산 ──
    p.atk = Math.floor((cls.atk + bonusAtk + setAtkBonus + runeAtk + legacyAtk + advAtk + str * 2) * petAtkMulti * setAtkMulti * factionAtkMulti * legacyAllMulti * (1 + titleAtk));
    p.def = Math.floor((cls.def + bonusDef + setDefBonus + runeDef + legacyDef + advDef) * setDefMulti * factionDefMulti * legacyAllMulti);
    p.equipBonusHp = bonusHp + con * 10 + setHpBonus + runeHp + legacyHp + advHp;
    p.maxHp = (cls.maxHp || cls.hp || 100) + (p.level - 1) * 20 + p.equipBonusHp;
    p.dmgMulti = 1.0 + (p.level - 1) * 0.08 + int_ * 0.02;
    p.critRate = (cls.critRate || 0.1) + bonusCrit + runeCrit + legacyCrit + advCrit + dex * 0.005;
    p.dodgeRate = (cls.dodgeRate || 0) + bonusDodge + runeDodge + advDodge + dex * 0.003;
    p.equipBonusSpd = bonusSpd + runeSpd + legacySpd;
    p.equipExpBonus = bonusExp + setExpBonus + runeExp + legacyExpBonus + titleExp;
    p.equipGoldBonus = bonusGold + runeGold + legacyGoldBonus;
    p.dropRateBonus = runeDropRate + legacyDropRate;
}

function trackQuest(p, target, amount) {
    if (!p || p.isBot) return;
    if (!p.questProgress) p.questProgress = {};
    const players = _getPlayers();
    for (const [qId, q] of Object.entries(_QUESTS)) {
        if (q.target === target && !(p.questCompleted && p.questCompleted[qId])) {
            if (target === 'reach_level') {
                p.questProgress[qId] = p.level;
            } else if (target === 'army_count') {
                let count = 0;
                for (const bId in players) { if (players[bId].isBot && players[bId].ownerId === p.id && players[bId].isAlive) count++; }
                p.questProgress[qId] = count;
            } else {
                p.questProgress[qId] = (p.questProgress[qId] || 0) + (amount || 1);
            }
        }
    }
    // v1.29: 시즌 패스 XP 자동 적립
    const seasonSource = _getSEASON_XP_MAP()[target];
    if (seasonSource) {
        const result = _seasonPass.addSeasonXp(p, seasonSource);
        if (result.gained && result.tier > (p.seasonTierAchieved || 0)) {
            p.seasonTierAchieved = result.tier;
            try {
                _getIo().to(p.id).emit('season_tier_up', { tier: result.tier, totalXp: result.totalXp });
            } catch (_) {}
        }
    }
    // v1.33: 도감 자동 발견 — explore_count 추적 시 현재 존을 zone 도감에 등록
    if (target === 'explore_count' && p.currentZone) {
        _codexDiscover(p, 'zone', p.currentZone);
    }
}

module.exports = {
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
    getEnchantBonus, capResources, getArenaTier,
    init, calcDamage, getTodaysChallenge, getThisWeekChallenge,
    DAILY_CHALLENGES, WEEKLY_CHALLENGES,
    recalcStats, trackQuest,
};
