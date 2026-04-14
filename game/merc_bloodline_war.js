// v5.7 — 혈통 전쟁 시스템
// 4대 혈통 가문 간 세대를 넘는 전쟁, 혈통 고유 능력, 혈통 융합

const BLOODLINES = [
  { id: 'dragon', name: '용혈', icon: '🐲🩸', color: 'red',
    passive: { fireDmg: 1.25, hp: 1.1 }, awakening: '드래곤 폼 강화 (지속+10초)',
    skills: ['용언의 포효(팀 ATK+20%)', '비늘 갑옷(피격 DEF+30% 3초)', '브레스 마스터(화염 범위 2배)'],
    lore: '고대 드래곤의 피를 이어받은 전사 가문', rival: 'demon' },
  { id: 'celestial', name: '천상혈', icon: '✨🩸', color: 'gold',
    passive: { healPow: 1.3, holyDmg: 1.2 }, awakening: '천사 폼 강화 (쿨다운 -50%)',
    skills: ['신성 결계(팀 DMG 흡수 20%)', '축복의 빛(아군 전체 버프)', '심판의 번개(단일 대상 즉사 판정)'],
    lore: '천상의 존재로부터 축복받은 성스러운 가문', rival: 'abyssal' },
  { id: 'demon', name: '마혈', icon: '😈🩸', color: 'purple',
    passive: { darkDmg: 1.25, lifeSteal: 0.1 }, awakening: '마왕 폼 강화 (ATK+30%)',
    skills: ['지배의 눈(적 1명 3초 조종)', '어둠 계약(HP 대가 ATK 3배 1회)', '마왕의 위엄(적 전원 공포 3초)'],
    lore: '마계의 피가 흐르는 금지된 가문', rival: 'dragon' },
  { id: 'abyssal', name: '심연혈', icon: '🌀🩸', color: 'void',
    passive: { trueDmg: 50, penetration: 0.2 }, awakening: '공허 능력 (방어 무시 공격)',
    skills: ['차원 절단(방어 완전 무시)', '공허 흡수(적 버프 탈취)', '존재 소멸(HP 1%/초 감소 오라)'],
    lore: '심연에서 기어올라온 미지의 가문', rival: 'celestial' },
];

// 혈통 전쟁 시즌 (월간)
const BLOODLINE_WAR_SEASONS = {
  duration: 30, // 30일
  phases: [
    { name: '혈통 각성', days: [1,7], desc: '혈통 강화 퀘스트, 포인트 축적' },
    { name: '영토 쟁탈', days: [8,21], desc: '4혈통 영토전, IO+공성 혼합' },
    { name: '최종 결전', days: [22,28], desc: '상위 2혈통 최종 대결' },
    { name: '보상 & 시즌 마감', days: [29,30], desc: '승리 혈통 서버 축복' },
  ],
};

// 혈통 융합 (2개 혈통이 합쳐진 용병)
const BLOODLINE_FUSIONS = [
  { a: 'dragon', b: 'celestial', name: '성룡혈', icon: '🐲✨', bonus: { all: 1.1, holyFire: true }, desc: '신성한 불꽃을 뿜는 용' },
  { a: 'dragon', b: 'demon', name: '마룡혈', icon: '🐲😈', bonus: { atk: 1.2, darkFire: true }, desc: '지옥의 불꽃을 가진 마룡' },
  { a: 'celestial', b: 'abyssal', name: '혼돈혈', icon: '✨🌀', bonus: { all: 1.08, chaos: true }, desc: '빛과 어둠의 공존, 불안정하지만 강력' },
  { a: 'demon', b: 'abyssal', name: '종말혈', icon: '😈🌀', bonus: { trueDmg: 100, lifeSteal: 0.2 }, desc: '세계를 끝낼 수 있는 금지된 혈통' },
  { a: 'dragon', b: 'abyssal', name: '심연룡혈', icon: '🐲🌀', bonus: { penetration: 0.3, fireDmg: 1.3 }, desc: '공허를 지배하는 용' },
  { a: 'celestial', b: 'demon', name: '타락천사혈', icon: '✨😈', bonus: { healPow: 1.2, darkDmg: 1.2 }, desc: '타락한 천사의 양면의 힘' },
];

// 혈통 포인트 (공헌도)
const BLOODLINE_RANKS = [
  { rank: 1, name: '혈족', points: 0, bonus: 0.5 },
  { rank: 2, name: '혈사', points: 500, bonus: 0.75 },
  { rank: 3, name: '혈장', points: 1500, bonus: 1.0 },
  { rank: 4, name: '혈왕', points: 4000, bonus: 1.3 },
  { rank: 5, name: '혈신', points: 10000, bonus: 1.6, title: true },
];

function joinBloodline(player, bloodlineId) {
  const bl = BLOODLINES.find(b => b.id === bloodlineId);
  if (!bl) return { ok: false, reason: '알 수 없는 혈통' };
  if (player.bloodline) return { ok: false, reason: '이미 혈통 선택됨' };
  player.bloodline = { id: bloodlineId, points: 0, rank: 1, joined: Date.now() };
  return { ok: true, bloodline: bl.name, passive: bl.passive };
}

function register(io, socket, player) {
  socket.on('bloodline_info', () => {
    socket.emit('bloodline_info', { bloodlines: BLOODLINES, seasons: BLOODLINE_WAR_SEASONS, fusions: BLOODLINE_FUSIONS, ranks: BLOODLINE_RANKS, current: player.bloodline });
  });
  socket.on('bloodline_join', (data) => {
    const result = joinBloodline(player, data.bloodlineId);
    socket.emit('bloodline_join_result', result);
    if (result.ok) io.emit('server_msg', `🩸 [혈통] ${player.name}이(가) "${result.bloodline}" 가문에 합류!`);
  });
}

module.exports = { BLOODLINES, BLOODLINE_WAR_SEASONS, BLOODLINE_FUSIONS, BLOODLINE_RANKS, joinBloodline, register };
