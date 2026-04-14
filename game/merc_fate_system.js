// v5.8 — 용병 운명 시스템
// 각 용병에게 랜덤 운명이 부여, 운명 성취 시 초월 보상, 운명 변경 가능

const FATES = [
  { id: 'hero', name: '영웅의 운명', icon: '🦸', condition: '보스 100마리 처치', reward: { atk: 1.15, title: '운명의 영웅' }, lore: '전설에 남을 영웅이 될 운명' },
  { id: 'guardian', name: '수호자의 운명', icon: '🛡️⭐', condition: '동료 50회 보호', reward: { def: 1.2, hp: 1.1, title: '운명의 수호자' }, lore: '소중한 것을 지키는 운명' },
  { id: 'wanderer', name: '방랑자의 운명', icon: '🗺️', condition: '모든 지역 방문', reward: { spd: 1.2, dropRate: 1.15, title: '운명의 방랑자' }, lore: '세계를 떠돌며 진실을 찾는 운명' },
  { id: 'lover', name: '연인의 운명', icon: '❤️⭐', condition: '결혼 + 자녀 2세대', reward: { teamBuff: 1.1, intimacyRate: 2.0, title: '운명의 연인' }, lore: '사랑으로 세계를 구원하는 운명' },
  { id: 'tyrant', name: '폭군의 운명', icon: '👑💀', condition: 'PK 50회 + 영토 5개', reward: { atk: 1.2, fear: true, title: '운명의 폭군' }, lore: '공포로 지배하는 어둠의 운명' },
  { id: 'sage', name: '현자의 운명', icon: '📚⭐', condition: '모든 연구 완료', reward: { matk: 1.15, expBonus: 1.3, title: '운명의 현자' }, lore: '지식의 끝에서 진리를 깨우치는 운명' },
  { id: 'merchant_king', name: '상왕의 운명', icon: '💰👑', condition: '무역 총수익 500만G', reward: { tradeBonus: 1.3, goldProd: 1.2, title: '운명의 상왕' }, lore: '부로 세계를 움직이는 운명' },
  { id: 'avenger', name: '복수자의 운명', icon: '🔥💢', condition: '어둠의 대륙 전사 10명 복수', reward: { atk: 1.25, darkResist: 1.5, title: '운명의 복수자' }, lore: '쓰러진 동료를 위해 싸우는 운명' },
  { id: 'dreamer', name: '꿈꾸는 자의 운명', icon: '💭⭐', condition: '꿈의 세계 6종 모두 클리어', reward: { allStat: 1.08, dreamBonus: 2.0, title: '운명의 꿈꾸는 자' }, lore: '현실과 꿈의 경계를 넘는 운명' },
  { id: 'godslayer', name: '신살자의 운명', icon: '⚔️🌟', condition: '6신 보스 전부 처치', reward: { allStat: 1.12, trueDmg: 100, title: '운명의 신살자' }, lore: '신조차 두려워하는 운명', hidden: true },
  { id: 'transcendent', name: '초월자의 운명', icon: '🌌👑', condition: '7회 환생 + 5세대 + 신 폼', reward: { allStat: 1.2, immortal: true, title: '초월자' }, lore: '모든 한계를 넘어선 자의 운명', hidden: true },
];

// 운명 변경 (고비용)
const FATE_CHANGE_COST = { gold: 100000, item: '운명의 실 ×1' };

// 운명 각성 단계 (진행도)
const FATE_PROGRESS = [
  { pct: 25, name: '각성 시작', bonus: { stat: 1.02 }, desc: '운명의 실마리를 발견' },
  { pct: 50, name: '운명 인식', bonus: { stat: 1.05 }, desc: '자신의 운명을 받아들임' },
  { pct: 75, name: '운명 저항', bonus: { stat: 1.08 }, desc: '운명에 맞서 싸움' },
  { pct: 100, name: '운명 성취', bonus: { stat: 1.15 }, desc: '운명을 완성! 초월 보상!' },
];

// 운명의 실 (운명 변경 재료, 드롭처)
const FATE_THREAD_DROPS = [
  { source: '어둠의 대륙 보스', chance: 0.05 },
  { source: '유산 던전 80층+', chance: 0.08 },
  { source: '신들의 전쟁 승리', chance: 0.03 },
  { source: '7회 환생', chance: 1.0 },
];

function assignFate(merc) {
  if (merc.fate) return { ok: false, reason: '이미 운명 보유' };
  const pool = FATES.filter(f => !f.hidden);
  const fate = pool[Math.floor(Math.random() * pool.length)];
  merc.fate = { id: fate.id, progress: 0, assigned: Date.now() };
  return { ok: true, fate };
}

function checkFateProgress(merc, progressPct) {
  if (!merc.fate) return null;
  merc.fate.progress = Math.min(100, progressPct);
  const milestone = FATE_PROGRESS.filter(p => merc.fate.progress >= p.pct).pop();
  const completed = merc.fate.progress >= 100;
  if (completed) {
    const fate = FATES.find(f => f.id === merc.fate.id);
    merc.fateCompleted = true;
    merc.fateReward = fate?.reward;
    merc.fateTitle = fate?.reward?.title;
  }
  return { milestone, completed };
}

function register(io, socket, player) {
  socket.on('fate_info', () => {
    const mercs = (player.mercenaries || []).map(m => ({
      id: m.id, name: m.name, fate: m.fate, fateCompleted: m.fateCompleted,
      fateData: m.fate ? FATES.find(f => f.id === m.fate.id) : null,
    }));
    socket.emit('fate_info', { mercs, allFates: FATES.filter(f => !f.hidden), progress: FATE_PROGRESS, changeCost: FATE_CHANGE_COST });
  });
  socket.on('fate_assign', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('fate_assign_result', { ok: false });
    const result = assignFate(merc);
    socket.emit('fate_assign_result', result);
    if (result.ok) io.emit('server_msg', `⭐ [운명] ${player.name}의 ${merc.name}에게 "${result.fate.name}" 부여!`);
  });
}

module.exports = { FATES, FATE_CHANGE_COST, FATE_PROGRESS, FATE_THREAD_DROPS, assignFate, checkFateProgress, register };
