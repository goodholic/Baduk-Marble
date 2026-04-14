// ============================================
// 카드 인챈트 — 마법 부여로 특수 효과 추가
// ============================================

const MAX_ENCHANTS = 3; // 카드당 최대 3개

const ENCHANTS = [
  // 공격 인챈트
  { id: 'enc_flame', name: '화염', icon: '🔥', stat: { fireDmg: 15 }, cost: 2000, rarity: 'common', desc: '화염 데미지 +15' },
  { id: 'enc_frost', name: '빙결', icon: '❄️', stat: { iceDmg: 15, slow: 0.05 }, cost: 2000, rarity: 'common', desc: '빙 데미지 +15, 둔화 5%' },
  { id: 'enc_thunder', name: '번개', icon: '⚡', stat: { thunderDmg: 20 }, cost: 3000, rarity: 'uncommon', desc: '전격 데미지 +20' },
  { id: 'enc_poison', name: '독', icon: '☠️', stat: { poisonDmg: 10, dot: 5 }, cost: 2500, rarity: 'uncommon', desc: '독 +10, 지속 5/초' },
  { id: 'enc_holy', name: '신성', icon: '✨', stat: { holyDmg: 25 }, cost: 5000, rarity: 'rare', desc: '신성 데미지 +25' },
  { id: 'enc_void', name: '공허', icon: '🌀', stat: { trueDmg: 20 }, cost: 8000, rarity: 'epic', desc: '진정한 데미지 +20 (방어 무시)' },

  // 방어 인챈트
  { id: 'enc_iron', name: '강철', icon: '🛡️', stat: { def: 15 }, cost: 2000, rarity: 'common', desc: 'DEF +15' },
  { id: 'enc_thorns', name: '가시', icon: '🌵', stat: { thornsDmg: 0.1 }, cost: 3000, rarity: 'uncommon', desc: '반사 데미지 10%' },
  { id: 'enc_barrier', name: '결계', icon: '🔰', stat: { shield: 50 }, cost: 4000, rarity: 'rare', desc: '전투 시작 보호막 50' },
  { id: 'enc_regen', name: '재생', icon: '💚', stat: { hpRegen: 10 }, cost: 3500, rarity: 'rare', desc: '턴당 HP 재생 10' },

  // 특수 인챈트
  { id: 'enc_crit', name: '치명', icon: '💥', stat: { critRate: 0.08 }, cost: 4000, rarity: 'rare', desc: '크리율 +8%' },
  { id: 'enc_vampire', name: '흡혈', icon: '🩸', stat: { lifeSteal: 0.08 }, cost: 5000, rarity: 'rare', desc: '흡혈 8%' },
  { id: 'enc_speed', name: '신속', icon: '💨', stat: { spd: 2 }, cost: 3000, rarity: 'uncommon', desc: '속도 +2' },
  { id: 'enc_fortune', name: '행운', icon: '🍀', stat: { goldBonus: 0.1 }, cost: 3000, rarity: 'uncommon', desc: '골드 획득 +10%' },

  // 전설 인챈트
  { id: 'enc_divine', name: '신의 축복', icon: '👑✨', stat: { allStat: 20 }, cost: 20000, rarity: 'legend', desc: '전스탯 +20' },
  { id: 'enc_chaos', name: '혼돈', icon: '🌀💜', stat: { randomBuff: true }, cost: 15000, rarity: 'legend', desc: '매 전투 랜덤 버프 1개' },
  { id: 'enc_eternity', name: '영원', icon: '♾️', stat: { revive: true }, cost: 30000, rarity: 'legend', desc: '전투당 1회 부활' },
];

// 인챈트 성공률
const SUCCESS_RATES = { common: 0.95, uncommon: 0.8, rare: 0.6, epic: 0.4, legend: 0.2 };

// 실패 시 효과
const FAIL_EFFECTS = [
  { chance: 0.6, effect: 'nothing', desc: '아무 일도 일어나지 않음 (재료만 소멸)' },
  { chance: 0.3, effect: 'downgrade', desc: '기존 인챈트 1개 제거!' },
  { chance: 0.1, effect: 'break', desc: '카드 레벨 -1! (최소 1)' },
];

function enchantCard(player, cardId, enchantId) {
  const card = (player.cards || []).find(c => c.id === cardId);
  if (!card) return { ok: false, reason: '카드 없음' };

  const enchant = ENCHANTS.find(e => e.id === enchantId);
  if (!enchant) return { ok: false, reason: '알 수 없는 인챈트' };

  card.enchants = card.enchants || [];
  if (card.enchants.length >= MAX_ENCHANTS) return { ok: false, reason: `최대 ${MAX_ENCHANTS}개 인챈트` };

  if ((player.gold || 0) < enchant.cost) return { ok: false, reason: `골드 ${enchant.cost} 필요` };
  player.gold -= enchant.cost;

  // 성공/실패 판정
  const rate = SUCCESS_RATES[enchant.rarity] || 0.5;
  const success = Math.random() < rate;

  if (success) {
    card.enchants.push({ id: enchant.id, name: enchant.name, icon: enchant.icon, stat: enchant.stat });
    // 스탯 즉시 적용
    if (enchant.stat.def) card.def = (card.def || 0) + enchant.stat.def;
    if (enchant.stat.allStat) { card.atk = (card.atk || 0) + enchant.stat.allStat; card.def = (card.def || 0) + enchant.stat.allStat; card.hp = (card.hp || 0) + enchant.stat.allStat * 3; }
    return { ok: true, success: true, msg: `✨ 인챈트 성공! "${card.name}"에 ${enchant.icon} ${enchant.name} 부여!`, card };
  }

  // 실패
  const failRoll = Math.random();
  let cum = 0;
  for (const f of FAIL_EFFECTS) {
    cum += f.chance;
    if (failRoll <= cum) {
      if (f.effect === 'downgrade' && card.enchants.length > 0) {
        card.enchants.pop();
        return { ok: true, success: false, msg: `❌ 인챈트 실패! 기존 인챈트 1개 제거됨...`, card };
      }
      if (f.effect === 'break') {
        card.level = Math.max(1, (card.level || 1) - 1);
        return { ok: true, success: false, msg: `💥 인챈트 대실패! 카드 레벨 -1!`, card };
      }
      return { ok: true, success: false, msg: `❌ 인챈트 실패... (재료만 소멸)`, card };
    }
  }
  return { ok: true, success: false, msg: '인챈트 실패' };
}

function register(io, socket, player) {
  socket.on('card_enchant', (data) => {
    const result = enchantCard(player, data.cardId, data.enchantId);
    socket.emit('card_enchant_result', result);
    if (result.ok) socket.emit('card_list', { cards: player.cards, gold: player.gold, diamonds: player.diamonds });
    if (result.success && ENCHANTS.find(e => e.id === data.enchantId)?.rarity === 'legend') {
      io.emit('server_msg', `✨👑 [인챈트] ${player.displayName || '???'}이(가) 전설 인챈트 성공!`);
    }
  });

  socket.on('card_enchant_list', () => {
    socket.emit('card_enchant_list', { enchants: ENCHANTS, rates: SUCCESS_RATES, maxEnchants: MAX_ENCHANTS });
  });
}

module.exports = { ENCHANTS, SUCCESS_RATES, FAIL_EFFECTS, MAX_ENCHANTS, enchantCard, register };
