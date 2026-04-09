// ==========================================
// Combat helpers (extracted from server.js, Phase 3a refactor)
// ==========================================
// 순수 함수 + 상수만 — 외부 글로벌 의존 없음.
// 사용법:
//   const { MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
//           getEnchantBonus, capResources, getArenaTier } = require('./game/combat');

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

module.exports = {
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
    getEnchantBonus, capResources, getArenaTier,
};
