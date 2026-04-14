// 카오스 존 — v4.6
// 알비온 스타일 풀룻 위험 지역
// 높은 보상 + 사망 시 장비/용병 드롭 = 진짜 긴장감

// ═══ 카오스 존 정의 ═══
const CHAOS_ZONES = [
  {
    id: 'void_rift', name: '공허의 균열', icon: '🕳️',
    level: 30, dangerTier: 3,
    bonuses: { exp: 1.5, gold: 2.0, dropRate: 2.0 },
    deathPenalty: { goldLoss: 0.2, equipDrop: 1, mercDrop: false },
    monsters: ['shadow_elite', 'void_spawn', 'chaos_beast'],
    bossSpawn: { chance: 0.1, id: 'void_lord', hp: 30000, atk: 300, loot: { gold: 50000, diamonds: 100 } },
    desc: '공허의 틈새. EXP 1.5배, 골드 2배, 사망 시 골드 20% + 장비 1개 드롭',
  },
  {
    id: 'demon_wastes', name: '마계 황무지', icon: '👿',
    level: 40, dangerTier: 4,
    bonuses: { exp: 2.0, gold: 3.0, dropRate: 3.0 },
    deathPenalty: { goldLoss: 0.3, equipDrop: 2, mercDrop: true },
    monsters: ['demon_soldier', 'hell_hound', 'fallen_angel'],
    bossSpawn: { chance: 0.15, id: 'demon_king', hp: 60000, atk: 500, loot: { gold: 100000, diamonds: 300, legendaryItem: true } },
    desc: '마계의 전초기지. 보상 3배! 사망 시 골드 30% + 장비 2개 + 용병 1명 드롭!',
  },
  {
    id: 'dragon_graveyard', name: '용의 묘지', icon: '💀🐲',
    level: 50, dangerTier: 5,
    bonuses: { exp: 3.0, gold: 5.0, dropRate: 5.0 },
    deathPenalty: { goldLoss: 0.5, equipDrop: 3, mercDrop: true, mercDropCount: 2 },
    monsters: ['undead_dragon', 'dragon_wraith', 'bone_colossus'],
    bossSpawn: { chance: 0.2, id: 'ancient_dragon_ghost', hp: 100000, atk: 800, loot: { gold: 200000, diamonds: 500, mythicItem: true } },
    desc: '최고 위험! 보상 5배! 사망 시 전재산 50% + 장비 3개 + 용병 2명 드롭!!',
  },
];

const CHAOS_WARNINGS = [
  '⚠️ 경고: 이 지역에서 사망하면 장비와 골드를 잃습니다!',
  '⚠️ 경고: PK가 허용됩니다. 다른 플레이어가 당신을 공격할 수 있습니다!',
  '⚠️ 경고: 사망 시 드롭된 아이템은 누구나 주울 수 있습니다!',
];

// ═══ 바닥 드롭 저장소 (5분 만료) ═══
const chaosDrops = {};           // { lootId: { items, gold, mercs, zoneId, droppedBy, droppedAt, expireTimer } }
const LOOT_EXPIRE_MS = 5 * 60 * 1000;  // 5분

let _lootIdCounter = 0;
function nextLootId() { return `cloot_${Date.now()}_${++_lootIdCounter}`; }

// ═══ 플레이어별 카오스 통계 ═══
function ensureChaosData(player) {
  if (!player._chaos) {
    player._chaos = {
      inZone: null,         // 현재 진입한 zoneId
      enteredAt: 0,         // 진입 시각
      kills: 0,             // 이번 진입 킬 수
      totalKills: 0,        // 누적 PK 수
      totalDeaths: 0,       // 누적 사망 수
      lootCollected: 0,     // 주운 루팅 수
      weeklyKills: 0,       // 주간 킬
      weeklySurvivalTime: 0,// 주간 생존 시간(ms)
      weekReset: getWeekKey(),
    };
  }
  // 주간 리셋 체크
  const wk = getWeekKey();
  if (player._chaos.weekReset !== wk) {
    player._chaos.weeklyKills = 0;
    player._chaos.weeklySurvivalTime = 0;
    player._chaos.weekReset = wk;
  }
  return player._chaos;
}

