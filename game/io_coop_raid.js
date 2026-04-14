// v5.3 — IO 협동 레이드 시스템
// 최대 4명이 함께 IO 맵에서 초강력 레이드 보스에 도전

const MAX_PARTY = 4;
const RAID_DURATION = 300; // 5분

// 협동 레이드 보스
const COOP_BOSSES = [
  { id: 'hydra', name: '히드라', icon: '🐍🐍🐍', hp: 200000, atk: 400, phases: 3,
    mechanics: ['머리 재생(HP 20% 이하 시 새 머리 생성)', '독 브레스(전방 부채꼴)', '꼬리 휩쓸기(후방 범위)'],
    reward: { gold: 50000, mercExp: 2000, item: 'hydra_fang' }, difficulty: 6 },
  { id: 'kraken', name: '크라켄', icon: '🦑', hp: 350000, atk: 500, phases: 4,
    mechanics: ['촉수 공격(랜덤 위치 8개)', '먹물(전체 시야 차단 5초)', '소용돌이(중앙 끌어당김)', '분노(HP 30% 이하 ATK 2배)'],
    reward: { gold: 80000, mercExp: 3000, item: 'kraken_tentacle' }, difficulty: 8 },
  { id: 'world_serpent', name: '세계를 감싸는 뱀', icon: '🐍🌍', hp: 500000, atk: 600, phases: 5,
    mechanics: ['몸체 둘러싸기(맵 축소)', '독구름(전체 DOT)', '차원 균열(랜덤 순간이동)', '포식(플레이어 1명 삼킴, 3초)', '최후발악(전체 HP 50%)'],
    reward: { gold: 120000, mercExp: 5000, item: 'serpent_scale' }, difficulty: 9 },
  { id: 'chaos_dragon', name: '혼돈의 용', icon: '🐲💜', hp: 800000, atk: 800, phases: 6,
    mechanics: ['3원소 브레스(화/빙/뇌 랜덤)', '비행(10초 공격 불가)', '꼬리 지진(전체 기절 2초)', '분신(3체, 진짜 1체)', '광역 폭발(8초 카운트다운)', '최종형태(전 스탯 1.5배)'],
    reward: { gold: 200000, mercExp: 8000, item: 'chaos_heart', title: '혼돈을 정복한 자' }, difficulty: 10 },
];

// 파티 역할 보너스
const PARTY_ROLES = {
  dps:    { name: '딜러', bonus: { atkMul: 1.2 }, desc: '데미지 집중' },
  tank:   { name: '탱커', bonus: { defMul: 1.3, aggroMul: 2.0 }, desc: '어그로 유지' },
  healer: { name: '힐러', bonus: { healMul: 1.4 }, desc: '파티 치유' },
  support:{ name: '서포터', bonus: { teamBuff: 1.1 }, desc: '팀 전체 버프' },
};

// 레이드 보상 분배
const LOOT_RULES = {
  equal:    { name: '균등 분배', desc: '모든 보상 4등분' },
  dps_rank: { name: '딜량 순', desc: '딜 기여도에 따라 차등' },
  random:   { name: '주사위', desc: '랜덤으로 1명이 메인 보상' },
  need_greed: { name: '니드/그리드', desc: '필요한 사람 우선 → 나머지 굴림' },
};

// 레이드 중 특수 이벤트
const RAID_EVENTS = [
  { id: 'enrage', time: 240, desc: '보스 분노! ATK 2배 (최후 1분)', effect: 'boss_enrage' },
  { id: 'heal_zone', time: 120, desc: '회복 구역 출현 (15초간)', effect: 'heal_area' },
  { id: 'adds_spawn', time: 60, desc: '잡몹 소환! 5마리', effect: 'spawn_adds' },
  { id: 'vulnerability', time: 180, desc: '보스 약점 노출! 10초간 피해 3배', effect: 'boss_weak' },
  { id: 'party_wipe_mechanic', time: 150, desc: '즉사 기믹! 안전구역으로 이동하라!', effect: 'wipe_mechanic' },
];

function createRaid(bossId, players) {
  const boss = COOP_BOSSES.find(b => b.id === bossId);
  if (!boss) return null;
  return {
    id: `raid_${Date.now()}`,
    boss: { ...boss, currentHp: boss.hp, phase: 1 },
    players: players.map(p => ({ id: p.id, name: p.name, role: 'dps', dmgDealt: 0 })),
    startTime: Date.now(),
    duration: RAID_DURATION,
    events: RAID_EVENTS.map(e => ({ ...e, triggered: false })),
    status: 'active',
  };
}

function register(io, socket, player) {
  socket.on('coop_raid_list', () => {
    socket.emit('coop_raid_list', { bosses: COOP_BOSSES, roles: PARTY_ROLES, lootRules: LOOT_RULES });
  });

  socket.on('coop_raid_create', (data) => {
    const raid = createRaid(data.bossId, [player]);
    if (!raid) return socket.emit('coop_raid_create_result', { ok: false });
    player.activeCoopRaid = raid;
    socket.emit('coop_raid_create_result', { ok: true, raid });
    io.emit('server_msg', `🐲 [협동 레이드] ${player.name}이(가) "${raid.boss.name}" 레이드 모집 중! (${raid.players.length}/${MAX_PARTY})`);
  });

  socket.on('coop_raid_set_role', (data) => {
    if (PARTY_ROLES[data.role]) {
      player.raidRole = data.role;
      socket.emit('coop_raid_set_role_result', { ok: true, role: PARTY_ROLES[data.role] });
    }
  });
}

module.exports = { COOP_BOSSES, PARTY_ROLES, LOOT_RULES, RAID_EVENTS, MAX_PARTY, createRaid, register };
