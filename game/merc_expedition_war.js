// v5.1 — 용병 원정 대전쟁 시스템
// SLG 뷰에서 용병 부대를 편성하여 자동 전투 대규모전 수행

const MAX_EXPEDITION_SLOTS = 3;
const EXPEDITION_TICK = 10; // 10초마다 전투 진행

// 원정 대륙 맵 (각 대륙마다 고유 보상/위험)
const EXPEDITION_MAPS = [
  { id: 'green_plains', name: '초원 대평원', icon: '🌿', difficulty: 1, stages: 10, reward: { gold: 5000, exp: 300, item: '풀의 결정' }, lore: '평화로운 초원, 초보 원정에 적합' },
  { id: 'dark_forest', name: '어둠의 숲', icon: '🌲', difficulty: 3, stages: 15, reward: { gold: 12000, exp: 600, item: '고대 나무 수액' }, lore: '빛이 닿지 않는 숲, 독충과 언데드 출몰' },
  { id: 'volcanic_waste', name: '화산 황무지', icon: '🌋', difficulty: 5, stages: 20, reward: { gold: 25000, exp: 1000, item: '용암 결정' }, lore: '타오르는 대지, 화염 몬스터의 영역' },
  { id: 'frozen_abyss', name: '빙결 심연', icon: '❄️', difficulty: 7, stages: 25, reward: { gold: 40000, exp: 1500, item: '영원의 빙핵' }, lore: '만년빙의 세계, 극한의 추위' },
  { id: 'shadow_realm', name: '그림자 차원', icon: '🌑', difficulty: 9, stages: 30, reward: { gold: 70000, exp: 2500, item: '암흑 에센스' }, lore: '차원의 틈새, 최강 몬스터 서식지' },
  { id: 'celestial_tower', name: '천상의 탑', icon: '🏛️', difficulty: 10, stages: 50, reward: { gold: 100000, exp: 5000, item: '신의 파편' }, lore: '전설의 탑, 최종 엔드게임 원정' },
];

// 원정 부대 편성 (최대 6명 + 진형)
const FORMATIONS = {
  balanced:  { name: '균형진', front: 3, back: 3, bonus: { all: 1.05 }, desc: '전후열 3:3 균형' },
  offensive: { name: '공격진', front: 4, back: 2, bonus: { atk: 1.15, def: 0.9 }, desc: '전열 집중 돌파' },
  defensive: { name: '방어진', front: 2, back: 4, bonus: { def: 1.2, atk: 0.9 }, desc: '후열 방어 중시' },
  pincer:    { name: '포위진', front: 3, back: 3, bonus: { atk: 1.1, crit: 1.1 }, desc: '양익 협공 크리 증가' },
  guerrilla: { name: '유격진', front: 2, back: 4, bonus: { spd: 1.3, eva: 1.2, def: 0.8 }, desc: '빠른 유격전' },
};

// 원정 중 랜덤 이벤트
const EXPEDITION_EVENTS = [
  { id: 'ambush', name: '매복!', chance: 0.15, effect: 'enemy_surprise', desc: '적의 기습! 첫 턴 방어 불가', icon: '⚠️' },
  { id: 'treasure', name: '보물 발견', chance: 0.10, effect: 'bonus_loot', desc: '숨겨진 보물상자! 추가 보상', icon: '💎' },
  { id: 'merchant', name: '떠돌이 상인', chance: 0.08, effect: 'shop', desc: '원정 중 상인 조우, 아이템 구매 가능', icon: '🏪' },
  { id: 'ally_join', name: '지원군 합류', chance: 0.05, effect: 'temp_ally', desc: 'NPC 용병 1명 임시 합류!', icon: '🤝' },
  { id: 'trap', name: '함정 지대', chance: 0.12, effect: 'team_damage', desc: '팀 전원 HP 10% 손실', icon: '🪤' },
  { id: 'rest_spot', name: '안전 지대', chance: 0.08, effect: 'heal_all', desc: '팀 전원 HP 30% 회복', icon: '⛺' },
  { id: 'elite_enemy', name: '엘리트 적', chance: 0.10, effect: 'strong_enemy', desc: '강화된 적 출현! 보상 2배', icon: '💀' },
  { id: 'weather_change', name: '날씨 변화', chance: 0.10, effect: 'weather', desc: '날씨 변화로 전투 조건 변동', icon: '🌤️' },
  { id: 'morale_boost', name: '사기 충전', chance: 0.07, effect: 'buff_all', desc: '전원 ATK+15% (3턴)', icon: '🎺' },
  { id: 'deserter', name: '탈영병', chance: 0.03, effect: 'lose_merc', desc: '가장 친밀도 낮은 용병 이탈!', icon: '🏃' },
];

