// 소환 가챠 시스템 — v2.60
// 마법 소환석으로 랜덤 동료/장비/펫 소환
// 확률 기반 등급 + 천장 시스템 + 소환 연출 + 픽업 배너 + 우정 소환 + 이력 추적

const GRADE_ORDER = ['normal', 'uncommon', 'rare', 'epic', 'legendary'];

const SUMMON_POOLS = {
  hero: {
    name: '영웅 소환', icon: '⭐', cost: { diamonds: 30 }, costx10: { diamonds: 270 },
    desc: '전설의 영웅을 소환합니다!',
    pool: [
      { id: 'hero_blade_master',  name: '검성 아레스',     icon: '⚔️', grade: 'legendary', weight: 2,  stats: { atk: 40, critRate: 15 }, desc: '검의 달인. 크리티컬 특화.' },
      { id: 'hero_ice_queen',     name: '빙결 여왕 프리시아', icon: '❄️', grade: 'epic',     weight: 5,  stats: { atk: 25, def: 15 }, desc: '얼음 마법의 지배자.' },
      { id: 'hero_shadow_thief',  name: '그림자 도적 렉스', icon: '🌑', grade: 'epic',     weight: 5,  stats: { atk: 30, dodge: 10 }, desc: '어둠에서 나타나는 도적.' },
      { id: 'hero_holy_knight',   name: '성기사 라이엘',   icon: '✨', grade: 'epic',     weight: 5,  stats: { def: 30, hpRegen: 8 }, desc: '신성한 빛의 수호자.' },
      { id: 'hero_fire_mage',     name: '화염 마도사 이그니',icon: '🔥', grade: 'rare',     weight: 15, stats: { atk: 18 }, desc: '불꽃을 다루는 마법사.' },
      { id: 'hero_healer',        name: '치유사 미라',     icon: '💚', grade: 'rare',     weight: 15, stats: { hpRegen: 12 }, desc: '아군을 치유하는 사제.' },
      { id: 'hero_archer',        name: '명사수 엘라',     icon: '🏹', grade: 'rare',     weight: 15, stats: { atk: 15, critRate: 8 }, desc: '백발백중 궁수.' },
      { id: 'hero_tank',          name: '방패병 볼드',     icon: '🛡️', grade: 'uncommon',  weight: 20, stats: { def: 12, hp: 50 }, desc: '든든한 방패.' },
      { id: 'hero_soldier',       name: '용병 그렉',       icon: '🗡️', grade: 'normal',    weight: 18, stats: { atk: 8 }, desc: '평범한 용병.' },
    ],
    pityCount: 50,
  },
  equipment: {
    name: '장비 소환', icon: '🎁', cost: { diamonds: 20 }, costx10: { diamonds: 180 },
    desc: '강력한 장비를 소환합니다!',
    pool: [
      { id: 'equip_divine_sword',  name: '신성검 엑스칼리버', icon: '⚔️', grade: 'legendary', weight: 2,  stats: { atk: 60 }, desc: '전설의 성검.' },
      { id: 'equip_dragon_armor',  name: '용린 갑옷',       icon: '🐲', grade: 'legendary', weight: 2,  stats: { def: 50, hp: 300 }, desc: '용의 비늘로 만든 갑옷.' },
      { id: 'equip_shadow_cloak',  name: '그림자 망토',     icon: '🌑', grade: 'epic',     weight: 6,  stats: { dodge: 15, speed: 3 }, desc: '투명화 능력.' },
      { id: 'equip_flame_ring',    name: '화염 반지',       icon: '💍', grade: 'epic',     weight: 6,  stats: { atk: 20, fireDmg: 10 }, desc: '불의 힘.' },
      { id: 'equip_ice_staff',     name: '빙결 지팡이',     icon: '🧊', grade: 'rare',     weight: 15, stats: { atk: 15, iceDmg: 8 }, desc: '얼음 마법 강화.' },
      { id: 'equip_steel_shield',  name: '강철 방패',       icon: '🛡️', grade: 'rare',     weight: 15, stats: { def: 18 }, desc: '튼튼한 방패.' },
      { id: 'equip_leather_boots', name: '가죽 장화',       icon: '👢', grade: 'uncommon',  weight: 22, stats: { speed: 2, dodge: 3 }, desc: '가벼운 장화.' },
      { id: 'equip_iron_helm',     name: '철 투구',         icon: '⛑️', grade: 'normal',    weight: 32, stats: { def: 5 }, desc: '기본 투구.' },
    ],
    pityCount: 40,
  },
  premium: {
    name: '프리미엄 용병 소환', icon: '👑', cost: { diamonds: 50 }, costx10: { diamonds: 450 },
    desc: '이달의 픽업 전설 용병! 확률 UP!',
    pool: [
      { id: 'prem_dragon_knight', name: '용기사 드라코', icon: '🐲⚔️', grade: 'legendary', weight: 5, stats: { atk: 55, def: 30, hp: 500 }, desc: '용의 피를 이은 기사. IO에서 드래곤 소환 가능!', skill: '드래곤 브레스' },
      { id: 'prem_shadow_empress', name: '암흑 여제 릴리스', icon: '🌑👑', grade: 'legendary', weight: 5, stats: { atk: 60, critRate: 25 }, desc: '그림자를 지배하는 여제. 암살 특화.', skill: '그림자 지배' },
      { id: 'prem_celestial', name: '천상의 미카엘', icon: '👼✨', grade: 'legendary', weight: 3, stats: { atk: 45, def: 40, hpRegen: 20 }, desc: '천사장. 팀 전원 부활 가능!', skill: '신성 부활' },
      { id: 'prem_berserker', name: '광전사 그롬', icon: '💢⚔️', grade: 'epic', weight: 8, stats: { atk: 50, critRate: 20 }, desc: 'HP 낮을수록 강해지는 광전사.', skill: '광폭화' },
      { id: 'prem_necromancer', name: '네크로맨서 모르가나', icon: '💀🔮', grade: 'epic', weight: 8, stats: { atk: 35, def: 20 }, desc: '죽은 적을 소환하여 싸우게 한다.', skill: '언데드 소환' },
      { id: 'prem_paladin', name: '성기사 아서', icon: '🛡️✨', grade: 'epic', weight: 10, stats: { def: 40, hp: 400 }, desc: '불멸의 방패. 팀 방어 특화.', skill: '성스러운 방벽' },
      { id: 'prem_ranger', name: '순찰자 엘라스', icon: '🏹🌿', grade: 'rare', weight: 18, stats: { atk: 25, dodge: 12 }, desc: '숲의 사냥꾼. 원거리 특화.', skill: '다중 사격' },
      { id: 'prem_warrior', name: '전사 볼드릭', icon: '⚔️🛡️', grade: 'uncommon', weight: 22, stats: { atk: 15, def: 15 }, desc: '균형 잡힌 전사.', skill: '방패 돌진' },
      { id: 'prem_squire', name: '종자 토비', icon: '🗡️', grade: 'normal', weight: 21, stats: { atk: 10 }, desc: '아직 수련 중인 종자.', skill: '기본 공격' },
    ],
    pityCount: 80,
    rateUpId: 'prem_dragon_knight',
    rateUpBonus: 2.0,
  },
  friendship: {
    name: '우정 소환', icon: '💝', cost: { friendPoints: 200 }, costx10: { friendPoints: 1800 },
    desc: '우정 포인트로 무료 소환!',
    pool: [
      { id: 'friend_shield', name: '우정의 방패', icon: '🛡️💝', grade: 'rare', weight: 5, stats: { def: 20 }, desc: '친구가 준 방패.' },
      { id: 'friend_sword', name: '우정의 검', icon: '⚔️💝', grade: 'rare', weight: 5, stats: { atk: 20 }, desc: '친구가 준 검.' },
      { id: 'friend_potion', name: '치유 포션', icon: '🧪💚', grade: 'uncommon', weight: 15, stats: { hp: 100 }, desc: 'HP 회복.' },
      { id: 'friend_scroll', name: '강화 주문서', icon: '📜✨', grade: 'uncommon', weight: 15, stats: { atk: 8, def: 8 }, desc: '장비 강화용.' },
      { id: 'friend_gem', name: '마력석', icon: '💎', grade: 'normal', weight: 25, stats: { atk: 5 }, desc: '기본 재료.' },
      { id: 'friend_herb', name: '약초', icon: '🌿', grade: 'normal', weight: 35, stats: { hp: 30 }, desc: '기본 재료.' },
    ],
    pityCount: 30,
  },
};

