// v5.0 — 용병 라이벌/우정 드라마 시스템
// 특정 용병 조합 시 드라마틱한 이벤트 발생, 친밀도/적대도에 따른 연출

const BOND_TYPES = {
  friendship: { icon: '💛', label: '우정', atkBonus: 1.1, defBonus: 1.1 },
  rivalry:    { icon: '⚔️', label: '라이벌', atkBonus: 1.2, defBonus: 0.95 },
  love:       { icon: '❤️', label: '연인', atkBonus: 1.05, defBonus: 1.15, healBonus: 1.2 },
  hatred:     { icon: '💢', label: '원수', atkBonus: 1.3, defBonus: 0.85 },
  mentor:     { icon: '📖', label: '사제', expBonus: 1.25, skillBonus: 1.1 },
  sworn:      { icon: '🤝', label: '의형제', atkBonus: 1.15, defBonus: 1.15, hpBonus: 1.1 },
};

// 사전 정의된 드라마 관계
const PRESET_RELATIONS = [
  { a: 'merc_blade_master', b: 'merc_dark_knight', type: 'rivalry', story: '한때 같은 스승 아래 수련했으나, 어둠에 빠진 동문' },
  { a: 'merc_fire_mage', b: 'merc_ice_queen', type: 'rivalry', story: '불과 얼음, 영원한 숙명의 대결' },
  { a: 'merc_holy_knight', b: 'merc_death_knight', type: 'hatred', story: '빛과 어둠의 피할 수 없는 전쟁' },
  { a: 'merc_ranger', b: 'merc_beast_tamer', type: 'friendship', story: '숲에서 만난 자연의 수호자들' },
  { a: 'merc_assassin', b: 'merc_thief', type: 'sworn', story: '뒷골목에서 함께 살아남은 형제' },
  { a: 'merc_archmage', b: 'merc_apprentice', type: 'mentor', story: '마법탑 최고의 스승과 제자' },
  { a: 'merc_dragon_knight', b: 'merc_seraph', type: 'love', story: '천상과 지상을 잇는 금지된 사랑' },
  { a: 'merc_emperor', b: 'merc_rebel', type: 'hatred', story: '왕좌를 둘러싼 피의 복수극' },
  { a: 'merc_samurai', b: 'merc_ninja', type: 'rivalry', story: '명예와 암살, 상반된 무사도' },
  { a: 'merc_bahamut', b: 'merc_frost_queen', type: 'rivalry', story: '화염룡과 빙결여왕, 원소의 정점' },
];

// 드라마 이벤트: 관계가 성숙하면 발생
const DRAMA_EVENTS = [
  { type: 'rivalry', threshold: 50, name: '숙명의 결투', desc: '라이벌 용병끼리 모의전투, 승자 ATK+15% 3전투', reward: { winnerAtk: 1.15, dur: 3 } },
  { type: 'rivalry', threshold: 100, name: '인정의 순간', desc: '라이벌이 서로를 인정, 합체기 해금', reward: { unlockCombo: true } },
  { type: 'friendship', threshold: 30, name: '함께하는 훈련', desc: '우정 용병 합동훈련, 둘 다 EXP+20%', reward: { expBonus: 1.2, dur: 5 } },
  { type: 'friendship', threshold: 80, name: '생사의 언약', desc: '의형제로 승격 가능', reward: { upgradeBond: 'sworn' } },
  { type: 'love', threshold: 60, name: '고백의 순간', desc: '연인 전용 합체기 해금 + 힐 시너지', reward: { unlockCombo: true, healBonus: 1.3 } },
  { type: 'hatred', threshold: 70, name: '복수의 칼날', desc: '원수를 쓰러뜨리면 영구 ATK+5%', reward: { permAtk: 1.05 } },
  { type: 'mentor', threshold: 40, name: '비전 전수', desc: '제자가 스승의 스킬 1개 습득', reward: { learnSkill: 1 } },
  { type: 'mentor', threshold: 90, name: '스승을 넘어서', desc: '제자가 스승보다 강해지면 둘 다 각성', reward: { bothAwaken: true } },
  { type: 'sworn', threshold: 50, name: '의형제의 맹세', desc: '위기 시 대신 피격 + 역전 버프', reward: { shieldAlly: true, crisisAtk: 1.3 } },
];

