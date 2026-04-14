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
// v3.6 신규 핸들러
const { registerMercenaryHireHandlers } = require('./mercenary_hire_handlers');
const { registerMercenaryBondHandlers } = require('./mercenary_bond_handlers');
const { registerMercenaryColosseumHandlers } = require('./mercenary_colosseum_handlers');
    // [REMOVED] const { registerSiegeCommanderHandlers } = require('./siege_commander_handlers');
const { registerIODisasterHandlers } = require('./io_disaster_handlers');
// v3.7 신규 핸들러
    // [REMOVED] const { registerSiegeMatchHandlers } = require('./siege_match_handlers');
const { registerServerWarHandlers } = require('./server_war_handlers');
const { registerBountyExtendedHandlers } = require('./bounty_extended_handlers');
// v3.9 신규 핸들러
const { registerCaravanPvpHandlers } = require('./caravan_pvp_handlers');
const { registerMercStoryHandlers } = require('./merc_story_handlers');
// v4.0 신규 핸들러
const { registerRoguelikeDungeonHandlers } = require('./roguelike_dungeon_handlers');
// v4.1 신규 핸들러
const { registerNpcFavorHandlers } = require('./npc_favor_handlers');
const { registerGuildTechHandlers } = require('./guild_tech_handlers');
const { registerCraftMasterHandlers } = require('./craft_master_handlers');

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

    // v3.6 신규 시스템 핸들러
    registerMercenaryHireHandlers(socket, { io, players, playerId, savePlayer });
    registerMercenaryBondHandlers(socket, { io, players, playerId, savePlayer });
    registerMercenaryColosseumHandlers(socket, { io, players, playerId, savePlayer, colosseumQueue: $.colosseumQueue || {} });
    registerSiegeCommanderHandlers(socket, { io, players, playerId, savePlayer });
    registerIODisasterHandlers(socket, { io, players, playerId, savePlayer });

    // v3.7 신규 시스템 핸들러
    registerSiegeMatchHandlers(socket, { io, players, playerId, savePlayer, siegeMatches: $.siegeMatches || {} });
    registerServerWarHandlers(socket, { io, players, playerId, savePlayer, serverWar: $.serverWar });
    registerBountyExtendedHandlers(socket, { io, players, playerId, savePlayer });

    // v3.9 신규 시스템 핸들러
    registerCaravanPvpHandlers(socket, { io, players, playerId, savePlayer, activeCaravans: $.activeCaravans || {} });
    registerMercStoryHandlers(socket, { io, players, playerId, savePlayer });

    // v4.0 신규 시스템 핸들러
    registerRoguelikeDungeonHandlers(socket, { io, players, playerId, savePlayer });

    // v4.1 신규 시스템 핸들러
    registerNpcFavorHandlers(socket, { io, players, playerId, savePlayer });
    registerGuildTechHandlers(socket, { io, players, playerId, savePlayer, clanTech: $.clanTech || {} });
    registerCraftMasterHandlers(socket, { io, players, playerId, savePlayer });

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
    // [REMOVED] const siegeBattle = require('../siege_battle');
    // [REMOVED] siegeBattle.registerSiegeBattleHandlers(socket, playerId, players, io);
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
        survivalIo.registerSurvivalHandlers(socket, playerId, players, io, $.savePlayer);
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
    // [REMOVED] const guildSiege = require('../guild_siege');
    // [REMOVED] guildSiege.registerSiegeHandlers(socket, playerId, players, io);
    } catch(e) {}

    // v2.59: 펫 진화 핸들러
    try {
        const petEvo = require('../pet_evolution');
        petEvo.registerPetEvolutionHandlers(socket, playerId, players, io);
    } catch(e) { /* ignore if not loaded */ }

    // v4.0+: player 객체 존재 검증 (undefined 방어)
    const _player = players[playerId];
    if (!_player) {
        console.error(`[connection] players[${playerId}] is undefined, skipping v4+ handlers`);
        return;
    }

    // ═══ 카드 시스템 (메인 화면) ═══
    try {
        const cardSys = $.cardSystem || require('../card_system');
        cardSys.register(io, socket, _player);
    } catch(e) { console.error('[CardSystem] Error:', e.message); }

    // ═══ 카드 PvP 대전 ═══
    try {
        const cardPvp = require('../card_pvp');
        cardPvp.register(io, socket, _player);
    } catch(e) { console.error('[CardPvP] Error:', e.message); }

    // ═══ 카드 관리 (장비/스킬/편성/상점/IO연동) ═══
    try {
        const cardMgmt = require('../card_management');
        cardMgmt.register(io, socket, _player);
    } catch(e) { console.error('[CardMgmt] Error:', e.message); }

    // ═══ 기지(성) 시스템 ═══
    try {
        const cardFortress = require('../card_fortress');
        cardFortress.register(io, socket, _player);
    } catch(e) { console.error('[CardFortress] Error:', e.message); }

    // ═══ 카드 거래소 ═══
    try {
        const cardMarket = require('../card_trade_market');
        cardMarket.register(io, socket, _player);
    } catch(e) { console.error('[CardMarket] Error:', e.message); }

    // ═══ 종족/직업/히든 카드 ═══
    try { require('../card_races_classes').register(io, socket, _player); } catch(e) { console.error('[Races]', e.message); }

    // ═══ 길드 ═══
    try { require('../card_guild').register(io, socket, _player); } catch(e) { console.error('[Guild]', e.message); }

    // ═══ 시즌 랭킹 ═══
    try { require('../card_season').register(io, socket, _player); } catch(e) { console.error('[Season]', e.message); }

    // ═══ 도감/업적/칭호/스토리 ═══
    try { require('../card_collection').register(io, socket, _player); } catch(e) { console.error('[Collection]', e.message); }

    // ═══ 도전의 탑 ═══
    try { require('../card_tower').register(io, socket, _player); } catch(e) { console.error('[Tower]', e.message); }

    // ═══ 우편 시스템 ═══
    try { require('../card_mail').register(io, socket, _player); } catch(e) { console.error('[Mail]', e.message); }

    // ═══ 각성 ═══
    try { require('../card_awakening').register(io, socket, _player); } catch(e) { console.error('[Awaken]', e.message); }

    // ═══ 인챈트 ═══
    try { require('../card_enchant').register(io, socket, _player); } catch(e) { console.error('[Enchant]', e.message); }

    // ═══ 방치형 농장 ═══
    try { require('../card_idle_farm').register(io, socket, _player); } catch(e) { console.error('[Farm]', e.message); }

    // ═══ 인연/운명 ═══
    try { require('../card_bonds').register(io, socket, _player); } catch(e) { console.error('[Bonds]', e.message); }

    // ═══ 원정/탐험 ═══
    try { require('../card_expedition').register(io, socket, _player); } catch(e) { console.error('[Expedition]', e.message); }

    // ═══ IO 매치 매니저 ═══
    try {
        const matchMgr = require('../io_match_manager');
        socket.on('br_request_match', () => {
            const result = matchMgr.joinMatch(socket.id, _player);
            socket.emit('br_match_joined', result);
            if (result.ok) io.emit('br_match_tick', matchMgr.getMatchInfo());
        });
        socket.on('br_heartbeat', () => matchMgr.playerHeartbeat(socket.id));
        socket.on('br_match_status', () => socket.emit('br_match_tick', matchMgr.getMatchInfo()));
        socket.on('disconnect', () => matchMgr.playerDisconnect(socket.id));
    } catch(e) { console.error('[MatchMgr]', e.message); }

    // ═══ IO 카드 효과 ═══
    try {
        const cardIO = require('../card_io_effects');
        cardIO.register(io, socket, _player);
    } catch(e) { console.error('[CardIO] Error:', e.message); }

    // ═══ 카드 이벤트/퀘스트 ═══
    try {
        const cardEvents = require('../card_events');
        cardEvents.register(io, socket, _player);
    } catch(e) { console.error('[CardEvents] Error:', e.message); }

    // ═══ IO 부활 시스템 ═══
    const REVIVE_COST = 50; // 다이아
    socket.on('br_revive_request', () => {
        if (!_player) return;
        if ((_player.diamonds || 0) < REVIVE_COST) {
            return socket.emit('br_revive_fail', { reason: `다이아 부족 (필요: ${REVIVE_COST}, 보유: ${_player.diamonds || 0})` });
        }
        _player.diamonds -= REVIVE_COST;
        _player.isAlive = true;
        _player.hp = _player.maxHp || 200;
        socket.emit('br_revive_success', { diamonds: _player.diamonds });
        io.emit('player_update', _player);
        console.log(`[BR] ${_player.displayName || playerId} revived for ${REVIVE_COST} diamonds`);
    });

    // v4.0: 혈통/연합스킬/영지자원/공성시즌/무역제국/용병전생
    try {
        const v4 = $.v4Systems || require('../v4_systems');
        v4.registerV4Handlers(io, socket, _player, players, $.clans || {});
    } catch(e) { console.error('[v4] Handler register error:', e.message); }

    // v4.1: 용병 관계 시스템 (우정/라이벌/로맨스/사제/원한)
    try {
        const mercRel = require('../merc_relationships');
        mercRel.registerRelationshipHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.1] Relationship handler error:', e.message); }

    // v4.1: 용병 유대 스토리 퀘스트 (성격별 분기 선택)
    try {
        const bondStory = require('../merc_bond_story');
        bondStory.registerBondStoryHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.1] Bond story handler error:', e.message); }

    // v4.2: 전투 진형 시스템 (전열/후열/유격/지원)
    try {
        const formation = require('../merc_formation');
        formation.registerFormationHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.2] Formation handler error:', e.message); }

    // v4.2: 튜토리얼 가이드 퀘스트 (IO→SLG→공성 7단계)
    try {
        const tutorial = require('../tutorial_guide');
        tutorial.registerTutorialGuideHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.2] Tutorial handler error:', e.message); }

    // v4.5: 주간 도전 보드 (3던전 로테이션, 팀 큐잉, 시즌 랭킹)
    try {
        const weekly = require('../weekly_challenge');
        weekly.registerWeeklyChallengeHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.5] Weekly challenge error:', e.message); }

    // v4.5: 용병 쇼케이스 & 평판 (진열장, 투표, 방문자 평판)
    try {
        const showcase = require('../merc_showcase');
        showcase.registerShowcaseHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.5] Showcase error:', e.message); }

    // v4.5: 무역 투기 시스템 (선물계약, 가격 경매, 무역왕)
    try {
        const speculation = require('../trade_speculation');
        speculation.registerSpeculationHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.5] Speculation error:', e.message); }

    // v4.6: 카오스 존 (알비온 스타일 풀룻 위험 지역)
    try {
        const chaos = require('../chaos_zone');
        chaos.registerChaosZoneHandlers(socket, playerId, players, io);
    } catch(e) { console.error('[v4.6] Chaos zone error:', e.message); }

    // v4.6: 길드 무역 연합 (거상 스타일 캐러밴 호위/약탈)
    try {
        const gTrade = require('../guild_trade');
        gTrade.registerGuildTradeHandlers(io, socket, _player, players, $.clans || {});
    } catch(e) { console.error('[v4.6] Guild trade error:', e.message); }

    // v4.7: 통합 성장 대시보드
    try {
        const dashboard = require('../growth_dashboard');
        dashboard.registerDashboardHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.7] Dashboard error:', e.message); }

    // v4.9: 한정 배너 가챠 (FOMO)
    try {
        const banner = require('../banner_gacha');
        banner.registerBannerHandlers(io, socket, _player, players);
    } catch(e) { console.error('[v4.9] Banner error:', e.message); }

    // v4.9: 길드 보스 시즌 랭킹
    try {
        const gbs = require('../guild_boss_season');
        gbs.registerGuildBossSeasonHandlers(io, socket, _player, players, $.clans || {});
    } catch(e) { console.error('[v4.9] Guild boss season error:', e.message); }

    // v5.0: 용병 대서사시 (Mercenary Epic)
    try {
        const emotionAI = $.mercEmotionAI || require('../merc_emotion_ai');
        emotionAI.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Emotion AI error:', e.message); }

    try {
        const dynasty = $.mercDynasty || require('../merc_dynasty');
        dynasty.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Dynasty error:', e.message); }

    try {
        const rivalry = $.mercRivalry || require('../merc_rivalry');
        rivalry.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Rivalry error:', e.message); }

    try {
        const summonIO = $.mercSummonIO || require('../merc_summon_io');
        summonIO.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Summon IO error:', e.message); }

    try {
    // [REMOVED] const siegeRT = $.siegeRealtime || require('../siege_realtime');
    // [REMOVED] siegeRT.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Siege realtime error:', e.message); }

    try {
    // [REMOVED] const siegeWall = $.siegeMercWall || require('../siege_merc_wall');
    // [REMOVED] siegeWall.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Siege wall error:', e.message); }

    try {
        const tradeRaid = $.tradeIORaid || require('../trade_io_raid');
        tradeRaid.register(io, socket, _player);
    } catch(e) { console.error('[v5.0] Trade IO raid error:', e.message); }

    // v5.1: 판타지 대전쟁 (Fantasy Grand War)
    try {
        const awakeQuest = $.mercAwakeningQuest || require('../merc_awakening_quest');
        awakeQuest.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Awakening quest error:', e.message); }

    try {
        const fusionSummon = $.mercFusionSummon || require('../merc_fusion_summon');
        fusionSummon.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Fusion summon error:', e.message); }

    try {
        const bossCapture = $.ioBossCapture || require('../io_boss_capture');
        bossCapture.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Boss capture error:', e.message); }

    try {
    // [REMOVED] const atkDeploy = $.siegeAttackerDeploy || require('../siege_attacker_deploy');
        atkDeploy.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Attacker deploy error:', e.message); }

    try {
        const expWar = $.mercExpeditionWar || require('../merc_expedition_war');
        expWar.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Expedition war error:', e.message); }

    try {
        const hiddenMerc = $.hiddenMercDiscovery || require('../hidden_merc_discovery');
        hiddenMerc.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Hidden merc error:', e.message); }

    try {
        const equipForge = $.mercEquipmentForge || require('../merc_equipment_forge');
        equipForge.register(io, socket, _player);
    } catch(e) { console.error('[v5.1] Equipment forge error:', e.message); }

    // v5.2: 왕국 건설 (Kingdom Builder)
    try {
        const kingdom = $.kingdomManagement || require('../kingdom_management');
        kingdom.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] Kingdom error:', e.message); }

    try {
        const academy = $.mercAcademy || require('../merc_academy');
        academy.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] Academy error:', e.message); }

    try {
        const league = $.ioTournamentLeague || require('../io_tournament_league');
        league.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] League error:', e.message); }

    try {
    // [REMOVED] const gSiege = $.guildSiegeWar || require('../guild_siege_war');
    // [REMOVED] gSiege.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] Guild siege error:', e.message); }

    try {
        const petComp = $.mercPetCompanion || require('../merc_pet_companion');
        petComp.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] Pet companion error:', e.message); }

    try {
        const wConquest = $.worldConquest || require('../world_conquest');
        wConquest.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] World conquest error:', e.message); }

    try {
        const legacyDg = $.mercLegacyDungeon || require('../merc_legacy_dungeon');
        legacyDg.register(io, socket, _player);
    } catch(e) { console.error('[v5.2] Legacy dungeon error:', e.message); }

    // v5.3: 어둠의 대륙 (Dark Continent)
    try {
        const arenaChamp = $.mercArenaChampionship || require('../merc_arena_championship');
        arenaChamp.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Arena championship error:', e.message); }

    try {
        const darkCont = $.darkContinent || require('../dark_continent');
        darkCont.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Dark continent error:', e.message); }

    try {
        const transform = $.mercTransformation || require('../merc_transformation');
        transform.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Transformation error:', e.message); }

    try {
        const coopRaid = $.ioCoopRaid || require('../io_coop_raid');
        coopRaid.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Coop raid error:', e.message); }

    try {
    // [REMOVED] const spySys = $.siegeSpySystem || require('../siege_spy_system');
        spySys.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Spy system error:', e.message); }

    try {
        const marriage = $.mercMarriage || require('../merc_marriage');
        marriage.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Marriage error:', e.message); }

    try {
        const rqGen = $.randomQuestGenerator || require('../random_quest_generator');
        rqGen.register(io, socket, _player);
    } catch(e) { console.error('[v5.3] Random quest error:', e.message); }

    // v5.4: 전설의 시대 (Age of Legends)
    try { ($.mercTalentTree || require('../merc_talent_tree')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Talent tree:', e.message); }
    try { ($.ioWeatherBattle || require('../io_weather_battle')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Weather:', e.message); }
    // [REMOVED] try { ($.siegeAllianceWar || require('../siege_alliance_war')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Alliance:', e.message); }
    try { ($.mercWantedSystem || require('../merc_wanted_system')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Wanted:', e.message); }
    try { ($.kingdomDiplomacy || require('../kingdom_diplomacy')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Diplomacy:', e.message); }
    try { ($.mercSoulLink || require('../merc_soul_link')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Soul link:', e.message); }
    try { ($.ioSurvivalRoguelike || require('../io_survival_roguelike')).register(io, socket, _player); } catch(e) { console.error('[v5.4] Roguelike:', e.message); }

    // v5.5: 영원의 왕좌 (Eternal Throne)
    try { ($.mercAuctionHouse || require('../merc_auction_house')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Auction:', e.message); }
    try { ($.ioBossRushEndless || require('../io_boss_rush_endless')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Boss rush:', e.message); }
    try { ($.mercSecretSociety || require('../merc_secret_society')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Secret society:', e.message); }
    // [REMOVED] try { ($.siegeTrapWorkshop || require('../siege_trap_workshop')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Trap workshop:', e.message); }
    try { ($.mercBattleReplay || require('../merc_battle_replay')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Replay:', e.message); }
    try { ($.ioSeasonalEvent || require('../io_seasonal_event')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Seasonal:', e.message); }
    try { ($.mercMentorSystem || require('../merc_mentor_system')).register(io, socket, _player); } catch(e) { console.error('[v5.5] Mentor:', e.message); }

    // v5.6: 신들의 전쟁 (War of Gods)
    try { ($.mercGodWar || require('../merc_god_war')).register(io, socket, _player); } catch(e) { console.error('[v5.6] God war:', e.message); }
    try { ($.ioMazeDungeon || require('../io_maze_dungeon')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Maze:', e.message); }
    // [REMOVED] try { ($.siegeNavalBattle || require('../siege_naval_battle')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Naval:', e.message); }
    try { ($.mercReincarnationPlus || require('../merc_reincarnation_plus')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Reincarnation:', e.message); }
    try { ($.kingdomFestival || require('../kingdom_festival')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Festival:', e.message); }
    try { ($.mercCardBattle || require('../merc_card_battle')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Card battle:', e.message); }
    try { ($.ioInfectionMode || require('../io_infection_mode')).register(io, socket, _player); } catch(e) { console.error('[v5.6] Infection:', e.message); }

    // v5.7: 차원의 끝 (End of Dimensions)
    try { ($.mercBloodlineWar || require('../merc_bloodline_war')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Bloodline:', e.message); }
    try { ($.ioBattleRoyalePlus || require('../io_battle_royale_plus')).register(io, socket, _player); } catch(e) { console.error('[v5.7] BR+:', e.message); }
    // [REMOVED] try { ($.siegeUnderground || require('../siege_underground')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Underground:', e.message); }
    try { ($.mercJobSystem || require('../merc_job_system')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Job:', e.message); }
    try { ($.kingdomBlackMarket || require('../kingdom_black_market')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Black market:', e.message); }
    try { ($.mercDreamWorld || require('../merc_dream_world')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Dream:', e.message); }
    try { ($.ioPvpDuel || require('../io_pvp_duel')).register(io, socket, _player); } catch(e) { console.error('[v5.7] Duel:', e.message); }

    // v5.8: 운명의 수레바퀴 (Wheel of Fate)
    try { ($.mercFateSystem || require('../merc_fate_system')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Fate:', e.message); }
    try { ($.ioTowerClimb || require('../io_tower_climb')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Tower:', e.message); }
    // [REMOVED] try { ($.siegeWeatherWarfare || require('../siege_weather_warfare')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Weather war:', e.message); }
    try { ($.mercCookingBattle || require('../merc_cooking_battle')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Cooking:', e.message); }
    try { ($.kingdomEspionage || require('../kingdom_espionage')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Espionage:', e.message); }
    try { ($.mercMonsterRanch || require('../merc_monster_ranch')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Ranch:', e.message); }
    try { ($.ioCaptureTheCrown || require('../io_capture_the_crown')).register(io, socket, _player); } catch(e) { console.error('[v5.8] Crown:', e.message); }

    // v5.9: 최후의 심판 (Final Judgment) ★FINAL★
    try { ($.mercTimeTravel || require('../merc_time_travel')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Time travel:', e.message); }
    try { ($.ioTeamDeathmatch || require('../io_team_deathmatch')).register(io, socket, _player); } catch(e) { console.error('[v5.9] TDM:', e.message); }
    // [REMOVED] try { ($.siegeMechaWarfare || require('../siege_mecha_warfare')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Mecha:', e.message); }
    try { ($.mercMusicBand || require('../merc_music_band')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Band:', e.message); }
    try { ($.kingdomParliament || require('../kingdom_parliament')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Parliament:', e.message); }
    try { ($.mercDimensionalRift || require('../merc_dimensional_rift')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Rift:', e.message); }
    try { ($.ioGrandTournament || require('../io_grand_tournament')).register(io, socket, _player); } catch(e) { console.error('[v5.9] Grand:', e.message); }

    // v6.0: 새로운 여명 (New Dawn)
    try { ($.mercAutoChess || require('../merc_auto_chess')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Auto chess:', e.message); }
    try { ($.ioParkourRace || require('../io_parkour_race')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Parkour:', e.message); }
    // [REMOVED] try { ($.siegeDragonAssault || require('../siege_dragon_assault')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Dragon:', e.message); }
    try { ($.mercGamblingDen || require('../merc_gambling_den')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Gambling:', e.message); }
    try { ($.kingdomTradeEmpire || require('../kingdom_trade_empire')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Trade:', e.message); }
    try { ($.mercShapeshifter || require('../merc_shapeshifter')).register(io, socket, _player); } catch(e) { console.error('[v6.0] Shapeshifter:', e.message); }
    try { ($.ioWorldBossEvent || require('../io_world_boss_event')).register(io, socket, _player); } catch(e) { console.error('[v6.0] World boss:', e.message); }

    // v6.1: 천상의 전쟁 (Celestial War)
    try { ($.mercSpiritBeast || require('../merc_spirit_beast')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Spirit:', e.message); }
    try { ($.ioSurvivalHorror || require('../io_survival_horror')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Horror:', e.message); }
    // [REMOVED] try { ($.siegeAirshipBattle || require('../siege_airship_battle')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Airship:', e.message); }
    try { ($.mercPrestigeSystem || require('../merc_prestige_system')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Prestige:', e.message); }
    try { ($.kingdomUndergroundArena || require('../kingdom_underground_arena')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Arena:', e.message); }
    try { ($.mercTimeCapsulePlus || require('../merc_time_capsule_plus')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Capsule:', e.message); }
    try { ($.ioElementalClash || require('../io_elemental_clash')).register(io, socket, _player); } catch(e) { console.error('[v6.1] Elemental:', e.message); }

    // v6.2: 무한의 경계 (Infinite Frontier)
    try { ($.mercZodiacPower || require('../merc_zodiac_power')).register(io, socket, _player); } catch(e) { console.error('[v6.2] Zodiac:', e.message); }
    try { ($.ioHideAndSeek || require('../io_hide_and_seek')).register(io, socket, _player); } catch(e) { console.error('[v6.2] HnS:', e.message); }
    // [REMOVED] try { ($.siegeGolemFactory || require('../siege_golem_factory')).register(io, socket, _player); } catch(e) { console.error('[v6.2] Golem:', e.message); }
    try { ($.mercEmotionMusic || require('../merc_emotion_music')).register(io, socket, _player); } catch(e) { console.error('[v6.2] Music:', e.message); }
    try { ($.kingdomSpyNetwork || require('../kingdom_spy_network')).register(io, socket, _player); } catch(e) { console.error('[v6.2] SpyNet:', e.message); }
    try { ($.mercWishSystem || require('../merc_wish_system')).register(io, socket, _player); } catch(e) { console.error('[v6.2] Wish:', e.message); }
    try { ($.ioKingOfTheHill || require('../io_king_of_the_hill')).register(io, socket, _player); } catch(e) { console.error('[v6.2] KotH:', e.message); }

    // v6.3: 영혼의 심판
    try { ($.mercProphecySystem || require('../merc_prophecy_system')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Prophecy:', e.message); }
    try { ($.ioTreasureHunt || require('../io_treasure_hunt')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Treasure:', e.message); }
    // [REMOVED] try { ($.siegeEngineRace || require('../siege_engine_race')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Engine:', e.message); }
    try { ($.mercMemoryPalacePlus || require('../merc_memory_palace_plus')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Memory:', e.message); }
    try { ($.kingdomCultureSystem || require('../kingdom_culture_system')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Culture:', e.message); }
    try { ($.mercContractSystem || require('../merc_contract_system')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Contract:', e.message); }
    try { ($.ioEscortMission || require('../io_escort_mission')).register(io, socket, _player); } catch(e) { console.error('[v6.3] Escort:', e.message); }

    // v6.4: 절대자의 귀환 ★100모듈 돌파!★
    try { ($.mercNemesisSystem || require('../merc_nemesis_system')).register(io, socket, _player); } catch(e) { console.error('[v6.4] Nemesis:', e.message); }
    try { ($.ioRhythmBattle || require('../io_rhythm_battle')).register(io, socket, _player); } catch(e) { console.error('[v6.4] Rhythm:', e.message); }
    // [REMOVED] try { ($.siegeWeatherMachine || require('../siege_weather_machine')).register(io, socket, _player); } catch(e) { console.error('[v6.4] WeatherMachine:', e.message); }
    try { ($.mercInnerWorld || require('../merc_inner_world')).register(io, socket, _player); } catch(e) { console.error('[v6.4] Inner:', e.message); }
    try { ($.kingdomRailroad || require('../kingdom_railroad')).register(io, socket, _player); } catch(e) { console.error('[v6.4] Railroad:', e.message); }
    try { ($.mercFusionCuisine || require('../merc_fusion_cuisine')).register(io, socket, _player); } catch(e) { console.error('[v6.4] Cuisine:', e.message); }
    try { ($.ioLastStand || require('../io_last_stand')).register(io, socket, _player); } catch(e) { console.error('[v6.4] LastStand:', e.message); }

    // v6.5: 끝없는 세계
    try { ($.mercShadowClone || require('../merc_shadow_clone')).register(io, socket, _player); } catch(e) { console.error('[v6.5] Clone:', e.message); }
    try { ($.ioSoccerBattle || require('../io_soccer_battle')).register(io, socket, _player); } catch(e) { console.error('[v6.5] Soccer:', e.message); }
    // [REMOVED] try { ($.siegeVolcanoEruption || require('../siege_volcano_eruption')).register(io, socket, _player); } catch(e) { console.error('[v6.5] Volcano:', e.message); }
    try { ($.mercAchievementTree || require('../merc_achievement_tree')).register(io, socket, _player); } catch(e) { console.error('[v6.5] AchTree:', e.message); }
    try { ($.kingdomMuseumExhibit || require('../kingdom_museum_exhibit')).register(io, socket, _player); } catch(e) { console.error('[v6.5] Museum:', e.message); }
    try { ($.mercBountyBoardPlus || require('../merc_bounty_board_plus')).register(io, socket, _player); } catch(e) { console.error('[v6.5] Bounty:', e.message); }
    try { ($.ioDeathRace || require('../io_death_race')).register(io, socket, _player); } catch(e) { console.error('[v6.5] DeathRace:', e.message); }

    // v6.6: 불멸의 왕좌
    try { ($.mercGeneticsLab || require('../merc_genetics_lab')).register(io, socket, _player); } catch(e) { console.error('[v6.6] Genetics:', e.message); }
    try { ($.ioCaptureFlag || require('../io_capture_flag')).register(io, socket, _player); } catch(e) { console.error('[v6.6] CTF:', e.message); }
    // [REMOVED] try { ($.siegeTitanSummon || require('../siege_titan_summon')).register(io, socket, _player); } catch(e) { console.error('[v6.6] Titan:', e.message); }
    try { ($.mercEmotionDiary || require('../merc_emotion_diary')).register(io, socket, _player); } catch(e) { console.error('[v6.6] Diary:', e.message); }
    try { ($.kingdomWorldTree || require('../kingdom_world_tree')).register(io, socket, _player); } catch(e) { console.error('[v6.6] WorldTree:', e.message); }
    try { ($.mercLegacyWeapon || require('../merc_legacy_weapon')).register(io, socket, _player); } catch(e) { console.error('[v6.6] Legacy:', e.message); }
    try { ($.ioArenaRoyale || require('../io_arena_royale')).register(io, socket, _player); } catch(e) { console.error('[v6.6] ArenaR:', e.message); }

    // v6.7: 600시트 돌파!
    try { ($.mercAlterEgo || require('../merc_alter_ego')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Alter:', e.message); }
    try { ($.ioMinigameFestival || require('../io_minigame_festival')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Minigame:', e.message); }
    // [REMOVED] try { ($.siegePlagueWarfare || require('../siege_plague_warfare')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Plague:', e.message); }
    try { ($.mercConstellationUltimate || require('../merc_constellation_ultimate')).register(io, socket, _player); } catch(e) { console.error('[v6.7] ConstUlt:', e.message); }
    try { ($.kingdomPostalService || require('../kingdom_postal_service')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Postal:', e.message); }
    try { ($.mercRewindSystem || require('../merc_rewind_system')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Rewind:', e.message); }
    try { ($.ioSurvivalCrafting || require('../io_survival_crafting')).register(io, socket, _player); } catch(e) { console.error('[v6.7] Craft:', e.message); }

    // v6.8: 심연의 메아리
    try { ($.mercPuppetMaster || require('../merc_puppet_master')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Puppet:', e.message); }
    try { ($.ioGravityShift || require('../io_gravity_shift')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Gravity:', e.message); }
    // [REMOVED] try { ($.siegeUnderwaterBase || require('../siege_underwater_base')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Underwater:', e.message); }
    try { ($.mercEchoSystem || require('../merc_echo_system')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Echo:', e.message); }
    try { ($.kingdomCasinoResort || require('../kingdom_casino_resort')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Casino:', e.message); }
    try { ($.mercBloodPact || require('../merc_blood_pact')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Pact:', e.message); }
    try { ($.ioMusicalChairs || require('../io_musical_chairs')).register(io, socket, _player); } catch(e) { console.error('[v6.8] Chairs:', e.message); }

    // v6.9: 최종장 — 영원의 서사 ★140모듈★
    try { ($.mercWishDragon || require('../merc_wish_dragon')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Dragon:', e.message); }
    try { ($.ioPaintballWar || require('../io_paintball_war')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Paint:', e.message); }
    // [REMOVED] try { ($.siegeSpaceFortress || require('../siege_space_fortress')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Space:', e.message); }
    try { ($.mercEmotionEvolution || require('../merc_emotion_evolution')).register(io, socket, _player); } catch(e) { console.error('[v6.9] EmoEvo:', e.message); }
    try { ($.kingdomColossus || require('../kingdom_colossus')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Colossus:', e.message); }
    try { ($.mercMultiverse || require('../merc_multiverse')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Multi:', e.message); }
    try { ($.ioFinalBossRaid || require('../io_final_boss_raid')).register(io, socket, _player); } catch(e) { console.error('[v6.9] Final:', e.message); }

    // v7.0: 세계의 재탄생
    try { ($.mercAvatarSystem || require('../merc_avatar_system')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Avatar:', e.message); }
    try { ($.ioDodgeball || require('../io_dodgeball')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Dodge:', e.message); }
    // [REMOVED] try { ($.siegePhantomArmy || require('../siege_phantom_army')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Phantom:', e.message); }
    try { ($.mercEmotionResonanceField || require('../merc_emotion_resonance_field')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Field:', e.message); }
    try { ($.kingdomGrandLibrary || require('../kingdom_grand_library')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Library:', e.message); }
    try { ($.mercDestinyForge || require('../merc_destiny_forge')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Forge:', e.message); }
    try { ($.ioChaosMode || require('../io_chaos_mode')).register(io, socket, _player); } catch(e) { console.error('[v7.0] Chaos:', e.message); }
});
}

module.exports = { registerConnection };
