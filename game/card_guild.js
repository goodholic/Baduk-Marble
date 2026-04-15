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

// ============================================
// 길드 보스 레이드 (Cooperative PvE)
// ============================================
const GUILD_BOSSES = [
  { id: 'gb_troll', name: '트롤 왕🧌', hp: 100000, atk: 200, reward: { gold: 5000, diamonds: 10 }, phase: 1 },
  { id: 'gb_hydra', name: '히드라🐍', hp: 300000, atk: 400, reward: { gold: 10000, diamonds: 25 }, phase: 2 },
  { id: 'gb_demon', name: '마왕 발로그😈', hp: 500000, atk: 600, reward: { gold: 20000, diamonds: 50, card: 'legend' }, phase: 3 },
  { id: 'gb_ancient', name: '고대용 아라곤🐲', hp: 1000000, atk: 1000, reward: { gold: 50000, diamonds: 100, card: 'myth' }, phase: 3, special: '화염+빙결+독 순환' },
];

// 활성 레이드 저장소 { guildName: raidState }
const activeRaids = {};

function startGuildRaid(guild, bossId) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const boss = GUILD_BOSSES.find(b => b.id === bossId);
  if (!boss) return { ok: false, reason: '알 수 없는 보스' };
  const gName = guild.name;
  if (activeRaids[gName] && activeRaids[gName].hpLeft > 0) {
    return { ok: false, reason: '이미 진행 중인 레이드가 있습니다' };
  }

  const raid = {
    bossId: boss.id,
    bossName: boss.name,
    maxHp: boss.hp,
    hpLeft: boss.hp,
    bossAtk: boss.atk,
    reward: boss.reward,
    special: boss.special || null,
    participants: {},
    startedAt: Date.now(),
    phase: boss.phase,
  };
  activeRaids[gName] = raid;
  return { ok: true, msg: `🐲 길드 레이드 시작! ${boss.name} (HP: ${boss.hp.toLocaleString()})`, raid };
}

function attackGuildBoss(player, guild) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const gName = guild.name;
  const raid = activeRaids[gName];
  if (!raid || raid.hpLeft <= 0) return { ok: false, reason: '진행 중인 레이드 없음' };

  const pId = player.id || player.name || 'unknown';

  // 30초 쿨다운
  const now = Date.now();
  if (!raid.participants[pId]) raid.participants[pId] = { totalDmg: 0, lastAttack: 0 };
  const pState = raid.participants[pId];
  const cooldownMs = 30000;
  if (now - pState.lastAttack < cooldownMs) {
    const remain = Math.ceil((cooldownMs - (now - pState.lastAttack)) / 1000);
    return { ok: false, reason: `쿨다운 중 (${remain}초 남음)` };
  }

  // 데미지 계산 (파티 카드 기반)
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const totalAtk = partyCards.reduce((s, c) => s + (c.atk || 30), 0);
  let damage = Math.floor(totalAtk * (3 + Math.random() * 3));

  // 특수 패턴 (고대용) — 화염/빙결/독 순환으로 추가 피해
  let bossCounterDmg = 0;
  if (raid.special) {
    const elapsed = (now - raid.startedAt) / 1000;
    const cycle = Math.floor(elapsed / 30) % 3; // 30초 주기
    const elements = ['화염🔥', '빙결❄️', '독☠️'];
    bossCounterDmg = Math.floor(raid.bossAtk * (0.3 + cycle * 0.2));
  } else {
    bossCounterDmg = Math.floor(raid.bossAtk * (0.2 + Math.random() * 0.3));
  }

  raid.hpLeft = Math.max(0, raid.hpLeft - damage);
  pState.totalDmg += damage;
  pState.lastAttack = now;

  const defeated = raid.hpLeft <= 0;
  let result = {
    ok: true,
    damage,
    bossCounterDmg,
    hpLeft: raid.hpLeft,
    maxHp: raid.maxHp,
    defeated,
    msg: `⚔️ ${raid.bossName}에게 ${damage.toLocaleString()} 데미지! (남은HP: ${raid.hpLeft.toLocaleString()})`,
  };

  if (defeated) {
    result.msg = `🎉 ${raid.bossName} 격파! 보상: ${raid.reward.gold}G, ${raid.reward.diamonds}💎`;
    result.reward = raid.reward;
    result.participants = { ...raid.participants };
    // 레이드 정리
    delete activeRaids[gName];
  }

  return result;
}

