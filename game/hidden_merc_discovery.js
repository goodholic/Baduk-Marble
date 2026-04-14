// v5.1 — 비밀 용병 발견 시스템
// 특정 조건 조합으로만 해금되는 숨겨진 전설/신화 용병

// 비밀 용병 목록 (발견 조건 + 스탯 + 고유 능력)
const HIDDEN_MERCS = [
  {
    id: 'merc_time_lord', name: '시간의 지배자', icon: '⏰👑',
    grade: 'myth', class: 'mage',
    stats: { hp: 8000, atk: 450, def: 300, spd: 10 },
    uniqueSkill: { name: '시간 정지', desc: '5초간 적 전원 행동 정지 (본인만 행동 가능)', cooldown: 90 },
    condition: { type: 'time', desc: '서버 시간 자정 정각(00:00:00)에 가챠를 돌린다', check: 'midnight_gacha' },
    lore: '시간의 흐름을 지배하는 존재, 모든 것이 그의 손 안에',
    hint: '자정의 종소리가 울릴 때, 운명의 수레바퀴가 돌아간다...',
  },
  {
    id: 'merc_void_walker', name: '공허의 방랑자', icon: '🌌🚶',
    grade: 'myth', class: 'assassin',
    stats: { hp: 5000, atk: 600, def: 200, spd: 12 },
    uniqueSkill: { name: '차원 도약', desc: '적 배후로 순간이동 + 배후 공격 ATK ×3', cooldown: 45 },
    condition: { type: 'exploration', desc: '모든 비밀 지역 5곳을 발견한 상태에서 차원문 사용', check: 'all_secret_zones' },
    lore: '차원과 차원 사이를 떠도는 자, 존재 자체가 수수께끼',
    hint: '모든 비밀을 알게 된 자만이 공허를 볼 수 있다...',
  },
  {
    id: 'merc_phoenix', name: '불사조', icon: '🔥🐦',
    grade: 'legend', class: 'healer',
    stats: { hp: 7000, atk: 350, def: 350, spd: 7 },
    uniqueSkill: { name: '부활의 불꽃', desc: '전투 중 1회 자동 부활 (HP 100%) + 부활 시 주변 적 화상', cooldown: 0 },
    condition: { type: 'death', desc: '용병이 전투에서 10회 사망한 후, 11번째 전투에서 승리', check: 'merc_deaths_10_then_win' },
    lore: '재에서 다시 태어나는 영원한 불새',
    hint: '열 번의 죽음 끝에 영원한 생명이 기다린다...',
  },
  {
    id: 'merc_mirror_knight', name: '거울 기사', icon: '🪞⚔️',
    grade: 'legend', class: 'tank',
    stats: { hp: 9000, atk: 200, def: 500, spd: 4 },
    uniqueSkill: { name: '완전 반사', desc: '3초간 받는 모든 데미지를 적에게 100% 반사', cooldown: 60 },
    condition: { type: 'pvp', desc: 'PvP에서 같은 클래스의 적을 5연승으로 이긴다', check: 'pvp_mirror_5streak' },
    lore: '적의 모든 것을 비추어 되돌려 보내는 신비한 기사',
    hint: '거울 속 자신을 이겨야 진정한 힘을 얻는다...',
  },
  {
    id: 'merc_merchant_king', name: '상인왕', icon: '💰👑',
    grade: 'legend', class: 'support',
    stats: { hp: 6000, atk: 150, def: 250, spd: 5 },
    uniqueSkill: { name: '황금 폭풍', desc: '골드를 소비하여 데미지 (1000G = ATK 100% 추가 데미지)', cooldown: 30 },
    condition: { type: 'economy', desc: '무역으로 총 100만 골드 이상 수익 달성', check: 'trade_profit_1m' },
    lore: '돈이 곧 힘인 세계의 절대 지배자',
    hint: '충분한 부를 쌓으면, 부 자체가 무기가 된다...',
  },
  {
    id: 'merc_dream_weaver', name: '꿈의 직조자', icon: '🌙✨',
    grade: 'myth', class: 'mage',
    stats: { hp: 6000, atk: 500, def: 250, spd: 8 },
    uniqueSkill: { name: '악몽의 세계', desc: '10초간 적 전원을 악몽 상태 (공격/방어 -30%, 랜덤 혼란)', cooldown: 75 },
    condition: { type: 'life', desc: '낚시/요리/정원/펫 시스템을 모두 마스터 (각 최고 등급)', check: 'all_life_master' },
    lore: '현실과 꿈의 경계를 자유롭게 넘나드는 존재',
    hint: '삶의 모든 것을 경험한 자만이 꿈을 지배할 수 있다...',
  },
  {
    id: 'merc_fate_breaker', name: '운명 파괴자', icon: '⚡💥',
    grade: 'myth', class: 'warrior',
    stats: { hp: 10000, atk: 550, def: 400, spd: 6 },
    uniqueSkill: { name: '운명 절단', desc: '적 1명의 모든 버프 제거 + HP 현재값의 50% 데미지 (보스 포함)', cooldown: 120 },
    condition: { type: 'achievement', desc: '업적 500개 이상 달성', check: 'achievements_500' },
    lore: '정해진 운명조차 베어버리는 최강의 전사',
    hint: '수백의 위업을 달성한 자만이 운명에 도전할 수 있다...',
  },
  {
    id: 'merc_shadow_emperor', name: '그림자 황제', icon: '👤👑',
    grade: 'myth', class: 'assassin',
    stats: { hp: 7000, atk: 700, def: 300, spd: 11 },
    uniqueSkill: { name: '그림자 군단', desc: '자신의 분신 3체 소환 (본체의 40% 능력)', cooldown: 60 },
    condition: { type: 'dynasty', desc: '용병 세대 계승으로 5세대 달성 (신화가문)', check: 'dynasty_gen5' },
    lore: '5대에 걸친 명문가의 최종 계승자, 그림자를 지배한다',
    hint: '다섯 세대의 지혜가 모이면, 그림자조차 충성한다...',
  },
];

