// v5.4 — 용병 탤런트 트리 (디아블로 스타일 스킬 트리)
// 레벨업마다 포인트 → 3갈래 트리에 투자, 리셋 가능

const POINTS_PER_LEVEL = 1;
const MAX_TIER = 5;

const TALENT_TREES = {
  warrior: {
    offense: {
      name: '파괴', icon: '💥',
      tiers: [
        { id: 'w_atk1', name: '힘의 연마', effect: 'ATK+3%/포인트', max: 5, cost: 1 },
        { id: 'w_crit1', name: '약점 간파', effect: 'CRIT+2%/포인트', max: 5, cost: 1, req: 'w_atk1:3' },
        { id: 'w_cleave', name: '회전 베기', effect: '공격 시 30% 확률 범위공격', max: 3, cost: 2, req: 'w_crit1:3' },
        { id: 'w_execute', name: '처형', effect: 'HP 20% 이하 적에게 DMG×2', max: 1, cost: 3, req: 'w_cleave:2' },
        { id: 'w_wargod', name: '전쟁신의 분노', effect: '궁극기 DMG+50%, 쿨-30%', max: 1, cost: 5, req: 'w_execute:1', ultimate: true },
      ],
    },
    defense: {
      name: '불굴', icon: '🛡️',
      tiers: [
        { id: 'w_def1', name: '강철 피부', effect: 'DEF+3%/포인트', max: 5, cost: 1 },
        { id: 'w_hp1', name: '생명력', effect: 'HP+4%/포인트', max: 5, cost: 1, req: 'w_def1:3' },
        { id: 'w_block', name: '방패 막기', effect: '20% 확률 DMG 완전 차단', max: 3, cost: 2, req: 'w_hp1:3' },
        { id: 'w_regen', name: '전투 재생', effect: '매 5초 HP 2% 회복', max: 1, cost: 3, req: 'w_block:2' },
        { id: 'w_immortal', name: '불멸의 의지', effect: '치명타 1회 생존(HP 1)', max: 1, cost: 5, req: 'w_regen:1', ultimate: true },
      ],
    },
    utility: {
      name: '전술', icon: '⚡',
      tiers: [
        { id: 'w_spd1', name: '민첩', effect: 'SPD+2%/포인트', max: 5, cost: 1 },
        { id: 'w_exp1', name: '전투 경험', effect: 'EXP+5%/포인트', max: 5, cost: 1, req: 'w_spd1:3' },
        { id: 'w_aura', name: '지휘 오라', effect: '인접 아군 ATK+5%', max: 3, cost: 2, req: 'w_exp1:3' },
        { id: 'w_inspire', name: '영감 부여', effect: '아군 감정을 "영감"으로 전환', max: 1, cost: 3, req: 'w_aura:2' },
        { id: 'w_legend', name: '전설이 되다', effect: '팀 전체 스탯+8%', max: 1, cost: 5, req: 'w_inspire:1', ultimate: true },
      ],
    },
  },
  mage: {
    destruction: {
      name: '파멸', icon: '🔥',
      tiers: [
        { id: 'm_matk1', name: '마력 증폭', effect: 'MATK+3%/포인트', max: 5, cost: 1 },
        { id: 'm_elem1', name: '원소 친화', effect: '원소 DMG+4%/포인트', max: 5, cost: 1, req: 'm_matk1:3' },
        { id: 'm_chain', name: '연쇄 마법', effect: '마법 히트 시 30% 확률 연쇄', max: 3, cost: 2, req: 'm_elem1:3' },
        { id: 'm_penetrate', name: '마력 관통', effect: '마법 방어 40% 무시', max: 1, cost: 3, req: 'm_chain:2' },
        { id: 'm_apocalypse', name: '아포칼립스', effect: '전체 마법 DMG+60%', max: 1, cost: 5, req: 'm_penetrate:1', ultimate: true },
      ],
    },
    protection: {
      name: '수호', icon: '✨',
      tiers: [
        { id: 'm_mdef1', name: '마법 방벽', effect: '마법 DEF+4%/포인트', max: 5, cost: 1 },
        { id: 'm_mp1', name: 'MP 확장', effect: 'MP+5%/포인트', max: 5, cost: 1, req: 'm_mdef1:3' },
        { id: 'm_absorb', name: '마력 흡수', effect: '피격 마법의 20% MP 전환', max: 3, cost: 2, req: 'm_mp1:3' },
        { id: 'm_reflect', name: '마법 반사', effect: '15% 확률 마법 반사', max: 1, cost: 3, req: 'm_absorb:2' },
        { id: 'm_invuln', name: '마력 무적', effect: '5초간 완전 무적 (3분 쿨)', max: 1, cost: 5, req: 'm_reflect:1', ultimate: true },
      ],
    },
    arcane: {
      name: '신비', icon: '🔮',
      tiers: [
        { id: 'm_cast1', name: '빠른 영창', effect: '캐스팅 SPD+3%/포인트', max: 5, cost: 1 },
        { id: 'm_cd1', name: '쿨다운 감소', effect: '쿨다운-2%/포인트', max: 5, cost: 1, req: 'm_cast1:3' },
        { id: 'm_dual', name: '이중 시전', effect: '30% 확률 마법 2회 발동', max: 3, cost: 2, req: 'm_cd1:3' },
        { id: 'm_meta', name: '메타 마법', effect: '최근 스킬 쿨다운 즉시 리셋 (60초 쿨)', max: 1, cost: 3, req: 'm_dual:2' },
        { id: 'm_transcend', name: '초월 마법', effect: '모든 마법 범위+50%, 위력+30%', max: 1, cost: 5, req: 'm_meta:1', ultimate: true },
      ],
    },
  },
};

