// v5.3 — 용병 변신 시스템
// 특정 조건에서 용병이 상위 존재로 변신 (타임 리밋 초강화)

const TRANSFORM_DURATION = 30; // 초
const TRANSFORM_COOLDOWN = 600; // 10분

// 변신 폼 목록
const TRANSFORM_FORMS = [
  { id: 'dragon_form', name: '드래곤 폼', icon: '🐲', reqClass: 'warrior', reqLevel: 35, reqEmotion: 'rage',
    stats: { hpMul: 2.0, atkMul: 2.5, defMul: 1.5, spdMul: 1.3 },
    skill: { name: '드래곤 브레스', desc: '전방 직선 화염, HP 60% 데미지', aoe: 10 },
    lore: '분노가 극에 달하면 내면의 용이 각성한다' },
  { id: 'angel_form', name: '천사 폼', icon: '👼', reqClass: 'healer', reqLevel: 35, reqEmotion: 'inspired',
    stats: { hpMul: 1.5, atkMul: 1.3, defMul: 2.0, spdMul: 1.5 },
    skill: { name: '천상의 심판', desc: '아군 전체 HP 100% 회복 + 적 전체 정화', aoe: 99 },
    lore: '영감이 극에 달하면 천사의 날개가 펼쳐진다' },
  { id: 'demon_form', name: '마왕 폼', icon: '😈', reqClass: 'mage', reqLevel: 35, reqEmotion: 'berserk',
    stats: { hpMul: 1.8, atkMul: 3.0, defMul: 0.8, spdMul: 1.2 },
    skill: { name: '지옥의 불', desc: '맵 전체 암흑 화염, HP 40% + 지속 DOT', aoe: 99 },
    lore: '광기가 극에 달하면 내면의 마왕이 깨어난다' },
  { id: 'phantom_form', name: '환영 폼', icon: '👻', reqClass: 'assassin', reqLevel: 35, reqEmotion: 'fear',
    stats: { hpMul: 1.2, atkMul: 2.0, defMul: 1.0, spdMul: 3.0 },
    skill: { name: '천의 칼날', desc: '0.5초간 적 전원에게 각각 크리티컬 1회', aoe: 99 },
    lore: '공포가 극에 달하면 육체를 벗어난다' },
  { id: 'titan_form', name: '타이탄 폼', icon: '🗿', reqClass: 'tank', reqLevel: 35, reqEmotion: 'calm',
    stats: { hpMul: 3.0, atkMul: 1.5, defMul: 3.0, spdMul: 0.5 },
    skill: { name: '대지 분쇄', desc: '착지 충격파, 전원 기절 5초 + 지형 변경', aoe: 8 },
    lore: '고요함의 끝에서 대지 자체가 된다' },
  { id: 'storm_form', name: '폭풍 폼', icon: '🌪️', reqClass: 'ranger', reqLevel: 35, reqEmotion: 'joy',
    stats: { hpMul: 1.3, atkMul: 2.2, defMul: 1.2, spdMul: 2.5 },
    skill: { name: '폭풍의 화살', desc: '하늘에서 번개 화살 30발 연사', aoe: 12 },
    lore: '기쁨이 극에 달하면 바람이 된다' },
  // 히든 변신 (세대5 + 특정 조건)
  { id: 'god_form', name: '신 폼', icon: '🌟👑', reqClass: 'any', reqLevel: 50, reqGen: 5, reqEmotion: 'inspired',
    stats: { hpMul: 5.0, atkMul: 5.0, defMul: 5.0, spdMul: 3.0 },
    skill: { name: '창세', desc: '전장 리셋 + 적 전원 HP 1 + 아군 전원 전체 회복', aoe: 99 },
    hidden: true, lore: '5세대의 축적과 영감이 만나면 신의 경지에 이른다', duration: 15 },
];

function canTransform(merc, formId) {
  const form = TRANSFORM_FORMS.find(f => f.id === formId);
  if (!form) return false;
  if (form.reqClass !== 'any' && merc.class !== form.reqClass) return false;
  if ((merc.level || 1) < form.reqLevel) return false;
  if (form.reqGen && (merc.generation || 1) < form.reqGen) return false;
  if (form.reqEmotion && merc.emotion !== form.reqEmotion) return false;
  return true;
}

function transform(player, mercId, formId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  if (!canTransform(merc, formId)) return { ok: false, reason: '변신 조건 미충족' };

  const now = Date.now();
  if (merc.lastTransformTime && now - merc.lastTransformTime < TRANSFORM_COOLDOWN * 1000) {
    return { ok: false, reason: `쿨다운 ${Math.ceil((TRANSFORM_COOLDOWN * 1000 - (now - merc.lastTransformTime)) / 1000)}초` };
  }

  const form = TRANSFORM_FORMS.find(f => f.id === formId);
  merc.lastTransformTime = now;
  merc.activeTransform = {
    formId, name: form.name, icon: form.icon,
    stats: form.stats, skill: form.skill,
    duration: form.duration || TRANSFORM_DURATION,
    startTime: now,
  };
  return { ok: true, form: merc.activeTransform, merc: merc.name };
}

function register(io, socket, player) {
  socket.on('merc_transform_list', () => {
    const mercs = (player.mercenaries || []).map(m => ({
      id: m.id, name: m.name, class: m.class, level: m.level, emotion: m.emotion, gen: m.generation,
      available: TRANSFORM_FORMS.filter(f => canTransform(m, f.id)).map(f => ({ id: f.id, name: f.name, icon: f.icon, hidden: f.hidden })),
    }));
    socket.emit('merc_transform_list', mercs);
  });

  socket.on('merc_transform', (data) => {
    const result = transform(player, data.mercId, data.formId);
    socket.emit('merc_transform_result', result);
    if (result.ok) {
      const msg = result.form.name === '신 폼'
        ? `🌟👑 [신 변신!!] ${player.name}의 용병이 "신 폼"으로 변신!!! 전장이 뒤집힌다!!!`
        : `✨ [변신] ${player.name}의 용병이 "${result.form.name}"으로 변신!`;
      io.emit('server_msg', msg);
    }
  });

  socket.on('merc_transform_forms', () => {
    socket.emit('merc_transform_forms', TRANSFORM_FORMS.filter(f => !f.hidden));
  });
}

module.exports = { TRANSFORM_FORMS, TRANSFORM_DURATION, TRANSFORM_COOLDOWN, canTransform, transform, register };
