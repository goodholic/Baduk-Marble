// 월드 데이터 (순수 데이터, 함수 없음) — v1.37 Phase 1 추출
// server.js에서 분리된 데이터 모듈
// 함수 종속성 0 — 안전하게 require로 가져올 수 있음

const ELEMENT_BONUS = { fire: 'water', water: 'wind', wind: 'earth', earth: 'fire' }; // 상성

// v2.58 밸런스 패치: 몬스터 스탯 & 보상 재조정
const MONSTER_TIERS = {
    normal: {
        name: '슬라임', hp: 100, atk: 14, def: 4,        // HP 80→100, ATK 12→14
        expReward: 22, goldReward: 12, color: '#88cc88',   // EXP 18→22, Gold 10→12
        spawnWeight: 45,                                     // 비중 50→45
        dropChance: 0.02,                                    // 장비 드롭 2%
    },
    elite: {
        name: '오크 전사', hp: 350, atk: 32, def: 14,     // HP 300→350, ATK 28→32
        expReward: 80, goldReward: 50, color: '#ccaa44',   // EXP 65→80, Gold 40→50
        spawnWeight: 28,                                     // 비중 25→28
        dropChance: 0.05,                                    // 장비 드롭 5%
    },
    rare: {
        name: '다크 나이트', hp: 900, atk: 55, def: 24,   // HP 800→900, ATK 50→55
        expReward: 200, goldReward: 120, color: '#aa44cc', // EXP 160→200, Gold 100→120
        spawnWeight: 15,                                     // 비중 12→15
        dropChance: 0.12,                                    // 장비 드롭 12%
        minGrade: 'uncommon',                                // 최소 고급 등급
    },
    boss: {
        name: '드래곤', hp: 2500, atk: 65, def: 32,       // HP 2000→2500, ATK 60→65
        expReward: 750, goldReward: 400, color: '#ff4444', // EXP 600→750, Gold 350→400
        spawnWeight: 5,
        dropChance: 0.25,                                    // 장비 드롭 25%
        minGrade: 'rare',                                    // 최소 희귀 등급
    },
    legendary: {
        name: '고대 드래곤', hp: 10000, atk: 110, def: 55, // HP 8000→10000, ATK 100→110
        expReward: 2500, goldReward: 1200, color: '#ff8800',// EXP 2000→2500, Gold 1000→1200
        spawnWeight: 1,
        dropChance: 0.50,                                    // 장비 드롭 50%
        minGrade: 'epic',                                    // 최소 영웅 등급
    },
    mythic: {
        name: '태초의 존재', hp: 35000, atk: 220, def: 110,// HP 30000→35000, ATK 200→220
        expReward: 10000, goldReward: 6000, color: '#ff00ff',// EXP 8000→10000, Gold 5000→6000
        spawnWeight: 0,
        dropChance: 0.80,                                    // 장비 드롭 80%
        minGrade: 'legendary',                               // 최소 전설 등급
    }
};

const KARMA = {
    PK_PENALTY: 100,         // PK 1회당 카르마 증가
    DECAY_PER_MIN: 5,        // 분당 카르마 자연 감소
    CHAOTIC_THRESHOLD: 200,  // 이 이상이면 '카오틱' 상태
    DEATH_GOLD_LOSS: 0.10,   // 카오틱 사망 시 골드 10% 손실
    DEATH_EXP_LOSS: 0.05,    // 카오틱 사망 시 경험치 5% 손실
    BOUNTY_BONUS: 1.5        // 카오틱 처치 시 보상 1.5배
};

