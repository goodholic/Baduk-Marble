// ==========================================
// AutoBattle.io — Lineage-like Auto-Battle RPG Server
// Node.js + Socket.IO + MySQL
// ==========================================

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Phase 1 refactor: DB pool + HTTP routes 분리
const { pool, initDB } = require('./server/db');
const httpRoutes = require('./server/routes');
// Phase 2 refactor: 월드/지형 헬퍼 분리
const world = require('./game/world');
const { isOnRoad, isBlocked, isSlowTerrain, getZone, getNpcMsg } = world;
// Phase 4 refactor: 게임 루프 분리
const loops = require('./game/loops');
// Phase 5 refactor: 소켓 핸들러 분리
const { registerConnection } = require('./game/handlers/connection');
// Helper functions
const serverHelpers = require('./game/server_helpers');
const questChain = require('./game/quest_chain');
const bossSummon = require('./game/boss_summon');
const weatherDungeon = require('./game/weather_dungeon');
const pvpMatch = require('./game/pvp_matchmaking');
const bountyHunter = require('./game/bounty_hunter');
const raceSystem = require('./game/race_system');
const relicFusion = require('./game/relic_fusion');
const skillWave = require('./game/skill_wave');
const achievements = require('./game/achievements');
const superBoss = require('./game/super_boss');
const territoryWar = require('./game/territory_war');
const wishTree = require('./game/wish_tree');
const soulSystem = require('./game/soul_system');
const timeDungeon = require('./game/time_dungeon');
const mythicSummon = require('./game/mythic_summon');
const ancientRuins = require('./game/ancient_ruins');
const worldChronicle = require('./game/world_chronicle');
const { handleRaidFinish, codexDiscover, finishBossRush, updateTownPrices, generateRandomOptions, logWorldEvent } = serverHelpers;
const { expireMarketListings, destroyAxe, syncGameState, updatePassives, updatePlayerAutoSkills, updateBots, giveExp, handleCollisions, handleAoeDamage, handlePlayerDeath } = loops;
// Phase 3 refactor: 전투/스폰/랭킹 모듈
const combat = require('./game/combat');
const {
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, ARENA_TIERS,
    getEnchantBonus, capResources, getArenaTier,
    calcDamage, getTodaysChallenge, getThisWeekChallenge,
    DAILY_CHALLENGES, WEEKLY_CHALLENGES,
    recalcStats, trackQuest,
    spawnMonster, endArenaMatch, spawnWorldBoss, spawnDrop,
    updateRankings, checkWeeklyRankingRewards,
} = combat;

// 게임 모듈
const { RECIPES, handleCraft } = require('./game/craft');
const { PETS, MOUNTS, handleBuyPet, handleBuyMount, getPetEffect, getMountSpeed, handleEvolvePet, PET_EVOLVE_COST } = require('./game/pet');
const { BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles, getTitleBonus } = require('./game/buff');
// v1.26: 행운의 룰렛 모듈 통합
const lottery = require('./game/lottery');
// v1.27: 낚시 모듈 통합
const fishing = require('./game/fishing');
// v1.28: 시즌 축제 이벤트 모듈 통합
const festival = require('./game/event');
// v1.29: 시즌 패스 모듈 통합
const seasonPass = require('./game/season');
// v1.30: 보스 러시 모듈 통합
const bossRush = require('./game/boss_rush');
// v1.31: 경매장 모듈 통합 (마지막 신규 모듈)
const auction = require('./game/auction');
// v1.32: 일일 상점 모듈 (생성 + 통합 동시)
const dailyShop = require('./game/dailyshop');
// v1.33: 도감 모듈 (생성 + 통합 동시)
const codex = require('./game/codex');
// v1.34: 우편함 모듈 (생성 + 통합 동시)
const mailbox = require('./game/mail');
// v1.35: 특성 트리 모듈 (생성 + 통합 동시)
const skillTree = require('./game/skill_tree');
// v1.36: 농장 모듈 (생성 + 통합 동시)
const farm = require('./game/farm');
// v1.37 Phase 1: 순수 데이터 추출 (server.js → game/data/world_data.js)
const {
    ELEMENT_BONUS,
    MONSTER_TIERS,
    KARMA,
    WORLD_BOSS_TYPES,
    DUNGEONS,
    ATTENDANCE_REWARDS,
} = require('./game/data/world_data');
// v1.38 Phase 2: 지역 데이터 추출 (server.js → game/data/zones.js)
const {
    ZONES,
    ZONE_AMBIENCE,
    MONSTER_LORE,
    ZONE_CONNECTIONS,
    TERRAIN_BARRIERS,
    ROADS,
    ZONE_MONSTERS,
    ZONE_MONSTER_NAMES,
} = require('./game/data/zones');
// v1.39 Phase 3: 장비 데이터 추출 (server.js → game/data/equipment.js)
const {
    EQUIPMENT_SLOTS,
    EQUIPMENT_SETS,
    GRADE_INFO,
    RANDOM_OPTIONS,
    EQUIP_STATS,
    EQUIP_DESCRIPTIONS,
} = require('./game/data/equipment');
// v1.40 Phase 4: 퀘스트/스킬/전직 데이터 추출 (server.js → game/data/quests.js)
const { QUESTS, SKILLS, CLASS_ADVANCE } = require('./game/data/quests');
const {
    CLASSES, ELEMENTS, RUNES, RUNE_WORDS, FACTIONS, LEGACY_PERKS,
    INFINITE_TOWER, RIFT_THEMES, ZONE_MINI_BOSSES, ZONE_HAZARDS,
    CLAN_RAIDS, FISH_TABLE,
} = require('./game/data/server_data');
// v1.41 Phase 5: 경제/사회 데이터 추출 — 마스터 플랜 마지막 (server.js → game/data/economy.js)
const {
    DIAMOND_PRODUCTS,
    NPCS,
    TRADE_GOODS,
    TAME_RATES,
    TAME_COSTS,
    SHOP_ITEMS,
    FREE_DIAMOND_SOURCES,
    TRADEABLE_ITEMS,
    CLAN_LEVEL_EXP,
    CLAN_MAX_MEMBERS,
    CLAN_SKILLS,
    EMOTES,
} = require('./game/data/economy');
// v1.42: 펫 배틀 모듈 (생성 + 통합 동시)
const petBattle = require('./game/pet_battle');
// v1.43: 순수 헬퍼 함수 추출 (server.js → game/helpers.js)
const { getExpRequired, getYesterday, getWeekNumber } = require('./game/helpers');
// v1.44: 몬스터 스폰 함수 추출 (server.js → game/monster_spawn.js)
const { pickMonsterTier, pickZoneTier, scaleMonster } = require('./game/monster_spawn');
// v1.45: 일일 훈련 모듈 (생성 + 통합 동시)
const training = require('./game/training');
const TRAINING_DRILLS_NAMES = {
    combat:'전투 훈련', defense:'방어 훈련', agility:'민첩 훈련',
    wisdom:'지혜 훈련', lucky:'행운 훈련'
};
// v1.46: 보물 지도 모듈 (생성 + 통합 동시)
const treasureMap = require('./game/treasure_map');
// v1.47: 유물 모듈 (생성 + 통합 동시)
const relic = require('./game/relic');
// v1.48: 펫 교배 모듈 (생성 + 통합 동시)
const breeding = require('./game/breeding');
// v1.49: 룬 모듈 (생성 + 통합 동시)
const runes = require('./game/runes');
// v1.50: 종합 랭킹 모듈 (50번째 패치 마일스톤)
const leaderboard = require('./game/leaderboard');
// v1.51: 암시장 모듈 (생성 + 통합 동시)
const blackMarket = require('./game/black_market');
let currentBlackMarket = blackMarket.generateMarket();
// v1.52: 부직업 모듈 (생성 + 통합 동시)
const jobs = require('./game/jobs');
// v1.53: 변환 모듈 (생성 + 통합 동시)
const transmutation = require('./game/transmutation');
// v1.54: 레이드 모듈 (생성 + 통합 동시)
const raid = require('./game/raid');
// v1.55: 원정 모듈 (생성 + 통합 동시)
const expedition = require('./game/expedition');
// v1.56: 장비 보험 모듈 (생성 + 통합 동시)
const insurance = require('./game/insurance');
// v1.57: 일일 운세 모듈 (생성 + 통합 동시)
const fortune = require('./game/fortune');
// v1.58: 트랜스모그 모듈 (생성 + 통합 동시)
const transmog = require('./game/transmog');
// v1.59: 우체국 모듈 (생성 + 통합 동시)
const postoffice = require('./game/postoffice');
// v1.60: 월드 이벤트 모듈 (60번째 패치 마일스톤)
const worldEvent = require('./game/world_event');
// v1.61: 동료 모듈 (생성 + 통합 동시)
const companion = require('./game/companion');
// v1.62: 지혜 모듈 (생성 + 통합 동시)
const wisdom = require('./game/wisdom');
// v1.63: PvP 토너먼트 모듈 (생성 + 통합 동시)
const pvpTournament = require('./game/pvp_tournament');
// v1.64: 길드 전쟁 모듈 (생성 + 통합 동시)
const guildWar = require('./game/guild_war');
// v1.65: 칭호 컬렉션 모듈 (생성 + 통합 동시)
const titleCollection = require('./game/title_collection');
// v1.66: 잭팟 복권 모듈 (생성 + 통합 동시)
const lotteryJackpot = require('./game/lottery_jackpot');
// v1.67: 던전 열쇠 모듈 (생성 + 통합 동시)
const dungeonKeys = require('./game/dungeon_keys');
// v1.68: 도서관 모듈 (생성 + 통합 동시)
const library = require('./game/library');
// v1.69: 신의 축복 모듈 (생성 + 통합 동시)
const blessing = require('./game/blessing');
// v1.70: 서버 뉴스 보드 모듈 (70번째 패치 마일스톤)
const newsBoard = require('./game/news_board');
// v1.71: 계약 모듈 (생성 + 통합 동시)
const contracts = require('./game/contracts');
// v1.72: 도면 모듈 (생성 + 통합 동시)
const blueprint = require('./game/blueprint');
// v1.73: 영토 모듈 (생성 + 통합 동시)
const territory = require('./game/territory');
// v1.74: 여관 모듈 (생성 + 통합 동시)
const inn = require('./game/inn');
// v1.75: 통합 대시보드 모듈 (50 모듈 마일스톤)
const dashboard = require('./game/dashboard');
// v1.76: 오라 모듈 (생성 + 통합 동시)
const aura = require('./game/aura');
// v1.77: 여권 모듈 (생성 + 통합 동시)
const passport = require('./game/passport');
// v1.78: 명예 모듈 (생성 + 통합 동시)
const honor = require('./game/honor');
// v1.79: 초대 모듈 (생성 + 통합 동시)
const invitation = require('./game/invitation');
// v1.80: 시간 캡슐 모듈 (80번째 패치 마일스톤)
const timeCapsule = require('./game/time_capsule');
// v1.81: 서버 통계 모듈 (생성 + 통합 동시)
const statistics = require('./game/statistics');
// v1.82~: 핸들러 분리 리팩토링
// v1.90: 일기장 모듈 (생성 + 통합 + 핸들러 분리)
const diary = require('./game/diary');

// v1.91: 명상 모듈
const meditation = require('./game/meditation');

// v1.92: 요리 모듈
const cooking = require('./game/cooking');

// v1.93: 별자리 모듈
const constellation = require('./game/constellation');

// v1.94: 기상 모듈
const weather = require('./game/weather');

// v1.95: 보석 세공 모듈
const gemcraft = require('./game/gemcraft');

// v1.96: 신탁 모듈
const oracle = require('./game/oracle');

// v1.97: 채집 모듈
const gathering = require('./game/gathering');

// v1.98: 제련 모듈
const forge = require('./game/forge');

// v1.99: 위인 전당 모듈
const legends = require('./game/legends');

// v2.0 마일스톤: 보너스 집계 모듈 (v1.91~v1.99 active bonus 통합)
const bonusAggregator = require('./game/bonus_aggregator');

// v2.01: 변신 모듈
const morph = require('./game/morph');

// v2.02: 차원문 모듈
const waypoint = require('./game/waypoint');

// v2.03: 친구/우정 모듈
const friends = require('./game/friends');

