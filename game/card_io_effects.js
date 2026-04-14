// ============================================
// IO 전투 중 카드 효과 발동 시스템
// 카드게임에서 세팅한 카드가 IO 전투에 영향
// ============================================

// IO 중 발동 가능한 카드 효과
const IO_CARD_EFFECTS = [
  // 전투 버프 (IO 시작 시 자동 적용)
  { trigger: 'match_start', name: '전사의 기운', req: { partyType: 'warrior', count: 2 }, effect: { atk: 1.15 }, icon: '⚔️', desc: '전사 카드 2장 이상 → ATK+15%' },
  { trigger: 'match_start', name: '마법사의 지혜', req: { partyType: 'mage', count: 2 }, effect: { matk: 1.2 }, icon: '🔮', desc: '마법사 카드 2장 이상 → 마공+20%' },
  { trigger: 'match_start', name: '수호의 결의', req: { partyGrade: 'epic', count: 3 }, effect: { def: 1.2 }, icon: '🛡️', desc: '에픽+ 카드 3장 이상 → DEF+20%' },

  // 상황 발동 (전투 중)
  { trigger: 'on_kill', name: '전리품 사냥', req: { hasSkill: 'sk_lifesteal' }, effect: { goldPerKill: 50 }, icon: '💰', desc: '흡혈 스킬 보유 → 킬당 골드+50' },
  { trigger: 'on_low_hp', name: '불사조의 깃털', req: { hasEquip: 'eq_phoenix_feather' }, effect: { revive: true }, icon: '🔥🪶', desc: '불사조 깃털 장착 → HP 20% 이하 시 1회 부활' },
  { trigger: 'on_kill', name: '연쇄 처형', req: { hasSkill: 'sk_backstab' }, effect: { critNext: true }, icon: '💥', desc: '급소공격 스킬 → 킬 후 다음 공격 크리 확정' },

  // 소환 (IO 중 용병 카드 소환)
  { trigger: 'summon', name: '용병 소환', req: { partySize: 3 }, effect: { summonMerc: true, duration: 30 }, icon: '📜⚔️', desc: '파티 3장+ → 30초간 용병 1명 소환 (쿨 3분)' },
  { trigger: 'summon', name: '전설 소환', req: { partyGrade: 'legend', count: 1 }, effect: { summonLegend: true, duration: 20 }, icon: '🌟⚔️', desc: '전설 카드 보유 → 20초간 전설 용병 소환 (쿨 5분)' },

  // 환경 효과
  { trigger: 'passive', name: '골드 자석', req: { hasBuilding: 'fb_mine', level: 3 }, effect: { goldPickupRange: 2.0 }, icon: '🧲💰', desc: '금광 Lv.3+ → 골드 수집 범위 2배' },
  { trigger: 'passive', name: '경험의 서', req: { hasBuilding: 'fb_lab', level: 2 }, effect: { expMul: 1.15 }, icon: '📚', desc: '연구소 Lv.2+ → IO 경험치 +15%' },
];

// IO 시작 시 플레이어 카드 효과 계산
function calcIOCardEffects(player) {
  const effects = [];
  const partyIds = player.ioParty || [];
  const partyCards = (player.cards || []).filter(c => partyIds.includes(c.id));
  const fort = player.fortress || { buildings: {} };

  for (const eff of IO_CARD_EFFECTS) {
    let active = false;

    if (eff.req.partySize && partyCards.length >= eff.req.partySize) active = true;
    if (eff.req.partyType) {
      const count = partyCards.filter(c => (c.name || '').includes(eff.req.partyType === 'warrior' ? '전사' : '마법사')).length;
      if (count >= eff.req.count) active = true;
    }
    if (eff.req.partyGrade) {
      const gradeOrder = ['normal', 'rare', 'epic', 'legend', 'myth'];
      const minIdx = gradeOrder.indexOf(eff.req.partyGrade);
      const count = partyCards.filter(c => gradeOrder.indexOf(c.grade) >= minIdx).length;
      if (count >= (eff.req.count || 1)) active = true;
    }
    if (eff.req.hasSkill) {
      if (partyCards.some(c => (c.skills || []).some(s => s.id === eff.req.hasSkill))) active = true;
    }
    if (eff.req.hasEquip) {
      if (partyCards.some(c => Object.values(c.equipment || {}).some(e => e.id === eff.req.hasEquip))) active = true;
    }
    if (eff.req.hasBuilding) {
      const bLv = fort.buildings[eff.req.hasBuilding] || 0;
      if (bLv >= (eff.req.level || 1)) active = true;
    }

    if (active) effects.push(eff);
  }

  return effects;
}

// IO 킬 시 효과 체크
function onIOKill(player, effects) {
  const results = [];
  for (const eff of effects) {
    if (eff.trigger === 'on_kill') {
      if (eff.effect.goldPerKill) {
        player.gold = (player.gold || 0) + eff.effect.goldPerKill;
        results.push({ name: eff.name, msg: `+${eff.effect.goldPerKill}G` });
      }
      if (eff.effect.critNext) {
        player._nextCrit = true;
        results.push({ name: eff.name, msg: '다음 공격 크리 확정!' });
      }
    }
  }
  return results;
}

function register(io, socket, player) {
  // IO 시작 시 카드 효과 계산
  socket.on('io_calc_effects', () => {
    const effects = calcIOCardEffects(player);
    player._ioEffects = effects;
    socket.emit('io_card_effects', { effects });
  });

  // IO 킬 시 효과 체크
  socket.on('io_kill_check', () => {
    const results = onIOKill(player, player._ioEffects || []);
    if (results.length > 0) socket.emit('io_kill_effects', { results });
  });

  // IO 중 용병 소환 요청
  socket.on('io_summon_from_card', () => {
    const effects = player._ioEffects || [];
    const summonEff = effects.find(e => e.trigger === 'summon');
    if (!summonEff) return socket.emit('io_summon_card_result', { ok: false, reason: '소환 효과 없음' });
    const now = Date.now();
    if (player._lastCardSummon && now - player._lastCardSummon < 180000) {
      return socket.emit('io_summon_card_result', { ok: false, reason: '쿨다운 중' });
    }
    player._lastCardSummon = now;
    socket.emit('io_summon_card_result', { ok: true, duration: summonEff.effect.duration || 30, msg: `${summonEff.name} 발동! ${summonEff.effect.duration}초!` });
  });
}

module.exports = { IO_CARD_EFFECTS, calcIOCardEffects, onIOKill, register };
