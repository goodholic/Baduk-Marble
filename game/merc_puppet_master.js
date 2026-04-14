// v6.8 — 인형술사 시스템
// 적 용병을 일시 조종, 꼭두각시화, 역조종 방어

const PUPPET_DURATION = 10;
const PUPPET_COOLDOWN = 120;

const PUPPET_SKILLS = [
  { id: 'mind_control', name: '정신 지배', icon: '🧠🎭', duration: 10, success: 0.4, desc: '적 용병 1명을 10초간 아군으로 조종', cost: 5000 },
  { id: 'puppet_strings', name: '실 조종', icon: '🪡🎭', duration: 8, success: 0.5, desc: '적 용병 이동만 조종 (공격은 적측)', cost: 3000 },
  { id: 'emotion_puppet', name: '감정 조종', icon: '💭🎭', duration: 15, success: 0.6, desc: '적 용병 감정을 절망으로 강제 전환', cost: 4000 },
  { id: 'mass_puppet', name: '대규모 조종', icon: '🧠🧠🎭', duration: 5, success: 0.2, desc: '적 용병 3명 동시 조종! (짧지만 강력)', cost: 15000, ultimate: true },
  { id: 'self_puppet', name: '자기 조종 해제', icon: '🔓🎭', duration: 0, success: 1.0, desc: '자신에 대한 조종 즉시 해제', cost: 1000, defensive: true },
  { id: 'puppet_bomb', name: '꼭두각시 폭탄', icon: '💣🎭', duration: 5, success: 0.35, desc: '적 1명 조종 후 5초 뒤 자폭!', cost: 8000 },
];

// 조종 저항 (대상 스탯에 따라)
const RESIST_FACTORS = {
  highWill: { threshold: 'DEF > 300', resistBonus: 0.3, desc: '높은 의지력으로 저항' },
  soulLink: { bonus: 0.5, desc: '소울 링크 있으면 저항 +50%' },
  alterEgo: { bonus: -0.2, desc: '이면 활성 중이면 오히려 약해짐' },
  generation: { bonusPerGen: 0.05, desc: '세대당 저항 +5%' },
};

// 인형술사 마스터리
const PUPPET_MASTERY = [
  { level: 1, name: '견습', bonus: { duration: 0 }, desc: '기본 조종' },
  { level: 5, name: '조종사', bonus: { duration: 3, success: 0.05 }, desc: '+3초, 성공률+5%' },
  { level: 10, name: '인형사', bonus: { duration: 5, success: 0.1, multiTarget: true }, desc: '2명 동시 조종!' },
  { level: 20, name: '대인형사', bonus: { duration: 8, success: 0.15, permanent: false }, desc: '거의 확정 조종' },
  { level: 30, name: '꼭두각시의 왕', bonus: { duration: 10, success: 0.2, bossControl: true }, desc: '보스도 조종 가능!', title: true },
];

// 역조종 (조종당한 측의 대응)
const COUNTER_PUPPET = [
  { id: 'willpower', name: '의지력 폭발', cost: 3000, desc: '즉시 조종 해제 + 조종자에게 반격 DMG' },
  { id: 'puppet_ward', name: '조종 방어막', cost: 5000, duration: 60, desc: '60초간 조종 면역' },
  { id: 'reverse', name: '역조종', cost: 10000, desc: '조종을 역으로! 조종자가 조종당함!', rare: true },
];

function usePuppet(player, skillId, targetMercId) {
  const skill = PUPPET_SKILLS.find(s => s.id === skillId);
  if (!skill) return { ok: false, reason: '알 수 없는 스킬' };
  if ((player.gold || 0) < skill.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= skill.cost;
  player.puppetUses = (player.puppetUses || 0) + 1;
  const mastery = [...PUPPET_MASTERY].reverse().find(m => player.puppetUses >= m.level);
  const finalSuccess = Math.min(0.95, skill.success + (mastery?.bonus?.success || 0));
  const success = Math.random() < finalSuccess;
  return { ok: true, success, skill: skill.name, duration: skill.duration + (mastery?.bonus?.duration || 0), mastery };
}

function register(io, socket, player) {
  socket.on('puppet_info', () => {
    socket.emit('puppet_info', { skills: PUPPET_SKILLS, resist: RESIST_FACTORS, mastery: PUPPET_MASTERY, counter: COUNTER_PUPPET, uses: player.puppetUses || 0 });
  });
  socket.on('puppet_use', (data) => {
    const result = usePuppet(player, data.skillId, data.targetId);
    socket.emit('puppet_result', result);
    if (result.success) io.emit('server_msg', `🎭 [인형술] ${player.name}이(가) 적 용병을 조종!`);
    else io.emit('server_msg', `🎭❌ 조종 실패! 적이 저항했다!`);
  });
}

module.exports = { PUPPET_SKILLS, RESIST_FACTORS, PUPPET_MASTERY, COUNTER_PUPPET, usePuppet, register };
