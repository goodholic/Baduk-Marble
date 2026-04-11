// Server data constants (extracted from server.js)
// CLASSES, RUNES, FACTIONS, LEGACY_PERKS, etc.

const CLASSES = {
    // v2.58 밸런스 패치: 클래스 재조정
    'Assassin': {
        displayName: '어쌔신',
        maxHp: 160, atk: 38, def: 8,  speed: 22,    // HP 145→160, ATK 35→38, SPD 20→22
        critRate: 0.22, dodgeRate: 0.18,              // CRIT 20→22%, DODGE 15→18%
        aoe: false, projSpeed: 40, projLife: 80,
        desc: '빠른 속도와 높은 크리티컬로 적을 암살',
        autoSkill: 'shadowStrike'
    },
    'Warrior': {
        displayName: '워리어',
        maxHp: 220, atk: 30, def: 18, speed: 13,     // HP 200→220, ATK 28→30, DEF 16→18
        critRate: 0.12, dodgeRate: 0.06,              // CRIT 10→12%
        aoe: false, projSpeed: 18, projLife: 1200,
        desc: '균형 잡힌 공방, 안정적인 전투력',
        autoSkill: 'powerStrike'
    },
    'Knight': {
        displayName: '나이트',
        maxHp: 380, atk: 20, def: 32, speed: 10,     // HP 350→380, DEF 28→32, ATK 22→20
        critRate: 0.05, dodgeRate: 0.03,              // DODGE 2→3%
        aoe: false, projSpeed: 14, projLife: 800,
        desc: '철벽 방어, 아군을 지키는 탱커',
        autoSkill: 'shieldBash'
    },
    'Mage': {
        displayName: '메이지',
        maxHp: 140, atk: 26, def: 7,  speed: 10,     // HP 110→140, ATK 24→26, SPD 9→10
        critRate: 0.18, dodgeRate: 0.08,              // CRIT 15→18%, DODGE 10→8%
        aoe: true, projSpeed: 0, projLife: 2500,
        desc: '강력한 광역 마법으로 전장을 지배',
        autoSkill: 'meteor'
    },
    'GuardianTower': {
        displayName: '가디언 타워',
        maxHp: 650, atk: 35, def: 28, speed: 0,      // HP 600→650, DEF 25→28
        critRate: 0.05, dodgeRate: 0,
        aoe: false, projSpeed: 22, projLife: 800,
        desc: '고정 방어탑, 영역 수호',
        autoSkill: 'none'
    },
    'Cleric': {
        displayName: '클레릭',
        maxHp: 200, atk: 18, def: 16, speed: 11,     // HP 170→200, ATK 22→18(힐러), DEF 14→16
        critRate: 0.06, dodgeRate: 0.05,              // CRIT 8→6%
        aoe: false, projSpeed: 22, projLife: 700,
        healAura: 0.03,                                // 신규: 주변 아군 HP 3%/초 회복
        desc: '신성한 빛으로 공격하며 주변 아군을 자동 치유',
        autoSkill: 'holyLight'
    }
};


const INFINITE_TOWER = {
    maxFloor: 100,
    getMonsters(floor) {
        const count = 3 + Math.floor(floor / 5);
        const hp = 80 + floor * 40;
        const atk = 8 + floor * 3;
        const def = 3 + floor * 1.5;
        let tier = 'normal';
        if (floor >= 10) tier = 'elite';
        if (floor >= 30) tier = 'rare';
        if (floor >= 50) tier = 'boss';
        return { count, hp, atk, def, tier };
    },
    getReward(floor) {
        const gold = 100 + floor * 50;
        const exp = 200 + floor * 80;
        const diamonds = floor % 10 === 0 ? Math.floor(floor / 2) : 0;
        const drops = [];
        if (floor % 10 === 0) drops.push(floor >= 50 ? 'equip_sword_4' : floor >= 20 ? 'equip_sword_3' : 'equip_sword_2');
        if (floor % 25 === 0) drops.push('mat_dragon');
        return { gold, exp, diamonds, drops };
    }
};