function getGuildRaidStatus(guild) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const raid = activeRaids[guild.name];
  if (!raid) return { ok: true, active: false, msg: '진행 중인 레이드 없음' };
  const participantList = Object.entries(raid.participants).map(([id, s]) => ({ id, totalDmg: s.totalDmg }));
  participantList.sort((a, b) => b.totalDmg - a.totalDmg);
  return {
    ok: true, active: true,
    bossName: raid.bossName,
    hpLeft: raid.hpLeft,
    maxHp: raid.maxHp,
    hpPercent: ((raid.hpLeft / raid.maxHp) * 100).toFixed(1),
    special: raid.special,
    participants: participantList,
    elapsed: Math.floor((Date.now() - raid.startedAt) / 1000),
  };
}

// ============================================
// 길드 전쟁 (Guild vs Guild)
// ============================================
const activeWars = {}; // { warId: warState }
let warIdCounter = 0;

function declareGuildWar(guild1, guild2) {
  if (!guild1 || !guild2) return { ok: false, reason: '길드 정보 필요' };
  if (guild1.name === guild2.name) return { ok: false, reason: '같은 길드끼리 전쟁 불가' };

  // 이미 전쟁 중인지 확인
  for (const w of Object.values(activeWars)) {
    if (w.ended) continue;
    if ((w.guild1 === guild1.name && w.guild2 === guild2.name) ||
        (w.guild1 === guild2.name && w.guild2 === guild1.name)) {
      return { ok: false, reason: '이미 두 길드 간 전쟁이 진행 중입니다' };
    }
  }

  const warId = `war_${++warIdCounter}`;
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const war = {
    warId,
    guild1: guild1.name,
    guild2: guild2.name,
    score1: 0, // PvP wins, IO kills, fortress raids
    score2: 0,
    startedAt: Date.now(),
    endsAt: Date.now() + oneWeekMs,
    ended: false,
    winner: null,
    log: [],
  };
  activeWars[warId] = war;

  return {
    ok: true,
    warId,
    msg: `⚔️ 길드 전쟁 선포! ${guild1.name} vs ${guild2.name} (1주간 진행)`,
    war,
  };
}

function addWarScore(warId, guildName, scoreType, amount) {
  const war = activeWars[warId];
  if (!war || war.ended) return { ok: false, reason: '전쟁 없음 또는 종료됨' };
  if (Date.now() > war.endsAt) {
    processGuildWarResults(warId);
    return { ok: false, reason: '전쟁 기간 종료됨' };
  }

  if (guildName === war.guild1) war.score1 += amount;
  else if (guildName === war.guild2) war.score2 += amount;
  else return { ok: false, reason: '해당 전쟁에 참여하지 않는 길드' };

  war.log.push({ time: Date.now(), guild: guildName, type: scoreType, amount });
  return { ok: true, score1: war.score1, score2: war.score2 };
}

function getGuildWarStatus(guild) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const wars = Object.values(activeWars).filter(
    w => !w.ended && (w.guild1 === guild.name || w.guild2 === guild.name)
  );
  if (wars.length === 0) return { ok: true, active: false, msg: '진행 중인 길드전 없음' };

  return {
    ok: true,
    active: true,
    wars: wars.map(w => ({
      warId: w.warId,
      guild1: w.guild1, score1: w.score1,
      guild2: w.guild2, score2: w.score2,
      remainMs: Math.max(0, w.endsAt - Date.now()),
      remainDays: Math.max(0, (w.endsAt - Date.now()) / (24 * 60 * 60 * 1000)).toFixed(1),
    })),
  };
}

