// v5.0 — IO 전투에서 용병 소환 시스템
// SLG에서 키운 용병을 IO 단판에서 일시 소환하여 함께 전투

const SUMMON_COOLDOWN = 90;  // 초
const SUMMON_DURATION = 20;  // 초
const MAX_SUMMONS_PER_MATCH = 3;

// 소환 슬롯: 매치 전에 SLG에서 용병 3명 선택 → IO에 장착
const SUMMON_SLOTS = 3;

// 소환 용병 AI 행동 패턴
const SUMMON_AI = {
  aggressive: { atkMul: 1.2, defMul: 0.8, range: 200, label: '공격형', desc: '적을 적극 추격' },
  defensive:  { atkMul: 0.9, defMul: 1.3, range: 100, label: '방어형', desc: '플레이어 주변 방어' },
  support:    { atkMul: 0.7, defMul: 1.0, range: 150, label: '지원형', desc: '버프/힐 우선' },
  assassin:   { atkMul: 1.5, defMul: 0.6, range: 300, label: '암살형', desc: '약한 적 우선 처치' },
};

// 소환 시 IO 전장에 미치는 효과
const SUMMON_EFFECTS = {
  warrior:  { aura: 'teamDef+10%', onSummon: '주변 적 2초 경직', icon: '⚔️' },
  mage:     { aura: 'teamMatk+15%', onSummon: '범위 마법 폭발', icon: '🔮' },
  assassin: { aura: 'teamCrit+10%', onSummon: '은신 3초', icon: '🗡️' },
  healer:   { aura: 'teamHeal 3%/sec', onSummon: '즉시 전체 20% 회복', icon: '💚' },
  tank:     { aura: 'teamDef+20%', onSummon: '도발(5초)', icon: '🛡️' },
  ranger:   { aura: 'teamSpd+10%', onSummon: '화살비 (범위 데미지)', icon: '🏹' },
};

// 용병 등급에 따른 소환 강도
const GRADE_SCALE = {
  normal: { statScale: 0.3, durationBonus: 0 },
  elite:  { statScale: 0.5, durationBonus: 3 },
  rare:   { statScale: 0.7, durationBonus: 5 },
  boss:   { statScale: 0.9, durationBonus: 8 },
  legend: { statScale: 1.2, durationBonus: 12 },
  myth:   { statScale: 1.5, durationBonus: 15 },
};

// IO 전리품 → SLG 성장 자원 변환 테이블
const IO_LOOT_TO_SLG = {
  gold:         { slgResource: 'merc_exp', ratio: 0.1, desc: '골드→용병 EXP' },
  boss_crystal: { slgResource: 'awaken_stone', ratio: 1, desc: '보스 결정→각성석' },
  rare_drop:    { slgResource: 'trait_scroll', ratio: 1, desc: '레어 드롭→특성 두루마리' },
  pvp_medal:    { slgResource: 'arena_token', ratio: 2, desc: 'PvP 메달→아레나 토큰' },
  wave_clear:   { slgResource: 'training_point', ratio: 5, desc: '웨이브 클리어→훈련 포인트' },
  combo_kill:   { slgResource: 'synergy_gem', ratio: 1, desc: '콤보 킬→시너지 보석' },
};

// IO↔SLG 연동 보너스: IO 성적이 SLG에 반영
const IO_PERFORMANCE_BONUS = {
  top1:  { mercExpMul: 2.0, lootMul: 1.5, trait: '챔피언의 기운(전체+5%, 1시간)' },
  top3:  { mercExpMul: 1.5, lootMul: 1.3, trait: '투사의 기운(공격+8%, 1시간)' },
  top5:  { mercExpMul: 1.3, lootMul: 1.2, trait: null },
  top10: { mercExpMul: 1.1, lootMul: 1.1, trait: null },
};

function createSummon(merc, player) {
  const grade = GRADE_SCALE[merc.grade || 'normal'] || GRADE_SCALE.normal;
  const classType = merc.class || 'warrior';
  const effect = SUMMON_EFFECTS[classType] || SUMMON_EFFECTS.warrior;
  const ai = SUMMON_AI[merc.summonAI || 'aggressive'];

  return {
    mercId: merc.id,
    name: merc.name,
    ownerId: player.id,
    hp: Math.floor((merc.hp || 500) * grade.statScale),
    atk: Math.floor((merc.atk || 50) * grade.statScale * ai.atkMul),
    def: Math.floor((merc.def || 30) * grade.statScale * ai.defMul),
    spd: merc.spd || 3,
    duration: SUMMON_DURATION + grade.durationBonus,
    effect,
    ai: merc.summonAI || 'aggressive',
    aiRange: ai.range,
    x: player.x || 0,
    y: player.y || 0,
    spawnTime: Date.now(),
    icon: effect.icon,
    generation: merc.generation || 1,
    emotion: merc.emotion || 'calm',
  };
}

