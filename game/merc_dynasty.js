// v5.0 — 용병 세대 계승 시스템 (거상 스타일)
// 은퇴한 용병의 특성/스킬/장비를 후계자에게 유전

const RETIRE_MIN_LEVEL = 30;
const MAX_GENERATION = 5;

// 세대별 기본 보너스 (계승할수록 강해짐)
const GEN_BONUS = {
  1: { statMul: 1.0,  traitSlots: 2, skillInherit: 1 },
  2: { statMul: 1.08, traitSlots: 3, skillInherit: 2 },
  3: { statMul: 1.18, traitSlots: 4, skillInherit: 2 },
  4: { statMul: 1.30, traitSlots: 5, skillInherit: 3 },
  5: { statMul: 1.50, traitSlots: 6, skillInherit: 3, legendary: true },
};

// 유전 특성 풀 (은퇴 시 랜덤 획득)
const HEREDITARY_TRAITS = [
  { id: 'iron_blood', name: '철혈', desc: 'HP+15%, 방어+10%', rarity: 'rare', stat: { hp: 1.15, def: 1.1 } },
  { id: 'berserker_gene', name: '광전사의 피', desc: '공격+20%, 방어-10%', rarity: 'rare', stat: { atk: 1.2, def: 0.9 } },
  { id: 'swift_blood', name: '질풍혈통', desc: '속도+25%, 회피+10%', rarity: 'rare', stat: { spd: 1.25, eva: 1.1 } },
  { id: 'sage_wisdom', name: '현자의 지혜', desc: '마공+20%, MP+15%', rarity: 'rare', stat: { matk: 1.2, mp: 1.15 } },
  { id: 'royal_blood', name: '왕가의 혈통', desc: '전체 스탯+8%', rarity: 'epic', stat: { all: 1.08 } },
  { id: 'dragon_heart', name: '용의 심장', desc: 'HP+30%, 화속성 내성+50%', rarity: 'epic', stat: { hp: 1.3, fireRes: 1.5 } },
  { id: 'shadow_step', name: '그림자 걸음', desc: '크리율+20%, 속도+15%', rarity: 'epic', stat: { crit: 1.2, spd: 1.15 } },
  { id: 'ancient_soul', name: '고대의 영혼', desc: '스킬 쿨다운-20%, 전체+5%', rarity: 'legend', stat: { all: 1.05, cdReduce: 0.8 } },
  { id: 'immortal_body', name: '불멸의 육체', desc: 'HP 1회 부활(전투당), 전체+3%', rarity: 'legend', stat: { all: 1.03, revive: 1 } },
  { id: 'god_slayer', name: '신살자', desc: '보스 데미지+40%, 공격+10%', rarity: 'legend', stat: { atk: 1.1, bossDmg: 1.4 } },
];

// 명문가 시스템: 같은 계열 5세대 달성 시 가문 효과
const DYNASTY_TITLES = [
  { gen: 2, name: '명문가', bonus: '가문 용병 EXP+10%' },
  { gen: 3, name: '대가문', bonus: '가문 용병 전체 스탯+5%' },
  { gen: 4, name: '왕가',   bonus: '가문 고유 궁극기 해금' },
  { gen: 5, name: '신화가문', bonus: '전설 특성 확정 유전 + 고유 스킨' },
];

// 유전자 조합: 두 특성이 결합하면 새로운 특성 탄생
const TRAIT_FUSIONS = [
  { a: 'iron_blood', b: 'berserker_gene', result: { id: 'war_god', name: '전쟁신의 혈통', desc: '공+25%, 방+15%, HP+10%', rarity: 'legend', stat: { atk: 1.25, def: 1.15, hp: 1.1 } } },
  { a: 'swift_blood', b: 'shadow_step', result: { id: 'phantom', name: '환영', desc: '속도+40%, 회피+25%, 잔상 생성', rarity: 'legend', stat: { spd: 1.4, eva: 1.25 } } },
  { a: 'sage_wisdom', b: 'dragon_heart', result: { id: 'archmage', name: '대마도사의 혈통', desc: '마공+35%, 원소 피해+20%', rarity: 'legend', stat: { matk: 1.35, elemDmg: 1.2 } } },
  { a: 'royal_blood', b: 'ancient_soul', result: { id: 'emperor_line', name: '황제의 계보', desc: '전체+15%, 지휘 보너스+20%', rarity: 'myth', stat: { all: 1.15, cmdBonus: 1.2 } } },
  { a: 'immortal_body', b: 'god_slayer', result: { id: 'transcendent', name: '초월자의 혈통', desc: '전체+12%, 부활2회, 보스+30%', rarity: 'myth', stat: { all: 1.12, revive: 2, bossDmg: 1.3 } } },
];

