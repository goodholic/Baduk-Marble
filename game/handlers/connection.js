// Connection Handler - thin dispatcher (Phase 5 category split)
// Delegates to category-specific handler files + pre-existing module handlers

const { registerCoreConnectionHandlers } = require('./core_connection');
const { registerInventoryConnectionHandlers } = require('./inventory_connection');
const { registerEconomyConnectionHandlers } = require('./economy_connection');
const { registerCombatPvpConnectionHandlers } = require('./combat_pvp_connection');
const { registerSocialConnectionHandlers } = require('./social_connection');
const { registerQuestMiscConnectionHandlers } = require('./quest_misc_connection');

// Pre-existing module handlers
const { registerLotteryHandlers } = require('./lottery_handlers');
const { registerFishingHandlers } = require('./fishing_handlers');
const { registerEventHandlers } = require('./event_handlers');
const { registerAuctionHandlers } = require('./auction_handlers');
const { registerBossRushHandlers } = require('./boss_rush_handlers');
const { registerSeasonHandlers } = require('./season_handlers');
const { registerFarmHandlers } = require('./farm_handlers');
const { registerSkillTreeHandlers } = require('./skill_tree_handlers');
const { registerMailHandlers } = require('./mail_handlers');
const { registerCodexHandlers } = require('./codex_handlers');
const { registerDailyShopHandlers } = require('./daily_shop_handlers');
const { registerRunesHandlers } = require('./runes_handlers');
const { registerBreedingHandlers } = require('./breeding_handlers');
const { registerRelicHandlers } = require('./relic_handlers');
const { registerTreasureMapHandlers } = require('./treasure_map_handlers');
const { registerTrainingHandlers } = require('./training_handlers');
const { registerPetBattleHandlers } = require('./pet_battle_handlers');
const { registerExpeditionHandlers } = require('./expedition_handlers');
const { registerRaidHandlers } = require('./raid_handlers');
const { registerTransmutationHandlers } = require('./transmutation_handlers');
const { registerJobsHandlers } = require('./jobs_handlers');
const { registerBlackMarketHandlers } = require('./black_market_handlers');
const { registerLeaderboardHandlers } = require('./leaderboard_handlers');
const { registerCompanionHandlers } = require('./companion_handlers');
const { registerWorldEventHandlers } = require('./world_event_handlers');
const { registerPostofficeHandlers } = require('./postoffice_handlers');
const { registerTransmogHandlers } = require('./transmog_handlers');
const { registerFortuneHandlers } = require('./fortune_handlers');
const { registerInsuranceHandlers } = require('./insurance_handlers');
const { registerMiscHandlers } = require('./misc_handlers');
const { registerDiaryHandlers } = require('./diary_handlers');
const { registerMeditationHandlers } = require('./meditation_handlers');
const { registerCookingHandlers } = require('./cooking_handlers');
const { registerConstellationHandlers } = require('./constellation_handlers');
const { registerWeatherHandlers } = require('./weather_handlers');
const { registerGemcraftHandlers } = require('./gemcraft_handlers');
const { registerOracleHandlers } = require('./oracle_handlers');
const { registerGatheringHandlers } = require('./gathering_handlers');
const { registerForgeHandlers } = require('./forge_handlers');
const { registerLegendsHandlers } = require('./legends_handlers');
const { registerBonusHandlers } = require('./bonus_handlers');
const { registerMorphHandlers } = require('./morph_handlers');
const { registerWaypointHandlers } = require('./waypoint_handlers');
const { registerFriendsHandlers } = require('./friends_handlers');
const { registerProfileHandlers } = require('./profile_handlers');
const { registerCasinoHandlers } = require('./casino_handlers');
const { registerEmoteHandlers } = require('./emote_handlers');
const { registerLabyrinthHandlers } = require('./labyrinth_handlers');
const { registerSailingHandlers } = require('./sailing_handlers');
const { registerExcavationHandlers } = require('./excavation_handlers');
const { registerDreamHandlers } = require('./dream_handlers');
const { registerMusicHandlers } = require('./music_handlers');
const { registerTarotHandlers } = require('./tarot_handlers');
const { registerTalismanHandlers } = require('./talisman_handlers');
const { registerWishingWellHandlers } = require('./wishing_well_handlers');
const { registerMaskHandlers } = require('./mask_handlers');
const { registerHeraldryHandlers } = require('./heraldry_handlers');
const { registerRiftHandlers } = require('./rift_handlers');
const { registerGardenHandlers } = require('./garden_handlers');
const { registerQuestChainHandlers } = require('./quest_chain_handlers');
const { registerBossSummonHandlers } = require('./boss_summon_handlers');
const { registerWeatherDungeonHandlers } = require('./weather_dungeon_handlers');
const { registerPvpMatchHandlers } = require('./pvp_match_handlers');
const { registerBountyHunterHandlers } = require('./bounty_hunter_handlers');
const { registerRaceHandlers } = require('./race_handlers');
const { registerRelicFusionHandlers } = require('./relic_fusion_handlers');
const { registerSkillWaveHandlers } = require('./skill_wave_handlers');
const { registerAchievementHandlers } = require('./achievement_handlers');
const { registerSuperBossHandlers } = require('./super_boss_handlers');
const { registerTerritoryWarHandlers } = require('./territory_war_handlers');
const { registerWishTreeHandlers } = require('./wish_tree_handlers');
const { registerSoulHandlers } = require('./soul_handlers');
const { registerTimeDungeonHandlers } = require('./time_dungeon_handlers');
const { registerMythicSummonHandlers } = require('./mythic_summon_handlers');
const { registerAncientRuinsHandlers } = require('./ancient_ruins_handlers');
const { registerChronicleHandlers } = require('./chronicle_handlers');
const { registerAdvGuildHandlers } = require('./adv_guild_handlers');
const { registerMagicLabHandlers } = require('./magic_lab_handlers');
const { registerMoonlightHandlers } = require('./moonlight_handlers');
const { registerWeaponSoulHandlers } = require('./weapon_soul_handlers');
const { registerFortressHandlers } = require('./fortress_handlers');
const { registerAstralHandlers } = require('./astral_handlers');
const { registerCursedDungeonHandlers } = require('./cursed_dungeon_handlers');
const { registerFateDuelHandlers } = require('./fate_duel_handlers');
const { registerSpiritForgeHandlers } = require('./spirit_forge_handlers');
const { registerPhantomColosseumHandlers } = require('./phantom_colosseum_handlers');
const { registerDreamArchitectHandlers } = require('./dream_architect_handlers');
const { registerConstellationWarHandlers } = require('./constellation_war_handlers');
const { registerForbiddenLibraryHandlers } = require('./forbidden_library_handlers');
const { registerBeastColossusHandlers } = require('./beast_colossus_handlers');
const { registerMerchantCaravanHandlers } = require('./merchant_caravan_handlers');
const { registerMemoryPalaceHandlers } = require('./memory_palace_handlers');
const { registerDemonThroneHandlers } = require('./demon_throne_handlers');
const { registerCelestialForgeHandlers } = require('./celestial_forge_handlers');
const { registerLivingGrimoireHandlers } = require('./living_grimoire_handlers');
const { registerWorldSeedHandlers } = require('./world_seed_handlers');
const { registerFateWeaverHandlers } = require('./fate_weaver_handlers');
const { registerGrimoireHandlers } = require('./grimoire_handlers');
const { registerBloodlineHandlers } = require('./bloodline_handlers');
const { registerSoulContractHandlers } = require('./soul_contract_handlers');
const { registerAncientLanguageHandlers } = require('./ancient_language_handlers');
const { registerDivineBlessingHandlers } = require('./divine_blessing_handlers');
const { registerPastLifeHandlers } = require('./past_life_handlers');
const { registerMutationHandlers } = require('./mutation_handlers');
const { registerCursedEquipHandlers } = require('./cursed_equip_handlers');
const { registerAlchemyHandlers } = require('./alchemy_handlers');
const { registerGolemHandlers } = require('./golem_handlers');
const { registerHallHandlers } = require('./hall_handlers');
const { registerSpiritPactHandlers } = require('./spirit_pact_handlers');
const { registerMythicWeaponHandlers } = require('./mythic_weapon_handlers');
const { registerDimensionHandlers } = require('./dimension_handlers');
const { registerDragonRidingHandlers } = require('./dragon_riding_handlers');

