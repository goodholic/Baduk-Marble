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
let _getQuestChain = null;
let _getAchievements = null;
// Phase 3d/3e deps
let _ZONES = null, _ZONE_MONSTERS = null, _ZONE_MONSTER_NAMES = null, _WORLD_BOSS_TYPES = null;
let _getELEMENTS = null, _TITLES = null;
let _pickZoneTier = null, _scaleMonster = null, _logWorldEvent = null, _getWeekNumber = null;
let _getIsNight = null;
let _getMonsters = null, _getDrops = null, _getArenaMatches = null, _getArenaRankings = null, _getRankings = null;
let _nextEntityId = null, _getWorldBoss = null, _setWorldBoss = null;
let _getLastWeeklyRewardWeek = null, _setLastWeeklyRewardWeek = null;

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
    if (deps.getQuestChain)     _getQuestChain = deps.getQuestChain;
    if (deps.getAchievements)   _getAchievements = deps.getAchievements;
    // Phase 3d/3e
    if (deps.ZONES)             _ZONES = deps.ZONES;
    if (deps.ZONE_MONSTERS)     _ZONE_MONSTERS = deps.ZONE_MONSTERS;
    if (deps.ZONE_MONSTER_NAMES) _ZONE_MONSTER_NAMES = deps.ZONE_MONSTER_NAMES;
    if (deps.WORLD_BOSS_TYPES)  _WORLD_BOSS_TYPES = deps.WORLD_BOSS_TYPES;
    if (deps.getELEMENTS)       _getELEMENTS = deps.getELEMENTS;
    if (deps.TITLES)            _TITLES = deps.TITLES;
    if (deps.pickZoneTier)      _pickZoneTier = deps.pickZoneTier;
    if (deps.scaleMonster)      _scaleMonster = deps.scaleMonster;
    if (deps.logWorldEvent)     _logWorldEvent = deps.logWorldEvent;
    if (deps.getWeekNumber)     _getWeekNumber = deps.getWeekNumber;
    if (deps.getIsNight)        _getIsNight = deps.getIsNight;
    if (deps.getMonsters)       _getMonsters = deps.getMonsters;
    if (deps.getDrops)          _getDrops = deps.getDrops;
    if (deps.getArenaMatches)   _getArenaMatches = deps.getArenaMatches;
    if (deps.getArenaRankings)  _getArenaRankings = deps.getArenaRankings;
    if (deps.getRankings)       _getRankings = deps.getRankings;
    if (deps.nextEntityId)      _nextEntityId = deps.nextEntityId;
    if (deps.getWorldBoss)      _getWorldBoss = deps.getWorldBoss;
    if (deps.setWorldBoss)      _setWorldBoss = deps.setWorldBoss;
    if (deps.getLastWeeklyRewardWeek)  _getLastWeeklyRewardWeek = deps.getLastWeeklyRewardWeek;
    if (deps.setLastWeeklyRewardWeek)  _setLastWeeklyRewardWeek = deps.setLastWeeklyRewardWeek;
}

