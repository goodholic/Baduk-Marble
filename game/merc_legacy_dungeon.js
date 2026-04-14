// v5.2 — 유산 던전 시스템
// 세대 계승 용병 전용 던전, 조상의 기억을 통해 특수 보상 획득

const MAX_FLOORS = 100;

// 유산 던전 층별 테마
const DUNGEON_THEMES = [
  { floors: [1, 10],   name: '조상의 기억', icon: '🏛️', enemies: 'normal', desc: '1세대의 기억이 담긴 층' },
  { floors: [11, 25],  name: '시련의 회랑', icon: '⚔️', enemies: 'elite', desc: '전사의 시련이 기다리는 곳' },
  { floors: [26, 40],  name: '지혜의 서고', icon: '📚', enemies: 'magic', desc: '마법적 수수께끼와 퍼즐' },
  { floors: [41, 60],  name: '영혼의 심연', icon: '👻', enemies: 'undead', desc: '죽은 선조의 영혼과 대면' },
  { floors: [61, 80],  name: '운명의 교차로', icon: '🌀', enemies: 'mixed', desc: '과거와 미래가 교차하는 공간' },
  { floors: [81, 95],  name: '신들의 시험장', icon: '⚡', enemies: 'divine', desc: '신급 존재들의 시험' },
  { floors: [96, 100], name: '태초의 방', icon: '🌟', enemies: 'primordial', desc: '모든 것의 시작, 최종 보상' },
];

// 층별 보스
const FLOOR_BOSSES = {
  10:  { name: '1세대 선조의 환영', hp: 5000, atk: 200, reward: { trait: 'ancestor_echo', gold: 10000 } },
  25:  { name: '전쟁의 환영', hp: 15000, atk: 400, reward: { skillScroll: true, gold: 30000 } },
  40:  { name: '지혜의 수호자', hp: 20000, atk: 350, reward: { statBook: true, gold: 50000 } },
  60:  { name: '영혼의 군주', hp: 35000, atk: 500, reward: { soulGem: true, gold: 80000 } },
  80:  { name: '운명의 직조자', hp: 50000, atk: 600, reward: { fateThread: true, gold: 120000 } },
  95:  { name: '신의 시종', hp: 80000, atk: 800, reward: { divineShard: true, gold: 200000 } },
  100: { name: '태초의 존재', hp: 150000, atk: 1000, reward: { primordialEssence: true, gold: 500000, title: '태초의 계승자' } },
};

// 유산 던전 전용 보상
const LEGACY_REWARDS = {
  ancestor_echo:     { name: '선조의 메아리', desc: '유전 특성 슬롯+1', type: 'trait_slot' },
  skillScroll:       { name: '비전의 두루마리', desc: '아무 스킬 1개 무료 학습', type: 'skill' },
  statBook:          { name: '지혜의 서', desc: '선택 스탯 영구 +10%', type: 'stat' },
  soulGem:           { name: '영혼 보석', desc: '감정 AI 특수 감정 "각성" 해금', type: 'emotion' },
  fateThread:        { name: '운명의 실', desc: '세대 계승 시 특성 선택 가능 (랜덤X)', type: 'dynasty' },
  divineShard:       { name: '신의 파편', desc: '신화급 장비 제작 재료', type: 'material' },
  primordialEssence: { name: '태초의 정수', desc: '용병 스탯 전체 +15% 영구', type: 'ultimate' },
};

