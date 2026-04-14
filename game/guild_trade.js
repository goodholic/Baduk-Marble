// 길드 무역 연합 — v4.6
// 거상 스타일: 길드 금고 기반 대규모 교역, 호위/약탈 PvP, 수익 분배

const TRADE_ROUTES = require('./trade_system').TRADE_ROUTES || [];

const GUILD_CARAVAN_TIERS = [
  { tier: 1, name: '당나귀 행렬', icon: '🫏', capacity: 50, speed: 1.0, defense: 100, cost: 10000, minMembers: 2 },
  { tier: 2, name: '마차 캐러밴', icon: '🐴', capacity: 100, speed: 1.2, defense: 300, cost: 30000, minMembers: 3 },
  { tier: 3, name: '무장 호송대', icon: '⚔️🐴', capacity: 200, speed: 1.0, defense: 800, cost: 80000, minMembers: 4 },
  { tier: 4, name: '용기사 수송단', icon: '🐲', capacity: 500, speed: 1.5, defense: 2000, cost: 200000, minMembers: 5 },
  { tier: 5, name: '황실 무역선단', icon: '👑🚢', capacity: 1000, speed: 2.0, defense: 5000, cost: 500000, minMembers: 8 },
];

const RAID_REWARDS = {
  success: 0.6,
  escortBonus: 0.1,
  raidFame: 100,
};

const TRADE_ALLIANCE_BONUSES = {
  level1: { members: 2, profitBonus: 1.05, desc: '무역 수익 +5%' },
  level2: { members: 3, profitBonus: 1.10, routeDiscount: 0.9, desc: '수익 +10%, 비용 -10%' },
  level3: { members: 5, profitBonus: 1.20, routeDiscount: 0.8, exclusiveRoute: true, desc: '수익 +20%, 비용 -20%, 독점 루트 해금' },
};

const activeGuildCaravans = {};
let caravanIdCounter = 1;

/* ── 초기화 ── */
function initGuildTrade(clan) {
  if (!clan) return;
  if (!clan._guildTrade) {
    clan._guildTrade = {
      treasury: 0,
      caravans: [],
      tradeHistory: [],
      alliances: [],
      totalProfit: 0,
      fame: 0,
    };
  }
  return clan._guildTrade;
}

/* ── 길드 금고 ── */
function depositTreasury(player, clan, amount) {
  if (!player || !clan) return { ok: false, msg: '잘못된 요청입니다.' };
  if (!clan._guildTrade) initGuildTrade(clan);
  const amt = Math.floor(amount);
  if (amt <= 0 || (player.gold || 0) < amt) {
    return { ok: false, msg: '골드가 부족합니다.' };
  }
  player.gold -= amt;
  clan._guildTrade.treasury += amt;
  return { ok: true, msg: `💰 길드 금고에 ${amt}G를 입금했습니다. (금고 잔액: ${clan._guildTrade.treasury}G)` };
}

function withdrawTreasury(player, clan, amount) {
  if (!player || !clan) return { ok: false, msg: '잘못된 요청입니다.' };
  if (!clan._guildTrade) initGuildTrade(clan);
  const role = clan.members?.find(m => m.id === player.id)?.role;
  if (role !== 'leader' && role !== 'officer') {
    return { ok: false, msg: '길드장 또는 임원만 출금할 수 있습니다.' };
  }
  const amt = Math.floor(amount);
  if (amt <= 0 || clan._guildTrade.treasury < amt) {
    return { ok: false, msg: '금고 잔액이 부족합니다.' };
  }
  clan._guildTrade.treasury -= amt;
  player.gold = (player.gold || 0) + amt;
  return { ok: true, msg: `💰 길드 금고에서 ${amt}G를 출금했습니다. (잔액: ${clan._guildTrade.treasury}G)` };
}

