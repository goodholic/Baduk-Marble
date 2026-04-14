// ============================================
// 카드 각성 시스템 — 최종 성장, 카드가 완전히 새로운 형태로
// ============================================

// 각성 조건: Lv.30+ AND ★3+ AND 진화 완료
// 각성 시 외형/스킬/스탯 대폭 변화

const AWAKENING_FORMS = {
  '전설의 검성':   { awaken: '신검의 주인', icon: '⚔️👑🌟', grade: 'myth', atkMul: 2.0, defMul: 1.5, hpMul: 1.8, newSkill: { name: '무쌍검', desc: '전체 ATK×5 + 3초 무적', icon: '⚔️💥' }, lore: '만 번의 베기 끝에, 검이 주인을 선택했다.' },
  '대마도사':      { awaken: '차원의 현자', icon: '🔮👑🌟', grade: 'myth', atkMul: 1.5, defMul: 1.3, hpMul: 1.5, matkMul: 2.5, newSkill: { name: '차원 붕괴', desc: '전체 마법 DMG×4 + 실명 3초', icon: '🌀💥' }, lore: '마법의 끝에서 차원의 진리를 깨달았다.' },
  '영웅 사수':     { awaken: '신궁', icon: '🏹👑🌟', grade: 'myth', atkMul: 1.8, defMul: 1.2, hpMul: 1.4, newSkill: { name: '만발 사격', desc: '20발 연사, 각 크리 확정', icon: '🏹💥' }, lore: '화살은 이제 바람 자체가 되었다.' },
  '마검사':        { awaken: '검마신', icon: '⚔️🔮👑', grade: 'myth', atkMul: 1.8, defMul: 1.5, hpMul: 1.6, matkMul: 1.8, newSkill: { name: '마검 합일', desc: '물리+마법 동시 공격 ×3', icon: '⚔️🔮💥' }, lore: '검과 마법이 하나가 되는 경지.' },
  '드래곤 블레이드':{ awaken: '용신', icon: '🐲⚔️👑', grade: 'myth', atkMul: 2.2, defMul: 1.8, hpMul: 2.0, newSkill: { name: '용신의 일격', desc: 'HP×50% 데미지 + 전원 공포', icon: '🐲💥' }, lore: '용의 피가 각성하여 신의 경지에 올랐다.' },
  '불멸의 전사':   { awaken: '영원의 수호자', icon: '🔥⚔️👑', grade: 'myth', atkMul: 2.0, defMul: 2.0, hpMul: 2.5, newSkill: { name: '불멸', desc: '10초간 죽지 않음 + 킬마다 HP 회복', icon: '♾️💥' }, lore: '죽음조차 그를 멈출 수 없다.' },
};

// 각성 비용
const AWAKENING_COST = { gold: 50000, diamonds: 100, awakening_stone: 1 };

// 각성석 획득처
const AWAKENING_STONE_SOURCES = [
  { source: '탑 50층 클리어', chance: 1.0 },
  { source: '탑 100층 클리어', chance: 1.0, count: 3 },
  { source: 'IO 1위', chance: 0.3 },
  { source: '시즌 다이아+ 등급', chance: 1.0 },
  { source: '길드 레이드 세계의적 클리어', chance: 0.5 },
];

function canAwaken(card) {
  if ((card.level || 1) < 30) return { can: false, reason: 'Lv.30 필요' };
  if ((card.stars || 0) < 3) return { can: false, reason: '★3 이상 필요' };
  if (card.awakened) return { can: false, reason: '이미 각성됨' };
  const baseName = (card.name || '').replace(/[★+\d]+$/, '').trim();
  if (!AWAKENING_FORMS[baseName]) return { can: false, reason: '각성 폼 없음' };
  return { can: true, form: AWAKENING_FORMS[baseName] };
}

function awakenCard(player, cardId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const check = canAwaken(card);
  if (!check.can) return { ok: false, reason: check.reason };

  if ((player.gold || 0) < AWAKENING_COST.gold) return { ok: false, reason: `골드 ${AWAKENING_COST.gold} 필요` };
  if ((player.diamonds || 0) < AWAKENING_COST.diamonds) return { ok: false, reason: `다이아 ${AWAKENING_COST.diamonds} 필요` };
  if ((player.awakeningStones || 0) < AWAKENING_COST.awakening_stone) return { ok: false, reason: '각성석 필요' };

  player.gold -= AWAKENING_COST.gold;
  player.diamonds -= AWAKENING_COST.diamonds;
  player.awakeningStones--;

  const form = check.form;
  card.name = form.awaken;
  card.icon = form.icon;
  card.grade = form.grade;
  card.atk = Math.floor((card.atk || 30) * form.atkMul);
  card.def = Math.floor((card.def || 20) * form.defMul);
  card.hp = Math.floor((card.hp || 200) * form.hpMul);
  if (form.matkMul) card.matk = Math.floor((card.matk || 0) * form.matkMul + 50);
  card.awakened = true;
  card.awakenSkill = form.newSkill;
  card.lore = form.lore;

  return { ok: true, msg: `🌟 각성! "${card.name}" — ${form.newSkill.name} 해금!`, card, lore: form.lore };
}

function register(io, socket, player) {
  socket.on('card_awaken_check', (data) => {
    const card = (player.cards || []).find(c => c.id === data.cardId);
    if (!card) return socket.emit('card_awaken_check', { can: false, reason: '카드 없음' });
    const result = canAwaken(card);
    socket.emit('card_awaken_check', { ...result, cost: AWAKENING_COST, stones: player.awakeningStones || 0 });
  });

  socket.on('card_awaken', (data) => {
    const result = awakenCard(player, data.cardId);
    socket.emit('card_awaken_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟👑 [각성] ${player.displayName || '???'}의 "${result.card.name}" 각성! ${result.card.awakenSkill.name} 해금!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  socket.on('card_awaken_info', () => {
    socket.emit('card_awaken_info', { forms: Object.entries(AWAKENING_FORMS).map(([k, v]) => ({ from: k, to: v.awaken, icon: v.icon, skill: v.newSkill, grade: v.grade })), cost: AWAKENING_COST, stones: player.awakeningStones || 0, sources: AWAKENING_STONE_SOURCES });
  });
}

module.exports = { AWAKENING_FORMS, AWAKENING_COST, AWAKENING_STONE_SOURCES, canAwaken, awakenCard, register };
