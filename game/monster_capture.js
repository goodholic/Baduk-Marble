// 포획 몬스터 시스템 — v3.0
// 포켓몬 스타일: 포획 → 육성 → 진화 → IO 변신 전투

const CAPTURABLE_MONSTERS = [
  { id: 'slime',     name: '슬라임',     icon: '🟢', grade: 0, atk: 8,  hp: 60,  element: 'water', ability: '분열 — 사망 시 소형 2체', evo1: '킹슬라임', evo2: '슬라임 엠퍼러' },
  { id: 'wolf',      name: '늑대',       icon: '🐺', grade: 0, atk: 12, hp: 80,  element: 'wind',  ability: '울부짖음 — 아군 ATK+10%', evo1: '디어울프', evo2: '펜리르' },
  { id: 'bat',       name: '박쥐',       icon: '🦇', grade: 0, atk: 10, hp: 50,  element: 'dark',  ability: '흡혈 — 데미지의 20% 회복', evo1: '뱀파이어 배트', evo2: '블러드 로드' },
  { id: 'spider',    name: '거미',       icon: '🕷️', grade: 0, atk: 9,  hp: 55,  element: 'earth', ability: '거미줄 — 2초 속박', evo1: '독거미', evo2: '아라크네' },
  { id: 'treant',    name: '트렌트',     icon: '🌿', grade: 0, atk: 6,  hp: 120, element: 'earth', ability: '자연 치유 — HP 3%/초', evo1: '고대 트렌트', evo2: '세계수 수호자' },
  { id: 'baby_dragon',name:'아기 드래곤', icon: '🐉', grade: 1, atk: 18, hp: 100, element: 'fire',  ability: '브레스 — 광역 2배', evo1: '드래곤', evo2: '에이션트 드래곤' },
  { id: 'ghost',     name: '유령',       icon: '👻', grade: 1, atk: 15, hp: 70,  element: 'dark',  ability: '영혼 지배 — 적 1체 5초 조종', evo1: '리치', evo2: '데스 리치' },
  { id: 'eagle',     name: '독수리',     icon: '🦅', grade: 1, atk: 14, hp: 80,  element: 'wind',  ability: '급강하 — 2배 선제 공격', evo1: '그리핀', evo2: '피닉스' },
  { id: 'snake',     name: '뱀',         icon: '🐍', grade: 1, atk: 13, hp: 75,  element: 'earth', ability: '독 — 5/초×4초', evo1: '나가', evo2: '히드라' },
  { id: 'lightning',  name: '번개 정령',  icon: '⚡', grade: 2, atk: 20, hp: 90,  element: 'light', ability: '체인 라이트닝 — 3체 연쇄', evo1: '썬더버드', evo2: '라이트닝 드래곤' },
];

const PERSONALITIES = ['용맹','신중','민첩','강인','영리'];
const PERSONALITY_EFFECTS = {
  '용맹': { atk: 1.10, def: 0.95 },
  '신중': { def: 1.10, spd: 0.95 },
  '민첩': { spd: 1.10, hp: 0.95 },
  '강인': { hp: 1.10, atk: 0.95 },
  '영리': { skillDmg: 1.15, hp: 0.90 },
};

// ═══ 6속성 상성 시스템 ═══
const ELEMENTS = {
  fire:  { name: '화(火)', icon: '🔥', strong: 'wind',  weak: 'water', desc: '바람에 강하고 물에 약하다' },
  water: { name: '수(水)', icon: '💧', strong: 'fire',   weak: 'earth', desc: '불에 강하고 땅에 약하다' },
  earth: { name: '지(地)', icon: '🪨', strong: 'water',  weak: 'wind',  desc: '물에 강하고 바람에 약하다' },
  wind:  { name: '풍(風)', icon: '🌪️', strong: 'earth',  weak: 'fire',  desc: '땅에 강하고 불에 약하다' },
  light: { name: '광(光)', icon: '✨', strong: 'dark',   weak: 'dark',  desc: '어둠과 상극' },
  dark:  { name: '암(暗)', icon: '🌑', strong: 'light',  weak: 'light', desc: '빛과 상극' },
};
const ELEMENT_DAMAGE_MULT = { strong: 1.5, weak: 0.7, neutral: 1.0, mirror: 1.3 }; // light vs dark = both 1.3x