// 가챠 상태 (플레이어별)
function getSummonState(player) {
  if (!player._summonState) player._summonState = {};
  return player._summonState;
}

// 소환 이력 추적
function _ensureHistory(player) {
  if (!player._summonHistory) {
    player._summonHistory = {};
  }
  return player._summonHistory;
}

function _recordSummon(player, poolId, item) {
  const history = _ensureHistory(player);
  if (!history[poolId]) {
    history[poolId] = { totalSummons: 0, bestPull: null, recentResults: [] };
  }
  const h = history[poolId];
  h.totalSummons++;

  // 최근 10건 유지
  h.recentResults.push({ id: item.id, name: item.name, icon: item.icon, grade: item.grade, timestamp: Date.now() });
  if (h.recentResults.length > 10) h.recentResults.shift();

  // 최고 등급 갱신
  const itemRank = GRADE_ORDER.indexOf(item.grade);
  const bestRank = h.bestPull ? GRADE_ORDER.indexOf(h.bestPull.grade) : -1;
  if (itemRank > bestRank) {
    h.bestPull = { id: item.id, name: item.name, icon: item.icon, grade: item.grade };
  }
}

function getSummonHistory(player) {
  const history = _ensureHistory(player);
  const state = getSummonState(player);
  const result = {};

  for (const poolId of Object.keys(SUMMON_POOLS)) {
    const h = history[poolId] || { totalSummons: 0, bestPull: null, recentResults: [] };
    const s = state[poolId] || { pity: 0 };
    result[poolId] = {
      poolName: SUMMON_POOLS[poolId].name,
      totalSummons: h.totalSummons,
      bestPull: h.bestPull,
      currentPity: s.pity,
      pityMax: SUMMON_POOLS[poolId].pityCount,
      recentResults: h.recentResults,
    };
  }
  return result;
}

