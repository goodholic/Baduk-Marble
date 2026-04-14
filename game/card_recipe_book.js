// ============================================
// 카드 레시피 북 — 합성/진화/히든 조합 미리보기
// ============================================

// 모든 합성 가능한 경로를 한눈에
const RECIPE_BOOK = {
  evolution: [
    { from: '견습 전사', to: '정예 전사', reqLv: 10, cost: 3000, icon: '⚔️→⚔️🔥' },
    { from: '정예 전사', to: '영웅 검사', reqLv: 20, cost: 10000, icon: '⚔️🔥→⚔️💎' },
    { from: '영웅 검사', to: '전설의 검성', reqLv: 30, cost: 30000, icon: '⚔️💎→⚔️🌟' },
    { from: '견습 궁수', to: '정예 궁수', reqLv: 10, cost: 3000, icon: '🏹→🏹🔥' },
    { from: '정예 궁수', to: '영웅 사수', reqLv: 20, cost: 10000, icon: '🏹🔥→🏹💎' },
    { from: '견습 마법사', to: '정예 마법사', reqLv: 10, cost: 3000, icon: '🔮→🔮🔥' },
    { from: '정예 마법사', to: '대마도사', reqLv: 20, cost: 10000, icon: '🔮🔥→🔮💎' },
  ],
  hidden: [
    { a: '정예 전사', b: '정예 마법사', result: '마검사', grade: 'legend', icon: '⚔️+🔮→⚔️🔮', cost: 10000, hint: '검과 마법의 결합...' },
    { a: '정예 궁수', b: '암살자', result: '그림자 사수', grade: 'legend', icon: '🏹+🗡️→🏹🌑', cost: 10000, hint: '보이지 않는 화살...' },
    { a: '영웅 검사', b: '용기사', result: '드래곤 블레이드', grade: 'myth', icon: '⚔️+🐲→🐲⚔️', cost: 20000, hint: '용의 피가 검에 깃든다...' },
    { a: '대마도사', b: '빛의 천사', result: '대천사 마도사', grade: 'myth', icon: '🔮+👼→👼🔮', cost: 20000, hint: '천상의 마법...' },
    { a: '전설의 검성', b: '불사조', result: '불멸의 전사', grade: 'myth', icon: '⚔️🌟+🔥🐦→🔥⚔️🌟', cost: 30000, hint: '죽음조차 멈추지 못하는...' },
  ],
  awakening: [
    { from: '전설의 검성', to: '신검의 주인', reqLv: 30, reqStars: 3, icon: '⚔️🌟→⚔️👑🌟', skill: '무쌍검' },
    { from: '대마도사', to: '차원의 현자', reqLv: 30, reqStars: 3, icon: '🔮💎→🔮👑🌟', skill: '차원 붕괴' },
    { from: '영웅 사수', to: '신궁', reqLv: 30, reqStars: 3, icon: '🏹💎→🏹👑🌟', skill: '만발 사격' },
    { from: '마검사', to: '검마신', reqLv: 30, reqStars: 3, icon: '⚔️🔮→⚔️🔮👑', skill: '마검 합일' },
    { from: '드래곤 블레이드', to: '용신', reqLv: 30, reqStars: 3, icon: '🐲⚔️→🐲⚔️👑', skill: '용신의 일격' },
    { from: '불멸의 전사', to: '영원의 수호자', reqLv: 30, reqStars: 3, icon: '🔥⚔️🌟→🔥⚔️👑', skill: '불멸' },
  ],
  fusion: [
    { desc: '같은 등급 3장 → 상위 등급 1장', example: 'normal×3 → rare×1', icon: '🃏🃏🃏→🃏⬆️' },
    { desc: '같은 카드 2장 → 진급 (★+1)', example: '견습전사×2 → 견습전사★', icon: '🃏🃏→🃏⭐' },
  ],
};

// 레시피 발견 상태 (플레이어별)
function getDiscoveredRecipes(player) {
  const discovered = player.discoveredRecipes || [];
  return {
    evolution: RECIPE_BOOK.evolution, // 항상 공개
    fusion: RECIPE_BOOK.fusion, // 항상 공개
    hidden: RECIPE_BOOK.hidden.map(r => ({
      ...r,
      discovered: discovered.includes(r.result),
      result: discovered.includes(r.result) ? r.result : '???',
      grade: discovered.includes(r.result) ? r.grade : '???',
    })),
    awakening: RECIPE_BOOK.awakening.map(r => ({
      ...r,
      discovered: discovered.includes(r.to),
      to: discovered.includes(r.to) ? r.to : '???',
      skill: discovered.includes(r.to) ? r.skill : '???',
    })),
  };
}

// 레시피 발견 기록
function discoverRecipe(player, resultName) {
  player.discoveredRecipes = player.discoveredRecipes || [];
  if (!player.discoveredRecipes.includes(resultName)) {
    player.discoveredRecipes.push(resultName);
    return true;
  }
  return false;
}

function register(io, socket, player) {
  socket.on('recipe_book', () => {
    socket.emit('recipe_book', getDiscoveredRecipes(player));
  });
}

module.exports = { RECIPE_BOOK, getDiscoveredRecipes, discoverRecipe, register };
