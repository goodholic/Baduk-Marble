// v5.2 — 용병 아카데미 시스템
// 훈련/교육으로 클래스 전직, 새 스킬 학습, 특수 자격증 취득

// 전직 트리 (2차/3차 전직)
const CLASS_TREE = {
  warrior: {
    name: '전사', icon: '⚔️',
    tier2: [
      { id: 'berserker', name: '광전사', icon: '🔥⚔️', req: { level: 20, kills: 50 }, bonus: { atk: 1.2, def: 0.9 }, skills: ['분노의 일격', '광폭 돌진'] },
      { id: 'guardian', name: '수호전사', icon: '🛡️⚔️', req: { level: 20, defends: 30 }, bonus: { def: 1.3, hp: 1.2 }, skills: ['철벽 방어', '도발'] },
      { id: 'blade_dancer', name: '검무사', icon: '💃⚔️', req: { level: 20, crits: 40 }, bonus: { atk: 1.1, spd: 1.2, crit: 1.15 }, skills: ['연환참', '검무'] },
    ],
    tier3: [
      { id: 'war_god', name: '전쟁신', icon: '⚔️👑', req: { level: 40, tier2: true, bossKills: 20 }, bonus: { atk: 1.4, def: 1.2 }, skills: ['천하무적', '전쟁의 화신'], ultimate: true },
    ],
  },
  mage: {
    name: '마법사', icon: '🔮',
    tier2: [
      { id: 'elementalist', name: '원소술사', icon: '🌊🔥', req: { level: 20, spells: 100 }, bonus: { matk: 1.25, elemDmg: 1.2 }, skills: ['원소 폭풍', '원소 장벽'] },
      { id: 'necromancer', name: '강령술사', icon: '💀🔮', req: { level: 20, mercDeaths: 10 }, bonus: { matk: 1.15, summon: true }, skills: ['언데드 소환', '생명력 흡수'] },
      { id: 'enchanter', name: '부여술사', icon: '✨🔮', req: { level: 20, buffCount: 50 }, bonus: { matk: 1.1, buffPow: 1.3 }, skills: ['강화 마법', '마력 주입'] },
    ],
    tier3: [
      { id: 'archmage', name: '대마도사', icon: '🔮👑', req: { level: 40, tier2: true, dungeonClears: 30 }, bonus: { matk: 1.5, mpRegen: 2.0 }, skills: ['금단의 마법', '마나 폭발'], ultimate: true },
    ],
  },
  assassin: {
    name: '암살자', icon: '🗡️',
    tier2: [
      { id: 'shadow_blade', name: '그림자 칼날', icon: '🌑🗡️', req: { level: 20, stealthKills: 30 }, bonus: { atk: 1.2, crit: 1.3 }, skills: ['암살', '그림자 도약'] },
      { id: 'poison_master', name: '독술사', icon: '☠️🗡️', req: { level: 20, poisonHits: 50 }, bonus: { atk: 1.1, dotDmg: 1.5 }, skills: ['맹독 칼날', '독안개'] },
      { id: 'ninja', name: '닌자', icon: '🥷', req: { level: 20, evasions: 40 }, bonus: { spd: 1.3, eva: 1.25 }, skills: ['분신술', '표창 연사'] },
    ],
    tier3: [
      { id: 'phantom', name: '환영', icon: '👻🗡️', req: { level: 40, tier2: true, pvpWins: 50 }, bonus: { atk: 1.3, spd: 1.4, stealth: true }, skills: ['절대 은신', '환영 폭살'], ultimate: true },
    ],
  },
  healer: {
    name: '힐러', icon: '💚',
    tier2: [
      { id: 'saint', name: '성녀', icon: '👼💚', req: { level: 20, heals: 200 }, bonus: { healPow: 1.4, def: 1.1 }, skills: ['대치유', '성역'] },
      { id: 'druid', name: '드루이드', icon: '🌿💚', req: { level: 20, natureCasts: 80 }, bonus: { healPow: 1.2, summon: true }, skills: ['자연의 축복', '정령 소환'] },
      { id: 'battle_priest', name: '전투사제', icon: '⚔️💚', req: { level: 20, combatHeals: 60 }, bonus: { atk: 1.15, healPow: 1.15 }, skills: ['성스러운 일격', '전투 축복'] },
    ],
    tier3: [
      { id: 'life_god', name: '생명의 신', icon: '💚👑', req: { level: 40, tier2: true, revives: 10 }, bonus: { healPow: 1.6, hp: 1.3 }, skills: ['생사역전', '불멸의 은총'], ultimate: true },
    ],
  },
  ranger: {
    name: '궁수', icon: '🏹',
    tier2: [
      { id: 'sniper', name: '저격수', icon: '🎯🏹', req: { level: 20, headshots: 30 }, bonus: { atk: 1.2, range: 1.5, critDmg: 1.3 }, skills: ['정밀 저격', '약점 간파'] },
      { id: 'beast_archer', name: '야수궁사', icon: '🐺🏹', req: { level: 20, tames: 5 }, bonus: { atk: 1.1, petBonus: 1.3 }, skills: ['야수 동행', '다중 사격'] },
      { id: 'wind_ranger', name: '바람의 궁사', icon: '🌪️🏹', req: { level: 20, speedKills: 40 }, bonus: { spd: 1.25, atkSpd: 1.3 }, skills: ['폭풍 화살', '질풍 연사'] },
    ],
    tier3: [
      { id: 'divine_archer', name: '신궁', icon: '🏹👑', req: { level: 40, tier2: true, perfectClears: 20 }, bonus: { atk: 1.4, range: 2.0 }, skills: ['하늘의 화살', '만발 사격'], ultimate: true },
    ],
  },
};

