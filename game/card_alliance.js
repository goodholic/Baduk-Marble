// ============================================
// 연맹 전쟁 -- 길드 연합 + 영토 점령 + 선전포고
// ============================================

const MAX_GUILDS_PER_ALLIANCE = 5;
const WAR_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1주일
const DECLARE_WAR_COST = 50000; // 5만G

// 12개 영토
const TERRITORIES = {
  meadow:      { name: '초원',     difficulty: 1,  bonus: { gold: 0.05 } },
  forest:      { name: '숲',       difficulty: 2,  bonus: { exp: 0.05 } },
  swamp:       { name: '늪지',     difficulty: 3,  bonus: { def: 0.03 } },
  desert:      { name: '사막',     difficulty: 4,  bonus: { atk: 0.03 } },
  mountain:    { name: '산악',     difficulty: 5,  bonus: { hp: 0.05 } },
  volcano:     { name: '화산',     difficulty: 6,  bonus: { atk: 0.05 } },
  glacier:     { name: '빙하',     difficulty: 7,  bonus: { def: 0.05 } },
  ruins:       { name: '유적',     difficulty: 8,  bonus: { exp: 0.10 } },
  darkforest:  { name: '어둠의숲', difficulty: 8,  bonus: { crit: 0.05 } },
  skyisland:   { name: '하늘섬',   difficulty: 9,  bonus: { gold: 0.10 } },
  abyss:       { name: '심연',     difficulty: 9,  bonus: { atk: 0.08 } },
  throne:      { name: '왕좌도시', difficulty: 10, bonus: { all: 0.05 } },
};

// 전쟁 점수
const WAR_SCORES = { kill: 10, siege: 50, territory: 100 };

const alliances = {};   // { allianceId: AllianceData }
const wars = {};        // { warId: WarData }
const territoryOwners = {}; // { territoryId: allianceId }

// ── 유틸 ─────────────────────────────────────
function getPlayerId(player) {
  return player.id || player.deviceId || 'unknown';
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function _ensureAlliance(player) {
  if (!player.alliance) {
    player.alliance = { id: null, role: null };
  }
}

// ── 연맹 생성 ────────────────────────────────
function createAlliance(player, name) {
  _ensureAlliance(player);
  if (player.alliance.id) return { ok: false, msg: '이미 연맹에 소속되어 있습니다' };

  const id = generateId('alliance');
  alliances[id] = {
    id,
    name,
    leader: getPlayerId(player),
    guilds: [],
    territories: [],
    warScore: 0,
    createdAt: Date.now(),
  };
  player.alliance = { id, role: 'leader' };
  return { ok: true, allianceId: id };
}

// ── 길드 가입 ────────────────────────────────
function joinAlliance(player, allianceId, guildId) {
  const a = alliances[allianceId];
  if (!a) return { ok: false, msg: '연맹을 찾을 수 없습니다' };
  if (a.guilds.length >= MAX_GUILDS_PER_ALLIANCE) return { ok: false, msg: '연맹 길드 수 초과 (최대 5)' };
  if (a.guilds.includes(guildId)) return { ok: false, msg: '이미 가입된 길드입니다' };

  a.guilds.push(guildId);
  _ensureAlliance(player);
  player.alliance = { id: allianceId, role: 'guild_leader' };
  return { ok: true };
}

// ── 영토 공격 ────────────────────────────────
function attackTerritory(player, territoryId) {
  _ensureAlliance(player);
  if (!player.alliance.id) return { ok: false, msg: '연맹에 가입하세요' };
  const t = TERRITORIES[territoryId];
  if (!t) return { ok: false, msg: '존재하지 않는 영토' };

  // 간단한 전투 시뮬레이션 (파티 카드 전투력 기반)
  const partyPower = (player.party || []).length * 100 + Math.random() * 200;
  const defensePower = t.difficulty * 150 + Math.random() * 100;

  if (partyPower > defensePower) {
    const prevOwner = territoryOwners[territoryId];
    territoryOwners[territoryId] = player.alliance.id;
    const a = alliances[player.alliance.id];
    if (a && !a.territories.includes(territoryId)) {
      a.territories.push(territoryId);
    }
    if (prevOwner && alliances[prevOwner]) {
      alliances[prevOwner].territories = alliances[prevOwner].territories.filter(id => id !== territoryId);
    }
    return { ok: true, result: 'victory', territory: t.name, bonus: t.bonus };
  }
  return { ok: true, result: 'defeat', territory: t.name };
}

// ── 선전포고 ─────────────────────────────────
function declareWar(player, targetAllianceId) {
  _ensureAlliance(player);
  const myA = alliances[player.alliance.id];
  if (!myA) return { ok: false, msg: '연맹 없음' };
  if (myA.leader !== getPlayerId(player)) return { ok: false, msg: '연맹장만 선전포고 가능' };
  if (!player.gold || player.gold < DECLARE_WAR_COST) return { ok: false, msg: `${DECLARE_WAR_COST}G 필요` };

  player.gold -= DECLARE_WAR_COST;
  const warId = generateId('war');
  wars[warId] = {
    id: warId,
    attacker: player.alliance.id,
    defender: targetAllianceId,
    scores: { [player.alliance.id]: 0, [targetAllianceId]: 0 },
    startedAt: Date.now(),
    endsAt: Date.now() + WAR_DURATION_MS,
    status: 'active',
  };
  return { ok: true, warId };
}

// ── 연맹 보너스 계산 ─────────────────────────
function getAllianceBonus(player) {
  _ensureAlliance(player);
  const a = alliances[player.alliance.id];
  if (!a) return {};

  const totalBonus = {};
  for (const tid of a.territories) {
    const t = TERRITORIES[tid];
    if (!t) continue;
    for (const [stat, val] of Object.entries(t.bonus)) {
      totalBonus[stat] = (totalBonus[stat] || 0) + val;
    }
  }
  return totalBonus;
}

// ── 랭킹 ────────────────────────────────────
function getAllianceRanking() {
  return Object.values(alliances)
    .map(a => ({ name: a.name, territories: a.territories.length, warScore: a.warScore }))
    .sort((a, b) => b.territories - a.territories || b.warScore - a.warScore);
}

// ── Socket 등록 ──────────────────────────────
function register(io, socket, player, players) {
  socket.on('alliance:create', (data, cb) => {
    const res = createAlliance(player, data.name);
    if (cb) cb(res);
  });

  socket.on('alliance:join', (data, cb) => {
    const res = joinAlliance(player, data.allianceId, data.guildId);
    if (cb) cb(res);
  });

  socket.on('alliance:attack', (data, cb) => {
    const res = attackTerritory(player, data.territoryId);
    if (cb) cb(res);
  });

  socket.on('alliance:declareWar', (data, cb) => {
    const res = declareWar(player, data.targetAllianceId);
    if (cb) cb(res);
  });

  socket.on('alliance:bonus', (data, cb) => {
    const bonus = getAllianceBonus(player);
    if (cb) cb({ ok: true, bonus });
  });

  socket.on('alliance:ranking', (data, cb) => {
    const ranking = getAllianceRanking();
    if (cb) cb({ ok: true, ranking });
  });

  socket.on('alliance:territories', (data, cb) => {
    if (cb) cb({ ok: true, territories: TERRITORIES, owners: territoryOwners });
  });
}

module.exports = { register, createAlliance, joinAlliance, attackTerritory, declareWar, getAllianceBonus, getAllianceRanking, TERRITORIES };
