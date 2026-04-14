// 길드 보스 시즌 랭킹 — v4.9
// 주간 보스 킬 점수, 시즌 TOP 10 길드, 한정 코스메틱 보상

const { simulateBattle } = require('./merc_combat_engine');

const SEASON_DURATION = 7 * 24 * 60 * 60 * 1000; // 1주 시즌

const SEASON_BOSSES = [
  { id: 'flame_titan', name: '화염의 거인', icon: '🔥', hp: 500000, atk: 400, element: 'fire', scoreBase: 1000 },
  { id: 'ocean_serpent', name: '심해 대사', icon: '🐍', hp: 800000, atk: 350, element: 'water', scoreBase: 1500 },
  { id: 'storm_emperor', name: '뇌제', icon: '⚡', hp: 600000, atk: 500, element: 'wind', scoreBase: 1200 },
  { id: 'earth_golem', name: '대지의 골렘', icon: '🪨', hp: 1000000, atk: 250, element: 'earth', scoreBase: 2000 },
  { id: 'void_dragon', name: '공허룡', icon: '🕳️🐲', hp: 2000000, atk: 600, element: 'dark', scoreBase: 5000 },
];

const SEASON_RANKS = [
  { rank: 1, title: '시즌 패왕', icon: '👑', frame: 'golden_crown', rewards: { gold: 500000, diamonds: 1000, exclusiveSkin: 'season_champion' }, desc: '이 시즌의 절대 강자!' },
  { rank: 2, title: '시즌 영웅', icon: '🥈', frame: 'silver_wings', rewards: { gold: 300000, diamonds: 500 }, desc: '2위의 영광!' },
  { rank: 3, title: '시즌 전사', icon: '🥉', frame: 'bronze_shield', rewards: { gold: 200000, diamonds: 300 }, desc: '3위의 명예!' },
  { rank: 5, title: 'TOP 5', icon: '🏅', frame: 'elite_border', rewards: { gold: 100000, diamonds: 150 }, desc: 'TOP 5 길드!' },
  { rank: 10, title: 'TOP 10', icon: '⭐', frame: 'star_border', rewards: { gold: 50000, diamonds: 50 }, desc: 'TOP 10 진입!' },
];

const EXCLUSIVE_COSMETICS = {
  season_champion: { name: '시즌 챔피언 프레임', icon: '👑✨', desc: '오직 시즌 1위 길드만 획득 가능!', type: 'frame', color: '#FFD700' },
  golden_crown: { name: '황금 왕관 프레임', type: 'frame', color: '#FFD700' },
  silver_wings: { name: '은빛 날개 프레임', type: 'frame', color: '#C0C0C0' },
  bronze_shield: { name: '청동 방패 프레임', type: 'frame', color: '#CD7F32' },
  elite_border: { name: '엘리트 테두리', type: 'frame', color: '#4488FF' },
  star_border: { name: '별빛 테두리', type: 'frame', color: '#AACCFF' },
};

const ATTACK_COOLDOWN = 10 * 60 * 1000; // 10분 개인 쿨다운
const PARTICIPANT_BONUS_MAX = 1.5;       // 최대 참여 보너스 배율

/* ── 시즌 상태 ── */

let seasonState = null;

function initSeasonState() {
  const now = Date.now();
  seasonState = {
    seasonNumber: 1,
    startTime: now,
    endTime: now + SEASON_DURATION,
    guildScores: {},   // { clanName: totalScore }
    bossKills: {},     // { clanName: [{ bossId, damage, score, participants, time }] }
    rewards: {},       // { clanName: { claimed: false, rank, rewards } }
    attackCooldowns: {},// { odName: lastAttackTime }
    history: [],       // past season results
  };
  return seasonState;
}

function ensureState() {
  if (!seasonState) initSeasonState();
  return seasonState;
}

/* ── 시즌 보스 조회 ── */

function getSeasonBoss() {
  const st = ensureState();
  const idx = (st.seasonNumber - 1) % SEASON_BOSSES.length;
  return { ...SEASON_BOSSES[idx] };
}

/* ── 시즌 정보 ── */