function processGuildWarResults(warId) {
  const war = activeWars[warId];
  if (!war || war.ended) return null;

  war.ended = true;
  if (war.score1 > war.score2) {
    war.winner = war.guild1;
  } else if (war.score2 > war.score1) {
    war.winner = war.guild2;
  } else {
    war.winner = 'draw';
  }

  // 승리 길드 보상: 50000G + "정복자" 칭호 + 100 guild EXP
  const reward = {
    gold: 50000,
    title: '정복자',
    guildExp: 100,
  };

  return {
    ok: true,
    warId,
    winner: war.winner,
    score1: war.score1,
    score2: war.score2,
    reward: war.winner !== 'draw' ? reward : null,
    msg: war.winner === 'draw'
      ? `⚔️ 길드전 종료! ${war.guild1} vs ${war.guild2} — 무승부!`
      : `🏆 길드전 승리! ${war.winner} (+${reward.gold}G, 칭호: ${reward.title}, 길드EXP+${reward.guildExp})`,
  };
}

// 주간 정산 — 모든 만료된 전쟁 처리
function processAllExpiredWars() {
  const results = [];
  for (const [warId, war] of Object.entries(activeWars)) {
    if (!war.ended && Date.now() > war.endsAt) {
      const r = processGuildWarResults(warId);
      if (r) results.push(r);
    }
  }
  return results;
}

// ============================================
// 길드 스킬 (Passive Bonuses)
// ============================================
const GUILD_SKILLS = [
  { id: 'gs_atk', name: '전투 훈련', icon: '⚔️', effect: { atk: 0.02 }, maxLv: 10, costPerLv: 1000, desc: 'ATK +2%/Lv' },
  { id: 'gs_def', name: '방어 훈련', icon: '🛡️', effect: { def: 0.02 }, maxLv: 10, costPerLv: 1000, desc: 'DEF +2%/Lv' },
  { id: 'gs_gold', name: '재정 관리', icon: '💰', effect: { goldBonus: 0.03 }, maxLv: 10, costPerLv: 1500, desc: '골드 +3%/Lv' },
  { id: 'gs_exp', name: '학문 장려', icon: '📚', effect: { expBonus: 0.03 }, maxLv: 10, costPerLv: 1500, desc: 'EXP +3%/Lv' },
  { id: 'gs_summon', name: '소환 축복', icon: '📜', effect: { summonRate: 0.01 }, maxLv: 5, costPerLv: 3000, desc: '소환 확률 +1%/Lv' },
  { id: 'gs_crit', name: '필살 훈련', icon: '💥', effect: { critRate: 0.01 }, maxLv: 5, costPerLv: 2000, desc: '크리율 +1%/Lv' },
];

function upgradeGuildSkill(guild, skillId) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const skill = GUILD_SKILLS.find(s => s.id === skillId);
  if (!skill) return { ok: false, reason: '알 수 없는 스킬' };

  if (!guild.skills) guild.skills = {};
  const curLv = guild.skills[skillId] || 0;
  if (curLv >= skill.maxLv) return { ok: false, reason: `${skill.name} 이미 최대 레벨 (${skill.maxLv})` };

  const cost = skill.costPerLv * (curLv + 1);
  const guildExp = guild.exp || 0;
  if (guildExp < cost) return { ok: false, reason: `길드 EXP 부족 (필요: ${cost}, 보유: ${guildExp})` };

  guild.exp -= cost;
  guild.skills[skillId] = curLv + 1;

  return {
    ok: true,
    msg: `${skill.icon} ${skill.name} Lv${curLv + 1} 달성! (${skill.desc})`,
    skill: { id: skillId, level: curLv + 1, maxLv: skill.maxLv },
    guildExpLeft: guild.exp,
  };
}

function getGuildSkillBonuses(guild) {
  if (!guild || !guild.skills) return {};
  const bonuses = {};
  for (const [skillId, lv] of Object.entries(guild.skills)) {
    const skill = GUILD_SKILLS.find(s => s.id === skillId);
    if (!skill || lv <= 0) continue;
    for (const [stat, val] of Object.entries(skill.effect)) {
      bonuses[stat] = (bonuses[stat] || 0) + val * lv;
    }
  }
  return bonuses;
}

