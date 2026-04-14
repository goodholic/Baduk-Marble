// v5.6 — 용병 환생+ 시스템 (강화판)
// Lv.MAX 용병을 환생 → Lv.1로 돌아가지만 영구 보너스 + 새 스킬 해금

const REINCARNATION_MAX = 7;
const REINCARNATION_REQ_LEVEL = 50;

const REINCARNATION_BONUSES = [
  { cycle: 1, name: '1회 환생', icon: '🔄', statBonus: { all: 1.05 }, newSkill: '환생의 기운 (전투 시작 ATK+10% 30초)', color: 'white' },
  { cycle: 2, name: '2회 환생', icon: '🔄🔄', statBonus: { all: 1.12 }, newSkill: '전생의 기억 (EXP 획득 1.5배)', color: 'green' },
  { cycle: 3, name: '3회 환생', icon: '🔄🔄🔄', statBonus: { all: 1.20 }, newSkill: '윤회의 힘 (사망 시 50% 확률 즉시 부활)', color: 'blue' },
  { cycle: 4, name: '4회 환생', icon: '💫🔄', statBonus: { all: 1.30 }, newSkill: '운명 저항 (CC 지속시간 -50%)', color: 'purple' },
  { cycle: 5, name: '5회 환생', icon: '✨🔄', statBonus: { all: 1.45 }, newSkill: '초월 재생 (매 10초 HP 5% 회복)', color: 'gold' },
  { cycle: 6, name: '6회 환생', icon: '🌟🔄', statBonus: { all: 1.65 }, newSkill: '시간 역행 (60초 쿨, 5초 전 상태로)', color: 'rainbow' },
  { cycle: 7, name: '최종 환생', icon: '👑🔄', statBonus: { all: 2.0 }, newSkill: '불멸 (전투당 1회 무적 5초)', color: 'transcend', title: '영원의 전사' },
];

// 환생 재료 (사이클마다 증가)
const REINCARNATION_COSTS = [
  { cycle: 1, gold: 50000, items: ['환생석×1'] },
  { cycle: 2, gold: 150000, items: ['환생석×3', '보스결정×5'] },
  { cycle: 3, gold: 300000, items: ['환생석×5', '신의파편×1'] },
  { cycle: 4, gold: 500000, items: ['환생석×10', '신의파편×3'] },
  { cycle: 5, gold: 800000, items: ['환생석×15', '심연정수×1'] },
  { cycle: 6, gold: 1200000, items: ['환생석×20', '심연정수×3', '태초의정수×1'] },
  { cycle: 7, gold: 2000000, items: ['환생석×30', '태초의정수×3', '신의축복×1'] },
];

// 환생 보너스: 누적 (이전 환생 보너스 유지)
function getReincarnationBonus(cycle) {
  let totalAll = 1.0;
  const skills = [];
  for (let i = 0; i < Math.min(cycle, REINCARNATION_MAX); i++) {
    const rb = REINCARNATION_BONUSES[i];
    totalAll *= rb.statBonus.all;
    skills.push(rb.newSkill);
  }
  return { statMul: Math.round(totalAll * 100) / 100, skills, cycle };
}

function reincarnate(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  if ((merc.level || 1) < REINCARNATION_REQ_LEVEL) return { ok: false, reason: `레벨 ${REINCARNATION_REQ_LEVEL} 필요` };
  const cycle = (merc.reincarnation || 0) + 1;
  if (cycle > REINCARNATION_MAX) return { ok: false, reason: '최종 환생 완료' };

  const cost = REINCARNATION_COSTS[cycle - 1];
  if ((player.gold || 0) < cost.gold) return { ok: false, reason: '골드 부족' };
  player.gold -= cost.gold;

  merc.reincarnation = cycle;
  merc.level = 1;
  merc.exp = 0;
  const bonus = getReincarnationBonus(cycle);
  merc.reincarnationBonus = bonus;
  const rb = REINCARNATION_BONUSES[cycle - 1];
  merc.nameColor = rb.color;
  if (rb.title) merc.reincarnationTitle = rb.title;

  return { ok: true, cycle, bonus, color: rb.color, skill: rb.newSkill, title: rb.title };
}

function register(io, socket, player) {
  socket.on('reincarnation_info', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('reincarnation_info', { ok: false });
    const current = merc.reincarnation || 0;
    const next = current < REINCARNATION_MAX ? REINCARNATION_BONUSES[current] : null;
    const cost = current < REINCARNATION_MAX ? REINCARNATION_COSTS[current] : null;
    socket.emit('reincarnation_info', { ok: true, current, max: REINCARNATION_MAX, next, cost, currentBonus: getReincarnationBonus(current) });
  });
  socket.on('reincarnation_execute', (data) => {
    const result = reincarnate(player, data.mercId);
    socket.emit('reincarnation_result', result);
    if (result.ok) {
      const msg = result.cycle >= 5
        ? `👑🔄 [최고 환생] ${player.name}의 용병이 ${result.cycle}회 환생! 스탯 ×${result.bonus.statMul}!`
        : `🔄 [환생] ${player.name}의 용병이 ${result.cycle}회 환생!`;
      io.emit('server_msg', msg);
    }
  });
}

module.exports = { REINCARNATION_BONUSES, REINCARNATION_COSTS, REINCARNATION_MAX, getReincarnationBonus, reincarnate, register };
