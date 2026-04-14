// v5.2 — 세계 정복 모드
// 서버 전체 영토 쟁탈, 길드/개인 영토 점령, 세계 지도 실시간 변동

const WORLD_REGIONS = [
  { id: 'central_plains', name: '중앙 대평원', icon: '🏔️', size: 'large', income: { gold: 5000, food: 3000 }, defBonus: 1.0, desc: '서버 중심, 무역 요충지' },
  { id: 'eastern_forest', name: '동부 숲', icon: '🌲', size: 'medium', income: { gold: 3000, wood: 5000 }, defBonus: 1.2, desc: '나무가 울창한 방어 유리 지형' },
  { id: 'western_desert', name: '서부 사막', icon: '🏜️', size: 'medium', income: { gold: 8000, iron: 2000 }, defBonus: 0.8, desc: '금광이 풍부하지만 방어 불리' },
  { id: 'northern_tundra', name: '북부 동토', icon: '❄️', size: 'large', income: { gold: 4000, iron: 4000 }, defBonus: 1.3, desc: '혹한 지형, 공격자 이동속도 -30%' },
  { id: 'southern_islands', name: '남부 군도', icon: '🏝️', size: 'small', income: { gold: 6000, diamonds: 20 }, defBonus: 1.1, desc: '해상 무역 거점, 다이아 산출' },
  { id: 'volcanic_land', name: '화산 지대', icon: '🌋', size: 'medium', income: { gold: 3000, iron: 6000 }, defBonus: 0.9, desc: '희귀 광물 산출, 화산 위험' },
  { id: 'shadow_realm', name: '그림자 영역', icon: '🌑', size: 'small', income: { gold: 2000, diamonds: 30 }, defBonus: 1.5, desc: '최고급 자원, 극한 방어 유리' },
  { id: 'sky_domain', name: '하늘의 영역', icon: '☁️', size: 'small', income: { gold: 10000, diamonds: 50 }, defBonus: 2.0, desc: '최종 영토, 서버 최강 길드만 도전' },
  { id: 'underground', name: '지하 왕국', icon: '⛏️', size: 'medium', income: { gold: 5000, iron: 5000 }, defBonus: 1.4, desc: '광산+던전 복합, 몬스터 출몰' },
  { id: 'holy_land', name: '성지', icon: '⛪', size: 'small', income: { gold: 7000, diamonds: 25 }, defBonus: 1.2, desc: '축복 효과 +10%, 신전 유지비 면제' },
];

// 영토 점령 효과 (서버 전체에 영향)
const TERRITORY_EFFECTS = {
  central_plains: '서버 무역 수수료 -5% (점령 길드)',
  eastern_forest:  '목재 생산량 서버 전체 +10%',
  western_desert:  '금광 생산량 점령 길드 +30%',
  northern_tundra: '공성전 수비 보너스 +15%',
  southern_islands:'해상 무역 루트 독점권',
  volcanic_land:   '장비 제작 비용 -20%',
  shadow_realm:    '암흑 시장 특별 상품 해금',
  sky_domain:      '서버 왕 칭호 + 전체 스탯 +3%',
  underground:     '던전 보상 +20%',
  holy_land:       '부활 시간 -50%, 축복 효과 +15%',
};

// 세계 정복 이벤트
const CONQUEST_EVENTS = [
  { id: 'uprising', name: '민중 봉기', chance: 0.05, effect: '점령지 방어력 -30% (10분)', desc: '주민 반란으로 방어 약화' },
  { id: 'natural_disaster', name: '자연재해', chance: 0.03, effect: '점령지 수입 -50% (1시간)', desc: '재해로 생산 차질' },
  { id: 'alliance_offer', name: '동맹 제안', chance: 0.04, effect: '인접 영토 길드에게 동맹 제안 가능', desc: '외교적 기회' },
  { id: 'treasure_found', name: '숨겨진 보물', chance: 0.06, effect: '추가 보상 2배 (다음 수집)', desc: '영토에서 숨겨진 보물 발견' },
  { id: 'meteor_strike', name: '운석 낙하', chance: 0.02, effect: '영토 중립화 (무주지)', desc: '운석으로 점령 해제' },
  { id: 'hero_appears', name: '영웅 등장', chance: 0.04, effect: 'NPC 영웅 1명 30분 합류', desc: '전설의 영웅이 도움!' },
];

// 세계 정복 랭킹
const CONQUEST_RANKS = [
  { regions: 1, title: '영주', bonus: { gold: 1.05 } },
  { regions: 3, title: '대영주', bonus: { gold: 1.1, def: 1.05 } },
  { regions: 5, title: '왕', bonus: { gold: 1.15, def: 1.1, atk: 1.05 } },
  { regions: 7, title: '대왕', bonus: { gold: 1.2, def: 1.15, atk: 1.1 } },
  { regions: 10, title: '세계의 지배자 🌍👑', bonus: { gold: 1.3, def: 1.2, atk: 1.15, allStat: 1.05 } },
];

function getConquestRank(regionCount) {
  return [...CONQUEST_RANKS].reverse().find(r => regionCount >= r.regions) || null;
}

function register(io, socket, player) {
  socket.on('world_map', () => {
    socket.emit('world_map', {
      regions: WORLD_REGIONS,
      effects: TERRITORY_EFFECTS,
      events: CONQUEST_EVENTS,
      ranks: CONQUEST_RANKS,
    });
  });

  socket.on('world_attack_region', (data) => {
    socket.emit('world_attack_result', { ok: true, regionId: data.regionId, message: '영토 전쟁 시작!' });
    io.emit('server_msg', `🌍⚔️ [세계 정복] ${player.clanName || player.name}이(가) "${WORLD_REGIONS.find(r => r.id === data.regionId)?.name}"을 공격합니다!`);
  });

  socket.on('world_conquest_rank', () => {
    const owned = (player.ownedRegions || []).length;
    const rank = getConquestRank(owned);
    socket.emit('world_conquest_rank', { owned, rank });
  });
}

module.exports = {
  WORLD_REGIONS, TERRITORY_EFFECTS, CONQUEST_EVENTS, CONQUEST_RANKS,
  getConquestRank, register,
};
