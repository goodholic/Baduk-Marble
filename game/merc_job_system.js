// v5.7 — 용병 직업 시스템 (부직업)
// 전투 외 부직업으로 수익/아이템/버프 생산

const MAX_JOBS = 2; // 용병당 최대 2개 부직업

const JOBS = [
  { id: 'blacksmith', name: '대장장이', icon: '🔨', prod: { equipRepair: true, craftBonus: 1.2 }, levelUp: '장비 제작 비용 -5%/Lv', maxLv: 10 },
  { id: 'alchemist', name: '연금술사', icon: '⚗️', prod: { potions: true, transmute: true }, levelUp: '포션 효과 +5%/Lv', maxLv: 10 },
  { id: 'cook', name: '요리사', icon: '👨‍🍳', prod: { meals: true, teamBuff: 'food' }, levelUp: '요리 버프 지속 +10%/Lv', maxLv: 10 },
  { id: 'merchant', name: '상인', icon: '💼', prod: { tradeProfit: 1.1, bargain: true }, levelUp: '무역 수익 +3%/Lv', maxLv: 10 },
  { id: 'scout', name: '정찰병', icon: '🔭', prod: { mapReveal: true, trapDetect: true }, levelUp: '탐지 범위 +5%/Lv', maxLv: 10 },
  { id: 'musician', name: '음유시인', icon: '🎵', prod: { morale: 1.1, recruitBonus: true }, levelUp: '사기 보너스 +3%/Lv', maxLv: 10 },
  { id: 'healer_job', name: '의사', icon: '🏥', prod: { healRate: 1.2, cureDisease: true }, levelUp: '회복 효율 +5%/Lv', maxLv: 10 },
  { id: 'thief', name: '도적', icon: '🤏', prod: { stealChance: 0.05, lockpick: true }, levelUp: '도둑질 성공률 +2%/Lv', maxLv: 10 },
  { id: 'farmer', name: '농부', icon: '🌾', prod: { foodProd: 1.3, animalBreed: true }, levelUp: '식량 생산 +5%/Lv', maxLv: 10 },
  { id: 'enchanter', name: '마법부여사', icon: '✨📜', prod: { enchant: true, scrollCraft: true }, levelUp: '부여 효과 +5%/Lv', maxLv: 10 },
];

// 직업 레벨업 퀘스트
const JOB_QUESTS = {
  blacksmith: ['무기 10개 수리', '전설 장비 1개 제작', '신화 장비 도전'],
  alchemist: ['포션 20개 제작', '변환 성공 10회', '금단의 물약 제작'],
  cook: ['레시피 10개 발견', '5성 요리 제작', '만찬 개최'],
  merchant: ['거래 50회 완료', '이윤 10만G 달성', '무역왕 도전'],
  scout: ['비밀 지역 3곳 발견', '함정 20개 탐지', '적 기지 정찰 성공'],
};

// 직업 시너지 (2직업 조합 보너스)
const JOB_SYNERGIES = [
  { a: 'blacksmith', b: 'enchanter', name: '마법 대장장이', bonus: '제작 장비에 자동 부여', icon: '🔨✨' },
  { a: 'alchemist', b: 'cook', name: '약선 요리사', bonus: '요리에 포션 효과 추가', icon: '⚗️👨‍🍳' },
  { a: 'merchant', b: 'thief', name: '암거래상', bonus: '암시장 전용 아이템 해금', icon: '💼🤏' },
  { a: 'scout', b: 'thief', name: '첩보원', bonus: '스파이 임무 성공률 +20%', icon: '🔭🤏' },
  { a: 'musician', b: 'cook', name: '연회 전문가', bonus: '축제 보너스 2배', icon: '🎵👨‍🍳' },
  { a: 'healer_job', b: 'alchemist', name: '약사', bonus: '치료+포션 효과 1.5배', icon: '🏥⚗️' },
  { a: 'farmer', b: 'cook', name: '자급자족', bonus: '재료비 -50%', icon: '🌾👨‍🍳' },
  { a: 'blacksmith', b: 'farmer', name: '만능 일꾼', bonus: '영지 건설 속도 +30%', icon: '🔨🌾' },
];

function assignJob(player, mercId, jobId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const job = JOBS.find(j => j.id === jobId);
  if (!job) return { ok: false, reason: '알 수 없는 직업' };
  merc.jobs = merc.jobs || [];
  if (merc.jobs.length >= MAX_JOBS) return { ok: false, reason: `최대 ${MAX_JOBS}개 부직업` };
  if (merc.jobs.find(j => j.id === jobId)) return { ok: false, reason: '이미 보유' };
  merc.jobs.push({ id: jobId, level: 1, exp: 0 });
  // 시너지 체크
  const syn = JOB_SYNERGIES.find(s => merc.jobs.some(j => j.id === s.a) && merc.jobs.some(j => j.id === s.b));
  return { ok: true, job: job.name, synergy: syn || null };
}

function register(io, socket, player) {
  socket.on('job_list', () => {
    socket.emit('job_list', { jobs: JOBS, synergies: JOB_SYNERGIES, quests: JOB_QUESTS });
  });
  socket.on('job_assign', (data) => {
    const result = assignJob(player, data.mercId, data.jobId);
    socket.emit('job_assign_result', result);
    if (result.synergy) io.emit('server_msg', `✨ [직업 시너지] ${player.name}의 용병이 "${result.synergy.name}" 시너지 해금!`);
  });
}

module.exports = { JOBS, JOB_QUESTS, JOB_SYNERGIES, MAX_JOBS, assignJob, register };