// 나머지 클래스 (assassin, healer, ranger)도 동일 구조, 간략화
['assassin', 'healer', 'ranger'].forEach(cls => {
  TALENT_TREES[cls] = {
    branch_a: { name: cls === 'assassin' ? '암살' : cls === 'healer' ? '치유' : '사격', icon: cls === 'assassin' ? '🗡️' : cls === 'healer' ? '💚' : '🎯',
      tiers: [
        { id: `${cls}_a1`, name: '핵심 강화 I', effect: '주 스탯+3%/포인트', max: 5, cost: 1 },
        { id: `${cls}_a2`, name: '핵심 강화 II', effect: '보조 스탯+2%/포인트', max: 5, cost: 1, req: `${cls}_a1:3` },
        { id: `${cls}_a3`, name: '특화 능력', effect: '클래스 고유 효과 30%', max: 3, cost: 2, req: `${cls}_a2:3` },
        { id: `${cls}_a4`, name: '상위 능력', effect: '클래스 고유 효과 강화', max: 1, cost: 3, req: `${cls}_a3:2` },
        { id: `${cls}_a5`, name: '궁극 능력', effect: '궁극 효과', max: 1, cost: 5, req: `${cls}_a4:1`, ultimate: true },
      ],
    },
    branch_b: { name: '생존', icon: '🛡️',
      tiers: [
        { id: `${cls}_b1`, name: '체력 강화', effect: 'HP+3%/포인트', max: 5, cost: 1 },
        { id: `${cls}_b2`, name: '방어 강화', effect: 'DEF+2%/포인트', max: 5, cost: 1, req: `${cls}_b1:3` },
        { id: `${cls}_b3`, name: '회피/재생', effect: '회피+15% 또는 재생', max: 3, cost: 2, req: `${cls}_b2:3` },
        { id: `${cls}_b4`, name: '위기 능력', effect: 'HP 30%↓ 시 특수 효과', max: 1, cost: 3, req: `${cls}_b3:2` },
        { id: `${cls}_b5`, name: '궁극 방어', effect: '궁극 방어 효과', max: 1, cost: 5, req: `${cls}_b4:1`, ultimate: true },
      ],
    },
    branch_c: { name: '지원', icon: '⚡',
      tiers: [
        { id: `${cls}_c1`, name: 'SPD 강화', effect: 'SPD+2%/포인트', max: 5, cost: 1 },
        { id: `${cls}_c2`, name: 'EXP 보너스', effect: 'EXP+5%/포인트', max: 5, cost: 1, req: `${cls}_c1:3` },
        { id: `${cls}_c3`, name: '팀 지원', effect: '팀 효과 부여', max: 3, cost: 2, req: `${cls}_c2:3` },
        { id: `${cls}_c4`, name: '상위 지원', effect: '강화된 팀 효과', max: 1, cost: 3, req: `${cls}_c3:2` },
        { id: `${cls}_c5`, name: '궁극 지원', effect: '궁극 팀 효과', max: 1, cost: 5, req: `${cls}_c4:1`, ultimate: true },
      ],
    },
  };
});

const RESET_COST = 10000;

function allocatePoint(merc, talentId) {
  const tree = TALENT_TREES[merc.class];
  if (!tree) return { ok: false, reason: '트리 없음' };
  const points = merc.talentPoints || 0;
  if (points <= 0) return { ok: false, reason: '포인트 없음' };
  const allocated = merc.talents || {};
  for (const branch of Object.values(tree)) {
    const talent = branch.tiers.find(t => t.id === talentId);
    if (talent) {
      const current = allocated[talentId] || 0;
      if (current >= talent.max) return { ok: false, reason: '최대 레벨' };
      if (points < talent.cost) return { ok: false, reason: `포인트 부족 (${talent.cost}필요)` };
      allocated[talentId] = current + 1;
      merc.talents = allocated;
      merc.talentPoints = points - talent.cost;
      return { ok: true, talent: talent.name, level: current + 1, remaining: merc.talentPoints };
    }
  }
  return { ok: false, reason: '탤런트 없음' };
}

function resetTalents(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  if ((player.gold || 0) < RESET_COST) return { ok: false, reason: '골드 부족' };
  player.gold -= RESET_COST;
  const spent = Object.values(merc.talents || {}).reduce((s, v) => s + v, 0);
  merc.talents = {};
  merc.talentPoints = (merc.talentPoints || 0) + spent;
  return { ok: true, refunded: spent, totalPoints: merc.talentPoints };
}

function register(io, socket, player) {
  socket.on('talent_tree', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('talent_tree', { ok: false });
    socket.emit('talent_tree', { tree: TALENT_TREES[merc.class], allocated: merc.talents || {}, points: merc.talentPoints || 0 });
  });
  socket.on('talent_allocate', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('talent_allocate_result', { ok: false });
    socket.emit('talent_allocate_result', allocatePoint(merc, data.talentId));
  });
  socket.on('talent_reset', (data) => {
    socket.emit('talent_reset_result', resetTalents(player, data.mercId));
  });
}

module.exports = { TALENT_TREES, RESET_COST, allocatePoint, resetTalents, register };
