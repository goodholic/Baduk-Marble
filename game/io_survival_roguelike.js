// v5.4 — IO 서바이벌 로그라이크 모드
// 매 판마다 랜덤 강화, 릴릭 선택, 영구 사망, 엔드리스

const MAX_WAVES = 99;
const WAVE_INTERVAL = 20; // 20초마다 새 웨이브

// 강화 선택지 (웨이브 클리어마다 3택 1)
const UPGRADES = [
  // 공격
  { id: 'atk_up', name: 'ATK+15%', icon: '⚔️', rarity: 'common', effect: { atkMul: 1.15 } },
  { id: 'crit_up', name: 'CRIT+10%', icon: '💥', rarity: 'common', effect: { critMul: 1.1 } },
  { id: 'multi_hit', name: '다단 히트', icon: '⚔️⚔️', rarity: 'uncommon', effect: { multiHit: 2 } },
  { id: 'life_steal', name: '흡혈 10%', icon: '🩸', rarity: 'uncommon', effect: { lifeSteal: 0.1 } },
  { id: 'chain_lightning', name: '연쇄 번개', icon: '⚡', rarity: 'rare', effect: { chainDmg: 0.5, chainCount: 3 } },
  { id: 'execute', name: '처형 (HP20%↓ 즉사)', icon: '💀', rarity: 'epic', effect: { executeThreshold: 0.2 } },
  // 방어
  { id: 'hp_up', name: 'HP+20%', icon: '❤️', rarity: 'common', effect: { hpMul: 1.2 } },
  { id: 'def_up', name: 'DEF+15%', icon: '🛡️', rarity: 'common', effect: { defMul: 1.15 } },
  { id: 'thorns', name: '가시 반사 20%', icon: '🌵', rarity: 'uncommon', effect: { thornsDmg: 0.2 } },
  { id: 'shield', name: '보호막 (HP 30%)', icon: '🔰', rarity: 'rare', effect: { shield: 0.3 } },
  { id: 'revive', name: '부활 1회', icon: '💫', rarity: 'epic', effect: { revive: 1 } },
  // 특수
  { id: 'spd_up', name: 'SPD+20%', icon: '💨', rarity: 'common', effect: { spdMul: 1.2 } },
  { id: 'gold_magnet', name: '골드 수집 범위 2배', icon: '💰', rarity: 'common', effect: { goldRange: 2.0 } },
  { id: 'merc_summon', name: '용병 자동 소환', icon: '⚔️🌀', rarity: 'rare', effect: { autoSummon: true } },
  { id: 'time_slow', name: '시간 감속 15%', icon: '⏰', rarity: 'epic', effect: { timeSlow: 0.85 } },
  { id: 'infinity', name: '무한 탄환', icon: '♾️', rarity: 'legendary', effect: { infiniteAmmo: true } },
];

// 릴릭 (10웨이브마다 전설급 선택)
const RELICS = [
  { id: 'crown_of_greed', name: '탐욕의 왕관', icon: '👑💰', effect: '킬당 골드 3배, 피격 DMG+50%', rarity: 'legendary' },
  { id: 'berserker_mask', name: '광전사의 가면', icon: '👹', effect: 'HP 낮을수록 ATK↑ (최대 3배)', rarity: 'legendary' },
  { id: 'phoenix_feather', name: '불사조의 깃털', icon: '🔥🪶', effect: '사망 시 3초 무적 부활', rarity: 'legendary' },
  { id: 'void_orb', name: '공허의 구슬', icon: '🌀', effect: '킬 시 5% 확률 블랙홀 생성', rarity: 'mythic' },
  { id: 'time_crown', name: '시간의 관', icon: '⏰👑', effect: '매 30초 모든 쿨다운 리셋', rarity: 'mythic' },
  { id: 'god_hand', name: '신의 손', icon: '✋🌟', effect: '모든 강화 효과 2배', rarity: 'mythic' },
];

// 웨이브별 적 스케일링
const WAVE_SCALING = {
  hpMul: (wave) => 1 + wave * 0.15,
  atkMul: (wave) => 1 + wave * 0.1,
  count: (wave) => Math.min(30, 5 + Math.floor(wave * 0.8)),
  bossEvery: 10,
  eliteEvery: 5,
};

// 로그라이크 보상 (최종 웨이브 기준)
const ROGUELIKE_REWARDS = [
  { waves: 10, reward: { gold: 5000, exp: 500 } },
  { waves: 20, reward: { gold: 15000, exp: 1500, item: '강화석' } },
  { waves: 30, reward: { gold: 30000, exp: 3000, item: '각성석' } },
  { waves: 50, reward: { gold: 60000, exp: 6000, item: '전설 장비 상자' } },
  { waves: 75, reward: { gold: 100000, exp: 10000, item: '신화 장비 상자' } },
  { waves: 99, reward: { gold: 200000, exp: 20000, item: '초월 장비 상자', title: '로그라이크 마스터' } },
];

function rollUpgrades(wave) {
  const pool = UPGRADES.filter(u => {
    if (u.rarity === 'epic' && wave < 15) return false;
    if (u.rarity === 'legendary' && wave < 30) return false;
    return true;
  });
  const picks = [];
  while (picks.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

function rollRelic() {
  const r = Math.random();
  const pool = r < 0.2 ? RELICS.filter(r => r.rarity === 'mythic') : RELICS.filter(r => r.rarity === 'legendary');
  return pool[Math.floor(Math.random() * pool.length)];
}

function register(io, socket, player) {
  socket.on('roguelike_start', () => {
    player.roguelike = { wave: 0, upgrades: [], relics: [], startTime: Date.now() };
    socket.emit('roguelike_start', { ok: true });
  });
  socket.on('roguelike_wave_clear', () => {
    const rg = player.roguelike;
    if (!rg) return socket.emit('roguelike_wave_result', { ok: false });
    rg.wave++;
    const choices = rollUpgrades(rg.wave);
    const relic = (rg.wave % 10 === 0) ? rollRelic() : null;
    const reward = ROGUELIKE_REWARDS.filter(r => rg.wave >= r.waves).pop();
    socket.emit('roguelike_wave_result', { ok: true, wave: rg.wave, choices, relic, reward, scaling: { hp: WAVE_SCALING.hpMul(rg.wave), atk: WAVE_SCALING.atkMul(rg.wave), count: WAVE_SCALING.count(rg.wave) } });
    if (rg.wave % 25 === 0) {
      io.emit('server_msg', `🌀 [로그라이크] ${player.name}이(가) 웨이브 ${rg.wave} 돌파!`);
    }
  });
  socket.on('roguelike_choose', (data) => {
    const rg = player.roguelike;
    if (!rg) return;
    if (data.upgradeId) rg.upgrades.push(data.upgradeId);
    if (data.relicId) rg.relics.push(data.relicId);
    socket.emit('roguelike_chosen', { ok: true });
  });
  socket.on('roguelike_info', () => {
    socket.emit('roguelike_info', { upgrades: UPGRADES, relics: RELICS, rewards: ROGUELIKE_REWARDS });
  });
}

module.exports = { UPGRADES, RELICS, WAVE_SCALING, ROGUELIKE_REWARDS, MAX_WAVES, rollUpgrades, rollRelic, register };
