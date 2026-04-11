// PvP 강화 시스템 — v2.59
// 킬 스트릭 현상금, 전장 버프, PvP 등급 보상

// ═══ 킬 스트릭 현상금 ═══
const BOUNTY_TIERS = [
  { kills: 3,  bounty: 500,   title: '위험인물', color: '#ffaa00', icon: '⚠️' },
  { kills: 5,  bounty: 1500,  title: '현상수배', color: '#ff6600', icon: '🔥' },
  { kills: 8,  bounty: 3000,  title: '대학살자', color: '#ff2200', icon: '💀' },
  { kills: 12, bounty: 6000,  title: '공포의 존재', color: '#ff00ff', icon: '👿' },
  { kills: 20, bounty: 15000, title: '전설의 살인마', color: '#00ffff', icon: '⚡' },
];

function updatePvpStreak(killer, victim, players, io) {
  if (!killer || !victim) return null;
  if (!killer._pvpStreak) killer._pvpStreak = { kills: 0, bounty: 0 };

  killer._pvpStreak.kills++;
  const streak = killer._pvpStreak.kills;

  // 현상금 티어 결정
  let currentTier = null;
  for (const tier of BOUNTY_TIERS) {
    if (streak >= tier.kills) currentTier = tier;
  }

  if (currentTier) {
    killer._pvpStreak.bounty = currentTier.bounty;
    killer._pvpStreak.title = currentTier.title;

    // 서버 공지
    if (io) {
      io.emit('pvp_bounty_update', {
        playerId: killer.id,
        playerName: killer.displayName || killer.className,
        streak,
        bounty: currentTier.bounty,
        title: currentTier.title,
        icon: currentTier.icon,
        color: currentTier.color,
      });

      if (streak === 3 || streak === 5 || streak === 12 || streak === 20) {
        io.emit('server_msg', {
          msg: currentTier.icon + ' [현상수배] ' + (killer.displayName||killer.className) + ' — ' + currentTier.title + '! 현상금 ' + currentTier.bounty + 'G!',
          type: 'danger'
        });
      }
    }
  }

  // 피해자의 스트릭 리셋
  if (victim._pvpStreak && victim._pvpStreak.kills > 0) {
    const bountyEarned = victim._pvpStreak.bounty || 0;
    if (bountyEarned > 0) {
      killer.gold = (killer.gold || 0) + bountyEarned;
      if (io) {
        io.emit('server_msg', {
          msg: '💰 ' + (killer.displayName||killer.className) + '이(가) ' + (victim.displayName||victim.className) + '의 현상금 ' + bountyEarned + 'G를 획득!',
          type: 'boss'
        });
        io.to(killer.id || '').emit('pvp_bounty_claimed', { gold: bountyEarned, victimName: victim.displayName });
      }
    }
    victim._pvpStreak = { kills: 0, bounty: 0 };
  }

  return { streak, tier: currentTier };
}

// ═══ 전장 버프 ═══
const BATTLEFIELD_BUFFS = [
  { id: 'berserker', name: '광전사', icon: '🔥', desc: 'ATK +30%, DEF -20%', stats: { atkMult: 1.3, defMult: 0.8 } },
  { id: 'guardian', name: '수호자', icon: '🛡️', desc: 'DEF +40%, HP +20%', stats: { defMult: 1.4, hpMult: 1.2 } },
  { id: 'assassin', name: '암살자', icon: '🗡️', desc: 'CRIT +25%, SPD +30%', stats: { critBonus: 0.25, spdMult: 1.3 } },
  { id: 'vampire', name: '흡혈귀', icon: '🩸', desc: '피해의 15% HP 흡수', stats: { lifesteal: 0.15 } },
  { id: 'juggernaut', name: '저거너트', icon: '⛰️', desc: 'HP +50%, 넉백 면역, SPD -20%', stats: { hpMult: 1.5, spdMult: 0.8, knockbackImmune: true } },
];

function selectBattlefieldBuff(player, buffId) {
  const buff = BATTLEFIELD_BUFFS.find(b => b.id === buffId);
  if (!buff) return { success: false, msg: '존재하지 않는 버프' };

  player._battlefieldBuff = {
    id: buff.id,
    name: buff.name,
    icon: buff.icon,
    stats: buff.stats,
    appliedAt: Date.now(),
  };

  return {
    success: true,
    msg: buff.icon + ' ' + buff.name + ' 버프 선택! ' + buff.desc,
    buff,
  };
}

// ═══ PvP 킬캠 데이터 ═══
function generateKillCamData(killer, victim, damage, isCrit, skillName) {
  return {
    killerName: killer.displayName || killer.className,
    killerClass: killer.className,
    killerLevel: killer.level,
    victimName: victim.displayName || victim.className,
    victimClass: victim.className,
    victimLevel: victim.level,
    damage,
    isCrit,
    skillName: skillName || null,
    streak: killer._pvpStreak ? killer._pvpStreak.kills : 0,
    bounty: killer._pvpStreak ? killer._pvpStreak.bounty : 0,
  };
}

// ═══ 소켓 핸들러 ═══
function registerPvpEnhanceHandlers(socket, playerId, players, io) {
  socket.on('select_battlefield_buff', (buffId) => {
    const p = players[playerId];
    if (!p) return;
    const result = selectBattlefieldBuff(p, buffId);
    socket.emit('battlefield_buff_result', result);
  });

  socket.on('get_battlefield_buffs', () => {
    const p = players[playerId];
    socket.emit('battlefield_buffs_list', {
      buffs: BATTLEFIELD_BUFFS,
      current: p?._battlefieldBuff || null,
    });
  });

  socket.on('get_pvp_bounties', () => {
    // 현재 현상수배 목록
    const bounties = [];
    for (const [pid, p] of Object.entries(players)) {
      if (p._pvpStreak && p._pvpStreak.kills >= 3) {
        const tier = BOUNTY_TIERS.filter(t => p._pvpStreak.kills >= t.kills).pop();
        if (tier) bounties.push({
          name: p.displayName || p.className, level: p.level, class: p.className,
          kills: p._pvpStreak.kills, bounty: tier.bounty, title: tier.title, icon: tier.icon, color: tier.color,
        });
      }
    }
    bounties.sort((a, b) => b.kills - a.kills);
    socket.emit('pvp_bounties_list', { bounties: bounties.slice(0, 10) });
  });
}

module.exports = {
  BOUNTY_TIERS, BATTLEFIELD_BUFFS,
  updatePvpStreak, selectBattlefieldBuff, generateKillCamData,
  registerPvpEnhanceHandlers,
};
