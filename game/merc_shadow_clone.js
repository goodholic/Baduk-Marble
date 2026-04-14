// v6.5 — 그림자 분신 시스템
// 용병의 분신을 생성, 분신이 별도 임무 수행, 본체와 연동

const MAX_CLONES = 3;
const CLONE_STAT_RATIO = 0.6; // 본체의 60% 능력
const CLONE_DURATION = 3600; // 1시간

const CLONE_TYPES = [
  { id: 'combat', name: '전투 분신', icon: '👤⚔️', statRatio: 0.6, canFight: true, canGather: false, desc: 'IO/공성전 참여 가능' },
  { id: 'worker', name: '노동 분신', icon: '👤⛏️', statRatio: 0.3, canFight: false, canGather: true, desc: '채집/제작/건설 대행' },
  { id: 'spy', name: '첩보 분신', icon: '👤🕵️', statRatio: 0.4, canFight: false, canSpy: true, desc: '정찰/첩보 임무 수행' },
  { id: 'merchant', name: '상인 분신', icon: '👤💼', statRatio: 0.2, canFight: false, canTrade: true, desc: '무역/거래 자동 수행' },
  { id: 'guardian', name: '수호 분신', icon: '👤🛡️', statRatio: 0.5, canFight: true, canGuard: true, desc: '성/영지 자동 방어' },
];

// 분신 임무 배정
const CLONE_MISSIONS = [
  { id: 'auto_io', name: 'IO 자동 참여', type: 'combat', duration: 1800, reward: { gold: 3000, exp: 300 }, desc: '분신이 IO 매치 자동 참여 (약한 성적)' },
  { id: 'auto_gather', name: '자동 채집', type: 'worker', duration: 3600, reward: { materials: 10 }, desc: '재료 자동 채집' },
  { id: 'auto_patrol', name: '자동 순찰', type: 'guardian', duration: 3600, reward: { defBonus: 1.05 }, desc: '영지 방어 순찰' },
  { id: 'auto_trade', name: '자동 무역', type: 'merchant', duration: 7200, reward: { gold: 5000 }, desc: '무역 루트 자동 운영' },
  { id: 'auto_spy', name: '자동 첩보', type: 'spy', duration: 3600, reward: { intel: 1 }, desc: '랜덤 정보 수집' },
  { id: 'decoy', name: '미끼 작전', type: 'combat', duration: 600, reward: {}, desc: '적에게 분신을 보여 함정 유도' },
];

// 분신 융합 (2개 분신 합체 → 강화 분신)
const CLONE_FUSIONS = [
  { a: 'combat', b: 'guardian', result: { name: '전투 수호 분신', icon: '👤⚔️🛡️', statRatio: 0.8 }, desc: '강화 전투+방어' },
  { a: 'spy', b: 'merchant', result: { name: '암거래 분신', icon: '👤🕵️💼', statRatio: 0.5, trade: true, spy: true }, desc: '정보+무역 동시' },
  { a: 'worker', b: 'worker', result: { name: '골렘 분신', icon: '👤🗿', statRatio: 0.4, gatherMul: 3.0 }, desc: '채집 효율 3배' },
];

// 분신 소멸 조건
const CLONE_RISKS = [
  { id: 'timeout', desc: '시간 만료 → 자동 소멸' },
  { id: 'detected', desc: '첩보 분신 발각 → 즉시 소멸' },
  { id: 'killed', desc: '전투 분신 HP 0 → 소멸 + 본체 HP -10%' },
  { id: 'overload', desc: '3개 초과 생성 시도 → 가장 약한 분신 소멸' },
];

function createClone(player, mercId, cloneType) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const cType = CLONE_TYPES.find(c => c.id === cloneType);
  if (!cType) return { ok: false, reason: '알 수 없는 분신' };
  const clones = player.shadowClones || [];
  if (clones.length >= MAX_CLONES) return { ok: false, reason: `최대 ${MAX_CLONES}개` };
  if ((player.gold || 0) < 5000) return { ok: false, reason: '골드 부족 (5000G)' };
  player.gold -= 5000;

  const clone = {
    id: `clone_${Date.now()}`, mercId, mercName: merc.name, type: cloneType,
    hp: Math.floor((merc.hp || 500) * cType.statRatio),
    atk: Math.floor((merc.atk || 50) * cType.statRatio),
    created: Date.now(), expires: Date.now() + CLONE_DURATION * 1000,
    mission: null,
  };
  clones.push(clone);
  player.shadowClones = clones;
  return { ok: true, clone };
}

function register(io, socket, player) {
  socket.on('shadow_clone_info', () => {
    socket.emit('shadow_clone_info', { types: CLONE_TYPES, missions: CLONE_MISSIONS, fusions: CLONE_FUSIONS, risks: CLONE_RISKS, clones: player.shadowClones || [], max: MAX_CLONES });
  });
  socket.on('shadow_clone_create', (data) => {
    const result = createClone(player, data.mercId, data.cloneType);
    socket.emit('shadow_clone_result', result);
    if (result.ok) io.emit('server_msg', `👤 [분신] ${player.name}의 분신이 생성되었다...`);
  });
  socket.on('shadow_clone_mission', (data) => {
    const clone = (player.shadowClones || []).find(c => c.id === data.cloneId);
    const mission = CLONE_MISSIONS.find(m => m.id === data.missionId);
    if (clone && mission) { clone.mission = data.missionId; socket.emit('shadow_clone_mission_result', { ok: true }); }
  });
}

module.exports = { CLONE_TYPES, CLONE_MISSIONS, CLONE_FUSIONS, CLONE_RISKS, MAX_CLONES, createClone, register };
