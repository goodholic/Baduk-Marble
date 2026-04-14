// v5.8 — IO 왕관 쟁탈전 모드
// 맵 중앙 왕관 쟁탈, 왕관 착용자 = 강화+타겟, 최장 보유 승리

const MATCH_DURATION = 300; // 5분
const CROWN_SPAWN_DELAY = 30; // 30초 후 왕관 스폰

// 왕관 효과 (착용자)
const CROWN_EFFECTS = {
  buff: { atk: 1.3, def: 1.2, spd: 0.9, hp: 1.5 },
  debuff: { visibility: 1.0, marked: true }, // 모든 플레이어에게 위치 공개
  perSecond: { gold: 100, score: 1 }, // 초당 골드+점수
  dropOnDeath: true, // 사망 시 왕관 드롭
};

// 왕관 진화 (연속 보유 시간에 따라)
const CROWN_EVOLUTION = [
  { holdTime: 0,   name: '청동 왕관', icon: '👑🥉', atkMul: 1.3, aura: 'none' },
  { holdTime: 30,  name: '은 왕관', icon: '👑🥈', atkMul: 1.5, aura: '주변 적 이동속도 -10%' },
  { holdTime: 60,  name: '금 왕관', icon: '👑🏅', atkMul: 1.8, aura: '주변 아군 ATK+10%' },
  { holdTime: 90,  name: '다이아 왕관', icon: '👑💎', atkMul: 2.0, aura: '주변 적 DEF-15%' },
  { holdTime: 120, name: '전설의 왕관', icon: '👑🌟', atkMul: 2.5, aura: '불사 오라 (3초 무적/30초)' },
];

// 왕관 챌린저 이벤트 (보유자에게 도전)
const CROWN_EVENTS = [
  { time: 60, name: '왕좌의 도전자', desc: '강력 NPC가 왕관 보유자 공격!', npcHp: 5000, npcAtk: 200 },
  { time: 120, name: '왕의 시련', desc: '왕관 보유자 30초간 ATK -50%', effect: 'debuff' },
  { time: 180, name: '왕관 불안정', desc: '왕관이 흔들린다! 10초 후 랜덤 위치로 이동', effect: 'teleport_crown' },
  { time: 240, name: '최후의 격돌', desc: '모든 플레이어에게 왕관 보유자 방향 표시 + ATK+20%', effect: 'all_buff' },
];

// 보상
const CTC_REWARDS = {
  king:   { gold: 50000, diamonds: 100, title: '왕관의 주인', frame: 'crown_king' },
  top3:   { gold: 20000, diamonds: 50 },
  top5:   { gold: 10000, diamonds: 20 },
  killer: { gold: 5000, desc: '왕관 보유자 처치 시 보너스' },
};

// 특수 왕관 스킨 (연속 우승)
const CROWN_SKINS = [
  { wins: 1, name: '기본 왕관', icon: '👑' },
  { wins: 3, name: '화염 왕관', icon: '👑🔥' },
  { wins: 5, name: '빙결 왕관', icon: '👑❄️' },
  { wins: 10, name: '번개 왕관', icon: '👑⚡' },
  { wins: 20, name: '우주 왕관', icon: '👑🌌' },
  { wins: 50, name: '신의 왕관', icon: '👑🌟', desc: '최고 영예!' },
];

function register(io, socket, player) {
  socket.on('ctc_info', () => {
    socket.emit('ctc_info', {
      crownEffects: CROWN_EFFECTS, evolution: CROWN_EVOLUTION,
      events: CROWN_EVENTS, rewards: CTC_REWARDS, skins: CROWN_SKINS,
      duration: MATCH_DURATION, spawnDelay: CROWN_SPAWN_DELAY,
    });
  });
  socket.on('ctc_join', () => {
    socket.emit('ctc_join_result', { ok: true });
    io.emit('server_msg', `👑 [왕관 쟁탈전] ${player.name}이(가) 참가! 왕관을 차지하라!`);
  });
}

module.exports = { CROWN_EFFECTS, CROWN_EVOLUTION, CROWN_EVENTS, CTC_REWARDS, CROWN_SKINS, register };
