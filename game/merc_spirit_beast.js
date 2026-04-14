// v6.1 — 용병 정령수 시스템
// 각 용병에게 정령수(수호 정령 동물) 소환, 합체 강화, 정령수 진화

const MAX_SPIRIT_LEVEL = 10;

const SPIRIT_BEASTS = [
  { id: 'phoenix', name: '불사조 정령', icon: '🔥🐦', element: 'fire', baseAtk: 80, baseHp: 2000,
    passiveAura: '아군 화DMG+15%', activeSkill: { name: '부활의 불꽃', desc: '주인 사망 시 자동 부활(전투당 1회)', cooldown: 0 },
    evolution: ['불씨 정령', '화염 정령', '불사조 정령', '영원의 불사조'], maxEvo: 3 },
  { id: 'leviathan', name: '리바이어선 정령', icon: '🌊🐍', element: 'water', baseAtk: 60, baseHp: 3000,
    passiveAura: '아군 수DMG+15%, HP재생+3%', activeSkill: { name: '해일', desc: '적 전원 넉백+수속성 DMG', cooldown: 30 },
    evolution: ['물방울 정령', '파도 정령', '리바이어선 정령', '심해의 군주'], maxEvo: 3 },
  { id: 'thunderbird', name: '썬더버드 정령', icon: '⚡🦅', element: 'thunder', baseAtk: 100, baseHp: 1500,
    passiveAura: '아군 공속+10%, 크리+8%', activeSkill: { name: '뇌격', desc: '최대HP 대상에게 번개 집중(HP 15% DMG)', cooldown: 25 },
    evolution: ['전기 참새', '번개 매', '썬더버드', '뇌신조'], maxEvo: 3 },
  { id: 'earth_titan', name: '대지 타이탄 정령', icon: '🌍🐢', element: 'earth', baseAtk: 40, baseHp: 5000,
    passiveAura: '아군 DEF+20%, 넉백 면역', activeSkill: { name: '대지의 방벽', desc: '전원 보호막(HP 30%) 10초', cooldown: 40 },
    evolution: ['돌멩이 정령', '바위 정령', '대지 타이탄', '세계의 등'], maxEvo: 3 },
  { id: 'shadow_wolf', name: '그림자 늑대 정령', icon: '🌑🐺', element: 'dark', baseAtk: 90, baseHp: 1800,
    passiveAura: '아군 은신시간+2초, 크리DMG+20%', activeSkill: { name: '그림자 습격', desc: '은신 후 적 후방 기습(ATK×3)', cooldown: 20 },
    evolution: ['그림자 강아지', '그림자 늑대', '그림자 왕늑대', '그림자 군주'], maxEvo: 3 },
  { id: 'celestial_dragon', name: '천룡 정령', icon: '✨🐲', element: 'holy', baseAtk: 120, baseHp: 4000,
    passiveAura: '아군 전체+8%', activeSkill: { name: '천상의 브레스', desc: '성스러운 브레스(범위 힐+DMG)', cooldown: 35 },
    evolution: ['빛의 뱀', '성스러운 용', '천룡', '신룡'], maxEvo: 3, legendary: true },
  { id: 'void_kraken', name: '공허 크라켄 정령', icon: '🌀🦑', element: 'void', baseAtk: 110, baseHp: 3500,
    passiveAura: '적 DEF-10%, 방어 관통+15%', activeSkill: { name: '차원 포식', desc: '적 1명 3초 삼킴(행동불가+DOT)', cooldown: 30 },
    evolution: ['공허 촉수', '차원 문어', '공허 크라켄', '심연의 포식자'], maxEvo: 3, legendary: true },
];

// 정령수+용병 합체 (일시적 강화)
const SPIRIT_MERGE = {
  duration: 20, // 20초
  cooldown: 300, // 5분
  bonus: { allStat: 1.5, newForm: true, mergedSkill: true },
  desc: '정령수와 합체! 20초간 전 스탯 1.5배 + 합체 스킬',
};