/* ── 길드 캐러밴 출발 ── */
function launchGuildCaravan(player, clan, routeId, tier, players, io) {
  if (!clan || !clan._guildTrade) return { ok: false, msg: '길드 무역이 초기화되지 않았습니다.' };
  const gt = clan._guildTrade;

  const tierInfo = GUILD_CARAVAN_TIERS.find(t => t.tier === tier);
  if (!tierInfo) return { ok: false, msg: '잘못된 캐러밴 등급입니다.' };

  const route = TRADE_ROUTES.find(r => r.id === routeId);
  if (!route) return { ok: false, msg: '존재하지 않는 교역 루트입니다.' };

  // 온라인 길드원 수 확인
  const onlineMembers = (clan.members || []).filter(m => {
    const p = players && (Array.isArray(players) ? players.find(pp => pp.id === m.id) : players[m.id]);
    return p && p.online !== false;
  });
  if (onlineMembers.length < tierInfo.minMembers) {
    return { ok: false, msg: `${tierInfo.name} 출발에는 최소 ${tierInfo.minMembers}명의 온라인 길드원이 필요합니다. (현재 ${onlineMembers.length}명)` };
  }

  // 비용 확인 (동맹 할인 적용)
  let cost = tierInfo.cost + route.buy * tierInfo.capacity;
  const allianceBonus = _getAllianceBonus(clan);
  if (allianceBonus.routeDiscount) cost = Math.floor(cost * allianceBonus.routeDiscount);

  if (gt.treasury < cost) {
    return { ok: false, msg: `금고 잔액 부족! 필요: ${cost}G / 잔액: ${gt.treasury}G` };
  }

  gt.treasury -= cost;

  const caravanId = `gc_${clan.name}_${caravanIdCounter++}`;
  const transitTime = Math.floor((route.time * 1000) / tierInfo.speed); // ms
  const cargoValue = route.sell * tierInfo.capacity;

  const caravan = {
    id: caravanId,
    clanName: clan.name,
    routeId: route.id,
    route,
    tier: tierInfo.tier,
    tierInfo,
    launchedBy: player.name || player.id,
    escorts: [{ id: player.id, name: player.name || player.id, power: player.power || 100 }],
    defense: tierInfo.defense,
    cargoValue,
    cost,
    departAt: Date.now(),
    arriveAt: Date.now() + transitTime,
    status: 'transit',
  };

  gt.caravans.push(caravan);
  activeGuildCaravans[caravanId] = caravan;

  // 자동 도착 타이머
  caravan._timer = setTimeout(() => {
    arriveGuildCaravan(clan, caravanId, io);
  }, transitTime);

  if (io) {
    io.emit('server_msg', `🚀 [길드 캐러밴 출발!] ${clan.name}의 ${tierInfo.icon} ${tierInfo.name}이(가) ${route.from} → ${route.to} 교역을 시작합니다! (화물 가치: ${cargoValue}G)`);
  }

  return { ok: true, msg: `${tierInfo.icon} ${tierInfo.name} 출발! ${route.from} → ${route.to} (도착까지 ${Math.ceil(transitTime / 1000)}초)`, caravanId };
}

/* ── 호위 합류 ── */
function joinEscort(player, clan, caravanId) {
  const caravan = activeGuildCaravans[caravanId];
  if (!caravan) return { ok: false, msg: '해당 캐러밴을 찾을 수 없습니다.' };
  if (caravan.clanName !== clan?.name) return { ok: false, msg: '자기 길드의 캐러밴만 호위할 수 있습니다.' };
  if (caravan.status !== 'transit') return { ok: false, msg: '이미 도착했거나 약탈된 캐러밴입니다.' };
  if (caravan.escorts.find(e => e.id === player.id)) return { ok: false, msg: '이미 호위 중입니다.' };

  const power = player.power || 100;
  caravan.escorts.push({ id: player.id, name: player.name || player.id, power });
  caravan.defense += Math.floor(power * 0.5);

  return { ok: true, msg: `⚔️ ${player.name || player.id}님이 호위에 합류! (캐러밴 방어력: ${caravan.defense})` };
}

