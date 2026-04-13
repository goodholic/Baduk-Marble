// 진영 전쟁 시스템 — v3.0
// 5진영 대립, 영토 쟁탈, 진영 버프, 시즌제

const FACTIONS = [
  { id: 'knight',  name: '왕국 기사단', icon: '🦁', buff: { def: 10, wallHp: 15 }, desc: 'DEF +10%, 성벽 HP +15%' },
  { id: 'dragon',  name: '드래곤 로드', icon: '🐲', buff: { atk: 10, fireDmg: 20 }, desc: 'ATK +10%, 화염DMG +20%' },
  { id: 'shadow',  name: '암흑 결사',   icon: '🌙', buff: { crit: 15, stealth: 3 }, desc: '크리 +15%, 은신 +3초' },
  { id: 'nature',  name: '자연의 수호자',icon: '🌿', buff: { heal: 20, capture: 15 }, desc: '힐 +20%, 포획률 +15%' },
  { id: 'merchant',name: '상인 연합',   icon: '💰', buff: { trade: 15, auction: 3 }, desc: '무역이윤 +15%, 수수료 -3%' },
];

const TERRITORIES = [
  { id: 'plains',  name: '바람개비 평원', value: 1, resource: '식량' },
  { id: 'port',    name: '별빛 항구',    value: 2, resource: '해상 무역' },
  { id: 'oasis',   name: '달빛 오아시스', value: 1, resource: '약초' },
  { id: 'mountain',name: '구름마루 산맥', value: 2, resource: '광석' },
  { id: 'temple',  name: '신전 마을',    value: 2, resource: '마나' },
  { id: 'desert',  name: '사막 시장',    value: 3, resource: '보석' },
  { id: 'east',    name: '동쪽 항구',    value: 1, resource: '비단' },
];

// 서버 상태 (메모리)
let factionState = {
  territories: {}, // territoryId → factionId
  scores: {},      // factionId → points
  season: 1,
  warActive: false,
  lastWar: 0,
};

function getFactionState() { return factionState; }

function joinFaction(player, factionId) {
  const faction = FACTIONS.find(f => f.id === factionId);
  if (!faction) return { success: false, msg: '진영 없음' };
  if (player._faction && player._faction.id === factionId) return { success: false, msg: '이미 소속된 진영' };
  if (player._faction && player._factionCooldown && Date.now() - player._factionCooldown < 7776000000) {
    return { success: false, msg: '진영 변경은 3개월에 1회만 가능' };
  }

  player._faction = { id: factionId, joinedAt: Date.now(), loyalty: 0 };
  player._factionCooldown = Date.now();

  return { success: true, msg: `${faction.icon} ${faction.name} 가입!`, faction };
}

function getFactionBuff(player) {
  if (!player._faction) return {};
  const faction = FACTIONS.find(f => f.id === player._faction.id);
  return faction ? faction.buff : {};
}

// 영토 점령 (공성전 승리 시 호출)
function claimTerritory(factionId, territoryId) {
  const territory = TERRITORIES.find(t => t.id === territoryId);
  if (!territory) return { success: false };

  const prevOwner = factionState.territories[territoryId];
  factionState.territories[territoryId] = factionId;

  if (!factionState.scores[factionId]) factionState.scores[factionId] = 0;
  factionState.scores[factionId] += territory.value * 100;

  return {
    success: true,
    territory: territory.name,
    prevOwner: prevOwner ? FACTIONS.find(f => f.id === prevOwner)?.name : '중립',
    newOwner: FACTIONS.find(f => f.id === factionId)?.name,
  };
}

// 진영 보상 계산 (영토 수 기반)
function getFactionRewards(factionId) {
  const owned = Object.values(factionState.territories).filter(f => f === factionId).length;
  if (owned >= 5) return { gold: 2000, diamonds: 10, tier: '패권', desc: '진영 전용 신화 용병 교환권' };
  if (owned >= 3) return { gold: 1000, diamonds: 5, tier: '강세', desc: '진영 전용 던전 해금' };
  if (owned >= 1) return { gold: 500, diamonds: 2, tier: '보통', desc: '일일 자원 수입' };
  return { gold: 0, diamonds: 0, tier: '무영토', desc: '' };
}

// 진영 전쟁 시작 (2주마다, 관리자 or 자동)
function startFactionWar(io) {
  if (factionState.warActive) return { success: false, msg: '이미 전쟁 중' };
  factionState.warActive = true;
  factionState.lastWar = Date.now();

  if (io) io.emit('server_msg', { msg: '⚔️ 진영 전쟁 시작! 7일간 영토 쟁탈전!', type: 'boss' });
  return { success: true };
}

function endFactionWar(io) {
  if (!factionState.warActive) return;
  factionState.warActive = false;

  // 시즌 점수 집계
  const ranking = FACTIONS.map(f => ({
    ...f,
    score: factionState.scores[f.id] || 0,
    territories: Object.values(factionState.territories).filter(t => t === f.id).length,
  })).sort((a, b) => b.score - a.score);

  if (io) {
    io.emit('server_msg', {
      msg: `🏆 진영 전쟁 종료! 1위: ${ranking[0].icon} ${ranking[0].name} (${ranking[0].score}점, ${ranking[0].territories}영토)`,
      type: 'boss',
    });
    io.emit('faction_war_end', { ranking });
  }

  factionState.season++;
  return { ranking };
}

function registerFactionHandlers(socket, playerId, players, io) {
  socket.on('faction_join', (factionId) => {
    const p = players[playerId];
    if (!p) return;
    const result = joinFaction(p, factionId);
    socket.emit('faction_result', result);
  });

  socket.on('faction_status', () => {
    const p = players[playerId];
    if (!p) return;
    const myFaction = p._faction ? FACTIONS.find(f => f.id === p._faction.id) : null;
    socket.emit('faction_status', {
      factions: FACTIONS,
      myFaction: myFaction ? { ...myFaction, loyalty: p._faction.loyalty } : null,
      buff: getFactionBuff(p),
      territories: factionState.territories,
      scores: factionState.scores,
      warActive: factionState.warActive,
      season: factionState.season,
      rewards: myFaction ? getFactionRewards(myFaction.id) : null,
    });
  });

  socket.on('faction_territories', () => {
    socket.emit('faction_territories', {
      territories: TERRITORIES.map(t => ({
        ...t,
        owner: factionState.territories[t.id] || null,
        ownerName: factionState.territories[t.id] ? FACTIONS.find(f => f.id === factionState.territories[t.id])?.name : '중립',
        ownerIcon: factionState.territories[t.id] ? FACTIONS.find(f => f.id === factionState.territories[t.id])?.icon : '⚪',
      })),
    });
  });
}

module.exports = { FACTIONS, TERRITORIES, registerFactionHandlers, getFactionBuff, claimTerritory, getFactionState, startFactionWar, endFactionWar };
