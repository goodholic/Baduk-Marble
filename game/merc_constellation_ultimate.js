// v6.7 — 별자리 궁극기 시스템
// 12별자리별 궁극기, 별자리 조합 궁극기, 천체 이벤트 연동

const CONSTELLATION_ULTIMATES = {
  aries:       { name: '양자리: 돌격의 불', icon: '♈💥', dmg: 'ATK×5', area: 'line', cooldown: 120, desc: '전방 직선 관통 5배 데미지' },
  taurus:      { name: '황소자리: 대지의 분노', icon: '♉💥', dmg: 'HP×0.3', area: 'circle', cooldown: 150, desc: '주변 원형 HP 30% DMG+기절' },
  gemini:      { name: '쌍둥이자리: 만화경', icon: '♊💥', dmg: 'ATK×3×분신수', area: 'multi', cooldown: 100, desc: '분신 5체 동시 공격' },
  cancer:      { name: '게자리: 조수의 보호', icon: '♋💥', dmg: 0, area: 'team', cooldown: 180, desc: '팀 전원 10초 무적+HP 전체 회복' },
  leo:         { name: '사자자리: 태양의 심판', icon: '♌💥', dmg: 'ATK×8', area: 'single', cooldown: 200, desc: '단일 대상 8배! 즉사 판정' },
  virgo:       { name: '처녀자리: 생명의 정원', icon: '♍💥', dmg: 0, area: 'field', cooldown: 240, desc: '30초간 아군 전원 HP 5%/초 재생' },
  libra:       { name: '천칭자리: 심판의 저울', icon: '♎💥', dmg: 'balance', area: 'all', cooldown: 180, desc: '적 최강↔최약 스탯 교환!' },
  scorpio:     { name: '전갈자리: 사신의 독침', icon: '♏💥', dmg: 'HP×0.5', area: 'single', cooldown: 150, desc: '현재 HP 50% 즉시 감소+독' },
  sagittarius: { name: '사수자리: 유성의 비', icon: '♐💥', dmg: 'ATK×2×20발', area: 'rain', cooldown: 120, desc: '하늘에서 화살 20발 랜덤 낙하' },
  capricorn:   { name: '염소자리: 정상의 의지', icon: '♑💥', dmg: 0, area: 'self', cooldown: 300, desc: '60초간 죽지 않음(HP 1 유지)+ATK 2배' },
  aquarius:    { name: '물병자리: 지혜의 홍수', icon: '♒💥', dmg: 'MATK×4', area: 'flood', cooldown: 150, desc: '맵 전체 수몰+마법 4배' },
  pisces:      { name: '물고기자리: 환상의 바다', icon: '♓💥', dmg: 0, area: 'all', cooldown: 200, desc: '적 전원 30초 환각(아군을 적으로 인식!)' },
};

// 별자리 조합 궁극기 (2~3 별자리 동시 발동)
const COMBO_ULTIMATES = [
  { signs: ['aries', 'leo', 'sagittarius'], name: '화염 삼중주', icon: '🔥🔥🔥', effect: '맵 전체 화염 폭풍, HP 60% DMG', desc: '화 원소 3별자리' },
  { signs: ['cancer', 'scorpio', 'pisces'], name: '심해의 심판', icon: '🌊🌊🌊', effect: '맵 전체 수몰+독+환각', desc: '수 원소 3별자리' },
  { signs: ['taurus', 'virgo', 'capricorn'], name: '대지의 기적', icon: '🌍🌍🌍', effect: '아군 전원 60초 불사+재생', desc: '지 원소 3별자리' },
  { signs: ['gemini', 'libra', 'aquarius'], name: '천공의 혼돈', icon: '🌪️🌪️🌪️', effect: '적 전원 스탯 셔플+혼란+쿨다운 리셋', desc: '풍 원소 3별자리' },
  { signs: ['leo', 'cancer'], name: '일월식', icon: '☀️🌙', effect: '적 전원 ATK 0 (10초) + 아군 HP 전체 회복', desc: '태양+달' },
];

// 천체 이벤트 (실시간 서버 이벤트)
const CELESTIAL_EVENTS = [
  { id: 'solar_eclipse', name: '일식', chance: 0.03, duration: 300, effect: '암속성 2배+시야 0+별자리 궁극 쿨-50%', icon: '🌑☀️' },
  { id: 'lunar_eclipse', name: '월식', chance: 0.03, duration: 300, effect: '빙속성 2배+힐 2배+환각 확률', icon: '🌑🌙' },
  { id: 'meteor_shower', name: '유성우', chance: 0.05, duration: 600, effect: '사수자리 궁극 자동 발동+화살 비', icon: '☄️' },
  { id: 'planetary_alignment', name: '행성 정렬', chance: 0.01, duration: 180, effect: '전 별자리 궁극 쿨다운 리셋! 모든 궁극 1회 무료!', icon: '🌟🌟🌟' },
  { id: 'aurora_borealis', name: '오로라', chance: 0.04, duration: 600, effect: '마법+힐 3배+별자리 효과 2배', icon: '🌌' },
];

function useUltimate(merc) {
  if (!merc.zodiac) return { ok: false, reason: '별자리 없음' };
  const ult = CONSTELLATION_ULTIMATES[merc.zodiac.id];
  if (!ult) return { ok: false, reason: '궁극기 없음' };
  return { ok: true, ultimate: ult, merc: merc.name };
}

function register(io, socket, player) {
  socket.on('constellation_ult_info', () => {
    socket.emit('constellation_ult_info', { ultimates: CONSTELLATION_ULTIMATES, combos: COMBO_ULTIMATES, events: CELESTIAL_EVENTS });
  });
  socket.on('constellation_ult_use', (data) => {
    const merc = (player.mercenaries || []).find(m => m.id === data.mercId);
    if (!merc) return socket.emit('constellation_ult_result', { ok: false });
    const result = useUltimate(merc);
    socket.emit('constellation_ult_result', result);
    if (result.ok) io.emit('server_msg', `⭐💥 [별자리 궁극기] ${result.merc}의 "${result.ultimate.name}" 발동!`);
  });
}

module.exports = { CONSTELLATION_ULTIMATES, COMBO_ULTIMATES, CELESTIAL_EVENTS, useUltimate, register };
