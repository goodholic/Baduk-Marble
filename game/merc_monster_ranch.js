// v5.8 — 용병 몬스터 목장 시스템
// 포획한 몬스터를 목장에서 사육, 교배, 레이싱, 전투

const MAX_RANCH_SIZE = 20;

// 목장 시설
const RANCH_FACILITIES = [
  { id: 'stable', name: '마구간', icon: '🏠', maxLv: 5, effect: '수용 몬스터+4/Lv', cost: 5000 },
  { id: 'training_ground', name: '훈련장', icon: '⚔️', maxLv: 5, effect: '몬스터 EXP+10%/Lv', cost: 8000 },
  { id: 'breeding_pen', name: '교배장', icon: '❤️', maxLv: 3, effect: '교배 성공률+10%/Lv', cost: 15000 },
  { id: 'race_track', name: '경주장', icon: '🏁', maxLv: 3, effect: '레이싱 보상+20%/Lv', cost: 20000 },
  { id: 'arena', name: '격투장', icon: '🏟️', maxLv: 3, effect: '전투 EXP+15%/Lv', cost: 25000 },
  { id: 'spa', name: '온천', icon: '♨️', maxLv: 2, effect: '친밀도+5/Lv, 컨디션 회복 2배', cost: 10000 },
];

// 몬스터 레이싱
const RACE_TYPES = [
  { id: 'sprint', name: '단거리 질주', icon: '💨', distance: 500, stat: 'spd', reward: { gold: 5000, exp: 300 } },
  { id: 'obstacle', name: '장애물 경주', icon: '🏔️', distance: 800, stat: 'mixed', reward: { gold: 8000, exp: 500 } },
  { id: 'endurance', name: '지구력 경주', icon: '🏃‍♂️', distance: 2000, stat: 'hp', reward: { gold: 12000, exp: 800 } },
  { id: 'flying', name: '비행 레이스', icon: '🦅', distance: 1500, stat: 'spd', req: 'flying', reward: { gold: 15000, exp: 1000 } },
  { id: 'champion', name: '챔피언 레이스', icon: '🏆', distance: 3000, stat: 'all', reward: { gold: 30000, exp: 2000, title: '레이스 챔피언' } },
];

// 교배 조합 (부모 몬스터에 따라 자식 결정)
const BREEDING_COMBOS = [
  { parentA: 'fire_wolf', parentB: 'ice_hawk', child: 'steam_phoenix', chance: 0.3, icon: '🐦‍🔥💨' },
  { parentA: 'earth_bear', parentB: 'thunder_cat', child: 'storm_golem', chance: 0.25, icon: '⛈️🗿' },
  { parentA: 'dragon_whelp', parentB: 'void_serpent', child: 'chaos_dragon', chance: 0.1, icon: '🐲💜' },
  { parentA: 'holy_unicorn', parentB: 'shadow_raven', child: 'twilight_pegasus', chance: 0.15, icon: '🦄🌅' },
  { parentA: 'any', parentB: 'any', child: 'random_mutation', chance: 0.05, icon: '❓🧬', desc: '예측 불가! 돌연변이!' },
];

// 몬스터 컨디션
const CONDITIONS = {
  perfect:  { name: '최상', icon: '⭐', statMul: 1.2, desc: '모든 능력 +20%' },
  good:     { name: '양호', icon: '😊', statMul: 1.05, desc: '능력 +5%' },
  normal:   { name: '보통', icon: '😐', statMul: 1.0, desc: '표준' },
  tired:    { name: '피곤', icon: '😴', statMul: 0.8, desc: '능력 -20%, 휴식 필요' },
  sick:     { name: '아픔', icon: '🤒', statMul: 0.5, desc: '능력 -50%, 치료 필요' },
};

function addToRanch(player, monsterId) {
  const ranch = player.ranch = player.ranch || { monsters: [], facilities: {} };
  if (ranch.monsters.length >= MAX_RANCH_SIZE) return { ok: false, reason: '목장 가득 참' };
  ranch.monsters.push({ id: monsterId, condition: 'normal', happiness: 50, addedAt: Date.now() });
  return { ok: true };
}

function breed(player, monsterIdA, monsterIdB) {
  const ranch = player.ranch;
  if (!ranch) return { ok: false, reason: '목장 없음' };
  const combo = BREEDING_COMBOS.find(c =>
    (c.parentA === monsterIdA && c.parentB === monsterIdB) ||
    (c.parentA === monsterIdB && c.parentB === monsterIdA) ||
    c.parentA === 'any'
  );
  if (!combo) return { ok: false, reason: '교배 불가 조합' };
  const success = Math.random() < combo.chance;
  if (success) {
    ranch.monsters.push({ id: combo.child, condition: 'perfect', happiness: 100, born: Date.now(), parents: [monsterIdA, monsterIdB] });
    return { ok: true, child: combo.child, icon: combo.icon };
  }
  return { ok: true, child: null, failed: true };
}

function register(io, socket, player) {
  socket.on('ranch_info', () => {
    socket.emit('ranch_info', { ranch: player.ranch || { monsters: [], facilities: {} }, facilities: RANCH_FACILITIES, races: RACE_TYPES, breeding: BREEDING_COMBOS, conditions: CONDITIONS });
  });
  socket.on('ranch_breed', (data) => {
    const result = breed(player, data.monsterA, data.monsterB);
    socket.emit('ranch_breed_result', result);
    if (result.ok && result.child) io.emit('server_msg', `🧬 [교배] ${player.name}의 목장에서 "${result.child}" 탄생!`);
  });
  socket.on('ranch_race', (data) => {
    const race = RACE_TYPES.find(r => r.id === data.raceType);
    if (!race) return socket.emit('ranch_race_result', { ok: false });
    const won = Math.random() < 0.4;
    socket.emit('ranch_race_result', { ok: true, won, race: race.name, reward: won ? race.reward : null });
    if (won && race.id === 'champion') io.emit('server_msg', `🏆 [레이싱] ${player.name}의 몬스터가 챔피언 레이스 우승!`);
  });
}

module.exports = { RANCH_FACILITIES, RACE_TYPES, BREEDING_COMBOS, CONDITIONS, MAX_RANCH_SIZE, addToRanch, breed, register };
