// 시즌 축제 이벤트 — v1.21
// 실제 달력 기준으로 자동 활성화되는 축제 이벤트
// 각 이벤트는 글로벌 버프 + 한정 보상 + 전용 NPC 대사를 제공

const FESTIVAL_EVENTS = {
  new_year: {
    id: 'new_year',
    name: '신년 축제',
    desc: '새해를 맞이하는 황금빛 축제. 모든 보상이 풍성해진다.',
    startMonth: 1, startDay: 1, endMonth: 1, endDay: 7,
    globalBuff: { goldBonus: 0.50, expBonus: 0.30 },
    exclusiveRewards: ['title_new_year', 'mount_golden_horse', 'skin_celestial'],
    npcGreeting: '새해 복 많이 받으세요! 올해는 더 큰 모험이 기다리고 있어요!',
    color: '#FFD700',
  },
  spring_blossom: {
    id: 'spring_blossom',
    name: '봄꽃 축제',
    desc: '벚꽃이 흩날리는 봄날의 축제. 회복과 평화의 시간.',
    startMonth: 4, startDay: 1, endMonth: 4, endDay: 14,
    globalBuff: { hpRegen: 0.30, dropRate: 0.20 },
    exclusiveRewards: ['title_blossom', 'pet_cherry_fairy', 'food_blossom_tea'],
    npcGreeting: '꽃잎이 흩날리는 이 계절, 잠시 쉬어가지 않으시겠어요?',
    color: '#ffb7c5',
  },
  midsummer: {
    id: 'midsummer',
    name: '한여름 밤의 축제',
    desc: '뜨거운 여름밤의 축제. 화염 속성과 PvP 보상이 강화된다.',
    startMonth: 7, startDay: 15, endMonth: 8, endDay: 15,
    globalBuff: { fireDmg: 0.30, pvpReward: 0.50 },
    exclusiveRewards: ['title_summer_king', 'skin_flame', 'elixir_titan'],
    npcGreeting: '뜨거운 밤이군요! 한 잔 하시겠어요?',
    color: '#ff6600',
  },
  halloween: {
    id: 'halloween',
    name: '할로윈 축제',
    desc: '귀신과 보물이 가득한 으스스한 축제. 어둠의 힘이 깨어난다.',
    startMonth: 10, startDay: 25, endMonth: 11, endDay: 1,
    globalBuff: { critRate: 0.10, undeadDmg: 0.50 },
    exclusiveRewards: ['title_pumpkin', 'pet_ghost', 'skin_void'],
    npcGreeting: 'Trick or Treat! 사탕 아니면 장난!',
    color: '#ff8800',
  },
  winter_festival: {
    id: 'winter_festival',
    name: '겨울 축제',
    desc: '눈과 선물이 가득한 따뜻한 축제. 모든 행운이 깃든다.',
    startMonth: 12, startDay: 20, endMonth: 12, endDay: 31,
    globalBuff: { goldBonus: 0.30, expBonus: 0.30, dropRate: 0.30 },
    exclusiveRewards: ['title_winter_legend', 'mount_reindeer', 'skin_aurora'],
    npcGreeting: '메리 크리스마스! 선물을 가져왔어요!',
    color: '#88ddff',
  },
};

function getActiveEvent(now = new Date()) {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  for (const ev of Object.values(FESTIVAL_EVENTS)) {
    // 같은 달
    if (ev.startMonth === ev.endMonth) {
      if (month === ev.startMonth && day >= ev.startDay && day <= ev.endDay) return ev;
    } else {
      // 달을 걸치는 이벤트 (예: 7/15 ~ 8/15)
      if ((month === ev.startMonth && day >= ev.startDay) ||
          (month === ev.endMonth && day <= ev.endDay)) return ev;
    }
  }
  return null;
}

function getEventBuff(stat) {
  const ev = getActiveEvent();
  if (!ev || !ev.globalBuff) return 0;
  return ev.globalBuff[stat] || 0;
}

function getEventGreeting() {
  const ev = getActiveEvent();
  return ev ? ev.npcGreeting : null;
}

function isExclusiveRewardActive(rewardId) {
  const ev = getActiveEvent();
  return !!(ev && ev.exclusiveRewards && ev.exclusiveRewards.includes(rewardId));
}

module.exports = {
  FESTIVAL_EVENTS,
  getActiveEvent,
  getEventBuff,
  getEventGreeting,
  isExclusiveRewardActive,
};
