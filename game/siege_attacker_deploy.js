// v5.1 — 공성전 공격자 용병 투입 시스템
// 도전자(공격자)도 용병을 투입하여 IO+용병 전략 공성

const MAX_ATTACKER_DEPLOYS = 5;
const DEPLOY_COOLDOWN = 30; // 초

// 공격자 용병 투입 역할
const DEPLOY_ROLES = {
  vanguard:   { name: '선봉대', icon: '⚔️', atkMul: 1.3, defMul: 0.8, desc: '가장 먼저 돌격, 적 어그로 유도' },
  siege_eng:  { name: '공성공병', icon: '💣', atkMul: 1.0, defMul: 0.9, structDmg: 2.0, desc: '성벽/구조물 데미지 2배' },
  medic:      { name: '군의관', icon: '💉', atkMul: 0.5, defMul: 1.0, healRate: 0.05, desc: '플레이어+용병 지속 회복' },
  scout:      { name: '정찰병', icon: '👁️', atkMul: 0.8, defMul: 0.7, vision: 2.0, desc: '함정 탐지 + 시야 확장' },
  tank_buster:{ name: '대전차병', icon: '🔨', atkMul: 1.5, defMul: 1.2, desc: '보스/탱크 대상 특화 데미지' },
  support:    { name: '지원사격', icon: '🏹', atkMul: 1.1, defMul: 0.6, range: 300, desc: '후방에서 원거리 지원' },
};

// 공격자 전술 (투입 전 선택)
const ATTACK_TACTICS = {
  blitz:     { name: '전격전', desc: '전 용병 이동속도+30%, 방어-20%', effect: { spdMul: 1.3, defMul: 0.8 } },
  siege:     { name: '포위전', desc: '성벽 데미지+50%, 이동속도-20%', effect: { structDmg: 1.5, spdMul: 0.8 } },
  stealth:   { name: '잠입전', desc: '처음 15초 은신, 탐지 불가', effect: { stealth: 15 } },
  overwhelm: { name: '물량전', desc: '추가 NPC 지원병 3명, 약하지만 어그로 분산', effect: { extraNPC: 3 } },
  precision: { name: '정밀타격', desc: '크리율+40%, 구조물 우선 타격', effect: { critMul: 1.4, targetStructs: true } },
};

// 공성전 페이즈 시스템 (공격자 관점)
const SIEGE_PHASES = [
  { phase: 1, name: '외벽 돌파', desc: '외성벽 파괴 → 진입로 확보', objective: 'destroy_outer_wall', timeLimit: 120 },
  { phase: 2, name: '함정 지대', desc: '성주 함정 밀집 구간 돌파', objective: 'survive_trap_zone', timeLimit: 90 },
  { phase: 3, name: '내성 진입', desc: '내성벽 돌파 → 수비 용병과 전투', objective: 'breach_inner_wall', timeLimit: 120 },
  { phase: 4, name: '왕좌의 방', desc: '성주 최강 용병과 최종 대결', objective: 'defeat_throne_guard', timeLimit: 180 },
  { phase: 5, name: '왕좌 점령', desc: '왕좌 점령 → 새 성주 등극!', objective: 'capture_throne', timeLimit: 60 },
];

// 공격자 전용 아이템 (공성전 시작 시 구매)
const SIEGE_ATTACK_ITEMS = [
  { id: 'battering_ram', name: '파성추', cost: 1000, effect: '성문 HP 30% 즉시 데미지', icon: '🪵', uses: 1 },
  { id: 'siege_ladder', name: '공성 사다리', cost: 500, effect: '성벽 우회 → 직접 성벽 위 진입', icon: '🪜', uses: 2 },
  { id: 'smoke_bomb', name: '연막탄', cost: 300, effect: '5초간 함정 무효화 + 은신', icon: '💨', uses: 3 },
  { id: 'healing_drum', name: '전투 북', cost: 800, effect: '아군 전원 HP 20% 회복 + ATK+10% (15초)', icon: '🥁', uses: 1 },
  { id: 'trebuchet', name: '투석기 (공격자)', cost: 2000, effect: '원거리에서 성벽 구조물 타격', icon: '🪨', uses: 2 },
  { id: 'spy_bird', name: '정찰 매', cost: 400, effect: '30초간 성 내부 배치 정보 공개', icon: '🦅', uses: 1 },
];

