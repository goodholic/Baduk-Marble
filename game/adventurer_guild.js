// ==========================================
// 모험자 길드 시스템 — v2.36
// 길드 창설, 길드 던전, 길드 상점, 길드 전쟁, 길드 레벨
// ==========================================

// ── 길드 등급 & 혜택 ──
const GUILD_RANKS = [
    { level: 1, name: '동', icon: '🥉', maxMembers: 10, dungeonTier: 1, shopDiscount: 0,    perk: null },
    { level: 2, name: '은', icon: '🥈', maxMembers: 15, dungeonTier: 1, shopDiscount: 0.05, perk: '길드 EXP +5%' },
    { level: 3, name: '금', icon: '🥇', maxMembers: 20, dungeonTier: 2, shopDiscount: 0.10, perk: '길드 골드 +10%' },
    { level: 4, name: '백금', icon: '💎', maxMembers: 25, dungeonTier: 2, shopDiscount: 0.15, perk: '길드 드롭 +8%' },
    { level: 5, name: '다이아', icon: '💠', maxMembers: 30, dungeonTier: 3, shopDiscount: 0.20, perk: '길드 전체 스탯 +5' },
    { level: 6, name: '마스터', icon: '👑', maxMembers: 40, dungeonTier: 3, shopDiscount: 0.25, perk: '길드 부활 1회/일' },
    { level: 7, name: '전설', icon: '🌟', maxMembers: 50, dungeonTier: 4, shopDiscount: 0.30, perk: '길드 오라 이펙트' },
];

const GUILD_LEVEL_EXP = [0, 1000, 3000, 8000, 20000, 50000, 100000, 200000];

// ── 길드 던전 (티어별) ──
const GUILD_DUNGEONS = {
    tier1: [
        { id: 'gd_goblin_lair', name: '고블린 소굴', icon: '👹', stages: 3, bossHp: 8000, bossAtk: 40, reward: { gold: 5000, guildExp: 200, item: 'guild_token' } },
        { id: 'gd_skeleton_crypt', name: '스켈레톤 지하묘지', icon: '💀', stages: 3, bossHp: 10000, bossAtk: 50, reward: { gold: 6000, guildExp: 250, item: 'guild_token' } },
    ],
    tier2: [
        { id: 'gd_dragon_nest', name: '드래곤 둥지', icon: '🐲', stages: 5, bossHp: 30000, bossAtk: 100, reward: { gold: 15000, guildExp: 500, item: 'guild_token', itemQty: 3 } },
        { id: 'gd_demon_castle', name: '악마의 성', icon: '😈', stages: 5, bossHp: 35000, bossAtk: 120, reward: { gold: 18000, guildExp: 600, item: 'guild_token', itemQty: 3 } },
    ],
    tier3: [
        { id: 'gd_void_rift', name: '공허의 균열', icon: '🕳️', stages: 7, bossHp: 80000, bossAtk: 200, reward: { gold: 40000, guildExp: 1000, item: 'guild_token', itemQty: 5 } },
        { id: 'gd_titan_forge', name: '타이탄 용광로', icon: '🔥', stages: 7, bossHp: 100000, bossAtk: 250, reward: { gold: 50000, guildExp: 1200, item: 'guild_token', itemQty: 5 } },
    ],
    tier4: [
        { id: 'gd_god_temple', name: '신들의 신전', icon: '🏛️', stages: 10, bossHp: 200000, bossAtk: 400, reward: { gold: 100000, guildExp: 2000, item: 'guild_token', itemQty: 10, title: 'title_guild_legend' } },
    ],
};

