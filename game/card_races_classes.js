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

// ============================================
// 종족 고유 액티브 스킬
// ============================================
const RACE_SKILLS = {
  human:  { name: '지휘', icon: '📢', desc: '팀 ATK +15% (3턴)', effect: { teamAtk: 0.15, duration: 3 } },
  elf:    { name: '자연의 치유', icon: '🌿', desc: '팀 HP 10% 회복', effect: { teamHeal: 0.1 } },
  dwarf:  { name: '강철 의지', icon: '⛏️🛡️', desc: 'DEF 2배 (2턴)', effect: { selfDef: 2.0, duration: 2 } },
  orc:    { name: '분노', icon: '💢', desc: 'ATK +50% but DEF -30%', effect: { selfAtk: 0.5, selfDefDown: 0.3 } },
  undead: { name: '역병', icon: '☠️💀', desc: '적 전체 DOT (3턴)', effect: { enemyDot: 0.05, duration: 3 } },
  demon:  { name: '공포', icon: '😱', desc: '적 ATK -20% (3턴)', effect: { enemyAtkDown: 0.2, duration: 3 } },
  angel:  { name: '부활', icon: '👼✨', desc: '쓰러진 아군 1명 HP 50% 부활', effect: { revive: 0.5 } },
  dragon: { name: '드래곤 브레스', icon: '🐲🔥', desc: '적 전체 ATK×2 화염', effect: { aoe: 2.0, element: 'fire' } },
  fairy:  { name: '환혹', icon: '🧚✨', desc: '적 1명 3턴 매혹(아군 전환)', effect: { charm: 3 } },
  beast:  { name: '야수 본능', icon: '🐺💢', desc: 'SPD 2배+선공 확정', effect: { spdMul: 2, firstStrike: true } },
  golem:  { name: '대지 진동', icon: '🗿💥', desc: '적 전체 둔화 50%', effect: { aoeSlowed: 0.5, duration: 3 } },
  spirit: { name: '원소 폭풍', icon: '🌀💥', desc: '랜덤 원소 전체 공격', effect: { randomElement: true, aoe: 1.8 } },
};

// ============================================
// 직업 전직 시스템 (레벨 20 이상)
// ============================================
const CLASS_ADVANCEMENT = {
  warrior: [
    { name: '검성', icon: '⚔️🌟', reqLevel: 20, bonus: { atk: 1.25, critRate: 0.1 }, skill: '무쌍검' },
    { name: '수호기사', icon: '🛡️✨', reqLevel: 20, bonus: { def: 1.3, hp: 1.2 }, skill: '불멸 방패' },
  ],
  mage: [
    { name: '대마도사', icon: '🔮🌟', reqLevel: 20, bonus: { matk: 1.3 }, skill: '차원 파괴' },
    { name: '현자', icon: '📚✨', reqLevel: 20, bonus: { matk: 1.15, healPow: 1.2 }, skill: '생명의 기적' },
  ],
  ranger: [
    { name: '신궁', icon: '🏹🌟', reqLevel: 20, bonus: { atk: 1.2, critRate: 0.15 }, skill: '만발 사격' },
    { name: '사냥꾼', icon: '🎯', reqLevel: 20, bonus: { spd: 1.2, trapDmg: 1.5 }, skill: '함정 설치' },
  ],
  healer: [
    { name: '성직자', icon: '✨💚', reqLevel: 20, bonus: { healPow: 1.4, def: 1.1 }, skill: '성역' },
    { name: '드루이드', icon: '🌿💚', reqLevel: 20, bonus: { healPow: 1.2, atk: 1.15 }, skill: '자연의 분노' },
  ],
  assassin: [
    { name: '사신', icon: '💀🗡️', reqLevel: 20, bonus: { critDmg: 1.5, critRate: 0.15 }, skill: '즉사' },
    { name: '닌자', icon: '🥷', reqLevel: 20, bonus: { eva: 0.2, spd: 1.2 }, skill: '분신술' },
  ],
};