// ============================================
// 길드 상점 (Guild Shop)
// ============================================
const GUILD_SHOP_ITEMS = [
  { id: 'gsi_stone', name: '각성석', icon: '🌟', cost: 5000, desc: '각성에 필요' },
  { id: 'gsi_enchant', name: '전설 인챈트 주문서', icon: '📜👑', cost: 8000, desc: '전설 인챈트 100% 성공' },
  { id: 'gsi_summon', name: '프리미엄 소환권', icon: '🎫', cost: 3000, desc: '프리미엄 가챠 1회' },
  { id: 'gsi_rename', name: '이름 변경권', icon: '✏️', cost: 1000, desc: '닉네임 변경' },
  { id: 'gsi_frame', name: '길드 프레임', icon: '🖼️', cost: 10000, desc: '길드 전용 장식' },
];

function buyGuildShopItem(player, guild, itemId) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  const item = GUILD_SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '알 수 없는 상품' };

  const guildCurrency = player.guildCurrency || 0;
  if (guildCurrency < item.cost) {
    return { ok: false, reason: `길드 화폐 부족 (필요: ${item.cost}, 보유: ${guildCurrency})` };
  }

  player.guildCurrency -= item.cost;

  // 아이템 지급
  if (!player.inventory) player.inventory = [];
  player.inventory.push({ id: item.id, name: item.name, icon: item.icon, obtainedAt: Date.now() });

  return {
    ok: true,
    msg: `${item.icon} ${item.name} 구매 완료! (-${item.cost} 길드화폐)`,
    item,
    guildCurrencyLeft: player.guildCurrency,
  };
}

// ============================================
// 길드 기부 (Donation)
// ============================================
const DONATION_DAILY_CAP = { gold: 10000, diamonds: 100 };

function donateToGuild(player, guild, type, amount) {
  if (!guild) return { ok: false, reason: '길드 미가입' };
  if (type !== 'gold' && type !== 'diamonds') return { ok: false, reason: '기부 유형: gold 또는 diamonds' };
  if (!amount || amount <= 0) return { ok: false, reason: '기부 수량은 1 이상' };

  // 일일 한도 체크
  const today = new Date().toISOString().slice(0, 10);
  if (!player.donationLog) player.donationLog = {};
  if (player.donationLog.date !== today) {
    player.donationLog = { date: today, gold: 0, diamonds: 0 };
  }

  const cap = DONATION_DAILY_CAP[type];
  const alreadyDonated = player.donationLog[type] || 0;
  const canDonate = Math.min(amount, cap - alreadyDonated);
  if (canDonate <= 0) return { ok: false, reason: `오늘 ${type} 기부 한도 초과 (한도: ${cap})` };

  // 자원 확인
  const playerResource = player[type] || 0;
  const finalAmount = Math.min(canDonate, playerResource);
  if (finalAmount <= 0) return { ok: false, reason: `${type === 'gold' ? '골드' : '다이아'} 부족` };

  // 차감 및 길드 EXP 부여
  player[type] -= finalAmount;
  player.donationLog[type] += finalAmount;

  const guildExpGained = type === 'gold' ? finalAmount : finalAmount * 100; // 1G = 1EXP, 1diamond = 100EXP
  guild.exp = (guild.exp || 0) + guildExpGained;

  // 기부자에게 길드 화폐 지급
  const currencyEarned = type === 'gold' ? Math.floor(finalAmount / 2) : finalAmount * 50;
  player.guildCurrency = (player.guildCurrency || 0) + currencyEarned;

  // 레벨업 체크
  const nextLv = GUILD_PERKS.find(p => p.level === (guild.level || 1) + 1);
  let leveledUp = false;
  if (nextLv && guild.exp >= nextLv.level * 500) {
    guild.level = (guild.level || 1) + 1;
    leveledUp = true;
  }

  return {
    ok: true,
    msg: `길드 기부! ${type === 'gold' ? '💰' : '💎'}${finalAmount} → 길드EXP+${guildExpGained}, 길드화폐+${currencyEarned}`,
    donated: finalAmount,
    guildExp: guildExpGained,
    currencyEarned,
    guildCurrency: player.guildCurrency,
    leveledUp,
    guild,
  };
}