function calcDamage(atk, def, dmgMulti, critRate, attackerElement, defenderElement, attacker) {
    // 날씨 ATK/DEF 보정 (null 방어)
    const currentWeather = _getCurrentWeather ? _getCurrentWeather() : null;
    const we = (currentWeather && currentWeather.effect) ? currentWeather.effect : {};
    if (we.atkUp) atk = Math.floor(atk * (1 + we.atkUp));
    if (we.defDown) def = Math.floor(def * (1 - we.defDown));
    // 액티브 부스트
    if (attacker?._activeBonus && Date.now() < attacker._activeBonus) dmgMulti *= 1.3;

    let isCrit = Math.random() < (critRate || 0);
    let baseDmg = Math.max(1, (atk || 0) * (dmgMulti || 1) - (def || 0) * 0.3);
    if (isCrit) baseDmg *= 2.0;
    // 속성 상성 (null 방어)
    if (attackerElement && defenderElement && _ELEMENT_BONUS && _ELEMENT_BONUS[attackerElement] === defenderElement) baseDmg *= 1.25;
    else if (defenderElement && attackerElement && _ELEMENT_BONUS && _ELEMENT_BONUS[defenderElement] === attackerElement) baseDmg *= 0.8;
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

    // 세트 보너스 달성 추적
    if (setAtkMulti > 1 || setDefMulti > 1 || setExpBonus > 0) {
        trackQuest(p, 'set_bonus', 1);
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

    // ── 2차 각성 보너스 (v2.38) ──
    const aw = p.awakenBonus || {};
    const awkAtk = aw.atk || 0, awkDef = aw.def || 0, awkHp = aw.hp || 0;
    const awkCrit = aw.crit || 0, awkDodge = aw.dodge || 0, awkSpd = aw.speed || 0;

    // ── 고대 혈맹 보너스 (v2.42) ──
    let blAtk = 0, blDef = 0, blHp = 0, blCrit = 0, blDodge = 0, blSpd = 0;
    if (p._bloodline && p._bloodline.type && p._bloodline.stage > 0) {
        try {
            const bloodline = require('./bloodline');
            const blBonus = bloodline.getPassiveBonuses(p);
            blAtk = blBonus.atk || 0;
            blDef = blBonus.def || 0;
            blHp = (blBonus.maxHp || 0);
            blCrit = blBonus.crit || 0;
            blDodge = blBonus.evasion || 0;
            blSpd = blBonus.spd || 0;
        } catch(e) {}
    }

    // ── 저주 장비 보너스 (v2.48) ──
    let cursedAtk = 0, cursedDef = 0;
    if (p._cursedEquip) {
        try {
            const ce = require('./cursed_equipment');
            const curseData = ce.getActiveCurses(p);
            cursedAtk = curseData.statBonus.atk || 0;
            cursedDef = curseData.statBonus.def || 0;
        } catch(e) {}
    }

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

    // ── 하우징 보너스 (v2.58) ──
    let housingAtk = 0, housingDef = 0, housingHp = 0, housingExp = 0;
    try {
        const housing = require('./housing');
        const hb = housing.getHousingBonuses(p);
        housingAtk = hb.atkBonus || 0;
        housingDef = hb.defBonus || 0;
        housingHp = (hb.hpRegen || 0) * 10; // HP 회복을 HP 보너스로 환산
        housingExp = hb.expBonus || 0;
    } catch(e) {}

    // ── 최종 스탯 계산 ──
    p.atk = Math.floor((cls.atk + bonusAtk + setAtkBonus + runeAtk + legacyAtk + advAtk + awkAtk + blAtk + cursedAtk + housingAtk + str * 2) * petAtkMulti * setAtkMulti * factionAtkMulti * legacyAllMulti * (1 + titleAtk));
    p.def = Math.floor((cls.def + bonusDef + setDefBonus + runeDef + legacyDef + advDef + awkDef + blDef + cursedDef + housingDef) * setDefMulti * factionDefMulti * legacyAllMulti);
    p.equipBonusHp = bonusHp + con * 10 + setHpBonus + runeHp + legacyHp + advHp + awkHp + blHp + housingHp;
    p.maxHp = (cls.maxHp || cls.hp || 100) + (p.level - 1) * 20 + p.equipBonusHp;
    p.dmgMulti = 1.0 + (p.level - 1) * 0.08 + int_ * 0.02;
    p.critRate = (cls.critRate || 0.1) + bonusCrit + runeCrit + legacyCrit + advCrit + awkCrit + blCrit * 0.01 + dex * 0.005;
    p.dodgeRate = (cls.dodgeRate || 0) + bonusDodge + runeDodge + advDodge + awkDodge + blDodge * 0.01 + dex * 0.003;
    p.equipBonusSpd = bonusSpd + runeSpd + legacySpd + awkSpd + blSpd;
    p.equipExpBonus = bonusExp + setExpBonus + runeExp + legacyExpBonus + titleExp + housingExp;
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
                for (const bId in players) { if (players[bId] && players[bId].isBot && players[bId].ownerId === p.id && players[bId].isAlive) count++; }
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
    // v2.19: 메인 스토리 퀘스트 체인 연동
    if (_getQuestChain) {
        const qc = _getQuestChain();
        if (qc) {
            const result = qc.updateProgress(p, target, amount);
            if (result.completed.length > 0 || result.hiddenCompleted.length > 0) {
                const io = _getIo();
                for (const c of result.completed) {
                    try { io.to(p.id).emit('quest_chain_complete', { id: c.id, name: c.quest.name, reward: c.quest.reward }); } catch(_) {}
                }
                for (const h of result.hiddenCompleted) {
                    try { io.to(p.id).emit('quest_chain_hidden_complete', { id: h.id, name: h.quest.name, reward: h.quest.reward }); } catch(_) {}
                }
                // 다음 퀘스트 자동 안내
                const next = qc.getNextQuest(p);
                if (next) try { io.to(p.id).emit('quest_chain_next', next); } catch(_) {}
            } else if (result.storyUpdated) {
                try { _getIo().to(p.id).emit('quest_chain_progress', { id: p._storyQuests?.current, progress: p._storyQuests?.progress[p._storyQuests?.current] }); } catch(_) {}
            }
        }
    }
    // v2.27: 도전 과제 자동 연동
    if (_getAchievements) {
        const ach = _getAchievements();
        if (ach) {
            const achResults = ach.updateProgress(p, target, amount);
            if (achResults.length > 0) {
                const io = _getIo();
                for (const ar of achResults) {
                    try { io.to(p.id).emit('achievement_unlocked', { id: ar.id, name: ar.name, tier: ar.tier, tierName: ar.tierName }); } catch(_) {}
                }
            }
        }
    }
}

// ────────────────────────────────────────
// Phase 3d: 스폰/아레나
// ────────────────────────────────────────

function spawnMonster() {
    const entityId = _nextEntityId();
    const mId = 'monster_' + entityId;
    const monsters = _getMonsters();
    const io = _getIo();
    const isNight = _getIsNight();

    // 존 기반 스폰 (존별 몬스터 등급 배합)
    const huntZoneEntries = Object.entries(_ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena && _ZONE_MONSTERS[id]);
    const [zoneId, zone] = huntZoneEntries[Math.floor(Math.random() * huntZoneEntries.length)];
    const tierKey = _pickZoneTier(zoneId);
    const zoneMidLvl = Math.floor((zone.lvl[0] + zone.lvl[1]) / 2);
    const tier = _scaleMonster(tierKey, zoneMidLvl);

    const mx = zone.x + Math.random() * zone.w;
    const my = zone.y + Math.random() * zone.h;

    // 몬스터 고유 AI 타입
    const AI_TYPES = { normal:'wander', elite:'charge', rare:'aoe', boss:'breath', legendary:'breath', mythic:'breath' };
    // 존별 이름 적용
    const zoneNames = _ZONE_MONSTER_NAMES[zoneId];
    const monsterName = (zoneNames && zoneNames[tierKey]) ? zoneNames[tierKey] : tier.name;

    monsters[mId] = {
        id: mId,
        tier: tierKey,
        name: monsterName,
        x: mx, y: my,
        hp: tier.hp, maxHp: tier.hp,
        atk: tier.atk, def: tier.def,
        color: tier.color,
        isAlive: true,
        element: _getELEMENTS()[Math.floor(Math.random() * _getELEMENTS().length)],
        zoneId,
        aiType: AI_TYPES[tierKey] || 'wander',
        expReward: tier.expReward,
        goldReward: tier.goldReward,
        lastSpecialAttack: 0,
    };

    // 밤 시간 강화 적용
    if (isNight) {
        monsters[mId].atk = Math.floor(monsters[mId].atk * 1.2);
        monsters[mId].hp = Math.floor(monsters[mId].hp * 1.2);
        monsters[mId].maxHp = Math.floor(monsters[mId].maxHp * 1.2);
        monsters[mId].nightBuffed = true;
    }

    // v2.47: 변이 체크
    try {
        const mutation = require('./mutation');
        const mutResult = mutation.tryMutate(monsters[mId]);
        if (mutResult) {
            const spawnZoneName = _ZONES[zoneId]?.name || zoneId;
            io.emit('server_msg', { msg: `[변이체] ${mutResult.mutation.prefix} ${monsters[mId].name}이(가) ${spawnZoneName}에 출현!`, type: mutResult.mutation.tier >= 3 ? 'legendary' : 'rare' });
            io.emit('mutant_spawn', { id: mId, name: monsters[mId].name, tier: mutResult.mutation.tier, color: mutResult.mutation.color, zoneId });
        }
    } catch(e) {}

    // 레어 몬스터 스폰 공지
    if (tierKey === 'legendary' || tierKey === 'mythic') {
        const spawnZoneName = _ZONES[zoneId]?.name || zoneId;
        io.emit('rare_spawn', { id: mId, name: monsterName, tier: tierKey, zoneId, zoneName: spawnZoneName });
        io.emit('server_msg', { msg: `[희귀 출현] ${monsterName}이(가) ${spawnZoneName}에 나타났습니다!`, type: 'boss' });
    }
}

function endArenaMatch(matchId, winnerId, loserId, reason) {
    const arenaMatches = _getArenaMatches();
    const arenaRankings = _getArenaRankings();
    const players = _getPlayers();
    const io = _getIo();
    const match = arenaMatches[matchId];
    if (!match) return;
    const winner = players[winnerId], loser = players[loserId];

    // v2.58: 상대가 없으면 무효 처리 (혼자 승리 방지)
    if (!winner || !loser) {
        // 남아있는 플레이어만 HP 회복 + 마을 귀환 (보상 없음)
        const remaining = winner || loser;
        if (remaining) {
            remaining.hp = remaining.maxHp;
            delete remaining.arenaMatchId;
            remaining.x = -480 + Math.random() * 40; remaining.y = -480 + Math.random() * 40;
            io.to(remaining.id || winnerId || loserId).emit('arena_end', { result: 'cancelled', msg: '상대가 이탈하여 매치 무효', points: 0, reward: 0, reason: '상대 이탈' });
        }
        io.emit('server_msg', { msg: '[아레나] 상대 이탈로 매치 무효', type: 'normal' });
        delete arenaMatches[matchId];
        return;
    }

    // v2.58: 접속자 수 체크 — 서버에 실제 PvP 가능 인원이 2명 미만이면 보상 제한
    const onlinePvpPlayers = Object.values(players).filter(p => p && p.isAlive && !p.isBot).length;

    // 포인트 계산 (결투는 랭킹에 영향 안 줌)
    if (!match.isDuel) {
        if (!arenaRankings[winnerId]) arenaRankings[winnerId] = { wins:0, losses:0, points:1000 };
        if (!arenaRankings[loserId]) arenaRankings[loserId] = { wins:0, losses:0, points:1000 };
        arenaRankings[winnerId].wins++;
        arenaRankings[loserId].losses++;
        const prevWinTier = getArenaTier(arenaRankings[winnerId].points);
        arenaRankings[winnerId].points += 25;
        arenaRankings[loserId].points = Math.max(0, arenaRankings[loserId].points - 15);
        const newWinTier = getArenaTier(arenaRankings[winnerId].points);
        if (newWinTier.min > prevWinTier.min) {
            io.to(winnerId).emit('tier_promotion', { tier: newWinTier.name, color: newWinTier.color });
            io.emit('server_msg', { msg: `[아레나] ${winner?.displayName}이(가) ${newWinTier.name} 티어 승급!`, type: 'rare' });
            if (winner) trackQuest(winner, 'arena_tier', ARENA_TIERS.indexOf(newWinTier) + 1);
        }
    }

    // 보상 (실제 대전이 있었을 때만)
    if (winner) {
        winner.gold = Math.min(999999999, winner.gold + 200);
        winner.arenaCountToday = (winner.arenaCountToday || 0) + 1;
        winner.hp = winner.maxHp; // HP 회복
        delete winner.arenaMatchId;
        // 마을로 귀환
        winner.x = -480 + Math.random() * 40; winner.y = -480 + Math.random() * 40;
        io.to(winnerId).emit('arena_end', { result: 'win', points: arenaRankings[winnerId].points, reward: 200, reason });
        trackQuest(winner, 'pvp_win', 1);
        trackQuest(winner, 'pvp_fight', 1);
    }
    if (loser) {
        loser.arenaCountToday = (loser.arenaCountToday || 0) + 1;
        loser.hp = loser.maxHp; // HP 회복
        delete loser.arenaMatchId;
        loser.x = -480 + Math.random() * 40; loser.y = -480 + Math.random() * 40;
        io.to(loserId).emit('arena_end', { result: 'lose', points: arenaRankings[loserId].points, reason });
        trackQuest(loser, 'pvp_fight', 1);
    }

    io.emit('server_msg', { msg: `[아레나] ${winner?.displayName || '?'} 승리! (${reason})`, type: 'normal' });
    delete arenaMatches[matchId];
}

function spawnWorldBoss() {
    const worldBoss = _getWorldBoss();
    if (worldBoss && worldBoss.isAlive) return; // 이미 보스 존재
    const bossType = _WORLD_BOSS_TYPES[Math.floor(Math.random() * _WORLD_BOSS_TYPES.length)];
    const zone = _ZONES.dragon; // 용의 요람에 스폰
    const entityId = _nextEntityId();
    const bossId = 'worldboss_' + entityId;
    const monsters = _getMonsters();
    const io = _getIo();

    monsters[bossId] = {
        id: bossId,
        tier: 'worldboss',
        name: bossType.name,
        x: zone.x + zone.w / 2,
        y: zone.y + zone.h / 2,
        hp: bossType.hp,
        maxHp: bossType.hp,
        atk: bossType.atk,
        def: bossType.def,
        color: bossType.color,
        isAlive: true,
        isWorldBoss: true,
        expReward: bossType.expReward,
        goldReward: bossType.goldReward,
        damageContrib: {}, // 기여도 추적 {playerId: totalDamage}
    };

    _setWorldBoss({ id: bossId, name: bossType.name, isAlive: true, spawnTime: Date.now() });
    io.emit('server_msg', { msg: `[월드 보스] ${bossType.name}이(가) 용의 요람에 출현했습니다! 모든 전사여 모여라!`, type: 'boss' });
    io.emit('world_boss_spawn', { id: bossId, name: bossType.name, hp: bossType.hp, maxHp: bossType.hp, x: monsters[bossId].x, y: monsters[bossId].y });
    _logWorldEvent(`월드 보스 ${bossType.name} 출현`, 'boss');
}

function spawnDrop(x, y, gold, monsterId) {
    const entityId = _nextEntityId();
    const dropId = 'drop_' + entityId;
    const drops = _getDrops();
    const io = _getIo();
    drops[dropId] = {
        id: dropId,
        x, y, gold,
        spawnTime: Date.now(),
        pickupRadius: 2.0
    };
    io.emit('drop_spawn', drops[dropId]);

    // 30초 후 자동 소멸
    setTimeout(() => {
        if (drops[dropId]) {
            io.emit('drop_destroy', dropId);
            delete drops[dropId];
        }
    }, 30000);
}

// ────────────────────────────────────────
// Phase 3e: 랭킹
// ────────────────────────────────────────

function updateRankings() {
    const rankings = _getRankings();
    const players = _getPlayers();
    const arenaRankings = _getArenaRankings();
    const io = _getIo();

    const oldLevelTop = rankings.level ? rankings.level.map(r => r.id) : [];
    const realPlayers = Object.values(players).filter(p => !p.isBot && p.isAlive);
    rankings.level = realPlayers.sort((a,b) => b.level - a.level).slice(0,10).map(p => ({
        name: p.displayName, level: p.level, className: p.className, id: p.id
    }));
    // 랭킹 추월 알림
    for (let i = 0; i < rankings.level.length; i++) {
        const pid = rankings.level[i].id;
        const oldIdx = oldLevelTop.indexOf(pid);
        if (oldIdx > i && i < 5) {
            io.to(pid).emit('rank_change', { type: 'level', newRank: i+1, oldRank: oldIdx+1 });
            if (i === 0) io.emit('server_msg', { msg: `${rankings.level[i].name}이(가) 레벨 랭킹 1위 달성!`, type: 'rare' });
        } else if (oldIdx === -1 && i < 10) {
            io.to(pid).emit('rank_change', { type: 'level', newRank: i+1, oldRank: 0 });
        }
    }
    rankings.pvp = realPlayers.sort((a,b) => (b.pvpWins||0) - (a.pvpWins||0)).slice(0,10).map(p => ({
        name: p.displayName, kills: p.pvpWins||0, className: p.className, id: p.id
    }));
    rankings.gold = realPlayers.sort((a,b) => b.gold - a.gold).slice(0,10).map(p => ({
        name: p.displayName, gold: p.gold, className: p.className, id: p.id
    }));
    // 아레나 랭킹
    rankings.arena = Object.entries(arenaRankings)
        .sort((a,b) => b[1].points - a[1].points)
        .slice(0, 10)
        .map(([pid, r], idx) => ({
            rank: idx + 1, name: players[pid]?.displayName || '?',
            className: players[pid]?.className || '?',
            wins: r.wins, losses: r.losses, points: r.points, id: pid
        }));
}

function checkWeeklyRankingRewards() {
    const players = _getPlayers();
    const rankings = _getRankings();
    const io = _getIo();

    const now = new Date();
    const week = _getWeekNumber();
    if (now.getDay() === 1 && now.getHours() === 6 && _getLastWeeklyRewardWeek() !== week) {
        _setLastWeeklyRewardWeek(week);
        updateRankings();

        // v2.58: 최소 경쟁 인원 체크 — 실제 플레이어 3명 이상이어야 랭킹 보상 지급
        const realPlayers = Object.values(players).filter(p => p && !p.isBot && p.level > 1);
        if (realPlayers.length < 3) {
            io.emit('server_msg', { msg: '주간 랭킹: 참여자 부족 (최소 3명)으로 보상이 지급되지 않습니다.', type: 'normal' });
            return;
        }

        // 레벨 1위
        if (rankings.level.length > 0) {
            const topId = rankings.level[0].id;
            const top = players[topId];
            if (top) {
                top.gold = Math.min(999999999, top.gold + 10000);
                top.diamonds = (top.diamonds || 0) + 100;
                // 주간 칭호 부여 (기존 주간 칭호 제거)
                if (top.titles) top.titles = top.titles.filter(t => !_TITLES[t]?.weekly);
                if (!top.titles) top.titles = [];
                top.titles.push('title_rank_level');
                io.to(topId).emit('server_msg', { msg: '주간 레벨 1위 보상! +10000G, +100D, 칭호: 서버 최강자', type: 'rare' });
            }
        }

        // PvP 1위
        if (rankings.pvp.length > 0) {
            const topId = rankings.pvp[0].id;
            const top = players[topId];
            if (top) {
                top.gold = Math.min(999999999, top.gold + 5000);
                top.diamonds = (top.diamonds || 0) + 80;
                if (top.titles) top.titles = top.titles.filter(t => !_TITLES[t]?.weekly);
                if (!top.titles) top.titles = [];
                top.titles.push('title_rank_pvp');
                io.to(topId).emit('server_msg', { msg: '주간 PvP 1위 보상! +5000G, +80D, 칭호: 최강 전사', type: 'rare' });
            }
        }

        // 상위 10위까지 보상
        for (let i = 1; i < Math.min(10, rankings.level.length); i++) {
            const p = players[rankings.level[i]?.id];
            if (p) {
                const reward = Math.floor(10000 / (i + 1));
                p.gold = Math.min(999999999, p.gold + reward);
                io.to(p.id).emit('server_msg', { msg: `주간 레벨 ${i+1}위 보상! +${reward}G`, type: 'normal' });
            }
        }

        io.emit('server_msg', { msg: '주간 랭킹 보상이 지급되었습니다!', type: 'boss' });
    }
}

module.exports = {
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
    getEnchantBonus, capResources, getArenaTier,
    init, calcDamage, getTodaysChallenge, getThisWeekChallenge,
    DAILY_CHALLENGES, WEEKLY_CHALLENGES,
    recalcStats, trackQuest,
    spawnMonster, endArenaMatch, spawnWorldBoss, spawnDrop,
    updateRankings, checkWeeklyRankingRewards,
};
