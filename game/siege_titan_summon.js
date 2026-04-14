// v6.6 — 공성전 타이탄 소환
// 초거대 타이탄을 소환하여 성을 공략/수비, 타이탄 vs 타이탄

const TITANS = [
  { id: 'earth_titan', name: '대지의 타이탄', icon: '🗿🌍', hp: 100000, atk: 2000, spd: 1, size: 'colossal', cost: 200000,
    abilities: ['지진 밟기(범위 기절)', '바위 투척(장거리)', '성벽 부수기(HP 무시)'], desc: '성벽을 한 방에 무너뜨리는 거신' },
  { id: 'storm_titan', name: '폭풍의 타이탄', icon: '⛈️🗿', hp: 80000, atk: 1500, spd: 2, size: 'colossal', cost: 180000,
    abilities: ['뇌전 폭풍(전체 범위)', '폭풍 방벽(투사체 차단)', '번개 주먹'], desc: '하늘에서 번개를 내리는 거신' },
  { id: 'fire_titan', name: '화염의 타이탄', icon: '🔥🗿', hp: 90000, atk: 2500, spd: 1, size: 'colossal', cost: 220000,
    abilities: ['화염 브레스(직선 관통)', '용암 웅덩이 생성', '자폭(HP 20%↓ 시)'], desc: '모든 것을 태우는 화염의 거신' },
  { id: 'frost_titan', name: '빙결의 타이탄', icon: '❄️🗿', hp: 120000, atk: 1200, spd: 1, size: 'colossal', cost: 190000,
    abilities: ['빙결 파동(범위 빙결 5초)', '빙벽 생성(경로 차단)', '절대영도(전원 이동불가 3초)'], desc: '모든 것을 얼리는 빙하의 거신' },
  { id: 'void_titan', name: '공허의 타이탄', icon: '🌀🗿', hp: 150000, atk: 1800, spd: 1, size: 'colossal', cost: 300000,
    abilities: ['차원 삼킴(건물 1개 삭제)', '공허 오라(주변 DEF 무시)', '존재 소멸(단일 대상 즉사)'], desc: '존재를 지우는 공허의 거신', legendary: true },
  { id: 'primordial_titan', name: '태초의 타이탄', icon: '🌟🗿👑', hp: 200000, atk: 3000, spd: 1, size: 'colossal', cost: 500000,
    abilities: ['창세의 일격(전체 HP 50%)', '재생(매 10초 HP 5% 회복)', '모든 능력 사용 가능'], desc: '모든 타이탄의 왕', mythic: true },
];

// 타이탄 소환 조건
const SUMMON_REQUIREMENTS = {
  material: '타이탄 코어 ×1 + 원소 결정 ×10',
  time: 60, // 소환 시전 60초 (방해 가능)
  teamRequired: 5, // 최소 5명 동시 의식
  cooldown: 1800, // 30분 쿨다운
};

// 타이탄 대항 수단
const ANTI_TITAN = [
  { id: 'titan_bane', name: '타이탄 사냥꾼', icon: '🏹🗿', desc: '타이탄 특효 무기, DMG ×5', cost: 30000 },
  { id: 'binding_ritual', name: '속박 의식', icon: '⛓️✨', desc: '타이탄 10초 행동불가 (5인 의식)', teamReq: 5 },
  { id: 'rival_titan', name: '대항 타이탄 소환', icon: '🗿⚔️🗿', desc: '타이탄 vs 타이탄! 최고의 대항', cost: 'same' },
  { id: 'achilles_heel', name: '약점 공략', icon: '🎯🗿', desc: '정찰로 약점 발견 → 약점 공격 시 DMG ×10', reqScout: true },
];

// 타이탄 전투 보상
const TITAN_REWARDS = {
  summon_win: { gold: 80000, exp: 8000, title: '타이탄 마스터' },
  defend_vs_titan: { gold: 100000, title: '타이탄 슬레이어', frame: 'titan_slayer' },
  titan_vs_titan: { gold: 150000, title: '신들의 전쟁 목격자', serverEvent: true },
};

function register(io, socket, player) {
  socket.on('titan_info', () => {
    socket.emit('titan_info', { titans: TITANS, requirements: SUMMON_REQUIREMENTS, antiTitan: ANTI_TITAN, rewards: TITAN_REWARDS });
  });
  socket.on('titan_summon', (data) => {
    const titan = TITANS.find(t => t.id === data.titanId);
    if (!titan) return socket.emit('titan_summon_result', { ok: false });
    if ((player.gold || 0) < titan.cost) return socket.emit('titan_summon_result', { ok: false, reason: '골드 부족' });
    player.gold -= titan.cost;
    socket.emit('titan_summon_result', { ok: true, titan: titan.name });
    io.emit('server_msg', `🗿💥 [타이탄!!] ${player.name}이(가) "${titan.name}" 소환!!! 대지가 흔들린다!!!`);
  });
}

module.exports = { TITANS, SUMMON_REQUIREMENTS, ANTI_TITAN, TITAN_REWARDS, register };