const RIFT_THEMES = [
    { id:'frozen', name:'얼어붙은 심연', modifiers:{ atkMulti:1.0, defMulti:0.8, critGlobal:1.3, element:'water' }, color:'#88ccff' },
    { id:'burning', name:'불타는 사막', modifiers:{ atkMulti:1.2, defMulti:1.0, spdMulti:0.8, element:'fire' }, color:'#ff6600' },
    { id:'void', name:'공허의 폭풍', modifiers:{ atkMulti:0.9, defMulti:0.9, expMulti:2.0, element:'wind' }, color:'#aa44ff' },
    { id:'earth', name:'대지의 진동', modifiers:{ atkMulti:1.1, defMulti:1.3, goldMulti:1.5, element:'earth' }, color:'#88aa44' },
];


const RUNES = {
    'ㄱ':{name:'기',stat:'atk',value:3}, 'ㄴ':{name:'나',stat:'def',value:3},
    'ㄷ':{name:'다',stat:'hp',value:15}, 'ㄹ':{name:'라',stat:'spd',value:1},
    'ㅁ':{name:'마',stat:'mp',value:10}, 'ㅂ':{name:'바',stat:'crit',value:0.02},
    'ㅅ':{name:'사',stat:'dodge',value:0.01}, 'ㅇ':{name:'아',stat:'exp',value:0.03},
    'ㅈ':{name:'자',stat:'gold',value:0.03}, 'ㅊ':{name:'차',stat:'atk',value:5},
    'ㅋ':{name:'카',stat:'def',value:5}, 'ㅌ':{name:'타',stat:'hp',value:25},
    'ㅍ':{name:'파',stat:'crit',value:0.03}, 'ㅎ':{name:'하',stat:'all',value:2},
    // 신규 5종 (상위)
    'ㅏ':{name:'아아',stat:'atk',value:8},     'ㅓ':{name:'어',stat:'def',value:8},
    'ㅗ':{name:'오',stat:'hp',value:50},       'ㅜ':{name:'우',stat:'crit',value:0.05},
    'ㅡ':{name:'으',stat:'all',value:5},
};


const RUNE_WORDS = {
    'ㄱㅂㅊ': { name:'용의 숨결', effect:'fireAoe', desc:'공격 시 10% 확률 화염 광역', bonus:{atk:20} },
    'ㄴㅋㅌ': { name:'철벽',     effect:'shield',  desc:'피격 시 15% 확률 1초 무적', bonus:{def:30} },
    'ㄹㅅㅍ': { name:'질풍',     effect:'haste',   desc:'킬 시 3초간 속도 2배', bonus:{spd:5} },
    'ㅁㅇㅎ': { name:'지혜의 빛', effect:'expUp',   desc:'EXP +25% 상시', bonus:{exp:0.25} },
    'ㄱㄴㄷ': { name:'초심',     effect:'regen',   desc:'HP 리젠 +3%', bonus:{hpRegen:0.03} },
    'ㅊㅋㅌ': { name:'파괴자',   effect:'execute', desc:'HP 20%↓ 적에게 데미지 x2', bonus:{atk:15} },
    'ㅂㅅㅍ': { name:'행운',     effect:'luck',    desc:'드롭률 +30%', bonus:{dropRate:0.3} },
    'ㄱㄷㅌ': { name:'대지의 힘', effect:'earth',  desc:'HP +300, DEF +20', bonus:{hp:300, def:20} },
    'ㄹㅁㅇ': { name:'바람의 손', effect:'wind',   desc:'공격 속도 +20%, SPD +3', bonus:{spd:3, atkSpeed:0.2} },
    'ㅂㅈㅎ': { name:'별의 축복', effect:'star',   desc:'모든 스탯 +5', bonus:{atk:5, def:5, hp:50} },
    'ㄴㄹㅅ': { name:'그림자 걸음', effect:'shadow', desc:'회피 +8%, 크리 +5%', bonus:{dodge:0.08, crit:0.05} },
    'ㅊㅍㅎ': { name:'불멸',     effect:'immortal',desc:'HP 10% 이하 시 3초간 무적 (60초 CD)', bonus:{atk:10, hp:100} },
    // 신규 룬 워드 (상위 룬 사용)
    'ㅏㅗㅡ': { name:'태초의 분노', effect:'primalRage', desc:'ATK +50, HP +200', bonus:{atk:50, hp:200} },
    'ㅓㅗㅜ': { name:'성벽',     effect:'fortress', desc:'DEF +60, HP +400', bonus:{def:60, hp:400} },
    'ㅏㅓㅜ': { name:'완벽',     effect:'perfect',  desc:'크리 +15%, 회피 +5%', bonus:{crit:0.15, dodge:0.05} },
    'ㅏㅡㅎ': { name:'폭풍의 군주', effect:'storm',  desc:'전체 스탯 +12, SPD +5', bonus:{atk:12, def:12, hp:120, spd:5} },
    'ㅗㅜㅡ': { name:'운명',     effect:'fate',     desc:'EXP/골드 +50%, 드롭률 +25%', bonus:{exp:0.5, gold:0.5, dropRate:0.25} },
};


