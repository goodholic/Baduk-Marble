// ============================================
// 용병 종족 + 직업 시스템 — 다양성 + 조합 시너지
// ============================================

// 12종족
const RACES = {
  human:   { name: '인간', icon: '🧑', bonus: { exp: 1.1 }, desc: '경험치+10%, 만능형', color: '#dda' },
  elf:     { name: '엘프', icon: '🧝', bonus: { spd: 1.1, matk: 1.05 }, desc: '속도+10%, 마공+5%', color: '#8f8' },
  dwarf:   { name: '드워프', icon: '⛏️', bonus: { def: 1.15, hp: 1.05 }, desc: '방어+15%, HP+5%', color: '#a86' },
  orc:     { name: '오크', icon: '👹', bonus: { atk: 1.15 }, desc: '공격+15%, 전투 특화', color: '#a64' },
  undead:  { name: '언데드', icon: '💀', bonus: { lifeSteal: 0.08 }, desc: '흡혈8%, 불사', color: '#888' },
  demon:   { name: '악마', icon: '😈', bonus: { atk: 1.1, critRate: 0.05 }, desc: '공격+10%, 크리+5%', color: '#a4a' },
  angel:   { name: '천사', icon: '👼', bonus: { healPow: 1.2 }, desc: '치유+20%', color: '#ffa' },
  dragon:  { name: '용족', icon: '🐲', bonus: { atk: 1.1, def: 1.1 }, desc: '공방+10%', color: '#f84' },
  fairy:   { name: '요정', icon: '🧚', bonus: { eva: 0.1, matk: 1.1 }, desc: '회피+10%, 마공+10%', color: '#f8f' },
  beast:   { name: '야수', icon: '🐺', bonus: { spd: 1.15, critRate: 0.05 }, desc: '속도+15%, 크리+5%', color: '#a84' },
  golem:   { name: '골렘', icon: '🗿', bonus: { def: 1.2, hp: 1.1 }, desc: '방어+20%, HP+10%, 느림', color: '#886' },
  spirit:  { name: '정령', icon: '🌀', bonus: { matk: 1.15, cdReduce: 0.1 }, desc: '마공+15%, 쿨-10%', color: '#4af' },
};

// 5직업
const CLASSES = {
  warrior:  { name: '전사', icon: '⚔️', bonus: { atk: 1.1, def: 1.05 }, desc: '근접 딜러+탱커' },
  mage:     { name: '마법사', icon: '🔮', bonus: { matk: 1.15 }, desc: '원거리 마법 딜러' },
  ranger:   { name: '궁수', icon: '🏹', bonus: { spd: 1.1, critRate: 0.05 }, desc: '원거리 물리 딜러' },
  healer:   { name: '치유사', icon: '💚', bonus: { healPow: 1.2, hp: 1.1 }, desc: '회복+서포트' },
  assassin: { name: '암살자', icon: '🗡️', bonus: { critRate: 0.1, critDmg: 1.3 }, desc: '크리티컬 특화' },
};

// 종족+직업 시너지 (특정 조합이 파티에 있으면 추가 보너스)
const RACE_SYNERGIES = [
  { races: ['elf', 'fairy'], name: '자연의 힘', bonus: { matk: 1.12, healPow: 1.1 }, icon: '🌿✨' },
  { races: ['orc', 'beast'], name: '야만의 분노', bonus: { atk: 1.15, spd: 1.05 }, icon: '👹🐺' },
  { races: ['human', 'elf', 'dwarf'], name: '삼족 동맹', bonus: { all: 1.08 }, icon: '🤝' },
  { races: ['demon', 'undead'], name: '어둠의 군단', bonus: { atk: 1.12, lifeSteal: 0.05 }, icon: '😈💀' },
  { races: ['angel', 'spirit'], name: '천상의 축복', bonus: { healPow: 1.2, def: 1.1 }, icon: '👼🌀' },
  { races: ['dragon', 'golem'], name: '고대의 힘', bonus: { def: 1.15, hp: 1.15 }, icon: '🐲🗿' },
  { races: ['dragon', 'demon', 'angel'], name: '삼계의 균형', bonus: { all: 1.1 }, icon: '🐲😈👼', legendary: true },
];

