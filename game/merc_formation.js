// ==========================================
// 진형 시스템 + 전투 콤보 자동 발동 — v4.2
// 전열(탱커 피해 흡수) / 후열(딜러/힐러 보호) / 유격(적 후열 기습) / 지원(버프 강화)
// ==========================================

const { COMBO_SKILLS, TRINITY_SKILLS, checkComboSkills } = require('./v4_systems');

// ═══ 포지션 정의 ═══
const POSITIONS = {
  front:   { name: '전열', icon: '\u{1F6E1}\uFE0F', defMod: 1.2, atkMod: 0.9, tauntChance: 0.4, desc: '적 공격을 40% 확률로 대신 맞음' },
  back:    { name: '후열', icon: '\u{1F3F9}', defMod: 0.8, atkMod: 1.15, protectedBy: 'front', desc: '전열이 살아있으면 피격 -60%' },
  flank:   { name: '유격', icon: '\u{1F5E1}\uFE0F', defMod: 0.7, atkMod: 1.3, targetBack: true, desc: '적 후열 우선 공격, 피해 +30%' },
  support: { name: '지원', icon: '\u{1F4AB}', defMod: 0.9, atkMod: 1.0, healMod: 1.3, desc: '치유/버프 효과 +30%' },
};

// ═══ 진형 프리셋 ═══
const FORMATIONS = {
  balanced:   { name: '균형 진형', icon: '\u2696\uFE0F', positions: ['front','front','back','back','flank','support'], desc: '기본 균형 배치', bonus: { atk: 0.05, def: 0.05, hp: 0.05 } },
  aggressive: { name: '돌격 진형', icon: '\u2694\uFE0F', positions: ['front','flank','flank','back','back','back'], desc: '공격 집중', bonus: { atk: 0.10 } },
  defensive:  { name: '철벽 진형', icon: '\u{1F3F0}', positions: ['front','front','front','support','back','back'], desc: '전열 3명 수비', bonus: { def: 0.12, hp: 0.08 } },
  assassin:   { name: '암살 진형', icon: '\u{1F319}', positions: ['front','flank','flank','flank','back','support'], desc: '유격 집중 기습', bonus: { atk: 0.08, spd: 0.10 } },
  healing:    { name: '지구전 진형', icon: '\u{1F49A}', positions: ['front','front','support','support','back','back'], desc: '지원 2명 장기전', bonus: { hp: 0.10, healMod: 0.15 } },
};

// ═══ 진형 초기화 ═══
function _initFormation(player) {
  if (!player._formation) {
    player._formation = {
      presetId: 'balanced',
      assignments: {},  // mercUid -> position
    };
  }
  return player._formation;
}

// ═══ 진형 프리셋 설정 ═══
function setFormation(player, formationId) {
  if (!FORMATIONS[formationId]) {
    return { success: false, msg: `존재하지 않는 진형입니다: ${formationId}` };
  }
  const fm = _initFormation(player);
  fm.presetId = formationId;

  // 파티 멤버에게 자동 배치
  const mercs = player._mercs;
  if (mercs && mercs.party && mercs.party.length > 0) {
    const preset = FORMATIONS[formationId];
    fm.assignments = {};
    mercs.party.forEach((merc, idx) => {
      if (merc && merc.uid) {
        fm.assignments[merc.uid] = preset.positions[idx] || 'back';
      }
    });
  }

  const info = FORMATIONS[formationId];
  return { success: true, msg: `${info.icon} ${info.name} 설정 완료! — ${info.desc}`, formation: fm };
}

// ═══ 개별 용병 포지션 수동 설정 ═══
function setCustomPosition(player, mercUid, position) {
  if (!POSITIONS[position]) {
    return { success: false, msg: `존재하지 않는 포지션입니다: ${position}` };
  }
  const mercs = player._mercs;
  if (!mercs) return { success: false, msg: '용병 시스템을 먼저 활성화하세요.' };

  const merc = mercs.roster.find(m => m.uid === mercUid);
  if (!merc) return { success: false, msg: '해당 용병을 찾을 수 없습니다.' };

  const inParty = (mercs.party || []).find(m => m && m.uid === mercUid);
  if (!inParty) return { success: false, msg: '파티에 편성된 용병만 포지션을 설정할 수 있습니다.' };

  const fm = _initFormation(player);
  fm.assignments[mercUid] = position;

  const pos = POSITIONS[position];
  return { success: true, msg: `${pos.icon} ${merc.name}을(를) ${pos.name}(으)로 배치했습니다. — ${pos.desc}` };
}