const FACTIONS = {
    sun:  { name:'태양 기사단', color:'#ffd700', bonus:'atk', bonusValue:0.05 },
    moon: { name:'달빛 마법단', color:'#aaccff', bonus:'exp', bonusValue:0.08 },
    star: { name:'별의 수호자', color:'#ffaacc', bonus:'def', bonusValue:0.05 },
};


const LEGACY_PERKS = [
    { name:'골드 마스터', desc:'기본 골드 +10%', stat:'goldBonus', value:0.10 },
    { name:'전투 본능', desc:'기본 ATK +5', stat:'atk', value:5 },
    { name:'강철 체력', desc:'기본 HP +50', stat:'hp', value:50 },
    { name:'행운의 별', desc:'크리티컬 +3%', stat:'crit', value:0.03 },
    { name:'빠른 발', desc:'이동속도 +2', stat:'spd', value:2 },
    { name:'현자의 지혜', desc:'EXP +15%', stat:'expBonus', value:0.15 },
    { name:'수호의 기운', desc:'DEF +5', stat:'def', value:5 },
    { name:'도적의 손길', desc:'드롭률 +10%', stat:'dropRate', value:0.10 },
    { name:'용사의 혼', desc:'전체 스탯 +3%', stat:'allMulti', value:0.03 },
    { name:'불멸의 의지', desc:'사망 시 HP 10% 부활 (10분 CD)', stat:'autoRevive', value:0.1 },
];


const ZONE_MINI_BOSSES = {
    forest:    { name:'숲의 수호자', hp:3000, atk:40, def:15, reward:{gold:500,exp:800} },
    swamp:     { name:'늪의 군주', hp:5000, atk:60, def:20, reward:{gold:800,exp:1200} },
    desert:    { name:'사막의 왕', hp:5000, atk:65, def:18, reward:{gold:800,exp:1200} },
    cave:      { name:'동굴의 감시자', hp:8000, atk:80, def:30, reward:{gold:1200,exp:2000} },
    volcano:   { name:'화염의 군주', hp:12000, atk:100, def:40, reward:{gold:2000,exp:3000} },
    darkforest:{ name:'그림자의 왕', hp:15000, atk:120, def:45, reward:{gold:2500,exp:4000} },
    dragon:    { name:'고룡', hp:25000, atk:150, def:60, reward:{gold:5000,exp:8000} },
    abyss:     { name:'심연의 눈', hp:30000, atk:180, def:70, reward:{gold:8000,exp:12000} },
    celestial: { name:'천상의 수호자', hp:40000, atk:200, def:80, reward:{gold:10000,exp:15000} },
};