const BOND_LEVELS = [
  { name: '만남', need: 0, bonus: '' },
  { name: '친밀', need: 50, bonus: '명령 응답 +20%' },
  { name: '신뢰', need: 150, bonus: '스탯 +10%' },
  { name: '유대', need: 350, bonus: '고유 스킬 해금' },
  { name: '영혼', need: 700, bonus: '합체 변신 가능!' },
];

function getCaptures(player) {
  if (!player._captures) player._captures = { monsters: [], maxSlots: 6 };
  return player._captures;
}

// 포획 시도
function attemptCapture(player, monsterId) {
  const template = CAPTURABLE_MONSTERS.find(m => m.id === monsterId);
  if (!template) return { success: false, msg: '포획 불가 몬스터' };

  const captures = getCaptures(player);
  if (captures.monsters.length >= captures.maxSlots) return { success: false, msg: `보관함 가득 (${captures.maxSlots}마리)` };

  // 포획 확률: 일반 30%, 고급 15%, 희귀 8%
  const baseRates = [30, 15, 8];
  let rate = baseRates[template.grade] || 5;

  // 연구 보너스
  // TODO: 포획 연구 레벨에 따라 +3%/Lv

  const roll = Math.random() * 100;
  if (roll > rate) return { success: false, msg: `포획 실패... (${rate}% 확률)`, rate };

  // 포획 성공!
  const personality = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
  const effects = PERSONALITY_EFFECTS[personality];

  const monster = {
    uid: 'cap_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
    id: template.id,
    name: template.name,
    icon: template.icon,
    grade: template.grade,
    level: 1,
    exp: 0,
    atk: Math.floor(template.atk * (effects.atk || 1)),
    hp: Math.floor(template.hp * (effects.hp || 1)),
    personality,
    element: template.element || null,
    bond: 0,
    bondLevel: 0,
    stage: 1, // 1단계 (진화: 2, 3)
    ability: template.ability,
  };

  captures.monsters.push(monster);

  return {
    success: true,
    msg: `${template.icon} ${template.name} 포획 성공! (성격: ${personality})`,
    monster,
    rate,
  };
}

// 유대도 증가
function addBond(player, monsterUid, amount) {
  const captures = getCaptures(player);
  const mon = captures.monsters.find(m => m.uid === monsterUid);
  if (!mon) return null;

  mon.bond += amount;

  // 유대 레벨 체크
  for (let i = BOND_LEVELS.length - 1; i >= 0; i--) {
    if (mon.bond >= BOND_LEVELS[i].need) {
      if (mon.bondLevel < i) {
        mon.bondLevel = i;
        return { levelUp: true, level: i, name: BOND_LEVELS[i].name, bonus: BOND_LEVELS[i].bonus };
      }
      break;
    }
  }
  return { levelUp: false, bond: mon.bond };
}

// 진화
function evolveMonster(player, monsterUid) {
  const captures = getCaptures(player);
  const mon = captures.monsters.find(m => m.uid === monsterUid);
  if (!mon) return { success: false, msg: '몬스터 없음' };

  const template = CAPTURABLE_MONSTERS.find(m => m.id === mon.id);
  if (!template) return { success: false, msg: '데이터 없음' };

  const reqLv = mon.stage === 1 ? 10 : 25;
  if (mon.level < reqLv) return { success: false, msg: `Lv.${reqLv} 필요 (현재 Lv.${mon.level})` };
  if (mon.stage >= 3) return { success: false, msg: '최종 진화 완료!' };

  mon.stage++;
  const evoName = mon.stage === 2 ? template.evo1 : template.evo2;

  // 진화 스탯 보너스
  mon.atk = Math.floor(mon.atk * 1.6);
  mon.hp = Math.floor(mon.hp * 1.5);
  mon.name = evoName;

  return { success: true, msg: `🌟 ${mon.icon} → ${evoName} 진화!`, monster: mon };
}

