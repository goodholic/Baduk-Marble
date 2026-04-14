// v5.1 — 용병 합체 소환 시스템
// 2~3명의 용병을 합체 → 초강력 합체 유닛으로 변신 (제한 시간)

const FUSION_DURATION = 45; // 초
const FUSION_COOLDOWN = 300; // 5분

// 2인 합체 레시피
const DUAL_FUSIONS = [
  {
    id: 'flame_dragon_knight', name: '화염용기사', icon: '🐲🔥',
    mercs: ['fire_mage', 'dragon_knight'], grade: 'legend',
    stats: { hp: 8000, atk: 600, def: 300, spd: 5 },
    skill: { name: '드래곤 인페르노', desc: '직선 범위 화염 브레스, HP 50% 데미지', aoe: 8 },
    lore: '화염 마법사와 용기사의 영혼이 합쳐져 탄생한 화염의 화신',
  },
  {
    id: 'shadow_reaper', name: '그림자 사신', icon: '💀🗡️',
    mercs: ['assassin', 'death_knight'], grade: 'legend',
    stats: { hp: 5000, atk: 800, def: 150, spd: 8 },
    skill: { name: '데스 블레이드', desc: '순간이동 후 범위 내 전원 즉사 판정(HP 10% 이하)', aoe: 5 },
    lore: '어둠의 암살자와 죽음의 기사가 만든 절대 공포',
  },
  {
    id: 'holy_seraph', name: '신성 세라핌', icon: '👼✨',
    mercs: ['holy_knight', 'seraph'], grade: 'legend',
    stats: { hp: 7000, atk: 400, def: 500, spd: 4 },
    skill: { name: '천상의 심판', desc: '맵 전체 정화 + 아군 전체 HP 40% 회복 + 적 디버프', aoe: 99 },
    lore: '빛의 기사와 천사가 합일한 신성한 존재',
  },
  {
    id: 'storm_emperor', name: '뇌전 황제', icon: '⚡👑',
    mercs: ['storm_lord', 'emperor'], grade: 'myth',
    stats: { hp: 10000, atk: 700, def: 400, spd: 6 },
    skill: { name: '천지뇌명', desc: '하늘에서 번개 20발 낙하, 각 HP 10% + 마비 2초', aoe: 10 },
    lore: '폭풍의 군주와 패왕의 힘이 결합한 절대 지배자',
  },
  {
    id: 'nature_beast', name: '자연의 거수', icon: '🌳🐻',
    mercs: ['nature_god', 'beast_tamer'], grade: 'legend',
    stats: { hp: 12000, atk: 350, def: 600, spd: 3 },
    skill: { name: '가이아의 분노', desc: '지면 융기 + 덩굴 속박 5초 + 지속 자연 데미지', aoe: 7 },
    lore: '대자연의 신과 야수의 왕이 하나가 된 대지의 수호신',
  },
  {
    id: 'blood_berserker', name: '피의 광전사', icon: '🩸👹',
    mercs: ['blood_queen', 'berserker_gene'], grade: 'legend',
    stats: { hp: 6000, atk: 900, def: 100, spd: 7 },
    skill: { name: '블러드 카니발', desc: '주변 적 전원 공격 + 데미지의 50% 흡혈', aoe: 6 },
    lore: '피의 여왕과 광전사의 본능이 폭주한 학살의 화신',
  },
];