/* ── 약탈 ── */
function raidGuildCaravan(attacker, caravanId, attackParty, io) {
  const caravan = activeGuildCaravans[caravanId];
  if (!caravan) return { ok: false, msg: '해당 캐러밴을 찾을 수 없습니다.' };
  if (caravan.status !== 'transit') return { ok: false, msg: '약탈할 수 없는 상태입니다.' };

  // 공격력 계산
  let attackPower = attacker.power || 100;
  if (Array.isArray(attackParty)) {
    attackPower = attackParty.reduce((sum, p) => sum + (p.power || 100), 0);
  }

  const defPower = caravan.defense;
  const successRate = Math.min(0.9, Math.max(0.1, attackPower / (attackPower + defPower)));
  const roll = Math.random();

  if (roll < successRate) {
    // 약탈 성공
    const loot = Math.floor(caravan.cargoValue * RAID_REWARDS.success);
    attacker.gold = (attacker.gold || 0) + loot;
    caravan.status = 'raided';

    // 타이머 제거
    if (caravan._timer) { clearTimeout(caravan._timer); caravan._timer = null; }
    delete activeGuildCaravans[caravanId];

    // 악명 증가
    attacker._raidFame = (attacker._raidFame || 0) + RAID_REWARDS.raidFame;

    if (io) {
      io.emit('server_msg', `🏴‍☠️ [약탈 성공!] ${attacker.name || attacker.id}이(가) ${caravan.clanName}의 ${caravan.tierInfo.icon} ${caravan.tierInfo.name}을 약탈! ${loot}G 획득!`);
    }
    return { ok: true, success: true, loot, msg: `🏴‍☠️ 약탈 성공! ${loot}G를 획득했습니다!` };
  } else {
    // 약탈 실패
    const penalty = Math.floor((attacker.gold || 0) * 0.1);
    attacker.gold = Math.max(0, (attacker.gold || 0) - penalty);
    attacker.karma = (attacker.karma || 0) + 50;

    if (io) {
      io.emit('server_msg', `🛡️ [약탈 실패!] ${attacker.name || attacker.id}의 ${caravan.clanName} 캐러밴 약탈이 저지되었습니다!`);
    }
    return { ok: true, success: false, penalty, msg: `🛡️ 약탈 실패! ${penalty}G를 잃고 카르마가 증가했습니다.` };
  }
}

/* ── 캐러밴 도착 ── */
function arriveGuildCaravan(clan, caravanId, io) {
  if (!clan?._guildTrade) return { ok: false, msg: '길드 정보 없음' };
  const gt = clan._guildTrade;
  const caravan = activeGuildCaravans[caravanId] || gt.caravans.find(c => c.id === caravanId);
  if (!caravan || caravan.status !== 'transit') return { ok: false, msg: '도착 처리할 캐러밴이 없습니다.' };

  caravan.status = 'arrived';
  if (caravan._timer) { clearTimeout(caravan._timer); caravan._timer = null; }
  delete activeGuildCaravans[caravanId];

  // 수익 계산 (동맹 보너스 적용)
  const allianceBonus = _getAllianceBonus(clan);
  let profit = Math.floor(caravan.cargoValue * allianceBonus.profitBonus);

  // 호위 보너스: 호위원 수에 비례
  const escortCount = caravan.escorts.length;
  if (escortCount > 1) {
    profit = Math.floor(profit * (1 + RAID_REWARDS.escortBonus * (escortCount - 1)));
  }

  const netProfit = profit - caravan.cost;

  // 금고에 수익 입금
  gt.treasury += profit;
  gt.totalProfit += Math.max(0, netProfit);

  // 기록 저장
  gt.tradeHistory.push({
    caravanId,
    routeId: caravan.routeId,
    tier: caravan.tier,
    profit,
    netProfit,
    escorts: caravan.escorts.map(e => e.name),
    arrivedAt: Date.now(),
  });
  if (gt.tradeHistory.length > 50) gt.tradeHistory.shift();

  if (io) {
    io.emit('server_msg', `🎉 [길드 캐러밴 도착!] ${clan.name}의 ${caravan.tierInfo.icon} ${caravan.tierInfo.name}이(가) ${caravan.route.to}에 도착! 수익: ${profit}G (순이익: ${netProfit}G)`);
  }

  return { ok: true, profit, netProfit, msg: `🎉 캐러밴 도착! 수익 ${profit}G (순이익 ${netProfit}G)가 금고에 입금되었습니다.` };
}

/* ── 무역 동맹 ── */
function formTradeAlliance(clan1, clan2) {
  if (!clan1 || !clan2) return { ok: false, msg: '잘못된 길드 정보입니다.' };
  if (clan1.name === clan2.name) return { ok: false, msg: '같은 길드와 동맹할 수 없습니다.' };
  if (!clan1._guildTrade) initGuildTrade(clan1);
  if (!clan2._guildTrade) initGuildTrade(clan2);

  const gt1 = clan1._guildTrade;
  const gt2 = clan2._guildTrade;

  // 중복 확인
  if (gt1.alliances.find(a => a.clanName === clan2.name)) {
    return { ok: false, msg: '이미 동맹 관계입니다.' };
  }
  // 쿨다운 확인
  const cooldownEnd = gt1._allianceCooldown?.[clan2.name] || 0;
  if (Date.now() < cooldownEnd) {
    const remain = Math.ceil((cooldownEnd - Date.now()) / 1000 / 60);
    return { ok: false, msg: `동맹 해제 쿨다운 중입니다. (${remain}분 남음)` };
  }

  const alliance = { clanName: clan2.name, formedAt: Date.now() };
  const alliance2 = { clanName: clan1.name, formedAt: Date.now() };
  gt1.alliances.push(alliance);
  gt2.alliances.push(alliance2);

  return { ok: true, msg: `🤝 ${clan1.name}와(과) ${clan2.name}이(가) 무역 동맹을 체결했습니다!` };
}