// 몬스터 EXP (IO 전투/원정에서 획득)
function addMonsterExp(player, monsterUid, amount) {
  const captures = getCaptures(player);
  const mon = captures.monsters.find(m => m.uid === monsterUid);
  if (!mon) return null;

  mon.exp += amount;
  const expNeeded = mon.level * 30 + 50;
  let leveled = false;
  while (mon.exp >= expNeeded && mon.level < 50) {
    mon.exp -= expNeeded;
    mon.level++;
    mon.atk += Math.floor(2 * (1 + mon.grade * 0.3));
    mon.hp += Math.floor(5 * (1 + mon.grade * 0.3));
    leveled = true;
  }
  return { leveled, level: mon.level };
}

// IO 변신 데이터
function getTransformData(player, monsterUid) {
  const captures = getCaptures(player);
  const mon = captures.monsters.find(m => m.uid === monsterUid);
  if (!mon) return null;
  if (mon.bondLevel < 2) return { available: false, msg: '유대도 "신뢰" 이상 필요' };

  return {
    available: true,
    uid: mon.uid,
    name: mon.name,
    icon: mon.icon,
    atk: mon.atk,
    hp: mon.hp,
    ability: mon.ability,
    duration: 60, // 60초
    cooldown: 300, // 5분
  };
}

// 상태 조회
function getCaptureStatus(player) {
  const captures = getCaptures(player);
  return {
    monsters: captures.monsters.map(m => ({
      uid: m.uid, name: m.name, icon: m.icon, level: m.level,
      atk: m.atk, hp: m.hp, personality: m.personality, element: m.element,
      bond: m.bond, bondLevel: m.bondLevel, bondName: BOND_LEVELS[m.bondLevel]?.name,
      stage: m.stage, ability: m.ability,
      canEvolve: (m.stage === 1 && m.level >= 10) || (m.stage === 2 && m.level >= 25),
      canTransform: m.bondLevel >= 2,
    })),
    maxSlots: captures.maxSlots,
  };
}

// 소켓 핸들러
function registerCaptureHandlers(socket, playerId, players, io) {
  socket.on('capture_attempt', (monsterId) => {
    const p = players[playerId];
    if (!p) return;
    const result = attemptCapture(p, monsterId);
    socket.emit('capture_result', result);
    if (result.success) {
      io.emit('server_msg', { msg: `🐾 ${p.displayName||p.className}님이 ${result.monster.icon} ${result.monster.name} 포획! (${result.monster.personality})`, type: 'rare' });
    }
  });

  socket.on('capture_status', () => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('capture_status', getCaptureStatus(p));
  });

  socket.on('capture_feed', (data) => {
    const p = players[playerId];
    if (!p) return;
    // 먹이 주기: 유대도 +10, 골드 -100
    if ((p.gold || 0) < 100) { socket.emit('capture_result', { success: false, msg: '골드 부족 (100G)' }); return; }
    p.gold -= 100;
    const result = addBond(p, data.uid, 10);
    if (result?.levelUp) {
      socket.emit('capture_result', { success: true, msg: `💕 유대 레벨 UP! → ${result.name} (${result.bonus})` });
    } else {
      socket.emit('capture_result', { success: true, msg: '🍖 먹이 주기 완료! 유대도 +10' });
    }
  });

  socket.on('capture_evolve', (uid) => {
    const p = players[playerId];
    if (!p) return;
    const result = evolveMonster(p, uid);
    socket.emit('capture_result', result);
    if (result.success) io.emit('server_msg', { msg: `🌟 ${p.displayName||p.className}의 몬스터 진화! ${result.monster.icon} ${result.monster.name}`, type: 'rare' });
  });

  socket.on('capture_transform', (uid) => {
    const p = players[playerId];
    if (!p) return;
    socket.emit('capture_transform_data', getTransformData(p, uid));
  });
}

module.exports = { registerCaptureHandlers, attemptCapture, getCaptureStatus, getCaptures, addMonsterExp, CAPTURABLE_MONSTERS, ELEMENTS, ELEMENT_DAMAGE_MULT };