function getWeekKey() {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

// ═══ 유틸 ═══
function findZone(zoneId) {
  return CHAOS_ZONES.find(z => z.id === zoneId) || null;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══ 핵심 함수들 ═══

/**
 * 모든 카오스 존 정보 반환
 */
function getChaosZones() {
  return CHAOS_ZONES.map(z => ({
    id: z.id,
    name: z.name,
    icon: z.icon,
    level: z.level,
    dangerTier: z.dangerTier,
    bonuses: { ...z.bonuses },
    deathPenalty: { ...z.deathPenalty },
    monsters: [...z.monsters],
    bossSpawn: { chance: z.bossSpawn.chance, id: z.bossSpawn.id },
    desc: z.desc,
  }));
}

/**
 * 카오스 존 진입
 */
function enterChaosZone(player, zoneId) {
  const zone = findZone(zoneId);
  if (!zone) return { ok: false, msg: '❌ 존재하지 않는 카오스 존입니다.' };

  const cd = ensureChaosData(player);
  if (cd.inZone) return { ok: false, msg: `❌ 이미 카오스 존 [${findZone(cd.inZone)?.name || cd.inZone}]에 있습니다. 먼저 나가세요.` };

  const playerLevel = player.level || 1;
  if (playerLevel < zone.level) {
    return { ok: false, msg: `❌ 레벨 부족! ${zone.name} 진입에는 Lv.${zone.level} 이상이 필요합니다. (현재 Lv.${playerLevel})` };
  }

  cd.inZone = zoneId;
  cd.enteredAt = Date.now();
  cd.kills = 0;

  return {
    ok: true,
    zone: {
      id: zone.id,
      name: zone.name,
      icon: zone.icon,
      dangerTier: zone.dangerTier,
      bonuses: { ...zone.bonuses },
    },
    warnings: [...CHAOS_WARNINGS],
    msg: `${zone.icon} ${zone.name}에 진입했습니다! 위험 등급: ${'⭐'.repeat(zone.dangerTier)}`,
  };
}

/**
 * 카오스 존 안전 이탈
 */
function exitChaosZone(player) {
  const cd = ensureChaosData(player);
  if (!cd.inZone) return { ok: false, msg: '❌ 현재 카오스 존에 있지 않습니다.' };

  const zone = findZone(cd.inZone);
  const timeInside = Date.now() - cd.enteredAt;
  cd.weeklySurvivalTime += timeInside;

  const result = {
    ok: true,
    msg: `✅ ${zone?.name || '카오스 존'}에서 안전하게 귀환했습니다.`,
    stats: {
      timeInside: Math.floor(timeInside / 1000),
      kills: cd.kills,
    },
  };

  cd.inZone = null;
  cd.enteredAt = 0;
  cd.kills = 0;

  return result;
}

/**
 * 현재 카오스 존 상태 조회
 */
function getChaosStatus(player) {
  const cd = ensureChaosData(player);
  if (!cd.inZone) {
    return {
      inZone: false,
      msg: '카오스 존 밖에 있습니다.',
      totalKills: cd.totalKills,
      totalDeaths: cd.totalDeaths,
      weeklyKills: cd.weeklyKills,
    };
  }

  const zone = findZone(cd.inZone);
  const elapsed = Date.now() - cd.enteredAt;

  return {
    inZone: true,
    zone: {
      id: zone.id,
      name: zone.name,
      icon: zone.icon,
      dangerTier: zone.dangerTier,
    },
    timeInside: Math.floor(elapsed / 1000),
    kills: cd.kills,
    totalKills: cd.totalKills,
    totalDeaths: cd.totalDeaths,
    weeklyKills: cd.weeklyKills,
    nearbyDrops: Object.keys(chaosDrops).filter(id => chaosDrops[id].zoneId === cd.inZone).length,
    msg: `${zone.icon} ${zone.name} | 체류 ${Math.floor(elapsed / 60000)}분 | 킬 ${cd.kills}`,
  };
}

/**
 * 전투 보상에 카오스 보너스 적용
 */
function applyChaosBonus(player, baseReward) {
  const cd = ensureChaosData(player);
  if (!cd.inZone) return baseReward;

  const zone = findZone(cd.inZone);
  if (!zone) return baseReward;

  const boosted = { ...baseReward };
  if (boosted.exp != null)      boosted.exp = Math.floor(boosted.exp * zone.bonuses.exp);
  if (boosted.gold != null)     boosted.gold = Math.floor(boosted.gold * zone.bonuses.gold);
  if (boosted.dropRate != null)  boosted.dropRate = boosted.dropRate * zone.bonuses.dropRate;

  return boosted;
}

/**
 * 카오스 존 사망 처리 — 핵심 함수
 * 골드 드롭 + 장비 드롭 + 용병 드롭 + 킬러 알림 + 존 브로드캐스트
 */
function handleChaosDeath(player, killer, players) {
  const cd = ensureChaosData(player);
  if (!cd.inZone) return null;  // 카오스 존 밖이면 무시

  const zone = findZone(cd.inZone);
  if (!zone) return null;

  const penalty = zone.deathPenalty;
  const dropped = { gold: 0, items: [], mercs: [] };
  const messages = [];

  // --- 1) 골드 드롭 ---
  const goldToDrop = Math.floor((player.gold || 0) * penalty.goldLoss);
  if (goldToDrop > 0) {
    player.gold = (player.gold || 0) - goldToDrop;
    dropped.gold = goldToDrop;
    messages.push(`💰 골드 ${goldToDrop.toLocaleString()} 드롭!`);
  }

  // --- 2) 장비 드롭 ---
  const equipped = player.equipped || {};
  const equipSlots = Object.keys(equipped).filter(slot => equipped[slot]);
  if (equipSlots.length > 0 && penalty.equipDrop > 0) {
    const shuffled = shuffleArray(equipSlots);
    const dropCount = Math.min(penalty.equipDrop, shuffled.length);
    for (let i = 0; i < dropCount; i++) {
      const slot = shuffled[i];
      const item = equipped[slot];
      dropped.items.push({ slot, item: JSON.parse(JSON.stringify(item)) });
      delete equipped[slot];
    }
    messages.push(`🗡️ 장비 ${dropped.items.length}개 드롭!`);
  }

  // --- 3) 용병 드롭 ---
  if (penalty.mercDrop && player.mercs && player.mercs.length > 0) {
    const mercDropCount = penalty.mercDropCount || 1;
    const shuffledMercs = shuffleArray([...Array(player.mercs.length).keys()]);
    const actualDrop = Math.min(mercDropCount, player.mercs.length);
    for (let i = 0; i < actualDrop; i++) {
      const idx = shuffledMercs[i];
      const merc = player.mercs[idx];
      if (merc) {
        dropped.mercs.push(JSON.parse(JSON.stringify(merc)));
      }
    }
    // 실제 제거 (인덱스 역순)
    const removeIndices = shuffledMercs.slice(0, actualDrop).sort((a, b) => b - a);
    for (const idx of removeIndices) {
      player.mercs.splice(idx, 1);
    }
    if (dropped.mercs.length > 0) {
      messages.push(`⚔️ 용병 ${dropped.mercs.length}명 드롭! (${dropped.mercs.map(m => m.name || m.id).join(', ')})`);
    }
  }

  // --- 4) 바닥에 드롭 아이템 생성 ---
  const lootId = nextLootId();
  const expireTimer = setTimeout(() => { delete chaosDrops[lootId]; }, LOOT_EXPIRE_MS);
  chaosDrops[lootId] = {
    gold: dropped.gold,
    items: dropped.items,
    mercs: dropped.mercs,
    zoneId: cd.inZone,
    droppedBy: player.name || player.id || 'unknown',
    droppedAt: Date.now(),
    expireTimer,
  };

  // --- 5) 통계 업데이트 ---
  cd.totalDeaths++;
  const timeInside = Date.now() - cd.enteredAt;
  cd.weeklySurvivalTime += timeInside;

  // 킬러 통계
  if (killer) {
    const kd = ensureChaosData(killer);
    kd.kills++;
    kd.totalKills++;
    kd.weeklyKills++;
  }

  // --- 6) 사망자는 존에서 퇴장 ---
  const deathZoneName = zone.name;
  cd.inZone = null;
  cd.enteredAt = 0;
  cd.kills = 0;

  const deathMsg = `💀 [${deathZoneName}] ${player.name || '???'}님이 ${killer ? (killer.name || '???') + '에게 처치' : '사망'}당했습니다!`;
  const killerMsg = killer
    ? `🏆 ${player.name || '???'}을(를) 처치! 드롭 루팅 가능 (ID: ${lootId})`
    : null;

  return {
    dropped,
    lootId,
    deathMsg,
    killerMsg,
    msg: `☠️ ${deathZoneName}에서 사망! ${messages.join(' ')}`,
  };
}

/**
 * 바닥 드롭 아이템 수거
 */
function collectChaosLoot(player, lootId) {
  const loot = chaosDrops[lootId];
  if (!loot) return { ok: false, msg: '❌ 해당 드롭 아이템이 존재하지 않거나 이미 만료되었습니다.' };

  const cd = ensureChaosData(player);
  if (cd.inZone !== loot.zoneId) {
    return { ok: false, msg: '❌ 같은 카오스 존에 있어야 루팅할 수 있습니다.' };
  }

  const collected = { gold: 0, items: [], mercs: [] };
  const messages = [];

  // 골드 수거
  if (loot.gold > 0) {
    player.gold = (player.gold || 0) + loot.gold;
    collected.gold = loot.gold;
    messages.push(`💰 골드 ${loot.gold.toLocaleString()} 획득!`);
  }

  // 아이템 수거 → 인벤토리
  if (loot.items && loot.items.length > 0) {
    if (!player.inventory) player.inventory = [];
    for (const entry of loot.items) {
      player.inventory.push(entry.item);
      collected.items.push(entry.item);
    }
    messages.push(`🗡️ 장비 ${loot.items.length}개 획득!`);
  }

  // 용병 수거
  if (loot.mercs && loot.mercs.length > 0) {
    if (!player.mercs) player.mercs = [];
    for (const merc of loot.mercs) {
      player.mercs.push(merc);
      collected.mercs.push(merc);
    }
    messages.push(`⚔️ 용병 ${loot.mercs.length}명 획득!`);
  }

  // 타이머 정리 & 삭제
  if (loot.expireTimer) clearTimeout(loot.expireTimer);
  delete chaosDrops[lootId];

  cd.lootCollected++;

  return {
    ok: true,
    collected,
    droppedBy: loot.droppedBy,
    msg: `🎁 루팅 성공! ${messages.join(' ')} (원래 주인: ${loot.droppedBy})`,
  };
}

/**
 * 주간 카오스 존 리더보드
 */
function getChaosLeaderboard(players) {
  const entries = [];
  for (const pid of Object.keys(players)) {
    const p = players[pid];
    if (!p || !p._chaos) continue;
    ensureChaosData(p);  // 주간 리셋 확인
    entries.push({
      id: pid,
      name: p.name || pid,
      weeklyKills: p._chaos.weeklyKills,
      weeklySurvivalTime: p._chaos.weeklySurvivalTime,
      totalKills: p._chaos.totalKills,
      totalDeaths: p._chaos.totalDeaths,
    });
  }

  const topKillers = [...entries]
    .sort((a, b) => b.weeklyKills - a.weeklyKills)
    .slice(0, 10)
    .map((e, i) => ({
      rank: i + 1,
      name: e.name,
      kills: e.weeklyKills,
      totalKills: e.totalKills,
    }));

  const topSurvivors = [...entries]
    .sort((a, b) => b.weeklySurvivalTime - a.weeklySurvivalTime)
    .slice(0, 10)
    .map((e, i) => ({
      rank: i + 1,
      name: e.name,
      survivalMin: Math.floor(e.weeklySurvivalTime / 60000),
      totalDeaths: e.totalDeaths,
    }));

  return {
    week: getWeekKey(),
    topKillers,
    topSurvivors,
    totalParticipants: entries.filter(e => e.weeklyKills > 0 || e.weeklySurvivalTime > 0).length,
  };
}

/**
 * 현재 존에 드롭된 루트 목록
 */
function getZoneDrops(zoneId) {
  const drops = [];
  for (const [lootId, loot] of Object.entries(chaosDrops)) {
    if (loot.zoneId !== zoneId) continue;
    const remaining = LOOT_EXPIRE_MS - (Date.now() - loot.droppedAt);
    if (remaining <= 0) continue;
    drops.push({
      lootId,
      droppedBy: loot.droppedBy,
      goldAmount: loot.gold,
      itemCount: loot.items ? loot.items.length : 0,
      mercCount: loot.mercs ? loot.mercs.length : 0,
      expireIn: Math.floor(remaining / 1000),
    });
  }
  return drops;
}

// ═══ 소켓 핸들러 등록 ═══
function registerChaosZoneHandlers(io, socket, playerId, players) {
  // 카오스 존 목록
  socket.on('chaos_zones', () => {
    socket.emit('chaos_zones', {
      zones: getChaosZones(),
      warnings: [...CHAOS_WARNINGS],
    });
  });

  // 카오스 존 진입
  socket.on('chaos_enter', ({ zoneId, confirmed }) => {
    const p = players[playerId];
    if (!p) return;

    // 확인 다이얼로그 단계
    if (!confirmed) {
      const zone = findZone(zoneId);
      if (!zone) return socket.emit('chaos_enter', { ok: false, msg: '❌ 존재하지 않는 존입니다.' });
      return socket.emit('chaos_confirm', {
        zoneId: zone.id,
        name: zone.name,
        icon: zone.icon,
        dangerTier: zone.dangerTier,
        desc: zone.desc,
        deathPenalty: zone.deathPenalty,
        warnings: [...CHAOS_WARNINGS],
        msg: `${zone.icon} ${zone.name}에 진입하시겠습니까? 위험 등급: ${'⭐'.repeat(zone.dangerTier)}`,
      });
    }

    const result = enterChaosZone(p, zoneId);
    socket.emit('chaos_enter', result);

    if (result.ok) {
      // 존 내 다른 플레이어에게 알림
      for (const pid of Object.keys(players)) {
        if (pid === playerId) continue;
        const other = players[pid];
        if (other?._chaos?.inZone === zoneId) {
          const otherSocket = io.sockets.sockets.get(pid);
          if (otherSocket) {
            otherSocket.emit('chaos_alert', {
              type: 'player_entered',
              msg: `⚠️ ${p.name || '???'}님이 이 카오스 존에 진입했습니다!`,
            });
          }
        }
      }
    }
  });

  // 카오스 존 이탈
  socket.on('chaos_exit', () => {
    const p = players[playerId];
    if (!p) return;
    const result = exitChaosZone(p);
    socket.emit('chaos_exit', result);
  });

  // 카오스 존 상태 조회
  socket.on('chaos_status', () => {
    const p = players[playerId];
    if (!p) return;
    const status = getChaosStatus(p);
    // 드롭 아이템 목록 포함
    if (status.inZone && p._chaos?.inZone) {
      status.drops = getZoneDrops(p._chaos.inZone);
    }
    socket.emit('chaos_status', status);
  });

  // 리더보드
  socket.on('chaos_leaderboard', () => {
    socket.emit('chaos_leaderboard', getChaosLeaderboard(players));
  });

  // 드롭 아이템 수거
  socket.on('chaos_loot_collect', ({ lootId }) => {
    const p = players[playerId];
    if (!p) return;
    const result = collectChaosLoot(p, lootId);
    socket.emit('chaos_loot_collect', result);

    if (result.ok) {
      // 같은 존의 다른 플레이어에게 알림
      const cd = ensureChaosData(p);
      if (cd.inZone) {
        for (const pid of Object.keys(players)) {
          if (pid === playerId) continue;
          const other = players[pid];
          if (other?._chaos?.inZone === cd.inZone) {
            const otherSocket = io.sockets.sockets.get(pid);
            if (otherSocket) {
              otherSocket.emit('chaos_alert', {
                type: 'loot_taken',
                msg: `💨 ${p.name || '???'}님이 드롭 아이템을 주웠습니다!`,
              });
            }
          }
        }
      }
    }
  });
}

// ═══ 내보내기 ═══
module.exports = {
  CHAOS_ZONES,
  CHAOS_WARNINGS,
  chaosDrops,
  getChaosZones,
  enterChaosZone,
  exitChaosZone,
  getChaosStatus,
  applyChaosBonus,
  handleChaosDeath,
  collectChaosLoot,
  getChaosLeaderboard,
  getZoneDrops,
  registerChaosZoneHandlers,
};