// 히든 카드 조합 레시피 (특정 카드 2장 합성 → 히든 카드)
const HIDDEN_RECIPES = [
  { a: '정예 전사', b: '정예 마법사', result: { name: '마검사', icon: '⚔️🔮', grade: 'legend', race: 'human', class: 'warrior', atk: 150, def: 80, hp: 600, matk: 100, desc: '검과 마법을 동시에!' } },
  { a: '정예 궁수', b: '암살자', result: { name: '그림자 사수', icon: '🏹🌑', grade: 'legend', race: 'elf', class: 'assassin', atk: 130, def: 50, hp: 400, spd: 15, critRate: 0.2, desc: '보이지 않는 화살' } },
  { a: '영웅 검사', b: '용기사', result: { name: '드래곤 블레이드', icon: '🐲⚔️', grade: 'myth', race: 'dragon', class: 'warrior', atk: 250, def: 120, hp: 900, desc: '용의 힘을 품은 검사' } },
  { a: '대마도사', b: '빛의 천사', result: { name: '대천사 마도사', icon: '👼🔮', grade: 'myth', race: 'angel', class: 'mage', atk: 200, matk: 300, hp: 700, healPow: 150, desc: '천상의 마법사' } },
  { a: '전설의 검성', b: '불사조', result: { name: '불멸의 전사', icon: '🔥⚔️🌟', grade: 'myth', race: 'spirit', class: 'warrior', atk: 300, def: 150, hp: 1200, revive: true, desc: '죽지 않는 검성' } },
];

// 소환 시 랜덤 종족/직업 부여
function assignRaceAndClass(card) {
  if (!card.race) {
    const raceKeys = Object.keys(RACES);
    card.race = raceKeys[Math.floor(Math.random() * raceKeys.length)];
  }
  if (!card.class) {
    const classKeys = Object.keys(CLASSES);
    card.class = classKeys[Math.floor(Math.random() * classKeys.length)];
  }
  // 종족+직업 보너스 적용
  const race = RACES[card.race];
  const cls = CLASSES[card.class];
  if (race?.bonus?.atk) card.atk = Math.floor((card.atk || 30) * race.bonus.atk);
  if (race?.bonus?.def) card.def = Math.floor((card.def || 20) * race.bonus.def);
  if (cls?.bonus?.atk) card.atk = Math.floor((card.atk || 30) * cls.bonus.atk);
  if (cls?.bonus?.matk) card.matk = Math.floor((card.matk || 0) + 20 * cls.bonus.matk);
  card.raceIcon = race?.icon || '🧑';
  card.classIcon = cls?.icon || '⚔️';
  return card;
}

// 히든 카드 합성 체크
function checkHiddenRecipe(cardA, cardB) {
  const nameA = (cardA.name || '').replace(/[★+]+$/, '');
  const nameB = (cardB.name || '').replace(/[★+]+$/, '');
  return HIDDEN_RECIPES.find(r =>
    (r.a === nameA && r.b === nameB) || (r.a === nameB && r.b === nameA)
  );
}

function fuseHidden(player, cardIdA, cardIdB) {
  const cardA = (player.cards || []).find(c => c.id === cardIdA);
  const cardB = (player.cards || []).find(c => c.id === cardIdB);
  if (!cardA || !cardB) return { ok: false, reason: '카드 없음' };
  if ((player.gold || 0) < 10000) return { ok: false, reason: '골드 10000 필요' };

  const recipe = checkHiddenRecipe(cardA, cardB);
  if (!recipe) return { ok: false, reason: '히든 조합이 아닙니다' };

  player.gold -= 10000;
  player.cards = player.cards.filter(c => c.id !== cardIdA && c.id !== cardIdB);
  const newCard = { ...recipe.result, id: `card_${Date.now()}_hidden`, level: 1 };
  player.cards.push(newCard);

  return { ok: true, msg: `🌟 히든 카드 발견! "${newCard.name}" (${newCard.grade.toUpperCase()})`, card: newCard };
}

function register(io, socket, player) {
  socket.on('card_fuse_hidden', (data) => {
    const result = fuseHidden(player, data.cardIdA, data.cardIdB);
    socket.emit('card_fuse_hidden_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟✨ [히든 카드] ${player.displayName || '???'}이(가) "${result.card.name}" 발견!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  socket.on('card_races_info', () => {
    socket.emit('card_races_info', { races: RACES, classes: CLASSES, synergies: RACE_SYNERGIES, recipes: HIDDEN_RECIPES.map(r => ({ a: r.a, b: r.b, resultName: r.result.name, grade: r.result.grade })) });
  });
}

module.exports = { RACES, CLASSES, RACE_SYNERGIES, HIDDEN_RECIPES, assignRaceAndClass, checkHiddenRecipe, fuseHidden, register };