// 스킬 학습 (아카데미에서 골드+시간으로 학습)
const LEARNABLE_SKILLS = [
  { id: 'double_strike', name: '이연격', cost: 3000, time: 60, class: 'any', desc: '2회 연속 공격' },
  { id: 'counter', name: '카운터', cost: 5000, time: 120, class: 'any', desc: '피격 시 30% 확률 반격' },
  { id: 'war_cry', name: '전쟁의 함성', cost: 8000, time: 180, class: 'warrior', desc: '팀 ATK+15% (10초)' },
  { id: 'fireball', name: '파이어볼', cost: 4000, time: 90, class: 'mage', desc: '범위 화염 데미지' },
  { id: 'backstab', name: '백스탭', cost: 6000, time: 150, class: 'assassin', desc: '배후 공격 시 데미지 3배' },
  { id: 'mass_heal', name: '대치유', cost: 10000, time: 240, class: 'healer', desc: '아군 전원 HP 25% 회복' },
  { id: 'multi_shot', name: '다중 사격', cost: 5000, time: 120, class: 'ranger', desc: '3방향 동시 사격' },
  { id: 'iron_will', name: '강철 의지', cost: 7000, time: 180, class: 'any', desc: '치명타 무효화 1회 (전투당)' },
];

// 자격증 시스템 (특수 조건 달성 → 영구 보너스)
const CERTIFICATES = [
  { id: 'combat_master', name: '전투 달인', icon: '🏆⚔️', req: '전투 1000회 승리', bonus: { atk: 1.05 }, desc: '영구 ATK+5%' },
  { id: 'survival_expert', name: '생존 전문가', icon: '🏆🛡️', req: 'IO 서바이벌 100회 TOP3', bonus: { hp: 1.05 }, desc: '영구 HP+5%' },
  { id: 'merchant_license', name: '상인 면허', icon: '🏆💰', req: '무역 수익 50만G 달성', bonus: { tradeBonus: 1.1 }, desc: '무역 수익+10%' },
  { id: 'siege_commander', name: '공성 지휘관', icon: '🏆🏰', req: '공성전 20회 승리', bonus: { siegeBonus: 1.1 }, desc: '공성 능력+10%' },
  { id: 'merc_master', name: '용병 대사부', icon: '🏆📚', req: '용병 20명 각성', bonus: { mercExp: 1.1 }, desc: '용병 EXP+10%' },
  { id: 'explorer', name: '탐험가', icon: '🏆🗺️', req: '모든 지역 발견', bonus: { dropRate: 1.05 }, desc: '드롭률+5%' },
];

function classChange(player, mercId, targetClassId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };

  const baseClass = merc.class || 'warrior';
  const tree = CLASS_TREE[baseClass];
  if (!tree) return { ok: false, reason: '전직 트리 없음' };

  // tier2/tier3에서 찾기
  const allClasses = [...(tree.tier2 || []), ...(tree.tier3 || [])];
  const target = allClasses.find(c => c.id === targetClassId);
  if (!target) return { ok: false, reason: '유효하지 않은 전직 대상' };

  if ((merc.level || 1) < target.req.level) return { ok: false, reason: `레벨 ${target.req.level} 필요` };
  if (target.req.tier2 && !merc.tier2Class) return { ok: false, reason: '2차 전직 필요' };

  // 전직 실행
  if (target.ultimate) {
    merc.tier3Class = target.id;
  } else {
    merc.tier2Class = target.id;
  }
  merc.className = target.name;
  merc.classIcon = target.icon;
  merc.classBonus = target.bonus;
  merc.classSkills = target.skills;

  return { ok: true, merc: merc.name, newClass: target.name, skills: target.skills };
}

function learnSkill(player, mercId, skillId) {
  const merc = (player.mercenaries || []).find(m => m.id === mercId);
  if (!merc) return { ok: false, reason: '용병 없음' };
  const skill = LEARNABLE_SKILLS.find(s => s.id === skillId);
  if (!skill) return { ok: false, reason: '알 수 없는 스킬' };
  if (skill.class !== 'any' && merc.class !== skill.class) return { ok: false, reason: '클래스 불일치' };
  if ((player.gold || 0) < skill.cost) return { ok: false, reason: '골드 부족' };

  player.gold -= skill.cost;
  merc.learnedSkills = merc.learnedSkills || [];
  if (merc.learnedSkills.includes(skillId)) return { ok: false, reason: '이미 습득' };
  merc.learnedSkills.push(skillId);

  return { ok: true, skill: skill.name, merc: merc.name };
}

function register(io, socket, player) {
  socket.on('academy_class_tree', () => {
    socket.emit('academy_class_tree', CLASS_TREE);
  });

  socket.on('academy_class_change', (data) => {
    const result = classChange(player, data.mercId, data.targetClassId);
    socket.emit('academy_class_change_result', result);
    if (result.ok) {
      io.emit('server_msg', `📚 [전직] ${player.name}의 ${result.merc}이(가) "${result.newClass}"(으)로 전직!`);
    }
  });

  socket.on('academy_learn_skill', (data) => {
    const result = learnSkill(player, data.mercId, data.skillId);
    socket.emit('academy_learn_skill_result', result);
  });

  socket.on('academy_skills', () => {
    socket.emit('academy_skills', { skills: LEARNABLE_SKILLS, certificates: CERTIFICATES });
  });
}

module.exports = {
  CLASS_TREE, LEARNABLE_SKILLS, CERTIFICATES,
  classChange, learnSkill, register,
};