// ============================================
// 종족+직업 시너지
// ============================================
const RACE_SYNERGIES = [
  { races: ['elf', 'fairy'], name: '자연의 힘', bonus: { matk: 1.12, healPow: 1.1 }, icon: '🌿✨' },
  { races: ['orc', 'beast'], name: '야만의 분노', bonus: { atk: 1.15, spd: 1.05 }, icon: '👹🐺' },
  { races: ['human', 'elf', 'dwarf'], name: '삼족 동맹', bonus: { all: 1.08 }, icon: '🤝' },
  { races: ['demon', 'undead'], name: '어둠의 군단', bonus: { atk: 1.12, lifeSteal: 0.05 }, icon: '😈💀' },
  { races: ['angel', 'spirit'], name: '천상의 축복', bonus: { healPow: 1.2, def: 1.1 }, icon: '👼🌀' },
  { races: ['dragon', 'golem'], name: '고대의 힘', bonus: { def: 1.15, hp: 1.15 }, icon: '🐲🗿' },
  { races: ['dragon', 'demon', 'angel'], name: '삼계의 균형', bonus: { all: 1.1 }, icon: '🐲😈👼', legendary: true },
];

// ============================================
// 히든 카드 조합 레시피 (15개)
// ============================================
const HIDDEN_RECIPES = [
  // 기존 5개
  { a: '정예 전사', b: '정예 마법사', result: { name: '마검사', icon: '⚔️🔮', grade: 'legend', race: 'human', class: 'warrior', atk: 150, def: 80, hp: 600, matk: 100, desc: '검과 마법을 동시에!' } },
  { a: '정예 궁수', b: '암살자', result: { name: '그림자 사수', icon: '🏹🌑', grade: 'legend', race: 'elf', class: 'assassin', atk: 130, def: 50, hp: 400, spd: 15, critRate: 0.2, desc: '보이지 않는 화살' } },
  { a: '영웅 검사', b: '용기사', result: { name: '드래곤 블레이드', icon: '🐲⚔️', grade: 'myth', race: 'dragon', class: 'warrior', atk: 250, def: 120, hp: 900, desc: '용의 힘을 품은 검사' } },
  { a: '대마도사', b: '빛의 천사', result: { name: '대천사 마도사', icon: '👼🔮', grade: 'myth', race: 'angel', class: 'mage', atk: 200, matk: 300, hp: 700, healPow: 150, desc: '천상의 마법사' } },
  { a: '전설의 검성', b: '불사조', result: { name: '불멸의 전사', icon: '🔥⚔️🌟', grade: 'myth', race: 'spirit', class: 'warrior', atk: 300, def: 150, hp: 1200, revive: true, desc: '죽지 않는 검성' } },
  // 신규 10개
  { a: '성기사', b: '암살자', result: { name: '심판자', icon: '⚖️🗡️', grade: 'legend', race: 'angel', class: 'assassin', atk: 180, def: 90, hp: 550, critRate: 0.15, desc: '빛과 어둠의 심판' } },
  { a: '치유사', b: '네크로맨서', result: { name: '생사의 지배자', icon: '💀💚', grade: 'myth', race: 'spirit', class: 'healer', atk: 120, matk: 250, hp: 800, healPow: 180, lifeSteal: 0.15, desc: '생과 사를 넘나드는 자' } },
  { a: '드루이드', b: '골렘', result: { name: '대지의 수호자', icon: '🌿🗿', grade: 'legend', race: 'golem', class: 'healer', atk: 100, def: 200, hp: 1000, healPow: 130, desc: '대지 자체가 된 수호자' } },
  { a: '요정 궁수', b: '정령술사', result: { name: '환상의 사수', icon: '🧚🏹✨', grade: 'legend', race: 'fairy', class: 'ranger', atk: 160, matk: 120, hp: 450, eva: 0.2, desc: '환상 화살을 쏘는 사수' } },
  { a: '오크 전사', b: '드래곤 나이트', result: { name: '파멸의 광전사', icon: '👹🐲💥', grade: 'myth', race: 'dragon', class: 'warrior', atk: 320, def: 80, hp: 850, critDmg: 1.5, desc: '파괴만을 갈망하는 전사' } },
  { a: '언데드 마법사', b: '악마 소환사', result: { name: '지옥의 군주', icon: '😈☠️🔥', grade: 'myth', race: 'demon', class: 'mage', atk: 180, matk: 350, hp: 650, lifeSteal: 0.2, desc: '지옥을 다스리는 군주' } },
  { a: '엘프 치유사', b: '천사', result: { name: '세계수의 축복', icon: '🌳👼💚', grade: 'legend', race: 'elf', class: 'healer', atk: 60, matk: 150, hp: 700, healPow: 250, desc: '세계수의 힘으로 치유' } },
  { a: '드워프 대장장이', b: '골렘 근위병', result: { name: '강철 요새', icon: '⛏️🗿🛡️', grade: 'legend', race: 'golem', class: 'warrior', atk: 140, def: 280, hp: 1400, desc: '움직이는 철벽 요새' } },
  { a: '야수왕', b: '정령왕', result: { name: '원시의 화신', icon: '🐺🌀🌟', grade: 'myth', race: 'beast', class: 'mage', atk: 220, matk: 280, hp: 750, spd: 18, desc: '원시 자연의 힘을 구현' } },
  { a: '인간 영웅', b: '마왕', result: { name: '균형의 수호자', icon: '⚖️🌟✨', grade: 'myth', race: 'human', class: 'warrior', atk: 280, def: 180, hp: 1100, matk: 200, desc: '선과 악의 균형을 잡는 자' } },
];

