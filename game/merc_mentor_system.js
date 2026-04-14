// v5.5 — 플레이어 간 사제 시스템
// 고수가 초보를 지도, 제자 성장 시 스승도 보상

const MENTOR_MIN_LEVEL = 30;
const APPRENTICE_MAX_LEVEL = 15;
const MAX_APPRENTICES = 3;

// 사제 단계
const MENTORSHIP_TIERS = [
  { tier: 1, name: '입문', req: { apprenticeLv: 10 }, mentorReward: { gold: 5000, exp: 500 }, apprenticeBonus: { expMul: 1.3 }, icon: '📖' },
  { tier: 2, name: '수련', req: { apprenticeLv: 20 }, mentorReward: { gold: 15000, exp: 1500, item: 'mentor_badge' }, apprenticeBonus: { expMul: 1.5, freeSkill: 1 }, icon: '⚔️📖' },
  { tier: 3, name: '성장', req: { apprenticeLv: 30 }, mentorReward: { gold: 30000, exp: 3000, title: '명사부' }, apprenticeBonus: { expMul: 1.5, freeSkill: 2, equipGift: true }, icon: '🌟📖' },
  { tier: 4, name: '졸업', req: { apprenticeLv: 40 }, mentorReward: { gold: 50000, exp: 5000, title: '전설의 스승', frame: 'mentor_gold' }, apprenticeBonus: { graduationGift: true }, icon: '🎓' },
];

// 사제 퀘스트 (함께 수행)
const MENTOR_QUESTS = [
  { id: 'first_boss', name: '첫 보스 도전', desc: '함께 보스 처치', reward: { gold: 3000, exp: 300 }, both: true },
  { id: 'dungeon_run', name: '던전 탐사', desc: '함께 던전 클리어', reward: { gold: 5000, exp: 500 }, both: true },
  { id: 'pvp_training', name: '실전 수련', desc: '사제 간 모의전 3회', reward: { gold: 2000, exp: 200 }, both: true },
  { id: 'merc_advice', name: '용병 조언', desc: '제자에게 용병 1명 선물', reward: { gold: 1000, exp: 100, mentorOnly: true } },
  { id: 'siege_lesson', name: '공성 수업', desc: '함께 공성전 참여', reward: { gold: 8000, exp: 800 }, both: true },
  { id: 'trade_lesson', name: '무역 수업', desc: '함께 무역 루트 1회', reward: { gold: 4000, exp: 400 }, both: true },
  { id: 'graduation_exam', name: '졸업 시험', desc: '제자가 스승에게 1v1 도전', reward: { gold: 20000, exp: 2000 }, both: true, final: true },
];

// 스승 랭킹 (졸업시킨 제자 수)
const MENTOR_RANKINGS = [
  { graduates: 1, title: '사부', bonus: { teachBonus: 1.05 } },
  { graduates: 3, title: '명사부', bonus: { teachBonus: 1.1 } },
  { graduates: 5, title: '대사부', bonus: { teachBonus: 1.15, mercExp: 1.05 } },
  { graduates: 10, title: '전설의 스승', bonus: { teachBonus: 1.2, mercExp: 1.1 } },
  { graduates: 20, title: '태사부 👑📚', bonus: { teachBonus: 1.3, mercExp: 1.15, allStat: 1.03 } },
];

function becomeMentor(player, apprenticeId) {
  if ((player.level || 1) < MENTOR_MIN_LEVEL) return { ok: false, reason: `레벨 ${MENTOR_MIN_LEVEL} 이상 필요` };
  const apprentices = player.apprentices || [];
  if (apprentices.length >= MAX_APPRENTICES) return { ok: false, reason: `최대 ${MAX_APPRENTICES}명` };
  if (apprentices.includes(apprenticeId)) return { ok: false, reason: '이미 제자' };

  apprentices.push(apprenticeId);
  player.apprentices = apprentices;
  return { ok: true, apprenticeId, tier: 1 };
}

function checkGraduation(mentor, apprentice) {
  if ((apprentice.level || 1) >= 40) {
    mentor.graduates = (mentor.graduates || 0) + 1;
    const rank = [...MENTOR_RANKINGS].reverse().find(r => mentor.graduates >= r.graduates);
    return { graduated: true, rank };
  }
  return { graduated: false };
}

function register(io, socket, player) {
  socket.on('mentor_info', () => {
    socket.emit('mentor_info', {
      tiers: MENTORSHIP_TIERS, quests: MENTOR_QUESTS,
      rankings: MENTOR_RANKINGS,
      myApprentices: player.apprentices || [],
      myMentor: player.mentor || null,
      graduates: player.graduates || 0,
    });
  });
  socket.on('mentor_accept', (data) => {
    const result = becomeMentor(player, data.apprenticeId);
    socket.emit('mentor_accept_result', result);
    if (result.ok) io.emit('server_msg', `📖 [사제] ${player.name}이(가) 새 제자를 받아들였습니다!`);
  });
  socket.on('mentor_quest_complete', (data) => {
    const quest = MENTOR_QUESTS.find(q => q.id === data.questId);
    if (quest) {
      player.gold = (player.gold || 0) + (quest.reward.gold || 0);
      socket.emit('mentor_quest_result', { ok: true, quest: quest.name, reward: quest.reward });
    }
  });
}

module.exports = { MENTORSHIP_TIERS, MENTOR_QUESTS, MENTOR_RANKINGS, MENTOR_MIN_LEVEL, becomeMentor, checkGraduation, register };
