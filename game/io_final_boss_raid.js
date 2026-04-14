// v6.9 — 최종 보스 레이드 (게임 최종 컨텐츠)
// 서버 전원 참여, HP 1억, 12페이즈, 모든 시스템 총동원

const FINAL_BOSS = {
  name: '세계의 종말자 — 에테르노스', icon: '🌍💀👑🔥❄️⚡🌀',
  hp: 100000000, // HP 1억!!!
  phases: 12,
  atk: 5000,
  desc: '모든 차원을 삼키려는 최종 존재. 서버 전원의 힘을 합쳐야 한다.',
  lore: '태초부터 존재했고, 모든 세계의 끝에 나타나는 자. 이기면 세계가 구원받고, 지면 서버 리셋.',

  phaseDetails: [
    { phase: 1, name: '육체의 장벽', hp: '10%', mechanic: '물리 공격만 가능, 마법 면역', desc: '단단한 육체를 깨라' },
    { phase: 2, name: '마력의 폭풍', hp: '10%', mechanic: '마법 공격만 가능, 물리 면역', desc: '마력의 폭풍을 뚫어라' },
    { phase: 3, name: '시간 왜곡', hp: '8%', mechanic: '매 10초 시간 역행 (HP 회복)', desc: '시간을 되감는다! 빨리 깎아라' },
    { phase: 4, name: '차원 분열', hp: '8%', mechanic: '4차원으로 분열, 각각 동시 공략', desc: '팀을 나눠 동시 공격!' },
    { phase: 5, name: '역병의 숨결', hp: '8%', mechanic: '전원 역병 감염, 치유 필수', desc: '힐러 총동원!' },
    { phase: 6, name: '중력 붕괴', hp: '8%', mechanic: '무중력+초중력 반복', desc: '중력 변환에 적응하라' },
    { phase: 7, name: '인형의 밤', hp: '8%', mechanic: '아군 랜덤 조종! 아군끼리 싸움', desc: '동료를 공격하지 마라!' },
    { phase: 8, name: '분노의 화신', hp: '8%', mechanic: 'ATK 3배, 전체 공격 빈도 2배', desc: '순수 DPS 체크!' },
    { phase: 9, name: '그림자 복제', hp: '8%', mechanic: '참가자 전원의 고스트 소환!', desc: '자신의 메아리와 동시 전투' },
    { phase: 10, name: '차원 소멸', hp: '8%', mechanic: '맵이 서서히 사라짐, 안전지대 축소', desc: '서있을 곳이 사라진다!' },
    { phase: 11, name: '최후의 방벽', hp: '8%', mechanic: '보스 무적+소환수 100체', desc: '소환수 전멸 → 무적 해제' },
    { phase: 12, name: '종말의 심판', hp: '8%', mechanic: '60초 카운트다운! 시간 내 미처치 = 서버 리셋!', desc: '모든 것을 걸어라!!!', final: true },
  ],
};

// 기여도 (서버 전원 합산)
const CONTRIBUTION_TIERS = [
  { rank: 'SSS', pctMin: 5, reward: { gold: 1000000, title: '세계의 구원자', merc: 'eternity_guardian', frame: 'savior_of_worlds' } },
  { rank: 'SS', pctMin: 2, reward: { gold: 500000, title: '영웅 중의 영웅' } },
  { rank: 'S', pctMin: 1, reward: { gold: 300000, title: '세계의 영웅' } },
  { rank: 'A', pctMin: 0.5, reward: { gold: 150000 } },
  { rank: 'B', pctMin: 0.1, reward: { gold: 80000 } },
  { rank: 'C', pctMin: 0, reward: { gold: 30000 } },
];

// 서버 보상 (클리어 시)
const SERVER_REWARD = {
  clear: '서버 전체 전스탯+5% (영구!!) + 서버 연대기에 영구 기록 + 서버 이름 변경 투표권',
  fail: '서버 리셋... (프레스티지 보너스는 유지)',
  title: '서버 최초 클리어 시 — "세계를 구한 서버" 칭호 (영구)',
};

// 소환 조건 (서버 전체 조건)
const SUMMON_CONDITIONS = {
  req: [
    '서버 총 레벨 합계 10000+',
    '세계수 5단계 완성 1개+',
    '소원의 용 소환 기록 3회+',
    '어둠의 대륙 클리어 5명+',
    '그랜드 토너먼트 10회+ 개최',
  ],
  desc: '서버가 충분히 성숙해야 최종 보스를 소환할 수 있다',
};

function register(io, socket, player) {
  socket.on('final_boss_info', () => {
    socket.emit('final_boss_info', { boss: FINAL_BOSS, contributions: CONTRIBUTION_TIERS, serverReward: SERVER_REWARD, summonConditions: SUMMON_CONDITIONS });
  });
  socket.on('final_boss_join', () => {
    socket.emit('final_boss_join_result', { ok: true });
    io.emit('server_msg', `🌍💀👑 [최종 보스] ${player.name}이(가) 최종 레이드에 합류! 서버 전원의 힘을 합쳐라!!!`);
  });
}

module.exports = { FINAL_BOSS, CONTRIBUTION_TIERS, SERVER_REWARD, SUMMON_CONDITIONS, register };