// 3인 합체 레시피 (궁극)
const TRIPLE_FUSIONS = [
  {
    id: 'god_of_war', name: '전쟁의 신', icon: '⚔️🔥👑',
    mercs: ['blade_master', 'fire_mage', 'emperor'], grade: 'myth',
    stats: { hp: 15000, atk: 1000, def: 500, spd: 7 },
    skill: { name: '아마겟돈', desc: '맵 전체 화염폭풍 + 전원 HP 30% 데미지 + 기절 5초', aoe: 99 },
    duration: 60,
    lore: '검, 마법, 왕권이 합쳐진 전쟁 그 자체의 신',
  },
  {
    id: 'angel_of_death', name: '죽음의 천사', icon: '👼💀⚡',
    mercs: ['seraph', 'death_knight', 'storm_lord'], grade: 'myth',
    stats: { hp: 12000, atk: 850, def: 400, spd: 9 },
    skill: { name: '라스트 저지먼트', desc: '5초 후 맵 전체 심판: HP 50% 이하 적 전원 즉사', aoe: 99 },
    duration: 50,
    lore: '천사, 죽음, 폭풍이 합쳐진 최후의 심판자',
  },
  {
    id: 'primordial_titan', name: '태초의 타이탄', icon: '🌍🔥❄️',
    mercs: ['nature_god', 'bahamut', 'frost_queen'], grade: 'myth',
    stats: { hp: 20000, atk: 750, def: 700, spd: 4 },
    skill: { name: '창세의 일격', desc: '대지+화염+빙결 3원소 융합 공격, 맵 지형 변경', aoe: 99 },
    duration: 45,
    lore: '세 원소의 정점이 합쳐진 태초의 존재',
  },
];

function findFusionRecipe(mercIds) {
  const sorted = [...mercIds].sort();
  for (const f of DUAL_FUSIONS) {
    const req = [...f.mercs].sort();
    if (sorted.length === 2 && sorted[0] === req[0] && sorted[1] === req[1]) return f;
  }
  for (const f of TRIPLE_FUSIONS) {
    const req = [...f.mercs].sort();
    if (sorted.length === 3 && sorted.every((id, i) => id === req[i])) return f;
  }
  return null;
}

function executeFusion(player, mercIds) {
  const recipe = findFusionRecipe(mercIds);
  if (!recipe) return { ok: false, reason: '유효한 합체 조합 없음' };

  const now = Date.now();
  if (player.lastFusionTime && now - player.lastFusionTime < FUSION_COOLDOWN * 1000) {
    const remain = Math.ceil((FUSION_COOLDOWN * 1000 - (now - player.lastFusionTime)) / 1000);
    return { ok: false, reason: `합체 쿨다운 ${remain}초` };
  }

  // 용병 검증
  const mercs = player.mercenaries || [];
  const found = mercIds.map(id => mercs.find(m => m.baseId === id || m.id === id));
  if (found.some(m => !m)) return { ok: false, reason: '필요한 용병이 없음' };

  // 합체 실행
  player.lastFusionTime = now;
  player.activeFusion = {
    ...recipe,
    duration: recipe.duration || FUSION_DURATION,
    startTime: now,
    sourceMercs: found.map(m => m.id),
  };

  return { ok: true, fusion: player.activeFusion };
}

function register(io, socket, player) {
  socket.on('merc_fusion_check', (data) => {
    const recipe = findFusionRecipe(data.mercIds || []);
    socket.emit('merc_fusion_check', { recipe });
  });

  socket.on('merc_fusion_execute', (data) => {
    const result = executeFusion(player, data.mercIds || []);
    socket.emit('merc_fusion_result', result);
    if (result.ok) {
      io.emit('server_msg', `⚡ [합체 소환] ${player.name}의 용병들이 합체! "${result.fusion.name}" 등장!`);
    }
  });

  socket.on('merc_fusion_recipes', () => {
    socket.emit('merc_fusion_recipes', {
      dual: DUAL_FUSIONS.map(f => ({ id: f.id, name: f.name, icon: f.icon, mercs: f.mercs, grade: f.grade, lore: f.lore })),
      triple: TRIPLE_FUSIONS.map(f => ({ id: f.id, name: f.name, icon: f.icon, mercs: f.mercs, grade: f.grade, lore: f.lore })),
    });
  });
}

module.exports = {
  FUSION_DURATION, FUSION_COOLDOWN, DUAL_FUSIONS, TRIPLE_FUSIONS,
  findFusionRecipe, executeFusion, register,
};