// v2.04: 프로필 카드 모듈
const profile = require('./game/profile');

// v2.05: 카지노 모듈
const casino = require('./game/casino');

// v2.06: 이모트 모듈
const emote = require('./game/emote');

// v2.07: 미궁 모듈
const labyrinth = require('./game/labyrinth');

// v2.08: 항해 모듈
const sailing = require('./game/sailing');

// v2.09: 유물 발굴 모듈
const excavation = require('./game/excavation');

// v2.10: 꿈 모듈
const dream = require('./game/dream');

// v2.11: 음악/연주 모듈
const music = require('./game/music');

// v2.12: 타로 모듈
const tarot = require('./game/tarot');

// v2.13: 부적 모듈
const talisman = require('./game/talisman');

// v2.14: 소원의 우물 모듈
const wishingWell = require('./game/wishing_well');

// v2.15: 가면 모듈
const mask = require('./game/mask');

// v2.16: 가문 문장 모듈
const heraldry = require('./game/heraldry');

// v2.17: 차원 균열 모듈
const rift = require('./game/rift');

// v2.18: 정원 모듈
const garden = require('./game/garden');

// Phase 2 refactor: world 모듈에 데이터 + lazy getter 주입
// FACTIONS / isNight / currentWeather 는 server.js 후반부에 declared 되므로
// getter 클로저로 전달 (호출 시점에 lexical lookup, TDZ 회피)
world.init({
    ZONES, ROADS, TERRAIN_BARRIERS, NPCS, festival,
    getFACTIONS: () => FACTIONS,
    getIsNight: () => isNight,
    getCurrentWeather: () => currentWeather,
});
// Phase 3: combat 모듈에 데이터 + lazy getter 주입
combat.init({
    ELEMENT_BONUS,
    getCurrentWeather: () => currentWeather,
    // Phase 3c
    EQUIPMENT_SLOTS, EQUIP_STATS, GRADE_INFO, EQUIPMENT_SETS, QUESTS,
    seasonPass, getPetEffect, getTitleBonus, codexDiscover,
    getCLASSES: () => CLASSES,
    getRUNES: () => RUNES,
    getRUNE_WORDS: () => RUNE_WORDS,
    getFACTIONS: () => FACTIONS,
    getSEASON_XP_MAP: () => SEASON_XP_MAP,
    getPlayers: () => players,
    getIo: () => io,
    getQuestChain: () => questChain,
    getAchievements: () => achievements,
    // Phase 3d/3e
    ZONES, ZONE_MONSTERS, ZONE_MONSTER_NAMES, WORLD_BOSS_TYPES, TITLES,
    getELEMENTS: () => ELEMENTS,
    pickZoneTier, scaleMonster, logWorldEvent, getWeekNumber,
    getIsNight: () => isNight,
    getMonsters: () => monsters,
    getDrops: () => drops,
    getArenaMatches: () => arenaMatches,
    getArenaRankings: () => arenaRankings,
    getRankings: () => rankings,
    nextEntityId: () => ++entityIdCounter,
    getWorldBoss: () => worldBoss,
    setWorldBoss: (v) => { worldBoss = v; },
    getLastWeeklyRewardWeek: () => lastWeeklyRewardWeek,
    setLastWeeklyRewardWeek: (v) => { lastWeeklyRewardWeek = v; },
});
// Phase 4: loops 모듈에 lazy state 주입
loops.init({
    getPlayers: () => players,
    getIo: () => io,
    getMonsters: () => monsters,
    getAxes: () => axes,
    getDrops: () => drops,
    getMarketListings: () => marketListings,
    setMarketListings: (v) => { marketListings = v; },
    get MARKET_FEE() { return MARKET_FEE; },
    getTickCounter: () => tickCounter,
    getZone,
    getExpRequired,
    getIsNight: () => isNight,
    getCurrentWeather: () => currentWeather,
    getWorldTime: () => worldTime,
    get serverStartTime() { return serverStartTime; },
    // Phase 4b
    getSKILLS: () => SKILLS,
    getBuffedStat,
    spawnMonster,
    // Phase 4c
    getCLASSES: () => CLASSES,
    getMountSpeed,
    get executeThrow() { return executeThrow; },
    applyBuff,
    removeBuff,
    getParties: () => parties,
    get MAX_LEVEL() { return MAX_LEVEL; },
    capResources,
    get skillTree() { return skillTree; },
    SUMMON_STONES: bossSummon.SUMMON_STONES,
    bountyHunter,
    soulSystem,
    getCurrentWeather: () => currentWeather,
    savePlayer: (p) => savePlayer(p),
    trackQuest,
    getPetEffect,
    // Phase 4d
    getAoes: () => aoes,
    getArenaMatches: () => arenaMatches,
    getClans: () => clans,
    getWorldBoss: () => worldBoss,
    getMeteorShower: () => meteorShower,
    getGoldenRain: () => goldenRain,
    getGoldFeverZone: () => goldFeverZone,
    getGoldFeverEnd: () => goldFeverEnd,
    getTreasureGoblin: () => treasureGoblin,
    getZoneConquest: () => zoneConquest,
    getFactionState: () => factionState,
    getFACTIONS: () => FACTIONS,
    getRUNES: () => RUNES,
    ZONES, ZONE_MONSTERS, MONSTER_TIERS, MONSTER_LORE, EQUIP_STATS, GRADE_INFO, CLAN_SKILLS, QUESTS, KARMA,
    calcDamage, spawnDrop, endArenaMatch, recalcStats, checkTitles,
    alertArmy, generateRandomOptions, createBot, getWeekNumber,
    getThisWeekChallenge, getTodaysChallenge,
    nextEntityId: () => ++entityIdCounter,
});

// server_helpers init
serverHelpers.init({
    getPlayers: () => players,
    getIo: () => io,
    savePlayer: (p) => savePlayer(p),
    bossRush, codex, TRADE_GOODS, RANDOM_OPTIONS, MAX_GOLD,
    getBossRushSessions: () => bossRushSessions,
    get bossRushRanking() { return bossRushRanking; },
    set bossRushRanking(v) { bossRushRanking = v; },
    get townPrices() { return townPrices; },
    set townPrices(v) { townPrices = v; },
    get worldEventLog() { return worldEventLog; },
    trackQuest,
});

// v1.33: 도감 자동 발견 헬퍼
// extracted to game/server_helpers.js

// v1.32: 오늘의 일일 상점 (메모리 캐시)
let todayDailyShop = dailyShop.generateDailyShop();

// v1.30: 보스 러시 활성 세션 (메모리)
const bossRushSessions = {}; // { playerId: { currentWave, startTime, waveStart, killsInWave } }
let bossRushRanking = []; // [{ playerId, name, maxWave, time, finishedAt }]

// extracted to game/server_helpers.js

// v1.29: trackQuest target → season XP source 매핑
const SEASON_XP_MAP = {
    pvp_win: 'pvp_win',
    kill_boss: 'boss_kill',
    worldboss_kill: 'worldboss_kill',
    dungeon_clear: 'dungeon_clear',
    craft_count: 'craft_success',
};

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
const PORT = process.env.PORT || 3000;
const serverStartTime = Date.now();

// 토스페이먼츠 시크릿 키 (프로덕션에서는 반드시 환경변수 설정)
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_zXLkKEypNArWmo50nX3lmeaxYG5R';
if (!process.env.TOSS_SECRET_KEY) console.warn('[Payment] TOSS_SECRET_KEY 미설정 — 테스트 키 사용 중 (프로덕션 배포 전 설정 필요)');

// 다이아몬드 상품

// HTTP 라우트는 server/routes.js 에서 등록 (Phase 1 refactor)
// 모든 게임 글로벌은 핸들러 호출 시점에 lazy 접근 (TDZ 회피)
httpRoutes.register(app, {
    io,
    getPlayers: () => players,
    savePlayer: (p) => savePlayer(p),
    getMonsterCount: () => Object.keys(monsters).length,
    getWorldState: () => ({ worldBoss, meteorShower, goldenRain, starShower, isNight, weather: currentWeather }),
    festival,
    DIAMOND_PRODUCTS,
    TOSS_SECRET_KEY,
    serverStartTime,
    getMaxPlayers: () => MAX_PLAYERS,
});

server.listen(PORT, () => {
    console.log(`[AutoBattle.io] Server running on port ${PORT}`);
});

// ==========================================
// Database — server/db.js 로 추출됨 (Phase 1 refactor)
// ==========================================
initDB();

async function savePlayer(player) {
    if (!player || !player.deviceId || player.isBot) return;

    let myArmy = [];
    for (let bId in players) {
        const b = players[bId];
        if (b.isBot && b.ownerId === player.id && b.isAlive) {
            myArmy.push({
                className: b.className, x: b.x, y: b.y,
                hp: b.hp, maxHp: b.maxHp, level: b.level
            });
        }
    }

    // 확장 데이터 (JSON으로 직렬화)
    const extData = JSON.stringify({
        equipped: player.equipped || {},
        enchantLevels: player.enchantLevels || {},
        equipOptions: player.equipOptions || {},
        inventory: player.inventory || {},
        warehouse: player.warehouse || {},
        diamonds: player.diamonds || 0,
        statPoints: player.statPoints || 0,
        bonusStr: player.bonusStr || 0, bonusDex: player.bonusDex || 0,
        bonusInt: player.bonusInt || 0, bonusCon: player.bonusCon || 0,
        isAdvanced: player.isAdvanced || false,
        advancedClass: player.advancedClass || null,
        baseClassName: player.baseClassName || null,
        pvpWins: player.pvpWins || 0,
        towerHighest: player.towerHighest || 0,
        attendance: player.attendance || {},
        lastLoginDate: player.lastLoginDate || null,
        lastWeek: player.lastWeek || null,
        clanName: player.clanName || null,
        activePet: player.activePet || null,
        pets: player.pets || [],
        activeMount: player.activeMount || null,
        mounts: player.mounts || [],
        titles: player.titles || [],
        activeTitle: player.activeTitle || null,
        activeSkin: player.activeSkin || null,
        skins: player.skins || [],
        morphKills: player.morphKills || {},
        totalTamed: player.totalTamed || 0,
        totalTradeProfit: player.totalTradeProfit || 0,
        totalCrafts: player.totalCrafts || 0,
        dungeonClears: player.dungeonClears || 0,
        bestiary: player.bestiary || {},
        waypoints: player.waypoints || ['aden'],
        faction: player.faction || null,
        factionRep: player.factionRep || 0,
        prestigeLevel: player.prestigeLevel || 0,
        legacyPerks: player.legacyPerks || [],
        itemRunes: player.itemRunes || {},
        _riftDepth: player._riftDepth || 0,
        advanceBonus: player.advanceBonus || null,
        _dailyChallengeProgress: player._dailyChallengeProgress || 0,
        _dailyChallengeCompleted: player._dailyChallengeCompleted || false,
        _dailyChallengeClaimed: player._dailyChallengeClaimed || false,
        _weeklyChallengeWeek: player._weeklyChallengeWeek || null,
        _weeklyChallengeProgress: player._weeklyChallengeProgress || 0,
        _weeklyChallengeClaimed: player._weeklyChallengeClaimed || false,
        discoveredZones: player.discoveredZones || [],
        fishingLevel: player.fishingLevel || 1,
        _fishCount: player._fishCount || 0,
        maxArmy: player.maxArmy || 30,
        autoPotion: player.autoPotion || false,
        mp: player.mp || 100,
        maxMp: player.maxMp || 100,
        element: player.element || null,
        questProgress: player.questProgress || {},
        questCompleted: player.questCompleted || {},
        _storyQuests: player._storyQuests || null,
        _totalPlaytime: player._totalPlaytime || 0,
        _totalGoldEarned: player._totalGoldEarned || 0,
        _summons: player._summons || null,
        _weatherDungeon: player._weatherDungeon || null,
        _pvpMatch: player._pvpMatch || null,
        _bountyHunter: player._bountyHunter || null,
        _race: player._race || null,
        _relicFusion: player._relicFusion || null,
        _skillWave: player._skillWave || null,
        _achievements: player._achievements || null,
        _wishTree: player._wishTree || null,
        _soulSystem: player._soulSystem || null,
        _timeDungeon: player._timeDungeon || null,
        _mythicSummon: player._mythicSummon || null,
        _ancientRuins: player._ancientRuins || null,
    });

    try {
        await pool.query(`
            INSERT INTO players_save (device_id, class_name, level, exp, gold, kill_count, karma, team, is_alive, army_data, ext_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            class_name=VALUES(class_name), level=VALUES(level), exp=VALUES(exp),
            gold=VALUES(gold), kill_count=VALUES(kill_count), karma=VALUES(karma),
            team=VALUES(team), is_alive=VALUES(is_alive), army_data=VALUES(army_data),
            ext_data=VALUES(ext_data)
        `, [player.deviceId, player.className, player.level, player.exp,
            player.gold, player.killCount, player.karma, player.team,
            player.isAlive, JSON.stringify(myArmy), extData]);
    } catch (error) {
        console.error("[DB] Save Error:", error);
    }
}