// 동적 친밀도 변화 이벤트
const BOND_TRIGGERS = [
  { event: 'fight_together', delta: 3, desc: '함께 전투' },
  { event: 'save_ally', delta: 10, desc: '동료를 위기에서 구함' },
  { event: 'same_team_win', delta: 2, desc: '같은 팀으로 승리' },
  { event: 'betray', delta: -30, desc: '배신 (다른 팀 이동 등)' },
  { event: 'gift', delta: 8, desc: '선물 교환' },
  { event: 'rivalry_win', delta: 5, desc: '라이벌전 승리 (상대에게도 +3)' },
  { event: 'shared_meal', delta: 4, desc: '함께 식사 (여관)' },
  { event: 'training_together', delta: 5, desc: '합동 훈련' },
];

function getBondBetween(player, mercIdA, mercIdB) {
  const bonds = player.mercBonds || {};
  const key = [mercIdA, mercIdB].sort().join(':');
  return bonds[key] || { type: null, points: 0, events: [] };
}

function updateBond(player, mercIdA, mercIdB, event) {
  const bonds = player.mercBonds = player.mercBonds || {};
  const key = [mercIdA, mercIdB].sort().join(':');
  if (!bonds[key]) {
    // 프리셋 관계 체크
    const preset = PRESET_RELATIONS.find(r =>
      (r.a === mercIdA && r.b === mercIdB) || (r.a === mercIdB && r.b === mercIdA)
    );
    bonds[key] = { type: preset?.type || 'friendship', points: preset ? 10 : 0, events: [] };
  }
  const trigger = BOND_TRIGGERS.find(t => t.event === event);
  if (trigger) {
    bonds[key].points = Math.max(0, Math.min(100, bonds[key].points + trigger.delta));
    bonds[key].events.push({ event, time: Date.now() });
  }
  // 드라마 이벤트 체크
  const triggered = DRAMA_EVENTS.filter(d =>
    d.type === bonds[key].type && bonds[key].points >= d.threshold &&
    !bonds[key].events.find(e => e.event === d.name)
  );
  if (triggered.length > 0) {
    const drama = triggered[0];
    bonds[key].events.push({ event: drama.name, time: Date.now() });
    return { bond: bonds[key], drama };
  }
  return { bond: bonds[key], drama: null };
}

function getTeamBondEffects(player, teamMercIds) {
  const effects = [];
  for (let i = 0; i < teamMercIds.length; i++) {
    for (let j = i + 1; j < teamMercIds.length; j++) {
      const bond = getBondBetween(player, teamMercIds[i], teamMercIds[j]);
      if (bond.type && bond.points >= 20) {
        const bt = BOND_TYPES[bond.type];
        effects.push({ a: teamMercIds[i], b: teamMercIds[j], type: bond.type, ...bt, points: bond.points });
      }
    }
  }
  return effects;
}

function register(io, socket, player) {
  socket.on('merc_bond_list', () => {
    const bonds = player.mercBonds || {};
    const list = Object.entries(bonds).map(([key, b]) => {
      const [a, c] = key.split(':');
      const preset = PRESET_RELATIONS.find(r =>
        (r.a === a && r.b === c) || (r.a === c && r.b === a)
      );
      return { mercA: a, mercB: c, ...b, story: preset?.story || '' };
    });
    socket.emit('merc_bond_list', list);
  });

  socket.on('merc_bond_gift', (data) => {
    const { mercA, mercB, itemId } = data;
    // 선물 아이템 소비 (간략화)
    const inv = player.inventory || [];
    const idx = inv.findIndex(i => i.id === itemId);
    if (idx === -1) return socket.emit('merc_bond_gift_result', { ok: false, reason: '아이템 없음' });
    inv.splice(idx, 1);
    const result = updateBond(player, mercA, mercB, 'gift');
    socket.emit('merc_bond_gift_result', { ok: true, ...result });
    if (result.drama) {
      io.emit('server_msg', `💫 [드라마 이벤트] ${player.name}의 용병들: "${result.drama.name}" 발생!`);
    }
  });
}

module.exports = {
  BOND_TYPES, PRESET_RELATIONS, DRAMA_EVENTS, BOND_TRIGGERS,
  getBondBetween, updateBond, getTeamBondEffects, register,
};