function breakAlliance(clan1, clan2) {
  if (!clan1?._guildTrade || !clan2?._guildTrade) return { ok: false, msg: '길드 무역 정보 없음' };
  const gt1 = clan1._guildTrade;
  const gt2 = clan2._guildTrade;

  const idx1 = gt1.alliances.findIndex(a => a.clanName === clan2.name);
  const idx2 = gt2.alliances.findIndex(a => a.clanName === clan1.name);
  if (idx1 === -1) return { ok: false, msg: '동맹 관계가 아닙니다.' };

  gt1.alliances.splice(idx1, 1);
  if (idx2 !== -1) gt2.alliances.splice(idx2, 1);

  // 7일 쿨다운
  const COOLDOWN = 7 * 24 * 60 * 60 * 1000;
  if (!gt1._allianceCooldown) gt1._allianceCooldown = {};
  if (!gt2._allianceCooldown) gt2._allianceCooldown = {};
  gt1._allianceCooldown[clan2.name] = Date.now() + COOLDOWN;
  gt2._allianceCooldown[clan1.name] = Date.now() + COOLDOWN;

  return { ok: true, msg: `💔 ${clan1.name}와(과) ${clan2.name}의 무역 동맹이 해제되었습니다. (재동맹 쿨다운: 7일)` };
}

/* ── 상태 / 랭킹 ── */
function getGuildTradeStatus(clan) {
  if (!clan?._guildTrade) return null;
  const gt = clan._guildTrade;
  const active = Object.values(activeGuildCaravans).filter(c => c.clanName === clan.name);
  return {
    treasury: gt.treasury,
    totalProfit: gt.totalProfit,
    fame: gt.fame,
    activeCaravans: active.map(c => ({
      id: c.id,
      route: `${c.route.from} → ${c.route.to}`,
      tier: c.tierInfo.name,
      icon: c.tierInfo.icon,
      defense: c.defense,
      escorts: c.escorts.length,
      cargoValue: c.cargoValue,
      remainSec: Math.max(0, Math.ceil((c.arriveAt - Date.now()) / 1000)),
    })),
    alliances: gt.alliances.map(a => a.clanName),
    recentHistory: gt.tradeHistory.slice(-10),
  };
}

