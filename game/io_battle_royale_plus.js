// v5.7 — IO 배틀로얄+ (강화판)
// 100인 배틀로얄, 자기장 수축, 보급 상자, 용병 소환, 차량

const MAX_PLAYERS = 100;
const MATCH_DURATION = 600; // 10분

// 자기장 단계
const ZONE_PHASES = [
  { phase: 1, time: 0,   radius: 1000, dmg: 5,   desc: '초기 — 넓은 안전 구역' },
  { phase: 2, time: 120, radius: 700,  dmg: 10,  desc: '1차 수축' },
  { phase: 3, time: 240, radius: 450,  dmg: 20,  desc: '2차 수축' },
  { phase: 4, time: 360, radius: 250,  dmg: 40,  desc: '3차 수축' },
  { phase: 5, time: 480, radius: 100,  dmg: 80,  desc: '최종 수축' },
  { phase: 6, time: 540, radius: 30,   dmg: 200, desc: '결전 구역!' },
];

// 보급 상자 (맵에 랜덤 스폰)
const SUPPLY_DROPS = [
  { id: 'weapon_crate', name: '무기 상자', icon: '📦⚔️', contains: ['전설 무기', 'ATK+30% 포션'], rarity: 'common' },
  { id: 'armor_crate', name: '방어구 상자', icon: '📦🛡️', contains: ['강화 갑옷', 'DEF+25% 포션'], rarity: 'common' },
  { id: 'merc_crate', name: '용병 소환 상자', icon: '📦⚔️🌀', contains: ['임시 용병 소환권 1회'], rarity: 'uncommon' },
  { id: 'vehicle_crate', name: '탈것 상자', icon: '📦🐴', contains: ['전투 마차', '비행 수정'], rarity: 'uncommon' },
  { id: 'legendary_crate', name: '전설 보급', icon: '📦👑', contains: ['신화 무기 or 초월 방어구'], rarity: 'rare' },
  { id: 'air_drop', name: '에어드롭', icon: '🪂📦', contains: ['최강 장비 세트 + 부활 아이템'], rarity: 'epic', announced: true },
];

// 탈것 시스템
const VEHICLES = [
  { id: 'horse', name: '전투마', icon: '🐴', spd: 8, hp: 500, passengers: 1, weapon: false },
  { id: 'war_chariot', name: '전투 마차', icon: '🛞⚔️', spd: 6, hp: 1500, passengers: 2, weapon: '전방 화살 발사' },
  { id: 'flying_carpet', name: '비행 양탄자', icon: '🧞‍♂️', spd: 10, hp: 300, passengers: 1, weapon: false, flying: true },
  { id: 'siege_tank', name: '공성 전차', icon: '🛡️🛞', spd: 3, hp: 5000, passengers: 3, weapon: '대포 (범위 DMG)' },
  { id: 'dragon_mount', name: '드래곤 탑승', icon: '🐲🧑', spd: 12, hp: 2000, passengers: 1, weapon: '화염 브레스', rarity: 'legendary' },
];

// 배틀로얄 전용 이벤트
const BR_EVENTS = [
  { id: 'supply_wave', time: 60, desc: '보급 물결! 상자 10개 동시 투하', icon: '🪂🪂🪂' },
  { id: 'boss_spawn', time: 180, desc: '필드 보스 출현! 처치 시 최강 장비', icon: '👹' },
  { id: 'red_zone', time: 120, desc: '폭격 구역! 지정 범위 대량 폭격', icon: '💣🔴' },
  { id: 'fog', time: 240, desc: '안개! 30초간 시야 50% 감소', icon: '🌫️' },
  { id: 'merc_frenzy', time: 300, desc: '용병 폭주! 전원 용병 소환 쿨다운 리셋', icon: '⚔️🌀' },
  { id: 'final_showdown', time: 480, desc: '최후의 결전! 생존자 위치 전부 공개!', icon: '👁️📍' },
];

// 보상 (등수별)
const BR_REWARDS = {
  chicken_dinner: { rank: 1, reward: { gold: 100000, diamonds: 200, title: '배틀로얄 왕', frame: 'br_champion' } },
  top3:  { reward: { gold: 50000, diamonds: 100 } },
  top10: { reward: { gold: 20000, diamonds: 50 } },
  top25: { reward: { gold: 10000, diamonds: 20 } },
  top50: { reward: { gold: 5000, diamonds: 10 } },
};

// 킬 보너스
const KILL_BONUSES = {
  perKill: { gold: 1000, exp: 100 },
  streak3: { bonus: 'ATK+10% (30초)' },
  streak5: { bonus: '자기장 DMG 면역 (20초)' },
  streak10: { bonus: '전설 장비 즉시 획득', title: '학살왕' },
};

function register(io, socket, player) {
  socket.on('br_info', () => {
    socket.emit('br_info', { zones: ZONE_PHASES, supplies: SUPPLY_DROPS, vehicles: VEHICLES, events: BR_EVENTS, rewards: BR_REWARDS, killBonuses: KILL_BONUSES, maxPlayers: MAX_PLAYERS });
  });
  socket.on('br_join', () => {
    socket.emit('br_join_result', { ok: true });
    io.emit('server_msg', `🏆 [배틀로얄] ${player.name}이(가) 100인 배틀로얄 참가!`);
  });
}

module.exports = { ZONE_PHASES, SUPPLY_DROPS, VEHICLES, BR_EVENTS, BR_REWARDS, KILL_BONUSES, MAX_PLAYERS, register };
