// 명상 시스템 — v1.91
// 신성한 장소에서 시간을 보내 명상 포인트를 얻고 영구 패시브 강화

const MEDITATION_ZONES = {
  shrine:       { name:'고대 신전',   rate: 1.0, bonus: 1.2 },
  mountain_top: { name:'산 정상',     rate: 0.8, bonus: 1.0 },
  forest_grove: { name:'숲의 성소',   rate: 0.7, bonus: 1.1 },
  starlit_lake: { name:'별빛 호수',   rate: 1.2, bonus: 1.3 },
};

const MEDITATION_PERKS = {
  inner_peace:   { name:'내면의 평화', cost: 50,  effect:'maxHp +30',     stat:'maxHp', value:30 },
  sharp_mind:    { name:'예리한 정신', cost: 80,  effect:'crit +3%',      stat:'crit',  value:3  },
  iron_will:     { name:'강철 의지',   cost: 100, effect:'def +15',       stat:'def',   value:15 },
  flowing_river: { name:'흐르는 강',   cost: 120, effect:'evasion +4%',   stat:'evasion', value:4 },
  enlightenment: { name:'깨달음',      cost: 200, effect:'expGain +10%',  stat:'expBonus', value:10 },
};

const MAX_SESSION_HOURS = 4;
const COOLDOWN_MIN = 30;

function _ensure(player) {
  if (!player.meditation) {
    player.meditation = {
      points: 0,
      totalMinutes: 0,
      sessions: 0,
      perks: {},
      activeSession: null,
      lastEnd: 0,
    };
  }
  return player.meditation;
}

function getStatus(player) {
  const m = _ensure(player);
  const now = Date.now();
  let sessionInfo = null;
  if (m.activeSession) {
    const elapsed = Math.floor((now - m.activeSession.startedAt) / 60000);
    sessionInfo = {
      zone: m.activeSession.zone,
      zoneName: MEDITATION_ZONES[m.activeSession.zone]?.name || m.activeSession.zone,
      elapsedMinutes: elapsed,
      maxMinutes: MAX_SESSION_HOURS * 60,
    };
  }
  const cooldownLeft = Math.max(0, (m.lastEnd + COOLDOWN_MIN * 60000 - now));
  return {
    points: m.points,
    totalMinutes: m.totalMinutes,
    sessions: m.sessions,
    perks: m.perks,
    activeSession: sessionInfo,
    cooldownSecondsLeft: Math.ceil(cooldownLeft / 1000),
    zones: MEDITATION_ZONES,
    availablePerks: MEDITATION_PERKS,
  };
}

function startSession(player, zoneId) {
  const m = _ensure(player);
  if (m.activeSession) return { success:false, msg:'이미 명상 중' };
  if (!MEDITATION_ZONES[zoneId]) return { success:false, msg:'명상 가능한 장소가 아님' };
  const now = Date.now();
  if (now < m.lastEnd + COOLDOWN_MIN * 60000) {
    return { success:false, msg:`쿨다운 ${Math.ceil((m.lastEnd + COOLDOWN_MIN*60000 - now)/60000)}분 남음` };
  }
  m.activeSession = { zone: zoneId, startedAt: now };
  return { success:true, msg:`${MEDITATION_ZONES[zoneId].name}에서 명상 시작` };
}

function endSession(player) {
  const m = _ensure(player);
  if (!m.activeSession) return { success:false, msg:'명상 중이 아님' };
  const now = Date.now();
  const zone = MEDITATION_ZONES[m.activeSession.zone];
  let minutes = Math.floor((now - m.activeSession.startedAt) / 60000);
  if (minutes < 1) {
    m.activeSession = null;
    return { success:false, msg:'명상이 너무 짧음 (1분 이상 필요)' };
  }
  if (minutes > MAX_SESSION_HOURS * 60) minutes = MAX_SESSION_HOURS * 60;
  const gained = Math.floor(minutes * (zone?.rate || 1) * (zone?.bonus || 1));
  m.points += gained;
  m.totalMinutes += minutes;
  m.sessions += 1;
  m.activeSession = null;
  m.lastEnd = now;
  return { success:true, msg:`명상 종료 — ${minutes}분 / +${gained} 포인트`, gained, minutes };
}

function buyPerk(player, perkId) {
  const m = _ensure(player);
  const perk = MEDITATION_PERKS[perkId];
  if (!perk) return { success:false, msg:'존재하지 않는 패시브' };
  if (m.perks[perkId]) return { success:false, msg:'이미 습득함' };
  if (m.points < perk.cost) return { success:false, msg:`포인트 부족 (${perk.cost} 필요)` };
  m.points -= perk.cost;
  m.perks[perkId] = { unlockedAt: Date.now() };
  return { success:true, msg:`${perk.name} 습득! (${perk.effect})`, perk };
}

function getPerkBonuses(player) {
  const m = _ensure(player);
  const bonuses = {};
  for (const id of Object.keys(m.perks)) {
    const perk = MEDITATION_PERKS[id];
    if (!perk) continue;
    bonuses[perk.stat] = (bonuses[perk.stat] || 0) + perk.value;
  }
  return bonuses;
}

module.exports = {
  MEDITATION_ZONES,
  MEDITATION_PERKS,
  getStatus,
  startSession,
  endSession,
  buyPerk,
  getPerkBonuses,
};