// ============================================
// 종족 퀘스트 체인
// ============================================
const RACE_QUESTS = {
  human:  { name: '인류의 지도자', steps: ['PvP 10승', '파티에 3종족 이상 편성', '동맹 시너지 3회 발동'], reward: { raceSkillUpgrade: true, title: '인류의 지도자', gold: 3000 } },
  elf:    { name: '숲의 수호', steps: ['원정 20회', '농장 수집 10회', '치유 스킬 사용 50회'], reward: { raceSkillUpgrade: true, title: '숲의 수호자', gold: 3000 } },
  dwarf:  { name: '대장장이의 길', steps: ['장비 강화 20회', '방어 1000 이상 달성', '골렘 시너지 발동 5회'], reward: { raceSkillUpgrade: true, title: '대장장이', gold: 3000 } },
  orc:    { name: '전쟁의 왕', steps: ['IO 30킬', 'PvP 20승', '분노 스킬 사용 30회'], reward: { raceSkillUpgrade: true, title: '전쟁의 왕', gold: 3000 } },
  undead: { name: '불사의 군단', steps: ['언데드 용병 5명 보유', '흡혈 총량 10000 달성', '어둠의 군단 시너지 10회'], reward: { raceSkillUpgrade: true, title: '불사왕', gold: 3000 } },
  demon:  { name: '악마의 계약', steps: ['악마 용병 5명 보유', 'PvP 15승', '공포 스킬 사용 20회'], reward: { raceSkillUpgrade: true, title: '마왕', gold: 3000 } },
  angel:  { name: '천상의 시험', steps: ['치유 총량 20000 달성', '부활 스킬 사용 10회', '천상의 축복 시너지 5회'], reward: { raceSkillUpgrade: true, title: '대천사', gold: 3000 } },
  dragon: { name: '용의 시험', steps: ['IO 10킬', '보스 원정 클리어', 'PvP 5승'], reward: { raceSkillUpgrade: true, title: '용의 후예', gold: 5000 } },
  fairy:  { name: '환상의 무도회', steps: ['매혹 스킬 사용 15회', '요정 용병 3명 보유', '회피 50회 성공'], reward: { raceSkillUpgrade: true, title: '요정왕', gold: 3000 } },
  beast:  { name: '야생의 본능', steps: ['선공 20회 달성', '야수 용병 4명 보유', '야만의 분노 시너지 5회'], reward: { raceSkillUpgrade: true, title: '야수왕', gold: 3000 } },
  golem:  { name: '대지의 맹세', steps: ['총 받은 데미지 50000 이상', '골렘 용병 3명 보유', '둔화 적용 30회'], reward: { raceSkillUpgrade: true, title: '대지의 수호자', gold: 3000 } },
  spirit: { name: '원소의 조화', steps: ['4원소 공격 사용 각 10회', '정령 용병 3명 보유', '쿨타임 감소 총 100턴'], reward: { raceSkillUpgrade: true, title: '원소의 군주', gold: 3000 } },
};

