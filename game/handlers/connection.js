// Connection Handler - thin dispatcher (Phase 5 category split)
// Delegates to category-specific handler files + pre-existing module handlers

const { registerCoreConnectionHandlers } = require('./core_connection');
const { registerInventoryConnectionHandlers } = require('./inventory_connection');
const { registerEconomyConnectionHandlers } = require('./economy_connection');
const { registerCombatPvpConnectionHandlers } = require('./combat_pvp_connection');
const { registerSocialConnectionHandlers } = require('./social_connection');
const { registerQuestMiscConnectionHandlers } = require('./quest_misc_connection');

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
    registerCoreConnectionHandlers(socket, $);
    registerInventoryConnectionHandlers(socket, $);
    registerEconomyConnectionHandlers(socket, $);
    registerCombatPvpConnectionHandlers(socket, $);
    registerSocialConnectionHandlers(socket, $);
    registerQuestMiscConnectionHandlers(socket, $);

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
});
}

module.exports = { registerConnection };
