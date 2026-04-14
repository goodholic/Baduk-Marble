// v6.6 — IO 아레나 로얄
// 콜로세움에서 최대 32인 FFA, 축소 아레나, 관중 버프, 쇼맨십

const MAX_PLAYERS = 32;
const MATCH_DURATION = 360;

const ARENA_MAPS = [
  { id: 'colosseum', name: '대 콜로세움', icon: '🏟️👑', size: 800, shrink: true, features: ['관중석', '함정 바닥', '중앙 무기 보급'], desc: '로마 스타일 원형 경기장' },
  { id: 'pit', name: '지옥의 구덩이', icon: '🕳️🔥', size: 600, shrink: true, features: ['용암 테두리', '좁은 공간', '화염 기둥'], desc: '점점 좁아지는 불구덩이' },
  { id: 'floating_arena', name: '부유 아레나', icon: '☁️🏟️', size: 700, shrink: true, features: ['낙사', '이동 플랫폼', '바람'], desc: '하늘 위 경기장, 떨어지면 탈락!' },
  { id: 'ice_arena', name: '빙하 아레나', icon: '❄️🏟️', size: 750, shrink: true, features: ['미끄러움', '빙결 바닥', '빙벽'], desc: '미끄러운 얼음 경기장' },
  { id: 'chaos_arena', name: '혼돈의 아레나', icon: '🌀🏟️', size: 900, shrink: true, features: ['랜덤 규칙 변경', '차원 균열', '랜덤 날씨'], desc: '매 30초 규칙이 바뀐다!' },
];

// 관중 시스템 (관전자가 참가자에게 영향)
const CROWD_EFFECTS = [
  { id: 'cheer', name: '환호', icon: '👏', effect: 'ATK+5% (10초)', desc: '관중이 응원하면 강해진다' },
  { id: 'boo', name: '야유', icon: '👎', effect: 'ATK-5% (10초)', desc: '야유는 사기를 꺾는다' },
  { id: 'throw_item', name: '아이템 투척', icon: '🎁', effect: '랜덤 아이템 1개 지급', desc: '관중이 아이템을 던진다!' },
  { id: 'favorite', name: '인기 투표', icon: '❤️', effect: '최다 득표자 HP 20% 회복', desc: '가장 인기 있는 전사!' },
  { id: 'thumbs_down', name: '처형 투표', icon: '👎💀', effect: '최다 반대표 받으면 HP -30%', desc: '관중이 처형을 원한다!' },
];

// 쇼맨십 (화려한 플레이 → 추가 보상)
const SHOWMANSHIP = [
  { id: 'taunt_kill', name: '도발 후 킬', bonus: { gold: 500, fame: 5 }, desc: '도발 후 3초 내 처치' },
  { id: 'no_damage_kill', name: '무피격 킬', bonus: { gold: 800, fame: 8 }, desc: '한 대도 안 맞고 처치' },
  { id: 'multi_kill', name: '멀티킬', bonus: { gold: 300, fame: 3 }, desc: '5초 내 2킬 이상' },
  { id: 'comeback', name: '역전킬', bonus: { gold: 1000, fame: 10 }, desc: 'HP 10% 이하에서 킬' },
  { id: 'execution', name: '처형', bonus: { gold: 600, fame: 6 }, desc: '궁극기로 마무리' },
  { id: 'perfect_round', name: '퍼펙트 라운드', bonus: { gold: 2000, fame: 20 }, desc: '무피격 라운드 생존' },
];

// 아레나 축소 단계
const SHRINK_PHASES = [
  { time: 0, radius: 400, desc: '초기' },
  { time: 60, radius: 300, desc: '1차 축소' },
  { time: 120, radius: 200, desc: '2차 축소' },
  { time: 180, radius: 130, desc: '3차 축소' },
  { time: 240, radius: 70, desc: '4차 축소' },
  { time: 300, radius: 30, desc: '최종! 극한 밀집' },
];

// 보상
const ARENA_REWARDS = {
  champion: { gold: 50000, exp: 5000, title: '아레나 챔피언', frame: 'gladiator_king', desc: '최후의 1인!' },
  top3:     { gold: 25000, exp: 2500 },
  top8:     { gold: 12000, exp: 1200 },
  top16:    { gold: 6000, exp: 600 },
  showman:  { gold: 10000, title: '쇼맨', desc: '가장 화려한 플레이' },
  crowd_fav:{ gold: 15000, title: '관중의 영웅', desc: '관중 투표 최다' },
};

function register(io, socket, player) {
  socket.on('arena_royale_info', () => {
    socket.emit('arena_royale_info', { maps: ARENA_MAPS, crowd: CROWD_EFFECTS, showmanship: SHOWMANSHIP, shrink: SHRINK_PHASES, rewards: ARENA_REWARDS, maxPlayers: MAX_PLAYERS });
  });
  socket.on('arena_royale_join', (data) => {
    socket.emit('arena_royale_join_result', { ok: true, map: ARENA_MAPS.find(m => m.id === data.mapId) });
    io.emit('server_msg', `🏟️⚔️ [아레나 로얄] ${player.name}이(가) 32인 아레나 참가!`);
  });
  socket.on('arena_royale_crowd', (data) => {
    const effect = CROWD_EFFECTS.find(e => e.id === data.effectId);
    if (effect) socket.emit('arena_crowd_result', { ok: true, effect });
  });
}

module.exports = { ARENA_MAPS, CROWD_EFFECTS, SHOWMANSHIP, SHRINK_PHASES, ARENA_REWARDS, register };