// 힌트 시스템: 조건에 가까울수록 힌트가 구체적으로 변함
const HINT_LEVELS = {
  0: '???', // 전혀 모름
  1: '어렴풋한 소문이 들린다...', // 조건의 10% 달성
  2: null, // 용병별 hint 필드 사용 (조건의 30%)
  3: null, // 조건의 70%에서 직접적 힌트
  4: '발견 조건이 거의 충족되었다!', // 90%
};

function checkDiscoveryCondition(player, conditionCheck) {
  switch (conditionCheck) {
    case 'midnight_gacha': {
      const now = new Date();
      return now.getHours() === 0 && now.getMinutes() === 0;
    }
    case 'all_secret_zones':
      return (player.discoveredSecretZones || []).length >= 5;
    case 'merc_deaths_10_then_win':
      return (player.mercDeathCount || 0) >= 10;
    case 'pvp_mirror_5streak':
      return (player.pvpMirrorStreak || 0) >= 5;
    case 'trade_profit_1m':
      return (player.totalTradeProfit || 0) >= 1000000;
    case 'all_life_master':
      return ['fishing', 'cooking', 'garden', 'pet'].every(s => (player.lifeMastery || {})[s] >= 10);
    case 'achievements_500':
      return (player.achievementCount || 0) >= 500;
    case 'dynasty_gen5':
      return (player.mercenaries || []).some(m => (m.generation || 1) >= 5);
    default:
      return false;
  }
}

function tryDiscover(player, hiddenMercId) {
  const hidden = HIDDEN_MERCS.find(h => h.id === hiddenMercId);
  if (!hidden) return { ok: false, reason: '알 수 없는 비밀 용병' };

  const discovered = player.discoveredHiddenMercs || [];
  if (discovered.includes(hiddenMercId)) return { ok: false, reason: '이미 발견함' };

  if (!checkDiscoveryCondition(player, hidden.condition.check)) {
    return { ok: false, reason: '발견 조건 미충족', hint: hidden.hint };
  }

  // 발견 성공!
  discovered.push(hiddenMercId);
  player.discoveredHiddenMercs = discovered;

  const newMerc = {
    id: `${hiddenMercId}_${Date.now()}`,
    baseId: hiddenMercId,
    name: hidden.name,
    icon: hidden.icon,
    grade: hidden.grade,
    class: hidden.class,
    ...hidden.stats,
    level: 1,
    uniqueSkill: hidden.uniqueSkill,
    hidden: true,
    lore: hidden.lore,
    emotion: 'inspired',
  };

  const mercs = player.mercenaries = player.mercenaries || [];
  mercs.push(newMerc);

  return { ok: true, merc: newMerc };
}

function register(io, socket, player) {
  socket.on('hidden_merc_list', () => {
    const discovered = player.discoveredHiddenMercs || [];
    const list = HIDDEN_MERCS.map(h => ({
      id: h.id,
      discovered: discovered.includes(h.id),
      name: discovered.includes(h.id) ? h.name : '???',
      icon: discovered.includes(h.id) ? h.icon : '❓',
      hint: discovered.includes(h.id) ? h.condition.desc : h.hint,
      grade: discovered.includes(h.id) ? h.grade : '???',
    }));
    socket.emit('hidden_merc_list', list);
  });

  socket.on('hidden_merc_try', (data) => {
    const result = tryDiscover(player, data.mercId);
    socket.emit('hidden_merc_try_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟✨ [비밀 용병 발견!] ${player.name}이(가) 전설의 "${result.merc.name}"을(를) 발견했다!`);
    }
  });
}

module.exports = {
  HIDDEN_MERCS, HINT_LEVELS,
  checkDiscoveryCondition, tryDiscover, register,
};
