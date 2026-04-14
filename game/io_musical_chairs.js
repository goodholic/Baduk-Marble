// v6.8 — IO 뮤지컬 체어 (의자 뺏기 전투 버전)
// 음악 멈추면 안전지대 축소, 자리 못 잡으면 탈락, PvP

const MAX_PLAYERS = 20;
const ROUNDS = 10;
const MUSIC_DURATION = { min: 10, max: 25 }; // 10~25초 랜덤

const CHAIR_MAPS = [
  { id: 'royal_hall', name: '왕궁 대전', icon: '🏛️🪑', chairs: 19, desc: '호화로운 왕궁에서의 의자 쟁탈' },
  { id: 'pirate_deck', name: '해적선 갑판', icon: '🏴‍☠️🪑', chairs: 15, desc: '흔들리는 배 위! 균형 유지' },
  { id: 'floating_chairs', name: '부유 의자', icon: '☁️🪑', chairs: 18, desc: '공중에 떠있는 의자, 낙사 위험' },
  { id: 'lava_chairs', name: '용암 의자', icon: '🌋🪑', chairs: 16, desc: '바닥이 용암! 의자 위만 안전!' },
  { id: 'ice_chairs', name: '빙판 의자', icon: '❄️🪑', chairs: 17, desc: '미끄러운 빙판, 의자도 미끄러짐!' },
];

// 특수 의자 (랜덤 출현)
const SPECIAL_CHAIRS = [
  { id: 'throne', name: '왕좌', icon: '👑🪑', effect: '착석 시 ATK+30% (다음 라운드)', rarity: 0.1 },
  { id: 'ejector', name: '사출 의자', icon: '🪑💨', effect: '착석 시 다음 라운드 시작 위치 랜덤!', rarity: 0.15 },
  { id: 'healer_chair', name: '치유 의자', icon: '🪑💚', effect: 'HP 전체 회복', rarity: 0.1 },
  { id: 'cursed_chair', name: '저주 의자', icon: '🪑💀', effect: '착석 시 SPD -30% (다음 라운드)', rarity: 0.08 },
  { id: 'gold_chair', name: '황금 의자', icon: '🪑💰', effect: '골드 5000 획득', rarity: 0.05 },
  { id: 'invisible_chair', name: '투명 의자', icon: '🪑👻', effect: '보이지 않는 의자! 먼저 찾아라!', rarity: 0.07 },
  { id: 'explosive_chair', name: '폭발 의자', icon: '🪑💣', effect: '5초 후 폭발! 빨리 떠나라!', rarity: 0.05 },
];

// 음악 종류 (라운드마다 변경)
const MUSIC_TYPES = [
  { id: 'march', name: '행진곡', icon: '🎵🥁', spd: 1.0, desc: '표준 속도' },
  { id: 'waltz', name: '왈츠', icon: '🎵💃', spd: 0.8, desc: '느린 리듬, 여유로움' },
  { id: 'rock', name: '록', icon: '🎵🎸', spd: 1.3, desc: '빠른 리듬! 긴장감 UP' },
  { id: 'chaos', name: '혼돈의 음악', icon: '🎵🌀', spd: 'random', desc: '속도 랜덤 변경!' },
  { id: 'silence', name: '무음', icon: '🔇', spd: 1.0, desc: '카운트다운 없이 갑자기 멈춤!', surprise: true },
];

// 전투 액션 (음악 재생 중)
const COMBAT_ACTIONS = [
  { id: 'push', name: '밀치기', icon: '💪', cooldown: 5, desc: '상대를 밀어 의자에서 떼어냄' },
  { id: 'tackle', name: '태클', icon: '🦶', cooldown: 8, desc: '달려가서 태클! 넘어뜨림' },
  { id: 'grab_chair', name: '의자 확보', icon: '🤲🪑', cooldown: 3, desc: '의자에 미리 손 올려놓기' },
  { id: 'block', name: '방어', icon: '🛡️', cooldown: 6, desc: '밀치기/태클 방어' },
  { id: 'decoy', name: '가짜 앉기', icon: '🎭', cooldown: 10, desc: '앉는 척하고 상대 유인' },
  { id: 'sprint', name: '대시', icon: '💨', cooldown: 8, desc: '순간 가속으로 의자 선점!' },
];

// 보상
const CHAIR_REWARDS = {
  winner:  { gold: 20000, exp: 2000, title: '의자의 왕', frame: 'chair_king' },
  top3:    { gold: 10000, exp: 1000 },
  top5:    { gold: 5000, exp: 500 },
  throne:  { gold: 5000, desc: '왕좌 착석 보너스' },
  last_standing: { gold: 3000, desc: '마지막까지 서있기' },
};

function register(io, socket, player) {
  socket.on('musical_chairs_info', () => {
    socket.emit('musical_chairs_info', { maps: CHAIR_MAPS, specialChairs: SPECIAL_CHAIRS, music: MUSIC_TYPES, actions: COMBAT_ACTIONS, rewards: CHAIR_REWARDS, rounds: ROUNDS });
  });
  socket.on('musical_chairs_join', (data) => {
    socket.emit('musical_chairs_join_result', { ok: true, map: CHAIR_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `🪑🎵 [뮤지컬 체어] ${player.name}이(가) 참가! 음악이 멈추면 앉아라!`);
  });
}

module.exports = { CHAIR_MAPS, SPECIAL_CHAIRS, MUSIC_TYPES, COMBAT_ACTIONS, CHAIR_REWARDS, ROUNDS, register };