// ============================================
// 종족 전쟁 이벤트 (서버 전체 종족 경쟁)
// ============================================
const raceWarState = {
  active: false,
  startedAt: null,
  endsAt: null,
  scores: {},      // { race: totalKills }
  participants: {}, // { race: Set of playerIds }
};

function startRaceWar(durationMs) {
  raceWarState.active = true;
  raceWarState.startedAt = Date.now();
  raceWarState.endsAt = Date.now() + (durationMs || 7 * 24 * 60 * 60 * 1000); // default 1 week
  raceWarState.scores = {};
  raceWarState.participants = {};
  for (const r of Object.keys(RACES)) {
    raceWarState.scores[r] = 0;
    raceWarState.participants[r] = new Set();
  }
}

function addRaceWarScore(race, playerId, points) {
  if (!raceWarState.active) return;
  if (!raceWarState.scores[race] && raceWarState.scores[race] !== 0) return;
  raceWarState.scores[race] += (points || 1);
  if (!raceWarState.participants[race]) raceWarState.participants[race] = new Set();
  raceWarState.participants[race].add(playerId);
}

function getRaceWarStatus() {
  if (!raceWarState.active) return { active: false, msg: '종족 전쟁 이벤트가 진행 중이 아닙니다.' };
  const now = Date.now();
  const remaining = Math.max(0, raceWarState.endsAt - now);
  const sorted = Object.entries(raceWarState.scores).sort((a, b) => b[1] - a[1]);
  const ranking = sorted.map(([race, score], i) => ({
    rank: i + 1,
    race,
    name: RACES[race]?.name || race,
    icon: RACES[race]?.icon || '',
    score,
    participants: raceWarState.participants[race] ? raceWarState.participants[race].size : 0,
  }));
  return {
    active: true,
    remainingMs: remaining,
    remainingText: `${Math.floor(remaining / 3600000)}시간 ${Math.floor((remaining % 3600000) / 60000)}분`,
    ranking,
    winnerReward: { gold: 5000, title: '종족 챔피언' },
  };
}

function endRaceWar() {
  if (!raceWarState.active) return null;
  raceWarState.active = false;
  const sorted = Object.entries(raceWarState.scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return null;
  const winnerRace = sorted[0][0];
  const winnerParticipants = raceWarState.participants[winnerRace]
    ? Array.from(raceWarState.participants[winnerRace]) : [];
  return {
    winnerRace,
    winnerName: RACES[winnerRace]?.name || winnerRace,
    score: sorted[0][1],
    participants: winnerParticipants,
    reward: { gold: 5000, title: '종족 챔피언' },
  };
}

// ============================================
// 소환 시 랜덤 종족/직업 부여
// ============================================
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

// ============================================
// 종족 스킬 사용
// ============================================
function useRaceSkill(player, cardId, battleCtx) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  if (!card.race || !RACE_SKILLS[card.race]) return { ok: false, reason: '종족 스킬 없음' };

  const skill = RACE_SKILLS[card.race];
  // 쿨다운 체크
  const cooldownKey = `raceSkillCd_${cardId}`;
  if (player[cooldownKey] && player[cooldownKey] > 0) {
    return { ok: false, reason: `쿨다운 ${player[cooldownKey]}턴 남음` };
  }

  // 쿨다운 설정 (기본 5턴)
  player[cooldownKey] = 5;

  return {
    ok: true,
    skill,
    race: card.race,
    cardId,
    msg: `${card.raceIcon || ''} ${card.name}이(가) "${skill.name}" 사용! — ${skill.desc}`,
  };
}