// ── 길드 상점 (토큰 구매) ──
const GUILD_SHOP = [
    { id: 'gs_exp_scroll', name: 'EXP 두루마리', price: 5, effect: { expBonus: 0.5, dur: 3600 }, desc: '1시간 EXP +50%' },
    { id: 'gs_gold_scroll', name: '골드 두루마리', price: 5, effect: { goldBonus: 0.5, dur: 3600 }, desc: '1시간 골드 +50%' },
    { id: 'gs_guild_potion', name: '길드 만능약', price: 3, effect: { healPct: 1.0, mpPct: 1.0 }, desc: 'HP/MP 완전 회복' },
    { id: 'gs_guild_rune', name: '길드 룬 상자', price: 15, effect: { randomRune: true }, desc: '랜덤 고급 룬 1개' },
    { id: 'gs_guild_relic', name: '길드 유물 상자', price: 30, effect: { randomRelic: true }, desc: '랜덤 유물 1개' },
    { id: 'gs_guild_summon', name: '길드 소환석 세트', price: 20, effect: { summonStones: 5 }, desc: '랜덤 소환석 5개' },
    { id: 'gs_guild_skin', name: '길드 전용 스킨', price: 50, effect: { skin: 'guild_exclusive' }, desc: '길드 전용 외형' },
    { id: 'gs_stat_reset', name: '스탯 초기화', price: 10, effect: { statReset: true }, desc: '스탯 포인트 전부 회수' },
];

// ── 길드 전쟁 보상 ──
const GUILD_WAR_REWARDS = {
    win: { guildExp: 500, gold: 10000, diamonds: 50, tokens: 5 },
    lose: { guildExp: 100, gold: 2000, diamonds: 10, tokens: 1 },
    draw: { guildExp: 200, gold: 5000, diamonds: 20, tokens: 2 },
};

// ── 길드 버프 (길드 레벨 기반, 전 멤버 적용) ──
const GUILD_BUFFS = {
    1: { name: '초보 모험자', expBonus: 0 },
    2: { name: '숙련 모험자', expBonus: 0.05 },
    3: { name: '베테랑', expBonus: 0.05, goldBonus: 0.10 },
    4: { name: '엘리트', expBonus: 0.05, goldBonus: 0.10, dropRate: 0.08 },
    5: { name: '전문가', expBonus: 0.05, goldBonus: 0.10, dropRate: 0.08, allStats: 5 },
    6: { name: '마스터', expBonus: 0.08, goldBonus: 0.15, dropRate: 0.10, allStats: 5, revive: 1 },
    7: { name: '전설', expBonus: 0.10, goldBonus: 0.20, dropRate: 0.15, allStats: 8, revive: 1, aura: true },
};

// ── 길드 관리 ──
const guilds = {};
// { guildId: { name, level, exp, leader, officers:[], members:[], createdAt, tokens, warRecord, dungeonCooldown, announcement } }

let guildIdCounter = 0;

function createGuild(player, guildName) {
    if (!guildName || guildName.length < 2 || guildName.length > 12) return { success: false, msg: '이름 2~12자' };
    if (player._advGuild?.guildId) return { success: false, msg: '이미 길드 가입 중' };
    if ((player.gold || 0) < 10000) return { success: false, msg: '10,000G 필요' };
    if (Object.values(guilds).some(g => g.name === guildName)) return { success: false, msg: '이름 중복' };

    player.gold -= 10000;
    guildIdCounter++;
    const guildId = 'ag_' + guildIdCounter;
    guilds[guildId] = {
        name: guildName, level: 1, exp: 0,
        leader: player.id, officers: [], members: [player.id],
        createdAt: Date.now(), tokens: 0,
        warRecord: { wins: 0, losses: 0, draws: 0 },
        dungeonCooldown: {}, announcement: '',
    };
    if (!player._advGuild) player._advGuild = {};
    player._advGuild.guildId = guildId;
    player._advGuild.role = 'leader';
    player._advGuild.contribution = 0;
    player._advGuild.joinedAt = Date.now();

    return { success: true, guildId, guild: guilds[guildId], msg: `⚔️ 모험자 길드 [${guildName}] 창설!` };
}

function joinGuild(player, guildId) {
    const guild = guilds[guildId];
    if (!guild) return { success: false, msg: '존재하지 않는 길드' };
    if (player._advGuild?.guildId) return { success: false, msg: '이미 가입 중' };
    const rank = GUILD_RANKS.find(r => r.level === guild.level) || GUILD_RANKS[0];
    if (guild.members.length >= rank.maxMembers) return { success: false, msg: '인원 초과' };

    guild.members.push(player.id);
    if (!player._advGuild) player._advGuild = {};
    player._advGuild.guildId = guildId;
    player._advGuild.role = 'member';
    player._advGuild.contribution = 0;
    player._advGuild.joinedAt = Date.now();

    return { success: true, guild, msg: `[${guild.name}] 가입!` };
}