// 배너 정보 조회
function getBannerInfo() {
  return Object.entries(SUMMON_POOLS).map(([id, p]) => {
    const totalWeight = p.pool.reduce((s, item) => s + item.weight, 0);
    const rates = {};
    for (const grade of GRADE_ORDER) {
      const gradeWeight = p.pool.filter(i => i.grade === grade).reduce((s, i) => s + i.weight, 0);
      rates[grade] = Math.round((gradeWeight / totalWeight) * 10000) / 100; // % 소수점 2자리
    }

    const info = {
      id,
      name: p.name,
      icon: p.icon,
      desc: p.desc,
      cost: p.cost,
      costx10: p.costx10,
      pityCount: p.pityCount,
      rates,
      pool: p.pool.map(item => ({ id: item.id, name: item.name, icon: item.icon, grade: item.grade, skill: item.skill })),
    };

    if (p.rateUpId) {
      const featured = p.pool.find(i => i.id === p.rateUpId);
      info.rateUp = {
        id: p.rateUpId,
        name: featured ? featured.name : p.rateUpId,
        icon: featured ? featured.icon : '',
        desc: '전설 등급 획득 시 50% 확률로 픽업 대상 등장!',
      };
    }

    return info;
  });
}

function doSummon(player, poolId, count) {
  const pool = SUMMON_POOLS[poolId];
  if (!pool) return { success: false, msg: '존재하지 않는 소환 풀' };

  count = count === 10 ? 10 : 1;
  const cost = count === 10 ? pool.costx10 : pool.cost;

  // 비용 체크
  if (cost.diamonds && (player.diamonds || 0) < cost.diamonds) return { success: false, msg: '다이아 부족 (필요: ' + cost.diamonds + '💎)' };
  if (cost.gold && (player.gold || 0) < cost.gold) return { success: false, msg: '골드 부족' };
  if (cost.friendPoints && (player.friendPoints || 0) < cost.friendPoints) return { success: false, msg: '우정 포인트 부족 (필요: ' + cost.friendPoints + '💝)' };

  // 비용 차감
  if (cost.diamonds) player.diamonds -= cost.diamonds;
  if (cost.gold) player.gold -= cost.gold;
  if (cost.friendPoints) player.friendPoints -= cost.friendPoints;

  // 천장 카운터
  const state = getSummonState(player);
  if (!state[poolId]) state[poolId] = { pity: 0 };

  const results = [];
  const totalWeight = pool.pool.reduce((s, item) => s + item.weight, 0);

  for (let i = 0; i < count; i++) {
    state[poolId].pity++;
    let selected;

    // 천장 도달 시 전설 확정
    if (state[poolId].pity >= pool.pityCount) {
      selected = _pickLegendary(pool);
      state[poolId].pity = 0;
    } else {
      // 가중치 랜덤
      let roll = Math.random() * totalWeight;
      for (const item of pool.pool) {
        roll -= item.weight;
        if (roll <= 0) { selected = item; break; }
      }
      if (!selected) selected = pool.pool[pool.pool.length - 1];
      if (selected.grade === 'legendary') state[poolId].pity = 0;
    }

    // 프리미엄 픽업: 전설 뜰 때 50% 확률로 픽업 대상
    if (selected.grade === 'legendary' && pool.rateUpId) {
      if (selected.id !== pool.rateUpId && Math.random() < 0.5) {
        const rateUpItem = pool.pool.find(item => item.id === pool.rateUpId);
        if (rateUpItem) selected = rateUpItem;
      }
    }

    results.push({ ...selected });

    // 이력 기록
    _recordSummon(player, poolId, selected);

    // 인벤토리에 추가
    if (!player.inventory) player.inventory = {};
    player.inventory[selected.id] = (player.inventory[selected.id] || 0) + 1;

    // 영웅이면 소환수로도 등록
    if ((poolId === 'hero' || poolId === 'premium') && !player._summonedHeroes) player._summonedHeroes = {};
    if (poolId === 'hero' || poolId === 'premium') {
      if (!player._summonedHeroes[selected.id]) {
        player._summonedHeroes[selected.id] = { ...selected, level: 1, exp: 0 };
      }
    }
  }

  // 10연차 에픽 이상 보장: 에픽+ 없으면 마지막 슬롯을 에픽으로 교체
  if (count === 10 && !results.some(r => GRADE_ORDER.indexOf(r.grade) >= GRADE_ORDER.indexOf('epic'))) {
    const epics = pool.pool.filter(item => item.grade === 'epic');
    if (epics.length > 0) {
      const guaranteed = epics[Math.floor(Math.random() * epics.length)];
      const lastIdx = results.length - 1;
      const oldItem = results[lastIdx];

      // 인벤토리 보정: 이전 아이템 -1, 새 아이템 +1
      player.inventory[oldItem.id] = (player.inventory[oldItem.id] || 1) - 1;
      if (player.inventory[oldItem.id] <= 0) delete player.inventory[oldItem.id];
      player.inventory[guaranteed.id] = (player.inventory[guaranteed.id] || 0) + 1;

      results[lastIdx] = { ...guaranteed };
      _recordSummon(player, poolId, guaranteed);
    }
  }

  return {
    success: true,
    results,
    pity: state[poolId].pity,
    pityMax: pool.pityCount,
    hasLegendary: results.some(r => r.grade === 'legendary'),
    hasEpic: results.some(r => r.grade === 'epic'),
  };
}