// ============================================
// 직업 전직
// ============================================
function advanceClass(player, cardId, pathIndex) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };
  if (!card.class) return { ok: false, reason: '직업 없음' };
  if ((card.level || 1) < 20) return { ok: false, reason: '레벨 20 이상 필요 (현재: ' + (card.level || 1) + ')' };
  if (card.advancedClass) return { ok: false, reason: '이미 전직 완료' };

  const paths = CLASS_ADVANCEMENT[card.class];
  if (!paths) return { ok: false, reason: '전직 경로 없음' };
  if (pathIndex < 0 || pathIndex >= paths.length) return { ok: false, reason: '유효하지 않은 전직 경로' };

  const cost = 10000;
  if ((player.gold || 0) < cost) return { ok: false, reason: `골드 ${cost} 필요` };

  const path = paths[pathIndex];
  player.gold -= cost;
  card.advancedClass = path.name;
  card.advancedClassIcon = path.icon;
  card.advancedSkill = path.skill;

  // 전직 보너스 적용
  const bonus = path.bonus;
  if (bonus.atk) card.atk = Math.floor((card.atk || 30) * bonus.atk);
  if (bonus.def) card.def = Math.floor((card.def || 20) * bonus.def);
  if (bonus.hp) card.hp = Math.floor((card.hp || 100) * bonus.hp);
  if (bonus.matk) card.matk = Math.floor((card.matk || 0) * bonus.matk);
  if (bonus.healPow) card.healPow = Math.floor((card.healPow || 50) * bonus.healPow);
  if (bonus.critRate) card.critRate = (card.critRate || 0) + bonus.critRate;
  if (bonus.critDmg) card.critDmg = (card.critDmg || 1.0) * bonus.critDmg;
  if (bonus.eva) card.eva = (card.eva || 0) + bonus.eva;
  if (bonus.spd) card.spd = Math.floor((card.spd || 5) * bonus.spd);
  if (bonus.trapDmg) card.trapDmg = bonus.trapDmg;

  return {
    ok: true,
    msg: `🌟 ${card.name}이(가) "${path.name}"(으)로 전직! 스킬: ${path.skill}`,
    card,
  };
}

// ============================================
// 종족 퀘스트 진행도
// ============================================
function getRaceQuestInfo(player) {
  // 플레이어가 보유한 종족들의 퀘스트 정보 반환
  const ownedRaces = new Set();
  (player.cards || []).forEach(c => { if (c.race) ownedRaces.add(c.race); });

  const quests = [];
  for (const race of ownedRaces) {
    const quest = RACE_QUESTS[race];
    if (!quest) continue;
    const progressKey = `raceQuest_${race}`;
    const progress = player[progressKey] || Array(quest.steps.length).fill(false);
    const completed = progress.every(v => v === true);
    quests.push({
      race,
      raceName: RACES[race]?.name || race,
      raceIcon: RACES[race]?.icon || '',
      questName: quest.name,
      steps: quest.steps.map((step, i) => ({ desc: step, done: !!progress[i] })),
      completed,
      reward: quest.reward,
    });
  }
  return quests;
}