// 전투 시뮬레이션 (간략 자동 전투)
function simulateBattle(squad, enemyPower) {
  const squadPower = squad.reduce((sum, m) => sum + (m.atk || 50) + (m.def || 30) + (m.hp || 500) * 0.1, 0);
  const ratio = squadPower / Math.max(enemyPower, 1);
  const win = ratio > 0.8 ? (Math.random() < Math.min(0.95, ratio * 0.6)) : (Math.random() < ratio * 0.3);

  const casualties = [];
  if (win) {
    // 승리: 일부 용병 피해
    squad.forEach(m => {
      const dmg = Math.floor(Math.random() * (m.hp || 500) * 0.3);
      m.currentHp = Math.max(1, (m.currentHp || m.hp || 500) - dmg);
      if (m.currentHp <= (m.hp || 500) * 0.1) casualties.push(m.name);
    });
  } else {
    // 패배: 큰 피해
    squad.forEach(m => {
      const dmg = Math.floor(Math.random() * (m.hp || 500) * 0.7);
      m.currentHp = Math.max(0, (m.currentHp || m.hp || 500) - dmg);
      if (m.currentHp <= 0) casualties.push(m.name);
    });
  }

  return { win, squadPower: Math.round(squadPower), enemyPower, casualties };
}

function startExpedition(player, mapId, mercIds, formationId) {
  const map = EXPEDITION_MAPS.find(m => m.id === mapId);
  if (!map) return { ok: false, reason: '알 수 없는 원정지' };

  const exps = player.expeditions || [];
  if (exps.length >= MAX_EXPEDITION_SLOTS) return { ok: false, reason: `최대 ${MAX_EXPEDITION_SLOTS}개 원정 가능` };

  const mercs = player.mercenaries || [];
  const squad = mercIds.map(id => mercs.find(m => m.id === id)).filter(Boolean);
  if (squad.length === 0) return { ok: false, reason: '용병이 없음' };

  const formation = FORMATIONS[formationId] || FORMATIONS.balanced;

  const expedition = {
    id: `exp_${Date.now()}`,
    mapId, mapName: map.name,
    squad: squad.map(m => ({ id: m.id, name: m.name, hp: m.hp, atk: m.atk, def: m.def, currentHp: m.hp })),
    formation,
    currentStage: 0,
    totalStages: map.stages,
    difficulty: map.difficulty,
    reward: map.reward,
    events: [],
    startTime: Date.now(),
    status: 'active',
  };

  exps.push(expedition);
  player.expeditions = exps;

  return { ok: true, expedition };
}

function tickExpedition(player, expId) {
  const exp = (player.expeditions || []).find(e => e.id === expId);
  if (!exp || exp.status !== 'active') return { ok: false, reason: '원정 없음' };

  // 랜덤 이벤트 체크
  const event = EXPEDITION_EVENTS.find(e => Math.random() < e.chance);

  // 전투 시뮬레이션
  const enemyPower = exp.difficulty * 100 * (1 + exp.currentStage * 0.15);
  const battle = simulateBattle(exp.squad, enemyPower);

  exp.currentStage++;
  const result = { stage: exp.currentStage, battle, event: event || null };

  if (event) exp.events.push(event);

  if (!battle.win) {
    exp.status = 'failed';
    result.failed = true;
  } else if (exp.currentStage >= exp.totalStages) {
    exp.status = 'completed';
    result.completed = true;
    result.reward = exp.reward;
  }

  return { ok: true, ...result };
}

function register(io, socket, player) {
  socket.on('expedition_start', (data) => {
    const result = startExpedition(player, data.mapId, data.mercIds, data.formationId);
    socket.emit('expedition_start_result', result);
  });

  socket.on('expedition_tick', (data) => {
    const result = tickExpedition(player, data.expId);
    socket.emit('expedition_tick_result', result);
    if (result.completed) {
      io.emit('server_msg', `🏆 [원정 완료] ${player.name}의 원정대가 성공적으로 귀환!`);
    }
  });

  socket.on('expedition_list', () => {
    socket.emit('expedition_list', {
      maps: EXPEDITION_MAPS,
      formations: FORMATIONS,
      active: player.expeditions || [],
      maxSlots: MAX_EXPEDITION_SLOTS,
    });
  });
}

module.exports = {
  EXPEDITION_MAPS, FORMATIONS, EXPEDITION_EVENTS, MAX_EXPEDITION_SLOTS,
  simulateBattle, startExpedition, tickExpedition, register,
};