// ==========================================
// 맵 존 시스템
// ==========================================
// 맵 1000x1000 (-500 ~ 500)

// 존 분위기 텍스트 (진입 시 표시)

// 몬스터 도감 로어 (첫 처치 시 표시)

// ══════════════════════════════════════
// 맵 동선 시스템 — 존 연결 + 지형 장벽 + 도로
// ══════════════════════════════════════

// const ZONE_CONNECTIONS = ... (v1.38: game/data/zones.js로 이동)

// const TERRAIN_BARRIERS = ... (v1.38: game/data/zones.js로 이동)

// const ROADS = ... (v1.38: game/data/zones.js로 이동)

// 도로 위 이동속도 보너스 체크
// isOnRoad / isBlocked / isSlowTerrain / getZone / getNpcMsg → game/world.js (Phase 2 refactor)
// 성 소유
let castleOwner = null;
let siegeActive = false;
let siegeTimer = null;

// ==========================================
// 거상 — 마을별 상점 가격 변동
// ==========================================

let townPrices = {};
// extracted to game/server_helpers.js
updateTownPrices();
setInterval(updateTownPrices, 600000); // 10분마다 변동

// ==========================================
// 포켓몬 — 몬스터 테이밍
// ==========================================


// ==========================================
// BM 상점 시스템 (프리미엄 화폐: 다이아몬드)
// ==========================================

// 다이아몬드 무료 획득 방법

// ==========================================
// 거래소 시스템
// ==========================================
let marketListings = []; // { id, sellerId, sellerName, itemId, itemName, price, currency, listedAt }
let marketIdCounter = 0;
const MARKET_FEE = 0.05; // 5% 수수료

// 거래 가능 아이템 정의

// ==========================================
// 게임 상수 & 클래스 정의 (리니지 라이크)
// ==========================================

const players = {};

// ==========================================
// 퀘스트 시스템
// ==========================================

// ==========================================
// 스킬 시스템
// ==========================================

// ==========================================
// 장비 시스템 (5등급: normal/uncommon/rare/epic/legendary)
// ==========================================

// 장비 세트 보너스



// extracted to game/server_helpers.js


// 장비 설명 텍스트 (인벤토리/비교에서 표시)

// ==========================================
// 낮/밤 순환 (10분 주기)
// ==========================================
const DAY_NIGHT_CYCLE = 600; // 10분 = 600초
let worldTime = 0; // 0~599
let isNight = false;

// 날씨 시스템
const WEATHERS = [
    { id:'clear', name:'맑음', effect:null, duration:300 },
    { id:'rain',  name:'비',   effect:{ element:'water', dodgeUp:0.03 }, duration:180 },
    { id:'fog',   name:'안개', effect:{ dodgeUp:0.05, visionDown:true }, duration:120 },
    { id:'snow',  name:'눈',   effect:{ element:'water', spdDown:0.2 }, duration:150 },
    { id:'storm', name:'폭풍', effect:{ element:'wind', atkUp:0.1, defDown:0.1 }, duration:90 },
];
let currentWeather = WEATHERS[0];
let nextWeatherChange = Date.now() + 300000;

// 월드 이벤트 로그
let worldEventLog = []; // { time, msg, type }
// extracted to game/server_helpers.js

// ==========================================
// 전직 시스템 (Lv.20)
// ==========================================

// ==========================================
// 속성 시스템
// ==========================================
// extracted to game/data/server_data.js
// const ELEMENT_BONUS = ... (v1.37: game/data/world_data.js로 이동)

// ==========================================
// 혈맹(클랜) 시스템 (기획서 확장)
// ==========================================
let clans = {}; // { clanName: { leader, officers:[], members:[], level, exp, storage:{}, war:null } }

// ==========================================
// 파티 시스템
// ==========================================
let parties = {}; // { partyId: { leader, members:[], name } }
let partyIdCounter = 0;

// 아레나 시스템
let arenaQueue = []; // 대기 중인 플레이어 ID 목록
let arenaMatches = {}; // { matchId: { player1, player2, startTime, zone } }
let arenaRankings = {}; // { playerId: { wins, losses, points, rank } }
let arenaMatchIdCounter = 0;

// 랭킹
let rankings = { level:[], pvp:[], gold:[] };





// 주간 랭킹 보상 지급 (월요일 06:00 기준)
let lastWeeklyRewardWeek = '';
let axes = {};
let aoes = {};
let monsters = {};
let drops = {}; // 드롭 아이템

let entityIdCounter = 0;
const MAX_PLAYERS = 50;
const MAX_MONSTERS = 600; // 2000x2000 맵에 몬스터 대량 배치
let hasKing = false;

// ── 클래스 정의 (판타지 RPG) ──
// extracted to game/data/server_data.js

// ── 몬스터 등급 ──
// const MONSTER_TIERS = ... (v1.37: game/data/world_data.js로 이동, 인코딩 깨진 글자도 함께 수정)

// 존별 몬스터 이름 변형
// const ZONE_MONSTER_NAMES = ... (v1.38: game/data/zones.js로 이동)

// ── 카르마 시스템 (PK 페널티) ──
// const KARMA = ... (v1.37: game/data/world_data.js로 이동)

// ── 레벨업 테이블 ──
// function getExpRequired = ... (v1.43: game/helpers.js로 이동)

// ── 방어력 기반 데미지 계산 ──
// ── 재미 시스템 전역 변수 ──
let treasureGoblin = null; // { id, zoneId, spawnTime }
let nextTreasureTime = Date.now() + 180000 + Math.random() * 300000;
let bountyBoard = []; // [{ targetId, targetName, reward, timeLimit, claimedBy, claimedAt }]
let lastBountyUpdate = 0;
let zoneConquest = {}; // { zoneId: { clanName, kills:{} } }
let lastConquestReset = Date.now();
let meteorShower = null; // { zoneId, endTime }
let nextMeteorTime = Date.now() + 1200000 + Math.random() * 1200000;
let goldenRain = null; // { zoneId, endTime } — 황금 비: 해당 존 골드 x3, EXP x1.5, 5분
let nextGoldenTime = Date.now() + 900000 + Math.random() * 900000;
let starShower = null; // { zoneId, endTime } — 별똥별 소나기: 1분마다 무작위 위치에 골드 드롭, 5분
let nextStarTime = Date.now() + 1500000 + Math.random() * 900000;
// 오프라인 우편함 (메모리, 서버 재시작 시 초기화)
// 키: displayName, 값: [{from, item, count, gold, timestamp}, ...]
const pendingMails = {};
let rogueMerchant = null; // { townId, deals:[], expiresAt }
let nextRogueTime = Date.now() + 480000 + Math.random() * 420000;



// function getYesterday/getWeekNumber = ... (v1.43: game/helpers.js로 이동)


// ── 몬스터 스폰 (등급별 가중치) ──
// pickMonsterTier / pickZoneTier / scaleMonster (v1.44: game/monster_spawn.js로 이동)


// 초기 몬스터 배치
for (let i = 0; i < MAX_MONSTERS; i++) spawnMonster();

// ── 월드 보스 시스템 ──
let worldBoss = null;
// const WORLD_BOSS_TYPES = ... (v1.37: game/data/world_data.js로 이동)



// ── 던전 시스템 ── (v1.37: game/data/world_data.js로 이동)
let activeDungeons = {}; // {instanceId: {dungeonId, players:[], currentStage, monstersLeft}}

// ── 무한의 탑 시스템 ──
// extracted to game/data/server_data.js
let towerProgress = {}; // {playerId: {currentFloor, monstersLeft, startTime}}

// ── 친구 시스템 ──
let friendLists = {}; // {playerId: [friendId, ...]}
let friendRequests = {}; // {targetId: [{fromId, fromName, time}]}

// ── 시간대별 필드보스 ──
let lastFieldBossHour = -1;
let goldFeverZone = null;

// ══════════════════════════════════════
// 5대 신규 시스템
// ══════════════════════════════════════

// ── 1. 시즌 균열 (2주 주기 로테이션) ──
// extracted to game/data/server_data.js
let currentSeason = { theme: RIFT_THEMES[0], depth: 0, startTime: Date.now(), leaderboard: {} };

// ── 2. 룬 시스템 ──
// extracted to game/data/server_data.js
// extracted to game/data/server_data.js

// ── 3. 진영 시스템 ──
// extracted to game/data/server_data.js
let factionState = { sun:{zones:{},kills:0}, moon:{zones:{},kills:0}, star:{zones:{},kills:0} };

// ── 4. 프레스티지 (환생) ──
// extracted to game/data/server_data.js

// ── 5. 의뢰 게시판 (플레이어 생성 퀘스트) ──
let contractBoard = []; // { id, creatorId, creatorName, type, target, reward, status, acceptedBy, expiresAt }
let contractIdCounter = 0;



// ── 존 미니보스 ──
// extracted to game/data/server_data.js
let zoneBossTimers = {};

// ── PvP 시즌/티어 ──
let arenaSeasonStart = Date.now();

// ── 존 위험 요소 ──
// extracted to game/data/server_data.js

// ── 길드 레이드 ──
// extracted to game/data/server_data.js

// ── 낚시 시스템 ──
// extracted to game/data/server_data.js

// ── 이모트 ──

// ── 출석 캘린더 보상 ── (v1.37: game/data/world_data.js로 이동)
let goldFeverEnd = 0;

// ── 드롭 아이템 생성 ──

// ==========================================
// Socket.IO 연결 처리
// ==========================================

