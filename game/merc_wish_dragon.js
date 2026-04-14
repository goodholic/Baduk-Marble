// v6.9 — 소원의 용 시스템
// 7개 오브 수집 → 소원의 용 소환 → 서버급 소원, 대규모 이벤트

const ORBS_REQUIRED = 7;
const ORB_LOCATIONS = [
  { id: 'orb_fire', name: '화염 오브', icon: '🔴', location: 'IO 보스 드롭', chance: 0.05, desc: 'IO 보스에서 5%' },
  { id: 'orb_water', name: '수 오브', icon: '🔵', location: '낚시/수중 컨텐츠', chance: 0.03, desc: '낚시 대어+수중 보스' },
  { id: 'orb_earth', name: '대지 오브', icon: '🟤', location: '광산/채굴', chance: 0.04, desc: '희귀 광맥에서' },
  { id: 'orb_wind', name: '바람 오브', icon: '⚪', location: '비행/하늘 컨텐츠', chance: 0.03, desc: '비행선/드래곤 전투' },
  { id: 'orb_light', name: '빛 오브', icon: '🟡', location: '신전/축복', chance: 0.02, desc: '신앙 최고 레벨 보상' },
  { id: 'orb_dark', name: '어둠 오브', icon: '🟣', location: '어둠의 대륙', chance: 0.03, desc: '심연 보스에서' },
  { id: 'orb_star', name: '별 오브', icon: '⭐', location: '그랜드 토너먼트/월드 보스', chance: 0.01, desc: '최고 난이도 컨텐츠 (1%!)' },
];

// 소원의 용이 들어줄 수 있는 소원
const DRAGON_WISHES = [
  { id: 'server_peace', name: '세계 평화', icon: '🕊️🐲', effect: '7일간 서버 전체 PvP 비활성+전원 HP 재생 2배', type: 'server', desc: '서버 전체 영향!' },
  { id: 'server_war', name: '대전쟁', icon: '⚔️🐲', effect: '7일간 PvP DMG 2배+영토전 보상 3배', type: 'server', desc: '혼돈과 전쟁!' },
  { id: 'gold_rain', name: '황금비', icon: '💰🐲', effect: '서버 전원 100000G 지급+3일 골드 생산 3배', type: 'server' },
  { id: 'exp_blessing', name: '경험의 축복', icon: '📈🐲', effect: '7일간 서버 전체 EXP 3배', type: 'server' },
  { id: 'custom_merc', name: '꿈의 용병', icon: '🧑🐲', effect: '원하는 스탯/스킬의 커스텀 신화 용병 1명 생성!', type: 'personal', legendary: true },
  { id: 'resurrect_all', name: '대부활', icon: '💫🐲', effect: '어둠의 대륙 전사자 전원 부활!', type: 'personal' },
  { id: 'max_prestige', name: '초월 프레스티지', icon: '👑🐲', effect: '프레스티지 보너스 유지한 채 추가 프레스티지 1회', type: 'personal' },
  { id: 'world_tree_instant', name: '세계수 즉시 완성', icon: '🌳🐲', effect: '세계수 5단계 즉시 완성!', type: 'personal' },
  { id: 'immortality', name: '불멸', icon: '♾️🐲', effect: '선택 용병 1명 영구사망 완전 면역 (영구)', type: 'personal', ultimate: true },
  { id: 'new_dimension', name: '새 차원 생성', icon: '🌀🐲', effect: '플레이어 이름의 커스텀 차원 1개 생성! (고유 보스+보상)', type: 'personal', ultimate: true },
];

// 소환 의식 (서버 이벤트)
const SUMMONING_RITUAL = {
  time: 120, // 2분 의식
  serverWide: true, // 서버 전원에게 공지
  spectators: true, // 관전 가능
  cutscene: true, // 연출 컷씬
  dialogue: [
    '🐲 "나는 영원의 용... 소원을 말하라."',
    '🐲 "그 소원... 들어주겠다. 하지만 대가가 있다."',
    '🐲 "소원이 이루어졌다. 다음 소환까지... 안녕히."',
  ],
};

// 오브 쟁탈 PvP (다른 플레이어의 오브 탈취 가능)
const ORB_PVP = {
  stealChance: 0.3, // PK 시 30% 확률 오브 1개 탈취
  dropOnDeath: false, // 사망해도 자동 드롭은 아님
  protectItem: { name: '오브 보호 장치', cost: 50000, desc: '탈취 면역' },
  desc: '오브를 모으면 PvP 타겟이 된다!',
};

// 소환 기록 (서버 역사)
const DRAGON_HISTORY = {
  fields: ['소환자', '소원', '날짜', '서버 영향', '관전자 수'],
  desc: '역대 소환 기록은 서버 연대기에 영구 보존',
};

function checkOrbs(player) {
  const orbs = player.dragonOrbs || {};
  return ORB_LOCATIONS.every(o => orbs[o.id]);
}

function summonDragon(player, wishId) {
  if (!checkOrbs(player)) return { ok: false, reason: '오브 7개 필요!' };
  const wish = DRAGON_WISHES.find(w => w.id === wishId);
  if (!wish) return { ok: false, reason: '알 수 없는 소원' };
  player.dragonOrbs = {}; // 오브 소멸
  player.dragonSummons = (player.dragonSummons || 0) + 1;
  return { ok: true, wish, dialogue: SUMMONING_RITUAL.dialogue };
}

function register(io, socket, player) {
  socket.on('wish_dragon_info', () => {
    socket.emit('wish_dragon_info', { orbs: ORB_LOCATIONS, wishes: DRAGON_WISHES, ritual: SUMMONING_RITUAL, pvp: ORB_PVP, history: DRAGON_HISTORY, myOrbs: player.dragonOrbs || {}, summons: player.dragonSummons || 0 });
  });
  socket.on('wish_dragon_summon', (data) => {
    const result = summonDragon(player, data.wishId);
    socket.emit('wish_dragon_result', result);
    if (result.ok) {
      io.emit('server_msg', `🐲⭐⭐⭐⭐⭐⭐⭐ [소원의 용 소환!!] ${player.name}이(가) 7오브를 모아 소원의 용을 소환!!! 소원: "${result.wish.name}"!!!`);
    }
  });
}

module.exports = { ORB_LOCATIONS, DRAGON_WISHES, SUMMONING_RITUAL, ORB_PVP, DRAGON_HISTORY, checkOrbs, summonDragon, register };
