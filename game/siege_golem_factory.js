// v6.2 — 공성전 골렘 공장 시스템
// 골렘 제작+커스터마이징+공성전 투입, 거대 골렘 합체

const GOLEM_TYPES = [
  { id: 'stone_golem', name: '석골렘', icon: '🗿', hp: 10000, atk: 200, spd: 2, cost: 15000, parts: 3, desc: '기본 골렘' },
  { id: 'iron_golem', name: '철골렘', icon: '🤖', hp: 18000, atk: 350, spd: 3, cost: 30000, parts: 4, desc: '강화 골렘' },
  { id: 'crystal_golem', name: '수정 골렘', icon: '💎🗿', hp: 12000, atk: 400, spd: 4, cost: 45000, parts: 4, desc: '마법 특화', magicAmplify: 1.3 },
  { id: 'lava_golem', name: '용암 골렘', icon: '🌋🗿', hp: 25000, atk: 500, spd: 2, cost: 60000, parts: 5, desc: '화염 방사+자폭 가능' },
  { id: 'shadow_golem', name: '그림자 골렘', icon: '🌑🗿', hp: 15000, atk: 300, spd: 6, cost: 50000, parts: 4, desc: '은신 골렘, 기습 특화' },
  { id: 'titan_golem', name: '타이탄 골렘', icon: '🗿👑', hp: 50000, atk: 800, spd: 1, cost: 150000, parts: 6, desc: '거대 골렘! 성벽 즉파', legendary: true },
];

// 골렘 파츠 (커스터마이징)
const GOLEM_PARTS = {
  head:  [{ name: '탐색 눈', effect: '함정 탐지' }, { name: '뿔', effect: '돌격 DMG+30%' }, { name: '마법 눈', effect: '마법 DMG+20%' }],
  body:  [{ name: '강화 갑옷', effect: 'DEF+25%' }, { name: '가시 갑옷', effect: '반사 DMG 15%' }, { name: '자폭 코어', effect: '파괴 시 범위 폭발' }],
  arms:  [{ name: '파쇄 주먹', effect: '구조물 DMG+50%' }, { name: '방패 팔', effect: '전방 DMG -40%' }, { name: '캐논 팔', effect: '원거리 포격' }],
  legs:  [{ name: '강화 다리', effect: 'SPD+30%' }, { name: '앵커 다리', effect: '넉백 면역' }, { name: '호버', effect: '지형 무시' }],
  core:  [{ name: '마력 코어', effect: '마법 증폭 30%' }, { name: '생명 코어', effect: 'HP 재생 2%/초' }, { name: '광폭 코어', effect: 'HP↓시 ATK↑↑' }],
  weapon:[{ name: '대검', effect: '근접 범위 공격' }, { name: '대포', effect: '장거리 포격' }, { name: '화염방사기', effect: '전방 화염 DOT' }],
};

// 골렘 합체 (2체 → 거대 골렘)
const GOLEM_FUSIONS = [
  { a: 'stone_golem', b: 'iron_golem', result: { name: '강철석 거신', hp: 35000, atk: 600 }, icon: '🗿🤖' },
  { a: 'crystal_golem', b: 'lava_golem', result: { name: '마그마 결정 거신', hp: 40000, atk: 700, aoe: true }, icon: '💎🌋' },
  { a: 'shadow_golem', b: 'titan_golem', result: { name: '그림자 타이탄', hp: 60000, atk: 1000, stealth: true }, icon: '🌑🗿👑', legendary: true },
];

// 골렘 AI 명령
const GOLEM_COMMANDS = [
  { id: 'attack_wall', name: '성벽 공격', icon: '🗿→🧱', desc: '성벽 우선 파괴' },
  { id: 'guard', name: '방어', icon: '🗿🛡️', desc: '지정 지점 수호' },
  { id: 'charge', name: '돌격', icon: '🗿💨', desc: '직선 돌격 (넉백)' },
  { id: 'self_destruct', name: '자폭', icon: '🗿💥', desc: '범위 대폭발 (골렘 파괴)' },
  { id: 'patrol', name: '순찰', icon: '🗿🔄', desc: '경로 순찰, 적 발견 시 공격' },
];

function buildGolem(player, golemType, parts) {
  const golem = GOLEM_TYPES.find(g => g.id === golemType);
  if (!golem) return { ok: false, reason: '알 수 없는 골렘' };
  if ((player.gold || 0) < golem.cost) return { ok: false, reason: '골드 부족' };
  player.gold -= golem.cost;
  player.golems = player.golems || [];
  player.golems.push({ ...golem, id: `golem_${Date.now()}`, customParts: parts || {}, builtAt: Date.now() });
  return { ok: true, golem: golem.name };
}

function register(io, socket, player) {
  socket.on('golem_info', () => {
    socket.emit('golem_info', { types: GOLEM_TYPES, parts: GOLEM_PARTS, fusions: GOLEM_FUSIONS, commands: GOLEM_COMMANDS, owned: player.golems || [] });
  });
  socket.on('golem_build', (data) => {
    const result = buildGolem(player, data.golemType, data.parts);
    socket.emit('golem_build_result', result);
    if (result.ok) io.emit('server_msg', `🗿 [골렘] ${player.name}이(가) "${result.golem}" 제작!`);
  });
}

module.exports = { GOLEM_TYPES, GOLEM_PARTS, GOLEM_FUSIONS, GOLEM_COMMANDS, buildGolem, register };
