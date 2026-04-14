// v6.9 — 멀티버스 시스템
// 평행 세계의 자신과 교류, 다른 서버의 용병 차원간 교환

const MULTIVERSE_PORTALS = [
  { id: 'mirror', name: '거울 세계', icon: '🪞🌀', desc: '모든 것이 반대인 세계 (선↔악, 강↔약)', effect: 'stat_invert' },
  { id: 'steampunk', name: '스팀펑크 세계', icon: '⚙️🌀', desc: '기계 문명 세계, 메카+과학', effect: 'tech_boost' },
  { id: 'prehistoric', name: '선사시대', icon: '🦕🌀', desc: '공룡과 원시인의 세계', effect: 'primal_boost' },
  { id: 'cyberpunk', name: '사이버 세계', icon: '🤖🌀', desc: '미래 네온 도시, 해킹+사이보그', effect: 'cyber_boost' },
  { id: 'heaven', name: '천국', icon: '👼🌀', desc: '신성한 세계, 빛의 힘', effect: 'holy_boost' },
  { id: 'hell', name: '지옥', icon: '😈🌀', desc: '마계, 어둠의 힘', effect: 'dark_boost' },
  { id: 'void_realm', name: '공허계', icon: '🌀🌀', desc: '아무것도 없는 세계, 존재의 끝', effect: 'void_boost', extreme: true },
  { id: 'origin_realm', name: '기원계', icon: '🌟🌀', desc: '모든 세계의 시작, 최종 차원', effect: 'all_boost', mythic: true },
];

// 차원간 교환 (다른 "서버"의 용병과 교환)
const CROSS_DIM_TRADE = {
  cost: 50000,
  cooldown: 86400, // 1일
  rules: '같은 등급 용병끼리만 교환, 교환 후 되돌릴 수 없음',
  bonus: '차원 교환 용병은 "차원 낙인" 획득 (전체+3%)',
};

// 평행 자아 (다른 세계의 자신)
const PARALLEL_SELVES = [
  { id: 'hero_self', name: '영웅의 나', icon: '🦸🪞', bonus: { atk: 1.1 }, condition: '선한 카르마 100+', desc: '선한 세계의 영웅' },
  { id: 'villain_self', name: '악당의 나', icon: '🦹🪞', bonus: { darkDmg: 1.2 }, condition: '악한 카르마 -100', desc: '악한 세계의 악당' },
  { id: 'sage_self', name: '현자의 나', icon: '🧙🪞', bonus: { matk: 1.1, exp: 1.15 }, condition: '연구 전부 완료', desc: '지식의 세계의 현자' },
  { id: 'king_self', name: '왕의 나', icon: '👑🪞', bonus: { goldProd: 1.2, diplomacy: 1.1 }, condition: '영토 7+', desc: '왕국의 세계의 왕' },
  { id: 'god_self', name: '신의 나', icon: '🌟🪞', bonus: { allStat: 1.1 }, condition: '프레스티지 10+', desc: '초월한 세계의 신', ultimate: true },
];

// 차원 안정도 (너무 많이 교류하면 불안정)
const STABILITY = {
  maxPerWeek: 5,
  instabilityEffect: '차원 불안정 → 랜덤 스탯 ±10%, 랜덤 이벤트',
  collapseRisk: 0.01, // 불안정 상태에서 1% 확률 차원 붕괴!
  collapseEffect: '차원 붕괴! 24시간 멀티버스 접근 불가+랜덤 용병 1명 행방불명',
};

// 차원 토너먼트 (다른 "세계" 플레이어와 대결)
const DIMENSION_TOURNAMENT = {
  format: '8인 토너먼트',
  specialRule: '각 세계의 법칙 랜덤 적용',
  reward: { gold: 100000, title: '차원 챔피언', item: 'dimension_crown' },
};

function enterMultiverse(player, portalId) {
  const portal = MULTIVERSE_PORTALS.find(p => p.id === portalId);
  if (!portal) return { ok: false, reason: '알 수 없는 차원' };
  if ((player.gold || 0) < 10000) return { ok: false, reason: '골드 부족 (10000G)' };
  player.gold -= 10000;
  player.multiverseVisits = (player.multiverseVisits || 0) + 1;
  return { ok: true, portal };
}

function register(io, socket, player) {
  socket.on('multiverse_info', () => {
    socket.emit('multiverse_info', { portals: MULTIVERSE_PORTALS, trade: CROSS_DIM_TRADE, selves: PARALLEL_SELVES, stability: STABILITY, tournament: DIMENSION_TOURNAMENT, visits: player.multiverseVisits || 0 });
  });
  socket.on('multiverse_enter', (data) => {
    const result = enterMultiverse(player, data.portalId);
    socket.emit('multiverse_result', result);
    if (result.ok) io.emit('server_msg', `🌀 [멀티버스] ${player.name}이(가) "${result.portal.name}" 차원으로!`);
  });
}

module.exports = { MULTIVERSE_PORTALS, CROSS_DIM_TRADE, PARALLEL_SELVES, STABILITY, DIMENSION_TOURNAMENT, enterMultiverse, register };