// 던전 특수 이벤트 (층 클리어 시 랜덤)
const DUNGEON_EVENTS = [
  { id: 'ancestor_vision', name: '선조의 환상', chance: 0.10, effect: '다음 5층 ATK+30%', desc: '선조의 힘이 깃든다' },
  { id: 'memory_fragment', name: '기억 조각', chance: 0.15, effect: '유전 특성 경험치+50', desc: '과거의 기억 파편 획득' },
  { id: 'soul_trial', name: '영혼의 시련', chance: 0.08, effect: '미니 보스 출현 (보상 3배)', desc: '갑작스런 시련!' },
  { id: 'time_warp', name: '시간 왜곡', chance: 0.05, effect: '5층 스킵!', desc: '시간이 뒤틀려 앞으로 도약' },
  { id: 'curse', name: '저주', chance: 0.07, effect: '다음 3층 DEF-30%', desc: '고대의 저주에 걸렸다' },
  { id: 'blessing', name: '축복', chance: 0.10, effect: 'HP 전체 회복', desc: '신의 축복으로 완전 회복' },
  { id: 'legacy_chest', name: '유산 상자', chance: 0.06, effect: '희귀 재료 랜덤 1개', desc: '선조가 남긴 보물' },
  { id: 'echo_fight', name: '선조와의 대결', chance: 0.04, effect: '승리 시 영구 ATK+2%', desc: '과거의 자신과 싸운다' },
];

// 세대 보너스 (높은 세대 용병일수록 유리)
const GEN_DUNGEON_BONUS = {
  1: { statMul: 1.0, floorSkip: 0, extraLoot: 0 },
  2: { statMul: 1.1, floorSkip: 0, extraLoot: 0.1 },
  3: { statMul: 1.2, floorSkip: 1, extraLoot: 0.2 },
  4: { statMul: 1.35, floorSkip: 2, extraLoot: 0.3 },
  5: { statMul: 1.5, floorSkip: 3, extraLoot: 0.5 },
};

function startLegacyDungeon(player, mercId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const gen = merc.generation || 1;
  if (gen < 2) return { ok: false, reason: '2세대 이상 용병만 입장 가능' };

  const genBonus = GEN_DUNGEON_BONUS[Math.min(gen, 5)];
  player.legacyDungeon = {
    mercId,
    floor: 1 + genBonus.floorSkip,
    maxFloor: MAX_FLOORS,
    gen,
    genBonus,
    rewards: [],
    startTime: Date.now(),
  };

  return { ok: true, dungeon: player.legacyDungeon };
}

function advanceFloor(player) {
  const dg = player.legacyDungeon;
  if (!dg) return { ok: false, reason: '던전 진행 중 아님' };
  if (dg.floor > MAX_FLOORS) return { ok: false, reason: '최종 층 클리어' };

  const theme = DUNGEON_THEMES.find(t => dg.floor >= t.floors[0] && dg.floor <= t.floors[1]);
  const boss = FLOOR_BOSSES[dg.floor] || null;
  const event = DUNGEON_EVENTS.find(e => Math.random() < e.chance) || null;

  const result = { floor: dg.floor, theme, boss, event };

  if (boss) {
    const reward = { ...boss.reward };
    if (LEGACY_REWARDS[boss.reward.trait]) {
      result.legacyReward = LEGACY_REWARDS[boss.reward.trait];
    }
    dg.rewards.push(reward);
    result.bossReward = reward;
  }

  dg.floor++;
  return { ok: true, ...result };
}

function register(io, socket, player) {
  socket.on('legacy_dungeon_start', (data) => {
    const result = startLegacyDungeon(player, data.mercId);
    socket.emit('legacy_dungeon_start_result', result);
  });

  socket.on('legacy_dungeon_advance', () => {
    const result = advanceFloor(player);
    socket.emit('legacy_dungeon_advance_result', result);
    if (result.boss && result.bossReward) {
      io.emit('server_msg', `🏛️ [유산 던전] ${player.name}이(가) ${result.floor - 1}층 보스 "${result.boss.name}"을 격파!`);
    }
  });

  socket.on('legacy_dungeon_info', () => {
    socket.emit('legacy_dungeon_info', {
      themes: DUNGEON_THEMES,
      bosses: FLOOR_BOSSES,
      rewards: LEGACY_REWARDS,
      genBonus: GEN_DUNGEON_BONUS,
      current: player.legacyDungeon || null,
    });
  });
}

module.exports = {
  MAX_FLOORS, DUNGEON_THEMES, FLOOR_BOSSES, LEGACY_REWARDS, DUNGEON_EVENTS, GEN_DUNGEON_BONUS,
  startLegacyDungeon, advanceFloor, register,
};