function getSeasonInfo(clanName) {
  const st = ensureState();
  const now = Date.now();
  const boss = getSeasonBoss();
  const remaining = Math.max(0, st.endTime - now);
  const myScore = st.guildScores[clanName] || 0;

  // 현재 길드 순위 계산
  const sorted = Object.entries(st.guildScores)
    .sort((a, b) => b[1] - a[1]);
  const myRankIdx = sorted.findIndex(([name]) => name === clanName);
  const myRank = myRankIdx >= 0 ? myRankIdx + 1 : null;

  // 순위에 해당하는 보상 정보
  const rankInfo = getRankInfo(myRank);

  return {
    seasonNumber: st.seasonNumber,
    boss,
    remaining,
    endsAt: st.endTime,
    myScore,
    myRank,
    rankInfo,
    totalGuilds: sorted.length,
  };
}

function getRankInfo(rank) {
  if (rank == null) return null;
  for (const r of SEASON_RANKS) {
    if (rank <= r.rank) return r;
  }
  return null;
}

/* ── 보스 킬 기록 ── */

function recordBossKill(clanName, bossId, damage, participants) {
  const st = ensureState();
  const boss = SEASON_BOSSES.find(b => b.id === bossId);
  if (!boss) return { ok: false, msg: '알 수 없는 보스입니다.' };

  // 참여 보너스: 참여자 수에 비례 (1명=1.0, 5명=1.5 캡)
  const participantBonus = Math.min(PARTICIPANT_BONUS_MAX, 1.0 + (participants - 1) * 0.125);
  const damageRatio = Math.min(1, damage / boss.hp);
  const score = Math.floor(boss.scoreBase * damageRatio * participantBonus);

  // 길드 점수 누적
  st.guildScores[clanName] = (st.guildScores[clanName] || 0) + score;

  // 킬 로그 저장
  if (!st.bossKills[clanName]) st.bossKills[clanName] = [];
  st.bossKills[clanName].push({
    bossId,
    damage,
    score,
    participants,
    time: Date.now(),
  });

  return { ok: true, score, totalScore: st.guildScores[clanName], participantBonus };
}

/* ── 리더보드 ── */

