// 환생 시스템 — v3.0
// Lv50+ 달성 시 환생 → 레벨 리셋, 영구 스탯 보너스 누적
// 최대 10회 환생, 회차마다 어려운 조건 + 강한 보너스

const REBIRTH_TIERS = [
  { tier: 1,  req: { level: 50 },                                    bonus: { allStats: 2 },  title: '초심자',       unlock: '환생 스킨 1종' },
  { tier: 2,  req: { level: 50, combatPower: 5000 },                 bonus: { allStats: 4 },  title: '수행자',       unlock: '환생 전용 무기' },
  { tier: 3,  req: { level: 50, combatPower: 10000, siegeWins: 5 },  bonus: { allStats: 6 },  title: '구도자',       unlock: '2차 전직 해금' },
  { tier: 4,  req: { level: 50, combatPower: 20000, arenaGold: true},bonus: { allStats: 8 },  title: '달인',         unlock: '환생 전용 스킬' },
  { tier: 5,  req: { level: 50, combatPower: 35000, abyssFloor: 50 },bonus: { allStats: 10 }, title: '초월자',       unlock: '전설 특성 슬롯+1' },
  { tier: 6,  req: { level: 50, combatPower: 50000, raidClear: 3 },  bonus: { allStats: 13 }, title: '현자',         unlock: '환생 오라 이펙트' },
  { tier: 7,  req: { level: 50, combatPower: 70000, dimClear: 2 },   bonus: { allStats: 16 }, title: '영웅',         unlock: '3차 전직 해금' },
  { tier: 8,  req: { level: 50, combatPower: 90000, dimClear: 4 },   bonus: { allStats: 19 }, title: '전설',         unlock: '환생 전용 펫' },
  { tier: 9,  req: { level: 50, combatPower: 110000,allDimClear: true},bonus:{ allStats: 22 }, title: '신화',         unlock: '초월 재료 -50%' },
  { tier: 10, req: { level: 50, combatPower: 150000,serverTop: 10 }, bonus: { allStats: 25 }, title: '전생의 지배자', unlock: '전 시스템 보너스 +10%' },
];

function getRebirthState(player) {
  if (!player._rebirth) player._rebirth = { count: 0, totalBonus: 0, titles: [] };
  return player._rebirth;
}

function checkRebirthReq(player, tier) {
  const req = REBIRTH_TIERS[tier - 1]?.req;
  if (!req) return { met: false, msg: '잘못된 환생 단계' };

  const fails = [];
  if (player.level < (req.level || 50)) fails.push(`Lv.${req.level} 필요 (현재 Lv.${player.level})`);
  if (req.combatPower) {
    let mercSystem;
    try { mercSystem = require('./mercenary_system'); } catch(e) {}
    const mercs = mercSystem ? mercSystem.getPlayerMercs(player) : { roster: [] };
    const power = mercs.roster.reduce((s, m) => s + (mercSystem ? mercSystem.calcCombatPower(m) : 0), 0);
    if (power < req.combatPower) fails.push(`전투력 ${req.combatPower} 필요 (현재 ${power})`);
  }
  if (req.siegeWins && (player._siegeWins || 0) < req.siegeWins) fails.push(`공성 ${req.siegeWins}승 필요`);
  if (req.arenaGold && (!player._arena || player._arena.score < 2000)) fails.push('아레나 골드 랭크 필요');
  if (req.abyssFloor && (player._abyssHighest || 0) < req.abyssFloor) fails.push(`심연 ${req.abyssFloor}층 필요`);
  if (req.raidClear && (player._raidClears || 0) < req.raidClear) fails.push(`레이드 ${req.raidClear}회 클리어 필요`);
  if (req.dimClear && (player._dimClears || 0) < req.dimClear) fails.push(`차원 ${req.dimClear}개 클리어 필요`);

  return fails.length === 0 ? { met: true } : { met: false, fails };
}

function doRebirth(player, io) {
  const rb = getRebirthState(player);
  const nextTier = rb.count + 1;
  if (nextTier > 10) return { success: false, msg: '최대 환생 (10회) 달성!' };

  const check = checkRebirthReq(player, nextTier);
  if (!check.met) return { success: false, msg: '조건 미충족', fails: check.fails };

  const tierData = REBIRTH_TIERS[nextTier - 1];

  // 리셋되는 것
  player.level = 1;
  player.exp = 0;
  // 장비는 유지, 골드 유지, 다이아 유지

  // 유지되는 것: _mercs, _castle, _trade, _arena, _captures, _faction, _battlePass, _dailyQuests, 업적, 칭호

  // 영구 보너스 적용
  rb.count = nextTier;
  rb.totalBonus += tierData.bonus.allStats;
  rb.titles.push(tierData.title);

  // 스탯 보너스 (recalcStats에서 반영되어야 함 — 여기서는 마커만)
  player._rebirthBonus = rb.totalBonus; // 전 스탯 +N%

  return {
    success: true,
    msg: `🔄 ${nextTier}회 환생! "${tierData.title}" 칭호 획득! 전 스탯 +${rb.totalBonus}%`,
    tier: nextTier,
    title: tierData.title,
    totalBonus: rb.totalBonus,
    unlock: tierData.unlock,
  };
}

function getRebirthStatus(player) {
  const rb = getRebirthState(player);
  const nextTier = rb.count + 1;
  const nextData = REBIRTH_TIERS[nextTier - 1];
  const check = nextData ? checkRebirthReq(player, nextTier) : null;

  return {
    count: rb.count,
    totalBonus: rb.totalBonus,
    titles: rb.titles,
    maxTier: 10,
    next: nextData ? {
      tier: nextTier,
      title: nextData.title,
      bonus: nextData.bonus,
      unlock: nextData.unlock,
      requirements: nextData.req,
      met: check?.met || false,
      fails: check?.fails || [],
    } : null,
  };
}

function registerRebirthHandlers(socket, playerId, players, io) {
  socket.on('rebirth_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('rebirth_status', getRebirthStatus(p));
  });

  socket.on('rebirth_do', () => {
    const p = players[playerId];
    if (!p) return;
    const result = doRebirth(p, io);
    socket.emit('rebirth_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: `🔄 ${p.displayName||p.className}님이 ${result.tier}회 환생! "${result.title}"`, type: 'boss' });
    }
  });
}

module.exports = { registerRebirthHandlers, getRebirthState, addRebirthBonus: (p) => (p._rebirthBonus || 0) };
