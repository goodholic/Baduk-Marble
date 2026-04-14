// ============================================
// 카드게임 길드 시스템
// ============================================

const MAX_GUILD_SIZE = 30;
const GUILD_CREATE_COST = 10000;

const GUILD_PERKS = [
  { level: 1, name: '창립', perk: '기본 길드', bonus: {} },
  { level: 2, name: '소규모', perk: '길드 채팅', bonus: { exp: 1.03 }, req: { members: 5 } },
  { level: 3, name: '중규모', perk: '길드 상점', bonus: { exp: 1.05, gold: 1.03 }, req: { members: 10 } },
  { level: 4, name: '대규모', perk: '길드 레이드', bonus: { exp: 1.08, gold: 1.05, atk: 1.03 }, req: { members: 20 } },
  { level: 5, name: '전설', perk: '길드 전용 소환', bonus: { exp: 1.1, gold: 1.08, atk: 1.05, def: 1.03 }, req: { members: 30 } },
];

// 길드 레이드 보스
const GUILD_BOSSES = [
  { id: 'gb_goblin_king', name: '고블린 왕', icon: '👺👑', hp: 50000, reward: { gold: 2000, diamonds: 5 }, reqMembers: 3 },
  { id: 'gb_dragon', name: '고대 드래곤', icon: '🐲', hp: 200000, reward: { gold: 5000, diamonds: 15 }, reqMembers: 5 },
  { id: 'gb_demon_lord', name: '마왕', icon: '😈👑', hp: 500000, reward: { gold: 10000, diamonds: 30, card: 'epic' }, reqMembers: 10 },
  { id: 'gb_world_boss', name: '세계의 적', icon: '🌍💀', hp: 2000000, reward: { gold: 30000, diamonds: 100, card: 'legend' }, reqMembers: 20 },
];

// 길드 기부
const DONATION_REWARDS = {
  gold: { amount: 1000, guildExp: 10, personalReward: { diamonds: 1 } },
  diamonds: { amount: 5, guildExp: 50, personalReward: { gold: 2000 } },
};

function createGuild(player, guildName) {
  if (player.guild) return { ok: false, reason: '이미 길드에 가입됨' };
  if ((player.gold || 0) < GUILD_CREATE_COST) return { ok: false, reason: `${GUILD_CREATE_COST}G 필요` };
  if (!guildName || guildName.length < 2) return { ok: false, reason: '길드 이름 2자 이상' };

  player.gold -= GUILD_CREATE_COST;
  player.guild = {
    name: guildName,
    role: 'leader',
    level: 1,
    exp: 0,
    members: 1,
    created: Date.now(),
  };
  return { ok: true, msg: `길드 "${guildName}" 창설! (-${GUILD_CREATE_COST}G)` };
}

function donateToGuild(player, type) {
  if (!player.guild) return { ok: false, reason: '길드 미가입' };
  const donation = DONATION_REWARDS[type];
  if (!donation) return { ok: false, reason: '알 수 없는 기부 유형' };

  if (type === 'gold' && (player.gold || 0) < donation.amount) return { ok: false, reason: '골드 부족' };
  if (type === 'diamonds' && (player.diamonds || 0) < donation.amount) return { ok: false, reason: '다이아 부족' };

  if (type === 'gold') player.gold -= donation.amount;
  if (type === 'diamonds') player.diamonds -= donation.amount;

  player.guild.exp = (player.guild.exp || 0) + donation.guildExp;
  if (donation.personalReward.gold) player.gold = (player.gold || 0) + donation.personalReward.gold;
  if (donation.personalReward.diamonds) player.diamonds = (player.diamonds || 0) + donation.personalReward.diamonds;

  // 레벨업 체크
  const nextLv = GUILD_PERKS.find(p => p.level === (player.guild.level || 1) + 1);
  if (nextLv && player.guild.exp >= nextLv.level * 500) {
    player.guild.level++;
  }

  return { ok: true, msg: `길드 기부! (EXP+${donation.guildExp})`, guild: player.guild };
}

function guildRaid(player, bossId) {
  if (!player.guild) return { ok: false, reason: '길드 미가입' };
  const boss = GUILD_BOSSES.find(b => b.id === bossId);
  if (!boss) return { ok: false, reason: '알 수 없는 보스' };

  // 간단한 전투 시뮬레이션 (파티 ATK 기반)
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const totalAtk = partyCards.reduce((s, c) => s + (c.atk || 30), 0);
  const damage = Math.floor(totalAtk * (5 + Math.random() * 5)); // 5~10턴 분량

  const win = damage >= boss.hp;
  if (win) {
    player.gold = (player.gold || 0) + boss.reward.gold;
    player.diamonds = (player.diamonds || 0) + (boss.reward.diamonds || 0);
  }

  return {
    ok: true, win, damage, bossHp: boss.hp,
    msg: win ? `🎉 ${boss.name} 격파! +${boss.reward.gold}G +${boss.reward.diamonds}💎` : `${boss.name}에게 ${damage} 데미지! (HP: ${boss.hp})`,
    reward: win ? boss.reward : null,
  };
}

function register(io, socket, player) {
  socket.on('guild_create', (data) => {
    const result = createGuild(player, data.name);
    socket.emit('guild_create_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('guild_info', () => {
    socket.emit('guild_info', { guild: player.guild, perks: GUILD_PERKS, bosses: GUILD_BOSSES, donations: DONATION_REWARDS });
  });

  socket.on('guild_donate', (data) => {
    const result = donateToGuild(player, data.type);
    socket.emit('guild_donate_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  socket.on('guild_raid', (data) => {
    const result = guildRaid(player, data.bossId);
    socket.emit('guild_raid_result', result);
    if (result.ok && result.win) {
      io.emit('server_msg', `🐲 [길드 레이드] ${player.guild?.name || '???'} 길드가 ${GUILD_BOSSES.find(b => b.id === data.bossId)?.name} 격파!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

module.exports = { GUILD_PERKS, GUILD_BOSSES, DONATION_REWARDS, MAX_GUILD_SIZE, createGuild, donateToGuild, guildRaid, register };
