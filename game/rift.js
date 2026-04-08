// 차원 균열 시스템 — v2.17
// 일일 5 웨이브 — 각 웨이브 처치 시 점수/골드/장비 누적
// 5 웨이브 모두 클리어 시 균열 보스

const RIFT_WAVES = [
  { wave:1, name:'환영 정찰병', icon:'👤', power: 50,  rewardGold: 200,  rewardScore: 100  },
  { wave:2, name:'균열 사냥꾼', icon:'🏹', power: 120, rewardGold: 400,  rewardScore: 250  },
  { wave:3, name:'심연 거인',   icon:'🗿', power: 250, rewardGold: 800,  rewardScore: 500  },
  { wave:4, name:'그림자 마녀', icon:'🧙', power: 450, rewardGold:1500,  rewardScore:1000  },
  { wave:5, name:'균열의 군주', icon:'👑', power: 800, rewardGold:5000,  rewardScore:3000, isBoss:true },
];

const RIFT_BUFFS = [
  { stat:'atk',     value:10, label:'공격 가호' },
  { stat:'def',     value:15, label:'방어 가호' },
  { stat:'crit',    value:5,  label:'치명 가호' },
  { stat:'maxHp',   value:60, label:'생명 가호' },
];

const TIER_LABELS = ['F','E','D','C','B','A','S','SS','SSS'];

function _today() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function _ensure(player) {
  if (!player.rift) {
    player.rift = {
      lastDay: null,
      currentWave: 1,
      cleared: [],          // 오늘 클리어한 웨이브
      score: 0,
      bestScore: 0,
      totalRuns: 0,
      activeBuff: null,     // {stat, value, expiresAt}
      cleared5x: 0,         // 5웨이브 풀클리어 횟수
    };
  }
  return player.rift;
}

function _resetIfNeeded(player) {
  const r = _ensure(player);
  const today = _today();
  if (r.lastDay !== today) {
    r.lastDay = today;
    r.currentWave = 1;
    r.cleared = [];
    r.score = 0;
    r.totalRuns += 1;
  }
}

function _tier(score) {
  if (score >= 4500) return TIER_LABELS[8];
  if (score >= 3500) return TIER_LABELS[7];
  if (score >= 2500) return TIER_LABELS[6];
  if (score >= 1500) return TIER_LABELS[5];
  if (score >= 800)  return TIER_LABELS[4];
  if (score >= 350)  return TIER_LABELS[3];
  if (score >= 100)  return TIER_LABELS[2];
  if (score > 0)     return TIER_LABELS[1];
  return TIER_LABELS[0];
}

function getStatus(player) {
  _resetIfNeeded(player);
  const r = _ensure(player);
  if (r.activeBuff && r.activeBuff.expiresAt < Date.now()) r.activeBuff = null;
  return {
    today: r.lastDay,
    waves: RIFT_WAVES,
    currentWave: r.currentWave,
    cleared: r.cleared,
    score: r.score,
    tier: _tier(r.score),
    bestScore: r.bestScore,
    bestTier: _tier(r.bestScore),
    totalRuns: r.totalRuns,
    cleared5x: r.cleared5x,
    activeBuff: r.activeBuff,
    allDone: r.cleared.length >= RIFT_WAVES.length,
  };
}

// 플레이어 파워 계산 (간단 — 외부에서 더 정교하게 계산 가능)
function _playerPower(player) {
  const lvl = player.level || 1;
  const atk = (player.atk || 10);
  const def = (player.def || 5);
  const hp = (player.maxHp || 100);
  return lvl * 5 + atk * 3 + def * 2 + Math.floor(hp / 10);
}

function challenge(player) {
  _resetIfNeeded(player);
  const r = _ensure(player);
  const wave = RIFT_WAVES.find(w => w.wave === r.currentWave);
  if (!wave) return { success:false, msg:'오늘의 균열 종료' };
  if (r.cleared.includes(wave.wave)) return { success:false, msg:'이미 클리어한 웨이브' };
  const power = _playerPower(player);
  // 파워 + 약간 랜덤
  const myRoll = power * (0.85 + Math.random() * 0.30);
  const enemyRoll = wave.power * (0.85 + Math.random() * 0.30);
  if (myRoll < enemyRoll) {
    return {
      success:true,
      msg:`${wave.icon} ${wave.name} — 패배 (내 ${Math.floor(myRoll)} vs ${Math.floor(enemyRoll)})`,
      victory:false,
    };
  }
  // 승리
  r.cleared.push(wave.wave);
  r.score += wave.rewardScore;
  player.gold = (player.gold || 0) + wave.rewardGold;
  if (r.score > r.bestScore) r.bestScore = r.score;
  if (r.currentWave < RIFT_WAVES.length) r.currentWave += 1;

  // 보스 처치 시 — 무작위 가호 6시간
  let buffMsg = '';
  if (wave.isBoss) {
    r.cleared5x += 1;
    const buff = RIFT_BUFFS[Math.floor(Math.random() * RIFT_BUFFS.length)];
    r.activeBuff = {
      stat: buff.stat,
      value: buff.value,
      label: buff.label,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000,
    };
    buffMsg = ` | ${buff.label} +${buff.value} ${buff.stat} 6h`;
  }

  return {
    success:true,
    msg:`${wave.icon} ${wave.name} 클리어! (+${wave.rewardGold}G, +${wave.rewardScore}점)${buffMsg}`,
    victory:true,
    wave: wave.wave,
    boss: !!wave.isBoss,
    gold: wave.rewardGold,
    scoreGain: wave.rewardScore,
    totalScore: r.score,
    tier: _tier(r.score),
  };
}

function getActiveBonuses(player) {
  const r = _ensure(player);
  if (!r.activeBuff || r.activeBuff.expiresAt < Date.now()) return {};
  return { [r.activeBuff.stat]: r.activeBuff.value };
}

module.exports = {
  RIFT_WAVES,
  RIFT_BUFFS,
  TIER_LABELS,
  getStatus,
  challenge,
  getActiveBonuses,
};