// ============================================
// 길드 생성 (기존)
// ============================================
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
    skills: {},
    created: Date.now(),
  };
  return { ok: true, msg: `길드 "${guildName}" 창설! (-${GUILD_CREATE_COST}G)` };
}

// ============================================
// Socket 이벤트 등록
// ============================================
function register(io, socket, player) {
  // 길드 생성
  socket.on('guild_create', (data) => {
    const result = createGuild(player, data.name);
    socket.emit('guild_create_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // 길드 정보
  socket.on('guild_info', () => {
    const bonuses = getGuildSkillBonuses(player.guild);
    socket.emit('guild_info', {
      guild: player.guild,
      perks: GUILD_PERKS,
      bosses: GUILD_BOSSES,
      skills: GUILD_SKILLS,
      skillBonuses: bonuses,
      shop: GUILD_SHOP_ITEMS,
      donationCap: DONATION_DAILY_CAP,
    });
  });

  // 길드 기부
  socket.on('guild_donate', (data) => {
    const result = donateToGuild(player, player.guild, data.type, data.amount);
    socket.emit('guild_donate_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
  });

  // === 길드 레이드 ===
  socket.on('guild_raid_start', (data) => {
    const result = startGuildRaid(player.guild, data.bossId);
    socket.emit('guild_raid_start_result', result);
    if (result.ok) {
      io.emit('server_msg', `🐲 [길드 레이드] ${player.guild.name} 길드가 ${result.raid.bossName} 레이드 시작!`);
    }
  });

  socket.on('guild_raid_attack', () => {
    const result = attackGuildBoss(player, player.guild);
    socket.emit('guild_raid_attack_result', result);
    if (result.ok && result.defeated) {
      // 보상 분배
      if (result.reward) {
        player.gold = (player.gold || 0) + (result.reward.gold || 0);
        player.diamonds = (player.diamonds || 0) + (result.reward.diamonds || 0);
      }
      io.emit('server_msg', `🎉 [길드 레이드] ${player.guild.name} 길드가 ${activeRaids[player.guild.name] ? '' : ''}보스 격파!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  socket.on('guild_raid_status', () => {
    const result = getGuildRaidStatus(player.guild);
    socket.emit('guild_raid_status_result', result);
  });

  // === 길드 전쟁 ===
  socket.on('guild_war_declare', (data) => {
    // data.targetGuild = { name: '...' } 형태
    const result = declareGuildWar(player.guild, data.targetGuild);
    socket.emit('guild_war_declare_result', result);
    if (result.ok) {
      io.emit('server_msg', `⚔️ [길드전] ${player.guild.name} vs ${data.targetGuild.name} 전쟁 선포!`);
    }
  });

  socket.on('guild_war_status', () => {
    const result = getGuildWarStatus(player.guild);
    socket.emit('guild_war_status_result', result);
  });

  // === 길드 스킬 ===
  socket.on('guild_skill_upgrade', (data) => {
    const result = upgradeGuildSkill(player.guild, data.skillId);
    socket.emit('guild_skill_upgrade_result', result);
  });

  // === 길드 상점 ===
  socket.on('guild_shop_browse', () => {
    socket.emit('guild_shop_browse_result', {
      ok: true,
      items: GUILD_SHOP_ITEMS,
      guildCurrency: player.guildCurrency || 0,
    });
  });

  socket.on('guild_shop_buy', (data) => {
    const result = buyGuildShopItem(player, player.guild, data.itemId);
    socket.emit('guild_shop_buy_result', result);
  });
}

module.exports = {
  GUILD_PERKS,
  GUILD_BOSSES,
  GUILD_SKILLS,
  GUILD_SHOP_ITEMS,
  DONATION_DAILY_CAP,
  MAX_GUILD_SIZE,
  createGuild,
  donateToGuild,
  startGuildRaid,
  attackGuildBoss,
  getGuildRaidStatus,
  declareGuildWar,
  addWarScore,
  getGuildWarStatus,
  processGuildWarResults,
  processAllExpiredWars,
  upgradeGuildSkill,
  getGuildSkillBonuses,
  buyGuildShopItem,
  register,
};