// Phase 5: connection handlers -> game/handlers/connection.js
registerConnection(io, {
    players, monsters, drops, axes, aoes, pool, clans,
    arenaMatches, arenaRankings, rankings, parties,
    bossRushSessions, activeDungeons, contractBoard, pendingMails,
    savePlayer, recalcStats, trackQuest, getZone,
    isOnRoad, isBlocked, isSlowTerrain, getNpcMsg,
    CLASSES, SKILLS, QUESTS, CLASS_ADVANCE,
    EQUIPMENT_SLOTS, EQUIP_STATS, GRADE_INFO, EQUIPMENT_SETS,
    RANDOM_OPTIONS, EQUIP_DESCRIPTIONS,
    ZONES, ZONE_AMBIENCE, MONSTER_LORE, ZONE_CONNECTIONS, ZONE_MONSTERS, ZONE_MONSTER_NAMES,
    DIAMOND_PRODUCTS, NPCS, TRADE_GOODS, TAME_RATES, TAME_COSTS,
    SHOP_ITEMS, FREE_DIAMOND_SOURCES, TRADEABLE_ITEMS,
    CLAN_LEVEL_EXP, CLAN_MAX_MEMBERS, CLAN_SKILLS, EMOTES,
    RECIPES, handleCraft,
    PETS, MOUNTS, handleBuyPet, handleBuyMount, getPetEffect, getMountSpeed, handleEvolvePet, PET_EVOLVE_COST,
    BUFF_TYPES, applyBuff, removeBuff, updateBuffs, getBuffedStat, isStunned, TITLES, checkTitles, getTitleBonus,
    lottery, fishing, festival, seasonPass, bossRush, auction,
    dailyShop, codex, mailbox, skillTree, farm,
    ELEMENT_BONUS, MONSTER_TIERS, KARMA, WORLD_BOSS_TYPES, DUNGEONS, ATTENDANCE_REWARDS,
    petBattle, getExpRequired, getYesterday, getWeekNumber,
    pickMonsterTier, pickZoneTier, scaleMonster,
    training, treasureMap, relic, breeding, runes, leaderboard,
    blackMarket, jobs, transmutation, raid, expedition,
    insurance, fortune, transmog, postoffice, worldEvent,
    companion, wisdom, pvpTournament, guildWar, titleCollection,
    lotteryJackpot, dungeonKeys, library, blessing, newsBoard,
    contracts, blueprint, territory, inn, dashboard,
    aura, passport, honor, invitation, timeCapsule, statistics,
    diary, meditation, cooking, constellation, weather,
    gemcraft, oracle, gathering, forge, legends,
    bonusAggregator, morph, waypoint, friends, profile,
    casino, emote, labyrinth, sailing, excavation,
    dream, music, tarot, talisman, wishingWell,
    mask, heraldry, rift, garden,
    MAX_GOLD, MAX_DIAMONDS, MAX_LEVEL, MAX_PLAYERS, MAX_MONSTERS,
    ARENA_TIERS, DAILY_CHALLENGES, WEEKLY_CHALLENGES,
    calcDamage, getEnchantBonus, capResources,
    spawnMonster, spawnDrop, endArenaMatch, spawnWorldBoss, updateRankings, getArenaTier,
    getTodaysChallenge, getThisWeekChallenge,
    handlePlayerDeath, destroyAxe, giveExp,
    createBot, createAutoArmy, alertArmy, executeThrow,
    generateRandomOptions, codexDiscover, handleRaidFinish, finishBossRush,
    SEASON_XP_MAP, ELEMENTS, FACTIONS, RUNES, RUNE_WORDS, TRAINING_DRILLS_NAMES,
    questChain, bossSummon, weatherDungeon, pvpMatch, bountyHunter, raceSystem, relicFusion, skillWave, achievements, superBoss, territoryWar, wishTree, soulSystem, timeDungeon, mythicSummon, ancientRuins, worldChronicle,
    // mutable primitives via getters
    get isNight() { return isNight; },
    get currentWeather() { return currentWeather; },
    get worldBoss() { return worldBoss; },
    get rogueMerchant() { return rogueMerchant; },
    set rogueMerchant(v) { rogueMerchant = v; },
    get siegeActive() { return siegeActive; },
    set siegeActive(v) { siegeActive = v; },
    get siegeTimer() { return siegeTimer; },
    set siegeTimer(v) { siegeTimer = v; },
    get castleOwner() { return castleOwner; },
    set castleOwner(v) { castleOwner = v; },
    get currentBlackMarket() { return currentBlackMarket; },
    get todayDailyShop() { return todayDailyShop; },
    get entityIdCounter() { return entityIdCounter; },
    set entityIdCounter(v) { entityIdCounter = v; },
    get marketIdCounter() { return marketIdCounter; },
    set marketIdCounter(v) { marketIdCounter = v; },
    get bossRushRanking() { return bossRushRanking; },
    get arenaSeasonStart() { return arenaSeasonStart; },
    get marketListings() { return marketListings; },
    set marketListings(v) { marketListings = v; },
    get townPrices() { return townPrices; },
    // missing globals (Phase 5 bug fix)
    friendLists, friendRequests, arenaQueue,
    towerProgress, logWorldEvent,
    get hasKing() { return hasKing; },
    get arenaMatchIdCounter() { return arenaMatchIdCounter; },
    set arenaMatchIdCounter(v) { arenaMatchIdCounter = v; },
    get currentSeason() { return currentSeason; },
    get contractIdCounter() { return contractIdCounter; },
    set contractIdCounter(v) { contractIdCounter = v; },
    factionState,
    worldEventLog, bountyBoard,
});
// ==========================================
// 투사체 & 전투 로직
// ==========================================

function executeThrow(pId) {
    const player = players[pId];
    if (!player || !player.isAlive) return;

    const mag = Math.sqrt(player.dirX ** 2 + player.dirY ** 2);
    let finalDirX = 0, finalDirY = 1;
    if (mag > 0.01) { finalDirX = player.dirX / mag; finalDirY = player.dirY / mag; }

    const cls = CLASSES[player.className];
    if (!cls) return;

    entityIdCounter++;
    const currentObjId = entityIdCounter;

    if (cls.aoe) {
        aoes[currentObjId] = {
            id: currentObjId, ownerId: pId,
            x: player.x, y: player.y,
            radius: 2.0, timer: null
        };
        io.emit('aoe_spawn', aoes[currentObjId]);
        aoes[currentObjId].timer = setTimeout(() => {
            if (aoes[currentObjId]) {
                io.emit('aoe_destroy', currentObjId);
                delete aoes[currentObjId];
            }
        }, cls.projLife);
    } else {
        // 액티브 플레이 보너스 적용
        // 버프 아이템 반영 (atk_boost, food_atk 등) + 패시브 (워리어 분노)
        let buffedAtk = getBuffedStat(player, 'atk') || player.atk || 10;
        if (player.passiveAtkBonus) buffedAtk = Math.floor(buffedAtk * (1 + player.passiveAtkBonus));
        let activeDmgMulti = player.dmgMulti || 1;
        if (player._activeBonus && Date.now() < player._activeBonus) activeDmgMulti *= 1.3;
        const { damage, isCrit } = calcDamage(buffedAtk, 0, activeDmgMulti, player.critRate || 0.1);
        axes[currentObjId] = {
            id: currentObjId, ownerId: pId,
            x: player.x + finalDirX * 0.5,
            y: player.y + finalDirY * 0.5,
            dirX: finalDirX, dirY: finalDirY,
            speed: cls.projSpeed,
            dmg: damage,
            isCrit,
            timer: null
        };
        io.emit('axe_spawn', axes[currentObjId]);
        axes[currentObjId].timer = setTimeout(() => {
            if (axes[currentObjId]) {
                io.emit('axe_destroy', currentObjId);
                delete axes[currentObjId];
            }
        }, cls.projLife);
    }
}

function createBot(victimPlayer, ownerTeam, ownerId) {
    entityIdCounter++;
    const botId = 'bot_' + entityIdCounter;
    const cls = CLASSES[victimPlayer.className] || CLASSES['Warrior'];
    players[botId] = {
        id: botId, deviceId: 'bot',
        className: victimPlayer.className,
        displayName: cls.displayName,
        x: (players[ownerId] ? players[ownerId].x : victimPlayer.x) + (Math.random() * 4 - 2),
        y: (players[ownerId] ? players[ownerId].y : victimPlayer.y) + (Math.random() * 4 - 2),
        hp: victimPlayer.maxHp, maxHp: victimPlayer.maxHp,
        atk: cls.atk, def: cls.def,
        critRate: cls.critRate, dodgeRate: cls.dodgeRate,
        dmgMulti: victimPlayer.dmgMulti,
        dirX: 0, dirY: -1,
        gold: 0, level: victimPlayer.level, exp: 0,
        isAlive: true, killCount: 0, karma: 0,
        team: ownerTeam,
        ownerId,
        targetId: null,
        isKing: false, isBot: true,
        lastHpRegen: Date.now(), autoSkillCooldown: 0
    };
    io.emit('player_join', players[botId]);
}

function createAutoArmy(ownerId) {
    const p = players[ownerId];
    if (!p || !p.isAlive) return;

    entityIdCounter++;
    const botId = 'bot_auto_' + entityIdCounter;
    const classNames = ['Assassin', 'Warrior', 'Knight', 'Mage', 'Cleric'];
    const randomClass = classNames[Math.floor(Math.random() * classNames.length)];
    const cls = CLASSES[randomClass];

    const botLevel = Math.max(1, Math.floor(p.level * 0.8));
    const botHp = cls.maxHp + (botLevel - 1) * 25;
    players[botId] = {
        id: botId, deviceId: 'bot',
        className: randomClass,
        displayName: cls.displayName,
        x: p.x + (Math.random() * 4 - 2),
        y: p.y + (Math.random() * 4 - 2),
        hp: botHp, maxHp: botHp,
        atk: cls.atk, def: cls.def,
        critRate: cls.critRate, dodgeRate: cls.dodgeRate,
        dmgMulti: 1.0 + (botLevel - 1) * 0.08,
        dirX: 0, dirY: -1,
        gold: 0, level: botLevel, exp: 0,
        isAlive: true, killCount: 0, karma: 0,
        team: p.team,
        ownerId,
        targetId: null,
        isKing: false, isBot: true,
        element: p.element,
        lastHpRegen: Date.now(), autoSkillCooldown: 0
    };
    io.emit('player_join', players[botId]);
}

function alertArmy(ownerId, attackerId) {
    if (ownerId === attackerId) return;
    for (let bId in players) {
        if (players[bId].isBot && players[bId].ownerId === ownerId && players[bId].isAlive) {
            players[bId].targetId = attackerId;
        }
    }
}

// ==========================================
// 게임 루프 (30 TPS)
// ==========================================

const TICK_RATE = 30;
const TICK_TIME = 1000 / TICK_RATE;
let tickCounter = 0;