function progressRaceQuest(player, race, stepIndex) {
  const quest = RACE_QUESTS[race];
  if (!quest) return { ok: false, reason: '퀘스트 없음' };
  const progressKey = `raceQuest_${race}`;
  if (!player[progressKey]) player[progressKey] = Array(quest.steps.length).fill(false);

  if (stepIndex < 0 || stepIndex >= quest.steps.length) return { ok: false, reason: '유효하지 않은 단계' };
  if (player[progressKey][stepIndex]) return { ok: false, reason: '이미 완료된 단계' };

  player[progressKey][stepIndex] = true;

  // 전체 완료 체크
  const allDone = player[progressKey].every(v => v === true);
  if (allDone) {
    // 보상 지급
    player.gold = (player.gold || 0) + (quest.reward.gold || 0);
    if (!player.titles) player.titles = [];
    if (quest.reward.title && !player.titles.includes(quest.reward.title)) {
      player.titles.push(quest.reward.title);
    }
    return {
      ok: true,
      completed: true,
      msg: `🎉 종족 퀘스트 "${quest.name}" 완료! 보상: ${quest.reward.gold}G + 칭호 "${quest.reward.title}"`,
    };
  }

  return { ok: true, completed: false, msg: `퀘스트 진행: ${quest.steps[stepIndex]} 완료!` };
}

// ============================================
// 히든 카드 합성 체크
// ============================================
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

// ============================================
// 소켓 이벤트 등록
// ============================================
function register(io, socket, player) {
  // 히든 합성
  socket.on('card_fuse_hidden', (data) => {
    const result = fuseHidden(player, data.cardIdA, data.cardIdB);
    socket.emit('card_fuse_hidden_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟✨ [히든 카드] ${player.displayName || '???'}이(가) "${result.card.name}" 발견!`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 종족/직업 정보 조회
  socket.on('card_races_info', () => {
    socket.emit('card_races_info', {
      races: RACES,
      classes: CLASSES,
      synergies: RACE_SYNERGIES,
      raceSkills: RACE_SKILLS,
      classAdvancement: CLASS_ADVANCEMENT,
      recipes: HIDDEN_RECIPES.map(r => ({ a: r.a, b: r.b, resultName: r.result.name, grade: r.result.grade })),
    });
  });

  // 종족 스킬 사용
  socket.on('race_skill_use', (data) => {
    const result = useRaceSkill(player, data.cardId, data.battleCtx || {});
    socket.emit('race_skill_result', result);
    if (result.ok) {
      io.emit('server_msg', `${result.skill.icon} ${player.displayName || '???'}: ${result.msg}`);
    }
  });

  // 직업 전직
  socket.on('class_advance', (data) => {
    const result = advanceClass(player, data.cardId, data.pathIndex || 0);
    socket.emit('class_advance_result', result);
    if (result.ok) {
      io.emit('server_msg', `🌟 [전직] ${player.displayName || '???'}: ${result.msg}`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });

  // 종족 전쟁 상태 조회
  socket.on('race_war_status', () => {
    socket.emit('race_war_status', getRaceWarStatus());
  });

  // 종족 퀘스트 정보
  socket.on('race_quest_info', () => {
    socket.emit('race_quest_info', getRaceQuestInfo(player));
  });

  // 종족 퀘스트 진행
  socket.on('race_quest_progress', (data) => {
    const result = progressRaceQuest(player, data.race, data.stepIndex);
    socket.emit('race_quest_progress_result', result);
    if (result.ok && result.completed) {
      io.emit('server_msg', `🎉 [종족 퀘스트] ${player.displayName || '???'}: ${result.msg}`);
      socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    }
  });
}

// ============================================
// module.exports
// ============================================
module.exports = {
  RACES,
  CLASSES,
  RACE_SKILLS,
  CLASS_ADVANCEMENT,
  RACE_SYNERGIES,
  HIDDEN_RECIPES,
  RACE_QUESTS,
  assignRaceAndClass,
  useRaceSkill,
  advanceClass,
  checkHiddenRecipe,
  fuseHidden,
  getRaceWarStatus,
  startRaceWar,
  addRaceWarScore,
  endRaceWar,
  getRaceQuestInfo,
  progressRaceQuest,
  register,
};