// ═══ 현재 진형 조회 ═══
function getFormation(player) {
  const fm = _initFormation(player);
  const preset = FORMATIONS[fm.presetId] || FORMATIONS.balanced;
  const mercs = player._mercs;

  const members = [];
  if (mercs && mercs.party) {
    mercs.party.forEach(merc => {
      if (!merc) return;
      const pos = fm.assignments[merc.uid] || 'back';
      const posInfo = POSITIONS[pos];
      members.push({
        uid: merc.uid,
        name: merc.name,
        icon: merc.icon,
        position: pos,
        positionName: posInfo.name,
        positionIcon: posInfo.icon,
      });
    });
  }

  return {
    presetId: fm.presetId,
    presetName: preset.name,
    presetIcon: preset.icon,
    bonus: preset.bonus,
    members,
    availableFormations: Object.entries(FORMATIONS).map(([id, f]) => ({
      id, name: f.name, icon: f.icon, desc: f.desc, positions: f.positions,
    })),
  };
}

// ═══ 전투 유닛에 포지션 보정치 적용 ═══
function applyFormationToUnit(unit, position, frontAlive) {
  const pos = POSITIONS[position] || POSITIONS.back;

  // 기본 보정
  unit.atk = Math.floor((unit.atk || 0) * pos.atkMod);
  unit.def = Math.floor((unit.def || 0) * pos.defMod);

  // 전열: 도발 확률
  if (position === 'front') {
    unit._tauntChance = pos.tauntChance;
  }

  // 후열: 전열 생존 시 피격률 감소
  if (position === 'back' && frontAlive) {
    unit._hitReduction = 0.6; // 60% 감소
  }

  // 유격: 적 후열 우선 타겟
  if (position === 'flank') {
    unit._targetBack = true;
  }

  // 지원: 힐/버프 효과 증가
  if (position === 'support') {
    unit._healMod = pos.healMod;
  }

  unit._position = position;
  unit._positionName = pos.name;
  return unit;
}

// ═══ 진형 프리셋 팀 보너스 조회 ═══
function getFormationBonuses(formationId) {
  const formation = FORMATIONS[formationId];
  if (!formation) return null;
  return {
    name: formation.name,
    icon: formation.icon,
    bonus: formation.bonus,
    desc: formation.desc,
  };
}

// ═══════════════════════════════════════════
//  전투 콤보 자동 발동
// ═══════════════════════════════════════════

const COMBO_TRIGGER_CHANCE = 0.20; // 매 턴 20% 발동 확률

function checkCombatCombos(party) {
  if (!party || !Array.isArray(party) || party.length < 2) return null;

  // 살아있는 용병만 체크
  const alive = party.filter(m => m && (m.hp || 0) > 0);
  if (alive.length < 2) return null;

  const available = checkComboSkills(alive);
  if (available.length === 0) return null;

  // 각 콤보마다 20% 확률 체크
  const triggered = [];
  for (const combo of available) {
    if (Math.random() < COMBO_TRIGGER_CHANCE) {
      const result = {
        comboName: combo.name,
        comboIcon: combo.icon,
        comboType: combo.type,
        damage: combo.dmg || 0,
        aoe: combo.aoe || false,
        healAll: combo.healAll || 0,
        targets: combo.aoe ? 'all' : 'single',
        description: `${combo.icon} [${combo.name}] 자동 발동! — ${combo.desc}`,
      };
      triggered.push(result);
      break; // 턴당 콤보 1회만 발동
    }
  }

  return triggered.length > 0 ? triggered[0] : null;
}

// ═══ 소켓 핸들러 등록 ═══
function registerFormationHandlers(io, socket, player, players) {
  const playerId = player.id || player.playerId;

  // 진형 조회
  socket.on('merc_formation', () => {
    const p = players[playerId];
    if (!p) return;
    if (!p._mercs) {
      socket.emit('merc_formation_result', { success: false, msg: '용병 시스템을 먼저 활성화하세요.' });
      return;
    }
    const formation = getFormation(p);
    socket.emit('merc_formation_result', { success: true, formation });
  });

  // 진형 프리셋 설정
  socket.on('merc_set_formation', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!p._mercs) {
      socket.emit('merc_formation_result', { success: false, msg: '용병 시스템을 먼저 활성화하세요.' });
      return;
    }
    const result = setFormation(p, data?.formationId);
    if (result.success) {
      result.formation = getFormation(p);
    }
    socket.emit('merc_formation_result', result);
  });

  // 개별 용병 포지션 설정
  socket.on('merc_set_position', (data) => {
    const p = players[playerId];
    if (!p) return;
    if (!p._mercs) {
      socket.emit('merc_formation_result', { success: false, msg: '용병 시스템을 먼저 활성화하세요.' });
      return;
    }
    const result = setCustomPosition(p, data?.mercUid, data?.position);
    if (result.success) {
      result.formation = getFormation(p);
    }
    socket.emit('merc_formation_result', result);
  });
}

// ═══ 모듈 내보내기 ═══
module.exports = {
  POSITIONS,
  FORMATIONS,
  setFormation,
  setCustomPosition,
  getFormation,
  applyFormationToUnit,
  getFormationBonuses,
  checkCombatCombos,
  registerFormationHandlers,
};