setInterval(() => {
  try {
    tickCounter++;
    if (tickCounter > 1e8) tickCounter = 0; // 정수 정밀도 오버플로우 방지

    handleCollisions();

    // v1.31: 경매장 자동 정산 (10초마다)
    if (tickCounter % 300 === 0) {
        const settlements = auction.tickAuctions();
        for (const s of settlements) {
            if (s.type === 'success') {
                // 판매자에게 골드 지급 (수수료 차감 후)
                const seller = players[s.sellerId];
                if (seller) {
                    seller.gold = Math.min(MAX_GOLD, (seller.gold || 0) + s.sellerPayout);
                    savePlayer(seller);
                    try { io.to(s.sellerId).emit('auction_sold', { auctionId: s.auctionId, finalPrice: s.finalPrice, payout: s.sellerPayout, fee: s.fee }); } catch (_) {}
                    io.emit('player_update', seller);
                }
                // 구매자에게 아이템 지급
                const buyer = players[s.buyerId];
                if (buyer) {
                    if (!buyer.inventory) buyer.inventory = {};
                    buyer.inventory[s.itemId] = (buyer.inventory[s.itemId] || 0) + 1;
                    savePlayer(buyer);
                    try { io.to(s.buyerId).emit('auction_won', { auctionId: s.auctionId, itemId: s.itemId, finalPrice: s.finalPrice }); } catch (_) {}
                    io.emit('player_update', buyer);
                }
            } else if (s.type === 'failed') {
                // 유찰: 판매자에게 아이템 반환
                const seller = players[s.sellerId];
                if (seller) {
                    if (!seller.inventory) seller.inventory = {};
                    seller.inventory[s.itemId] = (seller.inventory[s.itemId] || 0) + 1;
                    savePlayer(seller);
                    try { io.to(s.sellerId).emit('auction_failed', { auctionId: s.auctionId, itemId: s.itemId }); } catch (_) {}
                    io.emit('player_update', seller);
                }
            }
        }
    }

    // 몬스터 AI (1초마다)
    if (tickCounter % 30 === 0) {
        for (let mId in monsters) {
            const m = monsters[mId];
                    if (!m) continue;

            if (!m.isAlive) continue;

            // 가장 가까운 플레이어 찾기
            let nearestPlayer = null, nearestDist = 15; // 어그로 범위 15
            // 도발 대상 우선
            if (m.tauntTarget && players[m.tauntTarget]?.isAlive) {
                nearestPlayer = players[m.tauntTarget];
                nearestDist = Math.hypot(m.x - nearestPlayer.x, m.y - nearestPlayer.y);
            } else {
                m.tauntTarget = null;
                for (const pId in players) {
                    const p = players[pId];
                            if (!p) continue;

                    if (!p.isAlive) continue;
                    const d = Math.hypot(m.x - p.x, m.y - p.y);
                    if (d < nearestDist) { nearestDist = d; nearestPlayer = p; }
                }
            }

            const now = Date.now();
            const aiType = m.aiType || 'wander';

            if (nearestPlayer && nearestDist < 12) {
                // 플레이어를 향해 이동
                const dx = nearestPlayer.x - m.x, dy = nearestPlayer.y - m.y;
                const mag = Math.hypot(dx, dy);

                switch (aiType) {
                    case 'charge': // 엘리트: 돌진 — 빠르게 접근, 3초마다 돌진 공격
                        if (mag > 2) {
                            const spd = 0.8; // 일반보다 빠름
                            m.x += (dx / mag) * spd;
                            m.y += (dy / mag) * spd;
                        }
                        // 돌진 준비 경고 (0.5초 전)
                        if (nearestDist < 4 && now - (m.lastSpecialAttack||0) > 2500 && now - (m.lastSpecialAttack||0) < 3000) {
                            io.emit('monster_telegraph', { id: mId, type: 'charge', x: m.x, y: m.y, targetX: nearestPlayer.x, targetY: nearestPlayer.y });
                        }
                        if (nearestDist < 3 && now - (m.lastSpecialAttack||0) > 3000) {
                            m.lastSpecialAttack = now;
                            // 돌진 데미지 + 넉백
                            if (nearestPlayer.activeBuffs?.divine_shield) break;
                            let { damage: chargeDmg } = calcDamage(m.atk, getBuffedStat(nearestPlayer,'def'), 1.5, 0.1, m.element, nearestPlayer.element);
                            if (nearestPlayer.activeBuffs?.iron_wall) chargeDmg = Math.floor(chargeDmg * 0.3);
                            nearestPlayer.hp -= chargeDmg;
                            // 넉백 (플레이어를 밀어냄)
                            if (mag > 0.1) {
                                nearestPlayer.x += (dx / mag) * -2;
                                nearestPlayer.y += (dy / mag) * -2;
                            }
                            io.emit('player_hit', { id: nearestPlayer.id, hp: nearestPlayer.hp, damage: chargeDmg, isCrit: false, skillName: '돌진' });
                            if (nearestPlayer.hp <= 0 && nearestPlayer.isAlive) {
                                handlePlayerDeath(nearestPlayer, nearestPlayer.id, m, mId);
                            }
                        }
                        break;

                    case 'aoe': // 레어: 광역 — 느리지만 주기적 광역 공격
                        if (mag > 3) {
                            m.x += (dx / mag) * 0.3;
                            m.y += (dy / mag) * 0.3;
                        }
                        if (now - (m.lastSpecialAttack||0) > 4000) {
                            m.lastSpecialAttack = now;
                            // 주변 3범위 광역 데미지 + 출혈
                            const aoeDmg = Math.floor(m.atk * 1.2);
                            for (const pId in players) {
                                const p = players[pId];
                                        if (!p) continue;

                                if (!p.isAlive) continue;
                                const pd = Math.hypot(m.x - p.x, m.y - p.y);
                                if (pd < 3) {
                                    if (p.activeBuffs?.divine_shield) continue;
                                    let dmg = aoeDmg;
                                    if (p.activeBuffs?.iron_wall) dmg = Math.floor(dmg * 0.3);
                                    p.hp -= dmg;
                                    applyBuff(p, 'bleed'); // 출혈 디버프
                                    io.emit('player_hit', { id: pId, hp: p.hp, damage: dmg, isCrit: false, skillName: '광역 충격파 (출혈)' });
                                    if (p.hp <= 0 && p.isAlive) handlePlayerDeath(p, pId, m, mId);
                                }
                            }
                        }
                        break;

                    case 'breath': // 보스: 브레스 — 원거리 직선 공격 + 높은 데미지
                        if (mag > 5) {
                            m.x += (dx / mag) * 0.4;
                            m.y += (dy / mag) * 0.4;
                        }
                        if (now - (m.lastSpecialAttack||0) > 5000) {
                            m.lastSpecialAttack = now;
                            // 브레스: 방향으로 범위 6, 폭 2의 직선 공격
                            const breathDmg = Math.floor(m.atk * 2.0);
                            if (mag < 0.01) break; // 거리 0이면 방향 계산 불가
                            const bdx = dx / mag, bdy = dy / mag;
                            for (const pId in players) {
                                const p = players[pId];
                                        if (!p) continue;

                                if (!p.isAlive) continue;
                                // 브레스 직선 범위 체크 (내적 + 거리)
                                const px = p.x - m.x, py = p.y - m.y;
                                const proj = px * bdx + py * bdy; // 정사영
                                if (proj > 0 && proj < 8) {
                                    const perp = Math.abs(px * bdy - py * bdx); // 수직 거리
                                    if (perp < 2) {
                                        if (p.activeBuffs?.divine_shield) continue;
                                        let dmg = breathDmg;
                                        if (p.activeBuffs?.iron_wall) dmg = Math.floor(dmg * 0.3);
                                        p.hp -= dmg;
                                        applyBuff(p, 'burn'); // 화상 디버프
                                        // 보스 등급 이상이면 공포도 추가
                                        if (m.tier === 'boss' || m.tier === 'legendary' || m.tier === 'mythic') applyBuff(p, 'fear');
                                        io.emit('player_hit', { id: pId, hp: p.hp, damage: dmg, isCrit: false, skillName: '브레스' });
                                        if (p.hp <= 0 && p.isAlive) handlePlayerDeath(p, pId, m, mId);
                                    }
                                }
                            }
                            io.emit('skill_effect', { casterId: mId, skillName: '브레스', type: 'aoe', targetX: nearestPlayer.x, targetY: nearestPlayer.y });
                        }
                        break;

                    case 'summon': // 신규: 미니언 소환 (8초마다 일반 몹 2~3마리)
                        if (mag > 4) {
                            m.x += (dx / mag) * 0.3;
                            m.y += (dy / mag) * 0.3;
                        }
                        if (now - (m.lastSpecialAttack||0) > 8000) {
                            m.lastSpecialAttack = now;
                            const summonCount = 2 + Math.floor(Math.random() * 2);
                            for (let i = 0; i < summonCount; i++) {
                                entityIdCounter++;
                                const minionId = 'monster_' + entityIdCounter;
                                monsters[minionId] = {
                                    id: minionId, tier: 'normal',
                                    name: '소환된 ' + (m.name || '미니언'),
                                    x: m.x + (Math.random() * 4 - 2),
                                    y: m.y + (Math.random() * 4 - 2),
                                    hp: 80, maxHp: 80,
                                    atk: Math.floor(m.atk * 0.4),
                                    def: Math.floor(m.def * 0.3),
                                    color: m.color, isAlive: true,
                                    element: m.element, zoneId: m.zoneId,
                                    aiType: 'wander',
                                    expReward: 10, goldReward: 5,
                                    lastSpecialAttack: 0, isSummoned: true,
                                };
                                io.emit('monster_spawn', monsters[minionId]);
                            }
                            io.emit('skill_effect', { casterId: mId, skillName: '소환', type: 'summon', targetX: m.x, targetY: m.y });
                        }
                        break;

                    case 'teleport': // 신규: 텔레포트 (4초마다 플레이어 근처로 순간이동 + 공격)
                        if (now - (m.lastSpecialAttack||0) > 4000) {
                            m.lastSpecialAttack = now;
                            // 플레이어 주변 3~5 거리로 텔레포트
                            const angle = Math.random() * Math.PI * 2;
                            const dist = 3 + Math.random() * 2;
                            m.x = nearestPlayer.x + Math.cos(angle) * dist;
                            m.y = nearestPlayer.y + Math.sin(angle) * dist;
                            io.emit('skill_effect', { casterId: mId, skillName: '텔레포트', type: 'flash', targetX: m.x, targetY: m.y });
                            // 텔레포트 직후 강한 일격 + 약화 디버프
                            if (nearestPlayer.activeBuffs?.divine_shield) break;
                            const tpDmg = Math.floor(m.atk * 1.5);
                            nearestPlayer.hp -= tpDmg;
                            applyBuff(nearestPlayer, 'weak'); // 약화 디버프 적용
                            io.emit('player_hit', { id: nearestPlayer.id, hp: nearestPlayer.hp, damage: tpDmg, isCrit: true, skillName: '암습 (약화)' });
                            if (nearestPlayer.hp <= 0 && nearestPlayer.isAlive) handlePlayerDeath(nearestPlayer, nearestPlayer.id, m, mId);
                        }
                        break;

                    default: // wander: 느린 추적
                        if (mag > 2) {
                            m.x += (dx / mag) * 0.4;
                            m.y += (dy / mag) * 0.4;
                        }
                        // 근접 시 기본 공격 (2초마다) — calcDamage 통일
                        if (nearestDist < 2 && now - (m.lastSpecialAttack||0) > 2000) {
                            m.lastSpecialAttack = now;
                            // 무적/철벽 체크
                            if (nearestPlayer.activeBuffs?.divine_shield) continue;
                            let { damage: mDmg, isCrit: mCrit } = calcDamage(m.atk, getBuffedStat(nearestPlayer, 'def'), 1.0, 0.05, m.element, nearestPlayer.element);
                            if (nearestPlayer.activeBuffs?.iron_wall) mDmg = Math.floor(mDmg * 0.3);
                            nearestPlayer.hp -= mDmg;
                            io.emit('player_hit', { id: nearestPlayer.id, hp: nearestPlayer.hp, damage: mDmg, isCrit: mCrit });
                            if (nearestPlayer.hp <= 0 && nearestPlayer.isAlive) handlePlayerDeath(nearestPlayer, nearestPlayer.id, m, mId);
                        }
                }
            } else {
                // 어그로 없음: 스폰 존 중심으로 복귀
                const mZoneHome = m.zoneId && ZONES[m.zoneId];
                if (mZoneHome) {
                    const homeX = mZoneHome.x + mZoneHome.w / 2;
                    const homeY = mZoneHome.y + mZoneHome.h / 2;
                    const homeDist = Math.hypot(m.x - homeX, m.y - homeY);
                    if (homeDist > mZoneHome.w * 0.4) {
                        // 존 중심으로 복귀
                        m.x += (homeX - m.x) / homeDist * 0.5;
                        m.y += (homeY - m.y) / homeDist * 0.5;
                    } else {
                        // 존 내 랜덤 배회
                        m.x += (Math.random() * 2 - 1) * 0.3;
                        m.y += (Math.random() * 2 - 1) * 0.3;
                    }
                } else {
                    m.x += (Math.random() * 2 - 1) * 0.3;
                    m.y += (Math.random() * 2 - 1) * 0.3;
                }
            }

            // 존 경계 유지
            const mZone = m.zoneId && ZONES[m.zoneId];
            if (mZone) {
                m.x = Math.max(mZone.x, Math.min(mZone.x + mZone.w, m.x));
                m.y = Math.max(mZone.y, Math.min(mZone.y + mZone.h, m.y));
            }
            m.x = Math.max(-1020, Math.min(1020, m.x));
            m.y = Math.max(-1020, Math.min(1020, m.y));
        }
    }

    // 존 위험 요소 데미지 (해당 존에 있는 플레이어에게 주기적 DoT)
    if (tickCounter % 60 === 0) { // 2초마다 체크
        for (const pId in players) {
            const p = players[pId];
                    if (!p) continue;

            if (p.isBot || !p.isAlive) continue;
            const zone = getZone(p.x, p.y);
            const hazard = zone && ZONE_HAZARDS[zone.id];
            if (hazard) {
                if (!p._lastHazardTick || Date.now() - p._lastHazardTick >= hazard.interval) {
                    p._lastHazardTick = Date.now();
                    // DEF로 위험 데미지 감소 (DEF의 10% 만큼 감소)
                    const hazardDmg = Math.max(1, hazard.dps - Math.floor((p.def || 0) * 0.1));
                    p.hp -= hazardDmg;
                    if (hazard.manaDrain && p.mp !== undefined) p.mp = Math.max(0, p.mp - hazard.manaDrain);
                    io.to(pId).emit('hazard_damage', { dps: hazard.dps, type: hazard.type, msg: hazard.msg, color: hazard.color });
                    if (p.hp <= 0 && p.isAlive) { p.isAlive = false; io.emit('player_die', { victimId: pId, attackerId: 'hazard', killerName: hazard.msg }); }
                }
            }
        }
    }

    // 버프/디버프 업데이트 (매 틱)
    for (let pId in players) {
        if (!players[pId]) continue;
        if (players[pId].isAlive) updateBuffs(players[pId]);
    }

    // HP 자동 회복 (2초마다, 최대HP의 2% + 펫 보너스)
    if (tickCounter % 60 === 0) {
        for (let pId in players) {
            const p = players[pId];
            if (!p) continue;
            if (p.isAlive && p.hp < p.maxHp) {
                let regenRate = 0.01; // 1%/2초 (2%에서 하향)
                const pet = getPetEffect(p);
                if (pet && pet.effect === 'hpRegen') regenRate += pet.value;
                p.hp = Math.min(p.maxHp, p.hp + p.maxHp * regenRate);
            }
            // MP 자동 회복 (2초마다 최대 MP의 3%)
            if (p.isAlive && p.mp !== undefined && p.mp < (p.maxMp || 100)) {
                let mpRegen = (p.maxMp || 100) * 0.03;
                // 메이지 마나 재생 패시브
                const magePassive = SKILLS[p.baseClassName || p.className]?.find(s => s.type === 'passive' && s.mpRegenMulti);
                if (magePassive && p.level >= magePassive.level) mpRegen *= magePassive.mpRegenMulti;
                p.mp = Math.min(p.maxMp || 100, p.mp + mpRegen);
            }
            // 자동 물약 (HP 30% 이하 시, 상급→중급→하급 순서)
            if (p.isAlive && p.autoPotion && !p.isBot && p.hp < p.maxHp * 0.3 && p.inventory) {
                const potions = [
                    { id:'pot_hp_l', heal:800, name:'상급 HP 물약' },
                    { id:'pot_hp_m', heal:300, name:'중급 HP 물약' },
                    { id:'pot_hp_s', heal:100, name:'하급 HP 물약' },
                ];
                for (const pot of potions) {
                    if (p.inventory[pot.id] > 0) {
                        p.inventory[pot.id]--;
                        if (p.inventory[pot.id] <= 0) delete p.inventory[pot.id];
                        p.hp = Math.min(p.maxHp, p.hp + pot.heal);
                        io.to(pId).emit('combat_log', { msg: `${pot.name} 사용! HP +${pot.heal}` });
                        break;
                    }
                }
            }
        }
    }

    // ══════════════════════════════════════
    // 재미 시스템 틱 처리
    // ══════════════════════════════════════

    const now = Date.now();

    // ── 아레나 시즌 리셋 (28일) ──
    if (Date.now() - arenaSeasonStart > 28 * 86400000) {
        // 시즌 보상 지급
        const sorted = Object.entries(arenaRankings).sort((a,b) => b[1].points - a[1].points);
        for (let i = 0; i < Math.min(10, sorted.length); i++) {
            const [pid, r] = sorted[i];
            const p = players[pid];
            if (!p) continue;
            const tier = getArenaTier(r.points);
            const reward = Math.floor(3000 / (i + 1));
            p.gold += reward;
            p.diamonds = (p.diamonds||0) + Math.floor(50 / (i + 1));
            io.to(pid).emit('server_msg', { msg: `[아레나 시즌 종료] ${i+1}위 (${tier.name})! +${reward}G`, type: 'rare' });
        }
        // 전체 리셋
        for (const id in arenaRankings) {
            arenaRankings[id].points = Math.max(1000, arenaRankings[id].points - 200); // 소프트 리셋
        }
        arenaSeasonStart = Date.now();
        io.emit('server_msg', { msg: '[아레나] 새 시즌 시작! 포인트가 리셋되었습니다.', type: 'boss' });
        logWorldEvent('아레나 시즌 리셋', 'boss');
    }

    // ── 존 미니보스 스폰 (30분마다) ──
    if (tickCounter % (30 * 1800) === 0 && tickCounter > 0) {
        for (const [zId, boss] of Object.entries(ZONE_MINI_BOSSES)) {
            if (zoneBossTimers[zId]) continue; // 이미 살아있음
            const zone = ZONES[zId];
            if (!zone) continue;
            entityIdCounter++;
            const bId = 'miniboss_' + zId + '_' + entityIdCounter;
            monsters[bId] = {
                id: bId, tier: 'boss', name: boss.name,
                x: zone.x + zone.w/2, y: zone.y + zone.h/2,
                hp: boss.hp, maxHp: boss.hp, atk: boss.atk, def: boss.def,
                color: '#ff2200', isAlive: true, zoneId: zId, aiType: 'breath',
                element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
                isMiniBoss: true, expReward: boss.reward.exp, goldReward: boss.reward.gold,
                lastSpecialAttack: 0,
            };
            zoneBossTimers[zId] = bId;
            io.emit('server_msg', { msg: `[미니보스] ${boss.name}이(가) ${zone.name}에 출현!`, type: 'boss' });
            logWorldEvent(`미니보스 ${boss.name} — ${zone.name}`, 'boss');
            io.emit('rare_spawn', { id: bId, name: boss.name, tier: 'miniboss', zoneId: zId, zoneName: zone.name });
        }
    }
    // 미니보스 사망 체크
    for (const [zId, bId] of Object.entries(zoneBossTimers)) {
        if (!monsters[bId] || !monsters[bId].isAlive) { delete zoneBossTimers[zId]; }
    }

    // ── 날씨 변경 ──
    if (Date.now() > nextWeatherChange) {
        const newWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
        if (newWeather.id !== currentWeather.id) {
            currentWeather = newWeather;
            // 접속 중인 플레이어에게 날씨 경험 추적
            for (const pid in players) {
                if (players[pid] && !players[pid].isBot && players[pid].isAlive) trackQuest(players[pid], 'weather_count', 1);
            }
            io.emit('weather_change', { id: newWeather.id, name: newWeather.name, effect: newWeather.effect });
            if (newWeather.id !== 'clear') {
                io.emit('server_msg', { msg: `[날씨] ${newWeather.name} — ${newWeather.effect?.element ? newWeather.effect.element + ' 속성 강화' : '전투 환경 변화'}`, type: 'normal' });
            }
        }
        nextWeatherChange = Date.now() + newWeather.duration * 1000;
    }

    // ── 시즌 균열 로테이션 (2주마다) ──
    if (Date.now() - currentSeason.startTime > 14 * 86400000) {
        // 시즌 종료 → 보상 지급 + 다음 시즌
        const sorted = Object.entries(currentSeason.leaderboard).sort((a,b) => b[1] - a[1]);
        for (let i = 0; i < Math.min(10, sorted.length); i++) {
            const [pid, depth] = sorted[i];
            const p = players[pid];
            if (!p) continue;
            const reward = Math.floor(5000 / (i + 1));
            p.gold += reward;
            p.diamonds = (p.diamonds||0) + Math.floor(100 / (i + 1));
            io.to(pid).emit('server_msg', { msg: `[시즌 종료] ${i+1}위! +${reward}G +${Math.floor(100/(i+1))}D`, type: 'rare' });
        }
        // 다음 테마
        const nextIdx = (RIFT_THEMES.indexOf(currentSeason.theme) + 1) % RIFT_THEMES.length;
        currentSeason = { theme: RIFT_THEMES[nextIdx], depth: 0, startTime: Date.now(), leaderboard: {} };
        // 모든 플레이어 균열 깊이 리셋
        for (const pid in players) { if (players[pid]._riftDepth) players[pid]._riftDepth = 0; }
        io.emit('server_msg', { msg: `[새 시즌] "${RIFT_THEMES[nextIdx].name}" 시즌 시작!`, type: 'boss' });
    }

    // ── 1. 트레저 고블린 (3~8분마다) ──
    if (!treasureGoblin && now > nextTreasureTime && Math.random() < 0.7) {
        const huntZoneEntries = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        if (huntZoneEntries.length > 0) {
            const [zId, zone] = huntZoneEntries[Math.floor(Math.random() * huntZoneEntries.length)];
            entityIdCounter++;
            const gId = 'goblin_' + entityIdCounter;
            monsters[gId] = {
                id: gId, tier: 'treasure', name: '보물 도깨비',
                x: zone.x + zone.w/2, y: zone.y + zone.h/2,
                hp: 500, maxHp: 500, atk: 0, def: 100,
                color: '#FFD700', isAlive: true, zoneId: zId,
                aiType: 'flee', element: 'fire',
                expReward: 0, goldReward: 0, lastSpecialAttack: 0,
            };
            treasureGoblin = { id: gId, zoneId: zId, spawnTime: now };
            io.emit('server_msg', { msg: `[보물 도깨비] ${ZONES[zId].name}에 보물 도깨비 출현! 15초 내에 잡아라!`, type: 'boss' });
            logWorldEvent(`보물 도깨비 — ${ZONES[zId].name}`, 'boss');
            io.emit('rare_spawn', { id: gId, name: '보물 도깨비', tier: 'treasure', zoneId: zId, zoneName: ZONES[zId].name });
            // 15초 후 도주
            setTimeout(() => {
                if (monsters[gId] && monsters[gId].isAlive) {
                    delete monsters[gId];
                    treasureGoblin = null;
                    io.emit('server_msg', { msg: '[보물 도깨비] 도깨비가 도망쳤다! 하하하!', type: 'danger' });
                }
                nextTreasureTime = now + 180000 + Math.random() * 300000;
            }, 15000);
        }
    }
    // 고블린 도주 AI (매 틱 빠르게 도주)
    if (treasureGoblin && monsters[treasureGoblin.id]) {
        const g = monsters[treasureGoblin.id];
        if (g.isAlive) {
            // 가장 가까운 플레이어 반대 방향으로 도주
            let nearP = null, nearD = 20;
            for (const pid in players) {
                const p = players[pid]; if (!p.isAlive) continue;
                const d = Math.hypot(g.x - p.x, g.y - p.y);
                if (d < nearD) { nearD = d; nearP = p; }
            }
            if (nearP) {
                const dx = g.x - nearP.x, dy = g.y - nearP.y;
                const mag = Math.hypot(dx, dy) || 1;
                g.x += (dx/mag) * 1.5; g.y += (dy/mag) * 1.5;
            } else {
                g.x += (Math.random()-0.5) * 2; g.y += (Math.random()-0.5) * 2;
            }
            g.x = Math.max(-1020, Math.min(1020, g.x));
            g.y = Math.max(-1020, Math.min(1020, g.y));
        }
    }

    // ── 2. 현상금 게시판 (10분마다) ──
    if (now - lastBountyUpdate > 600000) {
        lastBountyUpdate = now;
        bountyBoard = [];
        const candidates = Object.values(players).filter(p => !p.isBot && p.isAlive && (p.karma > 100 || p.level >= 20));
        candidates.sort((a,b) => (b.karma||0) - (a.karma||0));
        for (let i = 0; i < Math.min(3, candidates.length); i++) {
            const t = candidates[i];
            const reward = Math.floor(500 + t.level * 100 + (t.karma||0) * 10);
            bountyBoard.push({ targetId: t.id, targetName: t.displayName, reward: Math.min(reward, 5000), claimedBy: null, claimedAt: 0 });
        }
        if (bountyBoard.length > 0) {
            io.emit('bounty_update', bountyBoard.map(b => ({ targetName: b.targetName, reward: b.reward, claimed: !!b.claimedBy })));
            io.emit('server_msg', { msg: `[현상금] 새 현상금 ${bountyBoard.length}건 등록!`, type: 'rare' });
        }
    }

    // ── 6. 유성우 이벤트 (20~40분마다) ──
    if (!meteorShower && now > nextMeteorTime) {
        const huntZones = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        const [mzId, mZone] = huntZones[Math.floor(Math.random() * huntZones.length)];
        meteorShower = { zoneId: mzId, endTime: now + 120000 };
        io.emit('server_msg', { msg: `[유성우] ${mZone.name}에 유성우 발생! 2분간 파편 수집 + EXP/골드 x2!`, type: 'boss' });
        logWorldEvent(`유성우 — ${mZone.name}`, 'boss');
        io.emit('meteor_shower', { zoneId: mzId, zoneName: mZone.name, duration: 120 });
        nextMeteorTime = now + 1200000 + Math.random() * 1200000;
    }
    // 유성우 진행 중: 3초마다 유성 낙하
    if (meteorShower) {
        if (now > meteorShower.endTime) {
            io.emit('server_msg', { msg: '[유성우] 유성우가 끝났습니다.', type: 'normal' });
            meteorShower = null;
        } else if (tickCounter % 90 === 0) { // 3초마다
            const mz = ZONES[meteorShower.zoneId];
            if (mz) {
                const mx = mz.x + Math.random() * mz.w, my = mz.y + Math.random() * mz.h;
                // 유성 데미지
                for (const pid in players) {
                    const p = players[pid]; if (!p.isAlive) continue;
                    if (Math.hypot(p.x - mx, p.y - my) < 3) {
                        p.hp -= 200;
                        io.emit('player_hit', { id: pid, hp: p.hp, damage: 200, isCrit: false, skillName: '유성' });
                        if (p.hp <= 0 && p.isAlive) { p.isAlive = false; io.emit('player_die', { victimId: pid, attackerId: 'meteor', killerName: '유성' }); }
                    }
                }
                // 파편 드롭
                const fragGold = 50 + Math.floor(Math.random() * 450);
                spawnDrop(mx, my, fragGold, 'meteor_frag');
                if (Math.random() < 0.05) {
                    // 5% 확률 드래곤 비늘 파편
                    for (const pid in players) {
                        const p = players[pid]; if (!p.isAlive || p.isBot) continue;
                        if (Math.hypot(p.x - mx, p.y - my) < 4) {
                            if (!p.inventory) p.inventory = {};
                            p.inventory['mat_dragon'] = (p.inventory['mat_dragon']||0) + 1;
                            io.to(pid).emit('combat_log', { msg: '유성 파편에서 드래곤 비늘 발견!' });
                        }
                    }
                }
            }
        }
    }

    // ── 6.7 별똥별 소나기 (25~40분마다, 5분 지속, 매 5초마다 골드 드롭) ──
    if (!starShower && now > nextStarTime) {
        const huntZones = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        const [szId, sZone] = huntZones[Math.floor(Math.random() * huntZones.length)];
        starShower = { zoneId: szId, endTime: now + 300000 };
        io.emit('server_msg', { msg: `[별똥별 소나기] ${sZone.name}에 별똥별이 떨어집니다! 5분간 무작위 골드 드롭!`, type: 'rare' });
        logWorldEvent(`별똥별 소나기 — ${sZone.name}`, 'rare');
        io.emit('star_shower', { zoneId: szId, zoneName: sZone.name, duration: 300 });
        nextStarTime = now + 1500000 + Math.random() * 900000;
    }
    if (starShower) {
        if (now > starShower.endTime) {
            io.emit('server_msg', { msg: '[별똥별 소나기] 별똥별이 멎었습니다.', type: 'normal' });
            starShower = null;
        } else if (tickCounter % 150 === 0) { // 5초마다
            const sz = ZONES[starShower.zoneId];
            if (sz) {
                const sx = sz.x + Math.random() * sz.w;
                const sy = sz.y + Math.random() * sz.h;
                const starGold = 100 + Math.floor(Math.random() * 400);
                spawnDrop(sx, sy, starGold, 'star_loot');
            }
        }
    }

    // ── 6.5 황금 비 이벤트 (15~30분마다, 5분 지속) ──
    if (!goldenRain && now > nextGoldenTime) {
        const huntZones = Object.entries(ZONES).filter(([id, z]) => !z.safe && !z.isCastle && !z.isArena);
        const [gzId, gZone] = huntZones[Math.floor(Math.random() * huntZones.length)];
        goldenRain = { zoneId: gzId, endTime: now + 300000 };
        io.emit('server_msg', { msg: `[황금 비] ${gZone.name}에 황금 비가 내립니다! 5분간 골드 x3, EXP x1.5!`, type: 'rare' });
        logWorldEvent(`황금 비 — ${gZone.name}`, 'rare');
        io.emit('golden_rain', { zoneId: gzId, zoneName: gZone.name, duration: 300 });
        nextGoldenTime = now + 900000 + Math.random() * 900000;
    }
    if (goldenRain && now > goldenRain.endTime) {
        io.emit('server_msg', { msg: '[황금 비] 황금 비가 멎었습니다.', type: 'normal' });
        goldenRain = null;
    }

    // ── 4. 존 정복 집계 (매시 정각 리셋) ──
    if (now - lastConquestReset > 3600000) {
        lastConquestReset = now;
        // 영주 발표
        for (const [zId, data] of Object.entries(zoneConquest)) {
            if (!data.kills || Object.keys(data.kills).length === 0) continue;
            let maxClan = null, maxKills = 0;
            for (const [clan, kills] of Object.entries(data.kills)) {
                if (kills > maxKills) { maxKills = kills; maxClan = clan; }
            }
            if (maxClan) {
                data.lordClan = maxClan;
                data.kills = {};
                io.emit('server_msg', { msg: `[존 정복] ${ZONES[zId]?.name||zId} 영주: [${maxClan}] (${maxKills}킬)`, type: 'normal' });
            }
        }
    }

    // ── 8. 떠돌이 상인 (8~15분마다) ──
    if (!rogueMerchant && now > nextRogueTime) {
        const towns = Object.entries(ZONES).filter(([id, z]) => z.safe && z.npcs);
        const [townId, town] = towns[Math.floor(Math.random() * towns.length)];
        const deals = [];
        // 3개 랜덤 딜
        const allEquips = Object.keys(EQUIP_STATS).filter(k => EQUIP_STATS[k].grade === 'epic' || EQUIP_STATS[k].grade === 'legendary');
        if (allEquips.length > 0) {
            const eq = allEquips[Math.floor(Math.random() * allEquips.length)];
            deals.push({ type: 'equip', itemId: eq, name: EQUIP_STATS[eq].name, price: 150, currency: 'diamond', desc: '50% 할인 장비' });
        }
        deals.push({ type: 'material', itemId: 'mat_dragon', name: '드래곤 비늘 x20', price: 2000, currency: 'gold', qty: 20, desc: '대량 재료' });
        deals.push({ type: 'mystery', name: '미스터리 박스', price: 500, currency: 'gold', desc: '60%쓰레기/25%고급/10%희귀/4%영웅/1%전설' });
        rogueMerchant = { townId, deals, expiresAt: now + 90000, bought: {} };
        io.emit('server_msg', { msg: `[떠돌이 상인] ${town.name}에 신비한 상인이 90초간 출현!`, type: 'rare' });
        io.emit('rogue_merchant', { townId, townName: town.name, deals: deals.map((d,i) => ({ idx:i, name:d.name, price:d.price, currency:d.currency, desc:d.desc, sold:false })), expiresIn: 90 });
        nextRogueTime = now + 480000 + Math.random() * 420000;
    }
    if (rogueMerchant && now > rogueMerchant.expiresAt) {
        io.emit('server_msg', { msg: '[떠돌이 상인] 상인이 사라졌습니다...', type: 'normal' });
        rogueMerchant = null;
    }

    // 보스 카운트다운 타이머
    const bossInterval = 30 * 300; // 5분 = 9000틱
    const ticksUntilBoss = bossInterval - (tickCounter % bossInterval);
    const secsUntilBoss = Math.floor(ticksUntilBoss / 30);
    if (secsUntilBoss === 120 || secsUntilBoss === 60 || secsUntilBoss === 30 || secsUntilBoss === 10) {
        io.emit('boss_countdown', { seconds: secsUntilBoss });
    }

    // 골드 피버 이벤트 (15분마다 랜덤 PK존에서 3분간 3배 보상)
    if (tickCounter % (30 * 900) === 0 && tickCounter > 0) {
        const feverZones = ['chaos','warzone','lawless','blood_arena'];
        const feverZone = feverZones[Math.floor(Math.random() * feverZones.length)];
        const zoneName = ZONES[feverZone]?.name || feverZone;
        goldFeverZone = feverZone;
        goldFeverEnd = Date.now() + 180000; // 3분
        io.emit('gold_fever', { zoneId: feverZone, zoneName, duration: 180 });
        io.emit('server_msg', { msg: `[골드 피버!] ${zoneName}에서 3분간 골드/EXP x3! 위험을 감수하라!`, type: 'boss' });
        logWorldEvent(`골드 피버 — ${zoneName}`, 'boss');
    }

    // 월드 보스 스폰 (5분마다)
    if (tickCounter % (30 * 300) === 0 && tickCounter > 0) {
        spawnWorldBoss();
    }

    // 월드 보스 타이머 업데이트
    if (worldBoss && worldBoss.isAlive && tickCounter % 30 === 0) {
        // 보스 생존 시간 체크 (10분 후 사라짐)
        if (Date.now() - worldBoss.spawnTime > 600000) {
            io.emit('server_msg', { msg: `월드 보스 ${worldBoss.name}이(가) 사라졌습니다...`, type: 'danger' });
            if (monsters[worldBoss.id]) delete monsters[worldBoss.id];
            worldBoss = null;
        }
    }

    // 낮/밤 순환 (1초마다 체크)
    if (tickCounter % 30 === 0) {
        worldTime = Math.floor((Date.now() / 1000) % DAY_NIGHT_CYCLE);
        const wasNight = isNight;
        isNight = worldTime > DAY_NIGHT_CYCLE / 2; // 후반 5분 = 밤
        if (isNight && !wasNight) {
            io.emit('server_msg', { msg: '밤이 찾아왔습니다... 몬스터가 강해집니다! (ATK/HP +20%, EXP +20%)', type: 'danger' });
            io.emit('day_night', { isNight: true });
            // 밤: 모든 몬스터 ATK/HP 20% 증가
            for (const mId in monsters) {
                const m = monsters[mId];
                        if (!m) continue;

                if (!m.nightBuffed) {
                    m.atk = Math.floor(m.atk * 1.2);
                    m.hp = Math.floor(m.hp * 1.2);
                    m.maxHp = Math.floor(m.maxHp * 1.2);
                    m.nightBuffed = true;
                }
            }
        } else if (!isNight && wasNight) {
            io.emit('server_msg', { msg: '날이 밝았습니다. 안전한 사냥을!', type: 'normal' });
            io.emit('day_night', { isNight: false });
            // 낮: 몬스터 원래 스탯 복구
            for (const mId in monsters) {
                const m = monsters[mId];
                        if (!m) continue;

                if (m.nightBuffed) {
                    m.atk = Math.floor(m.atk / 1.2);
                    m.hp = Math.floor(m.hp / 1.2);
                    m.maxHp = Math.floor(m.maxHp / 1.2);
                    if (m.hp > m.maxHp) m.hp = m.maxHp;
                    m.nightBuffed = false;
                }
            }
        }
    }

    // 주간 랭킹 보상 체크 (1분마다)
    if (tickCounter % (30 * 60) === 0) {
        checkWeeklyRankingRewards();
    }

    // v2.35: 세계 보스 연대기 주간 리셋 (1분마다)
    if (tickCounter % (30 * 60) === 0) {
        const resetResult = worldChronicle.checkWeeklyReset();
        if (resetResult.reset) {
            io.emit('server_msg', { msg: `[연대기] 🌟 새 시즌: "${resetResult.newSeason.name}" ${resetResult.newSeason.icon} 시작!`, type: 'boss' });
            io.emit('chronicle_new_season', resetResult.newSeason);
        }
    }

    // v2.29: 전장 점령 틱 (매 초)
    if (tickCounter % 30 === 0) {
        const captureEvents = territoryWar.tickCapture(players);
        for (const ev of captureEvents) {
            io.emit('server_msg', {
                msg: `[전장] ${ev.factionIcon} ${ev.factionName}이(가) ${ev.zoneName} 점령!`,
                type: 'boss',
            });
            io.emit('territory_update', territoryWar.getStatus());
        }
    }
    // v2.29: 전장 자원 생산 (5분마다)
    if (tickCounter % (30 * 300) === 0) {
        const rewards = territoryWar.produceResources(players);
        if (rewards.length > 0) {
            const factionTotals = {};
            for (const r of rewards) {
                if (!factionTotals[r.zone]) factionTotals[r.zone] = 0;
                factionTotals[r.zone] += r.gold;
                io.to(r.playerId).emit('territory_income', r);
            }
        }
    }

    // v2.28: 슈퍼 보스 스폰 + 타임아웃 (30초마다 체크)
    if (tickCounter % (30 * 30) === 0) {
        // 타임아웃 체크
        if (superBoss.checkTimeout()) {
            io.emit('server_msg', { msg: '[슈퍼 보스] 시간 초과! 보스가 사라졌다...', type: 'danger' });
            io.emit('super_boss_timeout');
        }
        // 스폰 체크 (6/12/18/22시, 접속자 5명+, 비활성 시)
        const hour = new Date().getHours();
        const min = new Date().getMinutes();
        const onlineCount = Object.values(players).filter(p => !p.isBot && p.isAlive).length;
        if (!superBoss.getActiveBoss() && onlineCount >= 5 && min < 2 &&
            superBoss.SUPER_BOSS_CONFIG.spawnSchedule.includes(hour)) {
            const bossKeys = Object.keys(superBoss.SUPER_BOSSES);
            const randomBoss = bossKeys[Math.floor(Math.random() * bossKeys.length)];
            const result = superBoss.spawnSuperBoss(randomBoss);
            if (result.success) {
                io.emit('server_msg', { msg: result.spawnMsg, type: 'boss' });
                io.emit('super_boss_spawn', superBoss.getStatus());
            }
        }
    }

    // v2.22: PvP 매칭 시도 (5초마다)
    if (tickCounter % (30 * 5) === 0) {
        const matchResults = pvpMatch.tryMatch();
        for (const mr of matchResults) {
            if (mr.timeout) {
                io.to(mr.playerId).emit('pvp_match_result', { success: false, msg: '매칭 시간 초과' });
            } else if (mr.matchId) {
                for (const p of mr.players) {
                    io.to(p.playerId).emit('pvp_match_found', { matchId: mr.matchId, mode: mr.mode, teams: mr.teams, players: mr.players });
                }
                io.emit('server_msg', { msg: `[PvP] ${mr.mode} 매칭 성사!`, type: 'normal' });
            }
        }
        // 시즌 리셋 체크
        const seasonCheck = pvpMatch.checkSeasonReset();
        if (seasonCheck.reset) {
            io.emit('server_msg', { msg: '[PvP] 새 시즌 시작! 랭킹이 초기화되었습니다.', type: 'boss' });
        }
    }

    // 시간대별 필드보스 스폰 (12:00, 20:00)
    if (tickCounter % (30 * 60) === 0) {
        const hour = new Date().getHours();
        if ((hour === 12 || hour === 20) && lastFieldBossHour !== hour) {
            lastFieldBossHour = hour;
            // 고급 사냥터에 엘리트 필드보스 3마리 추가 스폰
            const fieldBossZones = ['volcano','darkforest','graveyard'];
            for (const zId of fieldBossZones) {
                const zone = ZONES[zId];
                if (!zone) continue;
                entityIdCounter++;
                const fbId = 'fieldboss_' + entityIdCounter;
                monsters[fbId] = {
                    id: fbId, tier: 'boss',
                    name: '필드 보스 ' + zone.name,
                    x: zone.x + zone.w / 2, y: zone.y + zone.h / 2,
                    hp: 5000, maxHp: 5000, atk: 80, def: 40,
                    color: '#FF2222', isAlive: true, isFieldBoss: true,
                    element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)],
                    expReward: 1000, goldReward: 500,
                };
                io.emit('monster_spawn', monsters[fbId]);
            }
            io.emit('server_msg', { msg: `[필드 보스] ${hour}:00 - 필드 보스 3마리가 고급 사냥터에 출현!`, type: 'boss' });
        }
    }

    // 온라인 플레이어 일일 리셋 (1분마다 체크 — 자정 넘어서도 계속 접속한 유저용)
    if (tickCounter % (30 * 60) === 0) {
        const today = new Date().toDateString();
        for (const pid in players) {
            const p = players[pid];
                    if (!p) continue;

            if (p.isBot) continue;
            if (p.lastLoginDate && p.lastLoginDate !== today) {
                p.lastLoginDate = today;
                p._dailyChallengeProgress = 0;
                p._dailyChallengeCompleted = false;
                p._dailyChallengeClaimed = false;
                p.arenaCountToday = 0;
                if (p.lastLuckySpin && p.lastLuckySpin !== today) {
                    // lucky spin은 toDateString 비교라 자동 리셋되지만 안전하게 정리
                }
                io.to(pid).emit('server_msg', { msg: '[일일 리셋] 일일 챌린지/아레나/룰렛 횟수가 초기화되었습니다.', type: 'normal' });
            }
        }
    }

    // 공성전 세금 수입 (5분마다 성 소유 혈맹에게 지급)
    if (tickCounter % (30 * 300) === 0 && castleOwner && clans[castleOwner]) {
        const ownerClan = clans[castleOwner];
        const taxGold = 500; // 5분마다 500G
        for (const mid of ownerClan.members) {
            const member = players[mid];
            if (member && member.isAlive) {
                member.gold += taxGold;
                io.to(mid).emit('combat_log', { msg: `[세금] 왕의 성 세금 수입 +${taxGold}G` });
            }
        }
        ownerClan.exp += 50; // 혈맹 경험치도
    }

    // 카르마 자연 감소 (매 분)
    if (tickCounter % (30 * 60) === 0) {
        for (let pId in players) {
            const p = players[pId];
                    if (!p) continue;

            if (!p.isBot && p.karma > 0) {
                p.karma = Math.max(0, p.karma - KARMA.DECAY_PER_MIN);
                io.emit('player_update', p);
            }
        }
    }

    // 혈맹 전쟁 24시간 자동 종료 (1분마다 ���크)
    if (tickCounter % (30 * 60) === 0) {
        const now = Date.now();
        for (const [clanName, clan] of Object.entries(clans)) {
            if (clan.war && clan.war.endTime && now > clan.war.endTime) {
                const targetClan = clans[clan.war.target];
                io.emit('server_msg', { msg: `[혈맹 전쟁] ${clanName} vs ${clan.war.target} 전쟁 종료!`, type: 'normal' });
                if (targetClan && targetClan.war) targetClan.war = null;
                clan.war = null;
            }
        }
    }

    // 던전 인스턴스 타임아웃 (30분)
    if (tickCounter % (30 * 60) === 0) {
        const now = Date.now();
        for (const [instId, inst] of Object.entries(activeDungeons)) {
            if (now - inst.startTime > 1800000) {
                for (const pid of inst.players) {
                    if (players[pid]) {
                        players[pid].inDungeon = null;
                        io.to(pid).emit('dungeon_result', { msg: '던전 시간 초과! (30분)' });
                    }
                }
                delete activeDungeons[instId];
            }
        }
    }

    // 자동 골드 군대 소환 (200골드마다, 최대 30명)
    for (let pId in players) {
        const p = players[pId];
                if (!p) continue;

        if (!p.isBot && p.isAlive) {
            let myArmyCount = 0;
            for (let bId in players) {
                if (players[bId].isBot && players[bId].ownerId === pId
                    && players[bId].className !== 'GuardianTower' && players[bId].isAlive) {
                    myArmyCount++;
                }
            }

            let spawned = false;
            const maxArmy = p.maxArmy || 30;
            while (p.gold >= 200 && myArmyCount < maxArmy) {
                p.gold -= 200;
                createAutoArmy(pId);
                myArmyCount++;
                spawned = true;
            }
            if (spawned) {
                io.emit('player_update', p);
                savePlayer(p);
            }
        }
    }

    // 드롭 아이템 자동 줍기
    for (let dropId in drops) {
        const drop = drops[dropId];
        for (let pId in players) {
            const p = players[pId];
                    if (!p) continue;

            if (!p.isAlive) continue;
            const dist = Math.hypot(p.x - drop.x, p.y - drop.y);
            if (dist < drop.pickupRadius) {
                // 봇이 주우면 주인에게
                let receiver = p;
                if (p.isBot && p.ownerId && players[p.ownerId]) {
                    receiver = players[p.ownerId];
                }
                receiver.gold += drop.gold;
                io.emit('player_update', receiver);
                io.emit('drop_destroy', dropId);
                delete drops[dropId];
                break;
            }
        }
    }

    updateBots();

    // 패시브 스킬 (워리어 분노/나이트 수호 오라 등) — 모든 플레이어 대상, 4틱당 1회
    if (tickCounter % 4 === 0) updatePassives();

    // 인간 플레이어 자동 스킬 (autoSkill 토글 시) — 6틱당 1회
    if (tickCounter % 6 === 0) updatePlayerAutoSkills();

    // 경매 만료 처리 (30초마다 cron — 아무도 browse 안 해도 자동 정산)
    if (tickCounter % (30 * 30) === 0) expireMarketListings();

    if (tickCounter % 15 === 0) handleAoeDamage();

    syncGameState();
  } catch (err) {
    console.error('[GameLoop] tick error:', err.message, err.stack?.split('\n')[1]);
  }
}, TICK_TIME);

