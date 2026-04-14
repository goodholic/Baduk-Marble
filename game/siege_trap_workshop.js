// v5.5 — 함정 공방 시스템
// 커스텀 함정 설계, 재료 합성, 고유 함정 제작

const MAX_CUSTOM_TRAPS = 10;

// 함정 베이스 (기본 골격 선택)
const TRAP_BASES = [
  { id: 'floor', name: '바닥형', icon: '⬛', slot: 'ground', desc: '밟으면 발동' },
  { id: 'wall', name: '벽면형', icon: '🧱', slot: 'wall', desc: '접근 시 발동' },
  { id: 'ceiling', name: '천장형', icon: '⬆️', slot: 'ceiling', desc: '통과 시 낙하' },
  { id: 'tripwire', name: '줄 함정', icon: '〰️', slot: 'ground', desc: '보이지 않는 트리거' },
  { id: 'totem', name: '토템형', icon: '🗿', slot: 'placed', desc: '범위 지속 효과' },
];

// 함정 효과 모듈 (조합)
const EFFECT_MODULES = [
  { id: 'fire_dmg', name: '화염', icon: '🔥', dmg: 80, type: 'damage', element: 'fire' },
  { id: 'ice_slow', name: '빙결', icon: '❄️', slow: 0.5, duration: 3, type: 'cc', element: 'ice' },
  { id: 'poison_dot', name: '독', icon: '☠️', dot: 20, dotDur: 5, type: 'dot', element: 'poison' },
  { id: 'lightning', name: '번개', icon: '⚡', dmg: 120, stun: 1.5, type: 'damage', element: 'thunder' },
  { id: 'knockback', name: '넉백', icon: '💨', push: 3, type: 'cc' },
  { id: 'teleport', name: '전송', icon: '🌀', type: 'special', desc: '랜덤 위치로 전송' },
  { id: 'blind', name: '실명', icon: '🌑', duration: 3, type: 'cc', desc: '3초간 시야 차단' },
  { id: 'drain', name: '흡수', icon: '🩸', steal: 0.2, type: 'special', desc: '데미지의 20%를 성주 HP로' },
  { id: 'explosion', name: '폭발', icon: '💥', dmg: 200, area: 5, type: 'damage', desc: '범위 폭발' },
  { id: 'gravity', name: '중력', icon: '🌑', pull: true, area: 4, type: 'cc', desc: '범위 끌어당김' },
];

// 함정 강화 부품
const ENHANCEMENT_PARTS = [
  { id: 'range_up', name: '범위 확장', icon: '📡', effect: 'area+50%', cost: 2000 },
  { id: 'stealth', name: '은폐 장치', icon: '👻', effect: '투명 (탐지 전까지 안 보임)', cost: 3000 },
  { id: 'multi_trigger', name: '다중 발동', icon: '🔄', effect: '3회 연속 발동', cost: 5000 },
  { id: 'chain_react', name: '연쇄 반응', icon: '⛓️💥', effect: '인접 함정도 동시 발동', cost: 8000 },
  { id: 'adaptive', name: '적응형', icon: '🧬', effect: '같은 적에게 2회차부터 DMG+30%', cost: 6000 },
  { id: 'timer', name: '시한 장치', icon: '⏰', effect: '설치 후 일정 시간 뒤 자동 발동', cost: 1500 },
];

// 함정 합성 레시피 (특수 조합)
const TRAP_RECIPES = [
  { name: '지옥문', base: 'floor', effects: ['fire_dmg', 'explosion'], enhance: 'chain_react', result: { dmg: 400, area: 8 }, grade: 'legend', icon: '🔥💥🚪' },
  { name: '절대영도 장판', base: 'floor', effects: ['ice_slow', 'gravity'], enhance: 'range_up', result: { slow: 0.8, pull: true, area: 6 }, grade: 'epic', icon: '❄️🌀' },
  { name: '그림자 암살 함정', base: 'tripwire', effects: ['lightning', 'blind'], enhance: 'stealth', result: { dmg: 150, stun: 2, blind: 3 }, grade: 'epic', icon: '👻⚡' },
  { name: '생명 착취기', base: 'totem', effects: ['drain', 'poison_dot'], enhance: 'adaptive', result: { dot: 30, steal: 0.3 }, grade: 'legend', icon: '🩸🗿' },
  { name: '차원 미궁', base: 'ceiling', effects: ['teleport', 'gravity'], enhance: 'multi_trigger', result: { teleport: true, confuse: 5 }, grade: 'myth', icon: '🌀🌀🌀' },
];

function designTrap(player, baseId, effectIds, enhanceId) {
  const base = TRAP_BASES.find(b => b.id === baseId);
  if (!base) return { ok: false, reason: '알 수 없는 베이스' };
  const effects = effectIds.map(id => EFFECT_MODULES.find(e => e.id === id)).filter(Boolean);
  if (effects.length < 1 || effects.length > 3) return { ok: false, reason: '효과 1~3개 선택' };
  const enhance = enhanceId ? ENHANCEMENT_PARTS.find(p => p.id === enhanceId) : null;

  const totalCost = 5000 + effects.length * 2000 + (enhance?.cost || 0);
  if ((player.gold || 0) < totalCost) return { ok: false, reason: `골드 부족 (${totalCost}G 필요)` };
  player.gold -= totalCost;

  // 레시피 매칭 체크
  const recipe = TRAP_RECIPES.find(r =>
    r.base === baseId &&
    r.effects.every(e => effectIds.includes(e)) &&
    (!r.enhance || r.enhance === enhanceId)
  );

  const trap = {
    id: `ct_${Date.now()}`,
    base, effects, enhance, recipe: recipe || null,
    name: recipe ? recipe.name : `커스텀 ${base.name}`,
    grade: recipe?.grade || 'rare',
    icon: recipe?.icon || base.icon,
    custom: true, createdAt: Date.now(),
  };

  const traps = player.customTraps = player.customTraps || [];
  traps.push(trap);
  return { ok: true, trap, isRecipe: !!recipe };
}

function register(io, socket, player) {
  socket.on('trap_workshop', () => {
    socket.emit('trap_workshop', { bases: TRAP_BASES, effects: EFFECT_MODULES, enhances: ENHANCEMENT_PARTS, recipes: TRAP_RECIPES, custom: player.customTraps || [] });
  });
  socket.on('trap_design', (data) => {
    const result = designTrap(player, data.baseId, data.effectIds || [], data.enhanceId);
    socket.emit('trap_design_result', result);
    if (result.ok && result.isRecipe) io.emit('server_msg', `🔧 [함정 공방] ${player.name}이(가) 전설 함정 "${result.trap.name}" 제작!`);
  });
}

module.exports = { TRAP_BASES, EFFECT_MODULES, ENHANCEMENT_PARTS, TRAP_RECIPES, designTrap, register };
