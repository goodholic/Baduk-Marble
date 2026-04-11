// 소환 가챠 시스템 — v2.59
// 마법 소환석으로 랜덤 동료/장비/펫 소환
// 확률 기반 등급 + 천장 시스템 + 소환 연출

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
    pityCount: 50, // 50연차 전설 확정
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
};

// 가챠 상태 (플레이어별)
function getSummonState(player) {
  if (!player._summonState) player._summonState = {};
  return player._summonState;
}

function doSummon(player, poolId, count) {
  const pool = SUMMON_POOLS[poolId];
  if (!pool) return { success: false, msg: '존재하지 않는 소환 풀' };

  count = count === 10 ? 10 : 1;
  const cost = count === 10 ? pool.costx10 : pool.cost;

  // 비용 체크
  if (cost.diamonds && (player.diamonds || 0) < cost.diamonds) return { success: false, msg: '다이아 부족 (필요: ' + cost.diamonds + '💎)' };
  if (cost.gold && (player.gold || 0) < cost.gold) return { success: false, msg: '골드 부족' };

  // 비용 차감
  if (cost.diamonds) player.diamonds -= cost.diamonds;
  if (cost.gold) player.gold -= cost.gold;

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
      selected = pool.pool.find(item => item.grade === 'legendary');
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

    results.push({ ...selected });

    // 인벤토리에 추가
    if (!player.inventory) player.inventory = {};
    player.inventory[selected.id] = (player.inventory[selected.id] || 0) + 1;

    // 영웅이면 소환수로도 등록
    if (poolId === 'hero' && !player._summonedHeroes) player._summonedHeroes = {};
    if (poolId === 'hero') {
      if (!player._summonedHeroes[selected.id]) {
        player._summonedHeroes[selected.id] = { ...selected, level: 1, exp: 0 };
      }
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

function registerGachaHandlers(socket, playerId, players, io) {
  socket.on('gacha_pool_list', () => {
    const list = Object.entries(SUMMON_POOLS).map(([id, p]) => ({
      id, name: p.name, icon: p.icon, desc: p.desc,
      cost: p.cost, costx10: p.costx10,
      pool: p.pool.map(item => ({ name: item.name, icon: item.icon, grade: item.grade })),
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
}

module.exports = { SUMMON_POOLS, doSummon, registerGachaHandlers };