// ==========================================
// 봇 AI
// ==========================================

// 경매 만료 처리 — market_browse 호출 시 + 30초마다 cron

// 패시브 스킬 적용 — 모든 플레이어 (봇 + 실제 유저) 대상

// 인간 플레이어 자동 스킬 시전 (autoSkill 토글 시)


// ==========================================
// 경험치 & 레벨업
// ==========================================


// ==========================================
// 충돌 처리
// ==========================================



// ==========================================
// 사망 처리 (PK 카르마 시스템)
// ==========================================



// ==========================================
// 동기화
// ==========================================


// ══════════════════════════════════════
// 서버 안정성 시스템
// ═══════��══════════════════════════════

// ── 주기적 자동 저장 (60초마다) ──
setInterval(async () => {
    let saved = 0;
    for (const pId in players) {
        const p = players[pId];
                if (!p) continue;

        if (!p.isBot && p.isAlive && p.deviceId && p.deviceId !== 'bot') {
            // 플레이 시간 추적 (60초마다 60초 누적)
            p._totalPlaytime = (p._totalPlaytime || 0) + 60;
            trackQuest(p, 'playtime', p._totalPlaytime);
            await savePlayer(p);
            saved++;
        }
    }
    if (saved > 0) console.log(`[AutoSave] ${saved}명 저장 완료`);
}, 60000);

