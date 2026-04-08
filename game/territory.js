// 영토(Territory) 통제 시스템 — v1.73
// 길드가 특정 지역을 점유 → 길드원 전체에게 자원 보너스
// 7일 점유 + 주간 임대료 + 다른 길드의 도전 가능

const { ZONES } = require('./data/zones');

// 점유 가능한 영토 (전략적 가치 있는 지역)
const CONTROLLABLE_ZONES = {
  cave:        { rentGold: 5000,  bonus: { dropRate: 0.10 },              type: '광물' },
  ruins:       { rentGold: 8000,  bonus: { expBonus: 0.15 },              type: '고대 유적' },
  volcano:     { rentGold: 15000, bonus: { fireDmg: 0.15, atk: 10 },      type: '화산' },
  graveyard:   { rentGold: 10000, bonus: { darkDmg: 0.15, def: 10 },      type: '무덤' },
  dragon:      { rentGold: 25000, bonus: { atk: 25, critRate: 0.05 },     type: '드래곤 둥지' },
  abyss:       { rentGold: 30000, bonus: { atk: 30, critDmg: 0.10 },      type: '심연' },
  ancient:     { rentGold: 20000, bonus: { expBonus: 0.20, hp: 100 },     type: '태고의 숲' },
  crystal_mine:{ rentGold: 12000, bonus: { goldBonus: 0.20 },             type: '광산' },
  celestial:   { rentGold: 35000, bonus: { allMulti: 0.05 },              type: '천공' },
  void_rift:   { rentGold: 50000, bonus: { atk: 50, critRate: 0.10, dropRate: 0.20 }, type: '공허' },
};

const TERRITORY_CONFIG = {
  claimDurationDays: 7,
  challengeWindowHours: 24,    // 만료 24시간 전부터 도전 가능
  maxTerritoriesPerGuild: 3,
  challengeWarCost: 20000,     // 도전 시 비용
};

// 영토 상태 (메모리)
let territories = {};
// { zoneId: { ownerGuild, claimedAt, expiresAt, rentPaid, challengers: [] } }

function _initTerritory(zoneId) {
  if (!territories[zoneId]) {
    territories[zoneId] = {
      ownerGuild: null,
      claimedAt: 0,
      expiresAt: 0,
      rentPaid: 0,
      challengers: [],
    };
  }
  return territories[zoneId];
}

function claimTerritory(guildName, leaderGold, zoneId) {
  if (!CONTROLLABLE_ZONES[zoneId]) return { success: false, msg: '점유 불가능한 영토' };
  const t = _initTerritory(zoneId);

  // 이미 점유된 영토
  if (t.ownerGuild && t.expiresAt > Date.now()) {
    return { success: false, msg: `이미 ${t.ownerGuild} 길드 소유` };
  }

  // 동시 점유 한도 (이 함수에서는 호출자가 검증)
  const myTerritories = Object.values(territories).filter(tt => tt.ownerGuild === guildName);
  if (myTerritories.length >= TERRITORY_CONFIG.maxTerritoriesPerGuild) {
    return { success: false, msg: `최대 ${TERRITORY_CONFIG.maxTerritoriesPerGuild}개 영토` };
  }

  const cost = CONTROLLABLE_ZONES[zoneId].rentGold;
  if ((leaderGold || 0) < cost) {
    return { success: false, msg: `임대료 ${cost}G 필요` };
  }

  t.ownerGuild = guildName;
  t.claimedAt = Date.now();
  t.expiresAt = Date.now() + TERRITORY_CONFIG.claimDurationDays * 24 * 3600 * 1000;
  t.rentPaid = cost;
  t.challengers = [];

  return { success: true, zoneId, cost, expiresAt: t.expiresAt };
}

function challengeTerritory(challengerGuild, leaderGold, zoneId) {
  if (!CONTROLLABLE_ZONES[zoneId]) return { success: false, msg: '점유 불가능한 영토' };
  const t = territories[zoneId];
  if (!t || !t.ownerGuild) return { success: false, msg: '아무도 점유하지 않음' };
  if (t.ownerGuild === challengerGuild) return { success: false, msg: '자기 영토 도전 불가' };

  // 도전 윈도우 체크 (만료 24시간 전부터)
  const remaining = t.expiresAt - Date.now();
  const challengeWindowMs = TERRITORY_CONFIG.challengeWindowHours * 3600 * 1000;
  if (remaining > challengeWindowMs) {
    const hoursUntilWindow = Math.ceil((remaining - challengeWindowMs) / 3600000);
    return { success: false, msg: `도전 가능 시각까지 ${hoursUntilWindow}시간 남음` };
  }

  if ((leaderGold || 0) < TERRITORY_CONFIG.challengeWarCost) {
    return { success: false, msg: `도전 비용 ${TERRITORY_CONFIG.challengeWarCost}G 필요` };
  }

  if (!t.challengers.find(c => c.guild === challengerGuild)) {
    t.challengers.push({ guild: challengerGuild, declaredAt: Date.now() });
  }

  return { success: true, zoneId, contestedBy: t.challengers.map(c => c.guild) };
}

// 만료 처리 → 도전자가 있으면 길드 전쟁 트리거 (외부에서 처리)
function tickTerritories() {
  const now = Date.now();
  const events = [];
  for (const [zoneId, t] of Object.entries(territories)) {
    if (t.ownerGuild && t.expiresAt < now) {
      if (t.challengers.length > 0) {
        events.push({ type: 'contest_resolution', zoneId, owner: t.ownerGuild, challengers: t.challengers.map(c => c.guild) });
      } else {
        events.push({ type: 'expired', zoneId, owner: t.ownerGuild });
        t.ownerGuild = null;
        t.claimedAt = 0;
        t.expiresAt = 0;
        t.rentPaid = 0;
      }
    }
  }
  return events;
}

function getTerritoryBonus(player, stat) {
  if (!player.clanName) return 0;
  let total = 0;
  for (const [zoneId, t] of Object.entries(territories)) {
    if (t.ownerGuild === player.clanName && t.expiresAt > Date.now()) {
      const bonus = CONTROLLABLE_ZONES[zoneId]?.bonus?.[stat];
      if (bonus) total += bonus;
    }
  }
  return total;
}

function getStatus(guildName = null) {
  const result = {};
  for (const zoneId of Object.keys(CONTROLLABLE_ZONES)) {
    const t = territories[zoneId];
    const zone = ZONES[zoneId];
    result[zoneId] = {
      zoneId,
      zoneName: zone?.name || zoneId,
      type: CONTROLLABLE_ZONES[zoneId].type,
      rentGold: CONTROLLABLE_ZONES[zoneId].rentGold,
      bonus: CONTROLLABLE_ZONES[zoneId].bonus,
      ownerGuild: t?.ownerGuild || null,
      expiresAt: t?.expiresAt || 0,
      challengers: t?.challengers || [],
      isMine: guildName ? (t?.ownerGuild === guildName) : false,
    };
  }
  return {
    territories: result,
    config: TERRITORY_CONFIG,
  };
}

module.exports = {
  CONTROLLABLE_ZONES,
  TERRITORY_CONFIG,
  claimTerritory,
  challengeTerritory,
  tickTerritories,
  getTerritoryBonus,
  getStatus,
};
