// v5.1 — IO 보스 포획 → SLG 전설 용병화 시스템
// IO 서바이벌에서 보스를 약화 후 포획 → SLG에서 전설급 용병으로 사용

const CAPTURE_HP_THRESHOLD = 0.15; // HP 15% 이하에서 포획 가능
const BASE_CAPTURE_RATE = 0.3;     // 기본 포획 확률 30%

// 포획 가능한 IO 보스 목록 (용병화 데이터)
const CAPTURABLE_BOSSES = [
  {
    bossId: 'slime_king', name: '슬라임 킹', icon: '👑🟢',
    mercGrade: 'rare', mercClass: 'tank',
    baseStats: { hp: 3000, atk: 80, def: 200, spd: 2 },
    uniqueSkill: { name: '분열 방어', desc: '피격 시 30% 확률로 미니 슬라임 생성 (방패)', cooldown: 20 },
    captureRate: 0.5, evolution: ['슬라임 킹', '엘더 슬라임', '슬라임 황제'],
    lore: '모든 슬라임의 왕, 겸손하지만 무한히 분열한다',
  },
  {
    bossId: 'orc_warlord', name: '오크 전쟁군주', icon: '💪🟤',
    mercGrade: 'epic', mercClass: 'warrior',
    baseStats: { hp: 5000, atk: 250, def: 150, spd: 4 },
    uniqueSkill: { name: '전쟁의 함성', desc: '아군 전원 ATK+30% (10초) + 적 공포 3초', cooldown: 30 },
    captureRate: 0.3, evolution: ['오크 전쟁군주', '오크 대군주', '오크 신왕'],
    lore: '무수한 전쟁에서 살아남은 최강의 오크',
  },
  {
    bossId: 'dark_knight', name: '다크 나이트', icon: '🖤⚔️',
    mercGrade: 'epic', mercClass: 'warrior',
    baseStats: { hp: 6000, atk: 300, def: 250, spd: 5 },
    uniqueSkill: { name: '어둠의 참격', desc: '전방 부채꼴 암흑 슬래시, 시야 차단 5초', cooldown: 25 },
    captureRate: 0.2, evolution: ['다크 나이트', '데스 나이트', '파멸의 기사'],
    lore: '빛을 잃은 기사, 그 안에 아직 선한 불꽃이 남아있다',
  },
  {
    bossId: 'ancient_dragon', name: '에이션트 드래곤', icon: '🐲✨',
    mercGrade: 'legend', mercClass: 'mage',
    baseStats: { hp: 10000, atk: 500, def: 350, spd: 6 },
    uniqueSkill: { name: '용언의 마법', desc: '3원소 랜덤 브레스 연속 3회', cooldown: 40 },
    captureRate: 0.1, evolution: ['에이션트 드래곤', '엘더 드래곤', '용신'],
    lore: '태곳적부터 살아온 고대의 용, 지혜와 파괴를 겸비',
  },
  {
    bossId: 'world_enemy', name: '세계의 적', icon: '🌍💀',
    mercGrade: 'myth', mercClass: 'warrior',
    baseStats: { hp: 15000, atk: 700, def: 500, spd: 7 },
    uniqueSkill: { name: '세계 멸망', desc: '맵 전체 HP 20% 데미지 + 모든 버프 제거', cooldown: 60 },
    captureRate: 0.03, evolution: ['세계의 적', '차원의 파괴자', '종말의 신'],
    lore: '세계를 멸망시키기 위해 태어난 존재, 포획에 성공하면 최강',
  },
];

// 포획 아이템 (확률 증가)
const CAPTURE_ITEMS = [
  { id: 'basic_trap', name: '기본 포획 덫', bonus: 0.1, cost: 500, icon: '🪤' },
  { id: 'enchanted_chain', name: '마법 쇠사슬', bonus: 0.2, cost: 2000, icon: '⛓️' },
  { id: 'soul_cage', name: '영혼 감옥', bonus: 0.35, cost: 5000, icon: '🔮' },
  { id: 'divine_seal', name: '신성 봉인', bonus: 0.5, cost: 15000, icon: '✨' },
  { id: 'master_ball', name: '마스터 봉인구', bonus: 1.0, cost: 50000, icon: '🟡', note: '100% 확정 포획!' },
];