const ZONE_HAZARDS = {
    swamp:      { type:'poison',  dps:3,  interval:3000, msg:'독안개에 중독되고 있다!', color:'#44cc44' },
    toxic_marsh:{ type:'poison',  dps:5,  interval:2500, msg:'맹독 안개! 빨리 벗어나자!', color:'#22aa22' },
    volcano:    { type:'fire',    dps:8,  interval:2000, msg:'발밑이 뜨겁다! 화상!', color:'#ff4400' },
    magma_core: { type:'fire',    dps:12, interval:2000, msg:'용암에 타고 있다!', color:'#ff2200' },
    glacier:    { type:'freeze',  dps:4,  interval:3000, msg:'얼어붙고 있다... 속도 감소!', color:'#88ccff', slow:0.3 },
    frozen_deep:{ type:'freeze',  dps:6,  interval:2500, msg:'극한의 추위! 이동 불가 직전!', color:'#4488ff', slow:0.5 },
    void_rift:  { type:'void',    dps:15, interval:1500, msg:'공허의 힘이 생명을 빨아들인다!', color:'#aa44ff', manaDrain:20 },
    abyss:      { type:'void',    dps:10, interval:2000, msg:'심연의 기운이 정신을 갉아먹는다.', color:'#6622aa', manaDrain:10 },
    hell:       { type:'fire',    dps:10, interval:2000, msg:'지옥불이 타오른다!', color:'#ff0000' },
};


const CLAN_RAIDS = {
    raid_cave:  { name:'혈맹 동굴 레이드', clanLevel:2, minMembers:3, waves:5, bossHp:10000, bossAtk:40, reward:{gold:3000,exp:5000,diamonds:30} },
    raid_dragon:{ name:'혈맹 드래곤 레이드', clanLevel:3, minMembers:4, waves:7, bossHp:30000, bossAtk:80, reward:{gold:8000,exp:15000,diamonds:80} },
    raid_void:  { name:'혈맹 공허 레이드', clanLevel:5, minMembers:5, waves:10, bossHp:80000, bossAtk:150, reward:{gold:20000,exp:40000,diamonds:200} },
    raid_titan: { name:'혈맹 거인 레이드', clanLevel:4, minMembers:6, waves:8, bossHp:60000, bossAtk:120, reward:{gold:15000,exp:30000,diamonds:150,item:'mat_dragon',itemQty:5} },
    raid_celestial:{ name:'혈맹 천상 레이드', clanLevel:5, minMembers:8, waves:12, bossHp:120000, bossAtk:200, reward:{gold:30000,exp:60000,diamonds:300,item:'equip_mythic_armor',itemQty:1} },
};


const FISH_TABLE = [
    { name:'잡어',     grade:'common', sell:5,   weight:50, minLevel:1 },
    { name:'붕어',     grade:'common', sell:10,  weight:30, minLevel:1 },
    { name:'잉어',     grade:'uncommon', sell:30, weight:20, minLevel:3 },
    { name:'송어',     grade:'uncommon', sell:50, weight:15, minLevel:5 },
    { name:'연어',     grade:'rare',   sell:100, weight:8,  minLevel:8 },
    { name:'참치',     grade:'rare',   sell:200, weight:5,  minLevel:12 },
    { name:'황금 잉어', grade:'epic',   sell:500, weight:2,  minLevel:15 },
    { name:'용왕의 물고기', grade:'legendary', sell:2000, weight:0.5, minLevel:25 },
];


const ELEMENTS = ['fire', 'water', 'wind', 'earth'];

module.exports = { CLASSES, INFINITE_TOWER, RIFT_THEMES, RUNES, RUNE_WORDS, FACTIONS, LEGACY_PERKS, ZONE_MINI_BOSSES, ZONE_HAZARDS, CLAN_RAIDS, FISH_TABLE, ELEMENTS };