const WORLD_BOSS_TYPES = [
    { name:'태고의 드래곤', hp:50000, atk:120, def:50, expReward:5000, goldReward:3000, tier:'worldboss', color:'#FF0000' },
    { name:'심연의 군주',   hp:80000, atk:150, def:70, expReward:8000, goldReward:5000, tier:'worldboss', color:'#8800FF' },
    { name:'불멸의 피닉스', hp:60000, atk:130, def:40, expReward:6000, goldReward:4000, tier:'worldboss', color:'#FF8800' },
    // ── v1.13 신규 월드 보스 ──
    { name:'폭풍의 거인',   hp:100000, atk:140, def:90, expReward:10000, goldReward:6000, tier:'worldboss', color:'#00DDFF' },
    { name:'시간의 수호자', hp:70000,  atk:170, def:60, expReward:9000,  goldReward:7000, tier:'worldboss', color:'#FFD700' },
];

const DUNGEONS = {
    cave_dungeon: {
        name: '어둠의 동굴', zoneId: 'cave', minLevel: 15, maxParty: 5, stages: 3,
        monsters: [
            { tier:'elite', count:5 }, { tier:'elite', count:8 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 2000, exp: 3000, drops: ['equip_sword_3','equip_armor_3'] }
    },
    ruins_dungeon: {
        name: '지하 감옥', zoneId: 'ruins', minLevel: 20, maxParty: 5, stages: 5,
        monsters: [
            { tier:'elite', count:5 }, { tier:'rare', count:3 }, { tier:'elite', count:8 },
            { tier:'rare', count:5 }, { tier:'boss', count:2 }
        ],
        rewards: { gold: 5000, exp: 8000, drops: ['equip_sword_4','equip_armor_4','equip_ring_3'] }
    },
    dragon_raid: {
        name: '드래곤 둥지 레이드', zoneId: 'dragon', minLevel: 25, maxParty: 25, stages: 3,
        monsters: [
            { tier:'rare', count:10 }, { tier:'boss', count:3 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 15000, exp: 20000, drops: ['equip_sword_5','equip_armor_5'] }
    },
    frozen_temple: {
        name: '얼어붙은 신전', zoneId: 'glacier', minLevel: 18, maxParty: 5, stages: 4,
        monsters: [
            { tier:'normal', count:8 }, { tier:'elite', count:6 }, { tier:'rare', count:4 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 4000, exp: 6000, drops: ['equip_helm_3','equip_glove_3','equip_boots_3'] }
    },
    void_abyss: {
        name: '공허의 심연', zoneId: 'void_rift', minLevel: 35, maxParty: 10, stages: 6,
        monsters: [
            { tier:'rare', count:5 }, { tier:'boss', count:2 }, { tier:'rare', count:8 },
            { tier:'boss', count:3 }, { tier:'legendary', count:1 }, { tier:'boss', count:1 }
        ],
        rewards: { gold: 30000, exp: 50000, drops: ['equip_mythic_sword','equip_mythic_armor','equip_mythic_ring','mat_dragon'] }
    },
    holy_sanctuary: {
        name: '신성한 성역', zoneId: 'celestial', minLevel: 30, maxParty: 5, stages: 5,
        monsters: [
            { tier:'elite', count:6 }, { tier:'rare', count:4 }, { tier:'boss', count:2 },
            { tier:'rare', count:6 }, { tier:'legendary', count:1 }
        ],
        rewards: { gold: 12000, exp: 18000, drops: ['equip_sword_4','equip_cape_4','equip_belt_4'] }
    },
    // ── v1.10 신규 던전 ──
    shadow_labyrinth: {
        name: '그림자 미궁', zoneId: 'shadow', minLevel: 38, maxParty: 8, stages: 7,
        monsters: [
            { tier:'rare', count:6 }, { tier:'elite', count:10 }, { tier:'rare', count:8 },
            { tier:'boss', count:2 }, { tier:'rare', count:10 }, { tier:'boss', count:3 },
            { tier:'legendary', count:1 }
        ],
        rewards: { gold: 22000, exp: 32000, drops: ['equip_sword_5','equip_cape_5','equip_helm_5','equip_glove_5'] }
    },
};

const ATTENDANCE_REWARDS = [
    {day:1, reward:'100G'},  {day:2, reward:'200G'},  {day:3, reward:'300G + 10D'},
    {day:4, reward:'400G'},  {day:5, reward:'500G + 15D'}, {day:6, reward:'600G'},
    {day:7, reward:'희귀 상자'},  {day:8, reward:'800G'},  {day:9, reward:'900G'},
    {day:10, reward:'1000G + 30D'}, {day:11, reward:'1100G'}, {day:12, reward:'1200G'},
    {day:13, reward:'1300G + 20D'}, {day:14, reward:'전설 재료 x3'},
    {day:15, reward:'1500G'}, {day:16, reward:'1600G'}, {day:17, reward:'1700G + 30D'},
    {day:18, reward:'1800G'}, {day:19, reward:'1900G'}, {day:20, reward:'2000G + 50D'},
    {day:21, reward:'영웅 장비 상자'}, {day:22, reward:'2200G'}, {day:23, reward:'2300G'},
    {day:24, reward:'2400G + 40D'}, {day:25, reward:'2500G'}, {day:26, reward:'2600G'},
    {day:27, reward:'2700G + 50D'}, {day:28, reward:'전설 장비 상자 + 칭호'},
];

// ═══ v3.7 재앙 이벤트 데이터 ═══
const DISASTER_EVENTS = {
    meteor_shower:   { name: '유성우',       triggerMin: 5,  durationSec: 15, dmg: 300, warningMs: 2000, rewardType: 'meteor_fragment' },
    plague_fog:      { name: '역병의 안개',   triggerMin: 3.5, durationSec: 60, dot: 30,  shrinkRate: 2,   rewardType: 'plague_crystal' },
    dimension_rift:  { name: '차원 균열',     triggerMin: 4,  durationSec: 30, portalCount: 4, bossMultiplier: 2, rewardType: 'dimension_gear' },
    demon_lord:      { name: '마왕 강림',     triggerMin: 7,  durationSec: 60, hpMultiplier: 5, ceasefire: true, rewardType: 'demon_loot' },
    gold_rush:       { name: '골드 러시',     triggerMin: -1, durationSec: 20, monsterCount: 30, goldMultiplier: 10, rewardType: 'gold' },
    time_rewind:     { name: '시간 역행',     triggerMin: 6,  durationSec: 1,  rewindSec: 30, rewardType: 'time_shard' },
    elemental_storm: { name: '엘리멘탈 폭풍', triggerMin: 4.5, durationSec: 30, dmgMultiplier: 2, rewardType: 'elemental_crystal' },
    gravity_anomaly: { name: '중력 이상',     triggerMin: -1, durationSec: 30, modes: ['reverse','low','high'], rewardType: null },
    treasure_ship:   { name: '보물선 출현',   triggerMin: 5.5, durationSec: 30, rewardType: 'treasure_chest' },
    divine_blessing: { name: '신들의 축복',   triggerMin: 2,  durationSec: 10, rare: true, rewardType: 'blessing_choice' },
};

// ═══ v3.7 차원 균열 데이터 ═══
const DIMENSION_RIFTS = {
    fire:      { name: '화염 차원',  color: '#ff4400', envDot: 10, bossName: '화염 군주',     weakness: 'water',    rewardEssence: 'fire_essence' },
    ice:       { name: '빙결 차원',  color: '#4488ff', envEffect: 'slip', bossName: '빙결의 여왕', weakness: 'fire',  rewardEssence: 'ice_essence' },
    lightning: { name: '번개 차원',  color: '#ffff44', envEffect: 'stun', bossName: '뇌신',       weakness: 'earth',   rewardEssence: 'lightning_essence' },
    poison:    { name: '독 차원',    color: '#44cc44', envEffect: 'fog',  bossName: '독의 여제',   weakness: 'holy',    rewardEssence: 'poison_essence' },
    void:      { name: '공허 차원',  color: '#8844ff', envEffect: 'float',bossName: '공허의 군주', weakness: null,      rewardEssence: 'void_essence' },
    time:      { name: '시간 차원',  color: '#ffffff', envEffect: 'accel',bossName: '시간의 지배자',weakness: null,     rewardEssence: 'time_essence' },
    mirror:    { name: '거울 차원',  color: '#cccccc', envEffect: 'clone',bossName: '미러 셀프',   weakness: null,      rewardEssence: 'mirror_shard' },
    chaos:     { name: '혼돈 차원',  color: '#ff00ff', envEffect: 'random',bossName: '혼돈의 화신',weakness: null,     rewardEssence: 'chaos_essence' },
};

// ═══ v3.7 공성전 맵 테마 ═══
const SIEGE_MAPS = {
    plains:    { name: '초원의 성',     gridSize: [30,30], trapSlots: 15, structSlots: 20, specialEnv: null },
    mountain:  { name: '산악 요새',     gridSize: [30,40], trapSlots: 20, structSlots: 15, specialEnv: 'rockfall' },
    volcano:   { name: '화산 분화구',   gridSize: [35,35], trapSlots: 12, structSlots: 12, specialEnv: 'lava_eruption' },
    pirate:    { name: '해적 섬 요새',  gridSize: [40,40], trapSlots: 18, structSlots: 18, specialEnv: 'waves' },
    ruins:     { name: '고대 유적',     gridSize: [35,30], trapSlots: 25, structSlots: 10, specialEnv: 'ancient_traps' },
    sky:       { name: '하늘 성',       gridSize: [30,30], trapSlots: 10, structSlots: 15, specialEnv: 'wind' },
    underground:{ name: '지하 던전',    gridSize: [40,30], trapSlots: 22, structSlots: 12, specialEnv: 'darkness' },
    glacier:   { name: '빙하 성',       gridSize: [35,35], trapSlots: 16, structSlots: 16, specialEnv: 'blizzard' },
    demon:     { name: '마왕의 성',     gridSize: [50,50], trapSlots: 30, structSlots: 25, specialEnv: 'dark_aura' },
};

// ═══ v3.7 영토 데이터 ═══
const TERRITORIES = {
    grassland:   { name: '초원의 왕국',   taxPerHour: 1000,  specialty: ['grain','leather'],     danger: 1, bonus: 'food+50%' },
    iron_peak:   { name: '철의 산맥',     taxPerHour: 2500,  specialty: ['iron','mithril'],      danger: 2, bonus: 'craft-30%' },
    magic_forest:{ name: '마법의 숲',     taxPerHour: 2000,  specialty: ['mana_stone','herbs'],   danger: 2, bonus: 'research-30%' },
    dragon_peak: { name: '용의 봉우리',   taxPerHour: 5000,  specialty: ['dragon_scale','firestone'], danger: 4, bonus: 'dragonMerc+30%' },
    pirate_port: { name: '해적의 항구',   taxPerHour: 3000,  specialty: ['rum','seafood','contraband'], danger: 3, bonus: 'seaTrade x2' },
    ancient_site:{ name: '고대 유적지',   taxPerHour: 3500,  specialty: ['relics','ancient_blueprints'], danger: 3, bonus: 'explore-50%' },
    dark_city:   { name: '암흑 도시',     taxPerHour: 4000,  specialty: ['poison','curse_mats','intel'], danger: 4, bonus: 'spy+100%' },
    celestial:   { name: '천공의 섬',     taxPerHour: 4500,  specialty: ['angel_feather','blessing_stone'], danger: 4, bonus: 'holy+20%' },
    time_tower:  { name: '시간의 탑',     taxPerHour: 6000,  specialty: ['time_shard','history_book'], danger: 5, bonus: 'cooldown-15%' },
    chaos_rift:  { name: '혼돈의 균열',   taxPerHour: 0,     specialty: ['chaos_essence','world_shard'], danger: 5, bonus: 'random', dynamic: true },
};

module.exports = {
    ELEMENT_BONUS,
    MONSTER_TIERS,
    KARMA,
    WORLD_BOSS_TYPES,
    DUNGEONS,
    ATTENDANCE_REWARDS,
    DISASTER_EVENTS,
    DIMENSION_RIFTS,
    SIEGE_MAPS,
    TERRITORIES,
};