// 정령수 성장 (먹이/훈련)
const SPIRIT_FEED = {
  basic_food:   { cost: 500, exp: 10, desc: '기본 먹이' },
  magic_food:   { cost: 2000, exp: 30, desc: '마법 먹이' },
  elemental_gem:{ cost: 5000, exp: 80, desc: '원소 보석 (같은 원소 2배 EXP)' },
  spirit_fruit: { cost: 10000, exp: 200, desc: '정령 열매 (최고급)', rarity: 'epic' },
};

// 정령수 레벨 → 스탯 배율
const SPIRIT_LEVEL_SCALE = (lv) => 1 + (lv - 1) * 0.15;

// 정령수 공명 (같은 원소 용병+정령수)
const RESONANCE_BONUS = { sameElement: { allStat: 1.12, skillCooldown: 0.8 }, desc: '같은 원소 = 전체+12%, 쿨-20%' };

function summonSpirit(player, mercId, spiritId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const spirit = SPIRIT_BEASTS.find(s => s.id === spiritId);
  if (!spirit) return { ok: false, reason: '알 수 없는 정령수' };
  merc.spiritBeast = { id: spiritId, level: 1, exp: 0, evoStage: 0, name: spirit.evolution[0] };
  return { ok: true, spirit: merc.spiritBeast, mercName: merc.name };
}

function feedSpirit(player, mercId, foodType) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc?.spiritBeast) return { ok: false, reason: '정령수 없음' };
  const food = SPIRIT_FEED[foodType];
  if (!food) return { ok: false, reason: '알 수 없는 먹이' };
  if ((player.gold || 0) < food.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= food.cost;
  const sb = merc.spiritBeast;
  sb.exp += food.exp;
  const reqExp = sb.level * 100;
  if (sb.exp >= reqExp && sb.level < MAX_SPIRIT_LEVEL) { sb.level++; sb.exp -= reqExp; }
  return { ok: true, spirit: sb };
}

function evolveSpirit(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc?.spiritBeast) return { ok: false, reason: '정령수 없음' };
  const sb = merc.spiritBeast;
  const spiritDef = SPIRIT_BEASTS.find(s => s.id === sb.id);
  if (sb.evoStage >= spiritDef.maxEvo) return { ok: false, reason: '최종 진화' };
  if (sb.level < (sb.evoStage + 1) * 3) return { ok: false, reason: `레벨 ${(sb.evoStage + 1) * 3} 필요` };
  sb.evoStage++;
  sb.name = spiritDef.evolution[sb.evoStage];
  return { ok: true, spirit: sb, newName: sb.name };
}

function register(io, socket, player) {
  socket.on('spirit_beast_info', () => {
    socket.emit('spirit_beast_info', { beasts: SPIRIT_BEASTS, merge: SPIRIT_MERGE, feed: SPIRIT_FEED, resonance: RESONANCE_BONUS });
  });
  socket.on('spirit_beast_summon', (data) => {
    const result = summonSpirit(player, data.mercId, data.spiritId);
    socket.emit('spirit_summon_result', result);
    if (result.ok) io.emit('server_msg', `🐾 [정령수] ${player.name}의 ${result.mercName}에게 정령수 소환!`);
  });
  socket.on('spirit_beast_feed', (data) => {
    socket.emit('spirit_feed_result', feedSpirit(player, data.mercId, data.foodType));
  });
  socket.on('spirit_beast_evolve', (data) => {
    const result = evolveSpirit(player, data.mercId);
    socket.emit('spirit_evolve_result', result);
    if (result.ok) io.emit('server_msg', `✨🐾 [정령수 진화] "${result.newName}"(으)로 진화!`);
  });
}

module.exports = { SPIRIT_BEASTS, SPIRIT_MERGE, SPIRIT_FEED, RESONANCE_BONUS, MAX_SPIRIT_LEVEL, summonSpirit, feedSpirit, evolveSpirit, register };