function deployAttackerMerc(player, mercId, role, x, y) {
  const mercs = player.mercenaries || [];
  const merc = mercs.find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };

  const deployed = player.siegeAttackDeploys || [];
  if (deployed.length >= MAX_ATTACKER_DEPLOYS) return { ok: false, reason: `최대 ${MAX_ATTACKER_DEPLOYS}명 투입 가능` };

  const now = Date.now();
  if (player.lastDeployTime && now - player.lastDeployTime < DEPLOY_COOLDOWN * 1000) {
    const remain = Math.ceil((DEPLOY_COOLDOWN * 1000 - (now - player.lastDeployTime)) / 1000);
    return { ok: false, reason: `투입 쿨다운 ${remain}초` };
  }

  const roleData = DEPLOY_ROLES[role] || DEPLOY_ROLES.vanguard;
  const unit = {
    mercId: merc.id,
    name: merc.name,
    role,
    roleData,
    hp: Math.floor((merc.hp || 500) * roleData.defMul),
    atk: Math.floor((merc.atk || 50) * roleData.atkMul),
    x, y,
    deployTime: now,
  };

  deployed.push(unit);
  player.siegeAttackDeploys = deployed;
  player.lastDeployTime = now;

  return { ok: true, unit };
}

function setAttackTactic(player, tacticId) {
  const tactic = ATTACK_TACTICS[tacticId];
  if (!tactic) return { ok: false, reason: '알 수 없는 전술' };
  player.siegeAttackTactic = { id: tacticId, ...tactic };
  return { ok: true, tactic };
}

function useSiegeItem(player, itemId) {
  const item = SIEGE_ATTACK_ITEMS.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: '알 수 없는 아이템' };
  const inv = player.siegeAttackItems || {};
  if (!inv[itemId] || inv[itemId] <= 0) return { ok: false, reason: '아이템 없음' };
  inv[itemId]--;
  player.siegeAttackItems = inv;
  return { ok: true, item };
}

function register(io, socket, player) {
  socket.on('siege_atk_deploy', (data) => {
    const result = deployAttackerMerc(player, data.mercId, data.role, data.x, data.y);
    socket.emit('siege_atk_deploy_result', result);
    if (result.ok) {
      io.to(data.siegeRoom || 'siege').emit('siege_atk_unit_spawned', { playerId: player.id, unit: result.unit });
    }
  });

  socket.on('siege_atk_tactic', (data) => {
    const result = setAttackTactic(player, data.tacticId);
    socket.emit('siege_atk_tactic_result', result);
  });

  socket.on('siege_atk_use_item', (data) => {
    const result = useSiegeItem(player, data.itemId);
    socket.emit('siege_atk_use_item_result', result);
    if (result.ok) {
      io.to(data.siegeRoom || 'siege').emit('siege_atk_item_used', { playerId: player.id, item: result.item });
    }
  });

  socket.on('siege_atk_info', () => {
    socket.emit('siege_atk_info', {
      roles: DEPLOY_ROLES,
      tactics: ATTACK_TACTICS,
      phases: SIEGE_PHASES,
      items: SIEGE_ATTACK_ITEMS,
      deployed: player.siegeAttackDeploys || [],
      currentTactic: player.siegeAttackTactic || null,
    });
  });
}

module.exports = {
  MAX_ATTACKER_DEPLOYS, DEPLOY_ROLES, ATTACK_TACTICS, SIEGE_PHASES, SIEGE_ATTACK_ITEMS,
  deployAttackerMerc, setAttackTactic, useSiegeItem, register,
};