function registerConnection(io, $) {

io.on("connection", (socket) => {
    const playerId = socket.id;
    const {
        players, MAX_PLAYERS, savePlayer, trackQuest, codexDiscover, getZone,
        MAX_GOLD, MAX_DIAMONDS, EQUIP_STATS, TRADE_GOODS,
        lottery, fishing, festival, seasonPass, bossRush, auction,
        dailyShop, codex, mailbox, skillTree, farm,
        petBattle, training, treasureMap, relic, breeding, runes,
        leaderboard, blackMarket, jobs, transmutation, raid, expedition,
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
        clans, bossRushSessions, handleRaidFinish, finishBossRush,
    } = $;

    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('server_full', { message: '서버가 가득 찼습니다.' });
        socket.disconnect();
        return;
    }

    // ── 소켓 레이트 리밋 (DoS 방어) ──
    const _rateBucket = { count: 0, windowStart: Date.now(), strikes: 0 };
    const _highFreqEvents = new Set(['move', 'update_dir', 'throw', 'active_tap']);
    socket.use((packet, next) => {
        const eventName = Array.isArray(packet) ? packet[0] : null;
        if (_highFreqEvents.has(eventName)) { next(); return; }
        const now = Date.now();
        if (now - _rateBucket.windowStart > 1000) {
            if (_rateBucket.count <= 200 && _rateBucket.strikes > 0) _rateBucket.strikes--;
            _rateBucket.count = 0;
            _rateBucket.windowStart = now;
        }
        _rateBucket.count++;
        if (_rateBucket.count > 200) {
            _rateBucket.strikes++;
            if (_rateBucket.strikes >= 5) {
                console.warn(`[rate-limit] socket ${socket.id} disconnect — ${_rateBucket.count}/s`);
                socket.disconnect(true);
            }
            return;
        }
        next();
    });

    // ---- Category handlers (split from inline) ----
    // playerId를 $ 에 주입하여 sub-connection 핸들러에서 접근 가능하도록
    const $ctx = Object.create($);
    $ctx.playerId = playerId;
    $ctx.io = io;
    registerCoreConnectionHandlers(socket, $ctx);
    registerInventoryConnectionHandlers(socket, $ctx);
    registerEconomyConnectionHandlers(socket, $ctx);
    registerCombatPvpConnectionHandlers(socket, $ctx);
    registerSocialConnectionHandlers(socket, $ctx);
    registerQuestMiscConnectionHandlers(socket, $ctx);

    // ---- Module handlers (pre-existing) ----
    registerLotteryHandlers(socket, { io, players, playerId, savePlayer, trackQuest, MAX_GOLD, MAX_DIAMONDS, lottery });
    registerDiaryHandlers(socket, { players, playerId, diary });
    registerMeditationHandlers(socket, { io, players, playerId, savePlayer, meditation });
    registerCookingHandlers(socket, { io, players, playerId, savePlayer, cooking });
    registerConstellationHandlers(socket, { io, players, playerId, savePlayer, constellation });
    registerWeatherHandlers(socket, { io, players, playerId, savePlayer, weather });
    registerGemcraftHandlers(socket, { io, players, playerId, savePlayer, gemcraft });
    registerOracleHandlers(socket, { io, players, playerId, savePlayer, oracle });
    registerGatheringHandlers(socket, { io, players, playerId, savePlayer, gathering });
    registerForgeHandlers(socket, { io, players, playerId, savePlayer, forge });
    registerLegendsHandlers(socket, { io, players, playerId, savePlayer, legends });
    registerBonusHandlers(socket, { players, playerId, bonusAggregator });
    registerMorphHandlers(socket, { io, players, playerId, savePlayer, morph });
    registerWaypointHandlers(socket, { io, players, playerId, savePlayer, waypoint });
    registerFriendsHandlers(socket, { io, players, playerId, savePlayer, friends });
    registerProfileHandlers(socket, { io, players, playerId, savePlayer, profile });
    registerCasinoHandlers(socket, { io, players, playerId, savePlayer, casino });
    registerEmoteHandlers(socket, { io, players, playerId, savePlayer, emote });
    registerLabyrinthHandlers(socket, { io, players, playerId, savePlayer, labyrinth });
    registerSailingHandlers(socket, { io, players, playerId, savePlayer, sailing });
    registerExcavationHandlers(socket, { io, players, playerId, savePlayer, excavation });
    registerDreamHandlers(socket, { io, players, playerId, savePlayer, dream });
    registerMusicHandlers(socket, { io, players, playerId, savePlayer, music });
    registerTarotHandlers(socket, { io, players, playerId, savePlayer, tarot });
    registerTalismanHandlers(socket, { io, players, playerId, savePlayer, talisman });
    registerWishingWellHandlers(socket, { io, players, playerId, savePlayer, wishingWell });
    registerMaskHandlers(socket, { io, players, playerId, savePlayer, mask });
    registerHeraldryHandlers(socket, { io, players, playerId, savePlayer, heraldry });
    registerRiftHandlers(socket, { io, players, playerId, savePlayer, rift });
    registerGardenHandlers(socket, { io, players, playerId, savePlayer, garden });
    registerQuestChainHandlers(socket, { io, players, playerId, savePlayer, questChain: $.questChain });
    registerBossSummonHandlers(socket, { io, players, playerId, savePlayer, bossSummon: $.bossSummon });
    registerPvpMatchHandlers(socket, { io, players, playerId, savePlayer, pvpMatch: $.pvpMatch, trackQuest: $.trackQuest });
    registerBountyHunterHandlers(socket, { io, players, playerId, savePlayer, bountyHunter: $.bountyHunter });
    registerRaceHandlers(socket, { io, players, playerId, savePlayer, raceSystem: $.raceSystem });
    registerRelicFusionHandlers(socket, { io, players, playerId, savePlayer, relicFusion: $.relicFusion });
    registerSkillWaveHandlers(socket, { io, players, playerId, savePlayer, skillWave: $.skillWave });
    registerAchievementHandlers(socket, { io, players, playerId, savePlayer, achievements: $.achievements });
    registerSuperBossHandlers(socket, { io, players, playerId, savePlayer, superBoss: $.superBoss, trackQuest: $.trackQuest });
    registerTerritoryWarHandlers(socket, { io, players, playerId, savePlayer, territoryWar: $.territoryWar });
    registerWishTreeHandlers(socket, { io, players, playerId, savePlayer, wishTree: $.wishTree });
    registerSoulHandlers(socket, { io, players, playerId, savePlayer, soulSystem: $.soulSystem });
    registerTimeDungeonHandlers(socket, { io, players, playerId, savePlayer, timeDungeon: $.timeDungeon, trackQuest: $.trackQuest });
    registerMythicSummonHandlers(socket, { io, players, playerId, savePlayer, mythicSummon: $.mythicSummon });
    registerAncientRuinsHandlers(socket, { io, players, playerId, savePlayer, ancientRuins: $.ancientRuins, trackQuest: $.trackQuest });
    registerChronicleHandlers(socket, { io, players, playerId, savePlayer, chronicle: $.worldChronicle, trackQuest: $.trackQuest });
    registerAdvGuildHandlers(socket, { io, players, playerId, savePlayer, advGuild: $.advGuild });
    registerMagicLabHandlers(socket, { io, players, playerId, savePlayer, magicLab: $.magicLab });
    registerMoonlightHandlers(socket, { io, players, playerId, savePlayer, moonSanctuary: $.moonSanctuary, getIsNight: () => $.isNight });
    registerWeaponSoulHandlers(socket, { io, players, playerId, savePlayer, weaponSoul: $.weaponSoul });
    registerFortressHandlers(socket, { io, players, playerId, savePlayer, floatingFortress: $.floatingFortress });
    registerAstralHandlers(socket, { io, players, playerId, savePlayer, astralProjection: $.astralProjection });
    registerCursedDungeonHandlers(socket, { io, players, playerId, savePlayer, cursedDungeon: $.cursedDungeon });
    registerFateDuelHandlers(socket, { io, players, playerId, savePlayer, fateDuel: $.fateDuel });
    registerSpiritForgeHandlers(socket, { io, players, playerId, savePlayer, spiritForge: $.spiritForge });
    registerPhantomColosseumHandlers(socket, { io, players, playerId, savePlayer, phantomColosseum: $.phantomColosseum });
    registerDreamArchitectHandlers(socket, { io, players, playerId, savePlayer, dreamArchitect: $.dreamArchitect });
    registerConstellationWarHandlers(socket, { io, players, playerId, savePlayer, constellationWar: $.constellationWar });
    registerForbiddenLibraryHandlers(socket, { io, players, playerId, savePlayer, forbiddenLibrary: $.forbiddenLibrary });
    registerBeastColossusHandlers(socket, { io, players, playerId, savePlayer, beastColossus: $.beastColossus });
    registerMerchantCaravanHandlers(socket, { io, players, playerId, savePlayer, merchantCaravan: $.merchantCaravan });
    registerMemoryPalaceHandlers(socket, { io, players, playerId, savePlayer, memoryPalace: $.memoryPalace });
    registerDemonThroneHandlers(socket, { io, players, playerId, savePlayer, demonThrone: $.demonThrone });
    registerCelestialForgeHandlers(socket, { io, players, playerId, savePlayer, celestialForge: $.celestialForge });
    registerLivingGrimoireHandlers(socket, { io, players, playerId, savePlayer, livingGrimoire: $.livingGrimoire });
    registerWorldSeedHandlers(socket, { io, players, playerId, savePlayer, worldSeed: $.worldSeed });
    registerFateWeaverHandlers(socket, { io, players, playerId, savePlayer, fateWeaver: $.fateWeaver });
    registerGrimoireHandlers(socket, { io, players, playerId, savePlayer, forbiddenGrimoire: $.forbiddenGrimoire, applyBuff: $.applyBuff });
    registerBloodlineHandlers(socket, { io, players, playerId, savePlayer, bloodline: $.bloodline, recalcStats: $.recalcStats });
    registerSoulContractHandlers(socket, { io, players, playerId, savePlayer, soulContract: $.soulContract });
    registerAncientLanguageHandlers(socket, { io, players, playerId, savePlayer, ancientLanguage: $.ancientLanguage });
    registerDivineBlessingHandlers(socket, { io, players, playerId, savePlayer, divineBlessing: $.divineBlessing });
    registerPastLifeHandlers(socket, { io, players, playerId, savePlayer, pastLife: $.pastLife });
    registerMutationHandlers(socket, { io, players, playerId, mutation: $.mutation });
    registerCursedEquipHandlers(socket, { io, players, playerId, savePlayer, cursedEquipment: $.cursedEquipment, recalcStats: $.recalcStats });
    registerAlchemyHandlers(socket, { io, players, playerId, savePlayer, forbiddenAlchemy: $.forbiddenAlchemy });
    registerGolemHandlers(socket, { io, players, playerId, savePlayer, golemCraft: $.golemCraft, recalcStats: $.recalcStats });
    registerHallHandlers(socket, { io, players, playerId, savePlayer, hallOfHeroes: $.hallOfHeroes });
    registerSpiritPactHandlers(socket, { io, players, playerId, savePlayer, spiritPact: $.spiritPact });
    registerMythicWeaponHandlers(socket, { io, players, playerId, savePlayer, mythicWeapon: $.mythicWeapon });
    registerDimensionHandlers(socket, { io, players, playerId, savePlayer, dimensionTraveler: $.dimensionTraveler });
    registerDragonRidingHandlers(socket, { io, players, playerId, savePlayer, dragonRiding: $.dragonRiding });
    registerWeatherDungeonHandlers(socket, {
        io, players, playerId, savePlayer,
        weatherDungeon: $.weatherDungeon,
        getCurrentWeather: () => $.currentWeather,
        trackQuest: $.trackQuest,
    });
    registerMiscHandlers(socket, {
        io, players, playerId, savePlayer, MAX_GOLD,
        statistics, timeCapsule, invitation, honor, passport, aura, dashboard,
        inn, territory, blueprint, contracts, newsBoard, blessing, library, wisdom,
        dungeonKeys, lotteryJackpot, titleCollection, guildWar, pvpTournament,
        clans, getZone,
    });
    registerCompanionHandlers(socket, { io, players, playerId, savePlayer, companion });
    registerWorldEventHandlers(socket, { worldEvent });
    registerPostofficeHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, postoffice, getZone });
    registerTransmogHandlers(socket, { io, players, playerId, savePlayer, transmog });
    registerFortuneHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, fortune });
    registerInsuranceHandlers(socket, { io, players, playerId, savePlayer, insurance });
    registerExpeditionHandlers(socket, { io, players, playerId, savePlayer, expedition });
    registerRaidHandlers(socket, { io, players, playerId, savePlayer, raid, handleRaidFinish });
    registerTransmutationHandlers(socket, { io, players, playerId, savePlayer, transmutation });
    registerJobsHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, jobs });
    registerBlackMarketHandlers(socket, {
        io, players, playerId, savePlayer, blackMarket,
        getCurrentBlackMarket: () => $.currentBlackMarket,
        setCurrentBlackMarket: (m) => { $.currentBlackMarket = m; }
    });
    registerLeaderboardHandlers(socket, { players, playerId, leaderboard });
    registerRunesHandlers(socket, { io, players, playerId, savePlayer, trackQuest, runes });
    registerBreedingHandlers(socket, { io, players, playerId, savePlayer, breeding });
    registerRelicHandlers(socket, { io, players, playerId, savePlayer, relic });
    registerTreasureMapHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, treasureMap });
    registerTrainingHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, training });
    registerPetBattleHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, petBattle });
    registerFarmHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, farm });
    registerSkillTreeHandlers(socket, { io, players, playerId, savePlayer, skillTree });
    registerMailHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, mailbox });
    registerCodexHandlers(socket, { players, playerId, savePlayer, codex, codexDiscover });
    registerDailyShopHandlers(socket, {
        io, players, playerId, savePlayer, dailyShop,
        getTodayDailyShop: () => $.todayDailyShop,
        setTodayDailyShop: (s) => { $.todayDailyShop = s; }
    });
    registerAuctionHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, auction, EQUIP_STATS, TRADE_GOODS });
    registerBossRushHandlers(socket, {
        io, players, playerId, savePlayer, bossRush,
        bossRushSessions, bossRushRanking: $.bossRushRanking, finishBossRush
    });
    registerSeasonHandlers(socket, { io, players, playerId, savePlayer, MAX_GOLD, MAX_DIAMONDS, seasonPass });
    registerEventHandlers(socket, { festival });
    registerFishingHandlers(socket, {
        io, players, playerId, savePlayer, trackQuest, codexDiscover,
        getZone, isNight: $.isNight, MAX_GOLD, fishing
    });

    // v2.58: 배틀로얄 핸들러
    try {
        const battleRoyale = require('../battle_royale');
        battleRoyale.registerBattleRoyaleHandlers(socket, playerId);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 심층 던전 핸들러
    try {
        const deepDungeon = require('../deep_dungeon');
        deepDungeon.registerDeepDungeonHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 메인 스토리 핸들러
    try {
        const mainStory = require('../main_story');
        mainStory.registerStoryHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 월드 레이드 & 이벤트 핸들러
    try {
        const worldRaid = require('../world_raid');
        worldRaid.registerWorldRaidHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 하우징 & 요새 핸들러
    try {
        const housing = require('../housing');
        housing.registerHousingHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 드래곤 관리 & 레이스 핸들러
    try {
        const dragonRace = require('../dragon_race');
        dragonRace.registerDragonHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 상위 변신 & 업적 핸들러
    try {
        const advMorph = require('../advanced_morph');
        advMorph.registerAdvancedHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 미니게임 핸들러
    try {
        const minigames = require('../minigames');
        minigames.registerMinigameHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v2.58: 친구 대전 핸들러
    try {
        const friendDuel = require('../friend_duel');
        friendDuel.registerFriendDuelHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v3.0: 무역 시스템
    try {
        const trade = require('../trade_system');
        trade.registerTradeHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 공성전 IO 전투
    try {
        const siegeBattle = require('../siege_battle');
        siegeBattle.registerSiegeBattleHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: SLG 뷰 (진급/진화/배치)
    try {
        const slgView = require('../slg_view');
        slgView.registerSlgHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 용병 육성 시스템
    try {
        const mercSystem = require('../mercenary_system');
        mercSystem.registerMercHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 용병 아레나 PvP
    try {
        const mercArena = require('../merc_arena');
        mercArena.registerArenaHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 차원 정복
    try {
        const dimension = require('../dimension');
        dimension.registerDimensionHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 심연의 탑
    try {
        const tower = require('../abyss_tower');
        tower.registerTowerHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 환생
    try {
        const rebirth = require('../rebirth');
        rebirth.registerRebirthHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 일일 퀘스트
    try {
        const dailyQuest = require('../daily_quest_v3');
        dailyQuest.registerDailyQuestHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 배틀패스
    try {
        const battlePass = require('../battle_pass');
        battlePass.registerBattlePassHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 진영 전쟁
    try {
        const factionWar = require('../faction_war');
        factionWar.registerFactionHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 포획 몬스터
    try {
        const capture = require('../monster_capture');
        capture.registerCaptureHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v3.0: 혈맹 레이드 보스
    try {
        const mercRaid = require('../merc_raid');
        mercRaid.registerRaidHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.60: 오토배틀 서바이벌 IO
    try {
        const autoSurvival = require('../auto_survival');
        autoSurvival.registerHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.60: IO-RPG 코어
    try {
        const ioRpg = require('../io_rpg_core');
        ioRpg.registerIoRpgHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.60: 서바이벌 IO 모드
    try {
        const survivalIo = require('../survival_io');
        survivalIo.registerSurvivalHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 출석 체크 핸들러
    try {
        const attendance = require('../attendance');
        attendance.registerAttendanceHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 로그라이크 던전 핸들러
    try {
        const rogue = require('../roguelike_dungeon');
        rogue.registerRogueHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 칭호 컬렉션 핸들러
    try {
        const titleCollect = require('../title_collect');
        titleCollect.registerTitleCollectHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 요일 이벤트 핸들러
    try {
        const dailyEvents = require('../daily_events');
        dailyEvents.registerDailyEventHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 채팅 이모트 핸들러
    try {
        const chatEmotes = require('../chat_emotes');
        chatEmotes.registerChatEmoteHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 랭크 시즌 핸들러
    try {
        const ranked = require('../ranked_season');
        ranked.registerRankedHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 미션 보드 핸들러
    try {
        const missions = require('../daily_missions');
        missions.registerMissionHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 가챠 소환 핸들러
    try {
        const gacha = require('../gacha_summon');
        gacha.registerGachaHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 튜토리얼 핸들러
    try {
        const tutorial = require('../tutorial');
        tutorial.registerTutorialHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: PvP 강화 핸들러
    try {
        const pvpEnhance = require('../pvp_enhance');
        pvpEnhance.registerPvpEnhanceHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 공성전 핸들러
    try {
        const guildSiege = require('../guild_siege');
        guildSiege.registerSiegeHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 펫 진화 핸들러
    try {
        const petEvo = require('../pet_evolution');
        petEvo.registerPetEvolutionHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }
});
}

module.exports = { registerConnection };