function canRetire(merc) {
  return merc.level >= RETIRE_MIN_LEVEL && (merc.generation || 1) < MAX_GENERATION;
}

function rollHereditary(merc) {
  const gen = merc.generation || 1;
  const pool = HEREDITARY_TRAITS.filter(t => {
    if (gen < 3 && t.rarity === 'legend') return false;
    return true;
  });
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick;
}

function retire(merc, successorBaseId) {
  if (!canRetire(merc)) return { ok: false, reason: '은퇴 조건 미충족' };
  const gen = (merc.generation || 1) + 1;
  const genBonus = GEN_BONUS[Math.min(gen, MAX_GENERATION)];

  // 유전 특성 결정
  const inherited = (merc.hereditaryTraits || []).slice(0, genBonus.traitSlots - 1);
  const newTrait = rollHereditary(merc);
  inherited.push(newTrait);

  // 특성 융합 체크
  let fusionResult = null;
  for (const f of TRAIT_FUSIONS) {
    const ids = inherited.map(t => t.id);
    if (ids.includes(f.a) && ids.includes(f.b)) {
      fusionResult = f.result;
      break;
    }
  }

  // 스킬 유전
  const skills = (merc.skills || []).slice(0, genBonus.skillInherit);

  // 명문가 칭호
  const dynasty = DYNASTY_TITLES.filter(d => gen >= d.gen).pop() || null;

  const successor = {
    baseId: successorBaseId,
    generation: gen,
    genBonus,
    hereditaryTraits: inherited,
    fusionTrait: fusionResult,
    inheritedSkills: skills,
    dynastyTitle: dynasty,
    parentName: merc.name,
    parentLegacy: { level: merc.level, kills: merc.kills || 0, gen: merc.generation || 1 },
    level: 1,
    emotion: 'calm',
  };

  return { ok: true, successor, retiredMerc: merc.name, generation: gen, dynasty };
}

function register(io, socket, player) {
  socket.on('merc_retire', (data) => {
    const { mercIdx, successorBaseId } = data;
    const mercs = player.mercenaries || [];
    if (mercIdx < 0 || mercIdx >= mercs.length) return socket.emit('merc_retire_result', { ok: false, reason: '잘못된 용병' });
    const result = retire(mercs[mercIdx], successorBaseId);
    if (result.ok) {
      mercs.splice(mercIdx, 1);
      mercs.push(result.successor);
      socket.emit('merc_retire_result', result);
      io.emit('server_msg', `🏛️ [세대 계승] ${player.name}의 ${result.retiredMerc}이(가) 은퇴! ${result.generation}세대 후계자 탄생!`);
    } else {
      socket.emit('merc_retire_result', result);
    }
  });

  socket.on('merc_dynasty_info', () => {
    const mercs = player.mercenaries || [];
    const dynasties = {};
    mercs.forEach(m => {
      const gen = m.generation || 1;
      const base = m.baseId || m.id;
      if (!dynasties[base] || gen > dynasties[base].gen) {
        dynasties[base] = { gen, name: m.name, traits: m.hereditaryTraits || [], title: m.dynastyTitle };
      }
    });
    socket.emit('merc_dynasty_info', dynasties);
  });
}

module.exports = {
  RETIRE_MIN_LEVEL, MAX_GENERATION, GEN_BONUS, HEREDITARY_TRAITS, DYNASTY_TITLES, TRAIT_FUSIONS,
  canRetire, retire, rollHereditary, register,
};
