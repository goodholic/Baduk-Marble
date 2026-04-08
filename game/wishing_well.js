// 소원의 우물 — v2.14
// 동전을 던지면 무작위 보상 — 베팅이 클수록 좋은 결과 가중

const WISHES = [
  { id:'echo',     icon:'🌀', text:'우물 속에서 메아리만 들린다',          weight: 30, type:'nothing' },
  { id:'small',    icon:'🪙', text:'작은 보상이 떠올랐다',                weight: 25, type:'gold',     mul: 0.8 },
  { id:'fair',     icon:'💰', text:'금화 한 줌이 솟아올랐다',            weight: 20, type:'gold',     mul: 1.5 },
  { id:'fish',     icon:'🐟', text:'물고기 한 마리가 펄쩍 뛰어오른다',    weight: 10, type:'item',     item:'fish' },
  { id:'stone',    icon:'💎', text:'반짝이는 보석을 발견했다',           weight:  6, type:'gem' },
  { id:'echo_hand',icon:'🤲', text:'우물 속의 손이 동전을 돌려준다',     weight:  4, type:'gold',     mul: 1.0 },
  { id:'spirit',   icon:'👻', text:'우물의 영이 너의 소원을 들어준다',    weight:  3, type:'wish',     value:'blessing' },
  { id:'jackpot',  icon:'✨', text:'전설의 보물!',                       weight:  2, type:'gold',     mul: 10 },
];

const MIN_WISH = 10;
const MAX_WISH = 5000;
const COOLDOWN_SECONDS = 60;

function _ensure(player) {
  if (!player.wishingWell) {
    player.wishingWell = {
      totalThrown: 0,
      totalWon: 0,
      wishes: 0,
      jackpots: 0,
      lastAt: 0,
      log: [],
    };
  }
  return player.wishingWell;
}

function _pickWish() {
  const total = WISHES.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of WISHES) {
    if (r < w.weight) return w;
    r -= w.weight;
  }
  return WISHES[0];
}

function getStatus(player) {
  const w = _ensure(player);
  const now = Date.now();
  return {
    ...w,
    log: w.log.slice(0, 20),
    cooldownSecondsLeft: Math.max(0, Math.ceil((w.lastAt + COOLDOWN_SECONDS*1000 - now) / 1000)),
    minWish: MIN_WISH,
    maxWish: MAX_WISH,
  };
}

function makeWish(player, amount) {
  const w = _ensure(player);
  amount = Math.floor(Number(amount) || 0);
  if (amount < MIN_WISH || amount > MAX_WISH) {
    return { success:false, msg:`소원의 동전 ${MIN_WISH}~${MAX_WISH}G` };
  }
  if ((player.gold || 0) < amount) return { success:false, msg:'골드 부족' };
  const now = Date.now();
  if (now < w.lastAt + COOLDOWN_SECONDS * 1000) {
    return { success:false, msg:`쿨다운 ${Math.ceil((w.lastAt + COOLDOWN_SECONDS*1000 - now)/1000)}초` };
  }

  player.gold -= amount;
  w.totalThrown += amount;
  w.wishes += 1;
  w.lastAt = now;

  const wish = _pickWish();
  let reward = 0;
  let extra = null;
  if (wish.type === 'gold') {
    reward = Math.floor(amount * wish.mul);
    player.gold += reward;
  } else if (wish.type === 'item') {
    if (!player.fishInventory) player.fishInventory = {};
    player.fishInventory[wish.item] = (player.fishInventory[wish.item] || 0) + 1;
    extra = { item: wish.item };
  } else if (wish.type === 'gem') {
    if (!player.gems) player.gems = 0;
    player.gems += 1;
    extra = { gem: 1 };
  } else if (wish.type === 'wish') {
    // 신성한 축복 — 1시간 +allStats 5
    if (!player.wellBlessing) player.wellBlessing = {};
    player.wellBlessing.expiresAt = now + 60 * 60 * 1000;
    player.wellBlessing.value = 5;
    extra = { blessing: true };
  }

  if (wish.id === 'jackpot') w.jackpots += 1;
  w.totalWon += reward;
  w.log.unshift({ wish: wish.id, amount, reward, when: now });
  if (w.log.length > 100) w.log.length = 100;

  return {
    success: true,
    msg: `${wish.icon} ${wish.text}${reward > 0 ? ` (+${reward}G)` : ''}`,
    wish, reward, extra,
    netChange: reward - amount,
  };
}

function getActiveBonuses(player) {
  if (player.wellBlessing && player.wellBlessing.expiresAt > Date.now()) {
    return { allStats: player.wellBlessing.value || 5 };
  }
  return {};
}

module.exports = {
  WISHES,
  MIN_WISH,
  MAX_WISH,
  COOLDOWN_SECONDS,
  getStatus,
  makeWish,
  getActiveBonuses,
};