function donate(player, amount) {
    if (!player._advGuild?.guildId) return { success: false, msg: '길드 미가입' };
    const guild = guilds[player._advGuild.guildId];
    if (!guild) return { success: false, msg: '길드 없음' };
    amount = Math.floor(Math.min(amount, player.gold || 0));
    if (amount <= 0) return { success: false, msg: '골드 부족' };

    player.gold -= amount;
    guild.exp += Math.floor(amount / 10);
    guild.tokens += Math.floor(amount / 1000);
    player._advGuild.contribution += amount;

    // 레벨업 체크
    let leveledUp = false;
    while (guild.level < 7 && guild.exp >= GUILD_LEVEL_EXP[guild.level + 1]) {
        guild.level++;
        leveledUp = true;
    }

    return { success: true, donated: amount, guildExp: guild.exp, guildLevel: guild.level, leveledUp, tokens: guild.tokens };
}

function buyFromShop(player, itemId) {
    if (!player._advGuild?.guildId) return { success: false, msg: '길드 미가입' };
    const guild = guilds[player._advGuild.guildId];
    if (!guild) return { success: false, msg: '길드 없음' };
    const item = GUILD_SHOP.find(s => s.id === itemId);
    if (!item) return { success: false, msg: '상품 없음' };

    const rank = GUILD_RANKS.find(r => r.level === guild.level) || GUILD_RANKS[0];
    const price = Math.floor(item.price * (1 - rank.shopDiscount));
    if (guild.tokens < price) return { success: false, msg: `토큰 부족 (${price}개 필요)` };

    guild.tokens -= price;
    return { success: true, item, price, msg: `${item.name} 구매! (-${price} 토큰)` };
}

function getGuildBuffs(player) {
    if (!player._advGuild?.guildId) return {};
    const guild = guilds[player._advGuild.guildId];
    if (!guild) return {};
    return GUILD_BUFFS[guild.level] || {};
}

function getStatus(player) {
    const guildId = player._advGuild?.guildId;
    const guild = guildId ? guilds[guildId] : null;
    const rank = guild ? GUILD_RANKS.find(r => r.level === guild.level) : null;

    return {
        inGuild: !!guild,
        guild: guild ? {
            id: guildId, name: guild.name, level: guild.level, exp: guild.exp,
            nextLevelExp: GUILD_LEVEL_EXP[Math.min(guild.level + 1, 7)],
            rank: rank?.name, icon: rank?.icon,
            memberCount: guild.members.length, maxMembers: rank?.maxMembers,
            tokens: guild.tokens, warRecord: guild.warRecord,
            buffs: GUILD_BUFFS[guild.level],
            perk: rank?.perk,
        } : null,
        myRole: player._advGuild?.role,
        myContribution: player._advGuild?.contribution || 0,
        availableGuilds: Object.entries(guilds).slice(0, 20).map(([id, g]) => ({
            id, name: g.name, level: g.level, members: g.members.length,
            maxMembers: (GUILD_RANKS.find(r => r.level === g.level) || GUILD_RANKS[0]).maxMembers,
            icon: (GUILD_RANKS.find(r => r.level === g.level) || GUILD_RANKS[0]).icon,
        })),
        shop: GUILD_SHOP.map(s => ({
            ...s, discountedPrice: guild ? Math.floor(s.price * (1 - (rank?.shopDiscount || 0))) : s.price,
        })),
        dungeons: guild ? Object.entries(GUILD_DUNGEONS)
            .filter(([tier]) => parseInt(tier.replace('tier','')) <= (rank?.dungeonTier || 1))
            .flatMap(([, list]) => list) : [],
    };
}

module.exports = {
    GUILD_RANKS, GUILD_DUNGEONS, GUILD_SHOP, GUILD_WAR_REWARDS, GUILD_BUFFS,
    guilds, createGuild, joinGuild, donate, buyFromShop, getGuildBuffs, getStatus,
};