// 전설 뽑기 (픽업 고려)
function _pickLegendary(pool) {
  const legendaries = pool.pool.filter(item => item.grade === 'legendary');
  if (legendaries.length === 0) return pool.pool[0]; // fallback

  // 픽업 배너인 경우 50% 확률로 픽업 대상
  if (pool.rateUpId && Math.random() < 0.5) {
    const rateUp = legendaries.find(item => item.id === pool.rateUpId);
    if (rateUp) return rateUp;
  }

  // 가중치 기반 랜덤
  const totalWeight = legendaries.reduce((s, item) => s + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of legendaries) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return legendaries[legendaries.length - 1];
}

function registerGachaHandlers(socket, playerId, players, io) {
  socket.on('gacha_pool_list', () => {
    const list = Object.entries(SUMMON_POOLS).map(([id, p]) => ({
      id, name: p.name, icon: p.icon, desc: p.desc,
      cost: p.cost, costx10: p.costx10,
      pool: p.pool.map(item => ({ name: item.name, icon: item.icon, grade: item.grade })),
      rateUpId: p.rateUpId || null,
    }));
    socket.emit('gacha_pool_list', { pools: list });
  });

  socket.on('gacha_summon', (data) => {
    const p = players[playerId];
    if (!p) return;
    const result = doSummon(p, data.poolId, data.count || 1);
    socket.emit('gacha_result', result);
    if (result.success && result.hasLegendary) {
      const legendary = result.results.find(r => r.grade === 'legendary');
      io.emit('server_msg', { msg: '⭐ ' + (p.displayName||p.className) + '님이 전설 소환! ' + legendary.icon + ' ' + legendary.name, type: 'boss' });
    }
  });

  socket.on('gacha_history', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('gacha_history', getSummonHistory(p));
  });

  socket.on('gacha_banner_info', () => {
    socket.emit('gacha_banner_info', { banners: getBannerInfo() });
  });
}

module.exports = { SUMMON_POOLS, doSummon, registerGachaHandlers, getSummonHistory, getBannerInfo };