function getGuildTradeRanking(clans) {
  if (!clans) return [];
  const list = (Array.isArray(clans) ? clans : Object.values(clans))
    .filter(c => c._guildTrade)
    .map(c => ({
      name: c.name,
      totalProfit: c._guildTrade.totalProfit,
      treasury: c._guildTrade.treasury,
      fame: c._guildTrade.fame,
      caravanCount: c._guildTrade.tradeHistory.length,
      allianceCount: c._guildTrade.alliances.length,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
  return list.slice(0, 10);
}

/* ── 동맹 보너스 헬퍼 ── */
function _getAllianceBonus(clan) {
  const allianceCount = clan._guildTrade?.alliances?.length || 0;
  const total = allianceCount + 1;
  if (total >= TRADE_ALLIANCE_BONUSES.level3.members) return TRADE_ALLIANCE_BONUSES.level3;
  if (total >= TRADE_ALLIANCE_BONUSES.level2.members) return TRADE_ALLIANCE_BONUSES.level2;
  if (total >= TRADE_ALLIANCE_BONUSES.level1.members) return TRADE_ALLIANCE_BONUSES.level1;
  return { profitBonus: 1.0 };
}

/* ── 소켓 핸들러 등록 ── */
function registerGuildTradeHandlers(io, socket, player, players, clans) {
  function _findClan(name) {
    if (!clans) return null;
    if (Array.isArray(clans)) return clans.find(c => c.name === name);
    return clans[name] || Object.values(clans).find(c => c.name === name);
  }

  socket.on('guild_trade_status', () => {
    const clan = _findClan(player.clan);
    if (!clan) return socket.emit('guild_trade_status', { ok: false, msg: '길드에 가입되어 있지 않습니다.' });
    if (!clan._guildTrade) initGuildTrade(clan);
    socket.emit('guild_trade_status', { ok: true, data: getGuildTradeStatus(clan) });
  });

  socket.on('guild_treasury_deposit', (data) => {
    const clan = _findClan(player.clan);
    if (!clan) return socket.emit('guild_treasury_deposit', { ok: false, msg: '길드 없음' });
    const result = depositTreasury(player, clan, data?.amount || 0);
    socket.emit('guild_treasury_deposit', result);
  });

  socket.on('guild_treasury_withdraw', (data) => {
    const clan = _findClan(player.clan);
    if (!clan) return socket.emit('guild_treasury_withdraw', { ok: false, msg: '길드 없음' });
    const result = withdrawTreasury(player, clan, data?.amount || 0);
    socket.emit('guild_treasury_withdraw', result);
  });

  socket.on('guild_caravan_launch', (data) => {
    const clan = _findClan(player.clan);
    if (!clan) return socket.emit('guild_caravan_launch', { ok: false, msg: '길드 없음' });
    if (!clan._guildTrade) initGuildTrade(clan);
    const result = launchGuildCaravan(player, clan, data?.routeId, data?.tier || 1, players, io);
    socket.emit('guild_caravan_launch', result);
  });

  socket.on('guild_caravan_escort', (data) => {
    const clan = _findClan(player.clan);
    if (!clan) return socket.emit('guild_caravan_escort', { ok: false, msg: '길드 없음' });
    const result = joinEscort(player, clan, data?.caravanId);
    socket.emit('guild_caravan_escort', result);
    if (result.ok) io.emit('server_msg', result.msg);
  });

  socket.on('guild_caravan_raid', (data) => {
    const caravan = activeGuildCaravans[data?.caravanId];
    if (!caravan) return socket.emit('guild_caravan_raid', { ok: false, msg: '캐러밴을 찾을 수 없습니다.' });
    if (caravan.clanName === player.clan) return socket.emit('guild_caravan_raid', { ok: false, msg: '자기 길드 캐러밴은 약탈할 수 없습니다.' });
    const result = raidGuildCaravan(player, data.caravanId, data?.party, io);
    socket.emit('guild_caravan_raid', result);
  });

  socket.on('guild_trade_alliance', (data) => {
    const clan1 = _findClan(player.clan);
    const clan2 = _findClan(data?.targetClan);
    if (!clan1 || !clan2) return socket.emit('guild_trade_alliance', { ok: false, msg: '길드 정보를 찾을 수 없습니다.' });
    const result = formTradeAlliance(clan1, clan2);
    socket.emit('guild_trade_alliance', result);
    if (result.ok) io.emit('server_msg', result.msg);
  });

  socket.on('guild_trade_ranking', () => {
    const ranking = getGuildTradeRanking(clans);
    socket.emit('guild_trade_ranking', { ok: true, ranking });
  });

  socket.on('guild_active_caravans', () => {
    const all = Object.values(activeGuildCaravans)
      .filter(c => c.status === 'transit' && c.clanName !== player.clan)
      .map(c => ({
        id: c.id,
        clanName: c.clanName,
        route: `${c.route.from} → ${c.route.to}`,
        tier: c.tierInfo.name,
        icon: c.tierInfo.icon,
        defense: c.defense,
        escorts: c.escorts.length,
        cargoValue: c.cargoValue,
        remainSec: Math.max(0, Math.ceil((c.arriveAt - Date.now()) / 1000)),
      }));
    socket.emit('guild_active_caravans', { ok: true, caravans: all });
  });
}

module.exports = {
  GUILD_CARAVAN_TIERS,
  RAID_REWARDS,
  TRADE_ALLIANCE_BONUSES,
  activeGuildCaravans,
  initGuildTrade,
  depositTreasury,
  withdrawTreasury,
  launchGuildCaravan,
  joinEscort,
  raidGuildCaravan,
  arriveGuildCaravan,
  formTradeAlliance,
  breakAlliance,
  getGuildTradeStatus,
  getGuildTradeRanking,
  registerGuildTradeHandlers,
};
