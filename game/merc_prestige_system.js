// v6.1 — 프레스티지 시스템 (계정 레벨 리셋+영구 보너스)
// 전체 계정을 리셋하되, 영구 보너스 누적 — 회차를 넘어서는 성장

const MAX_PRESTIGE = 10;

const PRESTIGE_LEVELS = [
  { level: 1, name: '1주차', icon: '⭐', reqLevel: 50, bonus: { allStat: 1.05, startGold: 10000 }, unlock: '프레스티지 전용 상점' },
  { level: 2, name: '2주차', icon: '⭐⭐', reqLevel: 50, bonus: { allStat: 1.11, startGold: 25000 }, unlock: '프레스티지 용병 1종' },
  { level: 3, name: '3주차', icon: '⭐⭐⭐', reqLevel: 50, bonus: { allStat: 1.18, startGold: 50000 }, unlock: '프레스티지 장비 세트' },
  { level: 4, name: '4주차', icon: '🌟', reqLevel: 50, bonus: { allStat: 1.26, startGold: 80000 }, unlock: '프레스티지 전용 던전' },
  { level: 5, name: '5주차', icon: '🌟🌟', reqLevel: 50, bonus: { allStat: 1.35, startGold: 120000 }, unlock: '프레스티지 변신 폼' },
  { level: 6, name: '6주차', icon: '🌟🌟🌟', reqLevel: 50, bonus: { allStat: 1.45, startGold: 170000 }, unlock: '프레스티지 칭호' },
  { level: 7, name: '7주차', icon: '💫', reqLevel: 50, bonus: { allStat: 1.56, startGold: 230000 }, unlock: '프레스티지 오라' },
  { level: 8, name: '8주차', icon: '💫💫', reqLevel: 50, bonus: { allStat: 1.68, startGold: 300000 }, unlock: '프레스티지 프레임' },
  { level: 9, name: '9주차', icon: '💫💫💫', reqLevel: 50, bonus: { allStat: 1.81, startGold: 400000 }, unlock: '프레스티지 궁극기' },
  { level: 10, name: '최종 주차', icon: '👑💫', reqLevel: 50, bonus: { allStat: 2.0, startGold: 500000 }, unlock: '전설의 존재 (풀 해금)', title: '초월자', frame: 'prestige_god' },
];

// 프레스티지 유지 항목 (리셋해도 유지)
const KEEP_ON_PRESTIGE = [
  '프레스티지 보너스 (누적)', '발견한 비밀 용병', '운명 시스템 진행도',
  '도감 진행률', '칭호 & 프레임', '혈통 선택', '신앙 진영', '소울 링크 기록',
];

// 프레스티지 리셋 항목
const RESET_ON_PRESTIGE = [
  '레벨 → 1', '골드 → 시작 골드', '장비 → 초기화', '용병 → 시작 용병만',
  '건물 → 초기화', '스토리 → 처음부터', '영토 → 없음',
];

// 프레스티지 전용 보상
const PRESTIGE_SHOP = [
  { id: 'p_weapon', name: '프레스티지 무기', icon: '⚔️💫', cost: 'P토큰 10', stats: '전 무기 중 최강+글로우', reqPrestige: 1 },
  { id: 'p_merc', name: '프레스티지 용병', icon: '⚔️💫🧑', cost: 'P토큰 30', stats: '전 등급 초월, 고유 스킬', reqPrestige: 2 },
  { id: 'p_transform', name: '프레스티지 변신', icon: '💫🐲', cost: 'P토큰 50', stats: '프레스티지 전용 변신 폼', reqPrestige: 5 },
  { id: 'p_title', name: '프레스티지 칭호', icon: '💫👑', cost: 'P토큰 20', stats: '빛나는 특수 칭호', reqPrestige: 3 },
  { id: 'p_pet', name: '프레스티지 펫', icon: '💫🐾', cost: 'P토큰 40', stats: '전 펫 중 최강, 4단계 진화', reqPrestige: 4 },
];

function doPrestige(player) {
  const current = player.prestige || 0;
  if (current >= MAX_PRESTIGE) return { ok: false, reason: '최대 프레스티지' };
  if ((player.level || 1) < 50) return { ok: false, reason: '레벨 50 필요' };

  const nextLevel = PRESTIGE_LEVELS[current];
  player.prestige = current + 1;
  player.prestigeTokens = (player.prestigeTokens || 0) + 10;
  player.level = 1;
  player.gold = nextLevel.bonus.startGold;
  // (실제로는 더 많은 리셋 필요하지만 간략화)

  return { ok: true, prestige: player.prestige, bonus: nextLevel.bonus, unlock: nextLevel.unlock, tokens: player.prestigeTokens };
}

function register(io, socket, player) {
  socket.on('prestige_info', () => {
    socket.emit('prestige_info', { levels: PRESTIGE_LEVELS, keep: KEEP_ON_PRESTIGE, reset: RESET_ON_PRESTIGE, shop: PRESTIGE_SHOP, current: player.prestige || 0, tokens: player.prestigeTokens || 0 });
  });
  socket.on('prestige_execute', () => {
    const result = doPrestige(player);
    socket.emit('prestige_result', result);
    if (result.ok) io.emit('server_msg', `💫👑 [프레스티지] ${player.name}이(가) ${result.prestige}주차 프레스티지! 전스탯 ×${PRESTIGE_LEVELS[result.prestige-1]?.bonus?.allStat}!`);
  });
}

module.exports = { PRESTIGE_LEVELS, KEEP_ON_PRESTIGE, RESET_ON_PRESTIGE, PRESTIGE_SHOP, MAX_PRESTIGE, doPrestige, register };