function getSeasonLeaderboard() {
  const st = ensureState();
  const sorted = Object.entries(st.guildScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return sorted.map(([name, score], idx) => {
    const rank = idx + 1;
    const info = getRankInfo(rank);
    return {
      rank,
      clanName: name,
      score,
      title: info ? info.title : null,
      icon: info ? info.icon : '',
      frame: info ? info.frame : null,
    };
  });
}

/* ── 시즌 종료 / 보상 분배 ── */

function endSeason(clans) {
  const st = ensureState();
  const leaderboard = getSeasonLeaderboard();

  const distributed = [];

  for (const entry of leaderboard) {
    const rankInfo = getRankInfo(entry.rank);
    if (!rankInfo) continue;

    // 보상 저장 (길드원 개별 클레임)
    st.rewards[entry.clanName] = {
      claimed: false,
      rank: entry.rank,
      title: rankInfo.title,
      rewards: { ...rankInfo.rewards },
      frame: rankInfo.frame,
      score: entry.score,
    };

    // 코스메틱 즉시 부여 (프레임)
    if (clans && clans[entry.clanName]) {
      const members = clans[entry.clanName].members || [];
      for (const memberId of members) {
        grantCosmetic(memberId, rankInfo.frame);
        if (rankInfo.rewards.exclusiveSkin) {
          grantCosmetic(memberId, rankInfo.rewards.exclusiveSkin);
        }
      }
    }

    distributed.push({
      clanName: entry.clanName,
      rank: entry.rank,
      title: rankInfo.title,
      rewards: rankInfo.rewards,
    });
  }

  // 히스토리 저장
  st.history.push({
    seasonNumber: st.seasonNumber,
    startTime: st.startTime,
    endTime: st.endTime,
    leaderboard: leaderboard.slice(0, 10),
    winner: leaderboard[0] || null,
  });

  // 시즌 리셋
  const nextNumber = st.seasonNumber + 1;
  const now = Date.now();
  const history = st.history;

  seasonState = {
    seasonNumber: nextNumber,
    startTime: now,
    endTime: now + SEASON_DURATION,
    guildScores: {},
    bossKills: {},
    rewards: {},
    attackCooldowns: {},
    history,
  };

  return { ok: true, distributed, nextSeason: nextNumber };
}

function grantCosmetic(playerId, cosmeticId) {
  // 코스메틱 부여 — 외부 플레이어 객체에 저장
  // (실제 적용은 핸들러에서 players 맵을 통해 처리)
  const cosmetic = EXCLUSIVE_COSMETICS[cosmeticId];
  if (!cosmetic) return;
  // 메모리 내 저장은 핸들러에서 player.cosmetics 배열에 추가
  return cosmetic;
}

/* ── 시즌 히스토리 ── */

function getSeasonHistory() {
  const st = ensureState();
  return st.history.map(h => ({
    seasonNumber: h.seasonNumber,
    winner: h.winner ? h.winner.clanName : '없음',
    winnerScore: h.winner ? h.winner.score : 0,
    top3: h.leaderboard.slice(0, 3).map(e => ({
      rank: e.rank, clanName: e.clanName, score: e.score,
    })),
  }));
}

/* ── 시즌 만료 체크 ── */

function checkSeasonExpiry(clans) {
  const st = ensureState();
  if (Date.now() >= st.endTime) {
    return endSeason(clans);
  }
  return null;
}

/* ── 소켓 핸들러 등록 ── */

function registerGuildBossSeasonHandlers(io, socket, player, players, clans) {

  // 시즌 정보
  socket.on('guild_season_info', () => {
    if (!player.clan) {
      return socket.emit('guild_season_info', { ok: false, msg: '길드에 가입되어 있지 않습니다.' });
    }
    // 시즌 만료 자동 체크
    checkSeasonExpiry(clans);
    const info = getSeasonInfo(player.clan);
    socket.emit('guild_season_info', { ok: true, ...info });
  });

  // 리더보드
  socket.on('guild_season_leaderboard', () => {
    checkSeasonExpiry(clans);
    const leaderboard = getSeasonLeaderboard();
    const st = ensureState();
    socket.emit('guild_season_leaderboard', {
      ok: true,
      seasonNumber: st.seasonNumber,
      leaderboard,
    });
  });

  // 시즌 보스 공격
  socket.on('guild_season_attack', () => {
    if (!player.clan) {
      return socket.emit('guild_season_attack', { ok: false, msg: '길드에 가입되어 있지 않습니다.' });
    }

    checkSeasonExpiry(clans);

    const st = ensureState();
    const now = Date.now();

    // 시즌 종료 확인
    if (now >= st.endTime) {
      return socket.emit('guild_season_attack', { ok: false, msg: '시즌이 종료되었습니다. 다음 시즌을 기다려주세요.' });
    }

    // 개인 쿨다운 확인
    const lastAtk = st.attackCooldowns[player.odName] || 0;
    if (now - lastAtk < ATTACK_COOLDOWN) {
      const remain = Math.ceil((ATTACK_COOLDOWN - (now - lastAtk)) / 1000);
      return socket.emit('guild_season_attack', {
        ok: false,
        msg: `쿨다운 중입니다. ${remain}초 후 재도전 가능합니다.`,
        cooldownRemain: remain,
      });
    }

    // 용병 파티 확인
    const party = player.mercParty || player.mercs || [];
    if (!party.length) {
      return socket.emit('guild_season_attack', { ok: false, msg: '용병 파티가 비어 있습니다. 용병을 편성해주세요.' });
    }

    // 보스 정보
    const boss = getSeasonBoss();

    // 보스를 팀 형태로 변환 (simulateBattle 호환)
    const bossTeam = [{
      name: `${boss.icon} ${boss.name}`,
      hp: boss.hp,
      atk: boss.atk,
      def: 100,
      spd: 50,
      element: boss.element,
      skills: [],
    }];

    // 전투 시뮬레이션
    const result = simulateBattle(party, bossTeam, { maxTurns: 30 });

    // 데미지 계산: 보스 최대 HP - 남은 HP
    const bossRemainHp = result.teamB && result.teamB[0] ? Math.max(0, result.teamB[0].hp) : 0;
    const damage = Math.max(0, boss.hp - bossRemainHp);

    // 같은 길드 동시 참여자 수 계산
    const clanMembers = clans[player.clan] ? (clans[player.clan].members || []) : [];
    const onlineMembers = clanMembers.filter(mId => {
      const p = players[mId];
      return p && p.online;
    });
    const participants = Math.max(1, onlineMembers.length);

    // 점수 기록
    const record = recordBossKill(player.clan, boss.id, damage, participants);
    if (!record.ok) {
      return socket.emit('guild_season_attack', record);
    }

    // 쿨다운 기록
    st.attackCooldowns[player.odName] = now;

    // 현재 순위 포함 응답
    const info = getSeasonInfo(player.clan);

    socket.emit('guild_season_attack', {
      ok: true,
      boss: { id: boss.id, name: boss.name, icon: boss.icon },
      damage,
      score: record.score,
      totalScore: record.totalScore,
      participantBonus: record.participantBonus,
      participants,
      myRank: info.myRank,
      battleLog: result.log || [],
      msg: `${boss.icon} ${boss.name}에게 ${damage.toLocaleString()} 데미지! (+${record.score}점)`,
    });

    // 길드 전체에 알림
    if (clans[player.clan]) {
      clanMembers.forEach(mId => {
        const p = players[mId];
        if (p && p.socketId && p.socketId !== socket.id) {
          io.to(p.socketId).emit('guild_season_notify', {
            type: 'attack',
            attacker: player.odName,
            boss: boss.name,
            damage,
            score: record.score,
            totalScore: record.totalScore,
          });
        }
      });
    }
  });

  // 시즌 히스토리
  socket.on('guild_season_history', () => {
    const history = getSeasonHistory();
    socket.emit('guild_season_history', { ok: true, history });
  });

  // 시즌 보상 수령
  socket.on('guild_season_claim', () => {
    if (!player.clan) {
      return socket.emit('guild_season_claim', { ok: false, msg: '길드에 가입되어 있지 않습니다.' });
    }

    const st = ensureState();
    const reward = st.rewards[player.clan];

    if (!reward) {
      return socket.emit('guild_season_claim', { ok: false, msg: '수령할 시즌 보상이 없습니다.' });
    }

    if (reward.claimed && reward.claimedBy && reward.claimedBy.includes(player.odName)) {
      return socket.emit('guild_season_claim', { ok: false, msg: '이미 보상을 수령했습니다.' });
    }

    // 개인 보상 지급
    const r = reward.rewards;
    player.gold = (player.gold || 0) + (r.gold || 0);
    player.diamonds = (player.diamonds || 0) + (r.diamonds || 0);

    // 코스메틱 부여
    if (!player.cosmetics) player.cosmetics = [];
    if (reward.frame && !player.cosmetics.includes(reward.frame)) {
      player.cosmetics.push(reward.frame);
    }
    if (r.exclusiveSkin && !player.cosmetics.includes(r.exclusiveSkin)) {
      player.cosmetics.push(r.exclusiveSkin);
    }

    // 수령 기록
    if (!reward.claimedBy) reward.claimedBy = [];
    reward.claimedBy.push(player.odName);

    const cosmeticInfo = EXCLUSIVE_COSMETICS[reward.frame] || null;

    socket.emit('guild_season_claim', {
      ok: true,
      rank: reward.rank,
      title: reward.title,
      gold: r.gold || 0,
      diamonds: r.diamonds || 0,
      frame: reward.frame,
      cosmeticInfo,
      msg: `🏆 시즌 보상 수령! ${reward.title} — 골드 ${(r.gold || 0).toLocaleString()}, 다이아 ${r.diamonds || 0}개`,
    });
  });
}

/* ── exports ── */

module.exports = {
  SEASON_BOSSES,
  SEASON_RANKS,
  EXCLUSIVE_COSMETICS,
  SEASON_DURATION,
  initSeasonState,
  getSeasonBoss,
  getSeasonInfo,
  recordBossKill,
  getSeasonLeaderboard,
  endSeason,
  getSeasonHistory,
  checkSeasonExpiry,
  registerGuildBossSeasonHandlers,
};