// 포획 몬스터 진화 시스템
const EVOLUTION_COSTS = {
  1: { gold: 10000, items: ['진화석×3'], level: 20 },
  2: { gold: 50000, items: ['상급 진화석×5', '보스 결정×10'], level: 40 },
};

function attemptCapture(player, bossId, captureItemId) {
  const bossData = CAPTURABLE_BOSSES.find(b => b.bossId === bossId);
  if (!bossData) return { ok: false, reason: '포획 불가능한 보스' };

  let rate = bossData.captureRate;
  const item = CAPTURE_ITEMS.find(i => i.id === captureItemId);
  if (item) {
    rate = Math.min(1.0, rate + item.bonus);
    // 아이템 소비
    const inv = player.inventory || [];
    const idx = inv.findIndex(i => i.id === captureItemId);
    if (idx === -1) return { ok: false, reason: '포획 아이템 없음' };
    inv.splice(idx, 1);
  }

  const roll = Math.random();
  if (roll > rate) {
    return { ok: false, reason: '포획 실패!', rate: Math.round(rate * 100), roll: Math.round(roll * 100) };
  }

  // 포획 성공 → 용병화
  const newMerc = {
    id: `captured_${bossId}_${Date.now()}`,
    baseId: bossData.bossId,
    name: bossData.name,
    icon: bossData.icon,
    grade: bossData.mercGrade,
    class: bossData.mercClass,
    hp: bossData.baseStats.hp,
    atk: bossData.baseStats.atk,
    def: bossData.baseStats.def,
    spd: bossData.baseStats.spd,
    level: 1,
    uniqueSkill: bossData.uniqueSkill,
    evolutionStage: 0,
    evolutionLine: bossData.evolution,
    captured: true,
    capturedAt: Date.now(),
    emotion: 'fear', // 포획 직후는 공포 상태
    lore: bossData.lore,
  };

  const mercs = player.mercenaries = player.mercenaries || [];
  mercs.push(newMerc);

  return { ok: true, merc: newMerc, rate: Math.round(rate * 100) };
}

function evolveCaptured(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId && m.captured);
  if (!merc) return { ok: false, reason: '포획 용병 없음' };
  const stage = merc.evolutionStage || 0;
  if (stage >= 2) return { ok: false, reason: '최종 진화 완료' };
  const cost = EVOLUTION_COSTS[stage + 1];
  if ((merc.level || 1) < cost.level) return { ok: false, reason: `레벨 ${cost.level} 필요` };
  if ((player.gold || 0) < cost.gold) return { ok: false, reason: '골드 부족' };

  player.gold -= cost.gold;
  merc.evolutionStage = stage + 1;
  merc.name = merc.evolutionLine[stage + 1] || merc.name;
  merc.hp = Math.floor(merc.hp * 1.4);
  merc.atk = Math.floor(merc.atk * 1.3);
  merc.def = Math.floor(merc.def * 1.3);

  return { ok: true, merc, newName: merc.name, stage: stage + 1 };
}

function register(io, socket, player) {
  socket.on('io_boss_capture', (data) => {
    const result = attemptCapture(player, data.bossId, data.itemId);
    socket.emit('io_boss_capture_result', result);
    if (result.ok) {
      io.emit('server_msg', `🎯 [보스 포획] ${player.name}이(가) "${result.merc.name}"을(를) 포획했다! (확률 ${result.rate}%)`);
    }
  });

  socket.on('io_boss_evolve', (data) => {
    const result = evolveCaptured(player, data.mercId);
    socket.emit('io_boss_evolve_result', result);
    if (result.ok) {
      io.emit('server_msg', `🐲 [진화] ${player.name}의 포획 용병이 "${result.newName}"(으)로 진화!`);
    }
  });

  socket.on('io_capturable_list', () => {
    socket.emit('io_capturable_list', {
      bosses: CAPTURABLE_BOSSES.map(b => ({ bossId: b.bossId, name: b.name, icon: b.icon, grade: b.mercGrade, rate: b.captureRate })),
      items: CAPTURE_ITEMS,
    });
  });
}

module.exports = {
  CAPTURABLE_BOSSES, CAPTURE_ITEMS, CAPTURE_HP_THRESHOLD, BASE_CAPTURE_RATE, EVOLUTION_COSTS,
  attemptCapture, evolveCaptured, register,
};