// ── 월드 상태 영속화 (2분마다) ──
async function saveWorldState() {
    try {
        const worldState = JSON.stringify({
            clans, bountyBoard: bountyBoard.slice(0, 10),
            arenaRankings, castleOwner, factionState,
            currentSeason: { theme: currentSeason.theme, startTime: currentSeason.startTime, leaderboard: currentSeason.leaderboard },
            zoneConquest,
        });
        await pool.query(`
            INSERT INTO players_save (device_id, class_name, level, exp, gold, kill_count, karma, team, is_alive, army_data, ext_data)
            VALUES ('__world_state__', 'system', 0, 0, 0, 0, 0, 'system', true, '[]', ?)
            ON DUPLICATE KEY UPDATE ext_data=VALUES(ext_data)
        `, [worldState]);
    } catch(e) { console.error('[WorldState] Save Error:', e.message); }
}
setInterval(saveWorldState, 120000);

// ── 월드 상태 복원 (서버 시작 시) ──
async function loadWorldState() {
    try {
        const [rows] = await pool.query('SELECT ext_data FROM players_save WHERE device_id = ?', ['__world_state__']);
        if (rows.length > 0 && rows[0].ext_data) {
            const ws = JSON.parse(rows[0].ext_data);
            if (ws.clans) Object.assign(clans, ws.clans);
            if (ws.arenaRankings) Object.assign(arenaRankings, ws.arenaRankings);
            if (ws.castleOwner) castleOwner = ws.castleOwner;
            if (ws.factionState) Object.assign(factionState, ws.factionState);
            if (ws.zoneConquest) Object.assign(zoneConquest, ws.zoneConquest);
            if (ws.currentSeason) {
                currentSeason.startTime = ws.currentSeason.startTime;
                currentSeason.leaderboard = ws.currentSeason.leaderboard || {};
                const themeIdx = RIFT_THEMES.findIndex(t => t.id === ws.currentSeason.theme?.id);
                if (themeIdx >= 0) currentSeason.theme = RIFT_THEMES[themeIdx];
            }
            console.log('[WorldState] 복원 완료 — 혈맹:', Object.keys(clans).length, '진영:', Object.keys(factionState).length);
        }
    } catch(e) { console.error('[WorldState] Load Error:', e.message); }
}
loadWorldState();

// ── Graceful Shutdown (SIGTERM) ──
async function gracefulShutdown(signal) {
    console.log(`[Server] ${signal} 수신 — 안전 종료 시작...`);
    // 모든 플레이어 저장
    const promises = [];
    for (const pId in players) {
        if (!players[pId].isBot && players[pId].deviceId && players[pId].deviceId !== 'bot') {
            promises.push(savePlayer(players[pId]));
        }
    }
    // 월드 상태 저장
    promises.push(saveWorldState());
    await Promise.allSettled(promises);
    console.log(`[Server] ${promises.length}건 저장 완료. 종료합니다.`);
    process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