function convertIOLoot(lootType, amount) {
  const conv = IO_LOOT_TO_SLG[lootType];
  if (!conv) return null;
  return { resource: conv.slgResource, amount: Math.floor(amount * conv.ratio), desc: conv.desc };
}

function getPerformanceBonus(rank, totalPlayers) {
  if (rank === 1) return IO_PERFORMANCE_BONUS.top1;
  if (rank <= 3) return IO_PERFORMANCE_BONUS.top3;
  if (rank <= 5) return IO_PERFORMANCE_BONUS.top5;
  if (rank <= 10) return IO_PERFORMANCE_BONUS.top10;
  return { mercExpMul: 1.0, lootMul: 1.0, trait: null };
}

function register(io, socket, player) {
  // 소환 슬롯 설정 (매치 전)
  socket.on('io_set_summon_slots', (data) => {
    const { mercIds } = data;
    if (!Array.isArray(mercIds) || mercIds.length > SUMMON_SLOTS) {
      return socket.emit('io_set_summon_slots_result', { ok: false, reason: `최대 ${SUMMON_SLOTS}명` });
    }
    player.ioSummonSlots = mercIds;
    player.ioSummonCount = 0;
    socket.emit('io_set_summon_slots_result', { ok: true, slots: mercIds });
  });

  // IO 전투 중 용병 소환
  socket.on('io_summon_merc', (data) => {
    const { slotIdx } = data;
    const slots = player.ioSummonSlots || [];
    if (slotIdx < 0 || slotIdx >= slots.length) return socket.emit('io_summon_result', { ok: false, reason: '잘못된 슬롯' });
    if ((player.ioSummonCount || 0) >= MAX_SUMMONS_PER_MATCH) return socket.emit('io_summon_result', { ok: false, reason: '소환 횟수 초과' });

    const lastSummon = player.lastSummonTime || 0;
    if (Date.now() - lastSummon < SUMMON_COOLDOWN * 1000) {
      const remaining = Math.ceil((SUMMON_COOLDOWN * 1000 - (Date.now() - lastSummon)) / 1000);
      return socket.emit('io_summon_result', { ok: false, reason: `쿨다운 ${remaining}초` });
    }

    const mercId = slots[slotIdx];
    const merc = (player.mercenaries || []).find(m => m.id === mercId);
    if (!merc) return socket.emit('io_summon_result', { ok: false, reason: '용병 없음' });

    const summon = createSummon(merc, player);
    player.ioSummonCount = (player.ioSummonCount || 0) + 1;
    player.lastSummonTime = Date.now();
    player.activeSummon = summon;

    socket.emit('io_summon_result', { ok: true, summon });
    io.emit('io_summon_spawn', { playerId: player.id, summon });
  });

  // IO 매치 종료 시 전리품 → SLG 변환
  socket.on('io_match_end_convert', (data) => {
    const { rank, totalPlayers, loot } = data;
    const bonus = getPerformanceBonus(rank, totalPlayers);
    const converted = [];
    for (const [type, amount] of Object.entries(loot || {})) {
      const result = convertIOLoot(type, Math.floor(amount * bonus.lootMul));
      if (result) converted.push(result);
    }
    // 용병 EXP 보너스 적용
    if (bonus.mercExpMul > 1) {
      (player.mercenaries || []).forEach(m => {
        m.exp = (m.exp || 0) + Math.floor(50 * bonus.mercExpMul);
      });
    }
    socket.emit('io_match_convert_result', { bonus, converted, trait: bonus.trait });
  });
}

module.exports = {
  SUMMON_COOLDOWN, SUMMON_DURATION, MAX_SUMMONS_PER_MATCH, SUMMON_SLOTS,
  SUMMON_AI, SUMMON_EFFECTS, GRADE_SCALE, IO_LOOT_TO_SLG, IO_PERFORMANCE_BONUS,
  createSummon, convertIOLoot, getPerformanceBonus, register,
};
